-- ============================================================
-- MAKER-CHECKER WORKFLOW (Dispatches & Payments)
-- Implements strict dual-authorization for critical financial
-- and inventory workflows.
-- ============================================================

-- ── 1. Enhance Dispatches Table ──
ALTER TABLE public.dispatches 
ADD COLUMN IF NOT EXISTS maker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS maker_checker_status text DEFAULT 'PENDING' CHECK (maker_checker_status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing records are considered approved
UPDATE public.dispatches SET maker_checker_status = 'APPROVED' WHERE maker_checker_status = 'PENDING';

-- ── 2. Enhance Payments Table ──
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS maker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS maker_checker_status text DEFAULT 'PENDING' CHECK (maker_checker_status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing records are considered approved
UPDATE public.payments SET maker_checker_status = 'APPROVED' WHERE maker_checker_status = 'PENDING';

-- ── 3. RPC for Dispatch Approval ──
CREATE OR REPLACE FUNCTION public.approve_dispatch(
  p_dispatch_id text,
  p_status text, -- 'APPROVED' or 'REJECTED'
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_maker_id uuid;
  v_current_status text;
  v_role text;
BEGIN
  -- Get user role
  v_role := auth.jwt()->'app_metadata'->>'role';
  
  -- Check permission
  IF v_role NOT IN ('ADMIN', 'MANAGER') THEN
    RAISE EXCEPTION 'Only ADMIN or MANAGER can approve or reject dispatches';
  END IF;

  -- Get current record
  SELECT maker_id, maker_checker_status INTO v_maker_id, v_current_status
  FROM public.dispatches
  WHERE id = p_dispatch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispatch not found';
  END IF;

  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Dispatch is already processed';
  END IF;

  -- Prevent self-approval
  IF v_maker_id = auth.uid() THEN
    RAISE EXCEPTION 'Compliance Error: Maker cannot be the Checker';
  END IF;

  -- Validate rejection reason
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR trim(p_rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Apply update
  UPDATE public.dispatches
  SET 
    maker_checker_status = p_status,
    checker_id = auth.uid(),
    approved_at = CASE WHEN p_status = 'APPROVED' THEN now() ELSE NULL END,
    rejection_reason = p_rejection_reason,
    -- If approved, move dispatch status to CONFIRMED so it can proceed
    status = CASE WHEN p_status = 'APPROVED' THEN 'CONFIRMED' ELSE 'DRAFT' END
  WHERE id = p_dispatch_id;

END;
$$;

-- ── 4. RPC for Payment Approval ──
CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id text,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_maker_id uuid;
  v_current_status text;
  v_role text;
BEGIN
  v_role := auth.jwt()->'app_metadata'->>'role';
  
  IF v_role NOT IN ('ADMIN', 'MANAGER') THEN
    RAISE EXCEPTION 'Only ADMIN or MANAGER can approve or reject payments';
  END IF;

  SELECT maker_id, maker_checker_status INTO v_maker_id, v_current_status
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Payment is already processed';
  END IF;

  IF v_maker_id = auth.uid() THEN
    RAISE EXCEPTION 'Compliance Error: Maker cannot be the Checker';
  END IF;

  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR trim(p_rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  UPDATE public.payments
  SET 
    maker_checker_status = p_status,
    checker_id = auth.uid(),
    approved_at = CASE WHEN p_status = 'APPROVED' THEN now() ELSE NULL END,
    rejection_reason = p_rejection_reason
  WHERE id = p_payment_id;

END;
$$;

-- ── 5. Triggers to auto-set Maker and block invalid state changes ──
CREATE OR REPLACE FUNCTION trg_set_maker_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Always enforce the maker is the current user
  NEW.maker_id = auth.uid();
  NEW.maker_checker_status = 'PENDING';
  NEW.checker_id = NULL;
  NEW.approved_at = NULL;
  NEW.rejection_reason = NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatches_maker ON public.dispatches;
CREATE TRIGGER trg_dispatches_maker
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW
  EXECUTE PROCEDURE trg_set_maker_id();

DROP TRIGGER IF EXISTS trg_payments_maker ON public.payments;
CREATE TRIGGER trg_payments_maker
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE PROCEDURE trg_set_maker_id();

-- Block direct update to maker_checker_status without using the RPC
CREATE OR REPLACE FUNCTION trg_protect_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- We allow the RPC to bypass this because RPC is SECURITY DEFINER and runs as postgres,
  -- but we can just check if current_user is authenticated vs postgres.
  -- A simpler way is to only allow status change if checker_id is set (which RPC does).
  IF OLD.maker_checker_status != NEW.maker_checker_status THEN
    IF NEW.checker_id IS NULL THEN
      RAISE EXCEPTION 'Direct update to maker_checker_status is forbidden. Use approve_* RPC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatches_protect_approval ON public.dispatches;
CREATE TRIGGER trg_dispatches_protect_approval
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE PROCEDURE trg_protect_approval();

DROP TRIGGER IF EXISTS trg_payments_protect_approval ON public.payments;
CREATE TRIGGER trg_payments_protect_approval
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE PROCEDURE trg_protect_approval();
