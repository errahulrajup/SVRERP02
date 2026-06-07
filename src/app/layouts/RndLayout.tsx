import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../hooks';

const RND_NAV = [
  { icon: '🔬', label: 'Dashboard', path: '/rnd/dashboard' },
  { icon: '🧪', label: 'Formulations', path: '/rnd/formulations' },
  { icon: '📊', label: 'Trials & Testing', path: '/rnd/trials' },
  { icon: '✔️', label: 'Validation', path: '/rnd/validation' },
  { icon: '📓', label: 'Lab Notebook', path: '/rnd/notebook' },
  { icon: '⚙️', label: 'Process SOPs', path: '/rnd/processes' },
  { icon: '📋', label: 'Ingredients Intel', path: '/rnd/ingredients' },
] as const;

// ── BUG-003 FIX: Aligned accent from sky-blue (#0ea5e9) to Forest Prestige gold (#D4A843)
//                Background kept dark (#0C1510 instead of #0a0b10) — same dark family, unified palette
// ── BUG-004 FIX: Sidebar width 260px → 240px
// ── BUG-008 FIX: Overlay opacity 0.8 → 0.72 (standardized across all layouts)
// ── BUG-025 FIX: aria-label added to mobile toggle

export function RndLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, role, canAccess } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (p: string) => location.pathname.startsWith(p);
  const go = (p: string) => { navigate(p); setOpen(false); };

  return (
    <div className="rnd-app" style={{ display: 'flex', minHeight: '100vh', background: '#0C1510', color: '#F0EDE6', fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>
      {/* ── Global CSS for R&D Module ── */}
      <style>{`
        .rnd-sidebar {
          width: 200px; background: #111C14; border-right: 1px solid rgba(123,169,123,0.12);
          display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 200;
        }
        .rnd-nav-link {
          display: flex; align-items: center; gap: 8px; padding: 6px 10px;
          background: transparent; border: none; width: 100%; text-align: left;
          color: #9AAF96; font-size: 12px; font-weight: 500; cursor: pointer;
          transition: all 0.2s; border-radius: 6px; margin-bottom: 1px;
          border-left: 3px solid transparent;
        }
        .rnd-nav-link:hover { background: rgba(212,168,67,0.08); color: #D4A843; }
        .rnd-nav-link.active {
          background: rgba(212,168,67,0.08); color: #D4A843; font-weight: 600;
          border-left-color: #D4A843;
        }
        .rnd-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .rnd-card { background: #111C14; border: 1px solid rgba(123,169,123,0.12); border-radius: 12px; padding: 10px 12px; }
        .rnd-card-header { font-size: 11.5px; font-weight: 600; color: #9AAF96; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid rgba(123,169,123,0.12); padding-bottom: 6px; }

        .rnd-btn { background: #1C2A1E; color: #F0EDE6; border: 1px solid rgba(123,169,123,0.18); padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .rnd-btn:hover { background: #213224; border-color: rgba(212,168,67,0.3); }
        .rnd-btn-primary { background: #D4A843; color: #060D08; border-color: #D4A843; }
        .rnd-btn-primary:hover { background: #C9993A; border-color: #C9993A; }

        .rnd-input { background: #111C14; border: 1px solid rgba(123,169,123,0.22); color: #F0EDE6; padding: 5px 10px; border-radius: 6px; font-size: 12px; outline: none; transition: border-color 0.2s; }
        .rnd-input:focus { border-color: #D4A843; box-shadow: 0 0 0 2px rgba(212,168,67,0.12); }

        .rnd-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .rnd-table th { text-align: left; padding: 5px 10px; border-bottom: 1px solid rgba(123,169,123,0.12); color: #556355; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; }
        .rnd-table td { padding: 6px 10px; border-bottom: 1px solid rgba(123,169,123,0.08); color: #9AAF96; }
        .rnd-table tr:hover td { background: rgba(212,168,67,0.04); }

        .rnd-badge { display: inline-flex; align-items: center; padding: 1.5px 6px; border-radius: 999px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; }
        .rnd-badge-draft { background: rgba(154,175,150,0.1); color: #9AAF96; border: 1px solid rgba(154,175,150,0.2); }
        .rnd-badge-locked { background: rgba(212,168,67,0.1); color: #D4A843; border: 1px solid rgba(212,168,67,0.25); }
        .rnd-badge-failed { background: rgba(224,82,82,0.1); color: #E05252; border: 1px solid rgba(224,82,82,0.2); }
        .rnd-badge-success { background: rgba(123,169,123,0.1); color: #7BA97B; border: 1px solid rgba(123,169,123,0.2); }

        .rnd-mob-bar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: #111C14; border-bottom: 1px solid rgba(123,169,123,0.12);
          z-index: 198; align-items: center; padding: 0 16px; justify-content: space-between;
        }
        /* Scrollbar */
        .rnd-app ::-webkit-scrollbar { width: 5px; height: 5px; }
        .rnd-app ::-webkit-scrollbar-track { background: transparent; }
        .rnd-app ::-webkit-scrollbar-thumb { background: rgba(123,169,123,0.25); border-radius: 4px; }
        .rnd-app ::-webkit-scrollbar-thumb:hover { background: rgba(212,168,67,0.4); }

        @media (max-width: 768px) {
          .rnd-sidebar { position: fixed; top: 0; bottom: 0; left: 0; transform: translateX(-100%); }
          .rnd-sidebar.open { transform: translateX(0); }
          .rnd-mob-bar { display: flex !important; }
          .rnd-content { margin-top: 56px; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className={`rnd-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid rgba(123,169,123,0.12)', marginBottom: 4 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F0EDE6', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
              ⌬
            </div>
            Srivriddhi R&D
          </div>
          <div style={{ fontSize: 7.5, color: '#A07828', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1, fontWeight: 600 }}>
            Laboratory Portal
          </div>
        </div>

        <div style={{ padding: '2px 4px', flex: 1, overflowY: 'auto' }}>
          {RND_NAV.map(item => (
            <button key={item.path} className={`rnd-nav-link${isActive(item.path) ? ' active' : ''}`} onClick={() => go(item.path)}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px', borderTop: '1px solid rgba(123,169,123,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#0C1510', borderRadius: 6, border: '1px solid rgba(123,169,123,0.12)' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1C2A1E', border: '1px solid rgba(123,169,123,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
              👤
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#F0EDE6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{role || 'Scientist'}</div>
              <div style={{ fontSize: 9, color: '#556355' }}>Formulation Lab</div>
            </div>
            <button onClick={() => { signOut(); navigate('/admin/login'); }} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', padding: 4 }} title="Sign Out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Overlay & Topbar ── */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 199 }} />}
      <div className="rnd-mob-bar">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
          style={{ background: 'none', border: 'none', color: '#F0EDE6', cursor: 'pointer', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 15, color: '#F0EDE6' }}>Srivriddhi R&D</div>
        <div style={{ width: 28 }} />
      </div>

      {/* ── Main Content ── */}
      <main className="rnd-content">
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
