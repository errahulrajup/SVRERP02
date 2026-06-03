import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth, useSiteSettings } from '../hooks';

const Icons = {
  settings: <span style={{ fontSize: 16 }}>⚙️</span>,
  users:    <span style={{ fontSize: 16 }}>👥</span>,
  activity: <span style={{ fontSize: 16 }}>📜</span>,
  roles:    <span style={{ fontSize: 16 }}>🛡️</span>,
  health:   <span style={{ fontSize: 16 }}>🩺</span>,
  backups:  <span style={{ fontSize: 16 }}>💾</span>,
};

const NAV = [
  {
    section: 'System Control',
    minRole: 'ADMIN',
    items: [
      { icon: Icons.settings,     label: 'Global Settings',   path: '/admin/settings' },
      { icon: Icons.users,        label: 'Users',            path: '/admin/users' },
      { icon: Icons.roles,        label: 'Roles & Perms',    path: '/admin/roles' },
      { icon: Icons.activity,     label: 'Audit Log',        path: '/admin/audit' },
      { icon: Icons.health,       label: 'System Health',    path: '/admin/health' },
      { icon: Icons.backups,      label: 'Backups',          path: '/admin/backups' },
    ],
  },
] as const;

export function AdminLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut, role, canAccess } = useAuth();
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;
  const [open, setOpen] = useState(false);

  const isActive = (p: string) =>
    location.pathname === p || location.pathname.startsWith(p + '/');

  const go = (p: string) => { navigate(p); setOpen(false); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <aside className={`adm-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {logoSrc ? <img src={logoSrc} width={20} height={20} style={{ objectFit: 'contain' }} alt="Logo" /> : <img src="/favicon.svg" width={20} height={20} alt="Logo" />}
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>ERP Control</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,193,7,0.45)', textTransform: 'uppercase', marginTop: 2 }}>
                Admin · {role ?? 'NO ROLE'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 8px 2px', flexShrink: 0 }}>
          <button className={`adm-nav-link${location.pathname === '/admin' ? ' active' : ''}`} onClick={() => go('/admin')}>
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </span>
            <span style={{ flex: 1 }}>ERP Dashboard</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {NAV.filter(s => canAccess(s.minRole)).map(({ section, items }) => (
            <div key={section} style={{ marginTop: 18 }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', padding: '0 12px', marginBottom: 3 }}>
                {section}
              </p>
              {items.map(item => (
                <button key={item.path} className={`adm-nav-link${isActive(item.path) ? ' active' : ''}`} onClick={() => go(item.path)}>
                  <span>{item.icon}</span> <span style={{ flex: 1 }}>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="adm-nav-link" onClick={() => navigate('/')}>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </span>
            View Live Site
          </button>
          <button className="adm-nav-link" onClick={() => signOut().then(() => navigate('/login'))} style={{ color: 'rgba(239,68,68,0.55)' }}>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            Sign Out
          </button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 199 }} />}

      <div
        className="adm-mob-bar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56,
          background: '#080808', borderBottom: '1px solid var(--border)',
          zIndex: 198, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', lineHeight: 1, padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>ERP Admin</span>
        <div style={{ width: 28 }} />
      </div>

      <main className="adm-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
