import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';
import { packagingRunsApi, stockTransfersApi } from '../../lib/bosApi';

export function PackagingHouse() {
  const { user } = useAuth();
  
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // New Pack Form
  const [pForm, setPForm] = useState({
    bulkLotId: '',
    pmLotId: '',
    sku: 'MOTHERLITE-500G',
    bulkQty: '',
    pmQty: '',
    fgLotId: '',
    locationId: '', // Represents ambient/cold line
    operator: user?.name || '',
    notes: ''
  });

  // SKU Convert Form
  const [cForm, setCForm] = useState({
    sourceFgLotId: '',
    targetSku: 'MOTHERLITE-100G',
    qtyToConvert: '',
    targetFgLotId: '',
    pmWastageQty: '',
    reason: 'Urgent Order Conversion'
  });

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const { data } = await packagingRunsApi.list();
      setRuns(data || []);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.bulkLotId || !pForm.fgLotId || !pForm.bulkQty) return alert('Fill required fields');
    setSaving(true);
    try {
      await packagingRunsApi.create({
        id: `PRK-${Date.now().toString(36).toUpperCase()}`,
        bulk_lot_id: pForm.bulkLotId,
        pm_lot_id: pForm.pmLotId || null,
        pm_qty_consumed: parseFloat(pForm.pmQty) || 0,
        bulk_qty_consumed: parseFloat(pForm.bulkQty) || 0,
        fg_lot_id: pForm.fgLotId,
        operator_id: user?.id || null,
        notes: pForm.notes || null,
      });
      alert('Packaging Run completed successfully!');
      setIsPackModalOpen(false);
      setPForm({ ...pForm, bulkLotId: '', fgLotId: '', bulkQty: '', pmQty: '' });
      loadRuns();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cForm.sourceFgLotId || !cForm.targetFgLotId || !cForm.qtyToConvert) return alert('Fill required fields');
    setSaving(true);
    try {
      // In a real scenario, this would deduct the source lot and create the target lot, plus log wastage.
      // Here we log it as a stock transfer of type SKU_CONVERT
      await stockTransfersApi.create({
        reference_id: cForm.sourceFgLotId,
        item_type: 'FG',
        qty: parseFloat(cForm.qtyToConvert),
        transferred_by: user?.id || null,
        reason: `SKU Conversion to ${cForm.targetSku}. Wastage: ${cForm.pmWastageQty} units. Notes: ${cForm.reason}`
      });
      alert('SKU Conversion completed successfully!');
      setIsConvertModalOpen(false);
      setCForm({ ...cForm, sourceFgLotId: '', targetFgLotId: '', qtyToConvert: '', pmWastageQty: '' });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Pack Runs', val: runs.length, colorHex: '#D4A843' },
    { label: 'Active Lines', val: 3, colorHex: '#4ADE80' },
    { label: 'Ambient Zones', val: 2, colorHex: '#60A5FA' },
    { label: 'Cold Zones (-18C)', val: 1, colorHex: '#C084FC' },
  ];

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">Production · End of Line</p>
            <h1 className="bos-page-title">Packaging House</h1>
            <p className="bos-page-sub">Manage multiple SKUs, environments, and SKU conversions</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-secondary" onClick={() => setIsConvertModalOpen(true)}>
              🔄 SKU Conversion
            </button>
            <button className="bos-btn bos-btn-primary" onClick={() => setIsPackModalOpen(true)}>
              📦 New Pack Run
            </button>
          </div>
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="bos-card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.colorHex}` }}>
            <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bos-text1)', marginTop: 8 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-card">
        <div className="bos-card-title">Recent Packaging Runs</div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Run ID</th>
                <th>Bulk Batch No</th>
                <th>FG Batch No</th>
                <th>Bulk Consumed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.run_date).toLocaleDateString()}</td>
                  <td>{r.id}</td>
                  <td>{r.bulk_lot_id}</td>
                  <td><span className="bos-badge bos-badge-green">{r.fg_lot_id}</span></td>
                  <td>{r.bulk_qty_consumed} kg</td>
                  <td>Completed</td>
                </tr>
              ))}
              {runs.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No packaging runs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Pack Run Modal */}
      {isPackModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 600 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>📦 New Packaging Run</h2>
              <button className="bos-btn-ghost" onClick={() => setIsPackModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handlePackSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Bulk Batch No (Source)</label>
                <input className="bos-form-field" required value={pForm.bulkLotId} onChange={e => setPForm({...pForm, bulkLotId: e.target.value.toUpperCase()})} placeholder="e.g. BULK-102" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Target SKU</label>
                <select className="bos-form-field" value={pForm.sku} onChange={e => setPForm({...pForm, sku: e.target.value})}>
                  <option>MOTHERLITE-100G</option>
                  <option>MOTHERLITE-200G</option>
                  <option>MOTHERLITE-500G</option>
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Bulk Qty Consumed (KG)</label>
                <input className="bos-form-field" type="number" required value={pForm.bulkQty} onChange={e => setPForm({...pForm, bulkQty: e.target.value})} placeholder="e.g. 50" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">PM Consumed (Boxes/Wrappers)</label>
                <input className="bos-form-field" type="number" value={pForm.pmQty} onChange={e => setPForm({...pForm, pmQty: e.target.value})} placeholder="e.g. 100" />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bos-form-label">New FG Batch No (Target)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="bos-form-field" required value={pForm.fgLotId} onChange={e => setPForm({...pForm, fgLotId: e.target.value.toUpperCase()})} placeholder="Enter generated batch no" />
                  <button type="button" className="bos-btn bos-btn-secondary" onClick={() => setPForm({...pForm, fgLotId: `FG-${Date.now().toString(36).toUpperCase()}`})}>Generate</button>
                </div>
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1 / -1', marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsPackModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Complete Run'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SKU Conversion Modal */}
      {isConvertModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 600 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bos-orange)' }}>🔄 Urgent SKU Conversion</h2>
              <button className="bos-btn-ghost" onClick={() => setIsConvertModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleConvertSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Source FG Batch No (e.g. 500g)</label>
                <input className="bos-form-field" required value={cForm.sourceFgLotId} onChange={e => setCForm({...cForm, sourceFgLotId: e.target.value.toUpperCase()})} placeholder="e.g. FG-A12" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Target SKU (e.g. 100g)</label>
                <select className="bos-form-field" value={cForm.targetSku} onChange={e => setCForm({...cForm, targetSku: e.target.value})}>
                  <option>MOTHERLITE-100G</option>
                  <option>MOTHERLITE-200G</option>
                  <option>MOTHERLITE-500G</option>
                </select>
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Qty to Convert (kg)</label>
                <input className="bos-form-field" type="number" required value={cForm.qtyToConvert} onChange={e => setCForm({...cForm, qtyToConvert: e.target.value})} placeholder="e.g. 20" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">PM Wastage (Discarded Wrappers)</label>
                <input className="bos-form-field" type="number" required value={cForm.pmWastageQty} onChange={e => setCForm({...cForm, pmWastageQty: e.target.value})} placeholder="e.g. 40" />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bos-form-label">New Target FG Batch No</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="bos-form-field" required value={cForm.targetFgLotId} onChange={e => setCForm({...cForm, targetFgLotId: e.target.value.toUpperCase()})} placeholder="New batch no for repacked SKU" />
                  <button type="button" className="bos-btn bos-btn-secondary" onClick={() => setCForm({...cForm, targetFgLotId: `FG-CNV-${Date.now().toString(36).toUpperCase()}`})}>Generate</button>
                </div>
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bos-form-label">Reason / Notes</label>
                <input className="bos-form-field" value={cForm.reason} onChange={e => setCForm({...cForm, reason: e.target.value})} />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1 / -1', marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsConvertModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" style={{ background: 'var(--bos-orange)', color: '#fff', border: 'none' }} disabled={saving}>{saving ? 'Saving...' : 'Execute Conversion'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
