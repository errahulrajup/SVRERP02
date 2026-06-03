import React, { useState } from 'react';
import { useAuditSchedules } from '../../hooks/useBos';
import { auditSchedulesApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';

const AUDIT_TYPES = ['Internal', 'External', 'Regulatory', 'Supplier', 'Customer', 'FSSAI'];
const STATUSES    = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

export function AuditSchedules() {
  const { items: audits, loading, reload } = useAuditSchedules();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    audit_no: '', audit_type: 'Internal', department: '',
    auditor: '', scheduled_date: '', scope: '', status: 'Scheduled', notes: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSave = async () => {
    if (!form.audit_no.trim()) return alert('Audit No. required');
    if (!form.scheduled_date) return alert('Scheduled date required');
    setSaving(true);
    try {
      await auditSchedulesApi.create({ ...form, created_by: user?.id || null });
      alert(`✅ Audit ${form.audit_no} scheduled`);
      setIsOpen(false);
      setForm({ audit_no: '', audit_type: 'Internal', department: '', auditor: '', scheduled_date: '', scope: '', status: 'Scheduled', notes: '' });
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await auditSchedulesApi.update(id, { status }); reload(); } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this audit?')) return;
    try { await auditSchedulesApi.remove(id); reload(); } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Audit Schedules...</div>;

  const stats = [
    { label: 'Total Audits', val: audits.length, color: '#FFC107' },
    { label: 'Scheduled', val: audits.filter((a: any) => a.status === 'Scheduled').length, color: '#60A5FA' },
    { label: 'Completed', val: audits.filter((a: any) => a.status === 'Completed').length, color: '#22C55E' },
    { label: 'In Progress', val: audits.filter((a: any) => a.status === 'In Progress').length, color: '#FDE047' },
  ];

  const overdue = audits.filter((a: any) => a.status === 'Scheduled' && new Date(a.scheduled_date) < new Date());

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Compliances · Internal Audit</p>
            <h1 className="bos-page-title">Audit Schedules</h1>
            <p className="bos-page-sub">Plan and track internal, external, and regulatory audits</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsOpen(true)}>+ Schedule Audit</button>}
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ background: 'rgba(224,82,82,0.12)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 16, color: '#E05252', fontSize: 13 }}>
          ⚠️ <strong>{overdue.length}</strong> audit{overdue.length > 1 ? 's are' : ' is'} overdue — please update status or reschedule.
        </div>
      )}

      <div className="bos-kpi-grid">
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bos-card" style={{ padding: 0, marginTop: 20 }}>
        {audits.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No audits scheduled. Plan your first audit.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Audit No.</th><th>Type</th><th>Department</th><th>Auditor</th><th>Scheduled</th><th>Scope</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {audits.map((a: any) => {
                  const isOverdue = a.status === 'Scheduled' && new Date(a.scheduled_date) < new Date();
                  return (
                    <tr key={a.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{a.audit_no}</span></td>
                      <td style={{ fontSize: 12 }}>{a.audit_type}</td>
                      <td style={{ fontSize: 12, color: '#9AAF96' }}>{a.department || '—'}</td>
                      <td style={{ fontSize: 12, color: '#9AAF96' }}>{a.auditor || '—'}</td>
                      <td style={{ fontSize: 12, color: isOverdue ? '#EF4444' : '#9AAF96' }}>
                        {a.scheduled_date}{isOverdue ? ' ⚠️' : ''}
                      </td>
                      <td style={{ fontSize: 12, color: '#9AAF96', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.scope || '—'}</td>
                      <td>
                        {canEdit ? (
                          <select className="bos-form-field" style={{ padding: '4px 8px', fontSize: 12 }} value={a.status} onChange={e => handleStatusChange(a.id, e.target.value)}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`bos-badge ${a.status === 'Completed' ? 'bos-badge-green' : a.status === 'In Progress' ? 'bos-badge-yellow' : a.status === 'Cancelled' ? 'bos-badge-red' : 'bos-badge-blue'}`}>{a.status}</span>
                        )}
                      </td>
                      <td>{canEdit && <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(a.id)}>🗑</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 700 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">📅 Schedule New Audit</span>
              <button className="bos-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Audit No. *</label><input className="bos-form-field" placeholder="e.g. AUD-2026-001" value={form.audit_no} onChange={e => setForm({ ...form, audit_no: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Audit Type</label><select className="bos-form-field" value={form.audit_type} onChange={e => setForm({ ...form, audit_type: e.target.value })}>{AUDIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Department / Area</label><input className="bos-form-field" placeholder="e.g. Production Floor" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Lead Auditor</label><input className="bos-form-field" placeholder="Name" value={form.auditor} onChange={e => setForm({ ...form, auditor: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Scheduled Date *</label><input className="bos-form-field" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Status</label><select className="bos-form-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">Scope / Checklist Summary</label><textarea className="bos-form-field" rows={2} placeholder="Scope of audit..." value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} /></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">Notes</label><textarea className="bos-form-field" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Schedule Audit →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
