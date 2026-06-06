import React, { useState, useMemo } from 'react';
import { useRecalls, useBatches, useDispatches } from '../../hooks/useBos';
import { supabase } from '../../lib/supabase';
import { Recall, fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

const RECALL_REASONS = [
  "Microbial Contamination", "Foreign Body / Physical Hazard", "Chemical Contamination",
  "Allergen Undeclared", "Labeling Error", "Packaging Defect", "Customer Complaint",
  "Regulatory Direction", "Mock Recall Exercise", "Other"
];

const COMPLIANCE_STANDARDS = [
  {id: 'FSSAI_2020', label: 'FSSAI Food Recall Regulations 2017'},
  {id: 'FDA_FSMA', label: 'FDA FSMA - 21 CFR 117'},
  {id: 'EU_FIC_1169', label: 'EU Regulation 1169/2011'},
  {id: 'ISO_22000', label: 'ISO 22000:2018 Cl. 8.9.5'},
];

export function RecallLog() {
  const { items: recalls, loading, reload } = useRecalls();
  const { items: batches } = useBatches();
  const { user } = useAuth();

  const [activeRecall, setActiveRecall] = useState<Recall | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    batchRef: '', reason: RECALL_REASONS[0], desc: '', compliance: 'FSSAI_2020'
  });

  const [traceResult, setTraceResult] = useState<any>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const active = recalls.filter(r => r.status!== "Closed" &&!r.is_mock);
  const mock = recalls.filter(r => r.is_mock);
  const closed = recalls.filter(r => r.status === "Closed");

  const stats = [
    { label: "Total Recalls", val: recalls.filter(r =>!r.is_mock).length, color: "#EF4444" },
    { label: "Active Recalls", val: active.length, color: "#F43F5E" },
    { label: "Mock Exercises", val: mock.length, color: "#60A5FA" },
    { label: "Closed", val: closed.length, color: "#22C55E" },
  ];

  // Real-time trace preview when batch selected
  const previewTrace = async (batchNo: string) => {
    if (!batchNo) { setTraceResult(null); return; }
    const batch = batches.find(b => b.batch_no === batchNo);
    if (!batch) return;

    const { data: dispatches } = await supabase
    .from('dispatches')
    .select('customer, quantity')
    .eq('batch_id', batch.id)
    .eq('status', 'DISPATCHED');

    const total = dispatches?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
    const customers = [...new Set(dispatches?.map(d => d.customer).filter(Boolean))];

    setTraceResult({ total, customers, batch });
  };

  const saveRecall = async () => {
    if (!form.batchRef) return alert('Select batch to recall');

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('initiate_recall', {
        p_batch_no: form.batchRef,
        p_reason: form.reason,
        p_is_mock: isMock,
        p_description: form.desc,
        p_initiated_by: user?.name || 'System',
        p_compliance_standard: form.compliance,
        p_user_id: user?.id
      });

      if (error) throw error;

      alert(`🚨 Recall ${data.recall_no} initiated\n\nAuto-traced: ${data.qty_dispatched} ${traceResult?.batch?.unit} to ${data.customers_count} customers\nFrozen lots: ${data.frozen_lots}\n\n⚠️ Notify FSSAI within 24 hours!`);
      setIsFormOpen(false);
      setForm({ batchRef: '', reason: RECALL_REASONS[0], desc: '', compliance: 'FSSAI_2020' });
      setTraceResult(null);
      reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const notifyFSSAI = async (recallId: string) => {
    if (!confirm('Mark as notified to FSSAI? This creates audit trail.')) return;
    try {
      await supabase.from('recalls')
      .update({
         fssai_notified_at: new Date().toISOString(),
         fssai_notification_ref: `EMAIL-${Date.now()}`
       })
      .eq('id', recallId);

      await supabase.from('recall_history').insert({
        recall_id: recallId,
        changed_by: user?.id,
        change_type: 'NOTIFY_FSSAI',
        change_reason: 'FSSAI notified via email within 24hr requirement'
      });

      alert('FSSAI notification logged');
      reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading Recall Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · FSSAI · FDA FSMA · ISO 22000 · EU FIC</p>
            <h1 className="bos-page-title">Recall & Mock Recall Management</h1>
            <p className="bos-page-sub">Automated one-step-forward trace · Stock freeze · 21 CFR Part 11 audit trail</p>
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
        <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 12, marginBottom: 6 }}>📋 International Recall Requirements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, fontSize: 11, color: '#9AAF96' }}>
          <div>⏱ <strong>FSSAI:</strong> Notify within 24 hours of decision</div>
          <div>📦 <strong>FSMA:</strong> One-step-forward trace + stock freeze</div>
          <div>📞 <strong>ISO 22000:</strong> Documented recall procedure + mock drill annually</div>
          <div>📊 <strong>21 CFR 11:</strong> Electronic audit trail for all changes</div>
          <div>📄 <strong>EU FIC:</strong> Public notification if serious risk</div>
          <div>🔁 <strong>Mock Recall:</strong> Target &lt;2 hours trace time</div>
        </div>
      </div>

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="bos-card-title">{isMock? "🔁 Mock Recall Exercise" : "🚨 Initiate Product Recall"}</div>
          {isMock && (
            <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#60A5FA' }}>
              Mock exercise: No actual product recalled. Target: complete trace within 2 hours per FSSAI requirement.
            </div>
          )}
          <div className="bos-form-grid">
            <div className="bos-form-group"><label className="bos-form-label">Compliance Standard *</label>
              <select className="bos-form-field" value={form.compliance} onChange={e => setForm({...form, compliance: e.target.value})}>
                {COMPLIANCE_STANDARDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="bos-form-group"><label className="bos-form-label">Affected Batch *</label>
              <select className="bos-form-field" value={form.batchRef} onChange={e => { setForm({...form, batchRef: e.target.value}); previewTrace(e.target.value); }}>
                <option value="">-- Select Batch --</option>
                {batches.map(b => <option key={b.id} value={b.batch_no}>{b.batch_no} — {b.product}</option>)}
              </select>
            </div>
            <div className="bos-form-group"><label className="bos-form-label">Reason *</label>
              <select className="bos-form-field" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                {RECALL_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {traceResult && (
            <div style={{ background: 'var(--bos-bg3)', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--bos-gold)' }}>🔍 Auto-Trace Result:</div>
              <div>Dispatched: <strong>{traceResult.total} {traceResult.batch?.unit}</strong></div>
              <div>Customers: <strong>{traceResult.customers.length}</strong> — {traceResult.customers.join(', ') || 'None'}</div>
              <div style={{ marginTop: 6, color: '#FB923C' }}>⚠️ All available FG lots from this batch will be frozen automatically.</div>
            </div>
          )}

          <div className="bos-form-group"><label className="bos-form-label">Description / Problem Details</label>
            <textarea className="bos-form-field" rows={2} value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} />
          </div>

          {!isMock && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
              <strong style={{ color: '#EF4444' }}>⚠ Regulator Notification:</strong> For live recall, you must notify FSSAI Food Safety Commissioner within 24 hours. Use "Notify FSSAI" button after creation.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bos-btn bos-btn-danger" onClick={saveRecall} disabled={saving ||!form.batchRef}>{saving? 'Processing...' : `🚨 ${isMock? "Log Mock Recall" : "Initiate Recall + Freeze Stock"}`}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📑 Recall Register - Audit Trail</div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead><tr><th>Recall No</th><th>Type</th><th>Batch</th><th>Reason</th><th>Dispatched</th><th>Recovered</th><th>Status</th><th>FSSAI Notified</th><th>Action</th></tr></thead>
            <tbody>
              {recalls.map(r => {
                const pct = r.qty_dispatched? Math.round((r.qty_recovered || 0) / r.qty_dispatched * 100) : 0;
                return (
                  <tr key={r.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: r.is_mock? '#60A5FA' : '#EF4444', fontWeight: 700 }}>{r.recall_no}</span></td>
                    <td><span className={`bos-badge ${r.is_mock? 'bos-badge-blue' : 'bos-badge-red'}`}>{r.is_mock? "MOCK" : "LIVE"}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.batch_ref || '—'}</td>
                    <td style={{ fontSize: 11, maxWidth: 140 }}>{r.reason}</td>
                    <td style={{ fontSize: 12 }}>{r.qty_dispatched || 0} {r.unit}</td>
                    <td style={{ fontSize: 12 }}>{r.qty_recovered || 0} {r.unit} <span style={{ color: pct >= 90? '#22C55E' : '#EF4444' }}>({pct}%)</span></td>
                    <td><span className={`bos-badge ${r.status === 'Closed'? 'bos-badge-green' : 'bos-badge-red'}`}>{r.status}</span></td>
                    <td style={{ fontSize: 11 }}>{r.fssai_notified_at? '✅ ' + fmtDate(r.fssai_notified_at) : '❌ Pending'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="bos-btn bos-btn-sm" onClick={() => setActiveRecall(r)}>View</button>
                        {!r.is_mock &&!r.fssai_notified_at && canEdit && (
                          <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => notifyFSSAI(r.id)}>Notify FSSAI</button>
                        )}
                      </div>
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
}
