-- ============================================================================
-- RPC: APPROVE_GRN_AND_CREATE_LOT
-- Atomically: 1. Lock GRN 2. Approve GRN 3. Create Lot 4. Ledger IN 5. Expense
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_grn_and_create_lot(
  p_grn_id uuid,
  p_user_id uuid DEFAULT auth.uid(),
  p_user_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn grns%ROWTYPE;
  v_lot_id uuid;
  v_org_id uuid;
  v_user_name text;
  v_expense_id uuid;
BEGIN
  -- 1. Get user org and name
  SELECT org_id, COALESCE(p_user_name, name, 'System') 
  INTO v_org_id, v_user_name
  FROM profiles WHERE id = p_user_id;
  
  IF v_org_id IS NULL THEN 
    RAISE EXCEPTION 'User org not found or user not authenticated'; 
  END IF;

  -- 2. Lock GRN row and validate status - prevents double-approve race condition
  SELECT * INTO v_grn FROM grns 
  WHERE id = p_grn_id 
    AND org_id = v_org_id 
    AND status = 'QC_PENDING' 
  FOR UPDATE;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'GRN not found, already processed, or access denied'; 
  END IF;

  -- 3. Update GRN status to APPROVED
  UPDATE grns 
  SET status = 'APPROVED', 
      updated_at = now() 
  WHERE id = p_grn_id;

  -- 4. Create LOT - remaining_qty = 0, trigger will add via ledger
  INSERT INTO lots (
    id, org_id, lot_no, grn_id, material, supplier, 
    initial_qty, remaining_qty, unit, unit_cost, total_cost,
    mfg_date, expiry_date, qc_status, location, 
    erp_product_id, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_grn.grn_no, v_grn.id, v_grn.material, v_grn.supplier,
    v_grn.quantity, 0, -- Trigger will update this to v_grn.quantity
    v_grn.unit, v_grn.unit_cost, v_grn.total_cost,
    v_grn.mfg_date, v_grn.expiry_date, 'approved', 'Store',
    v_grn.erp_product_id, p_user_id, now()
  ) RETURNING id INTO v_lot_id;

  -- 5. Create Stock Ledger IN entry - Trigger auto-updates lots.remaining_qty
  INSERT INTO stock_ledger (
    org_id, lot_id, fg_lot_id, erp_product_id,
    transaction_type, qty_change, reference_id, 
    notes, created_by, created_at
  ) VALUES (
    v_org_id, v_lot_id, NULL, v_grn.erp_product_id,
    'IN', v_grn.quantity, v_grn.id,
    'GRN Received: ' || v_grn.grn_no, p_user_id, now()
  );

  -- 6. Create Expense entry for P&L
  INSERT INTO expenses (
    id, org_id, date, category, description, 
    amount, recorded_by, recorded_by_id, source, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, CURRENT_DATE, 'Raw Material',
    'GRN ' || v_grn.grn_no || ' — ' || v_grn.material || ' from ' || v_grn.supplier,
    v_grn.total_cost, v_user_name, p_user_id, 'grn_auto',
    'Auto-created on GRN approval. Invoice: ' || COALESCE(v_grn.invoice_no, '—'),
    now()
  ) RETURNING id INTO v_expense_id;

  -- 7. Return success with IDs for frontend
  RETURN jsonb_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'lot_id', v_lot_id,
    'expense_id', v_expense_id,
    'message', 'GRN approved, lot created, stock updated, expense logged'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error triggers automatic ROLLBACK
    RAISE EXCEPTION 'GRN approval failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- RPC: REJECT_GRN - For completeness
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_grn(
  p_grn_id uuid,
  p_reject_reason text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn grns%ROWTYPE;
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- Lock and validate
  SELECT * INTO v_grn FROM grns 
  WHERE id = p_grn_id 
    AND org_id = v_org_id 
    AND status = 'QC_PENDING' 
  FOR UPDATE;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'GRN not found or already processed'; 
  END IF;

  IF p_reject_reason IS NULL OR trim(p_reject_reason) = '' THEN
    RAISE EXCEPTION 'Reject reason is required';
  END IF;

  UPDATE grns 
  SET status = 'REJECTED', 
      reject_reason = p_reject_reason,
      updated_at = now() 
  WHERE id = p_grn_id;

  RETURN jsonb_build_object('success', true, 'grn_id', p_grn_id);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION approve_grn_and_create_lot(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_grn(uuid, text, uuid) TO authenticated;
