import React, { useState, useEffect } from 'react';
import { useLots, useFgLots } from '../../hooks/useBos';
import { stockLedgerApi, lotsApi, fgLotsApi } from '../../lib/bosApi';
import { fmtINR, fmtDate, daysUntil, Lot, FgLot, StockLedgerTransaction } from '../../types/bos';
import { useAuth } from '../../hooks';

export function Store() {
  const { items: lots, loading: rmLoading, reload: reloadLots } = useLots();
  const { items: fgLots, loading: fgLoading } = useFgLots();
  const [activeTab, setActiveTab] = useState<'RM' | 'FG' | 'ALERTS'>('RM');
  const [hideZero, setHideZero] = useState(true);
  const { user } = useAuth();

  // Ledger Modal State
  const [ledgerModal, setLedgerModal] = useState<{ open: boolean; item: Lot | FgLot | null; type: 'RM'|'FG' }>({ open: false, item: null, type: 'RM' });
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerTransaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ qty: '', type: 'OUT', notes: '' });

  const openLedger = async (item: Lot | FgLot, type: 'RM'|'FG') => {
    setLedgerModal({ open: true, item, type });
    setLedgerLoading(true);
    try {
      const res = type === 'RM' ? await stockLedgerApi.byLot(item.id) : await stockLedgerApi.byFgLot(item.id);
      setLedgerEntries(res.data || []);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!ledgerModal.item) return;
    const qty = parseFloat(adjustForm.qty);
    if (!qty || qty <= 0) return alert('Enter valid quantity');

    try {
      const change = adjustForm.type === 'OUT' ? -qty : qty;
      const payload: Partial<StockLedgerTransaction> = {
        transaction_type: 'ADJUSTMENT',
        qty_change: change,
        reference_id: 'MANUAL',
        notes: adjustForm.notes || 'Manual stock adjustment',
        created_by: user?.id || null
      };

      if (ledgerModal.type === 'RM') {
        payload.lot_id = ledgerModal.item.id;
        payload.erp_product_id = (ledgerModal.item as Lot).erp_product_id;
      } else {
        payload.fg_lot_id = ledgerModal.item.id;
      }

      await stockLedgerApi.create(payload as Omit<StockLedgerTransaction, 'id' | 'created_at'>);
      
      if (ledgerModal.type === 'RM') {
        const lot = ledgerModal.item as Lot;
        await lotsApi.update(lot.id, { remaining_qty: Math.max(0, (lot.remaining_qty || 0) + change) });
      } else {
        const fglot = ledgerModal.item as FgLot;
        await fgLotsApi.update(fglot.id, { available_qty: Math.max(0, (fglot.available_qty || 0) + change) });
      }

      alert('Stock adjusted successfully!');
      setAdjustForm({ qty: '', type: 'OUT', notes: '' });
      openLedger(ledgerModal.item, ledgerModal.type);
      reloadLots();
    } catch(e:any) {
      alert(`Error adjusting stock: ${e.message}`);
    }
  };

  if (rmLoading || fgLoading) {
    return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Store data...</div>;
  }

  // Pre-calculate RM KPI
  const rmVal = lots
    .filter(l => l.qc_status === 'approved')
    .reduce((acc, l) => acc + ((l.remaining_qty || 0) * (l.unit_cost || 0)), 0);

  // Pre-calculate FG KPI
  const fgVal = fgLots.reduce((acc, l) => acc + ((l.available_qty || 0) * (l.unit_cost || 0)), 0);

  // Alerts
  const now = Date.now();
  const expiringRM = lots.filter(l => {
    if (!l.expiry_date) return false;
    const d = daysUntil(l.expiry_date);
    return d >= 0 && d <= 30;
  });
  const expiredRM = lots.filter(l => l.expiry_date && daysUntil(l.expiry_date) < 0);
  const criticalRM = expiringRM.filter(l => daysUntil(l.expiry_date) >= 0 && daysUntil(l.expiry_date) <= 7);
  const warningRM = expiringRM.filter(l => daysUntil(l.expiry_date) > 7 && daysUntil(l.expiry_date) <= 30);

  const stats = [
    { label: 'RM Lots (Approved)', val: lots.filter(l => l.qc_status === 'approved').length, color: '#22C55E' },
    { label: 'RM Pending QC',      val: lots.filter(l => l.qc_status === 'pending').length,  color: '#FDE047' },
    { label: 'RM Stock Value',     val: fmtINR(rmVal),                                  color: '#FFC107' },
    { label: 'FG Lots Available',  val: fgLots.filter(l => (l.available_qty || 0) > 0).length, color: '#60A5FA' },
    { label: 'FG Stock Value',     val: fmtINR(fgVal),                                  color: '#C084FC' },
    { label: 'Expiring (30d)',     val: expiringRM.length,                                color: '#FB923C' },
    { label: 'Expired',            val: expiredRM.length,                                 color: '#EF4444' },
    { label: 'Total Lots (RM+FG)', val: lots.length + fgLots.length,                      color: '#FFC107' },
  ];

  const renderRM = () => {
    const sorted = [...lots]
      .filter(l => hideZero ? (l.remaining_qty || 0) > 0 : true)
      .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

    if (sorted.length === 0) {
      return <div className="bos-empty" style={{ padding: 40 }}>No RM lots yet. Record GRNs to add raw material lots.</div>;
    }

    return (
      <div className="bos-card" style={{ padding: 0 }}>
        <div style={{ background: 'rgba(52,152,219,0.1)', borderBottom: '1px solid rgba(52,152,219,0.2)', padding: 12, color: '#8AB4F8', fontSize: 13 }}>
          ℹ️ <strong>FEFO Rule:</strong> Lots sorted by First Expiry First Out.
        </div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Lot No.</th><th>Material</th><th>Supplier</th>
                <th>Received</th><th>Remaining</th><th>Unit</th><th>Rate</th>
                <th>Value (Remaining)</th><th>Expiry</th><th>QC Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(l => {
                const d = daysUntil(l.expiry_date);
                const eClass = !l.expiry_date ? 'bos-badge-gray' : d < 0 ? 'bos-badge-red' : d <= 7 ? 'bos-badge-red' : d <= 30 ? 'bos-badge-yellow' : 'bos-badge-green';
                const eLbl = !l.expiry_date ? '—' : d < 0 ? 'EXPIRED' : `${l.expiry_date} (${d}d)`;
                const qClass = l.qc_status === 'approved' ? 'bos-badge-green' : l.qc_status === 'rejected' ? 'bos-badge-red' : 'bos-badge-yellow';
                const remVal = (l.remaining_qty || 0) * (l.unit_cost || 0);
                const isLow = (l.remaining_qty || 0) <= (l.quantity || 0) * 0.1;

                return (
                  <tr key={l.id}>
                    <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{l.lot_no || l.id}</span></td>
                    <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{l.material}</td>
                    <td style={{ color: '#9AAF96', fontSize: 13 }}>{l.supplier || '—'}</td>
                    <td>{l.quantity} {l.unit || 'kg'}</td>
                    <td style={{ fontWeight: 600, color: isLow ? '#E05252' : '#F0EDE6' }}>{l.remaining_qty || 0} {l.unit || 'kg'}</td>
                    <td style={{ color: '#9AAF96', fontSize: 13 }}>{l.unit || 'kg'}</td>
                    <td>{fmtINR(l.unit_cost || 0)}</td>
                    <td style={{ color: '#D4A843' }}>{fmtINR(remVal)}</td>
                    <td><span className={`inv-badge ${eClass}`}>{eLbl}</span></td>
                    <td><span className={`inv-badge ${qClass}`}>{l.qc_status}</span></td>
                    <td>
                      <button className="inv-btn inv-btn-sm" onClick={() => openLedger(l, 'RM')}>Ledger</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,.025)' }}>
                <td colSpan={7} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#9AAF96' }}>TOTAL APPROVED STOCK VALUE</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#D4A843' }}>{fmtINR(rmVal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderFG = () => {
    const filteredFg = fgLots.filter(l => hideZero ? (l.available_qty || 0) > 0 : true);
    if (filteredFg.length === 0) {
      return <div className="bos-empty" style={{ padding: 40 }}>No finished goods yet. QC-approved batches will appear here.</div>;
    }

    return (
      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Batch No.</th><th>Product</th><th>Total Qty</th><th>Available</th>
                <th>Unit Cost</th><th>Total Value</th><th>CoA No.</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFg.map(l => (
                <tr key={l.id}>
                  <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{l.batch_no}</span></td>
                  <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{l.product}</td>
                  <td>{l.qty} {l.unit || 'kg'}</td>
                  <td style={{ fontWeight: 600, color: (l.available_qty || 0) === 0 ? '#E05252' : '#88C096' }}>{l.available_qty || 0} {l.unit || 'kg'}</td>
                  <td style={{ color: '#9AAF96' }}>{fmtINR(l.unit_cost || 0)}</td>
                  <td style={{ color: '#D4A843', fontWeight: 500 }}>{fmtINR((l.available_qty || 0) * (l.unit_cost || 0))}</td>
                  <td>{l.coa_no ? <span style={{ fontFamily: 'monospace', color: '#88C096' }}>{l.coa_no}</span> : '—'}</td>
                  <td style={{ fontSize: 12, color: '#9AAF96' }}>{fmtDate(l.created_at)}</td>
                  <td><button className="inv-btn inv-btn-sm" onClick={() => openLedger(l, 'FG')}>Ledger</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,.025)' }}>
                <td colSpan={5} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#9AAF96' }}>TOTAL FG STOCK VALUE (AVAILABLE)</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#D4A843' }}>{fmtINR(fgVal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderAlerts = () => {
    const expiring = [...lots].filter(l => l.expiry_date && daysUntil(l.expiry_date) <= 30);
    
    if (expiring.length === 0) {
      return (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: 16, borderRadius: 8, color: '#88C096' }}>
          ✅ No expiry alerts. All lots are within safe shelf-life limits.
        </div>
      );
    }

    const sortedExpiring = expiring.sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {expiredRM.length > 0 && (
          <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', padding: 12, borderRadius: 8, color: '#E05252' }}>
            🚨 {expiredRM.length} lot(s) have EXPIRED and must be quarantined immediately.
          </div>
        )}
        {criticalRM.length > 0 && (
          <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', padding: 12, borderRadius: 8, color: '#E05252' }}>
            ⚠️ {criticalRM.length} lot(s) expiring within 7 days — urgent action required.
          </div>
        )}
        {warningRM.length > 0 && (
          <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 12, borderRadius: 8, color: '#D4A843' }}>
            ⚠️ {warningRM.length} lot(s) expiring within 30 days.
          </div>
        )}
        
        <div className="bos-card" style={{ padding: 0, marginTop: 12 }}>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Lot No.</th><th>Material</th><th>Remaining Qty</th><th>Expiry Date</th><th>Days Left</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sortedExpiring.map(l => {
                  const d = daysUntil(l.expiry_date);
                  return (
                    <tr key={l.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{l.lot_no || l.id}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{l.material}</td>
                      <td>{l.remaining_qty || 0} {l.unit || 'kg'}</td>
                      <td>{fmtDate(l.expiry_date)}</td>
                      <td style={{ fontWeight: 700, color: d < 0 ? '#E05252' : d <= 7 ? '#E05252' : '#D4843A' }}>{d < 0 ? 'EXPIRED' : `${d}d`}</td>
                      <td>
                        <span className={`bos-badge ${d < 0 ? 'bos-badge-red' : d <= 7 ? 'bos-badge-red' : 'bos-badge-yellow'}`}>
                          {d < 0 ? 'EXPIRED' : d <= 7 ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="bos-page-header">
        <p className="bos-eyebrow">Operations · Store</p>
        <h1 className="bos-page-title">Store & Inventory</h1>
        <p className="bos-page-sub">Raw material lots · Finished goods stock · FEFO · Valuation</p>
      </div>

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-tabs" style={{ marginTop: 24, borderBottom: '1px solid rgba(123,169,123,0.2)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <button className={`bos-tab-btn ${activeTab === 'RM' ? 'active' : ''}`} onClick={() => setActiveTab('RM')}>Raw Material Lots</button>
          <button className={`bos-tab-btn ${activeTab === 'FG' ? 'active' : ''}`} onClick={() => setActiveTab('FG')}>Finished Goods</button>
          <button className={`bos-tab-btn ${activeTab === 'ALERTS' ? 'active' : ''}`} onClick={() => setActiveTab('ALERTS')}>⚠️ Expiry Alerts</button>
        </div>
        {(activeTab === 'RM' || activeTab === 'FG') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9AAF96', fontSize: 13, cursor: 'pointer', marginRight: 16 }}>
            <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} />
            Hide zero stock
          </label>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        {activeTab === 'RM' && renderRM()}
        {activeTab === 'FG' && renderFG()}
        {activeTab === 'ALERTS' && renderAlerts()}
      </div>

      {/* Ledger Modal */}
      {ledgerModal.open && ledgerModal.item && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', padding: 24, borderRadius: 8, width: 800, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--bos-shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--bos-text1)' }}>
                Stock Ledger: {ledgerModal.type === 'RM' ? (ledgerModal.item as Lot).lot_no : (ledgerModal.item as FgLot).batch_no} 
                ({ledgerModal.type === 'RM' ? (ledgerModal.item as Lot).material : (ledgerModal.item as FgLot).product})
              </h2>
              <button onClick={() => setLedgerModal({ open: false, item: null, type: 'RM' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--bos-text3)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
              {/* Adjust Stock Form */}
              <div style={{ background: 'var(--bos-bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--bos-border)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--bos-text1)' }}>Manual Adjustment</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--bos-text3)' }}>Type</label>
                  <select 
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid var(--bos-border)', background: 'var(--bos-bg1)', color: 'var(--bos-text1)' }}
                    value={adjustForm.type} onChange={e => setAdjustForm({...adjustForm, type: e.target.value})}
                  >
                    <option value="OUT">Deduct Stock (OUT)</option>
                    <option value="IN">Add Stock (IN)</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--bos-text3)' }}>Quantity ({ledgerModal.item.unit})</label>
                  <input type="number" step="0.001" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid var(--bos-border)', background: 'var(--bos-bg1)', color: 'var(--bos-text1)' }} value={adjustForm.qty} onChange={e => setAdjustForm({...adjustForm, qty: e.target.value})} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--bos-text3)' }}>Reason / Notes</label>
                  <textarea rows={2} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid var(--bos-border)', background: 'var(--bos-bg1)', color: 'var(--bos-text1)' }} value={adjustForm.notes} onChange={e => setAdjustForm({...adjustForm, notes: e.target.value})} />
                </div>
                <button onClick={handleAdjustStock} style={{ width: '100%', padding: '8px 16px', background: 'var(--bos-blue)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Apply Adjustment</button>
              </div>

              {/* Ledger Table */}
              <div>
                {ledgerLoading ? (
                  <div style={{ color: 'var(--bos-text3)' }}>Loading ledger...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--bos-border)', textAlign: 'left', color: 'var(--bos-text3)' }}>
                        <th style={{ padding: '8px 4px' }}>Date</th>
                        <th style={{ padding: '8px 4px' }}>Type</th>
                        <th style={{ padding: '8px 4px', textAlign: 'right' }}>Qty Change</th>
                        <th style={{ padding: '8px 4px' }}>Ref / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
                          <td style={{ padding: '8px 4px', color: 'var(--bos-text2)' }}>{fmtDate(e.created_at)}</td>
                          <td style={{ padding: '8px 4px' }}>
                            <span style={{ 
                              padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: e.transaction_type === 'IN' ? 'rgba(34,197,94,0.1)' : e.transaction_type === 'OUT' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              color: e.transaction_type === 'IN' ? '#22c55e' : e.transaction_type === 'OUT' ? '#ef4444' : '#f59e0b'
                            }}>
                              {e.transaction_type}
                            </span>
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: e.qty_change > 0 ? '#22c55e' : e.qty_change < 0 ? '#ef4444' : 'var(--bos-text3)' }}>
                            {e.qty_change > 0 ? '+' : ''}{e.qty_change}
                          </td>
                          <td style={{ padding: '8px 4px', color: 'var(--bos-text3)' }}>
                            {e.notes || e.reference_id || '—'}
                          </td>
                        </tr>
                      ))}
                      {ledgerEntries.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--bos-text3)' }}>No ledger entries found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
