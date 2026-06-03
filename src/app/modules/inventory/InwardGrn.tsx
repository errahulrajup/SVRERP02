import React, { useState, useMemo } from 'react';
import { useGrns } from '../../hooks/useBos';
import { grnsApi } from '../../lib/bosApi';
import { fmtINR, daysUntil, GrnStatus } from '../../types/bos';
import { useAuth } from '../../hooks';

export function InwardGrn() {
  const { items: grns, loading, reload } = useGrns();
  const { user } = useAuth();
  const [filter, setFilter] = useState<GrnStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    grnNo: '', supplier: '', material: '', lotNo: '', qty: '', uom: 'kg',
    rate: '', gst: '18', mfgDate: '', expDate: '', invNo: '', vehNo: '', remarks: ''
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredGrns = useMemo(() => {
    let list = grns;
    if (filter !== 'ALL') list = list.filter(g => g.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => 
        g.grn_no?.toLowerCase().includes(q) || 
        g.supplier?.toLowerCase().includes(q) || 
        g.material?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (!a.expiry_date || !b.expiry_date) return 0;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }, [grns, filter]);

  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Stats
  const stats = [
    { label: 'Total GRNs',  val: grns.length, color: '#FFC107' },
    { label: 'QC Pending',  val: grns.filter(g => g.status === 'QC_PENDING').length, color: '#FDE047' },
    { label: 'QC Approved', val: grns.filter(g => g.status === 'APPROVED').length, color: '#22C55E' },
    { label: 'Rejected',    val: grns.filter(g => g.status === 'REJECTED').length, color: '#EF4444' },
  ];

  const handleSaveGRN = async () => {
    const qty = parseFloat(form.qty) || 0;
    const rate = parseFloat(form.rate) || 0;
    const gst = parseFloat(form.gst) || 0;

    if (!form.material.trim()) return alert('Material is required');
    if (!form.supplier.trim()) return alert('Supplier is required');
    if (qty <= 0) return alert('Quantity must be > 0');
    if (rate <= 0) return alert('Rate must be > 0');

    if (form.mfgDate && form.expDate && form.mfgDate > form.expDate) {
      return alert('Manufacturing date cannot be after expiry date');
    }

    setSaving(true);
    const grnNo = form.grnNo.trim() || `GRN-${Date.now().toString(36).toUpperCase()}`;

    const isDuplicate = grns.some(g => g.grn_no.toLowerCase() === grnNo.toLowerCase() || (form.invNo && g.invoice_no?.toLowerCase() === form.invNo.trim().toLowerCase()));
    if (isDuplicate) {
      if (!confirm('A GRN with this number or Invoice number already exists. Proceed anyway?')) {
        setSaving(false);
        return;
      }
    }

    try {
      const gstAmt = (qty * rate * gst) / 100;
      const totalCost = (qty * rate) + gstAmt;

      const res = await grnsApi.create({
        grn_no: grnNo,
        supplier: form.supplier.trim(),
        material: form.material.trim(),
        quantity: qty,
        unit: form.uom,
        unit_cost: rate,
        total_cost: totalCost,
        gst_pct: gst,
        gst_amt: gstAmt,
        invoice_no: form.invNo.trim() || null,
        vehicle_no: form.vehNo.trim() || null,
        mfg_date: form.mfgDate || null,
        expiry_date: form.expDate || null,
        status: 'QC_PENDING',
        reject_reason: null,
        notes: form.remarks.trim() ? form.remarks.trim() + (form.lotNo ? ` | Lot: ${form.lotNo}` : '') : (form.lotNo ? `Lot: ${form.lotNo}` : null),
        created_by: user?.name || 'System',
        erp_product_id: null
      });
      if (res.error) throw new Error(res.error.message);

      // also save LotNo somewhere? The legacy app stored it in `lotNo` on the form
      // but Supabase DB schema for `grns` might not have `lot_no`. We'll just pass it in notes if needed, 
      // or wait until approveGRN to use `grn_no` as `lot_no`. 
      
      alert(`✅ GRN ${grnNo} recorded. Awaiting QC.`);
      setIsModalOpen(false);
      setForm({ grnNo:'', supplier:'', material:'', lotNo:'', qty:'', uom:'kg', rate:'', gst:'18', mfgDate:'', expDate:'', invNo:'', vehNo:'', remarks:'' });
      reload();
    } catch (e: any) {
      alert(`Error saving GRN: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteGRN = async (id: string) => {
    if (!confirm('Delete this GRN?')) return;
    setDeletingId(id);
    try {
      await grnsApi.remove(id);
      reload();
    } catch(e:any) { alert(`Error deleting: ${e.message}`); }
    finally { setDeletingId(null); }
  };

  if (loading) {
    return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Inward...</div>;
  }

  const subtotal = (parseFloat(form.qty)||0) * (parseFloat(form.rate)||0);
  const gstAmt = subtotal * (parseFloat(form.gst)||0) / 100;
  const landCost = subtotal + gstAmt;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Operations · Inward</p>
            <h1 className="bos-page-title">Goods Receipt Note (GRN)</h1>
            <p className="bos-page-sub">Record incoming raw materials · QC gate · FEFO stock entry</p>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'OPERATOR') && (
            <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ New GRN</button>
          )}
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(['ALL', 'QC_PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button 
              key={f}
              className={`bos-tab-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'ALL' ? 'All' : f === 'QC_PENDING' ? 'QC Pending' : f === 'APPROVED' ? 'QC Done' : 'Rejected'}
            </button>
          ))}
          <input className="bos-form-field" placeholder="Search supplier, material, GRN..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginLeft: 'auto', maxWidth: 300 }} />
        </div>
      </div>

      <div style={{ background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.2)', padding: 12, borderRadius: 8, color: '#8AB4F8', fontSize: 13, margin: '14px 0' }}>
        ℹ️ <strong>FEFO Rule:</strong> Lots are always suggested in expiry-first order. Production can only consume QC Done lots.
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        {filteredGrns.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No GRNs found.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>GRN No.</th><th>Supplier</th><th>Material</th>
                  <th>Qty</th><th>Rate</th><th>Landing Cost</th>
                  <th>Expiry</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrns.map(g => {
                  const days = daysUntil(g.expiry_date);
                  const eClass = days < 0 ? 'bos-badge-red' : days <= 30 ? 'bos-badge-yellow' : 'bos-badge-green';
                  const eLbl = g.expiry_date ? (days < 0 ? 'Expired' : days <= 7 ? `${days}d left` : g.expiry_date) : '—';
                  const sClass = g.status === 'QC_PENDING' ? 'bos-badge-yellow' : g.status === 'APPROVED' ? 'bos-badge-green' : 'bos-badge-red';
                  
                  return (
                    <tr key={g.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{g.grn_no}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{g.supplier}</td>
                      <td>{g.material}</td>
                      <td>{g.quantity} {g.unit || 'kg'}</td>
                      <td>{fmtINR(g.unit_cost)}</td>
                      <td style={{ color: '#D4A843', fontWeight: 500 }}>{fmtINR(g.total_cost)}</td>
                      <td>{g.expiry_date ? <span className={`bos-badge ${eClass}`}>{eLbl}</span> : '—'}</td>
                      <td><span className={`bos-badge ${sClass}`}>{g.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {canDelete && (
                            <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => deleteGRN(g.id)} disabled={deletingId === g.id}>🗑</button>
                          )}
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

      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header">
              <span className="bos-modal-title">📥 New Goods Receipt Note</span>
              <button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">GRN No. (auto if blank)</label>
                  <input className="bos-form-field" placeholder="e.g. GRN-2026-001" value={form.grnNo} onChange={e => setForm({...form, grnNo: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Supplier *</label>
                  <input className="bos-form-field" placeholder="Supplier name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Material *</label>
                  <input className="bos-form-field" placeholder="e.g. Refined Palm Oil" value={form.material} onChange={e => setForm({...form, material: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Lot / Batch No.</label>
                  <input className="bos-form-field" placeholder="e.g. LOT-001" value={form.lotNo} onChange={e => setForm({...form, lotNo: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Qty Received *</label>
                  <input className="bos-form-field" type="number" placeholder="0" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">UOM</label>
                  <select className="bos-form-field" value={form.uom} onChange={e => setForm({...form, uom: e.target.value})}>
                    <option>kg</option><option>ltr</option><option>g</option><option>ml</option>
                    <option>pcs</option><option>box</option><option>drum</option><option>ton</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Rate per Unit (₹) *</label>
                  <input className="bos-form-field" type="number" placeholder="0.00" step="0.01" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">GST %</label>
                  <select className="bos-form-field" value={form.gst} onChange={e => setForm({...form, gst: e.target.value})}>
                    <option value="0">0%</option><option value="5">5%</option>
                    <option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Mfg Date</label>
                  <input className="bos-form-field" type="date" value={form.mfgDate} onChange={e => setForm({...form, mfgDate: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Expiry Date</label>
                  <input className="bos-form-field" type="date" value={form.expDate} onChange={e => setForm({...form, expDate: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Invoice No.</label>
                  <input className="bos-form-field" placeholder="Supplier invoice no." value={form.invNo} onChange={e => setForm({...form, invNo: e.target.value})} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Vehicle No.</label>
                  <input className="bos-form-field" placeholder="e.g. DL01AB1234" value={form.vehNo} onChange={e => setForm({...form, vehNo: e.target.value})} />
                </div>
              </div>
              
              {subtotal > 0 && (
                <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', padding: 12, borderRadius: 8, marginTop: 16, color: '#D4A843' }}>
                  Sub-total: <strong>{fmtINR(subtotal)}</strong> + GST ({form.gst}%): <strong>{fmtINR(gstAmt)}</strong> = Landing: <strong>{fmtINR(landCost)}</strong>
                </div>
              )}

              <div className="bos-form-group" style={{ marginTop: 16 }}>
                <label className="bos-form-label">Remarks</label>
                <textarea className="bos-form-field" rows={2} placeholder="Optional remarks" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveGRN} disabled={saving}>{saving ? 'Saving...' : 'Record GRN →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
