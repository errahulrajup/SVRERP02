import { useBossDashboard } from '../../hooks/useBos';
import { fmtINR } from '../../types/bos';
import { Link } from 'react-router';

export function BossDashboard() {
  const {
    loading, revenue, unpaid, expTotal, profit,
    activeBatches, pendingQC, pendingGRN, expiring, expired,
    invoices, batches, lots,
  } = useBossDashboard();

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

  const kpis = [
    { label: 'Total Revenue (Collected)', val: fmtINR(revenue),       sub: 'All invoices paid',          color: '#7BA97B' },
    { label: 'Outstanding (Unpaid)',       val: fmtINR(unpaid),        sub: 'To be collected',            color: '#E05252' },
    { label: 'Gross Profit',              val: fmtINR(profit),        sub: `Margin ${margin}%`,          color: profit >= 0 ? '#7BA97B' : '#E05252' },
    { label: 'Total Expenses',            val: fmtINR(expTotal),       sub: 'All recorded expenses',      color: '#D4843A' },
    { label: 'Active Batches',            val: activeBatches.length,   sub: 'Currently in production',    color: '#5B8FD4' },
    { label: 'Batches in QC Hold',        val: pendingQC.length,       sub: 'Awaiting QC clearance',      color: '#D4843A' },
    { label: 'GRNs Pending QC',           val: pendingGRN.length,      sub: 'Inward material',            color: '#9B7ED4' },
    { label: 'Lots Expiring (30d)',        val: expiring.length,        sub: `${expired.length} already expired`, color: '#D4843A' },
  ];

  const alerts: { type: 'danger' | 'warning' | 'success' | 'info'; msg: string }[] = [];
  if (expired.length)    alerts.push({ type: 'danger',  msg: `${expired.length} raw material lot(s) have expired` });
  if (expiring.length)   alerts.push({ type: 'warning', msg: `${expiring.length} lot(s) expiring within 30 days` });
  if (pendingQC.length)  alerts.push({ type: 'warning', msg: `${pendingQC.length} batch(es) stuck in QC hold` });
  if (unpaid > 0)        alerts.push({ type: 'warning', msg: `Outstanding receivables: ${fmtINR(unpaid)}` });
  if (pendingGRN.length) alerts.push({ type: 'info',    msg: `${pendingGRN.length} GRN(s) awaiting QC approval` });
  if (profit < 0)        alerts.push({ type: 'danger',  msg: 'Negative margin! Revenue < Expenses' });
  if (!alerts.length)    alerts.push({ type: 'success', msg: 'No critical alerts. All systems normal.' });

  const alertStyles: Record<string, string> = {
    danger:  'background:rgba(224,82,82,0.10);border:1px solid rgba(192,57,43,.2);color:#E05252;',
    warning: 'background:rgba(212,132,58,0.10);border:1px solid rgba(212,168,67,0.25);color:#D4843A;',
    success: 'background:rgba(123,169,123,0.10);border:1px solid rgba(42,122,80,.2);color:#7BA97B;',
    info:    'background:rgba(91,143,212,0.10);border:1px solid rgba(26,95,168,.2);color:#5B8FD4;',
  };
  const alertIcons = { danger: '🚨', warning: '⚠️', success: '✅', info: 'ℹ️' };

  const moduleLinks = [
    { to: '/inventory/inward',      icon: '📥', label: 'Inward / GRN',   color: '#9B7ED4' },
    { to: '/production',  icon: '⚙️',  label: 'Production',    color: '#5B8FD4' },
    { to: '/qc',     icon: '🔬', label: 'Quality / CoA',  color: '#7BA97B' },
    { to: '/accounts/dispatch',    icon: '🚚', label: 'Dispatch',        color: '#D4843A' },
    { to: '/inventory/store',       icon: '📦', label: 'Store',           color: '#D4843A' },
    { to: '/accounts',    icon: '📒', label: 'Accounts',        color: '#7BA97B' },
    { to: '/fsms',       icon: '⚠️',  label: 'HACCP / CCP',   color: '#E05252' },
    { to: '/inventory/traceability',icon: '🔍', label: 'Traceability',    color: '#5B8FD4' },
    { to: '/compliances',       icon: '🏛️', label: 'FSSAI',          color: '#D4843A' },
    { to: '/compliances/capa',        icon: '🔄', label: 'CAPA',            color: '#9B7ED4' },
    { to: '/fsms/allergen',    icon: '🌾', label: 'Allergen Mgmt',   color: '#D4843A' },
    { to: '/fsms/recall',      icon: '🚨', label: 'Recall Mgmt',     color: '#E05252' },
    { to: '/fsms/prp',         icon: '📋', label: 'PRPs',            color: '#7BA97B' },
    { to: '/production/recipes',      icon: '🍲', label: 'Recipe Engine',   color: '#9B7ED4' },
  ];

  const approvedLots = lots.filter(l => l.qc_status === 'approved');
  const totalStockVal = approvedLots.reduce((a, l) => a + (l.total_cost || 0), 0);
  const completedBatches = batches.filter(b => b.status === 'COMPLETED');
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');

  if (loading) {
    return (
      <div>
        <div className="bos-page-header">
          <p className="bos-eyebrow">Owner Dashboard</p>
          <h1 className="bos-page-title">Business Overview</h1>
          <p className="bos-page-sub">Loading data…</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, color: '#556355' }}>
          <div style={{ width: 20, height: 20, border: '2px solid rgba(123,169,123,0.22)', borderTopColor: '#D4A843', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Loading dashboard data…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bos-page-header">
        <p className="bos-eyebrow">Owner Dashboard</p>
        <h1 className="bos-page-title">Business Overview</h1>
        <p className="bos-page-sub">Complete real-time view of the entire operation — {today}</p>
      </div>

      {/* KPIs */}
      <div className="bos-kpi-grid">
        {kpis.map(k => (
          <div className="bos-kpi-card" key={k.label}>
            <div className="bos-kpi-bar" style={{ background: k.color }} />
            <div className="bos-kpi-label">{k.label}</div>
            <div className="bos-kpi-val" style={{ color: k.color, fontSize: typeof k.val === 'string' && k.val.length > 8 ? 18 : 26 }}>{k.val}</div>
            <div className="bos-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alerts + Quick Modules */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="bos-card">
          <div className="bos-card-title">🚨 Active Alerts</div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 8, fontSize: 13, ...Object.fromEntries(alertStyles[a.type].split(';').filter(Boolean).map(s => { const [k, v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()]; })) }}>
              {alertIcons[a.type]} {a.msg}
            </div>
          ))}
        </div>

        <div className="bos-card">
          <div className="bos-card-title">📈 Quick Modules</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {moduleLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(123,169,123,0.12)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', transition: 'all .15s' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = l.color + '44')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(123,169,123,0.12)')}
              >
                <span style={{ fontSize: 18 }}>{l.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9AAF96' }}>{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Financial + Stock + Production Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Revenue */}
        <div className="bos-card">
          <div className="bos-card-title">💰 Revenue Summary</div>
          {[
            ['Total Invoices', `${invoices.length} invoices`],
            ['Collected', fmtINR(revenue), '#7BA97B'],
            ['Outstanding', fmtINR(unpaid), '#E05252'],
            ['Unpaid Count', `${unpaidInvoices.length} unpaid`],
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(123,169,123,0.08)', fontSize: 13 }}>
              <span style={{ color: '#556355' }}>{label}</span>
              <span style={{ fontWeight: 600, color: (color as string) || '#9AAF96' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Stock */}
        <div className="bos-card">
          <div className="bos-card-title">📦 Stock Health</div>
          {[
            ['Total Lots', `${lots.length} lots`],
            ['Approved Lots', `${approvedLots.length} usable`],
            ['Stock Value (RM)', fmtINR(totalStockVal), '#D4A843'],
            ['Expiring Soon', `${expiring.length} lots`, expiring.length > 0 ? '#D4843A' : '#7BA97B'],
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(123,169,123,0.08)', fontSize: 13 }}>
              <span style={{ color: '#556355' }}>{label}</span>
              <span style={{ fontWeight: 600, color: (color as string) || '#9AAF96' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Production */}
        <div className="bos-card">
          <div className="bos-card-title">⚙️ Production</div>
          {[
            ['Total Batches', `${batches.length} total`],
            ['Running Now', `${activeBatches.length} batches`, '#5B8FD4'],
            ['QC Hold', `${pendingQC.length} batches`, pendingQC.length > 0 ? '#D4843A' : '#7BA97B'],
            ['Completed', `${completedBatches.length} batches`, '#7BA97B'],
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(123,169,123,0.08)', fontSize: 13 }}>
              <span style={{ color: '#556355' }}>{label}</span>
              <span style={{ fontWeight: 600, color: (color as string) || '#9AAF96' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* P&L Snapshot */}
      <div className="bos-card">
        <div className="bos-card-title">📊 P&L Snapshot</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: '💰 Total Revenue',  val: fmtINR(revenue),  color: '#7BA97B' },
            { label: '💸 Total Expenses', val: fmtINR(expTotal), color: '#E05252' },
            { label: '📈 Gross Profit',   val: fmtINR(profit),   color: profit >= 0 ? '#7BA97B' : '#E05252' },
          ].map(b => (
            <div key={b.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(123,169,123,0.12)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{b.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: b.color }}>{b.val}</div>
            </div>
          ))}
        </div>
        {revenue > 0 && (
          <div style={{ background: 'rgba(91,143,212,0.10)', border: '1px solid rgba(26,95,168,.2)', color: '#5B8FD4', borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 13 }}>
            ℹ️ Gross Margin: <strong>{margin}%</strong> &nbsp;|&nbsp; Revenue per Expense: ₹{(revenue / Math.max(1, expTotal)).toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
