-- ============================================================================
-- FINANCE RPCs: Invoices & Payments
-- Atomic transactions for AR.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_mode text,
  p_reference text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_inv invoices%ROWTYPE;
  v_total_paise bigint;
  v_paid_paise bigint;
  v_amt_paise bigint;
  v_new_paid_paise bigint;
  v_outstanding_paise bigint;
  v_new_status text;
  v_payment_id uuid;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found or not authenticated'; END IF;

  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found or access denied'; END IF;
  IF v_inv.status = 'CANCELLED' THEN RAISE EXCEPTION 'Cannot pay cancelled invoice: %', v_inv.invoice_no; END IF;
  IF v_inv.status = 'PAID' THEN RAISE EXCEPTION 'Invoice % is already fully paid', v_inv.invoice_no; END IF;

  v_total_paise := ROUND(v_inv.total * 100);
  v_paid_paise := ROUND(COALESCE(v_inv.paid_amt, 0) * 100);
  v_amt_paise := ROUND(p_amount * 100);
  v_outstanding_paise := GREATEST(0, v_total_paise - v_paid_paise);
  v_new_paid_paise := v_paid_paise + v_amt_paise;

  IF v_amt_paise <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF v_amt_paise > v_outstanding_paise THEN
    RAISE EXCEPTION 'Overpayment not allowed. Outstanding: %', (v_outstanding_paise / 100.0);
  END IF;

  INSERT INTO payments (
    id, org_id, invoice_id, invoice_no, customer, amount, mode,
    reference, payment_date, recorded_by, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_inv.id, v_inv.invoice_no, v_inv.customer, p_amount, p_mode,
    p_reference, p_payment_date, v_user_name, p_notes, now()
  ) RETURNING id INTO v_payment_id;

  v_new_status := CASE
    WHEN v_new_paid_paise >= v_total_paise THEN 'PAID'
    WHEN v_new_paid_paise > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END;

  UPDATE invoices
  SET paid_amt = v_new_paid_paise / 100.0,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'new_paid_amt', v_new_paid_paise / 100.0,
    'new_status', v_new_status, 'outstanding', (v_total_paise - v_new_paid_paise) / 100.0
  );
END; $$;

-- ============================================================================
-- LOGISTICS RPC: DISPATCH
-- ============================================================================
CREATE OR REPLACE FUNCTION dispatch_do_and_create_invoice(
  p_do_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_do dispatches%ROWTYPE;
  v_lot fg_lots%ROWTYPE;
  v_org_id uuid;
  v_unit_rate numeric;
  v_gst_pct numeric;
  v_subtotal numeric;
  v_gst_amt numeric;
  v_inv_total numeric;
  v_inv_no text;
  v_inv_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_do FROM dispatches 
  WHERE id = p_do_id AND org_id = v_org_id AND status = 'CONFIRMED' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DO not found or not confirmed'; END IF;

  SELECT * INTO v_lot FROM fg_lots WHERE id = v_do.batch_id AND org_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FG lot not found'; END IF;

  IF v_lot.coa_issued IS NOT TRUE AND v_lot.coa_no IS NULL THEN
    RAISE EXCEPTION 'QA GATE BLOCKED: Batch % has not received QC clearance', v_lot.batch_no;
  END IF;

  IF COALESCE(v_lot.qty_on_hand, 0) < v_do.quantity THEN
    RAISE EXCEPTION 'Insufficient FG stock. Available: %, Required: %', v_lot.qty_on_hand, v_do.quantity;
  END IF;

  UPDATE dispatches SET status = 'DISPATCHED', dispatched_at = now() WHERE id = p_do_id;

  INSERT INTO stock_ledger (
    org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by
  ) VALUES (
    v_org_id, v_do.batch_id, 'OUT', -v_do.quantity, v_do.id, 'Dispatch Order: ' || v_do.do_no, p_user_id
  );

  v_unit_rate := COALESCE(v_do.unit_rate, v_lot.unit_cost, 0);
  v_gst_pct := COALESCE(v_do.gst_pct, 18);
  v_subtotal := ROUND(v_do.quantity * v_unit_rate, 2);
  v_gst_amt := ROUND(v_subtotal * v_gst_pct / 100, 2);
  v_inv_total := ROUND(v_subtotal + v_gst_amt, 2);
  v_inv_no := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO invoices (
    id, org_id, invoice_no, customer, dispatch_id, batch_id, date,
    items, subtotal, gst_pct, gst_amt, total, status
  ) VALUES (
    gen_random_uuid(), v_org_id, v_inv_no, v_do.customer, v_do.id, v_do.batch_id, CURRENT_DATE,
    jsonb_build_array(jsonb_build_object('product', v_do.product, 'qty', v_do.quantity, 'unit', v_do.unit, 'rate', v_unit_rate, 'amount', v_subtotal)),
    v_subtotal, v_gst_pct, v_gst_amt, v_inv_total, 'PENDING'
  ) RETURNING id INTO v_inv_id;

  RETURN jsonb_build_object('success', true, 'invoice_no', v_inv_no, 'invoice_total', v_inv_total);
END; $$;
