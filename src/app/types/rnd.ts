export type RndFormulaStatus = 'DRAFT' | 'UNDER_TRIAL' | 'APPROVED' | 'LOCKED' | 'ARCHIVED';
export type RndTrialStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface RndIngredient {
  id: string;
  name: string;
  category: string | null;
  functionality: string | null;
  supplier: string | null;
  cost_per_kg: number;
  ph_min: number | null;
  ph_max: number | null;
  heat_stability: string | null;
  usage_min_pct: number | null;
  usage_max_pct: number | null;
  notes: string | null;
  coa_url: string | null;
  is_active: boolean;
  erp_product_id?: string | null;
  created_at: string;
}

export interface RndFormula {
  id: string;
  formula_code: string;
  name: string;
  description: string | null;
  version: number;
  target_ph: number | null;
  target_brix: number | null;
  target_sg: number | null;
  status: RndFormulaStatus;
  validation_status: 'PENDING' | 'VIABLE' | 'REJECTED';
  validation_notes: string | null;
  total_cost_per_kg: number;
  created_by: string | null;
  approved_by: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  erp_product_id?: string | null;
  created_at: string;
}

export interface RndFormulaItem {
  id: string;
  formula_id: string;
  ingredient_id: string;
  phase: string | null;
  percentage: number;
  tolerance_pct: number;
  notes: string | null;
  created_at: string;
}

// Joined representation for UI
export interface RndFormulaItemWithIngredient extends RndFormulaItem {
  ingredient: RndIngredient;
}

// ── Master QC target parameters (Settings) ──────────────────────────────────
export interface RndMasterParameter {
  id: string;
  name: string;
  category: string;
  default_unit: string | null;
  created_at: string;
}

// ── Dynamic formula QC target parameters ──────────────────────────────────────
export interface RndFormulaParam {
  id: string;
  formula_id: string;
  param_name: string;        // e.g. "pH", "Brix", "Viscosity cP"
  unit: string | null;       // e.g. "%", "cP", "°Brix"
  target_min: number | null;
  target_max: number | null;
  target_value: number | null;
  test_method: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

// ── Dynamic trial measured readings ──────────────────────────────────────────
export interface RndTrialParam {
  id: string;
  trial_id: string;
  param_name: string;
  unit: string | null;
  measured_value: number | null;
  pass: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface RndProcess {
  id: string;
  formula_id: string;
  step_no: number;
  step_type: string | null;
  description: string;
  duration_min: number | null;
  temp_c: number | null;
  rpm: number | null;
  pressure_bar: number | null;
  ccp: boolean;
  machine: string | null;
  created_at: string;
}

export interface RndTrial {
  id: string;
  trial_no: string;
  formula_id: string | null;
  batch_size_kg: number;
  actual_yield_kg: number | null;
  status: RndTrialStatus;
  start_time: string | null;
  end_time: string | null;
  f0_achieved: number | null;
  retort_temp_c: number | null;
  hold_time_min: number | null;
  actual_ph: number | null;
  actual_brix: number | null;
  actual_sg: number | null;
  sensory_score: number | null;
  sensory_notes: string | null;
  stability_notes: string | null;
  failure_reason: string | null;
  conducted_by: string | null;
  created_at: string;
}

// Joined representation for UI
export interface RndTrialWithFormula extends RndTrial {
  formula: RndFormula | null;
}

export interface RndNotebook {
  id: string;
  title: string;
  trial_id: string | null;
  content: string;
  author: string | null;
  tags: string[] | null;
  is_pinned: boolean;
  created_at: string;
}

export interface RndFile {
  id: string;
  entity_type: 'INGREDIENT' | 'TRIAL' | 'NOTEBOOK';
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

// Helper formatting functions
export function fmtPct(num: number | null | undefined): string {
  if (num == null) return '—';
  return `${num.toFixed(3)}%`;
}

export function fmtCost(num: number | null | undefined): string {
  if (num == null) return '—';
  return `₹${num.toFixed(2)}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}
