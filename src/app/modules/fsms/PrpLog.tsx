import { useState, useMemo, useEffect } from 'react';
import { usePrp, useBatches, useRecipeFsmsPrp } from '../../hooks/useBos';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../lib/toast';
import { fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

const COMPLIANCE_STANDARDS = [
  {id: 'ISO_22000', label: 'ISO 22000:2018'},
  {id: 'FSSC_22000', label: 'FSSC 22000 v6'},
  {id: 'FDA_FSMA', label: 'FDA FSMA'},
  {id: 'BRC_GS', label: 'BRC Global Standard'},
];

export function PrpLog() {
  const { items: logs, loading: lLoading, reload } = usePrp();
  const { items: batches, loading: bLoading } = useBatches();
  const { items: allPrps, loading: pLoading } = useRecipeFsmsPrp();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaningTasks, setCleaningTasks] = useState<any[]>([]);
  const [cleaningChecklist, setCleaningChecklist] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    batchNo: '',
    prpId: '',
    doneBy: user?.name || '',
    result: 'Pass',
    remarks: '',
    nextDue: '',
    compliance: 'ISO_22000'
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC' || user?.role === 'OPERATOR';
  const canApprove = user?.role === 'ADMIN' || user?.role === 'QC';

  // Load dynamic cleaning tasks from DB instead of hardcoded
  useEffect(() => {
    const loadTasks = async () => {
      const { data } = await supabase
       .from('prp_cleaning_tasks')
       .select('*')
       .eq('is_active', true)
       .order('sort_order');
      setCleaningTasks(data || []);
    };
    loadTasks();
  }, []);

  const today = new Date();
  const todayStr = today.toDateString();
  const loggedToday = logs.filter(l => new Date(l.created_at).toDateString() === todayStr).length;
  const unapproved = logs.filter(l =>!l.approved_by && l.result === 'Pass');

  const selectedBatch = batches.find(b => b.batch_no === form.batchNo);
  const availablePrps = useMemo(() => {
    if (!selectedBatch?.recipe_id) return allPrps.filter(p => p.superseded_by === null);
    return allPrps.filter(p => p.recipe_id === selectedBatch.recipe_id && p.superseded_by === null);
  }, [allPrps, selectedBatch]);

  useEffect(() => {
    if (availablePrps.length > 0 &&!availablePrps.find(p => p.id === form.prpId)) {
      setForm(prev => ({...prev, prpId: availablePrps[0].id }));
    }
  }, [availablePrps, form.prpId]);

  const stats = [
    { label: "Total Logs", val: logs.length, color: "#60A5FA" },
    { label: "Logged Today", val: loggedToday, color: "#C084FC" },
    { label: "Active PRPs", val: allPrps.filter(p => p.superseded_by === null).length, color: "#22C55E" },
    { label: "Pending Approval", val: unapproved.length, color: "#FB923C" },
  ];

  const handleSave = async () => {
    if (!form.prpId) return showToast('Select a PRP to log', 'warning');

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('log_prp_execution', {
        p_prp_id: form.prpId,
        p_batch_id: selectedBatch?.id || null,
        p_result: form.result,
        p_done_by: form.doneBy,
        p_remarks: form.remarks || null,
        p_next_due: form.nextDue || null,
        p_compliance_standard: form.compliance,
        p_user_id: user?.id
      });

      if (error) throw error;
      
      const logId = data.log_id;

      // Auto-trigger CAPA if deviation
      if (form.result === 'Fail' || form.result === 'Deviation') {
         await supabase.rpc('trigger_capa', {
           p_source_type: 'PRP_DEVIATION',
           p_source_id: logId,
           p_description: `PRP ${data.prp_name} resulted in ${form.result}. Remarks: ${form.remarks || 'None'}`,
           p_user_id: user?.id
         });
         showToast('PRP Logged. DEVIATION DETECTED: CAPA auto-triggered! Please complete Root Cause Analysis.', 'warning');
      } else {
         showToast('PRP Logged successfully! Pending QC approval.', 'warning');
      }

      setIsModalOpen(false);
      setForm({ batchNo: '', prpId: availablePrps[0]?.id || '', doneBy: user?.name || '', result: 'Pass', remarks: '', nextDue: '', compliance: 'ISO_22000' });
      reload();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitCleaningChecklist = async () => {
    const checkedCount = Object.values(cleaningChecklist).filter(Boolean).length;
    const totalCount = cleaningTasks.length;
    if (checkedCount === 0) { showToast("Please check at least one task", 'warning'); return; }

    setSaving(true);
    try {
      // Use RPC for cleaning log too
      await supabase.rpc('log_cleaning_checklist', {
        p_sop_code: 'SOP-004',
        p_tasks_completed: checkedCount,
        p_tasks_total: totalCount,
        p_checklist: cleaningChecklist,
        p_user_id: user?.id
      });
      showToast(`🧹 Cleaning checklist logged (${checkedCount}/${totalCount})`, 'info');
      setCleaningChecklist({});
      reload();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (logId: string) => {
    if (!confirm('Approve this PRP execution? This is a GMP record.')) return;
    try {
      await supabase.from('prp_log')
       .update({ approved_by: user?.id, approved_at: new Date().toISOString() })
       .eq('id', logId);
      reload();
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, 'error');
    }
  };

  if (lLoading || bLoading || pLoading) return <div style={{ padding: 40 }}>Loading PRP Data...</div>;

  const selectedPrp = allPrps.find(p => p.id === form.prpId);

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · ISO 22000 · FSSC 22000 · FDA FSMA</p>
            <h1 className="bos-page-title">PRP Monitoring & Execution Log</h1>
            <p className="bos-page-sub">Versioned SOPs · 21 CFR Part 11 Audit Trail · Approval Workflow</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ Log PRP Check</button>}
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

      {unapproved.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 24 }}>
          <div style={{ color: '#FB923C', fontWeight: 700, fontSize: 13 }}>⚠️ {unapproved.length} PRP execution(s) pending QC approval</div>
          <div style={{ color: 'var(--bos-text3)', fontSize: 12 }}>FSMA requires verification of preventive controls before release.</div>
        </div>
      )}

      {/* Dynamic Cleaning Checklist from DB */}
      <div className="bos-card" style={{ marginBottom: 24, padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🧹 Dynamic Sanitation Checklist</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          {cleaningTasks.map(task => (
            <label key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: '1px solid var(--bos-border)', background: cleaningChecklist[task.id]? 'var(--bos-bg3)' : 'var(--bos-bg2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!cleaningChecklist[task.id]} onChange={e => setCleaningChecklist(prev => ({...prev, [task.id]: e.target.checked }))} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{task.task_name}</div>
                <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>📍 {task.area} | {task.frequency}</div>
              </div>
            </label>
          ))}
        </div>
        <button className="bos-btn bos-btn-primary" onClick={submitCleaningChecklist} disabled={saving || Object.values(cleaningChecklist).filter(Boolean).length === 0}>
          Submit Cleaning Log
        </button>
      </div>

      {/* PRP Log Table with Approval Column */}
      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--bos-border)' }}>📋 PRP Execution Log - Audit Trail</div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead><tr><th>Date/Time</th><th>PRP</th><th>Batch</th><th>Result</th><th>By</th><th>Standard</th><th>Approved</th><th>Action</th></tr></thead>
            <tbody>
              {logs.slice(0, 50).map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 11 }}>{fmtDate(l.created_at)}</td>
                  <td><div style={{ fontWeight: 600 }}>{l.description}</div><div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.area}</div></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.notes?.includes('Batch:')? l.notes.split('Batch:')[1]?.trim() : '—'}</td>
                  <td><span className={`bos-badge ${l.result === 'Pass'? 'bos-badge-green' : 'bos-badge-red'}`}>{l.result}</span></td>
                  <td style={{ fontSize: 11 }}>{l.done_by}</td>
                  <td style={{ fontSize: 11 }}>{l.compliance_standard || 'ISO_22000'}</td>
                  <td style={{ textAlign: 'center' }}>{l.approved_by? '✅' : '⏳'}</td>
                  <td>
                    {canApprove &&!l.approved_by && l.result === 'Pass' && (
                      <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => handleApprove(l.id)}>Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">📝 Log PRP Check - v{selectedPrp?.version || 1}</span><button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Compliance Standard *</label>
                  <select className="bos-form-field" value={form.compliance} onChange={e => setForm({...form, compliance: e.target.value})}>
                    {COMPLIANCE_STANDARDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Batch No</label>
                  <select className="bos-form-field" value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})}>
                    <option value="">-- General PRP --</option>
                    {batches.filter(b => b.status === 'RUNNING').map(b => <option key={b.id} value={b.batch_no}>{b.batch_no} - {b.product}</option>)}
                  </select>
                </div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">PRP Activity *</label>
                  <select className="bos-form-field" value={form.prpId} onChange={e => setForm({...form, prpId: e.target.value})}>
                    {availablePrps.map(p => <option key={p.id} value={p.id}>{p.prp_type} — {p.prp_name} v{p.version}</option>)}
                  </select>
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Result *</label>
                  <select className="bos-form-field" value={form.result} onChange={e => setForm({...form, result: e.target.value})}>
                    <option>Pass</option><option>Fail</option><option>Deviation</option>
                  </select>
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Checked By</label>
                  <input className="bos-form-field" value={form.doneBy} onChange={e => setForm({...form, doneBy: e.target.value})} />
                </div>
              </div>
              {selectedPrp && (
                <div style={{ background: 'var(--bos-bg3)', borderRadius: 8, padding: 12, marginTop: 14, fontSize: 12 }}>
                  <div><strong>SOP:</strong> {selectedPrp.procedure}</div>
                  <div><strong>Target:</strong> {selectedPrp.target_area} | <strong>Frequency:</strong> {selectedPrp.frequency}</div>
                </div>
              )}
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving? 'Saving...' : '💾 Save & Create Audit Entry'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
