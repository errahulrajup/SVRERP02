-- ============================================================================
-- RPC: SUBMIT_BATCH_QC
-- Atomically creates QC record, updates Batch, and creates FG lot
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_batch_qc(
  p_batch_id uuid,
  p_verdict text, -- 'PASS' or 'FAIL'
  p_qc_data jsonb,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch batches%ROWTYPE;
  v_org_id uuid;
  v_coa_no text;
  v_qc_id uuid;
  v_fg_lot_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- 1. Lock Batch
  SELECT * INTO v_batch FROM batches WHERE id = p_batch_id AND status = 'QC_HOLD' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found or no longer in QC Hold'; END IF;

  v_coa_no := CASE WHEN p_verdict = 'PASS' THEN 'CoA-' || v_batch.batch_no || '-' || upper(substring(md5(random()::text) from 1 for 6)) ELSE NULL END;

  -- 2. Insert QC Check
  INSERT INTO qc_checks (
    id, org_id, batch_id, batch_no, product,
    results, overall, coa_issued, coa_number,
    analyst, reviewer, pack_size, format_no, remarks,
    tested_at, tested_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_batch.id, v_batch.batch_no, v_batch.product,
    p_qc_data->'results', p_verdict, p_verdict = 'PASS', v_coa_no,
    p_qc_data->>'analyst', p_qc_data->>'reviewer', p_qc_data->>'pack_size', p_qc_data->>'format_no', p_qc_data->>'remarks',
    now(), p_qc_data->>'tested_by', now()
  ) RETURNING id INTO v_qc_id;

  -- 3. Update Batch
  UPDATE batches SET 
    status = CASE WHEN p_verdict = 'PASS' THEN 'COMPLETED' ELSE 'REJECTED' END,
    qc_verdict = p_verdict,
    coa_no = v_coa_no,
    updated_at = now()
  WHERE id = p_batch_id;

  -- 4. Create FG Lot if PASS
  IF p_verdict = 'PASS' THEN
    IF v_batch.actual_qty IS NULL OR v_batch.actual_qty <= 0 THEN
      RAISE EXCEPTION 'Batch actual_qty is missing — cannot create FG lot.';
    END IF;

    -- NOTE: qty_on_hand is 0, stock_ledger IN entry will trigger and update it.
    INSERT INTO fg_lots (
      id, org_id, fg_lot_no, batch_id, batch_no, product_name, sku_code,
      qty_on_hand, unit, unit_cost, coa_no, coa_issued, created_at
    ) VALUES (
      gen_random_uuid(), v_org_id, v_batch.batch_no || '-FG', v_batch.id, v_batch.batch_no, v_batch.product, v_batch.product,
      0, COALESCE(v_batch.unit, 'kg'), COALESCE(v_batch.unit_cost, 0), v_coa_no, true, now()
    ) RETURNING id INTO v_fg_lot_id;
    
    -- Stock Ledger IN entry updates qty_on_hand via trigger
    INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, v_fg_lot_id, 'IN', v_batch.actual_qty, p_batch_id, 'Batch QC Passed FG Creation', p_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'coa_no', v_coa_no, 'fg_lot_id', v_fg_lot_id);
END;
$$;
