import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRecipes, useProducts, useRecipeInputs, useRecipeSteps } from '../../hooks/useBos';
import { recipesApi, recipeInputsApi, recipeStepsApi, bosProductsApi, recipeQcParamsApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import { RecipeQcParam } from '../../types/bos';
import { RecipeFsmsConfig } from './RecipeFsmsConfig';

const COMMON_QC_PRESETS = [
  { name: 'pH', category: 'Chemical', unit: '', min: '6.5', max: '7.5' },
  { name: 'Brix', category: 'Chemical', unit: '°Brix', min: '10', max: '15' },
  { name: 'Specific Gravity', category: 'Chemical', unit: '', min: '1.01', max: '1.05' },
  { name: 'Moisture', category: 'Chemical', unit: '%', min: '2', max: '5' },
  { name: 'Total Plate Count', category: 'Microbiological', unit: 'CFU/g', min: '0', max: '1000' },
  { name: 'Appearance', category: 'Physical', unit: '', min: '', max: '' },
  { name: 'Colour', category: 'Physical', unit: '', min: '', max: '' },
  { name: 'Odour', category: 'Physical', unit: '', min: '', max: '' },
];

export function RecipeEngine() {
  const { items: recipes, loading: rLoading, reload: reloadRecipes } = useRecipes();
  const { items: products, loading: pLoading, reload: reloadProducts } = useProducts();
  const { items: allInputs, reload: reloadInputs } = useRecipeInputs();
  const { items: allSteps, reload: reloadSteps } = useRecipeSteps();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [pForm, setPForm] = useState({ name: '', sku: '', cat: '', unit: 'kg', gst: '18' });
  const [rForm, setRForm] = useState({ productId: '', name: '', qty: '', unit: 'kg', loss: '2', shelf: '', storage: '', notes: '' });
  const [iForm, setIForm] = useState({ material: '', qty: '', unit: 'kg', tol: '2', notes: '' });
  const [sForm, setSForm] = useState({ stepNo: '', name: '', machine: '', instruction: '', tMin: '', tMax: '', dur: '' });

  const [qcParams, setQcParams] = useState<RecipeQcParam[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);
  const [showQcParamForm, setShowQcParamForm] = useState(false);
  const [editQcParamId, setEditQcParamId] = useState<string | null>(null);
  const [qcParamForm, setQcParamForm] = useState({
    param_name: '', category: 'Chemical', unit: '', target_min: '', target_max: '', target_value: '', test_method: '', notes: ''
  });
  const [savingQcParam, setSavingQcParam] = useState(false);

  const activeRecipe = recipes.find(r => r.id === activeRecipeId);

  const loadQcParams = useCallback(async () => {
    if (!activeRecipeId) {
      setQcParams([]);
      return;
    }
    setLoadingParams(true);
    try {
      const res = await recipeQcParamsApi.byRecipe(activeRecipeId);
      if (res.data) setQcParams(res.data);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoadingParams(false);
    }
  }, [activeRecipeId]);

  useEffect(() => {
    loadQcParams();
  }, [loadQcParams]);

  const handleSaveQcParam = async () => {
    if (!activeRecipeId || !qcParamForm.param_name.trim()) return alert('Parameter name is required');
    setSavingQcParam(true);
    try {
      const payload = {
        recipe_id: activeRecipeId,
        param_name: qcParamForm.param_name.trim(),
        category: qcParamForm.category,
        unit: qcParamForm.unit.trim() || null,
        target_min: qcParamForm.target_min ? parseFloat(qcParamForm.target_min) : null,
        target_max: qcParamForm.target_max ? parseFloat(qcParamForm.target_max) : null,
        target_value: qcParamForm.target_value ? parseFloat(qcParamForm.target_value) : null,
        test_method: qcParamForm.test_method.trim() || null,
        notes: qcParamForm.notes.trim() || null,
        sort_order: qcParams.length
      };

      if (editQcParamId) {
        await recipeQcParamsApi.update(editQcParamId, payload);
      } else {
        await recipeQcParamsApi.create(payload);
      }

      setQcParamForm({ param_name: '', category: 'Chemical', unit: '', target_min: '', target_max: '', target_value: '', test_method: '', notes: '' });
      setShowQcParamForm(false);
      setEditQcParamId(null);
      loadQcParams();
      alert('✅ Parameter saved');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSavingQcParam(false);
    }
  };

  const handleEditQcParam = (p: RecipeQcParam) => {
    setEditQcParamId(p.id);
    setQcParamForm({
      param_name: p.param_name,
      category: p.category,
      unit: p.unit || '',
      target_min: p.target_min != null ? String(p.target_min) : '',
      target_max: p.target_max != null ? String(p.target_max) : '',
      target_value: p.target_value != null ? String(p.target_value) : '',
      test_method: p.test_method || '',
      notes: p.notes || ''
    });
    setShowQcParamForm(true);
  };

  const handleDeleteQcParam = async (pid: string) => {
    if (!confirm('Delete this QC specification?')) return;
    try {
      await recipeQcParamsApi.remove(pid);
      loadQcParams();
      alert('Parameter removed');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleQuickAddQcParam = async (preset: typeof COMMON_QC_PRESETS[number]) => {
    if (qcParams.find(p => p.param_name === preset.name)) {
      return alert('Parameter already exists');
    }
    try {
      await recipeQcParamsApi.create({
        recipe_id: activeRecipeId!,
        param_name: preset.name,
        category: preset.category,
        unit: preset.unit || null,
        target_min: preset.min ? parseFloat(preset.min) : null,
        target_max: preset.max ? parseFloat(preset.max) : null,
        target_value: null,
        test_method: null,
        notes: null,
        sort_order: qcParams.length
      });
      loadQcParams();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };
  const activeInputs = useMemo(() => allInputs.filter(i => i.recipe_id === activeRecipeId), [allInputs, activeRecipeId]);
  const activeSteps = useMemo(() => allSteps.filter(s => s.recipe_id === activeRecipeId), [allSteps, activeRecipeId]);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canEditActive = canEdit && !activeRecipe?.locked;

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const q = search.toLowerCase();
      const p = products.find(x => x.id === r.product_id);
      return !q || r.name.toLowerCase().includes(q) || (p?.name || '').toLowerCase().includes(q) || (p?.sku_code || '').toLowerCase().includes(q);
    });
  }, [recipes, products, search]);

  const handleSaveProduct = async () => {
    if (!pForm.name.trim() || !pForm.sku.trim()) return alert('Name and SKU required');
    setSaving(true);
    try {
      await bosProductsApi.create({
        name: pForm.name.trim(),
        sku_code: pForm.sku.trim(),
        category: pForm.cat.trim(),
        unit: pForm.unit,
        gst_pct: parseFloat(pForm.gst) || 18,
        is_active: true
      });
      alert('✅ Product created');
      setIsProductModalOpen(false);
      setPForm({ name: '', sku: '', cat: '', unit: 'kg', gst: '18' });
      reloadProducts();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleSaveRecipe = async () => {
    if (!rForm.productId || !rForm.name.trim()) return alert('Product and Name required');
    setSaving(true);
    try {
      const { data: saved, error } = await recipesApi.create({
        product_id: rForm.productId,
        name: rForm.name.trim(),
        version: 1,
        is_active: true,
        locked: false,
        output_qty: parseFloat(rForm.qty) || 1,
        output_unit: rForm.unit,
        expected_loss: parseFloat(rForm.loss) || 2,
        shelf_life_days: parseInt(rForm.shelf) || null,
        storage_temp: rForm.storage.trim() || null,
        notes: rForm.notes.trim() || null,
        created_by: user?.name || null,
        approved_by: null
      });
      if (error || !saved) throw new Error(error?.message ?? 'Recipe creation failed');
      alert('✅ Recipe created');
      setIsRecipeModalOpen(false);
      setRForm({ productId: '', name: '', qty: '', unit: 'kg', loss: '2', shelf: '', storage: '', notes: '' });
      reloadRecipes();
      setActiveRecipeId(saved.id);
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleSaveInput = async () => {
    if (!activeRecipeId || !iForm.material.trim() || parseFloat(iForm.qty) <= 0) return alert('Invalid input');
    setSaving(true);
    try {
      await recipeInputsApi.create({
        recipe_id: activeRecipeId,
        material: iForm.material.trim(),
        qty: parseFloat(iForm.qty),
        unit: iForm.unit,
        tolerance: parseFloat(iForm.tol) || 2,
        notes: iForm.notes.trim() || null
      });
      setIsInputModalOpen(false);
      setIForm({ material: '', qty: '', unit: 'kg', tol: '2', notes: '' });
      reloadInputs();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleSaveStep = async () => {
    if (!activeRecipeId || !sForm.name.trim()) return alert('Invalid step');
    setSaving(true);
    try {
      await recipeStepsApi.create({
        recipe_id: activeRecipeId,
        step_no: parseInt(sForm.stepNo) || activeSteps.length + 1,
        step_name: sForm.name.trim(),
        machine: sForm.machine.trim() || null,
        instruction: sForm.instruction.trim() || null,
        temp_min: parseFloat(sForm.tMin) || null,
        temp_max: parseFloat(sForm.tMax) || null,
        duration_min: parseInt(sForm.dur) || null
      });
      setIsStepModalOpen(false);
      setSForm({ stepNo: '', name: '', machine: '', instruction: '', tMin: '', tMax: '', dur: '' });
      reloadSteps();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const approveRecipe = async () => {
    if (!activeRecipeId) return;
    if (!confirm('Approve & lock recipe? Only Admin can unlock.')) return;
    try {
      await recipesApi.update(activeRecipeId, { locked: true, approved_by: user?.name || null });
      alert('✅ Recipe approved & locked!');
      reloadRecipes();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const unlockRecipe = async () => {
    if (user?.role !== 'ADMIN') return alert('Only ADMIN can unlock approved recipes');
    if (!activeRecipeId || !confirm('Admin override: Unlock recipe?')) return;
    try {
      await recipesApi.update(activeRecipeId, { locked: false, approved_by: null });
      alert('🔓 Recipe unlocked');
      reloadRecipes();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const deleteRecipe = async () => {
    if (!activeRecipeId || !confirm('Delete this recipe entirely?')) return;
    try {
      await recipesApi.remove(activeRecipeId);
      setActiveRecipeId(null);
      reloadRecipes();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const deleteInput = async (id: string) => {
    if (!confirm('Delete input?')) return;
    try { await recipeInputsApi.remove(id); reloadInputs(); } catch(e:any) { alert(`Error: ${e.message}`); }
  };

  const deleteStep = async (id: string) => {
    if (!confirm('Delete step?')) return;
    try { await recipeStepsApi.remove(id); reloadSteps(); } catch(e:any) { alert(`Error: ${e.message}`); }
  };

  if (rLoading || pLoading) return <div style={{ padding: 40, color: '#9AAF96' }}>Loading Recipes...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 24px' }}>
      <div className="bos-page-header" style={{ padding: '24px 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="bos-eyebrow">Operations · Recipe</p>
            <h1 className="bos-page-title">Recipe Engine</h1>
            <p className="bos-page-sub">Product recipes · BOM / Inputs · Process steps · Approve & Lock</p>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsProductModalOpen(true)}>+ New Product</button>
              <button className="bos-btn bos-btn-primary" onClick={() => setIsRecipeModalOpen(true)}>+ New Recipe</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left List */}
        <div className="bos-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(123,169,123,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE6' }}>Recipes</span>
            <input className="bos-form-field" placeholder="Search..." style={{ width: 130, padding: '5px 10px', fontSize: 12 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredRecipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#9AAF96', fontSize: 12 }}>No recipes found.</div>
            ) : (
              filteredRecipes.map(r => {
                const prod = products.find(p => p.id === r.product_id);
                const isSelected = r.id === activeRecipeId;
                return (
                  <div key={r.id} onClick={() => setActiveRecipeId(r.id)} style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid',
                    borderColor: isSelected ? 'rgba(212,168,67,0.4)' : 'rgba(123,169,123,0.2)',
                    background: isSelected ? 'rgba(212,168,67,0.08)' : 'transparent',
                    cursor: 'pointer', marginBottom: 6, transition: 'all 0.15s'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE6', marginBottom: 4, display: 'flex', gap: 8 }}>
                      {r.name}
                      {r.locked && <span style={{ fontSize: 9 }} title="Approved & Locked">🔒</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9AAF96', marginBottom: 6 }}>{prod?.name || '—'} ({prod?.sku_code || '—'})</div>
                    <div style={{ fontSize: 10, color: '#9AAF96', display: 'flex', gap: 8 }}>
                      <span>Output: {r.output_qty} {r.output_unit}</span>
                      <span>v{r.version}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail */}
        <div className="bos-card" style={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!activeRecipe ? (
            <div style={{ margin: 'auto', color: '#9AAF96', fontSize: 14 }}>← Select a recipe</div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(123,169,123,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#F0EDE6', marginBottom: 6, display: 'flex', gap: 10 }}>
                      {activeRecipe.name}
                      <span className={`bos-badge ${activeRecipe.locked ? 'bos-badge-green' : 'bos-badge-yellow'}`}>{activeRecipe.locked ? '🔒 Approved & Locked' : '📝 Draft'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#9AAF96' }}>
                      <strong style={{ color: '#F0EDE6' }}>{products.find(p => p.id === activeRecipe.product_id)?.name}</strong>
                      &nbsp;·&nbsp; v{activeRecipe.version}
                    </div>
                  </div>
                  {canEditActive && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => setIsInputModalOpen(true)}>➕ Input</button>
                      <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => { setSForm({...sForm, stepNo: (activeSteps.length + 1).toString()}); setIsStepModalOpen(true); }}>🔧 Step</button>
                    </div>
                  )}
                </div>
                {activeRecipe.notes && <div style={{ marginTop: 10, fontSize: 12, color: '#9AAF96', fontStyle: 'italic' }}>{activeRecipe.notes}</div>}
              </div>

              {/* Specs */}
              <div style={{ padding: '20px 24px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#88C096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>📦 Batch Output Specification</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  <SpecBox label="Output Qty" val={`${activeRecipe.output_qty} ${activeRecipe.output_unit}`} color="#D4A843" />
                  <SpecBox label="Expected Loss" val={`${activeRecipe.expected_loss}%`} color="#D4843A" />
                  <SpecBox label="Shelf Life" val={activeRecipe.shelf_life_days ? `${activeRecipe.shelf_life_days} days` : '—'} color="#5B8FD4" />
                  <SpecBox label="Storage" val={activeRecipe.storage_temp || '—'} color="#9B7ED4" />
                </div>
              </div>

              {/* Inputs */}
              <div style={{ padding: '20px 24px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#88C096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>📋 Raw Material Inputs <span style={{ color: '#9AAF96', fontWeight: 400, fontSize: 10, textTransform: 'none' }}>Per batch</span></div>
                {activeInputs.length === 0 ? (
                  <div className="bos-empty" style={{ padding: 20 }}>No inputs yet.</div>
                ) : (
                  <div className="bos-tbl-wrap">
                    <table className="bos-tbl">
                      <thead><tr><th>#</th><th>Material</th><th>Qty</th><th>Unit</th><th>Tol ±</th>{canEditActive && <th></th>}</tr></thead>
                      <tbody>
                        {activeInputs.map((i, idx) => (
                          <tr key={i.id}>
                            <td style={{ color: '#9AAF96' }}>{idx + 1}</td>
                            <td style={{ color: '#F0EDE6', fontWeight: 500 }}>{i.material}</td>
                            <td style={{ color: '#D4A843', fontWeight: 600 }}>{i.qty}</td>
                            <td>{i.unit}</td>
                            <td>±{i.tolerance}%</td>
                            {canEditActive && <td><button className="bos-btn bos-btn-sm bos-btn-danger" style={{ padding: '3px 8px' }} onClick={() => deleteInput(i.id)}>🗑</button></td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Steps */}
              <div style={{ padding: '20px 24px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#88C096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>🔧 Process Steps</div>
                {activeSteps.length === 0 ? (
                  <div className="bos-empty" style={{ padding: 20 }}>No steps yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeSteps.map(s => (
                      <div key={s.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: '3px solid #5B8FD4' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#9AAF96', flexShrink: 0 }}>{s.step_no}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE6', marginBottom: 4 }}>
                            {s.step_name}
                            {s.machine && <span style={{ fontSize: 11, color: '#9AAF96', fontWeight: 400 }}> · {s.machine}</span>}
                          </div>
                          {s.instruction && <div style={{ fontSize: 12, color: '#9AAF96', marginBottom: 4 }}>{s.instruction}</div>}
                          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9AAF96' }}>
                            {s.temp_min != null && <span>🌡️ {s.temp_min}–{s.temp_max || s.temp_min}°C</span>}
                            {s.duration_min && <span>⏱️ {s.duration_min} min</span>}
                          </div>
                        </div>
                        {canEditActive && <button className="bos-btn bos-btn-sm bos-btn-danger" style={{ padding: '3px 8px' }} onClick={() => deleteStep(s.id)}>🗑</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <RecipeFsmsConfig recipeId={activeRecipeId!} canEdit={canEditActive} />

              {/* QC Target Specifications */}
              <div style={{ padding: '20px 24px 100px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#88C096', textTransform: 'uppercase', letterSpacing: 0.8 }}>📋 QC Specifications & Target Parameters</div>
                  {canEditActive && !showQcParamForm && (
                    <button className="bos-btn bos-btn-sm" style={{ background: '#252D25' }} onClick={() => { setShowQcParamForm(true); setEditQcParamId(null); setQcParamForm({ param_name: '', category: 'Chemical', unit: '', target_min: '', target_max: '', target_value: '', test_method: '', notes: '' }); }}>➕ Specification</button>
                  )}
                </div>

                {/* Quick Add Presets */}
                {canEditActive && !showQcParamForm && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, color: '#9AAF96', alignSelf: 'center' }}>Quick Add:</span>
                    {COMMON_QC_PRESETS.filter(preset => !qcParams.find(p => p.param_name === preset.name)).map(preset => (
                      <button key={preset.name} className="bos-btn bos-btn-ghost bos-btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleQuickAddQcParam(preset)}>
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Add/Edit Form */}
                {showQcParamForm && canEditActive && (
                  <div className="bos-card" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(123,169,123,0.15)', padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#D4A843', marginBottom: 12 }}>{editQcParamId ? 'Edit' : 'Add'} QC Target Parameter</div>
                    <div className="bos-form-grid">
                      <div className="bos-form-group">
                        <label className="bos-form-label">Parameter Name *</label>
                        <input className="bos-form-field" placeholder="e.g. pH, Moisture %" value={qcParamForm.param_name} onChange={e => setQcParamForm({ ...qcParamForm, param_name: e.target.value })} />
                      </div>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Category</label>
                        <select className="bos-form-field" value={qcParamForm.category} onChange={e => setQcParamForm({ ...qcParamForm, category: e.target.value })}>
                          <option>Chemical</option><option>Physical</option><option>Microbiological</option>
                        </select>
                      </div>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Unit (optional)</label>
                        <input className="bos-form-field" placeholder="e.g. % or °Brix" value={qcParamForm.unit} onChange={e => setQcParamForm({ ...qcParamForm, unit: e.target.value })} />
                      </div>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Test Method (optional)</label>
                        <input className="bos-form-field" placeholder="e.g. IS 5402" value={qcParamForm.test_method} onChange={e => setQcParamForm({ ...qcParamForm, test_method: e.target.value })} />
                      </div>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Target Min</label>
                        <input className="bos-form-field" type="number" step="any" placeholder="Min value" value={qcParamForm.target_min} onChange={e => setQcParamForm({ ...qcParamForm, target_min: e.target.value })} />
                      </div>
                      <div className="bos-form-group">
                        <label className="bos-form-label">Target Max</label>
                        <input className="bos-form-field" type="number" step="any" placeholder="Max value" value={qcParamForm.target_max} onChange={e => setQcParamForm({ ...qcParamForm, target_max: e.target.value })} />
                      </div>
                      <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="bos-form-label">Notes</label>
                        <input className="bos-form-field" placeholder="Verification notes or limits" value={qcParamForm.notes} onChange={e => setQcParamForm({ ...qcParamForm, notes: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="bos-btn bos-btn-primary bos-btn-sm" onClick={handleSaveQcParam} disabled={savingQcParam}>
                        {savingQcParam ? 'Saving...' : editQcParamId ? 'Update Specification' : 'Add Specification'}
                      </button>
                      <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => { setShowQcParamForm(false); setEditQcParamId(null); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Specs List */}
                {qcParams.length === 0 ? (
                  <div className="bos-empty" style={{ padding: 20 }}>No custom QC parameters set. QC inspections will fall back to default template.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {qcParams.map(p => (
                      <div key={p.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: '3px solid #FFC107' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE6', marginBottom: 4 }}>
                            {p.param_name}
                            <span style={{ fontSize: 11, color: '#9AAF96', fontWeight: 400, marginLeft: 8 }}>({p.category})</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9AAF96', flexWrap: 'wrap' }}>
                            {p.target_min != null && <span>Min Limit: <strong>{p.target_min}</strong> {p.unit}</span>}
                            {p.target_max != null && <span>Max Limit: <strong>{p.target_max}</strong> {p.unit}</span>}
                            {p.test_method && <span>Protocol: <em>{p.test_method}</em></span>}
                            {p.notes && <span>({p.notes})</span>}
                          </div>
                        </div>
                        {canEditActive && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button className="bos-btn bos-btn-sm" style={{ padding: '3px 8px', fontSize: 11, background: '#252D25' }} onClick={() => handleEditQcParam(p)}>✏️</button>
                            <button className="bos-btn bos-btn-danger bos-btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDeleteQcParam(p.id)}>🗑</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div style={{ marginTop: 'auto', padding: '14px 24px', borderTop: '1px solid rgba(123,169,123,0.2)', background: '#1A2118', position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeRecipe.locked ? (
                  <>
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#88C096' }}>🔒 Recipe approved & locked — ready for production.</div>
                    <div style={{ flex: 1 }} />
                    {user?.role === 'ADMIN' && <button className="bos-btn bos-btn-sm bos-btn-ghost" onClick={unlockRecipe}>🔓 Unlock (Admin)</button>}
                  </>
                ) : canEdit ? (
                  <>
                    <button className="bos-btn bos-btn-sm bos-btn-danger" onClick={deleteRecipe}>🗑 Delete</button>
                    <div style={{ flex: 1 }} />
                    <button className="bos-btn bos-btn-primary" style={{ background: '#2B4A34', color: '#88C096' }} onClick={approveRecipe}>✅ Approve & Lock →</button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#9AAF96' }}>👁 View only</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">📦 New Product</span><button className="bos-modal-close" onClick={() => setIsProductModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Product Name *</label><input className="bos-form-field" value={pForm.name} onChange={e=>setPForm({...pForm, name: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">SKU Code *</label><input className="bos-form-field" value={pForm.sku} onChange={e=>setPForm({...pForm, sku: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Category</label><input className="bos-form-field" value={pForm.cat} onChange={e=>setPForm({...pForm, cat: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Unit</label><select className="bos-form-field" value={pForm.unit} onChange={e=>setPForm({...pForm, unit: e.target.value})}><option>kg</option><option>ltr</option><option>pcs</option><option>box</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">GST %</label><input className="bos-form-field" type="number" value={pForm.gst} onChange={e=>setPForm({...pForm, gst: e.target.value})} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveProduct} disabled={saving}>{saving ? 'Saving...' : 'Create Product →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {isRecipeModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">📝 New Recipe</span><button className="bos-modal-close" onClick={() => setIsRecipeModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-group" style={{ marginBottom: 12 }}>
                <label className="bos-form-label">Product *</label>
                <select className="bos-form-field" value={rForm.productId} onChange={e=>setRForm({...rForm, productId: e.target.value})}>
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku_code} - {p.name}</option>)}
                </select>
              </div>
              <div className="bos-form-group" style={{ marginBottom: 12 }}><label className="bos-form-label">Recipe Name *</label><input className="bos-form-field" value={rForm.name} onChange={e=>setRForm({...rForm, name: e.target.value})} /></div>
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Output Qty *</label><input className="bos-form-field" type="number" value={rForm.qty} onChange={e=>setRForm({...rForm, qty: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Unit</label><select className="bos-form-field" value={rForm.unit} onChange={e=>setRForm({...rForm, unit: e.target.value})}><option>kg</option><option>ltr</option><option>pcs</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Loss %</label><input className="bos-form-field" type="number" value={rForm.loss} onChange={e=>setRForm({...rForm, loss: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Shelf Life (days)</label><input className="bos-form-field" type="number" value={rForm.shelf} onChange={e=>setRForm({...rForm, shelf: e.target.value})} /></div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Storage Temp</label><input className="bos-form-field" value={rForm.storage} onChange={e=>setRForm({...rForm, storage: e.target.value})} /></div>
              <div className="bos-form-group" style={{ marginTop: 12 }}><label className="bos-form-label">Notes</label><textarea className="bos-form-field" rows={2} value={rForm.notes} onChange={e=>setRForm({...rForm, notes: e.target.value})} /></div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveRecipe} disabled={saving}>{saving ? 'Saving...' : 'Create Recipe →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsRecipeModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Input Modal */}
      {isInputModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">➕ Add Input</span><button className="bos-modal-close" onClick={() => setIsInputModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Material Name *</label><input className="bos-form-field" value={iForm.material} onChange={e=>setIForm({...iForm, material: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Qty *</label><input className="bos-form-field" type="number" value={iForm.qty} onChange={e=>setIForm({...iForm, qty: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Unit</label><select className="bos-form-field" value={iForm.unit} onChange={e=>setIForm({...iForm, unit: e.target.value})}><option>kg</option><option>ltr</option><option>g</option><option>ml</option><option>pcs</option></select></div>
                <div className="bos-form-group"><label className="bos-form-label">Tolerance ± %</label><input className="bos-form-field" type="number" value={iForm.tol} onChange={e=>setIForm({...iForm, tol: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Notes</label><input className="bos-form-field" value={iForm.notes} onChange={e=>setIForm({...iForm, notes: e.target.value})} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveInput} disabled={saving}>{saving ? 'Saving...' : 'Add Input →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsInputModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Step Modal */}
      {isStepModalOpen && (
        <div className="bos-modal-overlay">
          <div className="bos-modal">
            <div className="bos-modal-header"><span className="bos-modal-title">🔧 Add Process Step</span><button className="bos-modal-close" onClick={() => setIsStepModalOpen(false)}>✕</button></div>
            <div className="bos-modal-body">
              <div className="bos-form-grid">
                <div className="bos-form-group"><label className="bos-form-label">Step No.</label><input className="bos-form-field" type="number" value={sForm.stepNo} onChange={e=>setSForm({...sForm, stepNo: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Step Name *</label><input className="bos-form-field" value={sForm.name} onChange={e=>setSForm({...sForm, name: e.target.value})} /></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Machine</label><input className="bos-form-field" value={sForm.machine} onChange={e=>setSForm({...sForm, machine: e.target.value})} /></div>
                <div className="bos-form-group" style={{ gridColumn: 'span 2' }}><label className="bos-form-label">Instruction</label><textarea className="bos-form-field" rows={2} value={sForm.instruction} onChange={e=>setSForm({...sForm, instruction: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Temp Min (°C)</label><input className="bos-form-field" type="number" value={sForm.tMin} onChange={e=>setSForm({...sForm, tMin: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Temp Max (°C)</label><input className="bos-form-field" type="number" value={sForm.tMax} onChange={e=>setSForm({...sForm, tMax: e.target.value})} /></div>
                <div className="bos-form-group"><label className="bos-form-label">Duration (min)</label><input className="bos-form-field" type="number" value={sForm.dur} onChange={e=>setSForm({...sForm, dur: e.target.value})} /></div>
              </div>
            </div>
            <div className="bos-modal-footer">
              <button className="bos-btn bos-btn-primary" onClick={handleSaveStep} disabled={saving}>{saving ? 'Saving...' : 'Add Step →'}</button>
              <button className="bos-btn bos-btn-ghost" onClick={() => setIsStepModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SpecBox({ label, val, color }: { label: string, val: string, color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(123,169,123,0.1)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#9AAF96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
    </div>
  );
}
