-- ============================================================================
-- RPC: CREATE DISPATCH ORDER (Multi-Lot Pallet DO)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_pallet_dispatch_order(
  p_customer_id text,
  p_do_code text,
  p_challan_no text,
  p_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_do_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO dispatch_orders (
    org_id, site_id, customer_id, do_code, status, challan_no, notes
  ) VALUES (
    v_org_id, 'SITE-MAIN', p_customer_id, p_do_code, 'DRAFT', p_challan_no, p_notes
  ) RETURNING id INTO v_do_id;

  RETURN jsonb_build_object(
    'id', v_do_id,
    'org_id', v_org_id,
    'site_id', 'SITE-MAIN',
    'customer_id', p_customer_id,
    'do_code', p_do_code,
    'status', 'DRAFT',
    'challan_no', p_challan_no,
    'notes', p_notes
  );
END; $$;

-- ============================================================================
-- RPC: CREATE DISPATCH (Single Lot DO)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_single_dispatch(
  p_do_no text,
  p_batch_id uuid,
  p_batch_no text,
  p_customer text,
  p_product text,
  p_quantity numeric,
  p_unit text,
  p_unit_rate numeric,
  p_gst_pct numeric,
  p_gst_amt numeric,
  p_subtotal numeric,
  p_total numeric,
  p_vehicle_no text,
  p_lr_no text,
  p_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO dispatches (
    org_id, do_no, batch_id, batch_no, customer, product,
    quantity, unit, unit_rate, gst_pct, gst_amt, subtotal, total,
    vehicle_no, lr_no, status, notes
  ) VALUES (
    v_org_id, p_do_no, p_batch_id, p_batch_no, p_customer, p_product,
    p_quantity, p_unit, p_unit_rate, p_gst_pct, p_gst_amt, p_subtotal, p_total,
    p_vehicle_no, p_lr_no, 'DRAFT', p_notes
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END; $$;
