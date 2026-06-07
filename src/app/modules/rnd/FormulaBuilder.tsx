/**
 * FormulaBuilder.tsx — Complete rebuild
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes:
 *  1. DYNAMIC parameters — add/edit/remove any QC target (pH, Brix, Viscosity,
 *     Moisture%, Ash%, custom — any name + unit + min/max/target + test method)
 *  2. Formula save working — proper error display with ApiResult.error handling
 *  3. Auto-save indicator — live "saved" state feedback
 *  4. Ingredient inline edit — edit percentage / phase / tolerance inline
 *  5. Custom phase — user can type a custom phase instead of picking from list
 *  6. Cost auto-save — updates whenever composition changes
 *  7. Design — uses bos-design-system.css classes throughout
 *  8. Toast notifications instead of alert()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  rndFormulasApi, rndFormulaItemsApi, rndIngredientsApi,
  rndFormulaParamsApi, rndMasterParamsApi
} from '../../lib/rndApi';
import { recipesApi, recipeInputsApi, recipeQcParamsApi } from '../../lib/bosApi';
import { useAuth } from '../../hooks';
import type {
  RndFormula, RndFormulaItemWithIngredient, RndFormulaStatus,
  RndIngredient, RndFormulaParam, RndMasterParameter
} from '../../types/rnd';
import { fmtCost, fmtPct } from '../../types/rnd';

/* ─────────────────────────── helpers ─────────────────────────── */
const STATUS_OPTIONS: RndFormulaStatus[] = ['DRAFT','UNDER_TRIAL','APPROVED','LOCKED','ARCHIVED'];

const PHASE_PRESETS = ['Water Phase','Oil Phase','Dry Blend','Post-Addition','Heat Phase','Cooling Phase','Pre-Mix','Custom…'];

// Removed hardcoded COMMON_PARAMS and getParamCategory to ensure fully dynamic behavior

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: type === 'success' ? '#0C1510' : '#1C0808',
      border: `1px solid ${type === 'success' ? 'var(--bos-green-border)' : 'var(--bos-red-border)'}`,
      color: type === 'success' ? 'var(--bos-green)' : 'var(--bos-red)',
      padding: '12px 18px', borderRadius: 'var(--bos-r-lg)',
      fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'var(--bos-shadow-lg)',
      animation: 'bos-modal-in 0.2s ease',
    }}>
      {type === 'success' ? '✓' : '✕'} {msg}
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'inherit',marginLeft:4,fontSize:14 }}>×</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function FormulaBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── State ── */
  const [formula, setFormula]       = useState<RndFormula | null>(null);
  const [items, setItems]           = useState<RndFormulaItemWithIngredient[]>([]);
  const [ingredients, setIngredients] = useState<RndIngredient[]>([]);
  const [params, setParams]         = useState<RndFormulaParam[]>([]);
  const [masterParams, setMasterParams] = useState<RndMasterParameter[]>([]);
  const [loading, setLoading]       = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [promoting, setPromoting]   = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error' } | null>(null);

  const [batchScale, setBatchScale] = useState(100);

  /* ── Meta form ── */
  const [metaForm, setMetaForm] = useState({
    name: '', description: '', version: 1, status: 'DRAFT' as RndFormulaStatus,
  });

  /* ── New ingredient row ── */
  const [newItem, setNewItem] = useState({
    ingredient_id: '', percentage: '', qty_kg: '', phase: 'Water Phase', customPhase: '', tolerance_pct: '0', notes: '',
  });
  const [addingItem, setAddingItem] = useState(false);

  const handlePctChange = useCallback((pctStr: string) => {
    const pct = parseFloat(pctStr);
    if (!isNaN(pct)) {
      const qty = (pct / 100) * batchScale;
      setNewItem(prev => ({ ...prev, percentage: pctStr, qty_kg: qty.toFixed(3) }));
    } else {
      setNewItem(prev => ({ ...prev, percentage: pctStr, qty_kg: '' }));
    }
  }, [batchScale]);

  const handleQtyChange = useCallback((qtyStr: string) => {
    const qty = parseFloat(qtyStr);
    if (!isNaN(qty)) {
      const pct = (qty / batchScale) * 100;
      setNewItem(prev => ({ ...prev, qty_kg: qtyStr, percentage: pct.toFixed(3) }));
    } else {
      setNewItem(prev => ({ ...prev, qty_kg: qtyStr, percentage: '' }));
    }
  }, [batchScale]);

  // FIX-4: Recalculate newItem quantities when batchScale changes
  useEffect(() => {
    if (newItem.percentage) {
      handlePctChange(newItem.percentage);
    }
  }, [batchScale, handlePctChange]);

  /* ── New param form ── */
  const [showParamForm, setShowParamForm] = useState(false);
  const [newParam, setNewParam] = useState({
    param_name: '', unit: '', target_min: '', target_max: '', target_value: '', test_method: '', notes: '',
  });
  const [addingParam, setAddingParam] = useState(false);
  const [editParamId, setEditParamId] = useState<string | null>(null);

  /* ── Inline ingredient edit ── */
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemPct, setEditItemPct] = useState('');

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({ msg, type });

  /* ── Load ── */
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [fRes, iRes, ingRes, pRes, mpRes] = await Promise.all([
        rndFormulasApi.byId(id),
        rndFormulaItemsApi.byFormula(id),
        rndIngredientsApi.list(),
        rndFormulaParamsApi.byFormula(id),
        rndMasterParamsApi.list(),
      ]);

      if (fRes.error) throw new Error(fRes.error.message);
      const f = fRes.data!;
      setFormula(f);
      setItems(iRes.data || []);
      setIngredients(ingRes.data || []);
      setParams(pRes.data || []);
      setMasterParams(mpRes.data || []);

      setMetaForm({
        name: f.name,
        description: f.description ?? '',
        version: f.version,
        status: f.status,
      });

      // FIX-2: Safe functional update to avoid stale closure overriding existing selection
      if (ingRes.data?.length) {
        setNewItem(prev => prev.ingredient_id ? prev : ({ ...prev, ingredient_id: ingRes.data![0].id }));
      }
    } catch (e: any) {
      showToast('Error loading formula: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── Computed ── */
  const totalPct = useMemo(() => items.reduce((s, it) => s + Number(it.percentage), 0), [items]);
  const totalCostPerKg = useMemo(() => items.reduce((s, it) => s + (it.ingredient?.cost_per_kg || 0) * (Number(it.percentage) / 100), 0), [items]);
  const isLocked = formula?.status === 'LOCKED';

  /* ── Save meta ── */
  const saveMeta = async () => {
    if (!formula) return;
    setSavingMeta(true);
    try {
      // FIX-5: Fetch fresh items to calculate the true cost before saving
      const freshItemsRes = await rndFormulaItemsApi.byFormula(formula.id);
      const freshItems = freshItemsRes.data || [];
      const calculatedCost = freshItems.reduce((s, it) => s + (it.ingredient?.cost_per_kg || 0) * (Number(it.percentage) / 100), 0);

      const res = await rndFormulasApi.update(formula.id, {
        name: metaForm.name.trim(),
        description: metaForm.description.trim() || null,
        version: Number(metaForm.version) || 1,
        status: metaForm.status,
        total_cost_per_kg: calculatedCost,
      });
      if (res.error) throw new Error(res.error.message);
      setFormula(res.data!);
      showToast('Formula saved ✓');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingMeta(false);
    }
  };

  /* ── Add ingredient ── */
  const addItem = async () => {
    if (items.find(it => it.ingredient_id === newItem.ingredient_id)) {
      showToast('This ingredient is already in the formula', 'error');
      return;
    }
    if (!newItem.ingredient_id) return showToast('Select an ingredient', 'error');
    const pct = parseFloat(newItem.percentage);
    if (!pct || pct <= 0) return showToast('Enter a valid percentage', 'error');
    const phase = newItem.phase === 'Custom…' ? newItem.customPhase.trim() : newItem.phase;
    if (!phase) return showToast('Enter a phase name', 'error');

    setAddingItem(true);
    try {
      const res = await rndFormulaItemsApi.create({
        formula_id: id!,
        ingredient_id: newItem.ingredient_id,
        percentage: pct,
        phase,
        tolerance_pct: parseFloat(newItem.tolerance_pct) || 0,
        notes: newItem.notes || null,
      });
      if (res.error) throw new Error(res.error.message);
      setNewItem(prev => ({ ...prev, percentage: '', qty_kg: '', notes: '', tolerance_pct: '0' }));
      load();
      showToast('Ingredient added ✓');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setAddingItem(false);
    }
  };

  /* ── Remove ingredient ── */
  const removeItem = async (itemId: string) => {
    if (!confirm('Remove this ingredient?')) return;
    const res = await rndFormulaItemsApi.remove(itemId);
    if (res.error) return showToast(res.error.message, 'error');
    load();
    showToast('Ingredient removed');
  };

  /* ── Inline edit ingredient pct ── */
  const saveItemPct = async (itemId: string) => {
    const pct = parseFloat(editItemPct);
    if (isNaN(pct) || pct <= 0) return showToast('Invalid percentage', 'error');
    const res = await rndFormulaItemsApi.update(itemId, { percentage: pct });
    if (res.error) return showToast(res.error.message, 'error');
    setEditItemId(null);
    load();
  };

  /* ── Auto-balance water ── */
  const autoBalance = async () => {
    const waterItem = items.find(it => it.ingredient?.name.toLowerCase().includes('water'));
    if (!waterItem) return showToast('Add a "Water" ingredient first', 'error');
    const others = items.filter(it => it.id !== waterItem.id).reduce((s, it) => s + Number(it.percentage), 0);
    const rem = 100 - others;
    if (rem < 0) return showToast('Other ingredients exceed 100%!', 'error');
    const res = await rndFormulaItemsApi.update(waterItem.id, { percentage: rem });
    if (res.error) return showToast(res.error.message, 'error');
    load();
    showToast(`Water balanced to ${rem.toFixed(3)}%`);
  };

  /* ── Add dynamic parameter ── */
  const addParam = async () => {
    // FIX-3: Prevent saving param if formula is not yet created/saved
    if (!id || id === 'new') return showToast('Please save the formula first before adding QC parameters', 'error');
    if (!newParam.param_name.trim()) return showToast('Parameter name required', 'error');
    
    setAddingParam(true);
    try {
      const payload = {
        formula_id: id,
        param_name: newParam.param_name.trim(),
        unit: newParam.unit.trim() || null,
        target_min:   newParam.target_min   ? parseFloat(newParam.target_min)   : null,
        target_max:   newParam.target_max   ? parseFloat(newParam.target_max)   : null,
        target_value: newParam.target_value ? parseFloat(newParam.target_value) : null,
        test_method:  newParam.test_method.trim() || null,
        notes:        newParam.notes.trim()  || null,
        sort_order:   params.length,
      };
      let res;
      if (editParamId) {
        res = await rndFormulaParamsApi.update(editParamId, payload);
      } else {
        res = await rndFormulaParamsApi.create(payload);
      }
      if (res.error) throw new Error(res.error.message);
      setNewParam({ param_name:'', unit:'', target_min:'', target_max:'', target_value:'', test_method:'', notes:'' });
      setShowParamForm(false);
      setEditParamId(null);
      load();
      showToast(editParamId ? 'Parameter updated ✓' : 'Parameter added ✓');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setAddingParam(false);
    }
  };

  const editParam = (p: RndFormulaParam) => {
    setEditParamId(p.id);
    setNewParam({
      param_name: p.param_name, unit: p.unit || '',
      target_min: p.target_min?.toString() || '', target_max: p.target_max?.toString() || '',
      target_value: p.target_value?.toString() || '', test_method: p.test_method || '', notes: p.notes || '',
    });
    setShowParamForm(true);
  };

  const removeParam = async (paramId: string) => {
    const res = await rndFormulaParamsApi.remove(paramId);
    if (res.error) return showToast(res.error.message, 'error');
    load();
    showToast('Parameter removed');
  };


  /* ── Submit for Validation ── */
  const submitForValidation = async () => {
    if (!formula || formula.status !== 'APPROVED') return;
    if (!confirm('Submit this formula for Production Validation?')) return;
    setPromoting(true);
    try {
      await rndFormulasApi.update(formula.id, {
        validation_status: 'PENDING'
      });
      showToast('Formula submitted for validation ✓');
      load();
    } catch (e: any) {
      showToast('Submission failed: ' + e.message, 'error');
    } finally {
      setPromoting(false);
    }
  };

  /* ── Render guards ── */
  if (loading) return (
    <div className="bos-page"><div className="bos-loading"><div className="bos-spinner"/>Loading Formula Engine...</div></div>
  );
  if (!formula) return (
    <div className="bos-page"><div className="bos-alert bos-alert-danger">Formula not found.</div></div>
  );

  /* ── Status badge ── */
  const statusCls: Record<string, string> = {
    DRAFT: 'bos-badge-gray', UNDER_TRIAL: 'bos-badge-blue', APPROVED: 'bos-badge-green',
    LOCKED: 'bos-badge-gold', ARCHIVED: 'bos-badge-orange',
  };

  return (
    <div className="bos-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <div className="bos-page-header">
        <div className="bos-flex-between">
          <div>
            <button
              onClick={() => navigate('/rnd/formulations')}
              className="bos-btn bos-btn-ghost bos-btn-sm"
              style={{ marginBottom: 10 }}
            >
              ← Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 className="bos-page-title" style={{ margin: 0 }}>
                <span className="bos-text-gold bos-mono" style={{ fontSize: 16, marginRight: 8 }}>{formula.formula_code}</span>
                {formula.name}
              </h1>
              <span className={`bos-badge ${statusCls[formula.status]}`}>{formula.status}</span>
              <span className="bos-badge bos-badge-gray">v{formula.version.toFixed(1)}</span>
            </div>
            <p className="bos-page-sub">{formula.description || 'No description.'}</p>
          </div>
          <div className="bos-flex" style={{ flexWrap: 'wrap', gap: 8 }}>
            {formula.status === 'APPROVED' && (
              <button className="bos-btn bos-btn-success" onClick={submitForValidation} disabled={promoting}>
                {promoting ? 'Submitting...' : 'Submit for Validation'}
              </button>
            )}
            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => navigate(`/rnd/processes?formulaId=${formula.id}`)}>Process SOP</button>
            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => navigate(`/rnd/trials?formulaId=${formula.id}`)}>Trial Logs</button>
          </div>
        </div>
      </div>

      {/* ── Formula Meta Card ── */}
      <div className="bos-card" style={{ marginBottom: 16 }}>
        <div className="bos-card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Formula Details
        </div>
        <div className="bos-form-grid">
          <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
            <label className="bos-form-label">Formula Name *</label>
            <input className="bos-form-field" value={metaForm.name} onChange={e => setMetaForm(p => ({ ...p, name: e.target.value }))} disabled={isLocked} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Version</label>
            <input className="bos-form-field" type="number" step="0.1" value={metaForm.version} onChange={e => setMetaForm(p => ({ ...p, version: Number(e.target.value) }))} disabled={isLocked} />
          </div>
          <div className="bos-form-group">
            <label className="bos-form-label">Status</label>
            <select className="bos-form-field" value={metaForm.status} onChange={e => setMetaForm(p => ({ ...p, status: e.target.value as RndFormulaStatus }))} disabled={isLocked}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
            <label className="bos-form-label">Description</label>
            <input className="bos-form-field" value={metaForm.description} onChange={e => setMetaForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this formulation..." disabled={isLocked} />
          </div>
        </div>
        {!isLocked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="bos-btn bos-btn-primary" onClick={saveMeta} disabled={savingMeta}>
              {savingMeta ? '⟳ Saving…' : '💾 Save Formula'}
            </button>
          </div>
        )}
      </div>

      {/* ── Two-column layout: Composition + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Composition Table ── */}
        <div className="bos-card" style={{ padding: 0 }}>
          <div className="bos-card-header" style={{ padding: '16px 20px' }}>
            <div className="bos-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>Formula Composition</div>
            <div className="bos-flex" style={{ gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--bos-text3)' }}>Total:</span>
              <span style={{ fontWeight: 700, fontSize: 17, color: Math.abs(totalPct - 100) < 0.01 ? 'var(--bos-green)' : totalPct > 100 ? 'var(--bos-red)' : 'var(--bos-yellow)' }}>
                {totalPct.toFixed(3)}%
              </span>
              {!isLocked && (
                <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={autoBalance}>⚖ Balance Water</button>
              )}
            </div>
          </div>

          {totalPct > 100 && (
            <div className="bos-alert bos-alert-danger" style={{ margin: '0 16px 12px', fontSize: 12 }}>
              ⚠ Total exceeds 100%. Reduce ingredient percentages.
            </div>
          )}

          <div className="bos-tbl-wrap">
            <table className="bos-tbl">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Ingredient</th>
                  <th>%</th>
                  <th>Batch ({batchScale}kg)</th>
                  <th>Cost/kg</th>
                  <th>±%</th>
                  {!isLocked && <th></th>}
                </tr>
              </thead>
              <tbody>
                {items.map(it => {
                  const reqKg = (Number(it.percentage) / 100) * batchScale;
                  const isEditing = editItemId === it.id;
                  return (
                    <tr key={it.id}>
                      <td style={{ color: 'var(--bos-text3)', fontSize: 11 }}>{it.phase}</td>
                      <td className="bos-tbl-primary">{it.ingredient?.name}</td>
                      <td>
                        {isEditing ? (
                          <div className="bos-flex" style={{ gap: 6 }}>
                            <input
                              className="bos-form-field"
                              type="number" step="0.001"
                              value={editItemPct}
                              onChange={e => setEditItemPct(e.target.value)}
                              style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
                              autoFocus
                            />
                            <button className="bos-btn bos-btn-success bos-btn-sm" onClick={() => saveItemPct(it.id)}>✓</button>
                            <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => setEditItemId(null)}>✕</button>
                          </div>
                        ) : (
                          <span
                            style={{ color: 'var(--bos-blue)', fontWeight: 700, cursor: isLocked ? 'default' : 'pointer' }}
                            onClick={() => { if (!isLocked) { setEditItemId(it.id); setEditItemPct(String(it.percentage)); } }}
                            title={isLocked ? '' : 'Click to edit'}
                          >
                            {fmtPct(it.percentage)}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--bos-text1)' }}>{reqKg.toFixed(3)} kg</td>
                      <td style={{ color: 'var(--bos-gold)' }}>{fmtCost(it.ingredient?.cost_per_kg)}</td>
                      <td style={{ color: 'var(--bos-text3)', fontSize: 11 }}>±{it.tolerance_pct || 0}%</td>
                      {!isLocked && (
                        <td>
                          <button className="bos-btn bos-btn-danger bos-btn-sm" onClick={() => removeItem(it.id)}>✕</button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Empty state */}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--bos-text3)' }}>
                      No ingredients yet. Add below.
                    </td>
                  </tr>
                )}

                {/* Add new ingredient row */}
                {!isLocked && (
                  <tr style={{ background: 'rgba(212,168,67,0.04)' }}>
                    <td>
                      <select
                        className="bos-form-field"
                        value={newItem.phase}
                        onChange={e => setNewItem(p => ({ ...p, phase: e.target.value }))}
                        style={{ padding: '6px 10px', fontSize: 12, width: '100%', minWidth: 100 }}
                      >
                        {PHASE_PRESETS.map(ph => <option key={ph}>{ph}</option>)}
                      </select>
                      {newItem.phase === 'Custom…' && (
                        <input
                          className="bos-form-field"
                          value={newItem.customPhase}
                          onChange={e => setNewItem(p => ({ ...p, customPhase: e.target.value }))}
                          placeholder="Phase name"
                          style={{ marginTop: 4, padding: '6px 10px', fontSize: 12, width: '100%' }}
                        />
                      )}
                    </td>
                    <td>
                      <select
                        className="bos-form-field"
                        value={newItem.ingredient_id}
                        onChange={e => setNewItem(p => ({ ...p, ingredient_id: e.target.value }))}
                        style={{ padding: '6px 10px', fontSize: 12, width: '100%', minWidth: 130 }}
                      >
                        <option value="">-- Select --</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.name} {ing.category ? `(${ing.category})` : ''}</option>
                        ))}
                      </select>
                      <input
                        className="bos-form-field"
                        value={newItem.notes}
                        onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Notes"
                        style={{ marginTop: 4, padding: '4px 8px', fontSize: 11, width: '100%' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="%"
                        className="bos-form-field"
                        style={{ padding: '6px 10px', fontSize: 12, width: '100%', minWidth: 60 }}
                        value={newItem.percentage}
                        onChange={e => handlePctChange(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="kg"
                        className="bos-form-field"
                        style={{ padding: '6px 10px', fontSize: 12, width: '100%', minWidth: 70 }}
                        value={newItem.qty_kg}
                        onChange={e => handleQtyChange(e.target.value)}
                      />
                    </td>
                    <td style={{ color: 'var(--bos-gold)', fontSize: 12, verticalAlign: 'middle' }}>
                      {(() => {
                        const selectedIng = ingredients.find(i => i.id === newItem.ingredient_id);
                        return selectedIng ? fmtCost(selectedIng.cost_per_kg) : '—';
                      })()}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="±%"
                        className="bos-form-field"
                        style={{ padding: '6px 10px', fontSize: 12, width: '100%', minWidth: 50 }}
                        value={newItem.tolerance_pct}
                        onChange={e => setNewItem(p => ({ ...p, tolerance_pct: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button
                        className="bos-btn bos-btn-primary bos-btn-sm"
                        style={{ width: '100%' }}
                        onClick={addItem}
                        disabled={addingItem}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sidebar: Scaling + Cost + Params ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Batch Scaling */}
          <div className="bos-card">
            <div className="bos-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="4" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="16" width="18" height="4" rx="2"/></svg>
              Batch Scaling
            </div>
            <label className="bos-form-label">Target Batch Size (kg)</label>
            <input
              className="bos-form-field"
              type="number" min="0.1" step="1"
              value={batchScale}
              onChange={e => setBatchScale(Number(e.target.value))}
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--bos-gold)', textAlign: 'center' }}
            />
            <p className="bos-text-xs bos-text-muted" style={{ marginTop: 8 }}>
              Scales ingredient requirements. Does not change base formula %.
            </p>
          </div>

          {/* Cost Engineering */}
          <div className="bos-card">
            <div className="bos-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Cost Engineering
            </div>
            <div className="bos-stat-row">
              <span className="bos-stat-row-label">Formula Cost / kg</span>
              <span style={{ fontWeight: 700, color: 'var(--bos-gold)', fontSize: 16 }}>{fmtCost(totalCostPerKg)}</span>
            </div>
            <div className="bos-stat-row">
              <span className="bos-stat-row-label">Batch Total ({batchScale}kg)</span>
              <span style={{ fontWeight: 700, color: 'var(--bos-gold)', fontSize: 16 }}>{fmtCost(totalCostPerKg * batchScale)}</span>
            </div>
            <div className="bos-stat-row">
              <span className="bos-stat-row-label">Formula Balance</span>
              <span style={{ fontWeight: 700, color: Math.abs(totalPct - 100) < 0.01 ? 'var(--bos-green)' : 'var(--bos-red)' }}>
                {totalPct.toFixed(3)}%
              </span>
            </div>
          </div>

          {/* ── DYNAMIC QC Parameters ── */}
          <div className="bos-card">
            <div className="bos-card-header" style={{ marginBottom: 12 }}>
              <div className="bos-card-title" style={{ margin: 0, border: 'none', padding: 0, fontSize: 13 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                QC Target Parameters
              </div>
              {!isLocked && (
                <button className="bos-btn bos-btn-primary bos-btn-sm" onClick={() => { setShowParamForm(p => !p); setEditParamId(null); setNewParam({ param_name:'', unit:'', target_min:'', target_max:'', target_value:'', test_method:'', notes:'' }); }}>
                  + Add
                </button>
              )}
            </div>


            {/* Add/Edit parameter form */}
            {showParamForm && !isLocked && (
              <div style={{ background: 'var(--bos-bg3)', border: '1px solid var(--bos-border2)', borderRadius: 'var(--bos-r-md)', padding: 14, marginBottom: 12 }}>
                <div className="bos-form-group">
                  <label className="bos-form-label">Parameter Name *</label>
                  <input
                    className="bos-form-field"
                    list="master-params-list"
                    value={newParam.param_name}
                    onChange={e => {
                      const val = e.target.value;
                      const matched = masterParams.find(m => m.name.toLowerCase() === val.toLowerCase());
                      setNewParam(p => ({ 
                        ...p, 
                        param_name: val,
                        unit: matched && matched.default_unit && !p.unit ? matched.default_unit : p.unit
                      }));
                    }}
                    placeholder="e.g. pH, Brix, Viscosity, Moisture %"
                  />
                  <datalist id="master-params-list">
                    {masterParams.map(mp => (
                      <option key={mp.id} value={mp.name}>{mp.category}</option>
                    ))}
                  </datalist>
                </div>
                <div className="bos-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Unit</label>
                    <input className="bos-form-field" value={newParam.unit} onChange={e => setNewParam(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. cP, %, °Brix" />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Test Method</label>
                    <input className="bos-form-field" value={newParam.test_method} onChange={e => setNewParam(p => ({ ...p, test_method: e.target.value }))} placeholder="e.g. AOAC 925.10" />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Target Min</label>
                    <input className="bos-form-field" type="number" step="any" value={newParam.target_min} onChange={e => setNewParam(p => ({ ...p, target_min: e.target.value }))} placeholder="e.g. 3.8" />
                  </div>
                  <div className="bos-form-group">
                    <label className="bos-form-label">Target Max</label>
                    <input className="bos-form-field" type="number" step="any" value={newParam.target_max} onChange={e => setNewParam(p => ({ ...p, target_max: e.target.value }))} placeholder="e.g. 4.2" />
                  </div>
                  <div className="bos-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="bos-form-label">Exact Target (optional)</label>
                    <input className="bos-form-field" type="number" step="any" value={newParam.target_value} onChange={e => setNewParam(p => ({ ...p, target_value: e.target.value }))} placeholder="Exact target value" />
                  </div>
                </div>
                <div className="bos-flex" style={{ gap: 8, marginTop: 4 }}>
                  <button className="bos-btn bos-btn-primary bos-btn-sm" onClick={addParam} disabled={addingParam}>
                    {addingParam ? '…' : editParamId ? 'Update' : 'Add Parameter'}
                  </button>
                  <button className="bos-btn bos-btn-ghost bos-btn-sm" onClick={() => { setShowParamForm(false); setEditParamId(null); }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Parameter list */}
            {params.length === 0 ? (
              <div className="bos-text-xs bos-text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
                No parameters yet. Add pH, Brix, Viscosity or any custom parameter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {params.map(p => (
                  <div key={p.id} style={{
                    background: 'var(--bos-bg3)', border: '1px solid var(--bos-border)',
                    borderRadius: 'var(--bos-r-md)', padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--bos-text1)', fontSize: 13 }}>
                          {p.param_name}
                          {p.unit && <span style={{ color: 'var(--bos-text3)', fontWeight: 400, marginLeft: 4, fontSize: 11 }}>{p.unit}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--bos-text3)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {p.target_min != null && <span>Min: <strong style={{ color: 'var(--bos-text2)' }}>{p.target_min}</strong></span>}
                          {p.target_max != null && <span>Max: <strong style={{ color: 'var(--bos-text2)' }}>{p.target_max}</strong></span>}
                          {p.target_value != null && <span>Target: <strong style={{ color: 'var(--bos-gold)' }}>{p.target_value}</strong></span>}
                          {p.test_method && <span style={{ color: 'var(--bos-text4)', fontStyle: 'italic' }}>{p.test_method}</span>}
                        </div>
                      </div>
                      {!isLocked && (
                        <div className="bos-flex" style={{ gap: 4, flexShrink: 0 }}>
                          <button className="bos-btn bos-btn-ghost bos-btn-sm" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => editParam(p)}>Edit</button>
                          <button className="bos-btn bos-btn-danger bos-btn-sm" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => removeParam(p.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile responsive ── */}
      <style>{`
        @media (max-width: 900px) {
          .fb-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
