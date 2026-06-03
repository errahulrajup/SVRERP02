import React, { useState, useMemo } from 'react';
import { useSops, useRecipes } from '../../hooks/useBos';
import { sopApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';

const CATEGORIES = ['Production', 'Quality', 'Cleaning & Sanitation', 'Pest Control', 'Allergen', 'Dispatch', 'Storage', 'Maintenance', 'Administration', 'Other'];
const STATUS_OPT = ['Draft', 'Active', 'Under Review', 'Obsolete'];

export function SopRegister() {
  const { items: sops, loading, reload } = useSops();
  const { items: recipes, loading: rLoading } = useRecipes();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterRecipe, setFilterRecipe] = useState('');
  const [form, setForm] = useState({
    sop_no: '', title: '', category: 'Production', department: '',
    version: '1.0', effective_date: '', review_date: '',
    status: 'Active', prepared_by: user?.name || '', approved_by: '', notes: '',
    recipe_id: '' as string | null
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSave = async () => {
    if (!form.sop_no.trim()) return alert('SOP No. required');
    if (!form.title.trim()) return alert('Title required');
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        recipe_id: form.recipe_id || null,
        created_by: user?.id || null 
      };
      if (editingId) {
        await sopApi.update(editingId, payload);
      } else {
        await sopApi.create(payload);
      }
      alert(`✅ SOP ${form.sop_no} saved`);
      setIsOpen(false);
      setEditingId(null);
      setForm({ sop_no: '', title: '', category: 'Production', department: '', version: '1.0', effective_date: '', review_date: '', status: 'Active', prepared_by: user?.name || '', approved_by: '', notes: '', recipe_id: '' });
      reload();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleEdit = (sop: any) => {
    setForm({
      sop_no: sop.sop_no || '', title: sop.title || '', category: sop.category || 'Production', department: sop.department || '',
      version: sop.version || '1.0', effective_date: sop.effective_date || '', review_date: sop.review_date || '',
      status: sop.status || 'Active', prepared_by: sop.prepared_by || '', approved_by: sop.approved_by || '', notes: sop.notes || '',
      recipe_id: sop.recipe_id || ''
    });
    setEditingId(sop.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SOP?')) return;
    try { await sopApi.remove(id); reload(); } catch (e: any) { alert(e.message); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { 
      const res = await sopApi.update(id, { status }); 
      if ((res as any)?.error) throw new Error((res as any).error.message);
      reload(); 
    } catch (e: any) { 
      alert(`Failed to update status: ${e.message}`); 
      reload(); // revert ui state
    }
  };

  const filteredSops = useMemo(() => 
    filterRecipe 
      ? (filterRecipe === '__general__' ? sops.filter(s => !(s as any).recipe_id) : sops.filter(s => (s as any).recipe_id === filterRecipe))
      : sops
  , [sops, filterRecipe]);

  const stats = [
    { label: 'Total SOPs', val: sops.length, color: '#FFC107' },
    { label: 'Active', val: sops.filter(s => s.status === 'Active').length, color: '#22C55E' },
    { label: 'Draft', val: sops.filter(s => s.status === 'Draft').length, color: '#94A3B8' },
    { label: 'Under Review', val: sops.filter(s => s.status === 'Under Review').length, color: '#FDE047' },
    { label: 'Product-Specific', val: sops.filter(s => !!(s as any).recipe_id).length, color: '#C084FC' },
  ];

  if (loading || rLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading SOPs...</div>;

  return (
    <div>
      <div className="bos-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">FSMS · Document Control</p>
            <h1 className="bos-page-title">SOP Register</h1>
            <p className="bos-page-sub">Standard Operating Procedures — version control, review dates</p>
          </div>
          {canEdit && <button className="bos-btn bos-btn-primary" onClick={() => {
            setForm({ sop_no: '', title: '', category: 'Production', department: '', version: '1.0', effective_date: '', review_date: '', status: 'Active', prepared_by: user?.name || '', approved_by: '', notes: '', recipe_id: '' });
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
          <div style={{ fontSize: 12, color: '#9AAF96', fontWeight: 600 }}>Filter by Product Recipe:</div>
          <select className="bos-form-field" style={{ maxWidth: 300 }} value={filterRecipe} onChange={e => setFilterRecipe(e.target.value)}>
            <option value="">All SOPs (General + Product-Specific)</option>
            <option value="__general__">General Only (No product link)</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {filteredSops.length === 0 ? (
          <div className="bos-empty" style={{ padding: 40 }}>No SOPs yet. Add your first SOP to start document control.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead><tr><th>SOP No.</th><th>Title</th><th>Product / Recipe</th><th>Category</th><th>Version</th><th>Effective</th><th>Review Due</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredSops.map(s => {
                    const recipe = recipes.find(r => r.id === (s as any).recipe_id);
                    return (
                    <tr key={s.id}>
                      <td><span style={{ fontFamily: 'monospace', color: '#D4A843' }}>{s.sop_no}</span></td>
                      <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{s.title}</td>
                      <td style={{ fontSize: 11 }}>
                        {recipe 
                          ? <span style={{ background: 'rgba(192,132,252,0.15)', color: '#C084FC', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>📦 {recipe.name}</span>
                          : <span style={{ color: '#9AAF96', fontSize: 11 }}>General</span>}
                      </td>
                      <td style={{ fontSize: 12, color: '#9AAF96' }}>{s.category}</td>
                    <td style={{ fontSize: 12 }}>v{s.version}</td>
                    <td style={{ fontSize: 12, color: '#9AAF96' }}>{s.effective_date || '—'}</td>
                    <td style={{ fontSize: 12, color: s.review_date && new Date(s.review_date) < new Date() ? '#EF4444' : '#9AAF96' }}>
                      {s.review_date || '—'}
                    </td>
                    <td>
                      {canEdit ? (
                        <select className="bos-form-field" style={{ padding: '4px 8px', fontSize: 12 }} value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}>
                          {STATUS_OPT.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <span className={`bos-badge ${s.status === 'Active' ? 'bos-badge-green' : s.status === 'Draft' ? 'bos-badge-gray' : 'bos-badge-yellow'}`}>{s.status}</span>
                      )}
                    </td>
                    <td>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bos-btn bos-btn-sm" onClick={() => handleEdit(s)}>✏️</button>
                          <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(s.id)}>🗑</button>
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
          <div className="bos-modal" style={{ maxWidth: 700 }}>
            <div className="bos-modal-header">
              <span className="bos-modal-title">📋 {editingId ? 'Edit Standard Operating Procedure' : 'New Standard Operating Procedure'}</span>
              <button className="bos-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">SOP No. *</label><input className="bos-form-field" placeholder="e.g. SOP-QC-001" value={form.sop_no} onChange={e => setForm({ ...form, sop_no: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Version</label><input className="bos-form-field" placeholder="1.0" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">Title *</label><input className="bos-form-field" placeholder="SOP title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Category</label><select className="bos-form-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Department</label><input className="bos-form-field" placeholder="e.g. Production" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Effective Date</label><input className="bos-form-field" type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Next Review Date</label><input className="bos-form-field" type="date" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Prepared By</label><input className="bos-form-field" value={form.prepared_by} onChange={e => setForm({ ...form, prepared_by: e.target.value })} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Approved By</label><input className="bos-form-field" placeholder="Manager / QA Head" value={form.approved_by} onChange={e => setForm({ ...form, approved_by: e.target.value })} /></div>
                <div className="bos-form-group" style={{ gridColumn: '1/-1' }}><label className="bos-form-label">📦 Link to Product Recipe (Optional)</label><select className="bos-form-field" value={form.recipe_id || ''} onChange={e => setForm({ ...form, recipe_id: e.target.value || null })}><option value="">-- General SOP (not product-specific) --</option>{recipes.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div className="bos-form-group"><label className="bos-form-label">Status</label><select className="bos-form-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUS_OPT.map(o => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Notes</label><textarea className="bos-form-field" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save SOP →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
