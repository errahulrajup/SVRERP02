import { useMemo, useState } from 'react';
import { useRndIngredients } from '../../hooks';
import { rndIngredientsApi } from '../../lib/rndApi';
import type { RndIngredient } from '../../types/rnd';
import { fmtCost } from '../../types/rnd';
import { showToast } from '../../lib/toast';

const EMPTY_INGREDIENT = {
  name: '',
  category: 'Hydrocolloid',
  functionality: '',
  supplier: '',
  cost_per_kg: '',
  ph_min: '',
  ph_max: '',
  usage_min_pct: '',
  usage_max_pct: '',
  heat_stability: '',
  notes: '',
};

const CATEGORIES = ['Hydrocolloid', 'Emulsifier', 'Sweetener', 'Acidulant', 'Flavor', 'Color', 'Preservative', 'Fat/Oil', 'Protein', 'Other'];
const HEAT_STABILITY = ['High', 'Medium', 'Low'];

export function IngredientIntel() {
  const { items: ingredients, loading, error, reload } = useRndIngredients();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [editingIngredient, setEditingIngredient] = useState<RndIngredient | null>(null);
  const [form, setForm] = useState(EMPTY_INGREDIENT);
  const [activeParams, setActiveParams] = useState({
    ph: false,
    usage: false,
    heat: false,
    notes: false,
  });

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ingredient) => {
      const matchesSearch = [ingredient.name, ingredient.category, ingredient.functionality, ingredient.supplier]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || (ingredient.category ?? 'Hydrocolloid') === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, ingredients, search]);

  const resetForm = () => {
    setForm(EMPTY_INGREDIENT);
    setEditingIngredient(null);
    setActiveParams({
      ph: false,
      usage: false,
      heat: false,
      notes: false,
    });
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (ingredient: RndIngredient) => {
    setEditingIngredient(ingredient);
    setForm({
      name: ingredient.name,
      category: ingredient.category ?? 'Hydrocolloid',
      functionality: ingredient.functionality ?? '',
      supplier: ingredient.supplier ?? '',
      cost_per_kg: ingredient.cost_per_kg?.toString() ?? '',
      ph_min: ingredient.ph_min?.toString() ?? '',
      ph_max: ingredient.ph_max?.toString() ?? '',
      usage_min_pct: ingredient.usage_min_pct?.toString() ?? '',
      usage_max_pct: ingredient.usage_max_pct?.toString() ?? '',
      heat_stability: ingredient.heat_stability ?? '',
      notes: ingredient.notes ?? '',
    });
    setActiveParams({
      ph: ingredient.ph_min !== null || ingredient.ph_max !== null,
      usage: ingredient.usage_min_pct !== null || ingredient.usage_max_pct !== null,
      heat: ingredient.heat_stability !== null && ingredient.heat_stability !== '',
      notes: ingredient.notes !== null && ingredient.notes !== '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }

    if (activeParams.ph && form.ph_min !== '' && form.ph_max !== '' && Number(form.ph_min) > Number(form.ph_max)) {
      showToast('pH Min cannot be greater than pH Max', 'error');
      return;
    }

    if (activeParams.usage && form.usage_min_pct !== '' && form.usage_max_pct !== '' && Number(form.usage_min_pct) > Number(form.usage_max_pct)) {
      showToast('Usage Min % cannot be greater than Usage Max %', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        functionality: form.functionality.trim() || null,
        supplier: form.supplier.trim() || null,
        cost_per_kg: form.cost_per_kg !== '' ? Number(form.cost_per_kg) : 0,
        ph_min: (activeParams.ph && form.ph_min !== '') ? Number(form.ph_min) : null,
        ph_max: (activeParams.ph && form.ph_max !== '') ? Number(form.ph_max) : null,
        usage_min_pct: (activeParams.usage && form.usage_min_pct !== '') ? Number(form.usage_min_pct) : null,
        usage_max_pct: (activeParams.usage && form.usage_max_pct !== '') ? Number(form.usage_max_pct) : null,
        heat_stability: (activeParams.heat && form.heat_stability) ? form.heat_stability : null,
        notes: (activeParams.notes && form.notes.trim()) ? form.notes.trim() : null,
        coa_url: null,
      };

      if (editingIngredient) {
        await rndIngredientsApi.update(editingIngredient.id, payload);
      } else {
        await rndIngredientsApi.create({
          ...payload,
          is_active: true,
        });
      }

      setIsFormOpen(false);
      resetForm();
      await reload();
    } catch (e: unknown) {
      showToast('Error: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      await rndIngredientsApi.remove(id);
      await reload();
    } catch (e: unknown) {
      if ((e as Error).message?.toLowerCase().includes('foreign key constraint')) {
        showToast('Cannot delete: This ingredient is currently used in one or more formulations.', 'error');
      } else {
        showToast('Error: ' + (e as Error).message, 'error');
      }
    }
  };

  if (loading) return <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Database...</div></div>;

  return (
    <div className="bos-page">
      <div className="bos-page-header">
        <div className="bos-flex-between">
          <div>
            <h1 className="bos-page-title">Ingredient Intelligence</h1>
            <p className="bos-page-sub">Technical specifications, cost tracking, and functionality database.</p>
          </div>
          <div className="bos-flex" style={{ gap: 12, flexWrap: 'wrap' }}>
            <input className="bos-form-field" placeholder="Search ingredients" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200, width: 'auto' }} />
            <select className="bos-form-field" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <button className="bos-btn bos-btn-primary" onClick={openCreate}>+ Add Ingredient</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bos-alert bos-alert-danger" style={{ marginBottom: 20 }}>
          Unable to load ingredients: {error}
        </div>
      )}

      {isFormOpen && (
        <div className="bos-card" style={{ marginBottom: 24, borderLeft: '3.5px solid var(--bos-blue)' }}>
          <div className="bos-card-title">{editingIngredient ? 'Update Raw Material Specification' : 'New Raw Material Specification'}</div>
          {/* Parameter Selection Checklist */}
          <div style={{ marginBottom: 16, background: 'var(--bos-bg3)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--bos-border2)' }}>
            <div className="bos-form-label" style={{ marginBottom: 8 }}>Select Relevant Specs for this Material:</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bos-text2)' }}>
                <input type="checkbox" checked={activeParams.ph} onChange={e => setActiveParams({ ...activeParams, ph: e.target.checked })} />
                pH Range
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bos-text2)' }}>
                <input type="checkbox" checked={activeParams.usage} onChange={e => setActiveParams({ ...activeParams, usage: e.target.checked })} />
                Usage % Limits
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bos-text2)' }}>
                <input type="checkbox" checked={activeParams.heat} onChange={e => setActiveParams({ ...activeParams, heat: e.target.checked })} />
                Heat Stability
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bos-text2)' }}>
                <input type="checkbox" checked={activeParams.notes} onChange={e => setActiveParams({ ...activeParams, notes: e.target.checked })} />
                Notes / Synergies
              </label>
            </div>
          </div>

          <div className="bos-form-grid" style={{ gap: 16 }}>
            <div>
              <label className="bos-form-label">Material Name *</label>
              <input className="bos-form-field" style={{ width: '100%' }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="bos-form-label">Category</label>
              <select className="bos-form-field" style={{ width: '100%' }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="bos-form-label">Cost / kg (₹)</label>
              <input className="bos-form-field" type="number" step="0.01" style={{ width: '100%' }} value={form.cost_per_kg} onChange={(e) => setForm({ ...form, cost_per_kg: e.target.value })} />
            </div>
            <div>
              <label className="bos-form-label">Functionality</label>
              <input className="bos-form-field" style={{ width: '100%' }} placeholder="e.g. Thickener, Emulsifier" value={form.functionality} onChange={(e) => setForm({ ...form, functionality: e.target.value })} />
            </div>
            <div>
              <label className="bos-form-label">Supplier / Mfr</label>
              <input className="bos-form-field" style={{ width: '100%' }} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>

            {activeParams.heat && (
              <div>
                <label className="bos-form-label">Heat Stability</label>
                <select className="bos-form-field" style={{ width: '100%' }} value={form.heat_stability} onChange={(e) => setForm({ ...form, heat_stability: e.target.value })}>
                  <option value="">-- Select --</option>
                  {HEAT_STABILITY.map((value) => <option key={value}>{value}</option>)}
                </select>
              </div>
            )}

            {activeParams.ph && (
              <div>
                <label className="bos-form-label">pH Range (Min - Max)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="bos-form-field" type="number" step="0.1" placeholder="Min" style={{ width: '50%' }} value={form.ph_min} onChange={(e) => setForm({ ...form, ph_min: e.target.value })} />
                  <input className="bos-form-field" type="number" step="0.1" placeholder="Max" style={{ width: '50%' }} value={form.ph_max} onChange={(e) => setForm({ ...form, ph_max: e.target.value })} />
                </div>
              </div>
            )}

            {activeParams.usage && (
              <div>
                <label className="bos-form-label">Usage % (Min - Max)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="bos-form-field" type="number" step="0.01" placeholder="Min" style={{ width: '50%' }} value={form.usage_min_pct} onChange={(e) => setForm({ ...form, usage_min_pct: e.target.value })} />
                  <input className="bos-form-field" type="number" step="0.01" placeholder="Max" style={{ width: '50%' }} value={form.usage_max_pct} onChange={(e) => setForm({ ...form, usage_max_pct: e.target.value })} />
                </div>
              </div>
            )}

            {activeParams.notes && (
              <div className="bos-form-span2">
                <label className="bos-form-label">Notes / Synergies</label>
                <input className="bos-form-field" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="bos-btn bos-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingIngredient ? '💾 Update Material' : '💾 Save Material'}</button>
            <button className="bos-btn bos-btn-ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="bos-card" style={{ padding: 0 }}>
        {filteredIngredients.length === 0 ? (
          <div className="bos-empty">No ingredients match the current filters.</div>
        ) : (
          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Cost/kg</th>
                  <th>pH Range</th>
                  <th>Usage Range</th>
                  <th>Heat Stb.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td className="bos-tbl-primary">
                      {ingredient.name}
                      {ingredient.functionality && <div className="bos-text-muted" style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>{ingredient.functionality}</div>}
                    </td>
                    <td>{ingredient.category}</td>
                    <td>{ingredient.supplier || '—'}</td>
                    <td className="bos-text-gold" style={{ fontWeight: 500 }}>{fmtCost(ingredient.cost_per_kg)}</td>
                    <td>{(ingredient.ph_min || ingredient.ph_max) ? `${ingredient.ph_min || '?'} - ${ingredient.ph_max || '?'}` : '—'}</td>
                    <td>{(ingredient.usage_min_pct || ingredient.usage_max_pct) ? `${ingredient.usage_min_pct || 0}% - ${ingredient.usage_max_pct || '?'}%` : '—'}</td>
                    <td>
                      <span className={`bos-badge bos-badge-${ingredient.heat_stability === 'High' ? 'green' : ingredient.heat_stability === 'Low' ? 'red' : 'gray'}`}>{ingredient.heat_stability || 'Unknown'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => openEdit(ingredient)}>Edit</button>
                        <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => handleDelete(ingredient.id)}>Del</button>
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
