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

  if (loading) return <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Dashboard Data...</div></div>;
  if (error) return <div className="bos-page"><div className="bos-alert bos-alert-danger">Error loading dashboard: {error} <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={handleRefresh} style={{marginLeft: 16}}>Retry</button></div></div>;

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div className="bos-flex-between">
          <div>
            <h1 className="bos-page-title">Laboratory Overview</h1>
            <p className="bos-page-sub">Formulation metrics, active trials, and system alerts.</p>
          </div>
          <div className="bos-flex" style={{ gap: 12 }}>
            <button className="bos-btn bos-btn-dark bos-btn-sm" onClick={() => window.location.href = '/rnd/settings'}>⚙️ Settings</button>
            <button className="bos-btn bos-btn-dark bos-btn-sm" onClick={handleRefresh}>🔄 Refresh Data</button>
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ marginBottom: 16 }}>
        <div className="bos-kpi-card" style={{ '--_kpi-color': 'var(--bos-blue)' } as any}>
          <div className="bos-kpi-label">Active Trials</div>
          <div className="bos-kpi-val">{stats.activeTrials}</div>
        </div>
        <div className="bos-kpi-card" style={{ '--_kpi-color': 'var(--bos-red)' } as any}>
          <div className="bos-kpi-label">Failed Batches (30d)</div>
          <div className="bos-kpi-val">{stats.failedBatches}</div>
        </div>
        <div className="bos-kpi-card" style={{ '--_kpi-color': 'var(--bos-green)' } as any}>
          <div className="bos-kpi-label">Approved Formulas</div>
          <div className="bos-kpi-val">{stats.approvedFormulas}</div>
        </div>
        <div className="bos-kpi-card" style={{ '--_kpi-color': 'var(--bos-gold)' } as any}>
          <div className="bos-kpi-label">Formulas in Draft</div>
          <div className="bos-kpi-val">{stats.draftFormulas}</div>
        </div>
      </div>

      <div className="bos-card-grid">
        <div className="bos-card" style={{ padding: 0 }}>
          <div className="bos-card-header" style={{ padding: '10px 12px' }}>
            <div className="bos-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>Recent Trials</div>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Trial No</th><th>Formula</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentTrials.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center' }}>No trials logged</td></tr> : recentTrials.map(t => (
                  <tr key={t.id}>
                    <td className="bos-tbl-primary">{t.trial_no}</td>
                    <td className="bos-tbl-mono">{t.formula?.formula_code || 'Unknown'}</td>
                    <td>
                      <span className={`bos-badge bos-badge-${t.status === 'FAILED' ? 'red' : t.status === 'COMPLETED' ? 'green' : t.status === 'IN_PROGRESS' ? 'blue' : 'gray'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="bos-text-muted">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bos-card" style={{ padding: 0 }}>
          <div className="bos-card-header" style={{ padding: '10px 12px' }}>
            <div className="bos-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>Latest Formulations</div>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Version</th><th>Status</th></tr></thead>
              <tbody>
                {recentFormulas.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center' }}>No formulas created</td></tr> : recentFormulas.map(f => (
                  <tr key={f.id}>
                    <td className="bos-tbl-mono">{f.formula_code}</td>
                    <td className="bos-tbl-primary">{f.name}</td>
                    <td>v{(f.version ?? 1).toFixed(1)}</td>
                    <td>
                      <span className={`bos-badge bos-badge-${f.status === 'LOCKED' ? 'gold' : f.status === 'APPROVED' ? 'green' : 'gray'}`}>
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
    </div>
  );
}
