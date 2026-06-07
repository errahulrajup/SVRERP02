import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../hooks';

const INV_NAV = [
  { icon: '📦', label: 'Store (FG & RM)', path: '/inventory/store' },
  { icon: '📥', label: 'Inward GRN', path: '/inventory/inward' },
  { icon: '🔍', label: 'Traceability', path: '/inventory/traceability' },
  { icon: '🗂️', label: 'Master Data Registry', path: '/inventory/master-data' },
] as const;

// ── BUG-003 FIX: Aligned to Forest Prestige theme (was light-blue #f5f7fa/#2563eb)
// ── BUG-004 FIX: Sidebar width 260px → 240px (var(--sidebar-w))
// ── BUG-008 FIX: Overlay opacity 0.4 → 0.72 (consistent with AdminLayout)
// ── BUG-013/025 FIX: SVG burger icon + aria-label

export function InventoryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, role } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (p: string) => location.pathname.startsWith(p);
  const go = (p: string) => { navigate(p); setOpen(false); };

  return (
    <div className="inv-app" style={{ display: 'flex', minHeight: '100vh', background: '#0C1510', color: '#F0EDE6', fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        .inv-sidebar {
          width: 200px; background: #111C14; border-right: 1px solid rgba(123,169,123,0.12);
          display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 200;
        }
        .inv-nav-link {
          display: flex; align-items: center; gap: 8px; padding: 6px 10px;
          background: transparent; border: none; width: 100%; text-align: left;
          color: #9AAF96; font-size: 12px; font-weight: 500; cursor: pointer;
          transition: all 0.2s; border-radius: 6px; margin-bottom: 1px;
          border-left: 3px solid transparent;
        }
        .inv-nav-link:hover { background: rgba(212,168,67,0.08); color: #D4A843; }
        .inv-nav-link.active {
          background: rgba(212,168,67,0.08); color: #D4A843; font-weight: 600;
          border-left-color: #D4A843;
        }
        .inv-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0C1510; }
        .inv-mob-bar {
          display: none; background: #111C14; padding: 0 20px; height: 56px;
          border-bottom: 1px solid rgba(123,169,123,0.12);
          align-items: center; justify-content: space-between;
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        }
        .inv-content { flex: 1; overflow-y: auto; position: relative; }

        @media (max-width: 768px) {
          .inv-sidebar { position: fixed; top: 0; bottom: 0; left: 0; transform: translateX(-100%); }
          .inv-sidebar.open { transform: translateX(0); }
          .inv-mob-bar { display: flex !important; }
          .inv-content { margin-top: 56px; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className={`inv-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid rgba(123,169,123,0.12)', marginBottom: 4, cursor: 'pointer' }} onClick={() => navigate('/inventory/store')}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F0EDE6', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
              📦
            </div>
            Inventory
          </div>
          <div style={{ fontSize: 7.5, color: '#A07828', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1, fontWeight: 600 }}>Material Control</div>
        </div>

        <div style={{ padding: '2px 4px', flex: 1, overflowY: 'auto' }}>
          {INV_NAV.map(item => (
            <button key={item.path} className={`inv-nav-link${isActive(item.path) ? ' active' : ''}`} onClick={() => go(item.path)}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px', borderTop: '1px solid rgba(123,169,123,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0C1510', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(123,169,123,0.12)' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#F0EDE6', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{role || 'Staff'}</div>
              <div style={{ fontSize: 9, color: '#556355' }}>Store Module</div>
            </div>
            <button onClick={() => { signOut(); navigate('/admin/login'); }} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', padding: 4 }} title="Sign Out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 150 }} />}

      {/* ── Main Canvas ── */}
      <main className="inv-main">
        <div className="inv-mob-bar">
          <div style={{ fontWeight: 700, color: '#F0EDE6', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📦</span> Inventory
          </div>
          <button
            onClick={() => setOpen(true)}
            aria-label="Toggle navigation menu"
            style={{ background: 'none', border: 'none', color: '#9AAF96', cursor: 'pointer', padding: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="inv-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
