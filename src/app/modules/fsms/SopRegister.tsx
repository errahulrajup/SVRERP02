import React, { useState, useMemo } from 'react';
import { useSops, useRecipes } from '../../hooks/useBos';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks';

const CATEGORIES = ['Production', 'Quality', 'Cleaning & Sanitation', 'Pest Control', 'Allergen', 'Dispatch', 'Storage', 'Maintenance', 'Administration', 'Other'];
const STATUS_OPT = ['Draft', 'Active', 'Under Review', 'Obsolete'];
const COMPLIANCE_STANDARDS = [
  {id: 'ISO_9001', label: 'ISO 9001:2015'},
  {id: 'ISO_22000', label: 'ISO 22000:2018'},
  {id: 'FSSC_22000', label: 'FSSC 22000 v6'},
  {id: 'FDA_FSMA', label: 'FDA FSMA'},
];

export function SopRegister() {
  const { items: sops, loading, reload } = useSops();
  const { items: recipes, loading: rLoading } = useRecipes();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterRecipe, setFilterRecipe] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const [form, setForm] = useState({
    sop_no: '', title: '', category: 'Production', department: '',
    version: '1.0', effective_date: '', review_date: '',
    status: 'Active', prepared_by: user?.name || '', approved_by: '', notes: '',
    recipe_id: '' as string | null,
    compliance_standard: 'ISO_9001'
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'QC';
  const canApprove = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSave = async () => {
    if (!form.sop_no.trim()) return alert('SOP No. required');
    if (!form.title.trim()) return alert('Title required');
    if (editingId &&!changeReason.trim()) return alert('Change reason required per ISO 9001 Cl. 7.5.3');

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('upsert_sop', {
        p_sop_id: editingId,
        p_sop_no: form.sop_no,
        p_title: form.title,
        p_category: form.category,
        p_version: form.version,
        p_department: form.department,
        p_effective_date: form.effective_date || null,
        p_review_date: form.review_date || null,
        p_prepared_by: form.prepared_by,
        p_notes: form.notes,
        p_recipe_id: form.recipe_id || null,
        p_change_reason: changeReason || 'Initial version',
        p_compliance_standard: form.compliance_standard,
        p_user_id: user?.id
      });

      if (error) throw error;

      alert(`✅ SOP ${form.sop_no} v${form.version} saved. Status: Draft. Send for approval.`);
      setIsOpen(false);
      setEditingId(null);
      setChangeReason('');
      reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this SOP? This makes it Active and replaces previous version.')) return;
    try {
      const { error } = await supabase.rpc('approve_sop', { p_sop_id: id, p_user_id: user?.id });
      if (error) throw error;
      alert('SOP Approved and Activated');
      reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleEdit = (sop: any) => {
    setForm({
      sop_no: sop.sop_no || '', title: sop.title || '', category: sop.category || 'Production',
      department: sop.department || '', version: sop.version || '1.0',
      effective_date: sop.effective_date || '', review_date: sop.review_date || '',
      status: sop.status || 'Active', prepared_by: sop.prepared_by || '',
      approved_by: sop.approved_by || '', notes: sop.notes || '',
      recipe_id: sop.recipe_id || '',
      compliance_standard: sop.compliance_standard || 'ISO_9001'
    });
    setEditingId(sop.id);
    setChangeReason('');
    setIsOpen(true);
  };

  // Only show latest version of each SOP
  const activeSops = useMemo(() => sops.filter(s => s.superseded_by === null), [sops]);

  const filteredSops = useMemo(() =>
    filterRecipe
     ? (filterRecipe === '__general__'? activeSops.filter(s =>!(s as any).recipe_id) : activeSops.filter(s => (s as any).recipe_id === filterRecipe))
      : activeSops
 , [activeSops, filterRecipe]);

  const stats = [
    { label: 'Total SOPs', val: activeSops.length, color: '#FFC107' },
    { label: 'Active', val: activeSops.filter(s => s.status === 'Active').length, color: '#22C55E' },
    { label: 'Draft', val: activeSops.filter(s => s.status === 'Draft').length, color: '#94A3B8' },
    { label: 'Review Due', val: activeSops.filter(s => s.review_date && new Date(s.review_date) < new Date()).length, color: '#EF4444' },
    { label: 'Product-Specific', val: activeSops.filter(s =>!!(s as any).recipe_id).length, color: '#C084FC' },
  ];

  if (loading || rLoading) return <div style={{ padding: 40 }}>Loading SOPs...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">FSMS · ISO 9001 Cl. 7.5 · Document Control</p>
            <h1 className="bos-page-title">SOP Register</h1>
            <p className="bos-page-sub">Versioned SOPs · Approval workflow · 21 CFR Part 11 audit trail</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => {
            setForm({ sop_no: '', title: '', category: 'Production', department: '', version: '1.0', effective_date: '', review_date: '', status: 'Active', prepared_by: user?.name || '', approved_by: '', notes: '', recipe_id: '', compliance_standard: 'ISO_9001' });
            setEditingId(null);
            setIsOpen(true);
          }}>+ New SOP</button>}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(123,169,123,0.1)' }}>
          <div style={{ fontSize: 12, color: '#9AAF96', fontWeight: 600 }}>Filter by Product:</div>
          <select className="bos-form-field" style={{ maxWidth: 300 }} value={filterRecipe} onChange={e => setFilterRecipe(e.target.value)}>
            <option value="">All SOPs</option>
            <option value="__general__">General Only</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="bos-tbl-wrap">
          <table className="bos-tbl">
            <thead><tr><th>SOP No.</th><th>Title</th><th>Product</th><th>Version</th><th>Effective</th><th>Review Due</th><th>Status</th><th>Approved By</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredSops.map(s => {
                const recipe = recipes.find(r => r.id === (s as any).recipe_id);
                const reviewDue = s.review_date && new Date(s.review_date) < new Date();
                return (
                  <tr key={s.id}>
                    <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{s.sop_no}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.title}</td>
                    <td style={{ fontSize: 11 }}>
                      {recipe
                       ? <span className="bos-badge bos-badge-purple">📦 {recipe.name}</span>
                        : <span style={{ color: '#9AAF96' }}>General</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>v{s.version}</td>
                    <td style={{ fontSize: 12 }}>{s.effective_date || '—'}</td>
                    <td style={{ fontSize: 12, color: reviewDue? '#EF4444' : '#9AAF96' }}>
                      {s.review_date || '—'} {reviewDue && '⚠️'}
                    </td>
                    <td>
                      <span className={`bos-badge ${s.status === 'Active'? 'bos-badge-green' : s.status === 'Draft'? 'bos-badge-gray' : 'bos-badge-yellow'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{s.approved_by || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && <button className="bos-btn bos-btn-sm" onClick={() => handleEdit(s)}>✏️</button>}
                        {canApprove && s.status === 'Draft' && (
                          <button className="bos-btn bos-btn-sm bos-btn-green" onClick={() => handleApprove(s.id)}>✓ Approve</button>
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

      {isOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal" style={{ maxWidth: 700 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">📋 {editingId? 'New Version' : 'New SOP'} - ISO 9001 Compliant</span>
              <button className="bos-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">SOP No. *</label><input className="bos-form-field" value={form.sop_no} onChange={e => setForm({...form, sop_no: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Version *</label><input className="bos-form-field" value={form.version} onChange={e => setForm({...form, version: e.target.value})} /></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">Title *</label><input className="bos-form-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Compliance Standard</label>
                  <select className="bos-form-field" value={form.compliance_standard} onChange={e => setForm({...form, compliance_standard: e.target.value})}>
                    {COMPLIANCE_STANDARDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="bos-form-group"><label className="bos-form-label">Category</label><select className="bos-form-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Effective Date</label><input className="bos-form-field" type="date" value={form.effective_date} onChange={e => setForm({...form, effective_date: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Next Review Date</label><input className="bos-form-field" type="date" value={form.review_date} onChange={e => setForm({...form, review_date: e.target.value})} /></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">📦 Link to Product</label>
                  <select className="bos-form-field" value={form.recipe_id || ''} onChange={e => setForm({...form, recipe_id: e.target.value || null})}>
                    <option value="">-- General SOP --</option>
                    {recipes.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              {editingId && (
                <div className="bos-form-group" style={{ marginTop: 12 }}>
                  <label className="bos-form-label">Change Reason * (ISO 9001 Cl. 7.5.3)</label>
                  <textarea className="bos-form-field" rows={2} value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Why is this SOP being updated?" />
                </div>
              )}
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving? 'Saving...' : 'Save as Draft'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
