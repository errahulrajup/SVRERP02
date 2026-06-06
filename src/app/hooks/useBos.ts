import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Grn, Lot, FgLot, Batch, QcCheck, Invoice, Payment, Expense, Dispatch, Recipe, RecipeInput, RecipeStep, Product, AllergenMatrix,
  AllergenRecord, Capa, HaccpCcp, Prp, Recall, FssaiRecord, FssaiAudit, CustomerComplaint,
} from '../types/bos';
import {
  grnsApi, lotsApi, fgLotsApi, batchesApi, qcChecksApi, invoicesApi, paymentsApi, expensesApi,
  dispatchesApi, recipesApi, recipeInputsApi, recipeStepsApi, bosProductsApi, allergenMatrixApi,
  capaApi, haccpApi, prpApi, recallApi, fssaiApi, fssaiAuditsApi,
  sopApi, trainingApi, hrEmployeesApi, hrTrainingRecordsApi, auditSchedulesApi, recipeFsmsCcpApi, recipeFsmsPrpApi, customerComplaintsApi, dispatchOrdersApi
} from '../lib/bosApi';

// ── Generic list hook factory ─────────────────────────────────────────────────
function makeListHook<T>(
  fetcher: () => Promise<{ data: T[] | null; error: { message: string } | null }>,
) {
  return function useList() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);

    const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      const { data, error: e } = await fetcher();
      if (!mounted.current) return;
      if (e) setError(e.message ?? 'Error loading data');
      else setItems(data ?? []);
      setLoading(false);
    }, []);

    useEffect(() => {
      mounted.current = true;
      load();
      return () => { mounted.current = false; };
    }, [load]);

    return { items, loading, error, reload: load, setItems };
  };
}

// ── Exported hooks ─────────────────────────────────────────────────────────────
export const useGrns         = makeListHook<Grn>(() => grnsApi.list());
export const useLots         = makeListHook<Lot>(() => lotsApi.list());
export const useFgLots       = makeListHook<FgLot>(() => fgLotsApi.list());
export const useBatches      = makeListHook<Batch>(() => batchesApi.list());
export const useQcChecks     = makeListHook<QcCheck>(() => qcChecksApi.list());
export const useInvoices     = makeListHook<Invoice>(() => invoicesApi.list());
export const usePayments     = makeListHook<Payment>(() => paymentsApi.list());
export const useExpenses     = makeListHook<Expense>(() => expensesApi.list());
export const useDispatches   = makeListHook<Dispatch>(() => dispatchesApi.list());
export const useRecipes      = makeListHook<Recipe>(() => recipesApi.list());
export const useRecipeInputs = makeListHook<RecipeInput>(() => recipeInputsApi.list());
export const useRecipeSteps  = makeListHook<RecipeStep>(() => recipeStepsApi.list());
export const useProducts     = makeListHook<Product>(() => bosProductsApi.list());
export const useAllergenMatrix = makeListHook<AllergenMatrix>(() => allergenMatrixApi.list());
export const useAllergens    = useAllergenMatrix;    // backward-compat alias
export const useCapa         = makeListHook<Capa>(() => capaApi.list());
export const useHaccp        = makeListHook<HaccpCcp>(() => haccpApi.list());
export const usePrp          = makeListHook<Prp>(() => prpApi.list());
export const useRecalls      = makeListHook<Recall>(() => recallApi.list());
export const useFssai        = makeListHook<FssaiRecord>(() => fssaiApi.list());
export const useFssaiAudits  = makeListHook<FssaiAudit>(() => fssaiAuditsApi.list());
export const useSops         = makeListHook<any>(() => sopApi.list());
export const useTraining     = makeListHook<any>(() => trainingApi.list());
export const useEmployees    = makeListHook<any>(() => hrEmployeesApi.list());
export const useTrainingRecords = makeListHook<any>(() => hrTrainingRecordsApi.list());

export const isOperatorTrained = (employeeId: string, sopNo: string, records: any[], sops: any[]) => {
  const rec = records.find(r => {
    const sop = sops.find(s => s.id === r.sop_id);
    return r.employee_id === employeeId && sop?.sop_no === sopNo;
  });
  if (!rec) return false;
  const expiry = rec.expiry_date ? new Date(rec.expiry_date) : new Date('2099-01-01');
  return rec.status === 'PASSED' && expiry > new Date();
};
export const useAuditSchedules = makeListHook<any>(() => auditSchedulesApi.list());
export const useRecipeFsmsCcp  = makeListHook<any>(() => recipeFsmsCcpApi.list());
export const useRecipeFsmsPrp  = makeListHook<any>(() => recipeFsmsPrpApi.list());
export const useCustomerComplaints = makeListHook<CustomerComplaint>(() => customerComplaintsApi.list());

// ── Boss Dashboard aggregate hook ─────────────────────────────────────────────
export function useBossDashboard() {
  const grnsHook     = useGrns();
  const batchesHook  = useBatches();
  const lotsHook     = useLots();
  const invoicesHook = useInvoices();
  const expensesHook = useExpenses();
  const qcHook       = useQcChecks();

  const loading = grnsHook.loading || batchesHook.loading || lotsHook.loading ||
                  invoicesHook.loading || expensesHook.loading || qcHook.loading;

  const grns     = grnsHook.items;
  const batches  = batchesHook.items;
  const lots     = lotsHook.items;
  const invoices = invoicesHook.items;
  const expenses = expensesHook.items;

  const revenue    = invoices.reduce((a, i) => a + (i.paid_amt || 0), 0);
  const unpaid     = invoices.reduce((a, i) => a + Math.max(0, (i.total || 0) - (i.paid_amt || 0)), 0);
  const autoExp    = expenses.filter(e => e.category === 'Raw Material' && (e.notes || '').includes('Auto-created'));
  const manualExp  = expenses.filter(e => !(e.category === 'Raw Material' && (e.notes || '').includes('Auto-created')));
  const procTotal  = autoExp.reduce((a, e) => a + (e.amount || 0), 0);
  const opexTotal  = manualExp.reduce((a, e) => a + (e.amount || 0), 0);
  const expTotal   = procTotal + opexTotal;
  const grossProfit = revenue - procTotal;
  const profit     = grossProfit - opexTotal;

  const activeBatches = batches.filter(b => b.status === 'RUNNING');
  const pendingQC     = batches.filter(b => b.status === 'QC_HOLD');
  const pendingGRN    = grns.filter(g => g.status === 'QC_PENDING');
  const now = Date.now();
  const expiring = lots.filter(l => {
    if (!l.expiry_date) return false;
    const d = Math.floor((new Date(l.expiry_date).getTime() - now) / 86400000);
    return d >= 0 && d <= 30;
  });
  const expired = lots.filter(l => l.expiry_date && new Date(l.expiry_date).getTime() < now);

  return {
    loading, grns, batches, lots, invoices, expenses,
    revenue, unpaid, expTotal, profit, procTotal, opexTotal,
    activeBatches, pendingQC, pendingGRN, expiring, expired,
    reload: () => {
      grnsHook.reload(); batchesHook.reload(); lotsHook.reload();
      invoicesHook.reload(); expensesHook.reload(); qcHook.reload();
    },
  };
}

// ── Manager Dashboard aggregate hook ─────────────────────────────────────────
export function useManagerDashboard() {
  const batchesHook  = useBatches();
  const grnsHook     = useGrns();
  const dispatchHook = useDispatches();
  const lotsHook     = useLots();

  const loading = batchesHook.loading || grnsHook.loading || dispatchHook.loading || lotsHook.loading;
  const now = Date.now();

  const active   = batchesHook.items.filter(b => b.status === 'RUNNING');
  const planned  = batchesHook.items.filter(b => b.status === 'PLANNED' as string);
  const qcHold   = batchesHook.items.filter(b => b.status === 'QC_HOLD');
  const pendGRN  = grnsHook.items.filter(g => g.status === 'QC_PENDING');
  const pendDO   = dispatchHook.items.filter(d => d.status === 'PLANNED');
  const expiring = lotsHook.items.filter(l => {
    if (!l.expiry_date) return false;
    const d = Math.floor((new Date(l.expiry_date).getTime() - now) / 86400000);
    return d >= 0 && d <= 7;
  });
  const approvedLots = lotsHook.items.filter(l => l.qc_status === 'approved');
  const completed = batchesHook.items.filter(b => b.status === 'COMPLETED');

  return {
    loading, active, planned, qcHold, pendGRN, pendDO, expiring,
    approvedLots, completed,
    batches: batchesHook.items,
    grns: grnsHook.items,
    dispatches: dispatchHook.items,
    lots: lotsHook.items,
    reload: () => { batchesHook.reload(); grnsHook.reload(); dispatchHook.reload(); lotsHook.reload(); },
  };
}

export function useDispatchOrders() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await dispatchOrdersApi.list();
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);
  return { items, loading, reload: fetch };
}
