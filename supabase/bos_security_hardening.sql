-- ==============================================================================
-- PHASE 2: BOS SECURITY HARDENING
-- Blocks direct browser writes to legacy BOS tables and enforces RPC usage.
-- ==============================================================================

-- 1. Ensure RLS is enabled on all BOS Tables
ALTER TABLE IF EXISTS public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fg_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;

-- 2. Allow SELECT for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read access on grns" ON grns;
CREATE POLICY "Allow authenticated read access on grns" ON public.grns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on lots" ON lots;
CREATE POLICY "Allow authenticated read access on lots" ON public.lots FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on batches" ON batches;
CREATE POLICY "Allow authenticated read access on batches" ON public.batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on qc_checks" ON qc_checks;
CREATE POLICY "Allow authenticated read access on qc_checks" ON public.qc_checks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on fg_lots" ON fg_lots;
CREATE POLICY "Allow authenticated read access on fg_lots" ON public.fg_lots FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on dispatches" ON dispatches;
CREATE POLICY "Allow authenticated read access on dispatches" ON public.dispatches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on invoices" ON invoices;
CREATE POLICY "Allow authenticated read access on invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on payments" ON payments;
CREATE POLICY "Allow authenticated read access on payments" ON public.payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read access on expenses" ON expenses;
CREATE POLICY "Allow authenticated read access on expenses" ON public.expenses FOR SELECT TO authenticated USING (true);

-- 3. Create Trigger Function to Block Direct Browser Writes
CREATE OR REPLACE FUNCTION public.assert_rpc_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If not called from an RPC that sets the workflow_context, block the mutation
  IF current_setting('app.workflow_context', true) IS DISTINCT FROM 'rpc' THEN
    RAISE EXCEPTION 'Direct database mutation from the browser is blocked for security reasons. Please use the designated RPC endpoints for %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Apply the RPC Enforcer Trigger to all BOS Tables
DROP TRIGGER IF EXISTS trg_block_direct_grns ON public.grns;
CREATE TRIGGER trg_block_direct_grns BEFORE INSERT OR UPDATE OR DELETE ON public.grns
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_lots ON public.lots;
CREATE TRIGGER trg_block_direct_lots BEFORE INSERT OR UPDATE OR DELETE ON public.lots
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_batches ON public.batches;
CREATE TRIGGER trg_block_direct_batches BEFORE INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_qc_checks ON public.qc_checks;
CREATE TRIGGER trg_block_direct_qc_checks BEFORE INSERT OR UPDATE OR DELETE ON public.qc_checks
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_fg_lots ON public.fg_lots;
CREATE TRIGGER trg_block_direct_fg_lots BEFORE INSERT OR UPDATE OR DELETE ON public.fg_lots
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_dispatches ON public.dispatches;
CREATE TRIGGER trg_block_direct_dispatches BEFORE INSERT OR UPDATE OR DELETE ON public.dispatches
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_invoices ON public.invoices;
CREATE TRIGGER trg_block_direct_invoices BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_payments ON public.payments;
CREATE TRIGGER trg_block_direct_payments BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_expenses ON public.expenses;
CREATE TRIGGER trg_block_direct_expenses BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

-- Note: The BOS HTML modules will temporarily break on WRITE operations until their 
-- fetch() calls are updated to use Supabase RPCs (e.g. create_grn(), submit_batch()).
-- This strictly forces the migration from HTML direct writes to secure RPCs.
