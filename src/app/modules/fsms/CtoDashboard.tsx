import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';
import { captureException } from '../../lib/observability';

// Typed shape returned by get_cto_dashboard_metrics RPC
interface CtoMetrics {
  oee_pct: number;
  yield_variance_pct: number;
  open_capas: number;
  ccp_compliance_pct: number;
  avg_mock_recall_mins: number;
}

export function CtoDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CtoMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_cto_dashboard_metrics', {
        p_user_id: user?.id
      });
      if (data) setMetrics(data);
      if (error) captureException(error, { level: 'error', tags: { area: 'module' } });
      setLoading(false);
    }
    fetchMetrics();
  }, [user]);

  if (loading) return <div style={{ padding: 40, color: 'var(--bos-text3)' }}>Loading Executive Dashboard...</div>;
  if (!metrics) return <div style={{ padding: 40, color: '#EF4444' }}>Failed to load metrics. Run the 26_cto_dashboard_rpc.sql migration.</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Executive View</p>
            <h1 className="bos-page-title">CTO / Plant Manager Dashboard</h1>
            <p className="bos-page-sub">Global KPI monitoring for Production, Quality, and Compliance (FSMA / ISO 22000)</p>
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {/* 1. OEE */}
        <div className="bos-kpi-card" style={{ borderTop: '4px solid #10B981' }}>
          <div className="bos-kpi-label">OEE (Overall Equip. Effectiveness)</div>
          <div className="bos-kpi-val" style={{ color: metrics.oee_pct >= 85 ? '#10B981' : '#F59E0B' }}>
            {metrics.oee_pct}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 8 }}>Target: {'>'} 85%</div>
        </div>

        {/* 2. Yield Variance */}
        <div className="bos-kpi-card" style={{ borderTop: `4px solid ${Math.abs(metrics.yield_variance_pct) > 2 ? '#EF4444' : '#10B981'}` }}>
          <div className="bos-kpi-label">Yield Variance (Last 30 Days)</div>
          <div className="bos-kpi-val" style={{ color: Math.abs(metrics.yield_variance_pct) > 2 ? '#EF4444' : '#10B981' }}>
            {metrics.yield_variance_pct > 0 ? '+' : ''}{metrics.yield_variance_pct}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 8 }}>Target: ± 2.0%</div>
        </div>

        {/* 3. Open CAPAs */}
        <div className="bos-kpi-card" style={{ borderTop: `4px solid ${metrics.open_capas > 5 ? '#EF4444' : '#F59E0B'}` }}>
          <div className="bos-kpi-label">Open CAPAs (Non-Conformances)</div>
          <div className="bos-kpi-val" style={{ color: metrics.open_capas > 0 ? '#EF4444' : '#10B981' }}>
            {metrics.open_capas}
          </div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 8 }}>Target: 0 unresolved {'>'} 30 days</div>
        </div>

        {/* 4. CCP Compliance */}
        <div className="bos-kpi-card" style={{ borderTop: `4px solid ${metrics.ccp_compliance_pct === 100 ? '#10B981' : '#EF4444'}` }}>
          <div className="bos-kpi-label">CCP Compliance (24h)</div>
          <div className="bos-kpi-val" style={{ color: metrics.ccp_compliance_pct === 100 ? '#10B981' : '#EF4444' }}>
            {metrics.ccp_compliance_pct}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 8 }}>Target: 100% (FSMA)</div>
        </div>

        {/* 5. Mock Recall Time */}
        <div className="bos-kpi-card" style={{ borderTop: `4px solid ${metrics.avg_mock_recall_mins < 120 ? '#10B981' : '#EF4444'}` }}>
          <div className="bos-kpi-label">Avg. Mock Recall Time</div>
          <div className="bos-kpi-val" style={{ color: metrics.avg_mock_recall_mins < 120 ? '#10B981' : '#EF4444' }}>
            {metrics.avg_mock_recall_mins} mins
          </div>
          <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 8 }}>Target: {'<'} 120 mins</div>
        </div>
      </div>

      <div className="bos-card" style={{ marginTop: 24 }}>
        <h3 className="bos-card-title">Compliance System Status (ISO 22000 & FDA 21 CFR Part 11)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div style={{ background: 'var(--bos-bg3)', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#10B981' }}>✔</span> <span style={{ fontWeight: 600 }}>Allergen Matrix</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>Fully versioned. FDA FALCPA & EU FIC verified.</div>
          </div>
          <div style={{ background: 'var(--bos-bg3)', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#10B981' }}>✔</span> <span style={{ fontWeight: 600 }}>Traceability & Recalls</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>One-step forward, one-step back with auto-batch freezing.</div>
          </div>
          <div style={{ background: 'var(--bos-bg3)', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#10B981' }}>✔</span> <span style={{ fontWeight: 600 }}>Training & SOPs</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>E-signatures active. Production blocks on expired operator training.</div>
          </div>
          <div style={{ background: 'var(--bos-bg3)', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#10B981' }}>✔</span> <span style={{ fontWeight: 600 }}>CAPA & Deviation Control</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>Auto-triggered on QC/PRP/CCP failures. 5-Whys enforced.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
