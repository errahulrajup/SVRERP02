import React, { useState, useMemo, useEffect } from 'react';
import { useFssai, useFssaiAudits } from '../../hooks/useBos';
import { fssaiApi, fssaiAuditsApi } from '../../lib/bosApi';
import { FssaiRecord, FssaiDocType, fmtDate } from '../../types/bos';
import { useAuth } from '../../hooks';

const DOC_TYPES = ["FSSAI License", "FSSAI Registration", "State NOC", "Fire NOC", "Factory License", "MSME Certificate", "GST Registration", "ISO Certificate", "FSSC 22000", "Pollution NOC", "Water Testing Report", "Other"];

const GMP_CHECKS = [
  { section: "Premises", item: "Factory layout prevents cross-contamination" },
  { section: "Premises", item: "Floors, walls, ceilings — cleanable surfaces" },
  { section: "Premises", item: "Adequate lighting (min 220 lux in work areas)" },
  { section: "Premises", item: "Proper drainage and waste disposal" },
  { section: "Equipment", item: "Food contact surfaces — food grade material" },
  { section: "Equipment", item: "Calibration records maintained for all instruments" },
  { section: "Hygiene", item: "Handwashing facilities at entry points" },
  { section: "Hygiene", item: "No eating/smoking in production area" },
  { section: "Hygiene", item: "Medical fitness certificate for all food handlers" },
  { section: "Pest Control", item: "Pest control contract with licensed PCO" },
  { section: "Pest Control", item: "Monthly pest control records maintained" },
  { section: "Water", item: "Potable water tested — valid report on file" },
  { section: "Water", item: "Water source identified and protected" },
  { section: "Storage", item: "FEFO/FIFO followed in raw material storage" },
  { section: "Storage", item: "Allergen storage — separated and labeled" },
  { section: "Documentation", item: "HACCP plan documented and reviewed annually" },
  { section: "Documentation", item: "Batch manufacturing records maintained 2+ years" },
  { section: "Documentation", item: "Traceability system tested (mock recall done)" },
  { section: "Labeling", item: "FSSAI logo + license no. on all finished goods" },
  { section: "Labeling", item: "Allergen declaration on packaging" },
];

export function FssaiLog() {
  const { items: docs, loading: dLoading, reload: dReload } = useFssai();
  const { items: audits, loading: aLoading, reload: aReload } = useFssaiAudits();
  const { user } = useAuth();

  const [isDocFormOpen, setIsDocFormOpen] = useState(false);
  const [isAuditFormOpen, setIsAuditFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gmpChecks, setGmpChecks] = useState<Record<string, boolean>>({});

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    try { setGmpChecks(JSON.parse(localStorage.getItem('gmp_checks') || '{}')); } catch (e) { }
  }, []);

  const toggleGMP = (key: string) => {
    if (!canEdit) return;
    const next = { ...gmpChecks, [key]: !gmpChecks[key] };
    setGmpChecks(next);
    localStorage.setItem('gmp_checks', JSON.stringify(next));
  };

  const [docForm, setDocForm] = useState({ docType: DOC_TYPES[0], docNo: '', issueDate: '', expiryDate: '', notes: '' });
  const [auditForm, setAuditForm] = useState({ auditDate: new Date().toISOString().slice(0, 10), auditType: 'Internal Audit', auditor: '', status: 'Open', findings: '' });

  const today = new Date();
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90);

  const expired = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < today);
  const exp30 = docs.filter(d => d.expiry_date && new Date(d.expiry_date) >= today && new Date(d.expiry_date) <= in30);
  const exp90 = docs.filter(d => d.expiry_date && new Date(d.expiry_date) > in30 && new Date(d.expiry_date) <= in90);

  const stats = [
    { label: "Total Documents", val: docs.length, color: "#60A5FA" },
    { label: "Expired", val: expired.length, color: "#EF4444" },
    { label: "Expiring (30 days)", val: exp30.length, color: "#FB923C" },
    { label: "Expiring (90 days)", val: exp90.length, color: "#FDE047" },
  ];

  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => new Date(a.expiry_date || "9999").getTime() - new Date(b.expiry_date || "9999").getTime());
  }, [docs]);

  const sortedAudits = useMemo(() => {
    return [...audits].sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime());
  }, [audits]);

  const sections = Array.from(new Set(GMP_CHECKS.map(c => c.section)));

  const saveDoc = async () => {
    setSaving(true);
    try {
      await fssaiApi.create({
        doc_type: docForm.docType as FssaiDocType,
        document_name: docForm.docType,
        doc_no: docForm.docNo.trim() || null,
        issue_date: docForm.issueDate || null,
        expiry_date: docForm.expiryDate || null,
        issuing_authority: null,
        status: 'Valid',
        notes: docForm.notes.trim() || null,
        file_url: null
      });
      alert('Document saved');
      setIsDocFormOpen(false);
      setDocForm({ docType: DOC_TYPES[0], docNo: '', issueDate: '', expiryDate: '', notes: '' });
      dReload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await fssaiApi.remove(id);
      dReload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const saveAudit = async () => {
    if (!auditForm.auditDate) return alert('Date required');
    setSaving(true);
    try {
      await fssaiAuditsApi.create({
        audit_date: auditForm.auditDate,
        audit_type: auditForm.auditType,
        auditor: auditForm.auditor.trim() || null,
        status: auditForm.status,
        findings: auditForm.findings.trim() || null
      });
      alert('Audit logged');
      setIsAuditFormOpen(false);
      setAuditForm({ auditDate: new Date().toISOString().slice(0, 10), auditType: 'Internal Audit', auditor: '', status: 'Open', findings: '' });
      aReload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  if (dLoading || aLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading FSSAI Data...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Regulatory · FSSAI Schedule 4 · GMP</p>
            <h1 className="bos-page-title">FSSAI Compliance Tracker</h1>
            <p className="bos-page-sub">License tracking · Document expiry alerts · Audit readiness · GMP checklist</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsDocFormOpen(true)}>+ Add Document</button>}
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

      <div style={{ marginBottom: 20 }}>
        {[...expired.map(d => ({ d, type: "EXPIRED", color: "#EF4444", icon: "🚨" })), ...exp30.map(d => ({ d, type: "EXPIRING SOON", color: "#FB923C", icon: "⚠️" }))].map((a, i) => (
          <div key={i} style={{ background: `rgba(${a.type === "EXPIRED" ? "239,68,68" : "251,146,60"}, 0.1)`, border: `1px solid rgba(${a.type === "EXPIRED" ? "239,68,68" : "251,146,60"}, 0.3)`, borderRadius: 10, padding: '12px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: a.color, fontWeight: 700, fontSize: 13 }}>{a.type}: {a.d.doc_type} — {a.d.doc_no}</div>
              <div style={{ color: '#9AAF96', fontSize: 12 }}>Expiry: {fmtDate(a.d.expiry_date)} · Renew immediately</div>
            </div>
            {canEdit && <button className="bos-btn bos-btn-sm bos-btn-dark" onClick={() => setIsDocFormOpen(true)}>Update →</button>}
          </div>
        ))}
      </div>

      {isDocFormOpen && (
        <div className="bos-card" style={{ marginBottom: 20, borderColor: 'rgba(255,193,7,0.2)' }}>
          <div className="bos-card-title">📄 Add License / Document</div>
          <div className="bos-form-grid">
            <div className="bos-form-group"><label className="bos-form-label">Document Type *</label><select className="bos-form-field" value={docForm.docType} onChange={e => setDocForm({ ...docForm, docType: e.target.value })}>{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="bos-form-group"><label className="bos-form-label">Document No. / License No.</label><input className="bos-form-field" placeholder="e.g. 12419044000123" value={docForm.docNo} onChange={e => setDocForm({ ...docForm, docNo: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Issue Date</label><input className="bos-form-field" type="date" value={docForm.issueDate} onChange={e => setDocForm({ ...docForm, issueDate: e.target.value })} /></div>
            <div className="bos-form-group"><label className="bos-form-label">Expiry Date</label><input className="bos-form-field" type="date" value={docForm.expiryDate} onChange={e => setDocForm({ ...docForm, expiryDate: e.target.value })} /></div>
          </div>
          <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Notes</label><input className="bos-form-field" placeholder="Any additional info" value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="bos-btn bos-btn-primary" onClick={saveDoc} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsDocFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ marginBottom: 20, padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid rgba(123,169,123,0.1)' }}>📄 License &amp; Document Register</div>
        {sortedDocs.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No documents added yet. Click "+ Add Document".</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Document Type</th><th>Document No.</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
              <tbody>
                {sortedDocs.map(d => {
                  const exp = d.expiry_date ? new Date(d.expiry_date) : null;
                  const daysLeft = exp ? Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const status = !exp ? "No Expiry" : daysLeft !== null && daysLeft < 0 ? "EXPIRED" : daysLeft !== null && daysLeft <= 30 ? "EXPIRING SOON" : "VALID";
                  const statusColor = status === "VALID" || status === "No Expiry" ? "#22C55E" : status === "EXPIRED" ? "#EF4444" : "#FB923C";
                  return (
                    <tr key={d.id}>
                      <td style={{ color: '#F0EDE6', fontWeight: 600 }}>{d.doc_type}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#D4A843' }}>{d.doc_no || '—'}</td>
                      <td style={{ fontSize: 12, color: '#9AAF96' }}>{fmtDate(d.issue_date)}</td>
                      <td style={{ fontSize: 12 }}>{fmtDate(d.expiry_date)}</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${statusColor}22`, color: statusColor }}>{status}{daysLeft !== null && daysLeft >= 0 ? ` (${daysLeft}d)` : ""}</span></td>
                      <td style={{ fontSize: 11, color: '#9AAF96', maxWidth: 150 }}>{d.notes || '—'}</td>
                      <td>{canEdit && <button className="bos-btn bos-btn-sm bos-btn-dark" onClick={() => deleteDoc(d.id)}>Delete</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bos-card" style={{ marginBottom: 20 }}>
        <div className="bos-card-title">✅ FSSAI Schedule 4 — GMP Self-Assessment Checklist</div>
        {sections.map(section => {
          const items = GMP_CHECKS.filter(c => c.section === section);
          return (
            <div key={section} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{section}</div>
              {items.map((item, idx) => {
                const key = section + idx;
                const checked = gmpChecks[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: checked ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)', borderRadius: 6, marginBottom: 4, cursor: canEdit ? 'pointer' : 'default' }} onClick={() => toggleGMP(key)}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? '#22C55E' : 'rgba(123,169,123,0.2)'}`, background: checked ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <span style={{ color: '#000', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: checked ? '#22C55E' : '#9AAF96' }}>{item.item}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
          <div className="bos-card-title" style={{ margin: 0 }}>📋 Audit Log</div>
          {canEdit && <button className="bos-btn bos-btn-sm bos-btn-dark" onClick={() => setIsAuditFormOpen(true)}>+ Log Audit</button>}
        </div>
        {isAuditFormOpen && (
          <div style={{ padding: 20, borderBottom: '1px solid rgba(123,169,123,0.1)', background: 'rgba(96,165,250,0.02)' }}>
            <div className="bos-form-grid">
              <div className="bos-form-group"><label className="bos-form-label">Audit Date *</label><input className="bos-form-field" type="date" value={auditForm.auditDate} onChange={e => setAuditForm({ ...auditForm, auditDate: e.target.value })} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Audit Type</label><select className="bos-form-field" value={auditForm.auditType} onChange={e => setAuditForm({ ...auditForm, auditType: e.target.value })}><option>Internal Audit</option><option>FSSAI Inspection</option><option>Third Party Audit</option><option>Customer Audit</option><option>Mock Recall</option></select></div>
              <div className="bos-form-group"><label className="bos-form-label">Auditor / Inspector</label><input className="bos-form-field" placeholder="Name" value={auditForm.auditor} onChange={e => setAuditForm({ ...auditForm, auditor: e.target.value })} /></div>
              <div className="bos-form-group"><label className="bos-form-label">Status</label><select className="bos-form-field" value={auditForm.status} onChange={e => setAuditForm({ ...auditForm, status: e.target.value })}><option>Open</option><option>CAPA Raised</option><option>Closed</option></select></div>
            </div>
            <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Findings / Observations</label><textarea className="bos-form-field" rows={3} placeholder="Key findings, non-conformities, observations" value={auditForm.findings} onChange={e => setAuditForm({ ...auditForm, findings: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="bos-btn bos-btn-primary" onClick={saveAudit} disabled={saving}>{saving ? 'Saving...' : '💾 Save Audit'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsAuditFormOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
        {sortedAudits.length === 0 ? (
          <div className="bos-empty" style={{ padding: 16 }}>No audits logged yet.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Audit Type</th><th>Auditor</th><th>Findings</th><th>Status</th></tr></thead>
              <tbody>
                {sortedAudits.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{fmtDate(a.audit_date)}</td>
                    <td style={{ color: '#F0EDE6' }}>{a.audit_type}</td>
                    <td style={{ fontSize: 12 }}>{a.auditor || '—'}</td>
                    <td style={{ fontSize: 11, color: '#9AAF96', maxWidth: 200 }}>{a.findings || '—'}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: a.status === "Closed" ? 'rgba(34,197,94,0.15)' : 'rgba(251,146,60,0.15)', color: a.status === "Closed" ? '#22C55E' : '#FB923C' }}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
