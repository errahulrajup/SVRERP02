import React, { useState, useMemo } from 'react';
import { useTrainingRecords, useEmployees, useSops } from '../../hooks/useBos';
import { hrTrainingRecordsApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import { Employee, TrainingRecord, TrainingRecordStatus, fmtDate } from '../../types/bos';

export function TrainingMatrix() {
  const { items: records, loading, reload } = useTrainingRecords();
  const { items: employees, loading: eLoading } = useEmployees();
  const { items: sops, loading: sLoading } = useSops();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchEmp, setSearchEmp] = useState('');
  
  const [form, setForm] = useState({
    employee_id: '', sop_id: '', training_date: new Date().toISOString().split('T')[0],
    evaluation_score: '', status: 'PENDING_EVALUATION' as TrainingRecordStatus, remarks: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSave = async () => {
    if (!form.employee_id) return alert('Employee required');
    if (!form.sop_id) return alert('SOP required');
    if (!form.training_date) return alert('Training date required');

    setSaving(true);
    try {
      await hrTrainingRecordsApi.create({
        org_id: 'ORG-SVR', site_id: 'SITE-MAIN',
        employee_id: form.employee_id,
        sop_id: form.sop_id,
        trained_by_id: user?.id || 'SYSTEM',
        training_date: form.training_date,
        evaluation_score: form.evaluation_score ? parseFloat(form.evaluation_score) : undefined,
        status: form.status,
        remarks: form.remarks || undefined
      });
      alert('✅ Training record saved');
      setIsOpen(false);
      setForm({ employee_id: '', sop_id: '', training_date: new Date().toISOString().split('T')[0], evaluation_score: '', status: 'PENDING_EVALUATION', remarks: '' });
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, status: TrainingRecordStatus) => {
    try {
      await hrTrainingRecordsApi.update(id, { status });
      reload();
    } catch (e: any) { alert(e.message); }
  };

  if (loading || eLoading || sLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Training Matrix...</div>;

  const filteredRecords = records.filter((r: any) => {
    if (!searchEmp) return true;
    const emp = employees.find((e: any) => e.id === r.employee_id);
    const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
    return name.includes(searchEmp.toLowerCase());
  });

  const stats = [
    { label: 'Total Records', val: records.length, color: '#FFC107' },
    { label: 'Passed', val: records.filter((r: any) => r.status === 'PASSED').length, color: '#22C55E' },
    { label: 'Pending Eval', val: records.filter((r: any) => r.status === 'PENDING_EVALUATION').length, color: '#60A5FA' },
    { label: 'Active Employees', val: employees.filter((e: any) => e.is_active).length, color: '#C084FC' },
  ];

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">HR & Compliance</p>
            <h1 className="bos-page-title">Employee Training Matrix</h1>
            <p className="bos-page-sub">Track SOP training compliance, evaluations, and certifications per employee.</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsOpen(true)}>+ Register Training</button>}
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

      <div className="bos-card" style={{ padding: 0, marginTop: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
          <input className="bos-form-field" placeholder="Search employee..." value={searchEmp} onChange={e => setSearchEmp(e.target.value)} style={{ maxWidth: 300 }} />
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No training records found.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>Date</th><th>Employee</th><th>Department</th><th>SOP Trained</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredRecords.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  const sop = sops.find((s: any) => s.id === r.sop_id);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12 }}>{fmtDate(r.training_date)}</td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id}</td>
                      <td style={{ fontSize: 12, color: '#9AAF96' }}>{emp?.department}</td>
                      <td style={{ fontSize: 13, color: '#D4A843' }}>{sop ? `${sop.sop_no} - ${sop.title}` : r.sop_id}</td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{r.evaluation_score != null ? `${r.evaluation_score}%` : '—'}</td>
                      <td>
                        <span className={`bos-badge ${r.status === 'PASSED' ? 'bos-badge-green' : r.status === 'FAILED' ? 'bos-badge-red' : 'bos-badge-yellow'}`}>{r.status}</span>
                      </td>
                      <td>
                        {canEdit && r.status === 'PENDING_EVALUATION' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="bos-btn bos-btn-sm bos-btn-primary" onClick={() => handleUpdateStatus(r.id, 'PASSED')}>Pass</button>
                            <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={() => handleUpdateStatus(r.id, 'FAILED')}>Fail</button>
                          </div>
                        )}
                      </td>
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
          <div className="bos-modal" style={{ maxWidth: 600 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">🎓 Register Training</span>
              <button className="bos-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group">
                  <label className="bos-form-label">Employee *</label>
                  <select className="bos-form-field" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">-- Select Employee --</option>
                    {employees.filter((e: any) => e.is_active).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.employee_code} - {e.first_name} {e.last_name} ({e.department})</option>
                    ))}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">SOP *</label>
                  <select className="bos-form-field" value={form.sop_id} onChange={e => setForm({ ...form, sop_id: e.target.value })}>
                    <option value="">-- Select SOP --</option>
                    {sops.filter((s: any) => s.status === 'Active').map((s: any) => (
                      <option key={s.id} value={s.id}>{s.sop_no} - {s.title}</option>
                    ))}
                  </select>
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Training Date *</label>
                  <input className="bos-form-field" type="date" value={form.training_date} onChange={e => setForm({ ...form, training_date: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Evaluation Score (%)</label>
                  <input className="bos-form-field" type="number" placeholder="Optional" value={form.evaluation_score} onChange={e => setForm({ ...form, evaluation_score: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Status</label>
                  <select className="bos-form-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TrainingRecordStatus })}>
                    <option value="PENDING_EVALUATION">PENDING EVALUATION</option>
                    <option value="PASSED">PASSED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="bos-form-label">Remarks</label>
                  <input className="bos-form-field" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Register Training →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
