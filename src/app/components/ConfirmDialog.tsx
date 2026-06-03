/**
 * ConfirmDialog — replaces native confirm() for destructive actions.
 * CQ-002 fix: styled modal consistent with Forest Prestige dark theme.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Delete',
  onConfirm, onCancel,
  danger = true,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          animation: 'dialogIn 0.18s ease',
        }}>
          <style>{`@keyframes dialogIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: danger ? 'rgba(248,113,113,0.10)' : 'var(--gold-soft)',
            border: `1px solid ${danger ? 'rgba(248,113,113,0.20)' : 'var(--border-gold)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            {danger ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18, fontWeight: 700, color: 'var(--text-1)',
            marginBottom: 10,
          }}>{title}</h2>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7,
            marginBottom: 28,
          }}>{message}</p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn btn-sm"
              style={danger
                ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.22)' }
                : { background: 'var(--gold)', color: '#0B0B0B' }
              }
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
