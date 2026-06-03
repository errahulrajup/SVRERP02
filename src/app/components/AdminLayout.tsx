import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth, useUnreadCount, useSiteSettings } from '../hooks';

// ── Complete nav structure with enterprise hierarchy ──────────
// SVG icon components — replaces emoji (T-003 fix)
const Icons = {
  products:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  categories:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  blog:         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  homepage:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  about:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  testimonials: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  media:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  inquiries:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  seo:          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  analytics:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  settings:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  users:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  activity:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  roles:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  health:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  backup:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

const NAV = [
  {
    section: 'Content Management',
    minRole: 'EDITOR',
    items: [
      { icon: Icons.products,     label: 'Products',       path: '/admin/content/products' },
      { icon: Icons.categories,   label: 'Categories',     path: '/admin/content/categories' },
      { icon: Icons.blog,         label: 'Blog',            path: '/admin/content/blog' },
      { icon: Icons.homepage,     label: 'Homepage',        path: '/admin/content/homepage' },
      { icon: Icons.about,        label: 'About Page',      path: '/admin/content/about' },
      { icon: Icons.testimonials, label: 'Testimonials',    path: '/admin/content/testimonials' },
      { icon: Icons.media,        label: 'Media Library',   path: '/admin/content/media' },
    ],
  },
  {
    section: 'Operations',
    minRole: 'MANAGER',
    items: [
      { icon: Icons.inquiries,    label: 'Inquiries',       path: '/admin/operations/inquiries', badge: true },
      { icon: Icons.seo,          label: 'SEO Manager',     path: '/admin/operations/seo' },
      { icon: Icons.analytics,    label: 'Analytics',       path: '/admin/operations/analytics' },
    ],
  },
  {
    section: 'System',
    minRole: 'ADMIN',
    items: [
      { icon: Icons.settings,     label: 'Global Settings',  path: '/admin/settings' },
      { icon: Icons.users,        label: 'Users',             path: '/admin/users' },
      { icon: Icons.roles,        label: 'Roles & Permissions', path: '/admin/roles' },
      { icon: Icons.activity,     label: 'Audit Log',         path: '/admin/audit' },
      { icon: Icons.health,       label: 'System Health',     path: '/admin/health' },
      { icon: Icons.backup,       label: 'Backups & Export',  path: '/admin/backups' },
    ],
  },
 ] as const;
export function AdminLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut, role, canAccess } = useAuth();
  const { settings } = useSiteSettings();
  const logoSrc = settings.site_logo;
  const unread      = useUnreadCount();
  const [open, setOpen] = useState(false);

  const isActive = (p: string) =>
    location.pathname === p || location.pathname.startsWith(p + '/');

  const go = (p: string) => { navigate(p); setOpen(false); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar${open ? ' open' : ''}`}>

        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {logoSrc ? (
                <img src={logoSrc} width={20} height={20}
                  style={{ objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 16 }}>🏭</span>
              )}
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>SVR20</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,193,7,0.45)', textTransform: 'uppercase', marginTop: 2 }}>
                CMS · {role ?? 'NO ROLE'}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard button */}
        <div style={{ padding: '10px 8px 2px', flexShrink: 0 }}>
          <button
            className={`adm-nav-link${location.pathname === '/admin' ? ' active' : ''}`}
            onClick={() => go('/admin')}
          >
            <span>📊</span>
            <span style={{ flex: 1 }}>Operations Dashboard</span>
          </button>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {NAV.filter(s => canAccess(s.minRole)).map(({ section, items }) => (
            <div key={section} style={{ marginTop: 18 }}>
              <p style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: 8.5, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.18)', padding: '0 12px', marginBottom: 3,
              }}>
                {section}
              </p>
              {items.map(item => (
                <button
                  key={item.path}
                  className={`adm-nav-link${isActive(item.path) ? ' active' : ''}`}
                  onClick={() => go(item.path)}
                >
                  <span>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {('badge' in item && item.badge) && unread > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#fff',
                      borderRadius: 'var(--radius-full)', fontSize: 9,
                      fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center',
                    }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* BOS + DMS links */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', padding: '0 12px', marginBottom: 3 }}>
              Business OS
            </p>
            <button className="adm-nav-link" onClick={() => window.open('/bos/login', '_blank')}>
              <span>🏭</span>
              <span style={{ flex: 1 }}>Open BOS</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>↗</span>
            </button>
            <button id="admin-nav-dms" className="adm-nav-link" onClick={() => go('/dms')}>
              <span>📄</span>
              <span style={{ flex: 1 }}>Document Pro (DMS)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="adm-nav-link" onClick={() => navigate('/')}>
            <span>🌐</span> View Live Site
          </button>
          <button
            className="adm-nav-link"
            onClick={() => signOut().then(() => navigate('/admin/login'))}
            style={{ color: 'rgba(239,68,68,0.55)' }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 199 }}
        />
      )}

      {/* Mobile top bar */}
      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0,
        height: 52, background: '#080808', borderBottom: '1px solid var(--border)',
        zIndex: 198, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }} className="adm-mob-bar">
        <button onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 20, lineHeight: 1 }}>
          ☰
        </button>
        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>Admin</span>
        <div style={{ width: 24 }} />
      </div>

      {/* Main content */}
      <main className="adm-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
