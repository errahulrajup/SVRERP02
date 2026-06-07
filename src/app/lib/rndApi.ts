import { supabase } from './supabase';
import { apiRequest } from './api';
import type {
  RndIngredient, RndFormula, RndFormulaItem, RndProcess, RndTrial,
  RndNotebook, RndFile, RndFormulaItemWithIngredient, RndTrialWithFormula,
  RndFormulaParam, RndTrialParam, RndMasterParameter
} from '../types/rnd';

const ORDER_DESC = { ascending: false };

export const rndIngredientsApi = {
  list: () => apiRequest<RndIngredient[]>(() => supabase.from('rnd_ingredients').select('*').order('name', { ascending: true }), { label: 'rnd.ingredients.list' }),
  byId: (id: string) => apiRequest<RndIngredient>(() => supabase.from('rnd_ingredients').select('*').eq('id', id).single(), { label: 'rnd.ingredients.byId' }),
  create: (data: Omit<RndIngredient, 'id' | 'created_at'>) => apiRequest<RndIngredient>(() => supabase.from('rnd_ingredients').insert(data).select().single(), { label: 'rnd.ingredients.create', retries: 0 }),
  update: (id: string, data: Partial<RndIngredient>) => apiRequest<RndIngredient>(() => supabase.from('rnd_ingredients').update(data).eq('id', id).select().single(), { label: 'rnd.ingredients.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_ingredients').delete().eq('id', id), { label: 'rnd.ingredients.remove', retries: 0 }),
};

export const rndFormulasApi = {
  list: () => apiRequest<RndFormula[]>(() => supabase.from('rnd_formulas').select('*').order('created_at', ORDER_DESC), { label: 'rnd.formulas.list' }),
  byId: (id: string) => apiRequest<RndFormula>(() => supabase.from('rnd_formulas').select('*').eq('id', id).single(), { label: 'rnd.formulas.byId' }),
  create: (data: Omit<RndFormula, 'id' | 'created_at'>) => apiRequest<RndFormula>(() => supabase.from('rnd_formulas').insert(data).select().single(), { label: 'rnd.formulas.create', retries: 0 }),
  update: (id: string, data: Partial<RndFormula>) => apiRequest<RndFormula>(() => supabase.from('rnd_formulas').update(data).eq('id', id).select().single(), { label: 'rnd.formulas.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_formulas').delete().eq('id', id), { label: 'rnd.formulas.remove', retries: 0 }),
};

export const rndFormulaItemsApi = {
  byFormula: (formulaId: string) => apiRequest<RndFormulaItemWithIngredient[]>(() => 
    supabase.from('rnd_formula_items').select('*, ingredient:ingredient_id(*)').eq('formula_id', formulaId), 
  { label: 'rnd.formulaItems.byFormula' }),
  
  create: (data: Omit<RndFormulaItem, 'id' | 'created_at'>) => apiRequest<RndFormulaItem>(() => supabase.from('rnd_formula_items').insert(data).select().single(), { label: 'rnd.formulaItems.create', retries: 0 }),
  update: (id: string, data: Partial<RndFormulaItem>) => apiRequest<RndFormulaItem>(() => supabase.from('rnd_formula_items').update(data).eq('id', id).select().single(), { label: 'rnd.formulaItems.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_formula_items').delete().eq('id', id), { label: 'rnd.formulaItems.remove', retries: 0 }),
};

// ── Master QC target parameters (Settings) ──────────────────────────────────
export const rndMasterParamsApi = {
  list: () => apiRequest<RndMasterParameter[]>(() => supabase.from('rnd_master_parameters').select('*').order('name', { ascending: true }), { label: 'rnd.masterParams.list' }),
  create: (data: Omit<RndMasterParameter, 'id' | 'created_at'>) => apiRequest<RndMasterParameter>(() => supabase.from('rnd_master_parameters').insert(data).select().single(), { label: 'rnd.masterParams.create', retries: 0 }),
  update: (id: string, data: Partial<RndMasterParameter>) => apiRequest<RndMasterParameter>(() => supabase.from('rnd_master_parameters').update(data).eq('id', id).select().single(), { label: 'rnd.masterParams.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_master_parameters').delete().eq('id', id), { label: 'rnd.masterParams.remove', retries: 0 }),
};

// ── Dynamic formula QC target parameters ──────────────────────────────────────
export const rndFormulaParamsApi = {
  byFormula: (formulaId: string) =>
    apiRequest<RndFormulaParam[]>(
      () => supabase.from('rnd_formula_params').select('*').eq('formula_id', formulaId).order('sort_order'),
      { label: 'rnd.formulaParams.byFormula' }
    ),
  create: (data: Omit<RndFormulaParam, 'id' | 'created_at'>) =>
    apiRequest<RndFormulaParam>(
      () => supabase.from('rnd_formula_params').insert(data).select().single(),
      { label: 'rnd.formulaParams.create', retries: 0 }
    ),
  update: (id: string, data: Partial<RndFormulaParam>) =>
    apiRequest<RndFormulaParam>(
      () => supabase.from('rnd_formula_params').update(data).eq('id', id).select().single(),
      { label: 'rnd.formulaParams.update', retries: 0 }
    ),
  remove: (id: string) =>
    apiRequest<null>(
      () => supabase.from('rnd_formula_params').delete().eq('id', id),
      { label: 'rnd.formulaParams.remove', retries: 0 }
    ),
};

// ── Dynamic trial measured readings ──────────────────────────────────────────────
export const rndTrialParamsApi = {
  byTrial: (trialId: string) =>
    apiRequest<RndTrialParam[]>(
      () => supabase.from('rnd_trial_params').select('*').eq('trial_id', trialId).order('created_at'),
      { label: 'rnd.trialParams.byTrial' }
    ),
  upsert: (data: Omit<RndTrialParam, 'id' | 'created_at'>) =>
    apiRequest<RndTrialParam>(
      () => supabase.from('rnd_trial_params').upsert(data, { onConflict: 'trial_id,param_name' }).select().single(),
      { label: 'rnd.trialParams.upsert', retries: 0 }
    ),
  remove: (id: string) =>
    apiRequest<null>(
      () => supabase.from('rnd_trial_params').delete().eq('id', id),
      { label: 'rnd.trialParams.remove', retries: 0 }
    ),
};

export const rndProcessesApi = {
  byFormula: (formulaId: string) => apiRequest<RndProcess[]>(() => supabase.from('rnd_processes').select('*').eq('formula_id', formulaId).order('step_no', { ascending: true }), { label: 'rnd.processes.byFormula' }),
  create: (data: Omit<RndProcess, 'id' | 'created_at'>) => apiRequest<RndProcess>(() => supabase.from('rnd_processes').insert(data).select().single(), { label: 'rnd.processes.create', retries: 0 }),
  update: (id: string, data: Partial<RndProcess>) => apiRequest<RndProcess>(() => supabase.from('rnd_processes').update(data).eq('id', id).select().single(), { label: 'rnd.processes.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_processes').delete().eq('id', id), { label: 'rnd.processes.remove', retries: 0 }),
};

export const rndTrialsApi = {
  list: () => apiRequest<RndTrialWithFormula[]>(() => 
    supabase.from('rnd_trials').select('*, formula:formula_id(*)').order('created_at', ORDER_DESC), 
  { label: 'rnd.trials.list' }),
  
  byId: (id: string) => apiRequest<RndTrialWithFormula>(() => 
    supabase.from('rnd_trials').select('*, formula:formula_id(*)').eq('id', id).single(), 
  { label: 'rnd.trials.byId' }),
  
  create: (data: Omit<RndTrial, 'id' | 'created_at'>) => apiRequest<RndTrial>(() => supabase.from('rnd_trials').insert(data).select().single(), { label: 'rnd.trials.create', retries: 0 }),
  update: (id: string, data: Partial<RndTrial>) => apiRequest<RndTrial>(() => supabase.from('rnd_trials').update(data).eq('id', id).select().single(), { label: 'rnd.trials.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_trials').delete().eq('id', id), { label: 'rnd.trials.remove', retries: 0 }),
};

export const rndNotebooksApi = {
  list: () => apiRequest<RndNotebook[]>(() => supabase.from('rnd_notebook').select('*').order('created_at', ORDER_DESC), { label: 'rnd.notebooks.list' }),
  create: (data: Omit<RndNotebook, 'id' | 'created_at'>) => apiRequest<RndNotebook>(() => supabase.from('rnd_notebook').insert(data).select().single(), { label: 'rnd.notebooks.create', retries: 0 }),
  update: (id: string, data: Partial<RndNotebook>) => apiRequest<RndNotebook>(() => supabase.from('rnd_notebook').update(data).eq('id', id).select().single(), { label: 'rnd.notebooks.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_notebook').delete().eq('id', id), { label: 'rnd.notebooks.remove', retries: 0 }),
};

export const rndFilesApi = {
  byEntity: (entityType: string, entityId: string) => apiRequest<RndFile[]>(() => supabase.from('rnd_files').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', ORDER_DESC), { label: 'rnd.files.byEntity' }),
  create: (data: Omit<RndFile, 'id' | 'created_at'>) => apiRequest<RndFile>(() => supabase.from('rnd_files').insert(data).select().single(), { label: 'rnd.files.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('rnd_files').delete().eq('id', id), { label: 'rnd.files.remove', retries: 0 }),
};
