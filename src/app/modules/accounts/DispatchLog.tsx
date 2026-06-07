import { useState, useMemo } from 'react';
import { useDispatches, useFgLots } from '../../hooks/useBos';
import { dispatchesApi } from '../../lib/bosApi';
import { DispatchStatus, fmtINR } from '../../types/bos';
import { useAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../lib/toast';

export function DispatchLog() {
  const { items: dispatches, loading: dLoading, reload: reloadDO } = useDispatches();
  const { items: fgLots, loading: fgLoading, reload: reloadFg } = useFgLots();
  const { user } = useAuth();

  const [filter, setFilter] = useState<DispatchStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    doNo: '', cust: '', fgLotId: '', qty: '', unit: 'kg', rate: '', gst: '18', veh: '', lr: '', trans: '', notes: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const activeFg = useMemo(() => fgLots.filter(l => (l.available_qty || 0) > 0), [fgLots]);
  const qcClearedFg = useMemo(() => activeFg.filter(l => l.coa_issued || l.coa_no), [activeFg]);  // BUG-09: removed (as any) casts
  const pendingQcFg = useMemo(() => activeFg.filter(l => !l.coa_issued && !l.coa_no), [activeFg]);  // BUG-09: removed (as any) casts
  
  const filteredDispatches = useMemo(() => {
    let list = dispatches;
    if (filter !== 'ALL') list = list.filter(d => d.status === filter);
    return list;
  }, [dispatches, filter]);

  const stats = [
    { label: 'Total DOs', val: dispatches.length, color: '#FFC107' },
    { label: 'Draft', val: dispatches.filter(d => d.status === 'DRAFT').length, color: '#94A3B8' },
    { label: 'Confirmed', val: dispatches.filter(d => d.status === 'CONFIRMED').length, color: '#FDE047' },
    { label: 'Dispatched', val: dispatches.filter(d => d.status === 'DISPATCHED').length, color: '#22C55E' },
  ];

  const handleSave = async () => {
    const qty = parseFloat(form.qty) || 0;
    const rate = parseFloat(form.rate) || 0;
    const gst = parseFloat(form.gst) || 0;

    if (!form.fgLotId) { showToast('Select an FG batch', 'warning'); return; }
    if (!form.cust.trim()) { showToast('Customer required', 'warning'); return; }
    if (qty <= 0) { showToast('Qty must be > 0', 'warning'); return; }
    if (rate <= 0) { showToast('Rate must be > 0', 'warning'); return; }

    const lot = activeFg.find(l => l.id === form.fgLotId);
    if (!lot) { showToast('FG Lot not found', 'info'); return; }
    if ((lot.available_qty || 0) < qty) { showToast(`Insufficient stock. Available: ${lot.available_qty}`, 'error'); return; }

    const sub = Math.round(qty * rate * 100) / 100;
    const gstAmt = Math.round(sub * gst) / 100;
    const total = Math.round((sub + gstAmt) * 100) / 100;
    const doNo = form.doNo.trim() || `DO-${Date.now().toString(36).toUpperCase()}`;

    setSaving(true);
    try {
      const { error } = await supabase.rpc('create_single_dispatch', {
        p_do_no:       doNo,
        p_batch_id:    lot.id,
        p_batch_no:    lot.batch_no || null,
        p_customer:    form.cust.trim(),
        p_product:     lot.product,
        p_quantity:    qty,
        p_unit:        form.unit,
        p_unit_rate:   rate,
        p_gst_pct:     gst,
        p_gst_amt:     Math.round(sub * gst) / 100,
        p_subtotal:    sub,
        p_total:       total,
        p_vehicle_no:  form.veh.trim() || null,
        p_lr_no:       form.lr.trim() || null,
        p_notes:       form.notes.trim() || null,
        p_user_id:     user?.id
      });
      if (error) throw error;

      showToast(`✅ DO ${doNo} created`, 'success');
      setIsModalOpen(false);
      setForm({ doNo: '', cust: '', fgLotId: '', qty: '', unit: 'kg', rate: '', gst: '18', veh: '', lr: '', trans: '', notes: '' });
      reloadDO();
    } catch (e: unknown) {
      showToast(`Error saving DO: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveDO = async (id: string, next: DispatchStatus) => {
    if (next !== 'DISPATCHED') {
      try {
        await dispatchesApi.updateStatus(id, next);
        showToast(`✅ DO ➔ ${next}`, 'success');
        reloadDO();
      } catch (e: unknown) { showToast(`Error: ${(e as Error).message}`, 'error'); }
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('dispatch_do_and_create_invoice', {
        p_do_id: id,
        p_user_id: user?.id
      });
      if (error) throw error;
      showToast(`🚀 Dispatched! Invoice ${data.invoice_no} auto-created (${fmtINR(data.invoice_total)})`, 'success');
      reloadDO();
      reloadFg();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  const deleteDO = async (id: string) => {
    if (!confirm('Delete this dispatch order?')) return;
    try {
      await dispatchesApi.remove(id);
      reloadDO();
    } catch (e: unknown) {
      showToast(`Error deleting: ${(e as Error).message}`, 'error');
    }
  };

  // Live preview calculations
  const pQty = parseFloat(form.qty) || 0;
  const pRate = parseFloat(form.rate) || 0;
  const pGst = parseFloat(form.gst) || 0;
  const pSub = Math.round(pQty * pRate * 100) / 100;
  const pGstAmt = Math.round(pSub * pGst) / 100;
  const pTotal = Math.round((pSub + pGstAmt) * 100) / 100;

  const selectedLot = activeFg.find(l => l.id === form.fgLotId);

  if (dLoading || fgLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Dispatch...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Business · Dispatch</p>
            <h1 className="bos-page-title">Dispatch Orders</h1>
            <p className="bos-page-sub">Create DOs from FG stock · Confirm · Generate delivery note</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ New Dispatch Order</button>}
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-tabs" style={{ marginTop: 24, borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
        {(['ALL', 'DRAFT', 'CONFIRMED', 'DISPATCHED'] as const).map(f => (
          <button 
            key={f}
            className={`bos-tab-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0, marginTop: 16 }}>
        {filteredDispatches.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No dispatch orders. Create a new Dispatch Order to start.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>DO No.</th><th>Customer</th><th>Product</th><th>Qty</th><th>Vehicle</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map(d => {
                  const sClass = d.status === 'DRAFT' ? 'bos-badge-gray' : d.status === 'CONFIRMED' ? 'bos-badge-yellow' : 'bos-badge-green';
                  return (
                    <tr key={d.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{d.do_no}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{d.customer}</td>
                      <td>{d.product}</td>
                      <td>{d.quantity} {d.unit}</td>
                      <td style={{ color: '#9AAF96' }}>{d.vehicle_no || '—'}</td>
                      <td><span className={`bos-badge ${sClass}`}>{d.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {d.status === 'DRAFT' && <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => moveDO(d.id, 'CONFIRMED')}>✓ Confirm</button>}
                          {d.status === 'CONFIRMED' && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => moveDO(d.id, 'DISPATCHED')}>🚚 Dispatch</button>}
                          {canEdit && d.status === 'DRAFT' && <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => deleteDO(d.id)}>🗑</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New DO Modal */}
      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 680 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">🚚 New Dispatch Order</span>
              <button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">DO No. (auto if blank)</label><input className="bos-form-field" placeholder="e.g. DO-2026-001" value={form.doNo} onChange={e=>setForm({...form, doNo: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Customer *</label><input className="bos-form-field" value={form.cust} onChange={e=>setForm({...form, cust: e.target.value})} /></div>
                <div className="bos-form-group">
                  <label className="bos-form-label">FG Batch * (Traceability)</label>
                  <select className="bos-form-field" value={form.fgLotId} onChange={e=>setForm({...form, fgLotId: e.target.value})}>
                    <option value="">-- Select FG Batch --</option>
                    <optgroup label="✅ QC Cleared (CoA Issued)">
                      {qcClearedFg.map(l => <option key={l.id} value={l.id}>{l.batch_no || l.id} — {l.product} ({l.available_qty} {l.unit}) ✓ CoA</option>)}
                    </optgroup>
                    <optgroup label="⚠️ Pending QC (Cannot Dispatch)">
                      {pendingQcFg.map(l => <option key={l.id} value={l.id} disabled>🚫 {l.batch_no || l.id} — {l.product} (QC Required)</option>)}
                    </optgroup>
                  </select>
                  {form.fgLotId && pendingQcFg.find(l => l.id === form.fgLotId) && (
                    <div style={{ marginTop: 8, background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#E05252' }}>
                      🚫 This batch has not been QC cleared. Dispatch will be blocked until a CoA is issued.
                    </div>
                  )}
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Product (auto)</label><input className="bos-form-field" value={selectedLot ? selectedLot.product : ''} readOnly style={{ opacity: 0.7 }} /></div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Qty to Dispatch *</label><input className="bos-form-field" type="number" step="0.01" value={form.qty} onChange={e=>setForm({...form, qty: e.target.value})} />
                  {selectedLot && <div style={{ fontSize: 11, color: '#9AAF96', marginTop: 4 }}>Avail: {selectedLot.available_qty} {selectedLot.unit}</div>}
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Unit</label><select className="bos-form-field" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})}><option>kg</option><option>ltr</option><option>pcs</option><option>box</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Selling Rate (₹) *</label><input className="bos-form-field" type="number" step="0.01" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">GST %</label><select className="bos-form-field" value={form.gst} onChange={e=>setForm({...form, gst: e.target.value})}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Vehicle No.</label><input className="bos-form-field" value={form.veh} onChange={e=>setForm({...form, veh: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">LR / Transport No.</label><input className="bos-form-field" value={form.lr} onChange={e=>setForm({...form, lr: e.target.value})} /></div>
              </div>
              
              {pQty > 0 && pRate > 0 && (
                <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 12, borderRadius: 8, marginTop: 16, color: '#D4A843' }}>
                  Subtotal: <strong>{fmtINR(pSub)}</strong> &nbsp; GST ({form.gst}%): <strong>{fmtINR(pGstAmt)}</strong> &nbsp; Total: <strong style={{ color: '#88C096' }}>{fmtINR(pTotal)}</strong>
                </div>
              )}

              <div className="bos-form-group" style={{ marginTop: 16 }}><label className="bos-form-label">Notes</label><textarea className="bos-form-field" rows={2} value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create DO →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
