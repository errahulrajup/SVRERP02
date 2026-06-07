import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useRndFormulas } from '../../hooks';
import { useProducts } from '../../hooks/useBos';
import { rndFormulasApi, rndMasterParamsApi, rndFormulaParamsApi } from '../../lib/rndApi';
import { bosProductsApi } from '../../lib/bosApi';
import type { RndFormula, RndFormulaStatus, RndMasterParameter } from '../../types/rnd';
import type { Product } from '../../types/bos';
import { fmtDate, fmtCost } from '../../types/rnd';

type FormulaForm = {
  formula_code: string;
  name: string;
  description: string;
  version: number;
  erp_product_id: string;
};

const EMPTY_FORMULA: FormulaForm = {
  formula_code: '',
  name: '',
  description: '',
  version: 1,
  erp_product_id: '',
};

const FILTERS: Array<'ALL' | RndFormulaStatus> = ['ALL', 'DRAFT', 'UNDER_TRIAL', 'APPROVED', 'LOCKED', 'ARCHIVED'];

export function FormulationManager() {
  const navigate = useNavigate();
  const { items: formulas, loading, error, reload } = useRndFormulas();
  const { items: productsData, reload: reloadProducts } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RndFormulaStatus>('ALL');
  const [editingFormula, setEditingFormula] = useState<RndFormula | null>(null);
  const [form, setForm] = useState<FormulaForm>(EMPTY_FORMULA);
  const [masterParams, setMasterParams] = useState<RndMasterParameter[]>([]);
  const [selectedParams, setSelectedParams] = useState<Record<string, { active: boolean, value: string, unit: string }>>({});

  useEffect(() => {
    rndMasterParamsApi.list().then(res => setMasterParams(res.data || []));
  }, []);

  // New product creation state inside formulation manager
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku_code: '',
    category: 'General',
    unit: 'kg',
    gst_pct: 18,
  });
  const [productSaving, setProductSaving] = useState(false);

  const filteredFormulas = useMemo(() => {
    return formulas.filter((formula) => {
      const matchesSearch = [formula.formula_code, formula.name, formula.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || formula.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [formulas, search, statusFilter]);

  const resetForm = () => {
    setForm(EMPTY_FORMULA);
    setEditingFormula(null);
    setIsCreatingProduct(false);
    setSelectedParams({});
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (formula: RndFormula) => {
    setEditingFormula(formula);
    setIsCreatingProduct(false);
    setForm({
      formula_code: formula.formula_code,
      name: formula.name,
      description: formula.description ?? '',
      version: formula.version,
      erp_product_id: formula.erp_product_id ?? '',
    });
    setSelectedParams({});
    setIsFormOpen(true);
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim() || !newProductForm.sku_code.trim()) {
      alert('Product Name and SKU Code are required');
      return;
    }
    setProductSaving(true);
    try {
      const slug = newProductForm.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const res = await bosProductsApi.create({
        name: newProductForm.name.trim(),
        sku_code: newProductForm.sku_code.trim().toUpperCase(),
        slug,
        category: newProductForm.category,
        unit: newProductForm.unit,
        gst_pct: Number(newProductForm.gst_pct) || 18,
        is_active: true,
      } as any);
      if (res.error) {
        alert('Failed to create product: ' + res.error.message);
        return;
      }
      alert('Product created successfully and selected!');
      await reloadProducts();
      setForm(prev => ({
        ...prev,
        erp_product_id: res.data!.id,
        name: res.data!.name,
      }));
      setIsCreatingProduct(false);
      setNewProductForm({ name: '', sku_code: '', category: 'General', unit: 'kg', gst_pct: 18 });
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProductSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.formula_code.trim() || !form.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    const existing = formulas.find(f => f.formula_code === form.formula_code.trim().toUpperCase());
    if (existing && existing.id !== editingFormula?.id) {
      alert('Formula code already exists');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        formula_code: form.formula_code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        version: Number(form.version) || 1,
        erp_product_id: form.erp_product_id || null,
        target_ph: null,
        target_brix: null,
        target_sg: null,
      };

      if (editingFormula) {
        await rndFormulasApi.update(editingFormula.id, payload);
      } else {
        const { data, error } = await rndFormulasApi.create({
          ...payload,
          status: 'DRAFT',
          validation_status: 'PENDING',
          validation_notes: null,
          total_cost_per_kg: 0,
          created_by: null,
          approved_by: null,
        });
        if (error) {
          if (error.message.includes('duplicate key') || error.message.includes('formula_code')) {
            alert('Formula code already exists — please choose a different code');
          } else {
            alert('Failed to save formula: ' + error.message);
          }
          return;
        }
        if (!data) return;
        
        // Add dynamic params
        const paramPromises = Object.entries(selectedParams)
          .filter(([_, p]) => p.active)
          .map(([name, p]) => rndFormulaParamsApi.create({
            formula_id: data.id,
            param_name: name,
            unit: p.unit || null,
            target_value: p.value ? Number(p.value) : null,
            sort_order: 0,
            target_min: null,
            target_max: null,
            test_method: null,
            notes: null
          }));
        await Promise.all(paramPromises);
      }

      setIsFormOpen(false);
      resetForm();
      reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this formula?')) return;
    try {
      await rndFormulasApi.remove(id);
      reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) return <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Formulations...</div></div>;

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div className="bos-flex-between">
          <div>
            <h1 className="bos-page-title">Formulation Intelligence</h1>
            <p className="bos-page-sub">Recipe versioning, target specs, and draft management.</p>
          </div>
          <div className="bos-flex" style={{ gap: 12, flexWrap: 'wrap' }}>
            <input
              className="bos-form-field"
              placeholder="Search formulas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 200, width: 'auto' }}
            />
            <select className="bos-form-field" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | RndFormulaStatus)}>
              {FILTERS.map((value) => (
                <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : value}</option>
              ))}
            </select>
            <button className="bos-btn bos-btn-primary" onClick={openCreate}>+ New Formulation</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bos-alert bos-alert-danger" style={{ marginBottom: 20 }}>
          Unable to load formulation data: {error}
        </div>
      )}

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 24, borderLeft: '3.5px solid var(--bos-blue)' }}>
          <div className="bos-card-title">{editingFormula ? 'Update Formula Metadata' : 'Initialize New Formula'}</div>
          
          <div className="bos-form-grid" style={{ gap: 16 }}>
            {/* Catalog finished product linkage */}
            <div className="bos-form-span2" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', background: 'var(--bos-bg3)', padding: 12, borderRadius: '6px', border: '1px solid var(--bos-border2)' }}>
              <div style={{ flex: 1 }}>
                <label className="bos-form-label">Link to ERP Finished Product Catalog *</label>
                <select
                  className="bos-form-field"
                  style={{ width: '100%', fontSize: 13 }}
                  value={form.erp_product_id}
                  onChange={(e) => {
                    const selectedProd = (productsData || []).find((p: Product) => p.id === e.target.value);
                    setForm({ ...form, erp_product_id: e.target.value, name: form.name || (selectedProd ? selectedProd.name : form.name) });
                  }}
                >
                  <option value="">-- Choose Product from ERP Catalog --</option>
                  {(productsData || []).filter((p: Product) => p.is_active).map((p: Product) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku_code})</option>
                  ))}
                </select>
              </div>
              {!editingFormula && (
                <button
                  type="button"
                  className="bos-btn bos-btn-ghost bos-btn-sm"
                  onClick={() => setIsCreatingProduct(p => !p)}
                  style={{ whiteSpace: 'nowrap', height: 'fit-content' }}
                >
                  {isCreatingProduct ? '✕ Cancel' : '+ Create New Product'}
                </button>
              )}
            </div>

            {/* New Product Inline Creation Wizard */}
            {isCreatingProduct && !editingFormula && (
              <div className="bos-form-span2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, background: 'var(--bos-gold-soft)', padding: 16, borderRadius: '6px', border: '1px solid var(--bos-gold-border)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label" style={{ color: 'var(--bos-text2)' }}>New Product Name *</label>
                  <input className="bos-form-field" style={{ width: '100%', fontSize: 12 }} placeholder="e.g. Premium Margarine" value={newProductForm.name} onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="bos-form-label" style={{ color: 'var(--bos-text2)' }}>SKU Code *</label>
                  <input className="bos-form-field" style={{ width: '100%', fontSize: 12 }} placeholder="e.g. SKU-MARG-PREM" value={newProductForm.sku_code} onChange={e => setNewProductForm({ ...newProductForm, sku_code: e.target.value })} />
                </div>
                <div>
                  <label className="bos-form-label" style={{ color: 'var(--bos-text2)' }}>Category</label>
                  <input className="bos-form-field" style={{ width: '100%', fontSize: 12 }} placeholder="Spreads" value={newProductForm.category} onChange={e => setNewProductForm({ ...newProductForm, category: e.target.value })} />
                </div>
                <div>
                  <label className="bos-form-label" style={{ color: 'var(--bos-text2)' }}>Unit</label>
                  <input className="bos-form-field" style={{ width: '100%', fontSize: 12 }} placeholder="kg" value={newProductForm.unit} onChange={e => setNewProductForm({ ...newProductForm, unit: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="bos-form-label" style={{ color: 'var(--bos-text2)' }}>GST %</label>
                  <input className="bos-form-field" type="number" style={{ width: '100%', fontSize: 12 }} value={newProductForm.gst_pct} onChange={e => setNewProductForm({ ...newProductForm, gst_pct: Number(e.target.value) })} />
                </div>
                <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <button type="button" className="bos-btn bos-btn-primary bos-btn-sm" onClick={handleCreateProduct} disabled={productSaving}>
                    {productSaving ? 'Saving...' : 'Save & Select'}
                  </button>
                </div>
              </div>
            )}

            <div className="bos-form-span2">
              <label className="bos-form-label">Formula Code *</label>
              <input className="bos-form-field" style={{ width: '100%' }} placeholder="e.g. CR-001" value={form.formula_code} onChange={(e) => setForm({ ...form, formula_code: e.target.value })} />
            </div>
            <div>
              <label className="bos-form-label">Formula Name *</label>
              <input className="bos-form-field" style={{ width: '100%' }} placeholder="e.g. Plant-Based Cooking Cream" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="bos-form-label">Version</label>
              <input className="bos-form-field" type="number" step="0.1" style={{ width: '100%' }} value={form.version} onChange={(e) => setForm({ ...form, version: Number(e.target.value) })} />
            </div>
            <div className="bos-form-span2">
              <label className="bos-form-label">Description / Objective</label>
              <input className="bos-form-field" style={{ width: '100%' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Target Specifications Selection Checklist */}
            {!editingFormula ? (
              <div className="bos-form-span2" style={{ background: 'var(--bos-bg3)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--bos-border2)', marginTop: 8 }}>
                <div className="bos-form-label" style={{ marginBottom: 8 }}>Select Initial Target Parameters for this Recipe:</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {masterParams.map(mp => (
                    <label key={mp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bos-text2)' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedParams[mp.name]?.active || false} 
                        onChange={e => setSelectedParams(prev => ({
                          ...prev,
                          [mp.name]: { active: e.target.checked, value: prev[mp.name]?.value || '', unit: mp.default_unit || '' }
                        }))} 
                      />
                      {mp.name} {mp.default_unit ? `(${mp.default_unit})` : ''}
                    </label>
                  ))}
                  {masterParams.length === 0 && <span style={{ color: 'var(--bos-text4)', fontSize: 12 }}>No master parameters configured. Manage them in Settings.</span>}
                </div>
                
                {/* Inputs for selected params */}
                {Object.entries(selectedParams).filter(([_, p]) => p.active).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
                    {Object.entries(selectedParams).filter(([_, p]) => p.active).map(([name, p]) => (
                      <div key={name}>
                        <label className="bos-form-label">Target {name}</label>
                        <input 
                          className="bos-form-field" 
                          type="number" 
                          step="any" 
                          style={{ width: '100%' }} 
                          value={p.value} 
                          placeholder={`Value ${p.unit ? `in ${p.unit}` : ''}`}
                          onChange={(e) => setSelectedParams(prev => ({ ...prev, [name]: { ...p, value: e.target.value } }))} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bos-form-span2" style={{ padding: '12px 16px', background: 'var(--bos-blue-bg)', borderRadius: 8, border: '1px dashed var(--bos-blue-border)' }}>
                <span style={{ fontSize: 12, color: 'var(--bos-blue)' }}>ℹ️ Target parameters for existing formulas can be managed inside the <b>Formula Builder</b>.</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingFormula ? '💾 Update Formula' : '🚀 Create Draft'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        {filteredFormulas.length === 0 ? (
          <div className="bos-empty">No formulations match the current filters.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name / Description</th>
                  <th>Version</th>
                  <th>Target Specs</th>
                  <th>Est. Cost/kg</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFormulas.map((f) => (
                  <tr key={f.id}>
                    <td className="bos-tbl-mono">{f.formula_code}</td>
                    <td>
                      <div className="bos-tbl-primary">{f.name}</div>
                      {f.description && <div className="bos-text-muted" style={{ fontSize: 11, marginTop: 2 }}>{f.description}</div>}
                    </td>
                    <td>v{(f.version ?? 1).toFixed(1)}</td>
                    <td style={{ fontSize: 11, color: 'var(--bos-text2)' }}>
                      {f.target_ph ? `pH: ${f.target_ph}` : ''}
                      {f.target_brix ? ` | Bx: ${f.target_brix}` : ''}
                      {f.target_sg ? ` | SG: ${f.target_sg}` : ''}
                      {!f.target_ph && !f.target_brix && !f.target_sg && '—'}
                    </td>
                    <td className="bos-text-gold" style={{ fontWeight: 500 }}>{fmtCost(f.total_cost_per_kg)}</td>
                    <td>
                      <span className={`bos-badge bos-badge-${f.status === 'LOCKED' ? 'gold' : f.status === 'APPROVED' ? 'green' : f.status === 'DRAFT' ? 'gray' : f.status === 'UNDER_TRIAL' ? 'blue' : 'orange'}`}>{f.status}</span>
                    </td>
                    <td className="bos-text-muted">{fmtDate(f.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="bos-btn bos-btn-primary bos-btn-sm" onClick={() => navigate(`/rnd/formulations/${f.id}`)}>Build →</button>
                        <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => openEdit(f)}>Edit</button>
                        {f.status === 'DRAFT' && <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(f.id)}>Del</button>}
                      </div>
                    </td>
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
