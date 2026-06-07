/**
 * AppShell — Universal Sidebar Layout Component
 * SVRERP02 Phase 1 Implementation
 *
 * Replaces 11 duplicate sidebar implementations (~8,000 lines of duplicated code).
 * Uses tokens.css CSS variables — no hardcoded hex values.
 *
 * Usage:
 *   <AppShell module={{ icon, label, sublabel }} nav={NAV} onFirstNavPath="/module">
 *     <Outlet />
 *   </AppShell>
 */

import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks';
import { NotificationPanel } from '../NotificationPanel';
import '../../styles/tokens.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShellNavItem {
  label: string;
  path: string;
  icon: ReactNode;
  exact?: boolean;
  badge?: number | null;    // e.g. unread count
  minRole?: string;         // hide if user below this role
}

export interface ShellNavSection {
  section?: string;         // optional section heading
  minRole?: string;         // hide entire section if below
  items: ShellNavItem[];
}

export interface ShellModuleConfig {
  icon: ReactNode;
  label: string;
  sublabel: string;
}

interface AppShellProps {
  module: ShellModuleConfig;
  /** Pass either a flat nav array or a sectioned nav array */
  nav: ShellNavItem[] | ShellNavSection[];
  children: ReactNode;
  /** Extra footer links above sign-out (e.g. "View Live Site") */
  footerLinks?: ShellNavItem[];
  /** Show notification bell badge */
  notificationCount?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  OPERATOR: 1, QC: 2, EDITOR: 2, MANAGER: 3, ADMIN: 4,
};

function rankOf(role: string | undefined | null): number {
  return ROLE_RANK[role ?? 'OPERATOR'] ?? 1;
}

function isSectioned(nav: ShellNavItem[] | ShellNavSection[]): nav is ShellNavSection[] {
  return nav.length > 0 && 'items' in nav[0];
}

// ── SVG Icons (reusable) ──────────────────────────────────────────────────────

export const Icons = {
  signOut: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AppShell({ module: mod, nav, children, footerLinks, notificationCount }: AppShellProps) {
  const { pathname }   = useLocation();
  const navigate        = useNavigate();
  const { signOut, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userRank = rankOf(role);

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  const go = (path: string) => { navigate(path); setOpen(false); };

  // Normalize nav to sectioned format
  const sections: ShellNavSection[] = isSectioned(nav)
    ? nav
    : [{ items: nav as ShellNavItem[] }];

  // First visible nav path (for brand click)
  const firstPath = (nav as ShellNavItem[])[0]?.path
    ?? (nav as ShellNavSection[])[0]?.items[0]?.path
    ?? '/';

  const renderNavItem = (item: ShellNavItem) => {
    if (item.minRole && rankOf(item.minRole) > userRank) return null;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`shell-nav-link${isActive(item.path, item.exact) ? ' active' : ''}`}
        onClick={() => setOpen(false)}
      >
        <span className="shell-nav-icon">{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="shell-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="shell">

      {/* ── Sidebar ── */}
      <aside className={`shell-sidebar${open ? ' open' : ''}`}>

        {/* Brand + Bell */}
        <div className="shell-brand" onClick={() => go(firstPath)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && go(firstPath)}>
          <div className="shell-brand-row">
            <div className="shell-brand-icon">{mod.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="shell-brand-name">{mod.label}</div>
              <div className="shell-brand-sub">{mod.sublabel}</div>
            </div>
            {/* Notification Bell */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                id="notif-bell-btn"
                onClick={e => { e.stopPropagation(); setNotifOpen(o => !o); }}
                aria-label={`Notifications${notificationCount ? ` (${notificationCount} unread)` : ''}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: notifOpen ? 'var(--color-accent)' : 'var(--color-text-3)',
                  padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
                  position: 'relative',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notificationCount != null && notificationCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0,
                    background: '#EF4444', color: '#fff',
                    borderRadius: '50%', fontSize: 8, fontWeight: 700,
                    width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="shell-nav" aria-label={`${mod.label} navigation`}>
          {sections.map((sec, si) => {
            if (sec.minRole && rankOf(sec.minRole) > userRank) return null;
            const visibleItems = sec.items.filter(item =>
              !item.minRole || rankOf(item.minRole) <= userRank
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={si}>
                {sec.section && (
                  <span className="shell-nav-section-label">{sec.section}</span>
                )}
                {visibleItems.map(renderNavItem)}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shell-sidebar-foot">
          {/* Optional footer links (e.g. View Live Site) */}
          {footerLinks?.map(link => (
            <button
              key={link.path}
              className="shell-nav-link"
              onClick={() => link.path.startsWith('http') ? window.open(link.path, '_blank') : go(link.path)}
            >
              <span className="shell-nav-icon">{link.icon}</span>
              {link.label}
            </button>
          ))}

          {/* Sign Out */}
          <button
            className="shell-nav-link"
            onClick={() => signOut().then(() => navigate('/login'))}
            style={{ color: 'var(--color-danger)' }}
          >
            <span className="shell-nav-icon">{Icons.signOut}</span>
            Sign Out
          </button>

          {/* User chip */}
          <div className="shell-user-chip" style={{ marginTop: 4 }}>
            <div className="shell-user-avatar">{Icons.user}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="shell-user-name">{role ?? 'Staff'}</div>
              <div className="shell-user-role">{mod.sublabel}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="shell-overlay visible"
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{ display: 'block' }}
        />
      )}

      {/* ── Mobile topbar ── */}
      <div className="shell-mob-bar" role="banner">
        <button
          className="shell-mob-btn"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {Icons.menu}
        </button>
        <span className="shell-mob-title">{mod.label}</span>
        <div style={{ width: 28 }} />
      </div>

      {/* ── Main content ── */}
      <main className="shell-main">
        <div className="shell-content">
          {children}
        </div>
      </main>
    </div>
  );
}
