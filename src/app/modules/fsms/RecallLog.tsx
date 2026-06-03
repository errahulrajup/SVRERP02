import React, { useState, useMemo } from 'react';
import { useRecalls, useBatches, useDispatches } from '../../hooks/useBos';
import { recallApi } from '../../lib/bosApi';
import { Recall, fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

const RECALL_REASONS = [
  "Microbial Contamination", "Foreign Body / Physical Hazard", "Chemical Contamination", 
  "Allergen Undeclared", "Labeling Error", "Packaging Defect", "Customer Complaint", 
  "Regulatory Direction", "Mock Recall Exercise", "Other"
];

export function RecallLog() {
  const { items: recalls, loading, reload } = useRecalls();
  const { items: batches } = useBatches();
  const { items: dispatches } = useDispatches();
  const { user } = useAuth();

  const [activeRecall, setActiveRecall] = useState<Recall | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ id: '', qty: '', status: 'In Progress' });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    batchRef: '', reason: RECALL_REASONS[0], qtyDispatched: '', unit: 'kg',
    timeToTrace: '', customers: '', desc: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const active = recalls.filter(r => r.status !== "Closed" && !r.is_mock);
  const mock = recalls.filter(r => r.is_mock);
  const closed = recalls.filter(r => r.status === "Closed");

  const stats = [
    { label: "Total Recalls", val: recalls.filter(r => !r.is_mock).length, color: "#EF4444" },
    { label: "Active Recalls", val: active.length, color: "#F43F5E" },
    { label: "Mock Recalls Done", val: mock.length, color: "#60A5FA" },
    { label: "Closed", val: closed.length, color: "#22C55E" },
  ];

  const sortedRecalls = useMemo(() => {
    return [...recalls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [recalls]);

  const autofillRecall = (batchNo: string) => {
    setForm({ ...form, batchRef: batchNo });
    if (!batchNo) return;
    const selectedBatch = batches.find(b => b.batch_no === batchNo);
    if (!selectedBatch) return;
    const dispatched = dispatches.filter(d => d.batch_id === selectedBatch.id && d.status === "DISPATCHED");
    const totalQty = dispatched.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const customers = [...new Set(dispatched.map(d => d.customer))].join(", ");

    setForm(f => ({ ...f, qtyDispatched: totalQty ? String(totalQty) : '', customers: customers || '' }));
  };

  const saveRecall = async () => {
    if (!form.reason) return alert('Reason required');
    const prefix = isMock ? "MOCK" : "RCL";
    const recallNo = `${prefix}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const traceTime = form.timeToTrace ? `${form.timeToTrace} min${isMock ? (Number(form.timeToTrace) <= 120 ? " ✅ (Pass)" : " ❌ (>2hr, needs improvement)") : ""}` : "—";

    setSaving(true);
    try {
      const customers = form.customers
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const product = batches.find(b => b.batch_no === form.batchRef)?.product || 'Unknown Product';

      await recallApi.create({
        recall_no: recallNo,
        product,
        is_mock: isMock,
        batch_ref: form.batchRef || null,
        batch_ids: null,
        reason: form.reason as Recall['reason'],
        qty_dispatched: Number(form.qtyDispatched) || 0,
        qty_recovered: 0,
        unit: form.unit,
        initiated_by: user?.name || null,
        customers: customers.length ? customers : null,
        description: form.desc.trim() || '',
        scope: null,
        trace_time: traceTime,
        status: 'Open',
        completed_at: null,
        closed_at: null,
        closed_by: null,
        notes: null
      });
      alert(`${isMock ? "Mock recall" : "Recall"} ${recallNo} initiated`);
      setIsFormOpen(false);
      setForm({ batchRef: '', reason: RECALL_REASONS[0], qtyDispatched: '', unit: 'kg', timeToTrace: '', customers: '', desc: '' });
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const saveUpdate = async () => {
    if (!updateForm.status) return alert('Select status');
    const qty = Number(updateForm.qty);
    if (qty < 0) return alert('Quantity cannot be negative');

    try {
      const updateData: any = { qty_recovered: qty, status: updateForm.status };
      if (updateForm.status === 'Closed') {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user?.name || null;
      }
      await recallApi.update(updateForm.id, updateData);
      alert('Recall updated');
      setIsUpdateModalOpen(false);
      reload();
    } catch (e: any) { alert(`Error updating: ${e.message}`); }
  };

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Recall Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · FSSAI Food Recall Regulations · ISO 22000 Cl. 8.9.5</p>
            <h1 className="bos-page-title">Recall &amp; Mock Recall Management</h1>
            <p className="bos-page-sub">One-step forward trace · Quantity recovery tracking · Regulator notification</p>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => { setIsMock(true); setIsFormOpen(true); }}>🔁 Mock Recall</button>
              <button className="bos-btn bos-btn-danger" onClick={() => { setIsMock(false); setIsFormOpen(true); }}>🚨 Initiate Recall</button>
            </div>
          )}
        </div>
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

      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 12, marginBottom: 6 }}>📋 FSSAI Recall Regulation Requirements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, fontSize: 11, color: '#9AAF96' }}>
          <div>⏱ Within <strong>24 hours</strong> — notify FSSAI and state authority</div>
          <div>📦 <strong>One-step forward</strong> — identify all customers who received affected batch</div>
          <div>📞 <strong>Customer notification</strong> — written communication required</div>
          <div>📊 <strong>Recovery report</strong> — quantity dispatched vs quantity recovered</div>
          <div>📄 <strong>Root cause</strong> — CAPA to be raised linked to recall</div>
          <div>🔁 <strong>Mock recall</strong> — at least once a year, target &lt;2 hours</div>
        </div>
      </div>

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="bos-card-title">{isMock ? "🔁 Mock Recall Exercise" : "🚨 Initiate Product Recall"}</div>
          {isMock && (
            <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#60A5FA' }}>
              This is a mock recall exercise. No actual product will be recalled. Target: complete trace within 2 hours to meet FSSAI requirements.
            </div>
          )}
          <div className="bos-form-grid">
            <div className="bos-form-group"><label className="bos-form-label">Affected Batch *</label><select className="bos-form-field" value={form.batchRef} onChange={e => autofillRecall(e.target.value)}><option value="">-- Select Batch --</option>{batches.map(b => <option key={b.id} value={b.batch_no}>{b.batch_no} — {b.product}</option>)}</select></div>
            <div className="bos-form-group"><label className="bos-form-label">Reason *</label><select className="bos-form-field" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>{RECALL_REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div className="bos-form-group"><label className="bos-form-label">Quantity Dispatched</label><input className="bos-form-field" type="number" value={form.qtyDispatched} onChange={e => setForm({ ...form, qtyDispatched: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Unit</label><select className="bos-form-field" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option>kg</option><option>litre</option><option>units/pcs</option><option>cartons</option></select></div>
            <div className="bos-form-group"><label className="bos-form-label">Time to Complete Trace (minutes)</label><input className="bos-form-field" type="number" value={form.timeToTrace} onChange={e => setForm({ ...form, timeToTrace: e.target.value })} /></div>
          </div>
          <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Affected Customers (comma-separated)</label><textarea className="bos-form-field" rows={2} value={form.customers} onChange={e => setForm({ ...form, customers: e.target.value })} /></div>
          <div className="bos-form-group"><label className="bos-form-label">Description / Problem Details</label><textarea className="bos-form-field" rows={2} value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} /></div>
          {!isMock && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#9AAF96' }}>
              <strong style={{ color: '#EF4444' }}>⚠ FSSAI Notification:</strong> For a live recall, notify FSSAI Food Safety Commissioner within 24 hours at food.safety@nic.in and your state food authority.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-danger" onClick={saveRecall} disabled={saving}>{saving ? 'Saving...' : `🚨 ${isMock ? "Log Mock Recall" : "Initiate Recall"}`}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {activeRecall && (
        <div className="bos-card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>🚨 Recall Detail — {activeRecall.recall_no}</div>
            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setActiveRecall(null)}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              ["Type", activeRecall.is_mock ? "MOCK RECALL" : "LIVE RECALL"], ["Batch", activeRecall.batch_ref], ["Reason", activeRecall.reason], ["Status", activeRecall.status],
              ["Qty Dispatched", `${activeRecall.qty_dispatched} ${activeRecall.unit}`], ["Qty Recovered", `${activeRecall.qty_recovered || 0} ${activeRecall.unit}`],
              ["Recovery Rate", `${activeRecall.qty_dispatched ? Math.round((activeRecall.qty_recovered || 0) / activeRecall.qty_dispatched * 100) : 0}%`],
              ["Trace Time", activeRecall.trace_time], ["Initiated By", activeRecall.initiated_by], ["Date", fmtDate(activeRecall.created_at)]
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#9AAF96', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ color: '#F0EDE6', fontWeight: 600, fontSize: 13, marginTop: 3 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {activeRecall.customers && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', marginBottom: 6 }}>Affected Customers</div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, fontSize: 12, color: '#F0EDE6' }}>{Array.isArray(activeRecall.customers) ? activeRecall.customers.join(', ') : activeRecall.customers}</div>
            </div>
          )}
          {activeRecall.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, fontSize: 12, color: '#F0EDE6', lineHeight: 1.6 }}>{activeRecall.description}</div>
            </div>
          )}
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📑 Recall Register</div>
        {sortedRecalls.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No recalls recorded. Use "Mock Recall" to practice your recall procedure.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Recall No</th><th>Type</th><th>Batch Ref</th><th>Reason</th><th>Qty Dispatched</th><th>Qty Recovered</th><th>Recovery %</th><th>Status</th><th>Time to Trace</th><th>Action</th></tr></thead>
              <tbody>
                {sortedRecalls.map(r => {
                  const pct = r.qty_dispatched ? Math.round((r.qty_recovered || 0) / r.qty_dispatched * 100) : 0;
                  const pctColor = pct >= 90 ? "#22C55E" : pct >= 70 ? "#FDE047" : "#EF4444";
                  const sColors: any = { "Open": "#EF4444", "In Progress": "#FB923C", "Closed": "#22C55E" };
                  const stColor = sColors[r.status] || "#60A5FA";
                  return (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: r.is_mock ? '#60A5FA' : '#EF4444', fontWeight: 700 }}>{r.recall_no}</span></td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: r.is_mock ? 'rgba(96,165,250,0.15)' : 'rgba(239,68,68,0.15)', color: r.is_mock ? '#60A5FA' : '#EF4444' }}>{r.is_mock ? "MOCK" : "LIVE"}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#D4A843' }}>{r.batch_ref || '—'}</td>
                      <td style={{ fontSize: 11, color: '#9AAF96', maxWidth: 140 }}>{r.reason}</td>
                      <td style={{ fontSize: 12, color: '#F0EDE6' }}>{r.qty_dispatched || 0} {r.unit}</td>
                      <td style={{ fontSize: 12, color: '#F0EDE6' }}>{r.qty_recovered || 0} {r.unit}</td>
                      <td><span style={{ fontWeight: 700, color: pctColor }}>{pct}%</span></td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${stColor}22`, color: stColor }}>{r.status}</span></td>
                      <td style={{ fontSize: 11, color: '#9AAF96' }}>{r.trace_time || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => setActiveRecall(r)}>View</button>
                          {r.status !== 'Closed' && canEdit && <button className="bos-btn bos-btn-sm bos-btn-green" onClick={() => { setUpdateForm({ id: r.id, qty: String(r.qty_recovered || 0), status: r.status || 'In Progress' }); setIsUpdateModalOpen(true); }}>Update</button>}
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

      {isUpdateModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 480 }}>
            <div className="bos-modal-header"><span className="bos-modal-title">📌 Update Recall Status</span><button className="bos-modal-close" onClick={() => setIsUpdateModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-group" style={{ marginBottom: 14 }}>
                <label className="bos-form-label">Quantity Recovered (in original unit) *</label>
                <input className="bos-form-field" type="number" value={updateForm.qty} onChange={e => setUpdateForm({ ...updateForm, qty: e.target.value })} />
              </div>
              <div className="bos-form-group">
                <label className="bos-form-label">New Status *</label>
                <select className="bos-form-field" value={updateForm.status} onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, background: 'rgba(255,193,7,0.1)', color: '#FFC107', padding: 10, borderRadius: 8 }}>
                ⚠️ Setting status to <strong>Closed</strong> will record closure timestamp and responsible person.
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={saveUpdate}>Save Update</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsUpdateModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
