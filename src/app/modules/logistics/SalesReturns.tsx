import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { salesReturnsApi, returnQcApi, wastageLogsApi, packagingRunsApi } from '../../lib/bosApi';

type Status = 'OK' | 'DAMAGED';
type ProductStatus = 'OK' | 'SPOILED';
type Action = 'REPACK' | 'REPROCESS' | 'DISCARD' | 'OK';

function dispositionFromQc(primary: Status, secondary: Status, tertiary: Status | '', product: ProductStatus): Action {
  if (product === 'SPOILED') return 'REPROCESS';
  if (primary === 'OK' && secondary === 'OK' && (tertiary === '' || tertiary === 'OK')) return 'OK';
  return 'REPACK';
}

function DispositionBadge({ action }: { action: Action }) {
  const map: Record<Action, { label: string; color: string; bg: string }> = {
    OK:        { label: '✓ Good Stock',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    REPACK:    { label: '📦 Repack',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    REPROCESS: { label: '🔄 Reprocess',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    DISCARD:   { label: '🗑 Discard',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  };
  const s = map[action];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

export function SalesReturns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal: Log New Return
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [rForm, setRForm] = useState({
    invoice_no: '', fg_lot_id: '', qty: '', return_date: new Date().toISOString().split('T')[0], reason: '',
  });

  // Modal: QC Disposition
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [qcForm, setQcForm] = useState({
    primary_pm_status: 'OK' as Status,
    secondary_pm_status: 'OK' as Status,
    tertiary_pm_status: '' as Status | '',
    product_status: 'OK' as ProductStatus,
    override_action: '' as Action | '',
    new_lot_id: '',
    notes: '',
  });

  useEffect(() => { loadReturns(); }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const { data } = await salesReturnsApi.list();
      setReturns(data || []);
    } finally { setLoading(false); }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.fg_lot_id || !rForm.qty) return alert('Batch No and Qty are required');
    setSaving(true);
    try {
      await salesReturnsApi.create({
        invoice_no: rForm.invoice_no || null,
        fg_lot_id: rForm.fg_lot_id.toUpperCase(),
        qty: parseFloat(rForm.qty),
        return_date: rForm.return_date,
        reason: rForm.reason || null,
        status: 'PENDING_QC',
      });
      setIsReturnModalOpen(false);
      setRForm({ invoice_no: '', fg_lot_id: '', qty: '', return_date: new Date().toISOString().split('T')[0], reason: '' });
      loadReturns();
    } finally { setSaving(false); }
  };

  const openQcModal = (ret: any) => {
    setSelectedReturn(ret);
    setQcForm({
      primary_pm_status: 'OK', secondary_pm_status: 'OK', tertiary_pm_status: '',
      product_status: 'OK', override_action: '', new_lot_id: '', notes: '',
    });
    setIsQcModalOpen(true);
  };

  const autoAction = dispositionFromQc(
    qcForm.primary_pm_status, qcForm.secondary_pm_status,
    qcForm.tertiary_pm_status, qcForm.product_status
  );
  const finalAction: Action = (qcForm.override_action as Action) || autoAction;

  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    // Auto-generate new lot ID based on action
    let newLot = qcForm.new_lot_id.toUpperCase();
    if (!newLot) {
      const ts = Date.now().toString(36).toUpperCase();
      if (finalAction === 'REPACK')    newLot = `FG-${ts}`;
      if (finalAction === 'REPROCESS') newLot = `RPR-${ts}`;
    }

    setSaving(true);
    try {
      // 1. Save the QC record
      await returnQcApi.create({
        return_id: selectedReturn.id,
        primary_pm_status: qcForm.primary_pm_status,
        secondary_pm_status: qcForm.secondary_pm_status,
        tertiary_pm_status: qcForm.tertiary_pm_status || null,
        product_status: qcForm.product_status,
        disposition_action: finalAction,
        new_lot_id: (finalAction === 'REPACK' || finalAction === 'REPROCESS') ? newLot : null,
        qc_by: user?.id || null,
        notes: qcForm.notes || null,
      });

      // 2. Log wastage for damaged packaging
      const damagedLayers: string[] = [];
      if (qcForm.primary_pm_status === 'DAMAGED') damagedLayers.push('Primary Packaging');
      if (qcForm.secondary_pm_status === 'DAMAGED') damagedLayers.push('Secondary Packaging');
      if (qcForm.tertiary_pm_status === 'DAMAGED') damagedLayers.push('Tertiary Packaging');
      if (finalAction === 'REPROCESS') damagedLayers.push('All Packaging (Reprocess)');
      if (finalAction === 'DISCARD') damagedLayers.push('Product + All Packaging');

      if (damagedLayers.length > 0) {
        await wastageLogsApi.create({
          item_type: 'FG',
          reference_id: selectedReturn.fg_lot_id,
          qty: selectedReturn.qty,
          reason: `Return QC: ${damagedLayers.join(', ')} damaged. Action: ${finalAction}`,
          logged_by: user?.id || null,
        });
      }

      // 3. If REPACK → create a packaging run entry with new lot
      if (finalAction === 'REPACK') {
        await packagingRunsApi.create({
          id: `RPK-${Date.now().toString(36).toUpperCase()}`,
          bulk_lot_id: selectedReturn.fg_lot_id,
          bulk_qty_consumed: selectedReturn.qty,
          pm_qty_consumed: 0,
          fg_lot_id: newLot,
          operator_id: user?.id || null,
          notes: `Repack from Return QC. Original: ${selectedReturn.fg_lot_id}. Invoice: ${selectedReturn.invoice_no || 'N/A'}`,
        });
      }

      // 4. Update return status to DISPOSITIONED
      await salesReturnsApi.update(selectedReturn.id, { status: 'DISPOSITIONED' });

      alert(`✅ Disposition complete!\nAction: ${finalAction}${newLot ? `\nNew Batch No: ${newLot}` : ''}`);
      setIsQcModalOpen(false);
      loadReturns();
    } finally { setSaving(false); }
  };

  const stats = [
    { label: 'Total Returns', val: returns.length, colorHex: '#D4A843' },
    { label: 'Pending QC', val: returns.filter(r => r.status === 'PENDING_QC').length, colorHex: '#fb923c' },
    { label: 'Repack Orders', val: 0, colorHex: '#60a5fa' },
    { label: 'Reprocess Orders', val: 0, colorHex: '#c084fc' },
  ];

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="bos-eyebrow">Dispatch · Reverse Logistics</p>
            <h1 className="bos-page-title">Sales Returns</h1>
            <p className="bos-page-sub">Log returned goods, run QC, decide disposition — Repack, Reprocess, or Discard</p>
          </div>
          <button className="bos-btn bos-btn-primary" onClick={() => setIsReturnModalOpen(true)}>
            + Log Return
          </button>
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="bos-card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.colorHex}` }}>
            <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--bos-text1)', marginTop: 8 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-card">
        <div className="bos-card-title">Returns Log</div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>FG Batch No</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.return_date).toLocaleDateString()}</td>
                  <td>{r.invoice_no || '—'}</td>
                  <td><strong style={{ color: 'var(--bos-gold)' }}>{r.fg_lot_id}</strong></td>
                  <td>{r.qty}</td>
                  <td style={{ color: 'var(--bos-text3)' }}>{r.reason || '—'}</td>
                  <td>
                    {r.status === 'PENDING_QC'
                      ? <span className="bos-badge" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>⏳ Pending QC</span>
                      : <span className="bos-badge bos-badge-green">✓ Dispositioned</span>
                    }
                  </td>
                  <td>
                    {r.status === 'PENDING_QC' && (
                      <button className="bos-btn bos-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openQcModal(r)}>
                        Run QC
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--bos-text3)' }}>No returns logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Return Modal ── */}
      {isReturnModalOpen && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 540 }}>
            <div className="bos-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Log Incoming Return</h2>
              <button className="bos-btn-ghost" onClick={() => setIsReturnModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleReturnSubmit} className="bos-modal-body bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="bos-form-group">
                <label className="bos-form-label">Original Invoice No</label>
                <input className="bos-form-field" value={rForm.invoice_no} onChange={e => setRForm({ ...rForm, invoice_no: e.target.value })} placeholder="e.g. INV-2026-0123 (optional)" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Return Date</label>
                <input className="bos-form-field" type="date" value={rForm.return_date} onChange={e => setRForm({ ...rForm, return_date: e.target.value })} />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="bos-form-label">FG Batch No (Returned)</label>
                <input className="bos-form-field" required value={rForm.fg_lot_id} onChange={e => setRForm({ ...rForm, fg_lot_id: e.target.value.toUpperCase() })} placeholder="e.g. FG-A1B2C3" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Returned Qty (kg / units)</label>
                <input className="bos-form-field" type="number" required value={rForm.qty} onChange={e => setRForm({ ...rForm, qty: e.target.value })} placeholder="e.g. 50" />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">Return Reason</label>
                <input className="bos-form-field" value={rForm.reason} onChange={e => setRForm({ ...rForm, reason: e.target.value })} placeholder="e.g. Packaging damaged in transit" />
              </div>
              <div className="bos-form-group" style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsReturnModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Return'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QC Disposition Modal ── */}
      {isQcModalOpen && selectedReturn && (
        <div className="bos-modal-backdrop">
          <div className="bos-modal" style={{ maxWidth: 640 }}>
            <div className="bos-modal-header">
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>Return QC — Disposition</h2>
                <p style={{ fontSize: 12, color: 'var(--bos-text3)', marginTop: 2 }}>Batch: <strong style={{ color: 'var(--bos-gold)' }}>{selectedReturn.fg_lot_id}</strong> · Qty: {selectedReturn.qty}</p>
              </div>
              <button className="bos-btn-ghost" onClick={() => setIsQcModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleQcSubmit} className="bos-modal-body">

              {/* Packaging Condition */}
              <div style={{ marginBottom: 20 }}>
                <div className="bos-card-title" style={{ marginBottom: 12 }}>📦 Packaging Condition</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Primary (Wrapper/Pouch)', key: 'primary_pm_status' },
                    { label: 'Secondary (Box/Carton)', key: 'secondary_pm_status' },
                    { label: 'Tertiary (Outer Carton)', key: 'tertiary_pm_status', optional: true },
                  ].map(f => (
                    <div key={f.key} className="bos-form-group">
                      <label className="bos-form-label">{f.label}{f.optional ? ' (optional)' : ''}</label>
                      <select className="bos-form-field"
                        value={(qcForm as any)[f.key]}
                        onChange={e => setQcForm({ ...qcForm, [f.key]: e.target.value })}>
                        {f.optional && <option value="">Not Applicable</option>}
                        <option value="OK">✓ OK — Intact</option>
                        <option value="DAMAGED">✗ Damaged</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Condition */}
              <div style={{ marginBottom: 20 }}>
                <div className="bos-card-title" style={{ marginBottom: 12 }}>🧪 Product Condition</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Inner Product Status</label>
                    <select className="bos-form-field" value={qcForm.product_status} onChange={e => setQcForm({ ...qcForm, product_status: e.target.value as ProductStatus })}>
                      <option value="OK">✓ OK — Product Intact & Saleable</option>
                      <option value="SPOILED">✗ Spoiled — Needs Reprocessing</option>
                    </select>
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Notes / Observations</label>
                    <input className="bos-form-field" value={qcForm.notes} onChange={e => setQcForm({ ...qcForm, notes: e.target.value })} placeholder="e.g. Rancid smell, carton crushed..." />
                  </div>
                </div>
              </div>

              {/* Auto-calculated Disposition */}
              <div style={{ background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', borderRadius: 10, padding: '1rem', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>System Recommended Disposition</div>
                    <DispositionBadge action={autoAction} />
                    <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 6 }}>
                      {autoAction === 'OK' && 'Product and all packaging intact → Move back to FG Store.'}
                      {autoAction === 'REPACK' && 'Product OK but packaging damaged → Strip old PM, repack with new. Fresh batch code issued.'}
                      {autoAction === 'REPROCESS' && 'Product spoiled → All packaging wasted. Product sent back to Bulk for reworking.'}
                      {autoAction === 'DISCARD' && 'Completely unsalvageable → Marked as total wastage.'}
                    </div>
                  </div>
                  <div className="bos-form-group" style={{ minWidth: 180, margin: 0 }}>
                    <label className="bos-form-label">Override (optional)</label>
                    <select className="bos-form-field" value={qcForm.override_action} onChange={e => setQcForm({ ...qcForm, override_action: e.target.value as Action | '' })}>
                      <option value="">Use Recommended</option>
                      <option value="OK">OK — Good Stock</option>
                      <option value="REPACK">Repack</option>
                      <option value="REPROCESS">Reprocess</option>
                      <option value="DISCARD">Discard</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* New Batch No for Repack / Reprocess */}
              {(finalAction === 'REPACK' || finalAction === 'REPROCESS') && (
                <div className="bos-form-group" style={{ marginBottom: 20 }}>
                  <label className="bos-form-label">
                    {finalAction === 'REPACK'
                      ? '📦 New Batch No (will be assigned after repacking — market will see this only)'
                      : '🔄 Reprocess Batch No (RPR- prefix recommended)'}
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input className="bos-form-field" value={qcForm.new_lot_id}
                      onChange={e => setQcForm({ ...qcForm, new_lot_id: e.target.value.toUpperCase() })}
                      placeholder={finalAction === 'REPACK' ? 'Will auto-generate if left blank' : 'RPR-XXXXXX'} />
                    <button type="button" className="bos-btn bos-btn-secondary"
                      onClick={() => {
                        const ts = Date.now().toString(36).toUpperCase();
                        setQcForm({ ...qcForm, new_lot_id: finalAction === 'REPACK' ? `FG-${ts}` : `RPR-${ts}` });
                      }}>Generate</button>
                  </div>
                  {finalAction === 'REPACK' && (
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>
                      ℹ️ A fresh batch code means no one in the market can trace this back to the return.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="bos-btn bos-btn-ghost" onClick={() => setIsQcModalOpen(false)}>Cancel</button>
                <button type="submit" className="bos-btn bos-btn-primary" disabled={saving}>
                  {saving ? 'Processing...' : `Confirm — ${finalAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
