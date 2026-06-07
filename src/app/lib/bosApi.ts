import { supabase } from './supabase';
import { apiRequest } from './api';
import type {
  Grn, Lot, FgLot, Batch, BatchComponent, QcCheck, Capa, HaccpCcp, Prp, Recall, CustomerComplaint,
  FssaiRecord, FssaiAudit, Invoice, Payment, Expense, Dispatch, Recipe, RecipeInput, RecipeStep, RecipeQcParam, Product, AllergenMatrix,
  GrnStatus, BatchStatus, CapaStatus, DispatchStatus, InvoiceStatus, StockLedgerTransaction,
  Item, Sku, ItemRelationship, Brand, Site,
  Pallet, PalletItem, DispatchOrder, DispatchLine,
  CostCenter, UtilityConsumption, LaborHours, OverheadAllocation,
  Employee, TrainingRecord
} from '../types/bos';

// ── BOS API ────────────────────────────────────────────────────────────────────
// Replaces legacy DB.get(), DB.insert(), DB.update(), DB.delete() from svr-shared.js
// All queries go through Supabase RLS — user must have valid session.

const ORDER_DESC = { ascending: false };

// ── GRNs ─────────────────────────────────────────────────────────────────────
export const grnsApi = {
  list: () => apiRequest<Grn[]>(() => supabase.from('grns').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.grns.list' }),
  byId: (id: string) => apiRequest<Grn>(() => supabase.from('grns').select('*').eq('id', id).single(), { label: 'bos.grns.byId' }),
  create: (data: Omit<Grn, 'id' | 'created_at'>) => apiRequest<Grn>(() => supabase.from('grns').insert(data).select().single(), { label: 'bos.grns.create', retries: 0 }),
  update: (id: string, data: Partial<Grn>) => apiRequest<Grn>(() => supabase.from('grns').update(data).eq('id', id).select().single(), { label: 'bos.grns.update', retries: 0 }),
  updateStatus: (id: string, status: GrnStatus, rejectReason?: string) => apiRequest<null>(() => supabase.from('grns').update({ status, reject_reason: rejectReason ?? null }).eq('id', id), { label: 'bos.grns.updateStatus', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('grns').delete().eq('id', id), { label: 'bos.grns.remove', retries: 0 }),
};

// ── Lots ──────────────────────────────────────────────────────────────────────
export const lotsApi = {
  list: () => apiRequest<Lot[]>(() => supabase.from('lots').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.lots.list' }),
  approved: () => apiRequest<Lot[]>(() => supabase.from('lots').select('*').eq('qc_status', 'approved').order('expiry_date', { ascending: true }), { label: 'bos.lots.approved' }),
  byId: (id: string) => apiRequest<Lot>(() => supabase.from('lots').select('*').eq('id', id).single(), { label: 'bos.lots.byId' }),
  byGrn: (grnId: string) => apiRequest<Lot[]>(() => supabase.from('lots').select('*').eq('grn_id', grnId), { label: 'bos.lots.byGrn' }),
  create: (data: Omit<Lot, 'id' | 'created_at'>) => apiRequest<Lot>(() => supabase.from('lots').insert(data).select().single(), { label: 'bos.lots.create', retries: 0 }),
  update: (id: string, data: Partial<Lot>) => apiRequest<Lot>(() => supabase.from('lots').update(data).eq('id', id).select().single(), { label: 'bos.lots.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('lots').delete().eq('id', id), { label: 'bos.lots.remove', retries: 0 }),
};

// ── Stock Ledger ────────────────────────────────────────────────────────
export const stockLedgerApi = {
  list: () => apiRequest<StockLedgerTransaction[]>(() => supabase.from('stock_ledger').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.stock_ledger.list' }),
  byLot: (lotId: string) => apiRequest<StockLedgerTransaction[]>(() => supabase.from('stock_ledger').select('*').eq('lot_id', lotId).order('created_at', ORDER_DESC), { label: 'bos.stock_ledger.byLot' }),
  byFgLot: (fgLotId: string) => apiRequest<StockLedgerTransaction[]>(() => supabase.from('stock_ledger').select('*').eq('fg_lot_id', fgLotId).order('created_at', ORDER_DESC), { label: 'bos.stock_ledger.byFgLot' }),
  byReference: (refId: string) => apiRequest<StockLedgerTransaction[]>(() => supabase.from('stock_ledger').select('*').eq('reference_id', refId), { label: 'bos.stock_ledger.byRef' }),
  create: (data: Omit<StockLedgerTransaction, 'id' | 'created_at'>) => apiRequest<StockLedgerTransaction>(() => supabase.from('stock_ledger').insert(data).select().single(), { label: 'bos.stock_ledger.create', retries: 0 }),
};

// ── FG Lots ─────────────────────────────────────────────────────────────────────────────
export const fgLotsApi = {
  list: () => apiRequest<FgLot[]>(() => supabase.from('fg_lots').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.fgLots.list' }),
  byId: (id: string) => apiRequest<FgLot>(() => supabase.from('fg_lots').select('*').eq('id', id).single(), { label: 'bos.fgLots.byId' }),
  byBatch: (batchId: string) => apiRequest<FgLot[]>(() => supabase.from('fg_lots').select('*').eq('batch_id', batchId), { label: 'bos.fgLots.byBatch' }),
  create: (data: Omit<FgLot, 'id' | 'created_at'>) => apiRequest<FgLot>(() => supabase.from('fg_lots').insert(data).select().single(), { label: 'bos.fgLots.create', retries: 0 }),
  update: (id: string, data: Partial<FgLot>) => apiRequest<FgLot>(() => supabase.from('fg_lots').update(data).eq('id', id).select().single(), { label: 'bos.fgLots.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('fg_lots').delete().eq('id', id), { label: 'bos.fgLots.remove', retries: 0 }),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const bosProductsApi = {
  list: () => apiRequest<Product[]>(() => supabase.from('products').select('*').order('created_at', ORDER_DESC), { label: 'bos.products.list' }),
  byId: (id: string) => apiRequest<Product>(() => supabase.from('products').select('*').eq('id', id).single(), { label: 'bos.products.byId' }),
  create: (data: Omit<Product, 'id' | 'created_at'>) => apiRequest<Product>(() => supabase.from('products').insert(data).select().single(), { label: 'bos.products.create', retries: 0 }),
  update: (id: string, data: Partial<Product>) => apiRequest<Product>(() => supabase.from('products').update(data).eq('id', id).select().single(), { label: 'bos.products.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('products').delete().eq('id', id), { label: 'bos.products.remove', retries: 0 }),
};

// ── Batches ───────────────────────────────────────────────────────────────────
export const batchesApi = {
  list: () => apiRequest<Batch[]>(() => supabase.from('batches').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.batches.list' }),
  byId: (id: string) => apiRequest<Batch>(() => supabase.from('batches').select('*').eq('id', id).single(), { label: 'bos.batches.byId' }),
  byStatus: (status: BatchStatus) => apiRequest<Batch[]>(() => supabase.from('batches').select('*').eq('status', status).order('created_at', ORDER_DESC), { label: 'bos.batches.byStatus' }),
  create: (data: Omit<Batch, 'id' | 'created_at'>) => apiRequest<Batch>(() => supabase.from('batches').insert(data).select().single(), { label: 'bos.batches.create', retries: 0 }),
  update: (id: string, data: Partial<Batch>) => apiRequest<Batch>(() => supabase.from('batches').update(data).eq('id', id).select().single(), { label: 'bos.batches.update', retries: 0 }),
  updateStatus: (id: string, status: BatchStatus) => apiRequest<null>(() => supabase.from('batches').update({ status }).eq('id', id), { label: 'bos.batches.updateStatus', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('batches').delete().eq('id', id), { label: 'bos.batches.remove', retries: 0 }),
};

export const batchComponentsApi = {
  byBatch: (batchId: string) => apiRequest<BatchComponent[]>(() => supabase.from('batch_components').select('*').eq('batch_id', batchId), { label: 'bos.batchComponents.byBatch' }),
  create: (data: Omit<BatchComponent, 'id' | 'created_at'>) => apiRequest<BatchComponent>(() => supabase.from('batch_components').insert(data).select().single(), { label: 'bos.batchComponents.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('batch_components').delete().eq('id', id), { label: 'bos.batchComponents.remove', retries: 0 }),
};

// ── QC Checks ────────────────────────────────────────────────────────────────
export const qcChecksApi = {
  list: () => apiRequest<QcCheck[]>(() => supabase.from('qc_checks').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.qcChecks.list' }),
  byBatch: (batchId: string) => apiRequest<QcCheck[]>(() => supabase.from('qc_checks').select('*').eq('batch_id', batchId), { label: 'bos.qcChecks.byBatch' }),
  create: (data: Omit<QcCheck, 'id' | 'created_at'>) => apiRequest<QcCheck>(() => supabase.from('qc_checks').insert(data).select().single(), { label: 'bos.qcChecks.create', retries: 0 }),
  update: (id: string, data: Partial<QcCheck>) => apiRequest<QcCheck>(() => supabase.from('qc_checks').update(data).eq('id', id).select().single(), { label: 'bos.qcChecks.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('qc_checks').delete().eq('id', id), { label: 'bos.qcChecks.remove', retries: 0 }),
};

// ── CAPA ──────────────────────────────────────────────────────────────────────
export const capaApi = {
  list: () => apiRequest<Capa[]>(() => supabase.from('capas').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.capa.list' }),
  create: (data: Omit<Capa, 'id' | 'created_at'>) => apiRequest<Capa>(() => supabase.from('capas').insert(data).select().single(), { label: 'bos.capa.create', retries: 0 }),
  update: (id: string, data: Partial<Capa>) => apiRequest<Capa>(() => supabase.from('capas').update(data).eq('id', id).select().single(), { label: 'bos.capa.update', retries: 0 }),
  updateStatus: (id: string, status: CapaStatus) => apiRequest<null>(() => supabase.from('capas').update({ status }).eq('id', id), { label: 'bos.capa.updateStatus', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('capas').delete().eq('id', id), { label: 'bos.capa.remove', retries: 0 }),
};

// ── HACCP ─────────────────────────────────────────────────────────────────────
export const haccpApi = {
  list: () => apiRequest<HaccpCcp[]>(() => supabase.from('ccp_logs').select('*').order('created_at', ORDER_DESC), { label: 'bos.haccp.list' }),
  create: (data: Omit<HaccpCcp, 'id' | 'created_at'>) => apiRequest<HaccpCcp>(() => supabase.from('ccp_logs').insert(data).select().single(), { label: 'bos.haccp.create', retries: 0 }),
  update: (id: string, data: Partial<HaccpCcp>) => apiRequest<HaccpCcp>(() => supabase.from('ccp_logs').update(data).eq('id', id).select().single(), { label: 'bos.haccp.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('ccp_logs').delete().eq('id', id), { label: 'bos.haccp.remove', retries: 0 }),
};

// ── PRP ───────────────────────────────────────────────────────────────────────
export const prpApi = {
  list: () => apiRequest<Prp[]>(() => supabase.from('prp_logs').select('*').order('created_at', ORDER_DESC), { label: 'bos.prp.list' }),
  create: (data: Omit<Prp, 'id' | 'created_at'>) => apiRequest<Prp>(() => supabase.from('prp_logs').insert(data).select().single(), { label: 'bos.prp.create', retries: 0 }),
  update: (id: string, data: Partial<Prp>) => apiRequest<Prp>(() => supabase.from('prp_logs').update(data).eq('id', id).select().single(), { label: 'bos.prp.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('prp_logs').delete().eq('id', id), { label: 'bos.prp.remove', retries: 0 }),
};

// ── Recall ────────────────────────────────────────────────────────────────────
export const recallApi = {
  list: () => apiRequest<Recall[]>(() => supabase.from('recalls').select('*').order('created_at', ORDER_DESC), { label: 'bos.recall.list' }),
  create: (data: Omit<Recall, 'id' | 'created_at'>) => apiRequest<Recall>(() => supabase.from('recalls').insert(data).select().single(), { label: 'bos.recall.create', retries: 0 }),
  update: (id: string, data: Partial<Recall>) => apiRequest<Recall>(() => supabase.from('recalls').update(data).eq('id', id).select().single(), { label: 'bos.recall.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recalls').delete().eq('id', id), { label: 'bos.recall.remove', retries: 0 }),
};

// ── FSSAI ─────────────────────────────────────────────────────────────────────
export const fssaiApi = {
  list: () => apiRequest<FssaiRecord[]>(() => supabase.from('fssai_docs').select('*').order('created_at', ORDER_DESC), { label: 'bos.fssai.list' }),
  create: (data: Omit<FssaiRecord, 'id' | 'created_at'>) => apiRequest<FssaiRecord>(() => supabase.from('fssai_docs').insert(data).select().single(), { label: 'bos.fssai.create', retries: 0 }),
  update: (id: string, data: Partial<FssaiRecord>) => apiRequest<FssaiRecord>(() => supabase.from('fssai_docs').update(data).eq('id', id).select().single(), { label: 'bos.fssai.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('fssai_docs').delete().eq('id', id), { label: 'bos.fssai.remove', retries: 0 }),
};

export const fssaiAuditsApi = {
  list: () => apiRequest<FssaiAudit[]>(() => supabase.from('fssai_audits').select('*').order('audit_date', ORDER_DESC), { label: 'bos.fssaiAudits.list' }),
  create: (data: Omit<FssaiAudit, 'id' | 'created_at'>) => apiRequest<FssaiAudit>(() => supabase.from('fssai_audits').insert(data).select().single(), { label: 'bos.fssaiAudits.create', retries: 0 }),
  update: (id: string, data: Partial<FssaiAudit>) => apiRequest<FssaiAudit>(() => supabase.from('fssai_audits').update(data).eq('id', id).select().single(), { label: 'bos.fssaiAudits.update', retries: 0 }),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: () => apiRequest<Invoice[]>(() => supabase.from('invoices').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.invoices.list' }),
  byId: (id: string) => apiRequest<Invoice>(() => supabase.from('invoices').select('*').eq('id', id).single(), { label: 'bos.invoices.byId' }),
  create: (data: Omit<Invoice, 'id' | 'created_at'>) => apiRequest<Invoice>(() => supabase.from('invoices').insert(data).select().single(), { label: 'bos.invoices.create', retries: 0 }),
  update: (id: string, data: Partial<Invoice>) => apiRequest<Invoice>(() => supabase.from('invoices').update(data).eq('id', id).select().single(), { label: 'bos.invoices.update', retries: 0 }),
  updateStatus: (id: string, status: InvoiceStatus, paidAmt?: number, paymentDate?: string, paidBy?: string) => apiRequest<null>(() => supabase.from('invoices').update({ status, paid_amt: paidAmt, payment_date: paymentDate ?? null, paid_by: paidBy ?? null }).eq('id', id), { label: 'bos.invoices.updateStatus', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('invoices').delete().eq('id', id), { label: 'bos.invoices.remove', retries: 0 }),
};

// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: () => apiRequest<Payment[]>(() => supabase.from('payments').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.payments.list' }),
  create: (data: Omit<Payment, 'id' | 'created_at'>) => apiRequest<Payment>(() => supabase.from('payments').insert(data).select().single(), { label: 'bos.payments.create', retries: 0 }),
  update: (id: string, data: Partial<Payment>) => apiRequest<Payment>(() => supabase.from('payments').update(data).eq('id', id).select().single(), { label: 'bos.payments.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('payments').delete().eq('id', id), { label: 'bos.payments.remove', retries: 0 }),
};

// ── Expenses ─────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: () => apiRequest<Expense[]>(() => supabase.from('expenses').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.expenses.list' }),
  create: (data: Omit<Expense, 'id' | 'created_at'>) => apiRequest<Expense>(() => supabase.from('expenses').insert(data).select().single(), { label: 'bos.expenses.create', retries: 0 }),
  update: (id: string, data: Partial<Expense>) => apiRequest<Expense>(() => supabase.from('expenses').update(data).eq('id', id).select().single(), { label: 'bos.expenses.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('expenses').delete().eq('id', id), { label: 'bos.expenses.remove', retries: 0 }),
};

// ── Dispatches ────────────────────────────────────────────────────────────────
export const dispatchesApi = {
  list: () => apiRequest<Dispatch[]>(() => supabase.from('dispatches').select('*').order('created_at', ORDER_DESC).limit(500), { label: 'bos.dispatches.list' }),
  byId: (id: string) => apiRequest<Dispatch>(() => supabase.from('dispatches').select('*').eq('id', id).single(), { label: 'bos.dispatches.byId' }),
  create: (data: Omit<Dispatch, 'id' | 'created_at'>) => apiRequest<Dispatch>(() => supabase.from('dispatches').insert(data).select().single(), { label: 'bos.dispatches.create', retries: 0 }),
  update: (id: string, data: Partial<Dispatch>) => apiRequest<Dispatch>(() => supabase.from('dispatches').update(data).eq('id', id).select().single(), { label: 'bos.dispatches.update', retries: 0 }),
  updateStatus: (id: string, status: DispatchStatus) => apiRequest<null>(() => supabase.from('dispatches').update({ status }).eq('id', id), { label: 'bos.dispatches.updateStatus', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('dispatches').delete().eq('id', id), { label: 'bos.dispatches.remove', retries: 0 }),
};

// ── Recipes ───────────────────────────────────────────────────────────────────
export const recipesApi = {
  list: () => apiRequest<Recipe[]>(() => supabase.from('recipes').select('*').order('created_at', ORDER_DESC), { label: 'bos.recipes.list' }),
  byId: (id: string) => apiRequest<Recipe>(() => supabase.from('recipes').select('*').eq('id', id).single(), { label: 'bos.recipes.byId' }),
  create: (data: Omit<Recipe, 'id' | 'created_at'>) => apiRequest<Recipe>(() => supabase.from('recipes').insert(data).select().single(), { label: 'bos.recipes.create', retries: 0 }),
  update: (id: string, data: Partial<Recipe>) => apiRequest<Recipe>(() => supabase.from('recipes').update(data).eq('id', id).select().single(), { label: 'bos.recipes.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipes').delete().eq('id', id), { label: 'bos.recipes.remove', retries: 0 }),
};

export const recipeInputsApi = {
  list: () => apiRequest<RecipeInput[]>(() => supabase.from('recipe_inputs').select('*').order('created_at', ORDER_DESC), { label: 'bos.recipeInputs.list' }),
  byRecipe: (recipeId: string) => apiRequest<RecipeInput[]>(() => supabase.from('recipe_inputs').select('*').eq('recipe_id', recipeId), { label: 'bos.recipeInputs.byRecipe' }),
  create: (data: Omit<RecipeInput, 'id' | 'created_at'>) => apiRequest<RecipeInput>(() => supabase.from('recipe_inputs').insert(data).select().single(), { label: 'bos.recipeInputs.create', retries: 0 }),
  update: (id: string, data: Partial<RecipeInput>) => apiRequest<RecipeInput>(() => supabase.from('recipe_inputs').update(data).eq('id', id).select().single(), { label: 'bos.recipeInputs.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipe_inputs').delete().eq('id', id), { label: 'bos.recipeInputs.remove', retries: 0 }),
};

export const recipeStepsApi = {
  list: () => apiRequest<RecipeStep[]>(() => supabase.from('recipe_steps').select('*').order('step_no', { ascending: true }), { label: 'bos.recipeSteps.list' }),
  byRecipe: (recipeId: string) => apiRequest<RecipeStep[]>(() => supabase.from('recipe_steps').select('*').eq('recipe_id', recipeId).order('step_no', { ascending: true }), { label: 'bos.recipeSteps.byRecipe' }),
  create: (data: Omit<RecipeStep, 'id' | 'created_at'>) => apiRequest<RecipeStep>(() => supabase.from('recipe_steps').insert(data).select().single(), { label: 'bos.recipeSteps.create', retries: 0 }),
  update: (id: string, data: Partial<RecipeStep>) => apiRequest<RecipeStep>(() => supabase.from('recipe_steps').update(data).eq('id', id).select().single(), { label: 'bos.recipeSteps.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipe_steps').delete().eq('id', id), { label: 'bos.recipeSteps.remove', retries: 0 }),
};

// ── Allergens ─────────────────────────────────────────────────────────────────
export const allergenMatrixApi = {
  list: () => apiRequest<AllergenMatrix[]>(() => supabase.from('allergen_matrix').select('*').order('created_at', ORDER_DESC), { label: 'bos.allergenMatrix.list' }),
  create: (data: Omit<AllergenMatrix, 'id' | 'created_at'>) => apiRequest<AllergenMatrix>(() => supabase.from('allergen_matrix').insert(data).select().single(), { label: 'bos.allergenMatrix.create', retries: 0 }),
  update: (id: string, data: Partial<AllergenMatrix>) => apiRequest<AllergenMatrix>(() => supabase.from('allergen_matrix').update(data).eq('id', id).select().single(), { label: 'bos.allergenMatrix.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('allergen_matrix').delete().eq('id', id), { label: 'bos.allergenMatrix.remove', retries: 0 }),
};

// ── Consumed Lots (RM audit trail from batch production) ───────────────────────
export const consumedLotsApi = {
  byBatch: (batchId: string) => apiRequest<any[]>(() => supabase.from('consumed_lots').select('*').eq('batch_id', batchId), { label: 'bos.consumedLots.byBatch' }),
  create: (data: { batch_id: string; batch_no: string; lot_id: string | null; lot_no: string | null; material: string; qty_consumed: number; rate: number; cost: number; }) =>
    apiRequest<any>(() => supabase.from('consumed_lots').insert(data).select().single(), { label: 'bos.consumedLots.create', retries: 0 }),
};

// ── SOP Register ───────────────────────────────────────────────────────────────
export const sopApi = {
  list: () => apiRequest<any[]>(() => supabase.from('sops').select('*').order('created_at', { ascending: false }), { label: 'bos.sops.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('sops').insert(data).select().single(), { label: 'bos.sops.create', retries: 0 }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('sops').update(data).eq('id', id).select().single(), { label: 'bos.sops.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('sops').delete().eq('id', id), { label: 'bos.sops.remove', retries: 0 }),
};

// ── Training Records ───────────────────────────────────────────────────────────
export const trainingApi = {
  list: () => apiRequest<any[]>(() => supabase.from('training_records').select('*').order('training_date', { ascending: false }), { label: 'bos.training.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('training_records').insert(data).select().single(), { label: 'bos.training.create', retries: 0 }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('training_records').update(data).eq('id', id).select().single(), { label: 'bos.training.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('training_records').delete().eq('id', id), { label: 'bos.training.remove', retries: 0 }),
};

// ── Audit Schedules ────────────────────────────────────────────────────────────
export const auditSchedulesApi = {
  list: () => apiRequest<any[]>(() => supabase.from('audit_schedules').select('*').order('scheduled_date', { ascending: false }), { label: 'bos.auditSchedules.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('audit_schedules').insert(data).select().single(), { label: 'bos.auditSchedules.create', retries: 0 }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('audit_schedules').update(data).eq('id', id).select().single(), { label: 'bos.auditSchedules.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('audit_schedules').delete().eq('id', id), { label: 'bos.auditSchedules.remove', retries: 0 }),
};

// ── Recipe QC Parameters ───────────────────────────────────────────────────────
export const recipeQcParamsApi = {
  byRecipe: (recipeId: string) => apiRequest<RecipeQcParam[]>(() => supabase.from('recipe_qc_params').select('*').eq('recipe_id', recipeId).order('sort_order', { ascending: true }), { label: 'bos.recipeQcParams.byRecipe' }),
  create: (data: Omit<RecipeQcParam, 'id' | 'created_at'>) => apiRequest<RecipeQcParam>(() => supabase.from('recipe_qc_params').insert(data).select().single(), { label: 'bos.recipeQcParams.create', retries: 0 }),
  update: (id: string, data: Partial<RecipeQcParam>) => apiRequest<RecipeQcParam>(() => supabase.from('recipe_qc_params').update(data).eq('id', id).select().single(), { label: 'bos.recipeQcParams.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipe_qc_params').delete().eq('id', id), { label: 'bos.recipeQcParams.remove', retries: 0 }),
};



export const recipeFsmsCcpApi = {
  list: () => apiRequest<any[]>(() => supabase.from('recipe_fsms_ccp').select('*, recipes(name)'), { label: 'bos.recipeFsmsCcp.list' }),
  byRecipe: (recipeId: string) => apiRequest<any[]>(() => supabase.from('recipe_fsms_ccp').select('*').eq('recipe_id', recipeId).order('sort_order', { ascending: true }), { label: 'bos.recipeFsmsCcp.byRecipe' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('recipe_fsms_ccp').insert(data).select().single(), { label: 'bos.recipeFsmsCcp.create', retries: 0 }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('recipe_fsms_ccp').update(data).eq('id', id).select().single(), { label: 'bos.recipeFsmsCcp.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipe_fsms_ccp').delete().eq('id', id), { label: 'bos.recipeFsmsCcp.remove', retries: 0 }),
};

export const recipeFsmsPrpApi = {
  list: () => apiRequest<any[]>(() => supabase.from('recipe_fsms_prp').select('*, recipes(name)'), { label: 'bos.recipeFsmsPrp.list' }),
  byRecipe: (recipeId: string) => apiRequest<any[]>(() => supabase.from('recipe_fsms_prp').select('*').eq('recipe_id', recipeId).order('sort_order', { ascending: true }), { label: 'bos.recipeFsmsPrp.byRecipe' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('recipe_fsms_prp').insert(data).select().single(), { label: 'bos.recipeFsmsPrp.create', retries: 0 }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('recipe_fsms_prp').update(data).eq('id', id).select().single(), { label: 'bos.recipeFsmsPrp.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('recipe_fsms_prp').delete().eq('id', id), { label: 'bos.recipeFsmsPrp.remove', retries: 0 }),
};

export const customerComplaintsApi = {
  list: () => apiRequest<CustomerComplaint[]>(() => supabase.from('customer_complaints').select('*').order('complaint_date', { ascending: false }), { label: 'bos.customerComplaints.list' }),
  create: (data: Omit<CustomerComplaint, 'id' | 'created_at'>) => apiRequest<CustomerComplaint>(() => supabase.from('customer_complaints').insert(data).select().single(), { label: 'bos.customerComplaints.create', retries: 0 }),
  update: (id: string, data: Partial<CustomerComplaint>) => apiRequest<CustomerComplaint>(() => supabase.from('customer_complaints').update(data).eq('id', id).select().single(), { label: 'bos.customerComplaints.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('customer_complaints').delete().eq('id', id), { label: 'bos.customerComplaints.remove', retries: 0 }),
};

// ── LOGISTICS & REPROCESSING API ───────────────────────────────────────────────

export const locationsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('locations').select('*').order('name', { ascending: true }), { label: 'bos.locations.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('locations').insert(data).select().single(), { label: 'bos.locations.create' }),
};

export const stockTransfersApi = {
  list: () => apiRequest<any[]>(() => supabase.from('stock_transfers').select('*').order('transfer_date', { ascending: false }), { label: 'bos.stockTransfers.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('stock_transfers').insert(data).select().single(), { label: 'bos.stockTransfers.create' }),
};

export const bulkLotsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('bulk_lots').select('*').order('created_at', { ascending: false }), { label: 'bos.bulkLots.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('bulk_lots').insert(data).select().single(), { label: 'bos.bulkLots.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('bulk_lots').update(data).eq('id', id).select().single(), { label: 'bos.bulkLots.update' }),
};

export const packagingRunsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('packaging_runs').select('*').order('run_date', { ascending: false }), { label: 'bos.packagingRuns.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('packaging_runs').insert(data).select().single(), { label: 'bos.packagingRuns.create' }),
};

export const wastageLogsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('wastage_logs').select('*').order('created_at', { ascending: false }), { label: 'bos.wastageLogs.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('wastage_logs').insert(data).select().single(), { label: 'bos.wastageLogs.create' }),
};

export const salesReturnsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('sales_returns').select('*').order('return_date', { ascending: false }), { label: 'bos.salesReturns.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('sales_returns').insert(data).select().single(), { label: 'bos.salesReturns.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('sales_returns').update(data).eq('id', id).select().single(), { label: 'bos.salesReturns.update' }),
};

export const returnQcApi = {
  list: () => apiRequest<any[]>(() => supabase.from('return_qc').select('*').order('qc_date', { ascending: false }), { label: 'bos.returnQc.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('return_qc').insert(data).select().single(), { label: 'bos.returnQc.create' }),
};

// ── GENERAL STORES & MAINTENANCE ──────────────────────────────────────────────

export const storeItemsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('store_items').select('*').order('name', { ascending: true }), { label: 'bos.storeItems.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('store_items').insert(data).select().single(), { label: 'bos.storeItems.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('store_items').update(data).eq('id', id).select().single(), { label: 'bos.storeItems.update' }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('store_items').delete().eq('id', id), { label: 'bos.storeItems.remove' }),
};

export const storeIndentsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('store_indents').select('*').order('created_at', { ascending: false }), { label: 'bos.storeIndents.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('store_indents').insert(data).select().single(), { label: 'bos.storeIndents.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('store_indents').update(data).eq('id', id).select().single(), { label: 'bos.storeIndents.update' }),
};

// ── SYSTEM ADMINISTRATION & SETTINGS ──────────────────────────────────────────

export const storeTransactionsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('store_transactions').select('*').order('txn_date', { ascending: false }).limit(500), { label: 'bos.storeTxns.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('store_transactions').insert(data).select().single(), { label: 'bos.storeTxns.create' }),
};

export const appUsersApi = {
  list: () => apiRequest<any[]>(() => supabase.from('app_users').select('*').order('created_at', { ascending: false }), { label: 'bos.appUsers.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('app_users').insert(data).select().single(), { label: 'bos.appUsers.create' }),
  updateStatus: (id: string, status: string) => apiRequest<any>(() => supabase.from('app_users').update({ status }).eq('id', id), { label: 'bos.appUsers.updateStatus' }),
  updateRole: (id: string, role: string) => apiRequest<any>(() => supabase.from('app_users').update({ role }).eq('id', id), { label: 'bos.appUsers.updateRole' }),
};

export const siteSettingsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('site_settings').select('key,value'), { label: 'bos.siteSettings.list' }),
  upsert: (key: string, value: string) => apiRequest<any>(() => supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }), { label: 'bos.siteSettings.upsert' }),
};

export const equipmentApi = {
  list: () => apiRequest<any[]>(() => supabase.from('equipment').select('*').order('created_at', { ascending: false }), { label: 'bos.equipment.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('equipment').insert(data).select().single(), { label: 'bos.equipment.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('equipment').update(data).eq('id', id), { label: 'bos.equipment.update' }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('equipment').delete().eq('id', id), { label: 'bos.equipment.remove' }),
};

export const workCentersApi = {
  list: () => apiRequest<any[]>(() => supabase.from('work_centers').select('*').order('created_at', { ascending: false }), { label: 'bos.workCenters.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('work_centers').insert(data).select().single(), { label: 'bos.workCenters.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('work_centers').update(data).eq('id', id), { label: 'bos.workCenters.update' }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('work_centers').delete().eq('id', id), { label: 'bos.workCenters.remove' }),
};

export const dailyLogsApi = {
  list: () => apiRequest<any[]>(() => supabase.from('daily_logs').select('*').order('log_date', { ascending: false }).limit(200), { label: 'bos.dailyLogs.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.from('daily_logs').insert(data).select().single(), { label: 'bos.dailyLogs.create' }),
  update: (id: string, data: any) => apiRequest<any>(() => supabase.from('daily_logs').update(data).eq('id', id), { label: 'bos.dailyLogs.update' }),
  remove: (id: string) => apiRequest<null>(() => supabase.from('daily_logs').delete().eq('id', id), { label: 'bos.dailyLogs.remove' }),
};

export const metricsApi = {
  count: (table: string, match?: Record<string, any>) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (match) q = q.match(match);
    return q.then(res => res.count || 0);
  },
  adminBackups: (table: string) => apiRequest<any[]>(() => supabase.from(table).select('*'), { label: 'bos.adminBackups.export' })
};

// ── Master Data v3.2 Extensions ──────────────────────────────────────────────

export const mdItemsApi = {
  list: () => apiRequest<Item[]>(() => supabase.schema('md').from('items').select('*').order('created_at', ORDER_DESC), { label: 'bos.mdItems.list' }),
  byId: (id: string) => apiRequest<Item>(() => supabase.schema('md').from('items').select('*').eq('id', id).single(), { label: 'bos.mdItems.byId' }),
  create: (data: Omit<Item, 'id' | 'created_at'>) => apiRequest<Item>(() => supabase.schema('md').from('items').insert(data).select().single(), { label: 'bos.mdItems.create', retries: 0 }),
  update: (id: string, data: Partial<Item>) => apiRequest<Item>(() => supabase.schema('md').from('items').update(data).eq('id', id).select().single(), { label: 'bos.mdItems.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('md').from('items').delete().eq('id', id), { label: 'bos.mdItems.remove', retries: 0 }),
};

export const mdSkusApi = {
  list: () => apiRequest<Sku[]>(() => supabase.schema('md').from('skus').select('*').order('created_at', ORDER_DESC), { label: 'bos.mdSkus.list' }),
  byId: (id: string) => apiRequest<Sku>(() => supabase.schema('md').from('skus').select('*').eq('id', id).single(), { label: 'bos.mdSkus.byId' }),
  create: (data: Omit<Sku, 'id' | 'created_at'>) => apiRequest<Sku>(() => supabase.schema('md').from('skus').insert(data).select().single(), { label: 'bos.mdSkus.create', retries: 0 }),
  update: (id: string, data: Partial<Sku>) => apiRequest<Sku>(() => supabase.schema('md').from('skus').update(data).eq('id', id).select().single(), { label: 'bos.mdSkus.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('md').from('skus').delete().eq('id', id), { label: 'bos.mdSkus.remove', retries: 0 }),
};

export const mdItemRelationshipsApi = {
  list: () => apiRequest<ItemRelationship[]>(() => supabase.schema('md').from('item_relationships').select('*').order('created_at', ORDER_DESC), { label: 'bos.mdItemRelationships.list' }),
  create: (data: Omit<ItemRelationship, 'id' | 'created_at'>) => apiRequest<ItemRelationship>(() => supabase.schema('md').from('item_relationships').insert(data).select().single(), { label: 'bos.mdItemRelationships.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('md').from('item_relationships').delete().eq('id', id), { label: 'bos.mdItemRelationships.remove', retries: 0 }),
};

export const mdBrandsApi = {
  list: () => apiRequest<Brand[]>(() => supabase.schema('md').from('brands').select('*').order('code', { ascending: true }), { label: 'bos.mdBrands.list' }),
  byId: (id: string) => apiRequest<Brand>(() => supabase.schema('md').from('brands').select('*').eq('id', id).single(), { label: 'bos.mdBrands.byId' }),
  create: (data: Omit<Brand, 'id'>) => apiRequest<Brand>(() => supabase.schema('md').from('brands').insert(data).select().single(), { label: 'bos.mdBrands.create', retries: 0 }),
  update: (id: string, data: Partial<Brand>) => apiRequest<Brand>(() => supabase.schema('md').from('brands').update(data).eq('id', id).select().single(), { label: 'bos.mdBrands.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('md').from('brands').delete().eq('id', id), { label: 'bos.mdBrands.remove', retries: 0 }),
};

export const mdSitesApi = {
  list: () => apiRequest<Site[]>(() => supabase.schema('md').from('sites').select('*').order('code', { ascending: true }), { label: 'bos.mdSites.list' }),
  byId: (id: string) => apiRequest<Site>(() => supabase.schema('md').from('sites').select('*').eq('id', id).single(), { label: 'bos.mdSites.byId' }),
  create: (data: Omit<Site, 'id'>) => apiRequest<Site>(() => supabase.schema('md').from('sites').insert(data).select().single(), { label: 'bos.mdSites.create', retries: 0 }),
  update: (id: string, data: Partial<Site>) => apiRequest<Site>(() => supabase.schema('md').from('sites').update(data).eq('id', id).select().single(), { label: 'bos.mdSites.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('md').from('sites').delete().eq('id', id), { label: 'bos.mdSites.remove', retries: 0 }),
};

export const invLotsApi = {
  list: () => apiRequest<any[]>(() => supabase.schema('inv').from('lots').select('*').order('created_at', ORDER_DESC), { label: 'bos.invLots.list' }),
  create: (data: any) => apiRequest<any>(() => supabase.schema('inv').from('lots').insert(data).select().single(), { label: 'bos.invLots.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('inv').from('lots').delete().eq('id', id), { label: 'bos.invLots.remove', retries: 0 }),
};

// ── Logistics & Dispatch v3.2 Extensions ─────────────────────────────────────

export const logisticsPalletsApi = {
  list: () => apiRequest<Pallet[]>(() => supabase.schema('logistics').from('pallets').select('*').order('created_at', ORDER_DESC), { label: 'bos.logisticsPallets.list' }),
  byId: (id: string) => apiRequest<Pallet>(() => supabase.schema('logistics').from('pallets').select('*').eq('id', id).single(), { label: 'bos.logisticsPallets.byId' }),
  create: (data: Omit<Pallet, 'id' | 'created_at'>) => apiRequest<Pallet>(() => supabase.schema('logistics').from('pallets').insert(data).select().single(), { label: 'bos.logisticsPallets.create', retries: 0 }),
  update: (id: string, data: Partial<Pallet>) => apiRequest<Pallet>(() => supabase.schema('logistics').from('pallets').update(data).eq('id', id).select().single(), { label: 'bos.logisticsPallets.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('logistics').from('pallets').delete().eq('id', id), { label: 'bos.logisticsPallets.remove', retries: 0 }),
};

export const logisticsPalletItemsApi = {
  byPallet: (palletId: string) => apiRequest<PalletItem[]>(() => supabase.schema('logistics').from('pallet_items').select('*').eq('pallet_id', palletId), { label: 'bos.logisticsPalletItems.byPallet' }),
  create: (data: Omit<PalletItem, 'id' | 'created_at'>) => apiRequest<PalletItem>(() => supabase.schema('logistics').from('pallet_items').insert(data).select().single(), { label: 'bos.logisticsPalletItems.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('logistics').from('pallet_items').delete().eq('id', id), { label: 'bos.logisticsPalletItems.remove', retries: 0 }),
};

export const dispatchOrdersApi = {
  list: () => apiRequest<DispatchOrder[]>(() => supabase.schema('fin').from('dispatch_orders').select('*').order('created_at', ORDER_DESC), { label: 'bos.dispatchOrders.list' }),
  byId: (id: string) => apiRequest<DispatchOrder>(() => supabase.schema('fin').from('dispatch_orders').select('*').eq('id', id).single(), { label: 'bos.dispatchOrders.byId' }),
  create: (data: Omit<DispatchOrder, 'id' | 'created_at'>) => apiRequest<DispatchOrder>(() => supabase.schema('fin').from('dispatch_orders').insert(data).select().single(), { label: 'bos.dispatchOrders.create', retries: 0 }),
  update: (id: string, data: Partial<DispatchOrder>) => apiRequest<DispatchOrder>(() => supabase.schema('fin').from('dispatch_orders').update(data).eq('id', id).select().single(), { label: 'bos.dispatchOrders.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('dispatch_orders').delete().eq('id', id), { label: 'bos.dispatchOrders.remove', retries: 0 }),
};

export const dispatchLinesApi = {
  byOrder: (orderId: string) => apiRequest<DispatchLine[]>(() => supabase.schema('fin').from('dispatch_lines').select('*').eq('dispatch_order_id', orderId), { label: 'bos.dispatchLines.byOrder' }),
  create: (data: Omit<DispatchLine, 'id'>) => apiRequest<DispatchLine>(() => supabase.schema('fin').from('dispatch_lines').insert(data).select().single(), { label: 'bos.dispatchLines.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('dispatch_lines').delete().eq('id', id), { label: 'bos.dispatchLines.remove', retries: 0 }),
};

// ── Costing Engine v3.2 Extensions ───────────────────────────────────────────

export const costCentersApi = {
  list: () => apiRequest<CostCenter[]>(() => supabase.schema('fin').from('cost_centers').select('*').order('code', { ascending: true }), { label: 'bos.costCenters.list' }),
  byId: (id: string) => apiRequest<CostCenter>(() => supabase.schema('fin').from('cost_centers').select('*').eq('id', id).single(), { label: 'bos.costCenters.byId' }),
  create: (data: Omit<CostCenter, 'id'>) => apiRequest<CostCenter>(() => supabase.schema('fin').from('cost_centers').insert(data).select().single(), { label: 'bos.costCenters.create', retries: 0 }),
  update: (id: string, data: Partial<CostCenter>) => apiRequest<CostCenter>(() => supabase.schema('fin').from('cost_centers').update(data).eq('id', id).select().single(), { label: 'bos.costCenters.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('cost_centers').delete().eq('id', id), { label: 'bos.costCenters.remove', retries: 0 }),
};

export const utilityConsumptionApi = {
  list: () => apiRequest<UtilityConsumption[]>(() => supabase.schema('fin').from('utility_consumption').select('*').order('reading_date', ORDER_DESC), { label: 'bos.utilityConsumption.list' }),
  create: (data: Omit<UtilityConsumption, 'id' | 'total_cost'>) => apiRequest<UtilityConsumption>(() => supabase.schema('fin').from('utility_consumption').insert(data).select().single(), { label: 'bos.utilityConsumption.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('utility_consumption').delete().eq('id', id), { label: 'bos.utilityConsumption.remove', retries: 0 }),
};

export const laborHoursApi = {
  byBatch: (batchId: string) => apiRequest<LaborHours[]>(() => supabase.schema('fin').from('labor_hours').select('*').eq('batch_id', batchId), { label: 'bos.laborHours.byBatch' }),
  create: (data: Omit<LaborHours, 'id'>) => apiRequest<LaborHours>(() => supabase.schema('fin').from('labor_hours').insert(data).select().single(), { label: 'bos.laborHours.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('labor_hours').delete().eq('id', id), { label: 'bos.laborHours.remove', retries: 0 }),
};

export const overheadAllocationsApi = {
  list: () => apiRequest<OverheadAllocation[]>(() => supabase.schema('fin').from('overhead_allocations').select('*').order('allocation_date', ORDER_DESC), { label: 'bos.overheadAllocations.list' }),
  create: (data: Omit<OverheadAllocation, 'id'>) => apiRequest<OverheadAllocation>(() => supabase.schema('fin').from('overhead_allocations').insert(data).select().single(), { label: 'bos.overheadAllocations.create', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('fin').from('overhead_allocations').delete().eq('id', id), { label: 'bos.overheadAllocations.remove', retries: 0 }),
};

// ── HR & LMS Training Matrix v3.2 Extensions ────────────────────────────────

export const hrEmployeesApi = {
  list: () => apiRequest<Employee[]>(() => supabase.schema('hr').from('employees').select('*').order('employee_code', { ascending: true }), { label: 'bos.hrEmployees.list' }),
  byId: (id: string) => apiRequest<Employee>(() => supabase.schema('hr').from('employees').select('*').eq('id', id).single(), { label: 'bos.hrEmployees.byId' }),
  create: (data: Omit<Employee, 'id' | 'created_at'>) => apiRequest<Employee>(() => supabase.schema('hr').from('employees').insert(data).select().single(), { label: 'bos.hrEmployees.create', retries: 0 }),
  update: (id: string, data: Partial<Employee>) => apiRequest<Employee>(() => supabase.schema('hr').from('employees').update(data).eq('id', id).select().single(), { label: 'bos.hrEmployees.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('hr').from('employees').delete().eq('id', id), { label: 'bos.hrEmployees.remove', retries: 0 }),
};

export const hrTrainingRecordsApi = {
  list: () => apiRequest<TrainingRecord[]>(() => supabase.schema('hr').from('training_records').select('*').order('training_date', ORDER_DESC), { label: 'bos.hrTrainingRecords.list' }),
  byEmployee: (employeeId: string) => apiRequest<TrainingRecord[]>(() => supabase.schema('hr').from('training_records').select('*').eq('employee_id', employeeId), { label: 'bos.hrTrainingRecords.byEmployee' }),
  create: (data: Omit<TrainingRecord, 'id' | 'created_at'>) => apiRequest<TrainingRecord>(() => supabase.schema('hr').from('training_records').insert(data).select().single(), { label: 'bos.hrTrainingRecords.create', retries: 0 }),
  update: (id: string, data: Partial<TrainingRecord>) => apiRequest<TrainingRecord>(() => supabase.schema('hr').from('training_records').update(data).eq('id', id).select().single(), { label: 'bos.hrTrainingRecords.update', retries: 0 }),
  remove: (id: string) => apiRequest<null>(() => supabase.schema('hr').from('training_records').delete().eq('id', id), { label: 'bos.hrTrainingRecords.remove', retries: 0 }),
};







