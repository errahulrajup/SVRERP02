import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks';

const MODULES = [
  { id: 'cms', label: 'CMS', icon: '📝', path: '/cms', desc: 'Website Content Management', role: 'EDITOR' },
  { id: 'dms', label: 'DMS', icon: '🗂️', path: '/dms', desc: 'Document Management System', role: 'MANAGER' },
  { id: 'rnd', label: 'RND', icon: '🔬', path: '/rnd', desc: 'Research and Development', role: 'MANAGER' },
  { id: 'fsms', label: 'FSMS', icon: '🛡️', path: '/fsms', desc: 'Food Safety Management', role: 'QC' },
  { id: 'production', label: 'Production', icon: '🏭', path: '/production', desc: 'Manufacturing & Recipes', role: 'OPERATOR' },
  { id: 'qc', label: 'Quality Control', icon: '✅', path: '/qc', desc: 'Quality Checks & Release', role: 'QC' },
  { id: 'inventory', label: 'Inventory', icon: '📦', path: '/inventory', desc: 'Material Control & Traceability', role: 'OPERATOR' },
  { id: 'accounts', label: 'Accounts', icon: '💰', path: '/accounts', desc: 'Finance & Commercial', role: 'MANAGER' },
  { id: 'compliances', label: 'Compliances', icon: '📋', path: '/compliances', desc: 'Regulatory & Audit', role: 'QC' },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { canAccessModule } = useAuth();

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(24px,3vw,34px)', fontWeight: 700, color: '#fff' }}>
          ERP Control Center
        </h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          Select a module to continue
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {MODULES.map(mod => {
          const hasAccess = canAccessModule(mod.id);
          
          return (
            <div
              key={mod.id}
              onClick={() => hasAccess && navigate(mod.path)}
              style={{
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', 
                padding: '24px 20px',
                cursor: hasAccess ? 'pointer' : 'not-allowed', 
                opacity: hasAccess ? 1 : 0.5,
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                position: 'relative'
              }}
              onMouseEnter={e => {
                if (!hasAccess) return;
                const d = e.currentTarget as HTMLDivElement;
                d.style.borderColor = 'var(--border-gold)';
                d.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                if (!hasAccess) return;
                const d = e.currentTarget as HTMLDivElement;
                d.style.borderColor = 'var(--border)';
                d.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{mod.icon}</div>
              <h3 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {mod.label}
              </h3>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                {mod.desc}
              </p>
              {!hasAccess && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(248,113,113,0.1)', color: '#F87171', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                  Locked
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: 48 }}>
        <h2 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>System Management</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Users', 'Roles', 'Permissions', 'Settings', 'Audit', 'Health', 'Backups'].map(sys => (
            <button
              key={sys}
              onClick={() => navigate(`/admin/${sys.toLowerCase()}`)}
              style={{
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 16px',
                color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif"
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              {sys}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
