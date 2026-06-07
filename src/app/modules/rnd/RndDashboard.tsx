import { useMemo } from 'react';
import { useRndFormulas, useRndTrials } from '../../hooks';
import { fmtDate } from '../../types/bos'; // Using BOS formatter

export function RndDashboard() {
  const { items: formulas, loading: fLoad, error: fErr, reload: fReload } = useRndFormulas();
  const { items: trials, loading: tLoad, error: tErr, reload: tReload } = useRndTrials();

  const loading = fLoad || tLoad;
  const error = fErr || tErr;

  const handleRefresh = () => {
    fReload();
    tReload();
  };

  const stats = useMemo(() => {
    const validTrials = trials || [];
    const validFormulas = formulas || [];
    const ago30 = new Date(Date.now() - 30 * 86_400_000);
    return {
      activeTrials: validTrials.filter(t => t.status === 'IN_PROGRESS').length,
      failedBatches: validTrials.filter(
        t => t.status === 'FAILED' && new Date(t.created_at) > ago30
      ).length,
      approvedFormulas: validFormulas.filter(f => f.status === 'APPROVED' || f.status === 'LOCKED').length,
      draftFormulas: validFormulas.filter(f => f.status === 'DRAFT').length
    };
  }, [formulas, trials]);

  const recentTrials = useMemo(() => 
    [...(trials || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5), 
  [trials]);
  
  const recentFormulas = useMemo(() => 
    [...(formulas || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5), 
  [formulas]);

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading Dashboard Data...</div>;
  if (error) return <div style={{ padding: 40, color: '#ef4444' }}>Error loading dashboard: {error} <button className="rnd-btn" onClick={handleRefresh} style={{marginLeft: 16}}>Retry</button></div>;

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="rnd-title">Laboratory Overview</h1>
          <p className="rnd-subtitle">Formulation metrics, active trials, and system alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="rnd-btn" onClick={() => window.location.href = '/rnd/settings'}>⚙️ Settings</button>
          <button className="rnd-btn" onClick={handleRefresh}>🔄 Refresh Data</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="rnd-card" style={{ borderTop: '3px solid #0ea5e9' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Trials</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>{stats.activeTrials}</div>
        </div>
        <div className="rnd-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Failed Batches (30d)</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>{stats.failedBatches}</div>
        </div>
        <div className="rnd-card" style={{ borderTop: '3px solid #22c55e' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Approved Formulas</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>{stats.approvedFormulas}</div>
        </div>
        <div className="rnd-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Formulas in Draft</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>{stats.draftFormulas}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="rnd-card" style={{ padding: 0 }}>
          <div className="rnd-card-header" style={{ padding: '20px 20px 0', borderBottom: 'none' }}>Recent Trials</div>
          <table className="rnd-table">
            <thead><tr><th>Trial No</th><th>Formula</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {recentTrials.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center' }}>No trials logged</td></tr> : recentTrials.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.trial_no}</td>
                  <td>{t.formula?.formula_code || 'Unknown'}</td>
                  <td>
                    <span className={`rnd-badge rnd-badge-${t.status === 'FAILED' ? 'failed' : t.status === 'COMPLETED' ? 'success' : 'draft'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rnd-card" style={{ padding: 0 }}>
          <div className="rnd-card-header" style={{ padding: '20px 20px 0', borderBottom: 'none' }}>Latest Formulations</div>
          <table className="rnd-table">
            <thead><tr><th>Code</th><th>Name</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>
              {recentFormulas.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center' }}>No formulas created</td></tr> : recentFormulas.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{f.formula_code}</td>
                  <td>{f.name}</td>
                  <td>v{(f.version ?? 1).toFixed(1)}</td>
                  <td>
                    <span className={`rnd-badge rnd-badge-${f.status === 'LOCKED' ? 'locked' : f.status === 'APPROVED' ? 'success' : 'draft'}`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
