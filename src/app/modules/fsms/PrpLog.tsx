import React, { useState, useMemo, useEffect } from 'react';
import { usePrp, useBatches, useRecipeFsmsPrp } from '../../hooks/useBos';
import { prpApi } from '../../lib/bosApi';
import { fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

const CLEANING_CHECKLIST_ITEMS = [
  { id: 1, name: "Fat melting tank CIP completed & verified", area: "Fat Melting" },
  { id: 2, name: "Emulsifier and main mixing vessel sanitized (SOP-004)", area: "Mixing Room" },
  { id: 3, name: "High-temperature pasteurizer line flushed & sterilized", area: "Pasteurization" },
  { id: 4, name: "Homogenizer seals checked and hopper cleaned", area: "Homogenizer" },
  { id: 5, name: "Filling line nozzles sanitized & test-run completed", area: "Filling Line" },
  { id: 6, name: "Finished goods storage area swept & sanitized", area: "Cold Room" },
  { id: 7, name: "Manufacturing floor washed & drainage sanitized", area: "Production Floor" },
  { id: 8, name: "Sanitation tools sterilized and stored in racks", area: "SOP Hygiene" }
];

export function PrpLog() {
  const { items: logs, loading: lLoading, reload } = usePrp();
  const { items: batches, loading: bLoading } = useBatches();
  const { items: allPrps, loading: pLoading } = useRecipeFsmsPrp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Product PRP'); // can keep other tabs if global PRPs exist, but we focus on product PRPs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaningChecklist, setCleaningChecklist] = useState<Record<number, boolean>>({});

  const submitCleaningChecklist = async () => {
    const checkedCount = Object.values(cleaningChecklist).filter(Boolean).length;
    const totalCount = CLEANING_CHECKLIST_ITEMS.length;
    if (checkedCount === 0) return alert("Please check at least one cleaning task before submitting");
    
    setSaving(true);
    try {
      await prpApi.create({
        prp_no: `SOP-004-DAILY-${Date.now().toString(36).toUpperCase()}`,
        prp_type: 'Sanitation',
        category: 'Cleaning Log',
        description: `Daily Sanitation & CIP Checklist (SOP-004): ${checkedCount}/${totalCount} tasks completed`,
        area: 'Production Area',
        method: 'CIP & Chemical Spray Sanitation',
        result: checkedCount === totalCount ? 'Pass (Complete)' : 'Incomplete (In Progress)',
        next_due: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        done_by: user?.name || 'Operator',
        notes: `Completed cleaning tasks: ` + CLEANING_CHECKLIST_ITEMS.filter(item => cleaningChecklist[item.id]).map(item => item.name).join(', '),
        status: checkedCount === totalCount ? 'ACTIVE' : 'REVIEW_DUE',
        standard: null,
        responsible: user?.name || null,
        equipment: null,
        equipment_id: null,
        cleaning_agent: 'Chlorinated water & sanitizing spray',
        pest_type: null,
        chemical: null,
        pco_name: null,
        before_reading: null,
        after_reading: null,
        frequency: 'Daily',
        last_reviewed: new Date().toISOString().split('T')[0],
        next_review: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
      alert(`🧹 Cleaning checklist logged successfully (${checkedCount}/${totalCount} tasks)`);
      setCleaningChecklist({});
      reload();
    } catch (e: any) {
      alert(`Error submitting checklist: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [form, setForm] = useState({
    batchNo: '',
    prpId: '',
    doneBy: user?.name || '',
    result: 'Pass',
    remarks: '',
    nextDue: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC' || user?.role === 'OPERATOR';

  const today = new Date();
  const todayStr = today.toDateString();
  const loggedToday = logs.filter(l => new Date(l.created_at).toDateString() === todayStr).length;

  const selectedBatch = batches.find(b => b.batch_no === form.batchNo);
  const availablePrps = useMemo(() => {
    if (!selectedBatch?.recipe_id) return allPrps;
    return allPrps.filter(p => p.recipe_id === selectedBatch.recipe_id);
  }, [allPrps, selectedBatch]);

  useEffect(() => {
    if (availablePrps.length > 0 && !availablePrps.find(p => p.id === form.prpId)) {
      setForm(prev => ({ ...prev, prpId: availablePrps[0].id }));
    }
  }, [availablePrps, form.prpId]);

  const stats = [
    { label: "Total Logs", val: logs.length, color: "#60A5FA" },
    { label: "Logged Today", val: loggedToday, color: "#C084FC" },
    { label: "Total PRPs Defined", val: allPrps.length, color: "#22C55E" },
  ];

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  }, [logs]);

  const handleSave = async () => {
    if (!form.prpId) return alert('Select a PRP to log');
    const prp = allPrps.find(p => p.id === form.prpId);
    if (!prp) return;

    setSaving(true);
    try {
      await prpApi.create({
        prp_no: prp.id,
        prp_type: prp.prp_type,
        category: 'Product-Specific',
        description: prp.prp_name,
        area: prp.target_area,
        method: prp.procedure,
        result: form.result,
        next_due: form.nextDue || null,
        done_by: form.doneBy,
        notes: form.remarks || `Batch: ${form.batchNo || 'N/A'}`,
        status: form.result === 'Pass' ? 'ACTIVE' : 'REVIEW_DUE',
        standard: null,
        responsible: form.doneBy || null,
        equipment: null,
        equipment_id: null,
        cleaning_agent: null,
        pest_type: null,
        chemical: null,
        pco_name: null,
        before_reading: null,
        after_reading: null,
        frequency: prp.frequency || null,
        last_reviewed: new Date().toISOString().split('T')[0],
        next_review: form.nextDue || null,
      });
      alert('PRP Logged successfully!');
      setIsModalOpen(false);
      setForm({ batchNo: '', prpId: availablePrps[0]?.id || '', doneBy: user?.name || '', result: 'Pass', remarks: '', nextDue: '' });
      reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const fmtDateTime = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const selectedPrp = allPrps.find(p => p.id === form.prpId);

  if (lLoading || bLoading || pLoading) return <div style={{ padding: 40, color: 'var(--bos-text3)' }}>Loading PRP Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · Prerequisite Programs</p>
            <h1 className="bos-page-title">PRP Monitoring & Execution Log</h1>
            <p className="bos-page-sub">Dynamic product-specific cleaning, calibration, and hygiene checks</p>
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

      {/* 🧹 Daily Sanitation & Cleaning Checklist */}
      <div className="bos-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--bos-border)', paddingBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--bos-text1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧹</span> Daily Sanitation Checklist (SOP-004)
          </h2>
          <span style={{ fontSize: 11, color: 'var(--bos-text3)' }}>Track and log shift cleaning schedules</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          {CLEANING_CHECKLIST_ITEMS.map(item => (
            <label key={item.id} style={{ 
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: '1px solid var(--bos-border)', 
              background: cleaningChecklist[item.id] ? 'var(--bos-bg3)' : 'var(--bos-bg2)', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: 'var(--bos-shadow-sm)'
            }}>
              <input 
                type="checkbox" 
                style={{ marginTop: 3, accentColor: 'var(--bos-gold)' }}
                checked={!!cleaningChecklist[item.id]} 
                onChange={e => setCleaningChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))} 
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: cleaningChecklist[item.id] ? 'var(--bos-gold)' : 'var(--bos-text1)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 2 }}>📍 {item.area}</div>
              </div>
            </label>
          ))}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'var(--bos-bg4)', padding: 16, borderRadius: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
              <span style={{ color: 'var(--bos-text2)' }}>Progress: {Object.values(cleaningChecklist).filter(Boolean).length} of {CLEANING_CHECKLIST_ITEMS.length} completed</span>
              <span style={{ color: 'var(--bos-gold)' }}>
                {Math.round((Object.values(cleaningChecklist).filter(Boolean).length / CLEANING_CHECKLIST_ITEMS.length) * 100)}%
              </span>
            </div>
            <div style={{ height: 8, background: '#e8f5ee', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', background: 'var(--bos-sage)', 
                width: `${(Object.values(cleaningChecklist).filter(Boolean).length / CLEANING_CHECKLIST_ITEMS.length) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`bos-badge ${
              Object.values(cleaningChecklist).filter(Boolean).length === CLEANING_CHECKLIST_ITEMS.length ? 'badge-green' :
              Object.values(cleaningChecklist).filter(Boolean).length > 0 ? 'badge-gold' : 'badge-muted'
            }`}>
              {Object.values(cleaningChecklist).filter(Boolean).length === CLEANING_CHECKLIST_ITEMS.length ? 'COMPLETE' :
               Object.values(cleaningChecklist).filter(Boolean).length > 0 ? 'IN PROGRESS' : 'NOT STARTED'}
            </span>
            <button 
              className="bos-btn bos-btn-primary" 
              onClick={submitCleaningChecklist}
              disabled={Object.values(cleaningChecklist).filter(Boolean).length === 0 || saving}
            >
              Submit Cleaning Log
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Active Recipes' PRPs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {allPrps.slice(0, 10).map(prp => (
            <div key={prp.id} style={{ background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', borderRadius: 10, padding: 16, boxShadow: 'var(--bos-shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(59,130,246,0.08)', color: 'var(--bos-blue)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{prp.prp_type}</span>
                {canEdit && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => { setForm({ ...form, prpId: prp.id }); setIsModalOpen(true); }}>Log Check</button>}
              </div>
              <div style={{ color: 'var(--bos-text1)', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{prp.prp_name}</div>
              <div style={{ color: 'var(--bos-text3)', fontSize: 11, marginBottom: 6 }}>📍 Area: {prp.target_area} | ⏱️ {prp.frequency}</div>
              <div style={{ color: 'var(--bos-gold2)', fontSize: 11, marginBottom: 6 }}>📦 Recipe: {prp.recipes?.name || 'Unknown'}</div>
              <div style={{ background: 'var(--bos-bg3)', borderRadius: 6, padding: 8, fontSize: 11, color: 'var(--bos-text2)' }}>
                <span style={{ color: 'var(--bos-text3)' }}>SOP: </span>{prp.procedure}
              </div>
            </div>
          ))}
          {allPrps.length > 10 && <div style={{ color: 'var(--bos-text3)', fontSize: 12, padding: 10 }}>...and {allPrps.length - 10} more. Select a batch to filter.</div>}
          {allPrps.length === 0 && <div style={{ color: 'var(--bos-text3)', fontSize: 12, padding: 10 }}>No PRPs defined across any recipes. Add them in the Recipe Engine.</div>}
        </div>
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--bos-border)' }}>📋 PRP Execution Log</div>
        {sortedLogs.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No PRP logs yet.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date/Time</th><th>Type</th><th>PRP Activity</th><th>Result</th><th>By</th><th>Notes</th></tr></thead>
              <tbody>
                {sortedLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 11, color: 'var(--bos-text3)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-blue)' }}>{l.prp_type?.toUpperCase()}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--bos-text1)' }}>{l.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.area || '—'}</div>
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, 
                        background: l.result?.includes('Pass') || l.result?.includes('Satisfactory') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                        color: l.result?.includes('Pass') || l.result?.includes('Satisfactory') ? '#16a34a' : '#ef4444' }}>
                        {l.result}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.done_by}</td>
                    <td style={{ fontSize: 11, color: 'var(--bos-text3)', maxWidth: 180 }}>{l.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">📝 Log PRP Check</span><button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Batch No (Select first to filter PRPs)</label><select className="bos-form-field" value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })}><option value="">-- All Batches (or None) --</option>{batches.filter(b => b.status === 'RUNNING' || b.status === 'COMPLETED').slice(0, 20).map(b => <option key={b.id} value={b.batch_no}>{b.batch_no} - {b.product}</option>)}</select></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label">PRP Activity *</label>
                  <select className="bos-form-field" value={form.prpId} onChange={e => setForm({ ...form, prpId: e.target.value })}>
                    {availablePrps.map(p => <option key={p.id} value={p.id}>{p.prp_type} — {p.prp_name}</option>)}
                    {availablePrps.length === 0 && <option value="">-- No PRPs available --</option>}
                  </select>
                </div>

                <div className="bos-form-group"><label className="bos-form-label">Result *</label><select className="bos-form-field" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}><option>Pass</option><option>Fail</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Checked By</label><input className="bos-form-field" value={form.doneBy} onChange={e => setForm({ ...form, doneBy: e.target.value })} /></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Remarks / Batch context</label><input className="bos-form-field" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
              </div>
              
              {selectedPrp && (
                <div style={{ background: 'var(--bos-bg3)', borderRadius: 8, padding: 12, marginBottom: 14, marginTop: 14, fontSize: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div><div style={{ color: 'var(--bos-text3)' }}>Target Area</div><div style={{ color: 'var(--bos-text1)', fontWeight: 600 }}>{selectedPrp.target_area}</div></div>
                    <div><div style={{ color: 'var(--bos-text3)' }}>Frequency</div><div style={{ color: 'var(--bos-text1)', fontWeight: 600 }}>{selectedPrp.frequency}</div></div>
                  </div>
                  <div><div style={{ color: 'var(--bos-text3)' }}>SOP Procedure</div><div style={{ color: 'var(--bos-blue)' }}>{selectedPrp.procedure}</div></div>
                </div>
              )}
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save PRP Log'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
