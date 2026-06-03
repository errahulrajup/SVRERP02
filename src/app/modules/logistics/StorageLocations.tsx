import React, { useState, useEffect } from 'react';
import { locationsApi, stockTransfersApi, wastageLogsApi } from '../../lib/bosApi';

export function StorageLocations() {
  const [locations, setLocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'locations' | 'transfers' | 'wastage'>('locations');

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);

  const [locForm, setLocForm] = useState({ name: '', type: 'FG Store', temperature_zone: '' });
  const [tForm, setTForm] = useState({ reference_id: '', item_type: 'FG', from_location: '', to_location: '', qty: '', reason: '' });
  const [wForm, setWForm] = useState({ item_type: 'FG', reference_id: '', qty: '', reason: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lRes, tRes, wRes] = await Promise.all([
        locationsApi.list(), stockTransfersApi.list(), wastageLogsApi.list()
      ]);
      setLocations(lRes.data || []);
      setTransfers(tRes.data || []);
      setWastageLogs(wRes.data || []);
    } finally { setLoading(false); }
  };

  const ZONE_COLORS: Record<string, string> = {
    'FG Store': '#4ade80',
    'RM Store': '#60a5fa',
    'PM Store': '#c084fc',
    'Bulk Store': '#fb923c',
    'Quarantine': '#ef4444',
    'Incubation Zone': '#facc15',
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await locationsApi.create({ name: locForm.name, type: locForm.type, temperature_zone: locForm.temperature_zone || null });
      setIsLocModalOpen(false);
      setLocForm({ name: '', type: 'FG Store', temperature_zone: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockTransfersApi.create({
        reference_id: tForm.reference_id.toUpperCase(),
        item_type: tForm.item_type,
        from_location_id: tForm.from_location || null,
        to_location_id: tForm.to_location || null,
        qty: parseFloat(tForm.qty),
        reason: tForm.reason || null,
      });
      setIsTransferModalOpen(false);
      setTForm({ reference_id: '', item_type: 'FG', from_location: '', to_location: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await wastageLogsApi.create({
        item_type: wForm.item_type,
        reference_id: wForm.reference_id.toUpperCase(),
        qty: parseFloat(wForm.qty),
        reason: wForm.reason,
      });
      setIsWastageModalOpen(false);
      setWForm({ item_type: 'FG', reference_id: '', qty: '', reason: '' });
      loadAll();
    } finally { setSaving(false); }
  };

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">Logistics · Storage</p>
            <h1 className="bos-page-title">Warehouse & Stock Transfers</h1>
            <p className="bos-page-sub">Define stores, track where stock is held, log transfers and wastage</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {activeTab === 'locations' && (
              <button className="bos-btn bos-btn-primary" onClick={() => setIsLocModalOpen(true)}>+ Add Location</button>
            )}
            {activeTab === 'transfers' && (
              <button className="bos-btn bos-btn-primary" onClick={() => setIsTransferModalOpen(true)}>+ Transfer Stock</button>
            )}
            {activeTab === 'wastage' && (
              <button className="bos-btn bos-btn-primary" onClick={() => setIsWastageModalOpen(true)}>+ Log Wastage</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--bos-border)', paddingBottom: 0 }}>
        {(['locations', 'transfers', 'wastage'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400, fontSize: 13,
              background: activeTab === tab ? 'var(--bos-card-bg)' : 'transparent',
              color: activeTab === tab ? 'var(--bos-gold)' : 'var(--bos-text3)',
              borderBottom: activeTab === tab ? '2px solid var(--bos-gold)' : '2px solid transparent',
            }}>
            {tab === 'locations' ? '🏭 Storage Locations' : tab === 'transfers' ? '🔀 Stock Transfers' : '🗑 Wastage Log'}
          </button>
        ))}
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {locations.map(loc => (
              <div key={loc.id} className="bos-card" style={{ borderTop: `3px solid ${ZONE_COLORS[loc.type] || '#888'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--bos-text1)' }}>{loc.name}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${ZONE_COLORS[loc.type]}20`, color: ZONE_COLORS[loc.type] || '#888', marginTop: 4, display: 'inline-block' }}>
                      {loc.type}
                    </span>
                  </div>
                  {loc.temperature_zone && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>Temperature</div>
                      <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14 }}>{loc.temperature_zone}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {locations.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--bos-text3)' }}>
                No locations defined yet. Add your first storage location.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="bos-card">
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Date</th><th>Batch / Lot No</th><th>Type</th><th>From</th><th>To</th><th>Qty</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                    <td><strong style={{ color: 'var(--bos-gold)' }}>{t.reference_id}</strong></td>
                    <td><span className="bos-badge" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>{t.item_type}</span></td>
                    <td>{t.from_location_id || '—'}</td>
                    <td>{t.to_location_id || '—'}</td>
                    <td>{t.qty}</td>
                    <td style={{ color: 'var(--bos-text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.reason || '—'}</td>
                  </tr>
                ))}
                {transfers.length === 0 && !loading && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No transfers logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wastage Tab */}
      {activeTab === 'wastage' && (
        <div className="bos-card">
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr><th>Date</th><th>Batch / Lot No</th><th>Type</th><th>Qty Wasted</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {wastageLogs.map(w => (
                  <tr key={w.id}>
                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
                    <td><strong style={{ color: '#ef4444' }}>{w.reference_id}</strong></td>
                    <td><span className="bos-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{w.item_type}</span></td>
                    <td>{w.qty}</td>
                    <td style={{ color: 'var(--bos-text3)' }}>{w.reason}</td>
                  </tr>
                ))}
                {wastageLogs.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No wastage logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isLocModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Add Storage Location</h2>
              <button className="bos-btn-ghost" onClick={() => setIsLocModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleLocSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">Location Name</label>
                <input className="bos-form-field" required value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. Cold Room A, Ambient Store 2" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Type</label>
                <select className="bos-form-field" value={locForm.type} onChange={e => setLocForm({ ...locForm, type: e.target.value })}>
                  <option>RM Store</option>
                  <option>PM Store</option>
                  <option>Bulk Store</option>
                  <option>FG Store</option>
                  <option>Quarantine</option>
                  <option>Incubation Zone</option>
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Temperature Zone (optional)</label>
                <input className="bos-form-field" value={locForm.temperature_zone} onChange={e => setLocForm({ ...locForm, temperature_zone: e.target.value })} placeholder="e.g. Ambient, -18°C, +4°C" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsLocModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Location'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 540 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Transfer Stock</h2>
              <button className="bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Batch / Lot No</label>
                <input className="bos-form-field" required value={tForm.reference_id} onChange={e => setTForm({ ...tForm, reference_id: e.target.value.toUpperCase() })} placeholder="e.g. FG-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Material Type</label>
                <select className="bos-form-field" value={tForm.item_type} onChange={e => setTForm({ ...tForm, item_type: e.target.value })}>
                  <option value="RM">RM (Raw Material)</option>
                  <option value="PM">PM (Packaging Material)</option>
                  <option value="BULK">Bulk</option>
                  <option value="FG">FG (Finished Goods)</option>
                </select>
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
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Quantity</label>
                <input className="bos-form-field" type="number" required value={tForm.qty} onChange={e => setTForm({ ...tForm, qty: e.target.value })} placeholder="e.g. 50" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" value={tForm.reason} onChange={e => setTForm({ ...tForm, reason: e.target.value })} placeholder="e.g. Moving to incubation zone" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Transfer Stock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wastage Modal */}
      {isWastageModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#ef4444' }}>Log Wastage</h2>
              <button className="bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleWastageSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Batch / Lot No</label>
                <input className="bos-form-field" required value={wForm.reference_id} onChange={e => setWForm({ ...wForm, reference_id: e.target.value.toUpperCase() })} placeholder="e.g. FG-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Material Type</label>
                <select className="bos-form-field" value={wForm.item_type} onChange={e => setWForm({ ...wForm, item_type: e.target.value })}>
                  <option value="RM">RM</option>
                  <option value="PM">PM</option>
                  <option value="BULK">Bulk</option>
                  <option value="FG">FG</option>
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty Wasted</label>
                <input className="bos-form-field" type="number" required value={wForm.qty} onChange={e => setWForm({ ...wForm, qty: e.target.value })} placeholder="e.g. 5" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Reason</label>
                <input className="bos-form-field" required value={wForm.reason} onChange={e => setWForm({ ...wForm, reason: e.target.value })} placeholder="e.g. Damaged in packaging" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsWastageModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" style={{ background: '#ef4444', border: 'none' }} disabled={saving}>{saving ? 'Saving...' : 'Log Wastage'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
