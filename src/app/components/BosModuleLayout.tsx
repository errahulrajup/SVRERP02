/**
 * BosModuleLayout — Shared sidebar layout component for all BOS modules
 * Replaces the bare module-header/layout-container pattern
 * Matches the Forest Prestige dark-green design language of DmsLayout/InventoryLayout
 *
 * Usage:
 *   <BosModuleLayout module={{ icon, label, sublabel, accent }} nav={[...]} backPath="/admin">
 *     <Outlet />
 *   </BosModuleLayout>
 */

import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks';

export interface BosNavItem {
  label: string;
  path: string;
  icon: ReactNode;
  exact?: boolean;
}

export interface BosModuleConfig {
  icon: ReactNode;
  label: string;
  sublabel: string;
  accent?: string;      // override gold accent colour
  accentRgb?: string;   // rgb values for rgba() usage
}

interface Props {
  module: BosModuleConfig;
  nav: BosNavItem[];
  children: ReactNode;
}

const GOLD       = '#D4A843';
const GOLD_RGB   = '212,168,67';
const BG0        = '#060D08';
const BG1        = '#0C1510';
const BG2        = '#111C14';
const BORDER     = 'rgba(123,169,123,0.12)';
const TEXT1      = '#F0EDE6';
const TEXT2      = '#9AAF96';
const TEXT3      = '#556355';

export function BosModuleLayout({ module: mod, nav, children }: Props) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { signOut, role } = useAuth();
  const [open, setOpen] = useState(false);

  const accent    = mod.accent    ?? GOLD;
  const accentRgb = mod.accentRgb ?? GOLD_RGB;

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  const go = (path: string) => { navigate(path); setOpen(false); };

  const CSS = `
    .bml-shell { display:flex; min-height:100vh; background:${BG0}; color:${TEXT1}; font-family:'DM Sans','Inter',system-ui,sans-serif; }

    /* ── Sidebar ── */
    .bml-sidebar {
      width: 240px; min-width: 240px; background: ${BG2};
      border-right: 1px solid ${BORDER};
      display: flex; flex-direction: column;
      position: fixed; top: 0; left: 0; height: 100vh;
      z-index: 200; overflow-y: auto;
      transition: transform 0.28s cubic-bezier(.4,0,.2,1);
    }
    .bml-sidebar-brand {
      padding: 20px 16px 16px;
      border-bottom: 1px solid ${BORDER};
      flex-shrink: 0;
      cursor: pointer;
    }
    .bml-brand-row { display:flex; align-items:center; gap:12px; }
    .bml-brand-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(${accentRgb},0.12);
      border: 1px solid rgba(${accentRgb},0.28);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .bml-brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px; font-weight: 700; color: ${TEXT1};
      line-height: 1.2;
    }
    .bml-brand-sub {
      font-size: 8.5px; font-weight: 700; color: ${accent};
      letter-spacing: 0.2em; text-transform: uppercase; margin-top: 3px;
      opacity: 0.7;
    }

    /* ── Nav ── */
    .bml-nav { flex: 1; padding: 8px; overflow-y: auto; }
    .bml-nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      background: transparent; border: none; width: 100%;
      text-align: left; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 500;
      color: ${TEXT2}; cursor: pointer; text-decoration: none;
      border-left: 2px solid transparent;
      transition: background 0.15s, color 0.15s, border-left-color 0.15s;
      margin-bottom: 2px;
    }
    .bml-nav-link:hover { background: rgba(${accentRgb},0.07); color: ${accent}; }
    .bml-nav-link.active {
      background: rgba(${accentRgb},0.10);
      color: ${accent}; font-weight: 600;
      border-left-color: ${accent};
    }
    .bml-nav-icon {
      width: 18px; text-align: center; flex-shrink: 0;
      opacity: 0.75; display: flex; align-items: center; justify-content: center;
    }
    .bml-nav-link.active .bml-nav-icon,
    .bml-nav-link:hover .bml-nav-icon { opacity: 1; }

    /* ── Footer ── */
    .bml-sidebar-foot {
      border-top: 1px solid ${BORDER}; padding: 12px;
      flex-shrink: 0;
    }
    .bml-user-chip {
      display: flex; align-items: center; gap: 10px;
      background: ${BG1}; border: 1px solid ${BORDER};
      border-radius: 10px; padding: 10px 12px;
    }
    .bml-user-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(${accentRgb},0.15);
      border: 1px solid rgba(${accentRgb},0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; color: ${accent};
    }
    .bml-user-name { font-size: 12px; font-weight: 600; color: ${TEXT1}; }
    .bml-user-role { font-size: 10px; color: ${TEXT3}; margin-top: 1px; }
    .bml-signout-btn {
      background: none; border: none; color: rgba(239,68,68,0.55);
      cursor: pointer; padding: 4px; margin-left: auto; flex-shrink: 0;
      display: flex; align-items: center;
      transition: color 0.2s;
    }
    .bml-signout-btn:hover { color: #ef4444; }

    /* ── Main ── */
    .bml-main { flex: 1; margin-left: 240px; min-height: 100vh; display: flex; flex-direction: column; background: ${BG0}; }

    /* ── Mobile topbar ── */
    .bml-mob-bar {
      display: none;
      position: fixed; top: 0; left: 0; right: 0; height: 56px;
      background: ${BG2}; border-bottom: 1px solid ${BORDER};
      z-index: 198; align-items: center; justify-content: space-between;
      padding: 0 16px;
    }
    .bml-mob-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 15px; font-weight: 700; color: ${TEXT1};
    }
    .bml-mob-btn {
      background: none; border: none; color: ${TEXT2};
      cursor: pointer; padding: 4px; display: flex;
    }

    /* ── Overlay ── */
    .bml-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.72); z-index: 190;
    }

    /* ── Content ── */
    .bml-content { flex: 1; overflow-y: auto; }

    /* ── Scrollbar ── */
    .bml-shell ::-webkit-scrollbar { width: 4px; }
    .bml-shell ::-webkit-scrollbar-track { background: transparent; }
    .bml-shell ::-webkit-scrollbar-thumb { background: rgba(123,169,123,0.2); border-radius: 4px; }
    .bml-shell ::-webkit-scrollbar-thumb:hover { background: rgba(${accentRgb},0.4); }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .bml-sidebar { transform: translateX(-100%); }
      .bml-sidebar.open { transform: translateX(0); }
      .bml-mob-bar { display: flex !important; }
      .bml-main { margin-left: 0; }
      .bml-content { margin-top: 56px; }
      .bml-overlay { display: block !important; }
    }
  `;

  return (
    <div className="bml-shell">
      <style>{CSS}</style>

      {/* ── Sidebar ── */}
      <aside className={`bml-sidebar${open ? ' open' : ''}`}>

        {/* Brand */}
        <div className="bml-sidebar-brand" onClick={() => nav[0] && go(nav[0].path)}>
          <div className="bml-brand-row">
            <div className="bml-brand-icon">
              {mod.icon}
            </div>
            <div>
              <div className="bml-brand-name">{mod.label}</div>
              <div className="bml-brand-sub">{mod.sublabel}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="bml-nav">
          {nav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`bml-nav-link${isActive(item.path, item.exact) ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="bml-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="bml-sidebar-foot">
          <div className="bml-user-chip">
            <div className="bml-user-avatar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="bml-user-name">{role ?? 'Staff'}</div>
              <div className="bml-user-role">{mod.sublabel}</div>
            </div>
            <button
              className="bml-signout-btn"
              onClick={() => signOut().then(() => navigate('/login'))}
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="bml-overlay"
          onClick={() => setOpen(false)}
          style={{ display: 'block' }}
        />
      )}

      {/* ── Mobile topbar ── */}
      <div className="bml-mob-bar">
        <button
          className="bml-mob-btn"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="bml-mob-title">{mod.label}</span>
        <div style={{ width: 28 }} />
      </div>

      {/* ── Main ── */}
      <main className="bml-main">
        <div className="bml-content">
          {children}
        </div>
      </main>
    </div>
  );
}
