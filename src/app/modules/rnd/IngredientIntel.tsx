import { useMemo, useState } from 'react';
import { useRndIngredients } from '../../hooks';
import { rndIngredientsApi } from '../../lib/rndApi';
import type { RndIngredient } from '../../types/rnd';
import { fmtCost } from '../../types/rnd';

const EMPTY_INGREDIENT = {
  name: '',
  category: 'Hydrocolloid',
  functionality: '',
  supplier: '',
  cost_per_kg: 0,
  ph_min: '',
  ph_max: '',
  usage_min_pct: '',
  usage_max_pct: '',
  heat_stability: 'High',
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

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ingredient) => {
      const matchesSearch = [ingredient.name, ingredient.category, ingredient.functionality, ingredient.supplier]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || ingredient.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, ingredients, search]);

  const resetForm = () => {
    setForm(EMPTY_INGREDIENT);
    setEditingIngredient(null);
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
      cost_per_kg: ingredient.cost_per_kg,
      ph_min: ingredient.ph_min?.toString() ?? '',
      ph_max: ingredient.ph_max?.toString() ?? '',
      usage_min_pct: ingredient.usage_min_pct?.toString() ?? '',
      usage_max_pct: ingredient.usage_max_pct?.toString() ?? '',
      heat_stability: ingredient.heat_stability ?? 'High',
      notes: ingredient.notes ?? '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        functionality: form.functionality.trim() || null,
        supplier: form.supplier.trim() || null,
        cost_per_kg: Number(form.cost_per_kg),
        ph_min: form.ph_min ? Number(form.ph_min) : null,
        ph_max: form.ph_max ? Number(form.ph_max) : null,
        usage_min_pct: form.usage_min_pct ? Number(form.usage_min_pct) : null,
        usage_max_pct: form.usage_max_pct ? Number(form.usage_max_pct) : null,
        heat_stability: form.heat_stability,
        notes: form.notes.trim() || null,
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
      reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      await rndIngredientsApi.remove(id);
      reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading Database...</div>;

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="rnd-title">Ingredient Intelligence</h1>
          <p className="rnd-subtitle">Technical specifications, cost tracking, and functionality database.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input className="rnd-input" placeholder="Search ingredients" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
          <select className="rnd-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All categories</option>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <button className="rnd-btn rnd-btn-primary" onClick={openCreate}>+ Add Ingredient</button>
        </div>
      </div>

      {error && (
        <div className="rnd-card" style={{ marginBottom: 20, borderLeft: '3px solid #f97316', color: '#fed7aa' }}>
          Unable to load ingredients: {error}
        </div>
      )}

      {isFormOpen && (
        <div className="rnd-card" style={{ marginBottom: 24, borderLeft: '3px solid #0ea5e9' }}>
          <div className="rnd-card-header">{editingIngredient ? 'Update Raw Material Specification' : 'New Raw Material Specification'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Material Name *</label>
              <input className="rnd-input" style={{ width: '100%' }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Category</label>
              <select className="rnd-input" style={{ width: '100%' }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Cost / kg (₹)</label>
              <input className="rnd-input" type="number" step="0.01" style={{ width: '100%' }} value={form.cost_per_kg} onChange={(e) => setForm({ ...form, cost_per_kg: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Functionality</label>
              <input className="rnd-input" style={{ width: '100%' }} placeholder="e.g. Thickener, Emulsifier" value={form.functionality} onChange={(e) => setForm({ ...form, functionality: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Supplier / Mfr</label>
              <input className="rnd-input" style={{ width: '100%' }} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Heat Stability</label>
              <select className="rnd-input" style={{ width: '100%' }} value={form.heat_stability} onChange={(e) => setForm({ ...form, heat_stability: e.target.value })}>
                {HEAT_STABILITY.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>pH Range (Min - Max)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="rnd-input" type="number" step="0.1" placeholder="Min" style={{ width: '50%' }} value={form.ph_min} onChange={(e) => setForm({ ...form, ph_min: e.target.value })} />
                <input className="rnd-input" type="number" step="0.1" placeholder="Max" style={{ width: '50%' }} value={form.ph_max} onChange={(e) => setForm({ ...form, ph_max: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Usage % (Min - Max)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="rnd-input" type="number" step="0.01" placeholder="Min" style={{ width: '50%' }} value={form.usage_min_pct} onChange={(e) => setForm({ ...form, usage_min_pct: e.target.value })} />
                <input className="rnd-input" type="number" step="0.01" placeholder="Max" style={{ width: '50%' }} value={form.usage_max_pct} onChange={(e) => setForm({ ...form, usage_max_pct: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Notes / Synergies</label>
              <input className="rnd-input" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="rnd-btn rnd-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingIngredient ? '💾 Update Material' : '💾 Save Material'}</button>
            <button className="rnd-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="rnd-card" style={{ padding: 0 }}>
        {filteredIngredients.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No ingredients match the current filters.</div>
        ) : (
          <table className="rnd-table">
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
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {ingredient.name}
                    {ingredient.functionality && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginTop: 2 }}>{ingredient.functionality}</div>}
                  </td>
                  <td>{ingredient.category}</td>
                  <td>{ingredient.supplier || '—'}</td>
                  <td style={{ color: '#fbbf24', fontWeight: 500 }}>{fmtCost(ingredient.cost_per_kg)}</td>
                  <td>{(ingredient.ph_min || ingredient.ph_max) ? `${ingredient.ph_min || '?'} - ${ingredient.ph_max || '?'}` : '—'}</td>
                  <td>{(ingredient.usage_min_pct || ingredient.usage_max_pct) ? `${ingredient.usage_min_pct || 0}% - ${ingredient.usage_max_pct || '?'}%` : '—'}</td>
                  <td>
                    <span className={`rnd-badge ${ingredient.heat_stability === 'High' ? 'rnd-badge-success' : ingredient.heat_stability === 'Low' ? 'rnd-badge-failed' : 'rnd-badge-draft'}`}>{ingredient.heat_stability || 'Unknown'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openEdit(ingredient)}>Edit</button>
                      <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDelete(ingredient.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
