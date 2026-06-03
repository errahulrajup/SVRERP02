import React, { useState, useMemo, useEffect } from 'react';
import { useHaccp, useBatches, useRecipeFsmsCcp } from '../../hooks/useBos';
import { haccpApi } from '../../lib/bosApi';
import { fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

export function HaccpLog() {
  const { items: logs, loading: lLoading, reload } = useHaccp();
  const { items: batches, loading: bLoading } = useBatches();
  const { items: allCcps, loading: cLoading } = useRecipeFsmsCcp();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caModalOpen, setCaModalOpen] = useState<string | null>(null);
  const [caText, setCaText] = useState('');
  const [timeFilter, setTimeFilter] = useState('30');
  
  const [form, setForm] = useState({
    ccpId: '',
    batchNo: '',
    reading: '',
    checkedBy: user?.name || '',
    remarks: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const todayStr = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === todayStr);
  const deviations = logs.filter(l => l.result === 'DEVIATION');
  const openDeviations = deviations.filter(l => !l.corrective_action || l.corrective_action.trim() === '');

  // Derived available CCPs based on selected batch
  const selectedBatch = batches.find(b => b.batch_no === form.batchNo);
  const availableCcps = useMemo(() => {
    if (!selectedBatch?.recipe_id) return allCcps; // If no batch, show all (or could show none)
    return allCcps.filter(c => c.recipe_id === selectedBatch.recipe_id);
  }, [allCcps, selectedBatch]);

  // Set default CCP if list changes and current is invalid
  useEffect(() => {
    if (availableCcps.length > 0 && !availableCcps.find(c => c.id === form.ccpId)) {
      setForm(prev => ({ ...prev, ccpId: availableCcps[0].id }));
    }
  }, [availableCcps, form.ccpId]);

  const filteredDeviations = useMemo(() => {
    if (timeFilter === 'all') return deviations;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(timeFilter));
    return deviations.filter(l => new Date(l.created_at) >= cutoff);
  }, [deviations, timeFilter]);

  const stats = [
    { label: 'Readings Today', val: todayLogs.length, color: '#60A5FA' },
    { label: 'Deviations (Filtered)', val: filteredDeviations.length, color: '#EF4444' },
    { label: 'Open Deviations', val: openDeviations.length, color: '#FB923C' },
    { label: 'Total CCPs Defined', val: allCcps.length, color: '#FFC107' },
  ];

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  }, [logs]);

  const handleSave = async () => {
    if (!form.reading) return alert('Reading value required');
    if (!form.ccpId) return alert('CCP is required');
    
    const ccp = allCcps.find(c => c.id === form.ccpId);
    if (!ccp) return;

    const val = parseFloat(form.reading);
    let result: 'OK' | 'DEVIATION' = 'OK';
    
    // Naive evaluation against critical limits if it starts with >=, <=, >, <
    const cl = ccp.critical_limit || '';
    const match = cl.match(/(>=|<=|>|<|=)\s*([\d.]+)/);
    if (match && !isNaN(val)) {
      const op = match[1];
      const target = parseFloat(match[2]);
      if (op === '<=' && val > target) result = 'DEVIATION';
      if (op === '<' && val >= target) result = 'DEVIATION';
      if (op === '>=' && val < target) result = 'DEVIATION';
      if (op === '>' && val <= target) result = 'DEVIATION';
    } else {
      // Non-numeric limits logic
      const raw = form.reading.toLowerCase();
      if (raw.includes('fail') || raw.includes('reject') || raw.includes('deviation') || raw.includes('no') || raw.includes('invalid')) {
        result = 'DEVIATION';
      }
    }

    setSaving(true);
    try {
      await haccpApi.create({
        ccp_id: form.ccpId,
        ccp_no: ccp.ccp_no,
        ccp_name: ccp.ccp_name,
        batch_no: form.batchNo.trim() || null,
        process_step: (ccp as any).process_step || ccp.ccp_name, // fallback
        hazard: ccp.hazard,
        control_measure: ccp.control_measure,
        critical_limit: ccp.critical_limit,
        reading: form.reading,
        unit: ccp.unit,
        result,
        corrective_action: null,
        checked_by: form.checkedBy.trim() || null,
        remarks: form.remarks.trim() || null,
        status: result
      });
      alert(result === 'OK' ? "✅ CCP reading logged — Within limits" : "🚨 DEVIATION recorded — Add corrective action!");
      setIsModalOpen(false);
      setForm({ ccpId: availableCcps[0]?.id || '', batchNo: '', reading: '', checkedBy: user?.name || '', remarks: '' });
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const submitCA = async () => {
    if (!caModalOpen || !caText.trim()) return;
    try {
      await haccpApi.update(caModalOpen, { corrective_action: caText });
      alert("Corrective action saved");
      setCaModalOpen(null);
      setCaText('');
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const selectedCcp = allCcps.find(c => c.id === form.ccpId);

  const fmtDateTime = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  if (lLoading || bLoading || cLoading) return <div style={{ padding: 40, color: 'var(--bos-text3)' }}>Loading HACCP Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Food Safety · ISO 22000 · HACCP</p>
            <h1 className="bos-page-title">HACCP — Critical Control Point Monitoring</h1>
            <p className="bos-page-sub">Dynamic product-specific CCP logs linked to recipes</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select className="bos-form-field" style={{ padding: '6px 12px', fontSize: 13 }} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ Log CCP Reading</button>}
          </div>
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

      {openDeviations.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ color: '#EF4444', fontWeight: 700, fontSize: 13 }}>{openDeviations.length} Open CCP Deviation(s) — Corrective Action Required</div>
            <div style={{ color: 'var(--bos-text3)', fontSize: 12, marginTop: 2 }}>ISO 22000 requires documented corrective action for every deviation. Scroll down to update.</div>
          </div>
        </div>
      )}

      {/* 🔬 CCP Live Monitor */}
      <div className="bos-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--bos-border)', paddingBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--bos-text1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔬</span> CCP Live Monitor
          </h2>
          <span style={{ fontSize: 11, color: 'var(--bos-text3)', fontWeight: 'normal' }}>Real-time safety thresholds and latest readings</span>
        </div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead>
              <tr>
                <th>CCP ID / Name</th>
                <th>Recipe / Product</th>
                <th>Target Critical Limit</th>
                <th>Latest Logged Value</th>
                <th>Last Checked</th>
                <th>Live Status</th>
              </tr>
            </thead>
            <tbody>
              {allCcps.map(ccp => {
                // Find latest log for this ccp
                const ccpLogs = logs.filter(l => l.ccp_id === ccp.id);
                const lastLog = ccpLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                
                let statusColor = 'var(--bos-text3)'; // grey - unchecked
                let statusBg = 'rgba(138,134,120,0.1)';
                let statusLabel = 'Unchecked';
                
                if (lastLog) {
                  if (lastLog.result === 'DEVIATION') {
                    if (lastLog.corrective_action) {
                      statusColor = '#d97706'; // amber - deviation corrected
                      statusBg = 'rgba(217,119,6,0.1)';
                      statusLabel = 'Deviation Corrected';
                    } else {
                      statusColor = '#ef4444'; // red - active deviation
                      statusBg = 'rgba(239,68,68,0.1)';
                      statusLabel = 'Critical Deviation!';
                    }
                  } else {
                    statusColor = '#16a34a'; // green - OK
                    statusBg = 'rgba(22,163,74,0.1)';
                    statusLabel = 'Within Limits';
                  }
                }
                
                return (
                  <tr key={ccp.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--bos-gold)', marginRight: 6 }}>{ccp.ccp_no}</span>
                      <strong style={{ color: 'var(--bos-text1)' }}>{ccp.ccp_name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--bos-text3)' }}>Hazard: {ccp.hazard}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--bos-text2)' }}>{ccp.recipes?.name || 'Generic'}</td>
                    <td><span className="bos-badge bos-badge-blue" style={{ fontSize: 11 }}>{ccp.critical_limit} {ccp.unit || ''}</span></td>
                    <td style={{ fontWeight: 700, color: lastLog ? (lastLog.result === 'DEVIATION' ? '#ef4444' : '#16a34a') : 'var(--bos-text3)' }}>
                      {lastLog ? `${lastLog.reading} ${lastLog.unit || ''}` : 'No readings logged'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>
                      {lastLog ? fmtDateTime(lastLog.created_at) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ 
                          width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block',
                          boxShadow: lastLog?.result === 'DEVIATION' && !lastLog.corrective_action ? '0 0 6px #ef4444' : 'none'
                        }} />
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: statusBg, color: statusColor }}>{statusLabel}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {allCcps.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--bos-text3)' }}>No Critical Control Points defined. Configure them in the Recipe Engine.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Active Recipes' CCPs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {allCcps.slice(0, 10).map(ccp => (
            <div key={ccp.id} style={{ background: 'var(--bos-bg2)', border: '1px solid var(--bos-border)', borderRadius: 10, padding: 16, boxShadow: 'var(--bos-shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(26,107,60,0.08)', color: 'var(--bos-gold)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{ccp.ccp_no}</span>
                {canEdit && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => { setForm({ ...form, ccpId: ccp.id }); setIsModalOpen(true); }}>Log Reading</button>}
              </div>
              <div style={{ color: 'var(--bos-text1)', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ccp.ccp_name}</div>
              <div style={{ color: 'var(--bos-text3)', fontSize: 11, marginBottom: 6 }}>⚠️ {ccp.hazard}</div>
              <div style={{ color: 'var(--bos-gold2)', fontSize: 11, marginBottom: 6 }}>📦 Recipe: {ccp.recipes?.name || 'Unknown'}</div>
              <div style={{ background: 'var(--bos-bg3)', borderRadius: 6, padding: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--bos-text3)' }}>Critical Limit: </span><span style={{ color: '#16a34a', fontWeight: 600 }}>{ccp.critical_limit}</span>
              </div>
            </div>
          ))}
          {allCcps.length > 10 && <div style={{ color: 'var(--bos-text3)', fontSize: 12, padding: 10 }}>...and {allCcps.length - 10} more. Select a batch to filter.</div>}
          {allCcps.length === 0 && <div style={{ color: 'var(--bos-text3)', fontSize: 12, padding: 10 }}>No CCPs defined across any recipes. Add them in the Recipe Engine.</div>}
        </div>
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--bos-border)' }}>📋 CCP Monitoring Log (Last 50 readings)</div>
        {sortedLogs.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No CCP readings logged yet.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date/Time</th><th>CCP</th><th>Batch</th><th>Reading</th><th>Limit</th><th>Result</th><th>Corrective Action</th><th>By</th></tr></thead>
              <tbody>
                {sortedLogs.map(l => {
                  const resColor = l.result === 'OK' ? '#16a34a' : '#ef4444';
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: 11, color: 'var(--bos-text3)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-gold)' }}>{l.ccp_no}</span><br /><span style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.ccp_name}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bos-gold)' }}>{l.batch_no || '—'}</td>
                      <td style={{ fontWeight: 700, color: resColor }}>{l.reading} {l.unit}</td>
                      <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.critical_limit}</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: l.result === 'OK' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: resColor }}>{l.result}</span></td>
                      <td style={{ fontSize: 11, color: l.result === 'DEVIATION' && !l.corrective_action ? '#ef4444' : 'var(--bos-text3)', maxWidth: 180 }}>
                        {l.result === 'DEVIATION' ? (l.corrective_action || (canEdit ? <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => setCaModalOpen(l.id)}>Add CA ⚠</button> : 'Pending CA')) : '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{l.checked_by || '—'}</td>
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
            <div className="bos-modal-header"><span className="bos-modal-title">🌡️ Log CCP Reading</span><button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Batch No (Select first to filter CCPs)</label><select className="bos-form-field" value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })}><option value="">-- All Batches (or None) --</option>{batches.filter(b => b.status === 'RUNNING' || b.status === 'COMPLETED').slice(0, 20).map(b => <option key={b.id} value={b.batch_no}>{b.batch_no} - {b.product}</option>)}</select></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label">CCP Point *</label>
                  <select className="bos-form-field" value={form.ccpId} onChange={e => setForm({ ...form, ccpId: e.target.value })}>
                    {availableCcps.map(c => <option key={c.id} value={c.id}>{c.ccp_no} — {c.ccp_name}</option>)}
                    {availableCcps.length === 0 && <option value="">-- No CCPs available --</option>}
                  </select>
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Reading / Value *</label><input className="bos-form-field" type="text" placeholder="e.g. 14.5 or 'Pass'" value={form.reading} onChange={e => setForm({ ...form, reading: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Checked By</label><input className="bos-form-field" value={form.checkedBy} onChange={e => setForm({ ...form, checkedBy: e.target.value })} /></div>
              </div>
              {selectedCcp && (
                <div style={{ background: 'var(--bos-bg3)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div><div style={{ color: 'var(--bos-text3)' }}>Parameter</div><div style={{ color: 'var(--bos-text1)', fontWeight: 600 }}>{selectedCcp.parameter}</div></div>
                    <div><div style={{ color: 'var(--bos-text3)' }}>Critical Limit</div><div style={{ color: '#16a34a', fontWeight: 700 }}>{selectedCcp.critical_limit}</div></div>
                    <div><div style={{ color: 'var(--bos-text3)' }}>Hazard Controlled</div><div style={{ color: '#ea580c' }}>{selectedCcp.hazard}</div></div>
                  </div>
                </div>
              )}
              <div className="bos-form-group"><label className="bos-form-label">Remarks</label><input className="bos-form-field" placeholder="Any notes or observations" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Reading'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {caModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">⚠ Add Corrective Action</span><button className="bos-modal-close" onClick={() => setCaModalOpen(null)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-group">
                <label className="bos-form-label">Corrective Action Details</label>
                <textarea className="bos-form-field" rows={4} value={caText} onChange={e => setCaText(e.target.value)} placeholder="Describe the corrective action taken to address the deviation..." />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={submitCA}>Save CA</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setCaModalOpen(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
