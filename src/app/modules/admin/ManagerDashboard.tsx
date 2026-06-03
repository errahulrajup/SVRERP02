import { useManagerDashboard } from '../../hooks/useBos';
import { useInvoices } from '../../hooks/useBos';
import { fmtINR } from '../../types/bos';
import { Link } from 'react-router';

export function ManagerDashboard() {
  const {
    loading,
    active,
    qcHold,
    pendGRN,
    expiring,
    dispatches,
  } = useManagerDashboard();
  const { items: invoices, loading: invoicesLoading } = useInvoices();

  const activeBatches = active;
  const pendingQC = qcHold;
  const pendingGRN = pendGRN;
  const recentDispatches = dispatches.slice(0, 5);
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + Math.max(0, (i.total || 0) - (i.paid_amt || 0)), 0);

  const kpis = [
    { label: 'Active Batches',     val: activeBatches.length, color: '#5B8FD4' },
    { label: 'Batches in QC Hold', val: pendingQC.length,     color: '#D4843A' },
    { label: 'GRNs Pending QC',    val: pendingGRN.length,    color: '#9B7ED4' },
    { label: 'Expiring Lots (30d)',val: expiring.length,      color: '#E05252' },
  ];

  if (loading || invoicesLoading) {
    return (
      <div style={{ padding: 40, color: '#556355', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 20, height: 20, border: '2px solid rgba(123,169,123,0.22)', borderTopColor: '#D4A843', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading Manager Dashboard…
      </div>
    );
  }

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Manager Dashboard</p>
        <h1 className="bos-page-title">Operations Control</h1>
        <p className="bos-page-sub">Day-to-day production, stock, and dispatch tracking.</p>
      </div>

      {/* KPIs */}
      <div className="bos-kpi-grid">
        {kpis.map(k => (
          <div className="bos-kpi-card" key={k.label}>
            <div className="bos-kpi-bar" style={{ background: k.color }} />
            <div className="bos-kpi-label">{k.label}</div>
            <div className="bos-kpi-val" style={{ color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Production Overview */}
        <div className="bos-card">
          <div className="bos-card-title">⚙️ Production Priority</div>
          {activeBatches.length > 0 ? (
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>Batch No</th><th>Product</th><th>Status</th></tr></thead>
                <tbody>
                  {activeBatches.slice(0, 5).map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{b.batch_no}</td>
                      <td>{b.product}</td>
                      <td><span className="bos-badge bos-badge-green">{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bos-empty" style={{ padding: '20px 10px' }}>No running batches.</div>
          )}
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Link to="/production" className="bos-btn bos-btn-ghost bos-btn-sm">View All Production →</Link>
          </div>
        </div>

        {/* Dispatch & Invoices */}
        <div className="bos-card">
          <div className="bos-card-title">🚚 Recent Dispatches</div>
          {recentDispatches.length > 0 ? (
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead><tr><th>DO No</th><th>Customer</th><th>Status</th></tr></thead>
                <tbody>
                  {recentDispatches.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontFamily: 'monospace', color: '#D4A843' }}>{d.do_no}</td>
                      <td>{d.customer}</td>
                      <td>
                        <span className={`bos-badge ${d.status === 'DISPATCHED' ? 'bos-badge-green' : d.status === 'CONFIRMED' || d.status === 'DRAFT' ? 'bos-badge-yellow' : 'bos-badge-gray'}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bos-empty" style={{ padding: '20px 10px' }}>No recent dispatches.</div>
          )}
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Link to="/accounts/dispatch" className="bos-btn bos-btn-ghost bos-btn-sm">Go to Dispatch →</Link>
          </div>
        </div>
      </div>
      
      {unpaidTotal > 0 && (
        <div className="bos-card" style={{ marginTop: 16 }}>
          <div className="bos-card-title">💰 Financial Alerts</div>
          <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(192,57,43,.2)', borderRadius: 10, padding: 14, color: '#E05252', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Outstanding Receivables: <strong>{fmtINR(unpaidTotal)}</strong> across {unpaidInvoices.length} invoice(s)</span>
            <Link to="/accounts" className="bos-btn bos-btn-danger bos-btn-sm">View Accounts</Link>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ marginTop: 16 }}>
        <div className="bos-card-title">🚚 Reverse Logistics & Storage</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/logistics" className="bos-btn bos-btn-secondary" style={{ flex: 1, textAlign: 'center' }}>📦 Sales Returns</Link>
          <Link to="/logistics/storage" className="bos-btn bos-btn-secondary" style={{ flex: 1, textAlign: 'center' }}>🏭 Storage & Transfers</Link>
          <Link to="/production/packaging" className="bos-btn bos-btn-secondary" style={{ flex: 1, textAlign: 'center' }}>🔄 Packaging House</Link>
        </div>
      </div>

    </div>
  );
}

