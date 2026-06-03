import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { lotsApi, locationsApi, stockTransfersApi, wastageLogsApi } from '../../lib/bosApi';

type QcStatus = 'pending' | 'approved' | 'rejected' | 'QC_HOLD' | 'QA_HOLD' | 'HOLD';

const QC_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  approved:  { label: '✓ Approved',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  pending:   { label: '⏳ Pending QC', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  rejected:  { label: '✗ Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  QC_HOLD:   { label: '⚠️ QC Hold',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  QA_HOLD:   { label: '⚠️ QA Hold',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  HOLD:      { label: '🔒 Hold',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
};

function QcBadge({ status }: { status: string }) {
  const s = QC_BADGE[status] || { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function daysUntilExpiry(date: string | null): { text: string; color: string } {
  if (!date) return { text: '—', color: 'var(--bos-text3)' };
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { text: `Expired ${Math.abs(diff)}d ago`, color: '#ef4444' };
  if (diff <= 30) return { text: `${diff}d (Critical)`, color: '#fb923c' };
  if (diff <= 90) return { text: `${diff}d (Warning)`, color: '#facc15' };
  return { text: `${diff}d`, color: '#4ade80' };
}

export function RmStore() {
  const { user } = useAuth();
  const [lots, setLots] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'stock' | 'transfers' | 'wastage'>('stock');

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);

  // Forms
  const [tForm, setTForm] = useState({ reference_id: '', from_location: '', to_location: '', qty: '', reason: '' });
  const [wForm, setWForm] = useState({ reference_id: '', qty: '', reason: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lRes, locRes, tRes, wRes] = await Promise.all([
        lotsApi.list(),
        locationsApi.list(),
        stockTransfersApi.list(),
        wastageLogsApi.list(),
      ]);
      setLots(lRes.data || []);
      setLocations(locRes.data || []);
      setTransfers((tRes.data || []).filter((t: any) => t.item_type === 'RM'));
      setWastageLogs((wRes.data || []).filter((w: any) => w.item_type === 'RM'));
    } finally { setLoading(false); }
  };

  const filtered = lots.filter(lot => {
    const matchSearch = !search
      || lot.lot_no?.toLowerCase().includes(search.toLowerCase())
      || lot.material_name?.toLowerCase().includes(search.toLowerCase())
      || lot.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || lot.qc_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const approvedLots = lots.filter(l => l.qc_status === 'approved');
  const totalApprovedQty = approvedLots.reduce((s, l) => s + (l.remaining_qty || l.qty_kg || 0), 0);
  const expiringLots = lots.filter(l => {
    if (!l.expiry_date) return false;
    const diff = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 30;
  });

  const stats = [
    { label: 'Total RM Lots', val: lots.length, colorHex: '#D4A843' },
    { label: 'Approved & Available', val: approvedLots.length, colorHex: '#4ade80' },
    { label: 'Pending / Hold', val: lots.filter(l => ['pending', 'QC_HOLD', 'QA_HOLD', 'HOLD'].includes(l.qc_status)).length, colorHex: '#fb923c' },
    { label: 'Expiring ≤30 Days', val: expiringLots.length, colorHex: '#ef4444' },
  ];

  const locationName = (id: string | null) => locations.find(l => l.id === id)?.name || '—';

  const openTransferModal = (lot?: any) => {
    setTForm({ reference_id: lot?.lot_no || '', from_location: lot?.location_id || '', to_location: '', qty: '', reason: '' });
    setIsTransferModalOpen(true);
  };

  const openWastageModal = (lot?: any) => {
    setWForm({ reference_id: lot?.lot_no || '', qty: '', reason: '' });
    setIsWastageModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockTransfersApi.create({
        reference_id: tForm.reference_id.toUpperCase(),
        item_type: 'RM',
        from_location_id: tForm.from_location || null,
        to_location_id: tForm.to_location || null,
        qty: parseFloat(tForm.qty),
        reason: tForm.reason || null,
        transferred_by: user?.id || null,
      });
      setIsTransferModalOpen(false);
      setTForm({ reference_id: '', from_location: '', to_location: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await wastageLogsApi.create({
        item_type: 'RM',
        reference_id: wForm.reference_id.toUpperCase(),
        qty: parseFloat(wForm.qty),
        reason: wForm.reason,
        logged_by: user?.id || null,
      });
      setIsWastageModalOpen(false);
      setWForm({ reference_id: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Logistics · Raw Materials</p>
            <h1 className="bos-page-title">RM Store</h1>
            <p className="bos-page-sub">Raw material lots — QC status, expiry tracking, location, transfers and wastage</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-secondary" onClick={() => openWastageModal()}>🗑 Log Wastage</button>
            <button className="bos-btn bos-btn-primary" onClick={() => openTransferModal()}>🔀 Transfer Stock</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="bos-kpi-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="bos-card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.colorHex}` }}>
            <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--bos-text1)', marginTop: 8 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Approved Total Banner */}
      {totalApprovedQty > 0 && (
        <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Total Approved RM Stock</div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{totalApprovedQty.toFixed(2)} kg available across {approvedLots.length} approved lots</div>
          </div>
        </div>
      )}

      {/* Expiring Banner */}
      {expiringLots.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{expiringLots.length} Lot(s) Expiring Within 30 Days!</div>
            <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
              {expiringLots.map(l => l.lot_no || l.id?.slice(0, 8)).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--bos-border)' }}>
        {(['stock', 'transfers', 'wastage'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400, fontSize: 13,
              background: activeTab === tab ? 'var(--bos-card-bg)' : 'transparent',
              color: activeTab === tab ? 'var(--bos-gold)' : 'var(--bos-text3)',
              borderBottom: activeTab === tab ? '2px solid var(--bos-gold)' : '2px solid transparent',
            }}>
            {tab === 'stock' ? '📦 RM Lots' : tab === 'transfers' ? '🔀 Transfers' : '🗑 Wastage Log'}
          </button>
        ))}
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="bos-form-field"
              style={{ maxWidth: 280 }}
              placeholder="Search Lot No, Material or Supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ALL', 'approved', 'pending', 'QC_HOLD', 'rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, border: '1px solid var(--bos-border)',
                    fontSize: 12, fontWeight: filterStatus === s ? 700 : 400, cursor: 'pointer',
                    background: filterStatus === s ? 'var(--bos-gold)' : 'transparent',
                    color: filterStatus === s ? '#000' : 'var(--bos-text3)',
                  }}>
                  {s === 'ALL' ? 'All' : QC_BADGE[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          <div className="bos-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="bos-card-title" style={{ margin: 0 }}>Raw Material Lots</div>
              <div style={{ fontSize: 12, color: 'var(--bos-text3)' }}>{filtered.length} lots</div>
            </div>
            <div className="bos-tbl-wrap">
              <table className="bos-tbl">
                <thead>
                  <tr>
                    <th>Lot No</th>
                    <th>Material</th>
                    <th>Supplier</th>
                    <th>Remaining Qty</th>
                    <th>Location</th>
                    <th>QC Status</th>
                    <th>Expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lot => {
                    const exp = daysUntilExpiry(lot.expiry_date);
                    return (
                      <tr key={lot.id}>
                        <td><strong style={{ color: 'var(--bos-gold)', fontFamily: 'monospace' }}>{lot.lot_no || lot.id?.slice(0, 8)}</strong></td>
                        <td>{lot.material_name || lot.product || '—'}</td>
                        <td style={{ color: 'var(--bos-text3)' }}>{lot.supplier || '—'}</td>
                        <td>
                          <strong>{lot.remaining_qty ?? lot.qty_kg ?? '—'}</strong>
                          <span style={{ fontSize: 11, color: 'var(--bos-text3)', marginLeft: 4 }}>{lot.unit || 'kg'}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--bos-text3)' }}>
                            📍 {locationName(lot.location_id)}
                          </span>
                        </td>
                        <td><QcBadge status={lot.qc_status || 'pending'} /></td>
                        <td>
                          <span style={{ fontSize: 12, color: exp.color }}>{exp.text}</span>
                          {lot.expiry_date && <div style={{ fontSize: 10, color: 'var(--bos-text3)' }}>{new Date(lot.expiry_date).toLocaleDateString()}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="bos-btn bos-btn-secondary" style={{ fontSize: 11, padding: '3px 9px' }}
                              onClick={() => openTransferModal(lot)} title="Transfer stock">🔀</button>
                            <button style={{ fontSize: 11, padding: '3px 9px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              onClick={() => openWastageModal(lot)} title="Log wastage">🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--bos-text3)' }}>
                      {lots.length === 0 ? 'No RM lots found. GRN-approved lots will appear here.' : 'No lots match the current filter.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>RM Transfer History</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12 }} onClick={() => openTransferModal()}>+ Transfer Stock</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Date</th><th>Lot No</th><th>From</th><th>To</th><th>Qty</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                    <td><strong style={{ color: 'var(--bos-gold)' }}>{t.reference_id}</strong></td>
                    <td>{locationName(t.from_location_id)}</td>
                    <td>{locationName(t.to_location_id)}</td>
                    <td>{t.qty}</td>
                    <td style={{ color: 'var(--bos-text3)' }}>{t.reason || '—'}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No RM transfers logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wastage Tab */}
      {activeTab === 'wastage' && (
        <div className="bos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>RM Wastage Log</div>
            <button className="bos-btn bos-btn-primary" style={{ fontSize: 12, background: '#ef4444', border: 'none' }} onClick={() => openWastageModal()}>+ Log Wastage</button>
          </div>
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Date</th><th>Lot No</th><th>Qty Wasted</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {wastageLogs.map(w => (
                  <tr key={w.id}>
                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
                    <td><strong style={{ color: '#ef4444' }}>{w.reference_id}</strong></td>
                    <td>{w.qty}</td>
                    <td style={{ color: 'var(--bos-text3)' }}>{w.reason}</td>
                  </tr>
                ))}
                {wastageLogs.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No RM wastage logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ── */}
      {isTransferModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 520 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>🔀 Transfer RM Stock</h2>
              <button className="bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">RM Lot No</label>
                <input className="bos-form-field" required value={tForm.reference_id}
                  onChange={e => setTForm({ ...tForm, reference_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. LOT-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">From Location</label>
                <select className="bos-form-field" value={tForm.from_location} onChange={e => setTForm({ ...tForm, from_location: e.target.value })}>
                  <option value="">— Select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">To Location</label>
                <select className="bos-form-field" value={tForm.to_location} onChange={e => setTForm({ ...tForm, to_location: e.target.value })}>
                  <option value="">— Select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} {l.temperature_zone ? `(${l.temperature_zone})` : ''}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Quantity</label>
                <input className="bos-form-field" type="number" required value={tForm.qty}
                  onChange={e => setTForm({ ...tForm, qty: e.target.value })} placeholder="e.g. 50" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" value={tForm.reason}
                  onChange={e => setTForm({ ...tForm, reason: e.target.value })}
                  placeholder="e.g. Moving to production staging area" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Wastage Modal ── */}
      {isWastageModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#ef4444' }}>🗑 Log RM Wastage</h2>
              <button className="bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleWastageSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">RM Lot No</label>
                <input className="bos-form-field" required value={wForm.reference_id}
                  onChange={e => setWForm({ ...wForm, reference_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. LOT-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty Wasted</label>
                <input className="bos-form-field" type="number" required value={wForm.qty}
                  onChange={e => setWForm({ ...wForm, qty: e.target.value })} placeholder="e.g. 5" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" required value={wForm.reason}
                  onChange={e => setWForm({ ...wForm, reason: e.target.value })}
                  placeholder="e.g. Expired, Contaminated, Spillage" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" style={{ background: '#ef4444', border: 'none' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Log Wastage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
