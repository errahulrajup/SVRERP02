import { useState, useMemo } from 'react';
import { useCapa } from '../../hooks/useBos';
import { capaApi } from '../../lib/bosApi';
import { Capa as CapaType, CapaStatus, fmtDate, CAPA_STATUS_LABEL } from '../../types/bos';
import { useAuth } from '../../hooks';
import { showToast } from '../../lib/toast';

const CAPA_SOURCES = ["QC Rejection", "Customer Complaint", "FSSAI Inspection", "Internal Audit", "Third Party Audit", "CCP Deviation", "Near Miss", "Supplier Issue", "Process Observation", "Other"];
const ROOT_CAUSE_METHODS = ["5 Whys", "Fishbone (Ishikawa)", "Fault Tree Analysis", "Brainstorming", "Other"];

export function Capa() {
  const { items: capas, loading, reload } = useCapa();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCapa, setActiveCapa] = useState<CapaType | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    source: CAPA_SOURCES[0],
    owner: user?.name || '',
    targetDate: '',
    rcaMethod: ROOT_CAUSE_METHODS[0],
    desc: '',
    rcaText: '',
    corr: '',
    prev: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const filteredCapas = useMemo(() => {
    let list = capas;
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterSource) list = list.filter(c => c.source === filterSource);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [capas, filterStatus, filterSource]);

  const today = new Date();
  const overdue = capas.filter(c => c.status !== 'CLOSED' && c.target_date && new Date(c.target_date) < today);

  const stats = [
    { label: 'Total CAPAs', val: capas.length, color: '#60A5FA' },
    { label: 'Open', val: capas.filter(c => c.status === 'OPEN').length, color: '#EF4444' },
    { label: 'In Progress', val: capas.filter(c => c.status === 'IN_PROGRESS').length, color: '#FB923C' },
    { label: 'Pending Verification', val: capas.filter(c => c.status === 'PENDING_VERIFICATION').length, color: '#FDE047' },
    { label: 'Overdue', val: overdue.length, color: '#F43F5E' },
  ];

  const handleSave = async () => {
    if (!form.desc.trim() || !form.targetDate) { showToast('Description and target date required', 'warning'); return; }
    setSaving(true);
    try {
      const capaNo = `CAPA-${new Date().getFullYear()}-${String(capas.length + 1).padStart(3, "0")}`;
      await capaApi.create({
        capa_no: capaNo,
        type: 'CA',
        source: form.source,
        owner: form.owner.trim() || null,
        target_date: form.targetDate,
        rca_method: form.rcaMethod || null,
        description: form.desc.trim(),
        rca_text: form.rcaText.trim() || null,
        corrective_action: form.corr.trim() || null,
        preventive_action: form.prev.trim() || null,
        verification_note: null,
        status: 'OPEN',
        closed_at: null,
        closed_by: null,
        notes: null,
        root_cause: null,
        action_taken: null,
        responsible: null,
        due_date: null,
        verified_by: null,
        verified_at: null
      });
      showToast(`CAPA ${capaNo} raised successfully`, 'success');
      setIsModalOpen(false);
      setForm({ source: CAPA_SOURCES[0], owner: user?.name || '', targetDate: '', rcaMethod: ROOT_CAUSE_METHODS[0], desc: '', rcaText: '', corr: '', prev: '' });
      reload();
    } catch (e: unknown) { showToast(`Error saving CAPA: ${(e as Error).message}`, 'error'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, currentStatus: CapaStatus) => {
    const flow: Record<CapaStatus, CapaStatus> = { "OPEN": "IN_PROGRESS", "IN_PROGRESS": "PENDING_VERIFICATION", "PENDING_VERIFICATION": "CLOSED", "CLOSED": "CLOSED", "VERIFIED": "VERIFIED" };
    const next = flow[currentStatus];
    if (!next || next === currentStatus) return;

    let verificationNote = null;
    let closedAt = null;
    let closedBy = null;

    if (next === 'CLOSED') {
      const note = prompt("Effectiveness verification note (required to close):");
      if (!note) { showToast("Verification note required to close CAPA", 'warning'); return; }
      verificationNote = note;
      closedAt = new Date().toISOString();
      closedBy = user?.name || null;
    }

    try {
      await capaApi.update(id, { 
        status: next as CapaStatus, 
        ...(verificationNote ? { verification_note: verificationNote, closed_at: closedAt, closed_by: closedBy } : {}) 
      });
      showToast(`CAPA moved to: ${next}`, 'info');
      reload();
    } catch (e: unknown) { showToast(`Error updating status: ${(e as Error).message}`, 'error'); }
  };

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading CAPA Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Quality · ISO 22000 Cl. 10.1 · Continual Improvement</p>
            <h1 className="bos-page-title">CAPA — Corrective &amp; Preventive Action</h1>
            <p className="bos-page-sub">Root cause analysis · Action tracking · Effectiveness verification</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ Raise CAPA</button>}
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', marginTop: 24 }}>
        <select className="bos-form-field" style={{ maxWidth: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="PENDING_VERIFICATION">Pending Verification</option><option value="CLOSED">Closed</option>
        </select>
        <select className="bos-form-field" style={{ maxWidth: 200 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {CAPA_SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📋 CAPA Register</div>
        {filteredCapas.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No CAPAs found.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>CAPA No</th><th>Source</th><th>Description</th><th>RCA Method</th><th>Owner</th><th>Target Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredCapas.map(c => {
                  const isOverdue = c.status !== 'CLOSED' && c.target_date && new Date(c.target_date) < today;
                  const statusColors: Record<CapaStatus, string> = { "OPEN": "#EF4444", "IN_PROGRESS": "#FB923C", "PENDING_VERIFICATION": "#FDE047", "CLOSED": "#22C55E", "VERIFIED": "#22C55E" };
                  const sc = statusColors[c.status] || "#60A5FA";
                  return (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#D4A843', fontWeight: 700 }}>{c.capa_no}</span></td>
                      <td style={{ fontSize: 11, color: '#9AAF96' }}>{c.source}</td>
                      <td style={{ fontSize: 12, color: '#F0EDE6', maxWidth: 180 }}>{c.description}</td>
                      <td style={{ fontSize: 11, color: '#9AAF96' }}>{c.rca_method || '—'}</td>
                      <td style={{ fontSize: 12 }}>{c.owner || '—'}</td>
                      <td style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#9AAF96', fontWeight: isOverdue ? 700 : 400 }}>{fmtDate(c.target_date)}{isOverdue ? ' ⚠' : ''}</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${sc}22`, color: sc }}>{CAPA_STATUS_LABEL[c.status] || c.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => setActiveCapa(c)}>View</button>
                          {c.status !== 'CLOSED' && canEdit && <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => updateStatus(c.id, c.status)}>Update</button>}
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

      {activeCapa && (
        <div className="bos-card" style={{ marginTop: 20, borderColor: 'rgba(96,165,250,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="bos-card-title" style={{ margin: 0 }}>📄 CAPA Detail — {activeCapa.capa_no}</div>
            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setActiveCapa(null)}>✕ Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              ["Source", activeCapa.source], ["Owner", activeCapa.owner], ["RCA Method", activeCapa.rca_method],
              ["Status", CAPA_STATUS_LABEL[activeCapa.status] || activeCapa.status], ["Target Date", fmtDate(activeCapa.target_date)], ["Raised On", fmtDate(activeCapa.created_at)]
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                <div style={{ color: '#F0EDE6', fontWeight: 600, fontSize: 13, marginTop: 3 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {[
            ["Problem Description", activeCapa.description], ["Root Cause Analysis", activeCapa.rca_text],
            ["Corrective Action", activeCapa.corrective_action], ["Preventive Action", activeCapa.preventive_action],
            ["Effectiveness Verification", activeCapa.verification_note]
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k}</div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, fontSize: 13, color: '#F0EDE6', lineHeight: 1.6 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">🔧 Raise New CAPA</span><button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Source / Origin *</label><select className="bos-form-field" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>{CAPA_SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Owner / Responsible Person</label><input className="bos-form-field" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Target Completion Date *</label><input className="bos-form-field" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">RCA Method</label><select className="bos-form-field" value={form.rcaMethod} onChange={e => setForm({ ...form, rcaMethod: e.target.value })}>{ROOT_CAUSE_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Problem Description *</label><textarea className="bos-form-field" rows={2} placeholder="Describe the non-conformance or problem" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Root Cause Analysis</label><textarea className="bos-form-field" rows={3} placeholder="Document root cause findings (5 Whys, Fishbone, etc.)" value={form.rcaText} onChange={e => setForm({ ...form, rcaText: e.target.value })} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Corrective Action Planned</label><textarea className="bos-form-field" rows={2} placeholder="Immediate corrective action to fix the problem" value={form.corr} onChange={e => setForm({ ...form, corr: e.target.value })} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Preventive Action Planned</label><textarea className="bos-form-field" rows={2} placeholder="Long-term prevention to stop recurrence" value={form.prev} onChange={e => setForm({ ...form, prev: e.target.value })} /></div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Raise CAPA'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
