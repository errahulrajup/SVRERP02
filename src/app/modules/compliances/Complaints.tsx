import { useState, useMemo } from 'react';
import { useCustomerComplaints, useBatches } from '../../hooks/useBos';
import { customerComplaintsApi, capaApi } from '../../lib/bosApi';
import { CustomerComplaint } from '../../types/bos';
import { useAuth } from '../../hooks';
import { showToast } from '../../lib/toast';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function Complaints() {
  const { items: complaints, loading: cLoading, reload } = useCustomerComplaints();
  const { items: batches, loading: bLoading } = useBatches();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState<CustomerComplaint | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    productName: '',
    batchNo: '',
    severity: 'MEDIUM' as CustomerComplaint['severity'],
    issueDescription: '',
    correctiveAction: ''
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';

  const filteredComplaints = useMemo(() => {
    let list = complaints;
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterSeverity) list = list.filter(c => c.severity === filterSeverity);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.customer_name.toLowerCase().includes(term) ||
        (c.product_name && c.product_name.toLowerCase().includes(term)) ||
        c.ref_no.toLowerCase().includes(term) ||
        (c.batch_no && c.batch_no.toLowerCase().includes(term))
      );
    }
    return list;
  }, [complaints, filterStatus, filterSeverity, searchTerm]);

  const stats = [
    { label: 'Total Complaints', val: complaints.length, color: 'var(--bos-blue)' },
    { label: 'Open / Unresolved', val: complaints.filter(c => c.status !== 'CLOSED').length, color: '#ef4444' },
    { label: 'Investigating', val: complaints.filter(c => c.status === 'INVESTIGATING').length, color: '#f59e0b' },
    { label: 'CAPA Pending', val: complaints.filter(c => c.status === 'CAPA_PENDING').length, color: '#ca8a04' },
    { label: 'Resolved & Closed', val: complaints.filter(c => c.status === 'CLOSED').length, color: '#16a34a' }
  ];

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.issueDescription.trim()) {
      showToast('Customer Name and Issue Description are required', 'warning'); return;
    }

    setSaving(true);
    try {
      const refNo = `COMP-${new Date().getFullYear()}-${String(complaints.length + 1).padStart(3, '0')}`;
      await customerComplaintsApi.create({
        ref_no: refNo,
        customer_name: form.customerName.trim(),
        product_name: form.productName.trim() || null,
        batch_no: form.batchNo || null,
        severity: form.severity,
        issue_description: form.issueDescription.trim(),
        complaint_date: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        corrective_action: form.correctiveAction.trim() || null,
        logged_by: user?.name || null
      });

      showToast(`✅ Complaint ${refNo} logged successfully`, 'success');
      setIsModalOpen(false);
      setForm({
        customerName: '',
        productName: '',
        batchNo: '',
        severity: 'MEDIUM',
        issueDescription: '',
        correctiveAction: ''
      });
      reload();
    } catch (e: unknown) {
      showToast(`Error saving complaint: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: CustomerComplaint['status']) => {
    try {
      const payload: Partial<CustomerComplaint> = { status: newStatus };
      
      if (newStatus === 'CLOSED') {
        const ca = prompt('Enter final corrective action / resolution details (required to close):');
        if (!ca) { showToast('Resolution details are required to close complaint', 'warning'); return; }
        payload.corrective_action = ca;
      }

      await customerComplaintsApi.update(id, payload);
      showToast(`Status updated to: ${newStatus}`, 'success');
      reload();
      if (activeComplaint && activeComplaint.id === id) {
        setActiveComplaint(prev => prev ? { ...prev, ...payload } : null);
      }
    } catch (e: unknown) {
      showToast(`Error updating status: ${(e as Error).message}`, 'error');
    }
  };

  const promoteToCapa = async (complaint: CustomerComplaint) => {
    if (!confirm(`Promote complaint ${complaint.ref_no} to a formal CAPA?`)) return;
    
    try {
      const capaNo = `CAPA-${new Date().getFullYear()}-COMP-${String(complaint.ref_no.split('-').pop())}`;
      await capaApi.create({
        capa_no: capaNo,
        type: 'CA',
        source: 'Customer Complaint',
        description: `CAPA originating from Complaint ${complaint.ref_no} - Customer: ${complaint.customer_name}. Issue: ${complaint.issue_description}`,
        owner: user?.name || null,
        target_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], // 14 days due
        rca_method: '5 Whys',
        rca_text: null,
        corrective_action: complaint.corrective_action || null,
        preventive_action: null,
        verification_note: null,
        status: 'OPEN',
        closed_at: null,
        closed_by: null,
        notes: `Linked to Complaint Reference: ${complaint.ref_no}`,
        root_cause: null,
        action_taken: null,
        responsible: null,
        due_date: null,
        verified_by: null,
        verified_at: null
      });

      // Update complaint status to CAPA_PENDING
      await customerComplaintsApi.update(complaint.id, { status: 'CAPA_PENDING' });
      showToast(`✅ CAPA ${capaNo} raised and linked successfully`, 'success');
      reload();
      if (activeComplaint && activeComplaint.id === complaint.id) {
        setActiveComplaint(prev => prev ? { ...prev, status: 'CAPA_PENDING' } : null);
      }
    } catch (e: unknown) {
      showToast(`Error promoting to CAPA: ${(e as Error).message}`, 'error');
    }
  };

  const getSeverityColor = (sev: CustomerComplaint['severity']) => {
    switch (sev) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#d97706';
      case 'LOW': return 'var(--bos-blue)';
    }
  };

  const getStatusColor = (status: CustomerComplaint['status']) => {
    switch (status) {
      case 'OPEN': return '#ef4444';
      case 'INVESTIGATING': return '#ea580c';
      case 'CAPA_PENDING': return '#d97706';
      case 'CLOSED': return '#16a34a';
    }
  };

  if (cLoading || bLoading) return <div style={{ padding: 40, color: 'var(--bos-text3)' }}>Loading Complaints...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Quality · ISO 22000 Cl. 8.9 / Cl. 10.2 · Customer Satisfaction</p>
            <h1 className="bos-page-title">Customer Complaints & Feeback Tracker</h1>
            <p className="bos-page-sub">Track complaints, link to production batches, and trigger CAPAs (FR-006)</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => setIsModalOpen(true)}>+ Log Complaint</button>}
        </div>
      </div>

      <div className="bos-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map(s => (
          <div className="bos-kpi-card" key={s.label}>
            <div className="bos-kpi-bar" style={{ background: s.color }} />
            <div className="bos-kpi-label">{s.label}</div>
            <div className="bos-kpi-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', marginTop: 24 }}>
        <input 
          className="bos-form-field" 
          style={{ maxWidth: 260 }} 
          placeholder="🔍 Search Customer, Product, Batch..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
        <select className="bos-form-field" style={{ maxWidth: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="CAPA_PENDING">CAPA Pending</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select className="bos-form-field" style={{ maxWidth: 180 }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div className="bos-card" style={{ padding: 0 }}>
        <div className="bos-card-title" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--bos-border)' }}>📋 Customer Complaint Log</div>
        {filteredComplaints.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No complaints matches the filters.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Batch No</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map(c => {
                  const sc = getStatusColor(c.status);
                  const sColor = getSeverityColor(c.severity);
                  return (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bos-gold)', fontWeight: 700 }}>{c.ref_no}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--bos-text3)' }}>{c.complaint_date}</td>
                      <td style={{ fontWeight: 600, color: 'var(--bos-text1)' }}>{c.customer_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--bos-text2)' }}>{c.product_name || '—'}</td>
                      <td>
                        {c.batch_no ? (
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bos-bg3)', color: 'var(--bos-gold)', padding: '2px 6px', borderRadius: 4 }}>
                            {c.batch_no}
                          </span>
                        ) : '—'}
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${sColor}18`, color: sColor }}>{c.severity}</span></td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${sc}18`, color: sc }}>{c.status.replace('_', ' ')}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bos-btn bos-btn-sm" style={{ background: 'var(--bos-bg4)' }} onClick={() => setActiveComplaint(c)}>View</button>
                          {c.status !== 'CLOSED' && canEdit && (
                            <select 
                              className="bos-form-field" 
                              style={{ width: 110, padding: '4px 8px', fontSize: 11, height: 26 }}
                              value={c.status}
                              onChange={e => updateStatus(c.id, e.target.value as CustomerComplaint['status'])}
                            >
                              <option value="OPEN">Open</option>
                              <option value="INVESTIGATING">Investigate</option>
                              <option value="CLOSED">Close</option>
                            </select>
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

      {activeComplaint && (
        <div className="bos-card" style={{ marginTop: 24, padding: 20, borderColor: 'var(--bos-gold-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--bos-border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <strong style={{ fontSize: 14 }}>Complaint Details — {activeComplaint.ref_no}</strong>
            </div>
            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setActiveComplaint(null)}>✕ Close Panel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              ['Customer', activeComplaint.customer_name],
              ['Product Involved', activeComplaint.product_name || '—'],
              ['Batch Number', activeComplaint.batch_no || '—'],
              ['Severity', activeComplaint.severity],
              ['Current Status', activeComplaint.status.replace('_', ' ')],
              ['Logged By', activeComplaint.logged_by || '—'],
              ['Complaint Date', activeComplaint.complaint_date]
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bos-bg4)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                <div style={{ color: 'var(--bos-text1)', fontWeight: 600, fontSize: 13, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Issue Description</div>
            <div style={{ background: '#ffffff', border: '1px solid var(--bos-border)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--bos-text1)', lineHeight: 1.6 }}>
              {activeComplaint.issue_description}
            </div>
          </div>

          {activeComplaint.corrective_action && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bos-text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Resolution / Corrective Action Logged</div>
              <div style={{ background: 'var(--bos-bg3)', border: '1px solid var(--bos-gold-border)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--bos-gold)', lineHeight: 1.6 }}>
                {activeComplaint.corrective_action}
              </div>
            </div>
          )}

          {canEdit && activeComplaint.status !== 'CLOSED' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20, borderTop: '1px solid var(--bos-border)', paddingTop: 16 }}>
              <button className="bos-btn" style={{ background: '#f59e0b', color: '#ffffff' }} onClick={() => updateStatus(activeComplaint.id, 'INVESTIGATING')}>
                🔍 Set to Investigating
              </button>
              <button className="bos-btn" style={{ background: 'var(--bos-gold)', color: '#ffffff' }} onClick={() => promoteToCapa(activeComplaint)}>
                🚨 Promote to CAPA
              </button>
              <button className="bos-btn" style={{ background: '#16a34a', color: '#ffffff' }} onClick={() => updateStatus(activeComplaint.id, 'CLOSED')}>
                ✓ Mark Resolved & Close
              </button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">📝 Log Customer Complaint</span><button className="bos-modal-close" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label">Customer Name *</label>
                  <input className="bos-form-field" placeholder="Customer or Outlet name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Product Name</label>
                  <input className="bos-form-field" placeholder="e.g. Plant Mayo 1kg" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Batch No (if known)</label>
                  <select className="bos-form-field" value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })}>
                    <option value="">-- Select Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.batch_no}>{b.batch_no} - {b.product}</option>
                    ))}
                  </select>
                </div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label">Severity Level</label>
                  <select className="bos-form-field" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as any })}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="bos-form-group" style={{ marginTop: 12 }}>
                <label className="bos-form-label">Issue Details / Customer Feedback *</label>
                <textarea className="bos-form-field" rows={3} placeholder="Provide details about the customer complaint, texture issues, packaging problems, off-odors, etc." value={form.issueDescription} onChange={e => setForm({ ...form, issueDescription: e.target.value })} />
              </div>
              
              <div className="bos-form-group">
                <label className="bos-form-label">Immediate Correction Taken (Optional)</label>
                <textarea className="bos-form-field" rows={2} placeholder="Any immediate resolution details logged" value={form.correctiveAction} onChange={e => setForm({ ...form, correctiveAction: e.target.value })} />
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Log Complaint'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
