import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Notification {
  id: string;
  message: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Hook – unread count (re-exported for bell badge)
// ---------------------------------------------------------------------------
export function useNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: cnt } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!cancelled) setCount(cnt ?? 0);
    }

    fetchCount();

    // Realtime subscription to keep count in sync
    const channel = supabase
      .channel('notif-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { fetchCount(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

// ---------------------------------------------------------------------------
// NotificationPanel component
// ---------------------------------------------------------------------------
export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Fetch unread notifications
  // -------------------------------------------------------------------------
  async function fetchNotifications() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('notifications')
      .select('id, message, action_url, read, created_at')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications(data ?? []);
    setLoading(false);
  }

  // -------------------------------------------------------------------------
  // Realtime subscription
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    fetchNotifications();

    const channel = supabase
      .channel('notif-panel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: { new: Notification }) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  // -------------------------------------------------------------------------
  // Close on outside click
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // -------------------------------------------------------------------------
  // Mark all read
  // -------------------------------------------------------------------------
  async function markAllRead() {
    setMarking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMarking(false); return; }

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications([]);
    setMarking(false);
  }

  if (!open) return null;

  // -------------------------------------------------------------------------
  // Styles (CSS variables from tokens.css)
  // -------------------------------------------------------------------------
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 1000,
    width: 360,
    maxHeight: 480,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-bg-card, #fff)',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: 'var(--radius-lg, 0.75rem)',
    boxShadow: 'var(--shadow-lg, 0 10px 30px rgba(0,0,0,0.12))',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    background: 'var(--color-bg-subtle, #f8fafc)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-text-primary, #0f172a)',
    margin: 0,
  };

  const markBtnStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--color-primary, #2563eb)',
    background: 'none',
    border: 'none',
    cursor: marking ? 'not-allowed' : 'pointer',
    padding: '0.2rem 0.5rem',
    borderRadius: 4,
    opacity: marking ? 0.6 : 1,
    transition: 'opacity 0.15s',
  };

  const listStyle: React.CSSProperties = {
    overflowY: 'auto',
    flex: 1,
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    transition: 'background 0.1s',
    cursor: 'default',
  };

  const msgStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: 'var(--color-text-primary, #0f172a)',
    lineHeight: 1.4,
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted, #64748b)',
  };

  const linkStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--color-primary, #2563eb)',
    textDecoration: 'none',
  };

  const emptyStyle: React.CSSProperties = {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'var(--color-text-muted, #64748b)',
    fontSize: '0.85rem',
  };

  return (
    <div ref={panelRef} style={panelStyle} role="dialog" aria-label="Notifications">
      {/* Header */}
      <div style={headerStyle}>
        <p style={titleStyle}>
          Notifications
          {notifications.length > 0 && (
            <span
              style={{
                marginLeft: '0.4rem',
                background: 'var(--color-primary, #2563eb)',
                color: '#fff',
                borderRadius: '999px',
                padding: '0 0.4rem',
                fontSize: '0.7rem',
              }}
            >
              {notifications.length}
            </span>
          )}
        </p>
        <button
          style={markBtnStyle}
          onClick={markAllRead}
          disabled={marking || notifications.length === 0}
        >
          Mark all read
        </button>
      </div>

      {/* Body */}
      <div style={listStyle}>
        {loading ? (
          <div style={emptyStyle}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div style={emptyStyle}>🎉 You're all caught up!</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={itemStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  'var(--color-bg-hover, #f1f5f9)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span style={msgStyle}>{n.message}</span>
              <div style={metaStyle}>
                <span>{timeAgo(n.created_at)}</span>
                {n.action_url && (
                  <>
                    <span>·</span>
                    <a
                      href={n.action_url}
                      style={linkStyle}
                      onClick={onClose}
                    >
                      View →
                    </a>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
