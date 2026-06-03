import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRndTrials, useRndFormulas } from '../../hooks';
import {
  rndTrialsApi,
  rndProcessesApi,
  rndFormulaParamsApi,
  rndFormulaItemsApi,
  rndTrialParamsApi,
  rndFormulasApi
} from '../../lib/rndApi';
import {
  recipesApi,
  recipeInputsApi,
  recipeStepsApi,
  recipeQcParamsApi
} from '../../lib/bosApi';
import type { RndTrial, RndTrialStatus, RndTrialWithFormula, RndProcess, RndFormulaParam } from '../../types/rnd';
import { fmtDate } from '../../types/rnd';

const EMPTY_TRIAL = {
  trial_no: '',
  formula_id: '',
  batch_size_kg: 10,
  status: 'PLANNED' as RndTrialStatus,
  f0_achieved: '',
  retort_temp_c: '',
  hold_time_min: '',
  actual_yield_kg: '' as string | number,
  actual_ph: '' as string | number,
  actual_brix: '' as string | number,
  sensory_score: '' as string | number,
  sensory_notes: '',
  failure_reason: '',
};

const FILTERS: Array<'ALL' | RndTrialStatus> = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

export function TrialManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: trials, loading: tLoad, error, reload: tReload } = useRndTrials();
  const { items: formulas, loading: fLoad } = useRndFormulas();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RndTrialStatus>('ALL');
  const [formulaFilter, setFormulaFilter] = useState<string>('ALL');
  const [trialIdFilter, setTrialIdFilter] = useState<string | null>(null);
  const [editingTrial, setEditingTrial] = useState<RndTrialWithFormula | null>(null);
  const [form, setForm] = useState(EMPTY_TRIAL);

  /* ── Trial Runner State ── */
  const [activeRunnerTrial, setActiveRunnerTrial] = useState<RndTrialWithFormula | null>(null);
  const [runnerSteps, setRunnerSteps] = useState<RndProcess[]>([]);
  const [runnerParams, setRunnerParams] = useState<RndFormulaParam[]>([]);
  const [runnerFormulaItems, setRunnerFormulaItems] = useState<any[]>([]);
  const [runnerFormula, setRunnerFormula] = useState<any>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [measuredReadings, setMeasuredReadings] = useState<Record<string, string>>({});
  const [measuredNotes, setMeasuredNotes] = useState<Record<string, string>>({});
  const [runnerLoading, setRunnerLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [runnerError, setRunnerError] = useState<string | null>(null);

  const openTrialRunner = async (trial: RndTrialWithFormula) => {
    setActiveRunnerTrial(trial);
    setRunnerLoading(true);
    setRunnerError(null);
    setCheckedSteps({});
    setMeasuredReadings({});
    setMeasuredNotes({});
    
    setForm({
      trial_no: trial.trial_no,
      formula_id: trial.formula_id ?? '',
      batch_size_kg: trial.batch_size_kg,
      status: trial.status,
      f0_achieved: trial.f0_achieved?.toString() ?? '',
      retort_temp_c: trial.retort_temp_c?.toString() ?? '',
      hold_time_min: trial.hold_time_min?.toString() ?? '',
      actual_yield_kg: trial.actual_yield_kg ?? '',
      actual_ph: trial.actual_ph ?? '',
      actual_brix: trial.actual_brix ?? '',
      sensory_score: trial.sensory_score ?? '',
      sensory_notes: trial.sensory_notes ?? '',
      failure_reason: trial.failure_reason ?? '',
    });

    try {
      if (!trial.formula_id) throw new Error('Trial is not linked to any formula');
      
      const [stepsRes, paramsRes, itemsRes, formRes, readingsRes] = await Promise.all([
        rndProcessesApi.byFormula(trial.formula_id),
        rndFormulaParamsApi.byFormula(trial.formula_id),
        rndFormulaItemsApi.byFormula(trial.formula_id),
        rndFormulasApi.byId(trial.formula_id),
        rndTrialParamsApi.byTrial(trial.id)
      ]);

      if (stepsRes.error) throw new Error(stepsRes.error.message);
      if (paramsRes.error) throw new Error(paramsRes.error.message);
      if (itemsRes.error) throw new Error(itemsRes.error.message);
      if (formRes.error) throw new Error(formRes.error.message);

      setRunnerSteps(stepsRes.data || []);
      setRunnerParams(paramsRes.data || []);
      setRunnerFormulaItems(itemsRes.data || []);
      setRunnerFormula(formRes.data || null);

      const readings = readingsRes.data || [];
      const prepReadings: Record<string, string> = {};
      const prepNotes: Record<string, string> = {};
      
      paramsRes.data?.forEach(param => {
        const found = readings.find(r => r.param_name === param.param_name);
        if (found) {
          prepReadings[param.id] = found.measured_value != null ? found.measured_value.toString() : '';
          prepNotes[param.id] = found.notes || '';
        }
      });
      setMeasuredReadings(prepReadings);
      setMeasuredNotes(prepNotes);
    } catch (e: any) {
      setRunnerError(e.message);
    } finally {
      setRunnerLoading(false);
    }
  };

  const getParamResult = (param: RndFormulaParam) => {
    const valStr = measuredReadings[param.id];
    if (!valStr || valStr.trim() === '') return { status: 'PENDING', text: 'Pending', pass: null };
    const val = parseFloat(valStr);
    if (isNaN(val)) return { status: 'INVALID', text: 'Invalid value', pass: false };

    let pass = true;
    if (param.target_min != null && val < param.target_min) pass = false;
    if (param.target_max != null && val > param.target_max) pass = false;
    if (param.target_value != null && val !== param.target_value) pass = false;

    return {
      status: pass ? 'PASS' : 'FAIL',
      text: pass ? 'PASS' : 'FAIL',
      pass
    };
  };

  const getOverallStatus = () => {
    if (runnerParams.length === 0) return 'COMPLETED';
    let hasFail = false;
    let hasPending = false;
    
    for (const p of runnerParams) {
      const res = getParamResult(p);
      if (res.status === 'FAIL' || res.status === 'INVALID') hasFail = true;
      if (res.status === 'PENDING') hasPending = true;
    }

    if (hasFail) return 'FAILED';
    if (hasPending) return 'IN_PROGRESS';
    return 'COMPLETED';
  };

  const saveTrialRunnerReadings = async (targetStatus: RndTrialStatus, failureReason?: string) => {
    if (!activeRunnerTrial) return;
    setSaving(true);
    try {
      const updateRes = await rndTrialsApi.update(activeRunnerTrial.id, {
        status: targetStatus,
        failure_reason: targetStatus === 'FAILED' ? (failureReason || 'One or more parameters failed target spec') : null,
        actual_yield_kg: form.actual_yield_kg !== '' ? Number(form.actual_yield_kg) : null,
        actual_ph: form.actual_ph !== '' ? Number(form.actual_ph) : null,
        actual_brix: form.actual_brix !== '' ? Number(form.actual_brix) : null,
        sensory_score: form.sensory_score !== '' ? Number(form.sensory_score) : null,
        sensory_notes: form.sensory_notes || null,
      });

      if (updateRes.error) throw new Error(updateRes.error.message);

      for (const param of runnerParams) {
        const valStr = measuredReadings[param.id];
        const val = valStr && valStr.trim() !== '' ? parseFloat(valStr) : null;
        const result = getParamResult(param);
        
        await rndTrialParamsApi.upsert({
          trial_id: activeRunnerTrial.id,
          param_name: param.param_name,
          unit: param.unit,
          measured_value: val,
          pass: result.pass,
          notes: measuredNotes[param.id] || null
        });
      }

      alert('Trial logs saved successfully!');
      setActiveRunnerTrial(null);
      tReload();
    } catch (e: any) {
      alert('Error saving trial details: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const promoteToProductionRecipe = async () => {
    if (!activeRunnerTrial || !runnerFormula) return;
    if (!confirm('Are you sure you want to promote this formula to a Master Production Recipe? This will lock the R&D formula.')) return;
    setPromoting(true);
    try {
      const overall = getOverallStatus();
      if (overall !== 'COMPLETED') {
        throw new Error('All QC parameters must PASS to promote the trial to a Production Recipe.');
      }

      const prodId = runnerFormula.erp_product_id;
      if (!prodId) {
        throw new Error('Formula must be linked to a Finished Product in the catalog to be promoted.');
      }

      // Create recipe header
      const recipeRes = await recipesApi.create({
        product_id: prodId,
        name: runnerFormula.name,
        version: runnerFormula.version,
        output_qty: 100,
        output_unit: 'kg',
        expected_loss: 0,
        notes: `Promoted from R&D Trial ${activeRunnerTrial.trial_no}`,
        is_active: true,
        locked: true
      });

      if (recipeRes.error || !recipeRes.data) throw new Error('Recipe creation failed: ' + (recipeRes.error?.message || 'Recipe data is null'));
      const recipeId = recipeRes.data.id;

      // Map formula ingredients to recipe inputs
      for (const item of runnerFormulaItems) {
        const inputRes = await recipeInputsApi.create({
          recipe_id: recipeId,
          material: item.ingredient?.name || 'Unknown Ingredient',
          qty: item.percentage,
          unit: 'kg',
          tolerance: item.tolerance_pct || 0,
          notes: item.notes || null
        });
        if (inputRes.error) throw new Error('Recipe input mapping failed: ' + inputRes.error.message);
      }

      // Map process steps to recipe steps
      for (const step of runnerSteps) {
        const stepRes = await recipeStepsApi.create({
          recipe_id: recipeId,
          step_no: step.step_no,
          step_name: step.step_type || 'Process Step',
          machine: step.machine,
          instruction: step.description,
          temp_min: step.temp_c,
          temp_max: step.temp_c,
          duration_min: step.duration_min
        });
        if (stepRes.error) throw new Error('Recipe step mapping failed: ' + stepRes.error.message);
      }

      // Map specifications to recipe QC parameters
      for (const param of runnerParams) {
        const paramRes = await recipeQcParamsApi.create({
          recipe_id: recipeId,
          param_name: param.param_name,
          category: 'Food Quality',
          unit: param.unit,
          target_min: param.target_min,
          target_max: param.target_max,
          target_value: param.target_value,
          test_method: param.test_method,
          notes: param.notes,
          sort_order: param.sort_order
        });
        if (paramRes.error) throw new Error('Recipe QC Parameter mapping failed: ' + paramRes.error.message);
      }

      // Upsert trial params readings
      for (const param of runnerParams) {
        const valStr = measuredReadings[param.id];
        const val = valStr && valStr.trim() !== '' ? parseFloat(valStr) : null;
        const result = getParamResult(param);
        
        await rndTrialParamsApi.upsert({
          trial_id: activeRunnerTrial.id,
          param_name: param.param_name,
          unit: param.unit,
          measured_value: val,
          pass: result.pass,
          notes: measuredNotes[param.id] || null
        });
      }

      // Update Trial status
      await rndTrialsApi.update(activeRunnerTrial.id, {
        status: 'COMPLETED',
        actual_yield_kg: form.actual_yield_kg !== '' ? Number(form.actual_yield_kg) : null,
        actual_ph: form.actual_ph !== '' ? Number(form.actual_ph) : null,
        actual_brix: form.actual_brix !== '' ? Number(form.actual_brix) : null,
        sensory_score: form.sensory_score !== '' ? Number(form.sensory_score) : null,
        sensory_notes: form.sensory_notes || null,
        failure_reason: null
      });

      // Lock formula
      await rndFormulasApi.update(runnerFormula.id, { status: 'LOCKED' });

      alert('🎉 Trial promoted to Production Recipe successfully! R&D Formulation locked.');
      setActiveRunnerTrial(null);
      tReload();
    } catch (e: any) {
      alert('Error promoting to production recipe: ' + e.message);
    } finally {
      setPromoting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const formulaId = params.get('formulaId');
    const trialId = params.get('trialId');

    setFormulaFilter(formulaId || 'ALL');
    setTrialIdFilter(trialId || null);
  }, [location.search]);

  const loading = tLoad || fLoad;

  const filteredTrials = useMemo(() => {
    return trials.filter((trial) => {
      const matchesSearch = [trial.trial_no, trial.formula?.formula_code, trial.formula?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || trial.status === statusFilter;
      const matchesFormula = formulaFilter === 'ALL' || trial.formula_id === formulaFilter;
      const matchesTrial = !trialIdFilter || trial.id === trialIdFilter;
      return matchesSearch && matchesStatus && matchesFormula && matchesTrial;
    });
  }, [search, statusFilter, formulaFilter, trialIdFilter, trials]);

  const resetForm = () => {
    setForm(EMPTY_TRIAL);
    setEditingTrial(null);
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (trial: RndTrialWithFormula) => {
    setEditingTrial(trial);
    setForm({
      trial_no: trial.trial_no,
      formula_id: trial.formula_id ?? '',
      batch_size_kg: trial.batch_size_kg,
      status: trial.status,
      f0_achieved: trial.f0_achieved?.toString() ?? '',
      retort_temp_c: trial.retort_temp_c?.toString() ?? '',
      hold_time_min: trial.hold_time_min?.toString() ?? '',
      actual_yield_kg: trial.actual_yield_kg ?? '',
      actual_ph: trial.actual_ph ?? '',
      actual_brix: trial.actual_brix ?? '',
      sensory_score: trial.sensory_score ?? '',
      sensory_notes: trial.sensory_notes ?? '',
      failure_reason: trial.failure_reason ?? '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.trial_no.trim() || !form.formula_id) {
      alert('Trial No and Formula are required');
      return;
    }

    // RND-12 FIX: Validate COMPLETED status requires result data
    if (form.status === 'COMPLETED') {
      if (form.actual_yield_kg === '' || form.actual_yield_kg == null || form.actual_ph === '' || form.actual_ph == null) {
        alert('Please enter at least Yield (kg) and pH before marking as COMPLETED');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Partial<RndTrial> = {
        trial_no: form.trial_no.trim().toUpperCase(),
        formula_id: form.formula_id,
        batch_size_kg: Number(form.batch_size_kg),
        status: form.status,
        f0_achieved: form.f0_achieved ? Number(form.f0_achieved) : null,
        retort_temp_c: form.retort_temp_c ? Number(form.retort_temp_c) : null,
        hold_time_min: form.hold_time_min ? Number(form.hold_time_min) : null,
        actual_yield_kg: form.actual_yield_kg !== '' ? Number(form.actual_yield_kg) : null,
        actual_ph: form.actual_ph !== '' ? Number(form.actual_ph) : null,
        actual_brix: form.actual_brix !== '' ? Number(form.actual_brix) : null,
        sensory_score: form.sensory_score !== '' ? Number(form.sensory_score) : null,
        sensory_notes: (form.sensory_notes as string) || null,
        failure_reason: (form.failure_reason as string) || null,
      };

      if (editingTrial) {
        await rndTrialsApi.update(editingTrial.id, payload);
      } else {
        await rndTrialsApi.create({
          ...payload,
          start_time: null,
          end_time: null,
          actual_sg: null,
          stability_notes: null,
          conducted_by: null,
        } as Omit<RndTrial, 'id' | 'created_at'>);
      }

      setIsFormOpen(false);
      resetForm();
      tReload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trial log?')) return;
    try {
      await rndTrialsApi.remove(id);
      tReload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading Trial Logs...</div>;

  return (
    <div style={{ padding: '32px' }}>
      <div className="rnd-header" style={{ padding: '0 0 24px 0', borderBottom: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="rnd-title">Trial Management</h1>
          <p className="rnd-subtitle">Experimental batch tracking, F0 processing logs, and sensory evaluation.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input className="rnd-input" placeholder="Search trials" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
          <select className="rnd-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | RndTrialStatus)}>
            {FILTERS.map((value) => (
              <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : value}</option>
            ))}
          </select>
          <select className="rnd-input" value={formulaFilter} onChange={(e) => setFormulaFilter(e.target.value)}>
            <option value="ALL">All formulas</option>
            {formulas.map((formula) => <option key={formula.id} value={formula.id}>{formula.formula_code}</option>)}
          </select>
          <button className="rnd-btn" onClick={() => { setFormulaFilter('ALL'); setTrialIdFilter(null); setSearch(''); }} disabled={formulaFilter === 'ALL' && !trialIdFilter && !search}>Reset Filters</button>
          <button className="rnd-btn rnd-btn-primary" onClick={openCreate}>+ Log New Trial</button>
        </div>
      </div>

      {error && (
        <div className="rnd-card" style={{ marginBottom: 20, borderLeft: '3px solid #f97316', color: '#fed7aa' }}>
          Unable to load trials: {error}
        </div>
      )}

      {isFormOpen && (
        <div className="rnd-card" style={{ marginBottom: 24, borderLeft: '3px solid #0ea5e9' }}>
          <div className="rnd-card-header">{editingTrial ? 'Update Trial Record' : 'Initialize Trial Batch'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Trial No *</label>
              <input className="rnd-input" style={{ width: '100%' }} placeholder="e.g. TR-2026-001" value={form.trial_no} onChange={(e) => setForm({ ...form, trial_no: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Formula *</label>
              <select className="rnd-input" style={{ width: '100%' }} value={form.formula_id} onChange={(e) => setForm({ ...form, formula_id: e.target.value })}>
                <option value="">-- Select Formula --</option>
                {formulas.map((formula) => <option key={formula.id} value={formula.id}>{formula.formula_code} : {formula.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Status</label>
              <select className="rnd-input" style={{ width: '100%' }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RndTrialStatus })}>
                {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Batch Size (kg) *</label>
              <input className="rnd-input" type="number" step="0.1" style={{ width: '100%' }} value={form.batch_size_kg} onChange={(e) => setForm({ ...form, batch_size_kg: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Target F0</label>
              <input className="rnd-input" type="number" step="0.1" style={{ width: '100%' }} value={form.f0_achieved} onChange={(e) => setForm({ ...form, f0_achieved: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Retort Temp (°C)</label>
              <input className="rnd-input" type="number" step="0.1" style={{ width: '100%' }} value={form.retort_temp_c} onChange={(e) => setForm({ ...form, retort_temp_c: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Hold Time (min)</label>
              <input className="rnd-input" type="number" step="1" style={{ width: '100%' }} value={form.hold_time_min} onChange={(e) => setForm({ ...form, hold_time_min: e.target.value })} />
            </div>
          </div>
          {/* RND-05 FIX: Trial Results Section */}
          {(form.status === 'COMPLETED' || form.status === 'FAILED') ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 12 }}>Trial Results</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="bos-form-group">
                  <label className="bos-form-label">Yield (kg)</label>
                  <input type="number" step="0.01" className="rnd-input" style={{ width: '100%' }}
                    value={form.actual_yield_kg ?? ''}
                    onChange={e => setForm((f: any) => ({...f, actual_yield_kg: e.target.value}))}
                  />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">pH</label>
                  <input type="number" step="0.01" className="rnd-input" style={{ width: '100%' }}
                    value={form.actual_ph ?? ''}
                    onChange={e => setForm((f: any) => ({...f, actual_ph: e.target.value}))}
                  />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Brix</label>
                  <input type="number" step="0.1" className="rnd-input" style={{ width: '100%' }}
                    value={form.actual_brix ?? ''}
                    onChange={e => setForm((f: any) => ({...f, actual_brix: e.target.value}))}
                  />
                </div>
                <div className="bos-form-group">
                  <label className="bos-form-label">Sensory Score (1-10)</label>
                  <input type="number" min="1" max="10" className="rnd-input" style={{ width: '100%' }}
                    value={form.sensory_score ?? ''}
                    onChange={e => setForm((f: any) => ({...f, sensory_score: e.target.value}))}
                  />
                </div>
              </div>
              <div className="bos-form-group" style={{ marginTop: 8 }}>
                <label className="bos-form-label">Sensory Notes</label>
                <textarea className="rnd-input" rows={2} style={{ width: '100%' }}
                  value={form.sensory_notes ?? ''}
                  onChange={e => setForm((f: any) => ({...f, sensory_notes: e.target.value}))}
                />
              </div>
              {form.status === 'FAILED' && (
                <div className="bos-form-group" style={{ marginTop: 8 }}>
                  <label className="bos-form-label">Failure Reason</label>
                  <textarea className="rnd-input" rows={2} style={{ width: '100%' }}
                    value={form.failure_reason ?? ''}
                    onChange={e => setForm((f: any) => ({...f, failure_reason: e.target.value}))}
                  />
                </div>
              )}
            </div>
          ) : null}
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="rnd-btn rnd-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingTrial ? '💾 Update Trial' : '🚀 Log Trial'}</button>
            <button className="rnd-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Table: Trial Logs list ── */}
      <div className="rnd-card" style={{ padding: 0 }}>
        {filteredTrials.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No trials match the current filters.</div>
        ) : (
          <table className="rnd-table">
            <thead>
              <tr>
                <th>Trial No</th>
                <th>Formula</th>
                <th>Batch</th>
                <th>Retort F0</th>
                <th>Sensory</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrials.map((trial) => (
                <tr key={trial.id}>
                  <td style={{ fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>{trial.trial_no}</td>
                  <td style={{ fontWeight: 500, color: '#38bdf8' }}>{trial.formula?.formula_code || '—'}</td>
                  <td>{trial.batch_size_kg} kg</td>
                  <td style={{ fontSize: 12, color: '#cbd5e1' }}>{trial.f0_achieved ? `F0: ${trial.f0_achieved} @ ${trial.retort_temp_c}°C` : '—'}</td>
                  <td style={{ fontSize: 12, color: '#cbd5e1' }}>{trial.sensory_score ? `${trial.sensory_score}/10` : '—'}</td>
                  <td>
                    <span className={`rnd-badge rnd-badge-${trial.status === 'FAILED' ? 'failed' : trial.status === 'COMPLETED' ? 'success' : trial.status === 'IN_PROGRESS' ? 'locked' : 'draft'}`}>{trial.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(trial.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {trial.formula_id && (
                        <button className="rnd-btn rnd-btn-primary" style={{ padding: '4px 8px', fontSize: 11, background: '#0284c7' }} onClick={() => openTrialRunner(trial)}>Run SOP & QC</button>
                      )}
                      {trial.formula_id && (
                        <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => navigate(`/rnd/formulations/${trial.formula_id}`)}>Open Formula</button>
                      )}
                      <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openEdit(trial)}>Edit</button>
                      <button className="rnd-btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDelete(trial.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Trial Runner Overlay ── */}
      {activeRunnerTrial && (
        <div className="bos-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, padding: 20, overflowY: 'auto' }}>
          <div className="bos-modal" style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 1000, color: '#f8fafc', padding: 24, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <span className="rnd-badge rnd-badge-draft" style={{ marginRight: 8, background: '#0369a1', color: '#fff' }}>TRIAL RUNNER</span>
                <strong style={{ fontSize: 18, color: '#f8fafc' }}>{activeRunnerTrial.trial_no}</strong>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Linked Formulation: <span style={{ color: '#38bdf8' }}>{activeRunnerTrial.formula?.formula_code}</span> — {activeRunnerTrial.formula?.name} (v{activeRunnerTrial.formula?.version})
                </div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }} onClick={() => setActiveRunnerTrial(null)}>✕</button>
            </div>

            {runnerLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading SOP and Target specifications...</div>
            ) : runnerError ? (
              <div style={{ color: '#ef4444', padding: 20 }}>{runnerError}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                
                {/* SOP checklist column */}
                <div>
                  <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: 8, marginBottom: 12 }}>
                    1. SOP Execution Checklist
                  </h3>
                  
                  {runnerSteps.length === 0 ? (
                    <div style={{ color: '#64748b', fontStyle: 'italic', padding: 20 }}>No SOP process steps mapped to this formulation.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 8 }}>
                      {runnerSteps.map(step => (
                        <label
                          key={step.id}
                          style={{
                            display: 'flex',
                            gap: 12,
                            background: checkedSteps[step.id] ? 'rgba(34, 197, 94, 0.05)' : 'rgba(30, 41, 59, 0.5)',
                            border: checkedSteps[step.id] ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #1e293b',
                            borderRadius: 8,
                            padding: 12,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ marginTop: 3 }}
                            checked={!!checkedSteps[step.id]}
                            onChange={e => setCheckedSteps(prev => ({ ...prev, [step.id]: e.target.checked }))}
                          />
                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>Step {step.step_no}</span>
                              <span className="rnd-badge rnd-badge-locked" style={{ fontSize: 10, padding: '1px 5px' }}>{step.step_type}</span>
                              {step.ccp && <span className="rnd-badge rnd-badge-failed" style={{ fontSize: 10, padding: '1px 5px' }}>CCP</span>}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 4, color: '#f8fafc' }}>{step.description}</div>
                            
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                              {step.duration_min && <span>⏱ {step.duration_min} min</span>}
                              {step.temp_c && <span>🌡 {step.temp_c}°C</span>}
                              {step.rpm && <span>⚙️ {step.rpm} RPM</span>}
                              {step.pressure_bar && <span>💨 {step.pressure_bar} Bar</span>}
                              {step.machine && <span style={{ color: '#38bdf8' }}>🛠 {step.machine}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {runnerSteps.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: 12, color: Object.keys(checkedSteps).filter(k => checkedSteps[k]).length === runnerSteps.length ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                      SOP Completion: {Object.keys(checkedSteps).filter(k => checkedSteps[k]).length} of {runnerSteps.length} steps checked
                    </div>
                  )}
                </div>

                {/* QC parameters column */}
                <div>
                  <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: 8, marginBottom: 12 }}>
                    2. QC Parameters & readings
                  </h3>

                  {runnerParams.length === 0 ? (
                    <div style={{ color: '#64748b', fontStyle: 'italic', padding: 20 }}>No QC parameters defined for this formulation. Add some parameters in Formula Builder first.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 8 }}>
                      {runnerParams.map(param => {
                        const result = getParamResult(param);
                        const isPass = result.status === 'PASS';
                        const isFail = result.status === 'FAIL';
                        const isPending = result.status === 'PENDING';

                        return (
                          <div
                            key={param.id}
                            style={{
                              background: '#0f172a',
                              border: '1px solid #1e293b',
                              borderRadius: 8,
                              padding: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>{param.param_name}</span>
                                {param.unit && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>({param.unit})</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                                Target: {param.target_value != null ? `Exact ${param.target_value}` : ''}
                                {param.target_min != null ? `Min: ${param.target_min}` : ''}
                                {param.target_min != null && param.target_max != null ? ' · ' : ''}
                                {param.target_max != null ? `Max: ${param.target_max}` : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <input
                                type="number"
                                step="0.001"
                                className="rnd-input"
                                style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                                placeholder={`Enter measured ${param.param_name}`}
                                value={measuredReadings[param.id] || ''}
                                onChange={e => setMeasuredReadings(prev => ({ ...prev, [param.id]: e.target.value }))}
                              />
                              
                              {/* Status Badge */}
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  minWidth: 60,
                                  textAlign: 'center',
                                  background: isPass ? 'rgba(34, 197, 94, 0.15)' : isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                  color: isPass ? '#22c55e' : isFail ? '#ef4444' : '#94a3b8',
                                  border: isPass ? '1px solid rgba(34, 197, 94, 0.3)' : isFail ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
                                }}
                              >
                                {result.text}
                              </span>
                            </div>

                            <input
                              type="text"
                              className="rnd-input"
                              style={{ width: '100%', padding: '4px 8px', fontSize: 11, border: 'none', background: 'rgba(255,255,255,0.02)' }}
                              placeholder="Parameter observation notes..."
                              value={measuredNotes[param.id] || ''}
                              onChange={e => setMeasuredNotes(prev => ({ ...prev, [param.id]: e.target.value }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Trial Overall results section */}
            {!runnerLoading && !runnerError && (
              <div style={{ marginTop: 24, borderTop: '1px solid #334155', paddingTop: 16 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1', marginBottom: 12 }}>3. Trial Metadata & Summary Results</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Actual Yield (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13 }}
                      value={form.actual_yield_kg}
                      onChange={e => setForm(f => ({ ...f, actual_yield_kg: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Actual pH</label>
                    <input
                      type="number"
                      step="0.01"
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13 }}
                      value={form.actual_ph}
                      onChange={e => setForm(f => ({ ...f, actual_ph: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Actual Brix</label>
                    <input
                      type="number"
                      step="0.1"
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13 }}
                      value={form.actual_brix}
                      onChange={e => setForm(f => ({ ...f, actual_brix: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Sensory Score (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13 }}
                      value={form.sensory_score}
                      onChange={e => setForm(f => ({ ...f, sensory_score: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Sensory & Stability Notes</label>
                    <textarea
                      rows={2}
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13, resize: 'none' }}
                      value={form.sensory_notes}
                      onChange={e => setForm(f => ({ ...f, sensory_notes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Failure Reason (Required if FAILED)</label>
                    <textarea
                      rows={2}
                      className="rnd-input"
                      style={{ width: '100%', fontSize: 13, resize: 'none' }}
                      placeholder="e.g. Melting point too high..."
                      value={form.failure_reason}
                      onChange={e => setForm(f => ({ ...f, failure_reason: e.target.value }))}
                      disabled={getOverallStatus() !== 'FAILED'}
                    />
                  </div>
                </div>

                {/* Overall recommendation banner */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: getOverallStatus() === 'COMPLETED' ? 'rgba(34, 197, 94, 0.08)' : getOverallStatus() === 'FAILED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                    border: getOverallStatus() === 'COMPLETED' ? '1px solid rgba(34, 197, 94, 0.2)' : getOverallStatus() === 'FAILED' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>RECOMMENDED STATUS</span>
                    <div style={{ fontSize: 18, fontWeight: 700, color: getOverallStatus() === 'COMPLETED' ? '#22c55e' : getOverallStatus() === 'FAILED' ? '#ef4444' : '#94a3b8', marginTop: 2 }}>
                      {getOverallStatus()} {getOverallStatus() === 'COMPLETED' && '✓'}
                      {getOverallStatus() === 'FAILED' && '✗'}
                      {getOverallStatus() === 'IN_PROGRESS' && '...'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      className="rnd-btn"
                      onClick={() => saveTrialRunnerReadings(getOverallStatus(), form.failure_reason)}
                      disabled={saving}
                      style={{ padding: '10px 16px', fontSize: 13 }}
                    >
                      {saving ? 'Saving...' : '💾 Save Readings & Log Trial'}
                    </button>
                    
                    {getOverallStatus() === 'COMPLETED' && (
                      <button
                        className="rnd-btn rnd-btn-primary"
                        onClick={promoteToProductionRecipe}
                        disabled={promoting || saving}
                        style={{ padding: '10px 20px', fontSize: 13, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                      >
                        {promoting ? 'Promoting...' : '🚀 Promote to Production Recipe'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#64748b' }}>
                  * Failed trials will remain in the R&D notebook section with notes for future reference. Only passed trials with matching specifications can be promoted to active Master Production Recipes.
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
