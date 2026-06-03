// ── BOS — Shared TypeScript Types ─────────────────────────────────────────────
// Maps to the Supabase tables used by the legacy svr-shared.js DB layer.
// Column names are snake_case in Supabase; we use camelCase in React (handled by bosApi).

// ── BOS Role types ───────────────────────────────────────────────────────────
export type BosRole = 'ADMIN' | 'MANAGER' | 'QC' | 'OPERATOR';

export const BOS_ROLE_ACCESS: Record<BosRole, string[]> = {
  ADMIN:    ['boss','manager','inward','quality','production','dispatch','store','accounts','dms','recipe','allergen','capa','prp','haccp','traceability','recall','fssai'],
  MANAGER:  ['manager','inward','quality','production','dispatch','store','accounts','recipe','dms'],
  QC:       ['quality','inward','store','allergen','capa','prp','haccp','traceability','recall','fssai'],
  OPERATOR: ['production','inward','store'],
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export type GrnStatus = 'QC_PENDING' | 'APPROVED' | 'REJECTED';
export type LotQcStatus = 'approved' | 'rejected' | 'pending';

export interface Grn {
  id: string;
  grn_no: string;
  supplier: string;
  material: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  gst_pct: number;
  gst_amt: number;
  invoice_no: string | null;
  vehicle_no: string | null;
  mfg_date: string | null;
  expiry_date: string | null;
  status: GrnStatus;
  reject_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  erp_product_id: string | null;
}

export interface Lot {
  id: string;
  lot_no: string;
  grn_id: string | null;
  material: string;
  supplier: string | null;
  quantity: number;
  remaining_qty: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  mfg_date: string | null;
  expiry_date: string | null;
  qc_status: LotQcStatus;
  location: string | null;
  notes: string | null;
  created_at: string;
  erp_product_id: string | null;
}

export interface StockLedgerTransaction {
  id: string;
  lot_id: string | null;
  fg_lot_id: string | null;
  erp_product_id: string | null;
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  qty_change: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FgLot {
  id: string;
  batch_id: string | null;   // FK → batches.id (BUG-01)
  batch_no: string;
  lot_no?: string;
  product: string;
  qty: number;
  available_qty: number;
  unit: string;
  unit_cost: number;
  coa_no: string | null;
  coa_issued?: boolean;       // BUG-09: CoA clearance flag
  location_id?: string | null;
  holding_status?: 'INCUBATION' | 'MATURATION' | 'RELEASED' | 'QUARANTINE' | 'HOLD' | string;
  release_date?: string | null;
  created_at: string;
}

// ── Production ────────────────────────────────────────────────────────────────

export type BatchStatus = 'PLANNED' | 'RUNNING' | 'QC_HOLD' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface Batch {
  id: string;
  batch_no: string;
  product: string;
  recipe_id: string | null;
  planned_qty: number;
  actual_qty: number | null;
  reject_qty: number | null;
  yield_pct: number | null;
  unit: string;
  status: BatchStatus;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  notes: string | null;
  qc_verdict?: 'PASS' | 'FAIL' | null;
  coa_no?: string | null;
  // Production floor fields (added via SQL migration)
  line?: string | null;
  operator?: string | null;
  production_floor?: string | null;
  line_operator?: string | null;
  fat_melting_temp?: number | null;
  mixing_temp?: number | null;
  pasteurization_temp?: number | null;
  target_fat_melting_temp?: number | null;
  target_mixing_temp?: number | null;
  target_pasteurization_temp?: number | null;
  dynamic_params?: Record<string, any> | null;
  created_at: string;
}

export interface BatchComponent {
  id: string;
  batch_id: string;
  lot_id: string | null;
  material: string;
  planned_qty: number;
  actual_qty: number;
  unit: string;
  unit_cost: number;
  comp_notes: string | null;
  created_at: string;
}

// ── Quality ───────────────────────────────────────────────────────────────────

export type QcVerdict = 'PASS' | 'FAIL' | 'HOLD' | 'PENDING';

export interface QcCheckResult {
  type: string;
  parameter: string;
  specification: string;
  result: string;
  verdict: 'PASS' | 'FAIL' | 'PENDING' | 'NA';   // ← unified UPPER to match QcVerdict
}

export interface QcCheck {
  id: string;
  batch_id: string | null;
  grn_id: string | null;
  lot_id: string | null;
  batch_no: string | null;
  product: string | null;
  check_type: string;
  parameter: string;
  result: string;
  standard: string | null;
  qc_verdict: QcVerdict;
  coa_no: string | null;
  coa_issued: boolean;
  coa_number: string | null;
  pack_size: string | null;
  format_no: string | null;
  tested_by: string | null;
  tested_at: string | null;
  analyst: string | null;
  reviewer: string | null;
  remarks: string | null;
  results: QcCheckResult[] | null;
  overall: 'PASS' | 'FAIL' | 'PENDING' | null;   // ← unified UPPER
  notes: string | null;
  created_at: string;
}

export type CapaStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED' | 'VERIFIED';
// Legacy display aliases (use toUpperCase/replace for display)
export const CAPA_STATUS_LABEL: Record<CapaStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PENDING_VERIFICATION: 'Pending Verification',
  CLOSED: 'Closed',
  VERIFIED: 'Verified',
};

export interface Capa {
  id: string;
  capa_no: string;
  type: 'CA' | 'PA' | string;
  source: string;
  description: string;
  owner: string | null;
  target_date: string | null;
  rca_method: string | null;
  rca_text: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  verification_note: string | null;
  status: CapaStatus;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  root_cause: string | null;
  action_taken: string | null;
  responsible: string | null;
  due_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
}

export interface CustomerComplaint {
  id: string;
  ref_no: string;
  customer_name: string;
  product_name: string | null;
  batch_no: string | null;
  issue_description: string;
  complaint_date: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CAPA_PENDING' | 'CLOSED';
  corrective_action: string | null;
  logged_by: string | null;
  created_at?: string;
}

export type HaccpStatus = 'OK' | 'DEVIATION' | 'CORRECTED' | 'COMPLIANT' | 'NON_COMPLIANT';

export interface HaccpCcp {
  id: string;
  ccp_id: string | null;
  ccp_no: string | null;
  ccp_name: string | null;
  batch_no: string | null;
  process_step: string | null;
  hazard: string | null;
  control_measure: string | null;
  critical_limit: string | null;
  reading: string | null;
  unit: string | null;
  result: HaccpStatus | string;
  corrective_action: string | null;
  checked_by: string | null;
  remarks: string | null;
  status: HaccpStatus | null;
  created_at: string;
}

export type PrpStatus = 'ACTIVE' | 'INACTIVE' | 'REVIEW_DUE' | 'Open' | 'Closed';

export interface Prp {
  id: string;
  prp_no: string;
  prp_type: string | null;
  category: string;
  description: string;
  area: string | null;
  equipment: string | null;
  equipment_id: string | null;
  cleaning_agent: string | null;
  method: string | null;
  pest_type: string | null;
  chemical: string | null;
  pco_name: string | null;
  standard: string | null;
  before_reading: string | null;
  after_reading: string | null;
  result: string | null;
  next_due: string | null;
  done_by: string | null;
  responsible: string | null;
  frequency: string | null;
  last_reviewed: string | null;
  next_review: string | null;
  status: PrpStatus;
  notes: string | null;
  created_at: string;
}

export type RecallStatus = 'Open' | 'In Progress' | 'Closed' | 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
export type RecallReason =
  | 'Safety'
  | 'Quality'
  | 'Labelling'
  | 'Foreign Body'
  | 'Other'
  | 'Microbial Contamination'
  | 'Chemical Contamination'
  | 'Allergen Undeclared'
  | 'Packaging Defect'
  | 'Customer Complaint'
  | 'Regulatory Direction'
  | 'Mock Recall Exercise';

export interface Recall {
  id: string;
  recall_no: string;
  product: string;
  batch_ref: string | null;
  batch_ids: string[] | null;
  reason: RecallReason;
  description: string;
  scope: string | null;
  status: RecallStatus;
  is_mock: boolean | null;
  qty_dispatched: number | null;
  qty_recovered: number | null;
  unit: string | null;
  trace_time: string | null;
  customers: string[] | null;
  initiated_by: string | null;
  completed_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
}

export type FssaiDocType =
  | 'License'
  | 'Registration'
  | 'FSSAI License'
  | 'FSSAI Registration'
  | 'State NOC'
  | 'Fire NOC'
  | 'Factory License'
  | 'MSME Certificate'
  | 'GST Registration'
  | 'ISO Certificate'
  | 'FSSC 22000'
  | 'Pollution NOC'
  | 'Water Testing Report'
  | 'Audit Report'
  | 'Compliance Certificate'
  | 'Training Record'
  | 'SOPs'
  | 'Calibration Certificate'
  | 'Pest Control Report'
  | 'Other';

export interface FssaiRecord {
  id: string;
  doc_type: FssaiDocType;
  document_name: string;
  doc_no: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  status: 'Valid' | 'Expired' | 'Pending';
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface FssaiAudit {
  id: string;
  audit_date: string;
  audit_type: string;
  auditor: string | null;
  findings: string | null;
  status: string;
  created_at: string;
}

// ── Finance ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID';
// Note: DB was previously 'UNPAID' — migration fix_all_schema_gaps.sql updates rows to 'PENDING'

export interface Invoice {
  id: string;
  invoice_no: string;
  customer: string;
  batch_id: string | null;
  dispatch_id: string | null;
  date: string;
  items: InvoiceLineItem[];
  subtotal: number;
  gst_pct: number;
  gst_amt: number;
  total: number;
  paid_amt: number;
  status: InvoiceStatus;
  payment_date: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceLineItem {
  product: string;     // Product/material name (was 'name', renamed to match dispatch data)
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_no: string;
  customer: string;
  amount: number;
  mode: string;
  reference: string | null;
  payment_date: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export type DispatchStatus = 'DRAFT' | 'CONFIRMED' | 'PLANNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Dispatch {
  id: string;
  do_no: string;
  invoice_id: string | null;
  batch_id: string | null;        // FK → fg_lots.id
  batch_no: string | null;        // Denormalized text for traceability
  customer: string;
  product: string;
  quantity: number;               // Maps to DB column 'quantity' (renamed from 'qty' in migration)
  unit: string;
  unit_rate: number | null;       // Selling rate per unit
  gst_pct: number | null;         // GST % applied
  gst_amt: number | null;         // Computed GST amount
  subtotal: number | null;        // qty × rate
  total: number | null;           // subtotal + gst_amt
  vehicle_no: string | null;
  lr_no: string | null;
  status: DispatchStatus;
  dispatched_at: string | null;
  notes: string | null;
  created_at: string;
}

// ── Products & Recipes ─────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku_code: string;
  category: string;
  unit: string;
  gst_pct: number;
  is_active: boolean;
  created_at: string;
}

export interface Recipe {
  id: string;
  product_id: string | null;
  name: string;
  version: number;
  output_qty: number;
  output_unit: string;
  expected_loss: number;
  shelf_life_days?: number | null;
  storage_temp?: string | null;
  notes: string | null;
  is_active: boolean;
  locked: boolean;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
}

export interface RecipeInput {
  id: string;
  recipe_id: string;
  material: string;
  qty: number;
  unit: string;
  tolerance: number;
  notes: string | null;
  created_at: string;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_no: number;
  step_name: string;
  machine: string | null;
  instruction: string | null;
  temp_min: number | null;
  temp_max: number | null;
  duration_min: number | null;
  created_at: string;
}

export interface RecipeQcParam {
  id: string;
  recipe_id: string;
  param_name: string;
  category: string;
  unit: string | null;
  target_min: number | null;
  target_max: number | null;
  target_value: number | null;
  test_method: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface AllergenMatrix {
  id: string;
  product_name: string;
  declared: boolean;
  gluten: string;
  crustacean: string;
  eggs: string;
  fish: string;
  peanuts: string;
  soy: string;
  milk: string;
  nuts: string;
  celery: string;
  mustard: string;
  sesame: string;
  sulphites: string;
  lupin: string;
  molluscs: string;
  created_at: string;
}

export type AllergenCategory =
  | 'Gluten' | 'Crustaceans' | 'Eggs' | 'Fish' | 'Peanuts'
  | 'Soybeans' | 'Milk' | 'Tree Nuts' | 'Celery' | 'Mustard'
  | 'Sesame' | 'Sulphites' | 'Lupin' | 'Molluscs';

export interface AllergenRecord {
  id: string;
  material: string;
  category: AllergenCategory;
  present_in: string | null;
  risk_level: 'Low' | 'Medium' | 'High';
  cross_contact: boolean;
  notes: string | null;
  created_at: string;
}

// ── IAM ───────────────────────────────────────────────────────────────────────

export interface BosUser {
  id: string;
  email: string;
  name: string | null;
  role: BosRole;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

// ── Utility types ─────────────────────────────────────────────────────────────

export function fmtINR(n: number | null | undefined): string {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export function daysUntil(d: string | null | undefined): number {
  if (!d) return 9999;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export interface Location {
  id: string;
  name: string;
  type: 'RM Store' | 'PM Store' | 'Bulk Store' | 'FG Store' | 'Quarantine' | 'Incubation Zone';
  temperature_zone?: string;
  created_at: string;
}

export interface BulkLot {
  id: string;
  product_id: string;
  batch_id: string;
  qty_produced: number;
  qty_available: number;
  location_id?: string;
  status: string;
  created_at: string;
}

export interface PackagingRun {
  id: string;
  bulk_lot_id: string;
  pm_lot_id?: string;
  pm_qty_consumed: number;
  bulk_qty_consumed: number;
  fg_lot_id?: string;
  run_date: string;
  operator_id?: string;
  notes?: string;
}

export interface SalesReturn {
  id: string;
  dispatch_id?: string;
  invoice_no?: string;
  fg_lot_id: string;
  qty: number;
  return_date: string;
  reason?: string;
  status: 'PENDING_QC' | 'DISPOSITIONED';
}

export interface ReturnQc {
  id: string;
  return_id: string;
  primary_pm_status: 'OK' | 'DAMAGED';
  secondary_pm_status: 'OK' | 'DAMAGED';
  tertiary_pm_status?: 'OK' | 'DAMAGED';
  product_status: 'OK' | 'SPOILED';
  disposition_action: 'REPACK' | 'REPROCESS' | 'DISCARD' | 'OK';
  new_lot_id?: string;
  qc_by?: string;
  qc_date: string;
  notes?: string;
}

// ── Master Data v3.2 Extensions ──────────────────────────────────────────────

export type ItemType = 'RAW_MATERIAL' | 'PACKAGING' | 'WIP' | 'FINISHED_GOOD' | 'SERVICE';

export interface Item {
  id: string;
  org_id: string;
  item_type: ItemType;
  code: string;
  name: string;
  base_uom: string;
  gst_pct: number;
  allergens: string[];
  is_active: boolean;
  created_at: string;
}

export interface Sku {
  id: string;
  org_id: string;
  site_id: string;
  item_id: string;
  code: string;
  name: string;
  pack_size_kg: number;
  base_uom: string;
  is_active: boolean;
  created_at: string;
}

export type ItemRelationType = 'BOM_INGREDIENT' | 'SUBSTITUTE' | 'PACKAGING_DEFAULT';

export interface ItemRelationship {
  id: string;
  org_id: string;
  site_id: string;
  parent_item_id: string;
  child_item_id: string;
  relation_type: ItemRelationType;
  created_at: string;
}

export interface Brand {
  id: string;
  org_id: string;
  site_id: string;
  code: string;
  name: string;
  client_partner_id: string | null;
  created_at?: string;
}

// ── Logistics & Dispatch v3.2 Extensions ─────────────────────────────────────

export type PalletStatus = 'IN_CUSTODY' | 'SHIPPED' | 'STOWED' | 'DISMANTLED';

export interface Pallet {
  id: string;
  org_id: string;
  site_id: string;
  pallet_code: string;
  status: PalletStatus;
  tare_weight: number;
  gross_weight: number | null;
  created_at: string;
}

export interface PalletItem {
  id: string;
  pallet_id: string;
  fg_lot_id: string;
  qty_packed: number;
  created_at: string;
}

export type DispatchOrderStatus = 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'BLOCKED';

export interface DispatchOrder {
  id: string;
  org_id: string;
  site_id: string;
  customer_id: string;
  do_code: string;
  status: DispatchOrderStatus;
  actual_ship_date: string | null;
  challan_no: string | null;
  created_at: string;
}

export interface DispatchLine {
  id: string;
  dispatch_order_id: string;
  item_id: string;
  lot_id: string | null;
  qty: number;
  rate: number;
  gst_pct: number;
  line_total: number;
}

// ── Costing Engine v3.2 Extensions ───────────────────────────────────────────

export interface CostCenter {
  id: string;
  org_id: string;
  site_id: string;
  code: string;
  name: string;
}

export type UtilityType = 'ELECTRICITY' | 'DIESEL' | 'WATER' | 'STEAM';

export interface UtilityConsumption {
  id: string;
  org_id: string;
  site_id: string;
  cost_center_id: string | null;
  utility_type: UtilityType;
  reading_date: string;
  qty_consumed: number;
  unit: string;
  rate: number;
  total_cost?: number;
}

export interface LaborHours {
  id: string;
  org_id: string;
  site_id: string;
  batch_id: string;
  employee_id: string;
  hours_worked: number;
  hourly_rate: number;
}

export type OverheadAllocationBasis = 'DIRECT' | 'MACHINE_HOURS' | 'LABOR_HOURS' | 'SQUARE_FOOTAGE';

export interface OverheadAllocation {
  id: string;
  org_id: string;
  site_id: string;
  cost_center_id: string;
  allocation_date: string;
  amount: number;
  allocation_basis: OverheadAllocationBasis;
}

// ── HR & LMS Training Matrix v3.2 Extensions ────────────────────────────────

export interface Employee {
  id: string;
  org_id: string;
  site_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  department: 'PRODUCTION' | 'PACKING' | 'STORE' | 'MAINTENANCE' | 'DISPATCH' | 'QA' | 'SAFETY' | 'HR';
  is_active: boolean;
  created_at: string;
}

export type TrainingRecordStatus = 'PASSED' | 'FAILED' | 'PENDING_EVALUATION';

export interface TrainingRecord {
  id: string;
  org_id: string;
  site_id: string;
  employee_id: string;
  sop_id: string;
  trained_by_id: string;
  training_date: string;
  evaluation_score?: number;
  status: TrainingRecordStatus;
  remarks?: string;
  created_at: string;
}

export interface Site {
  id: string;
  org_id: string;
  code: string;
  name: string;
}

export interface Customer {
  id: string;
  org_id: string;
  code: string;
  name: string;
}
