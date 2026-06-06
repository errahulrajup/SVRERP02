-- ============================================================================
-- 1. COMPLETE_PACKAGING_RUN: Bulk + PM deduct, FG add, all atomic
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_packaging_run(
  p_bulk_lot_id uuid,
  p_bulk_qty numeric,
  p_fg_lot_id uuid,
  p_fg_qty numeric,
  p_pm_lot_id uuid DEFAULT NULL,
  p_pm_qty numeric DEFAULT 0,
  p_operator_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_bulk_remaining numeric;
  v_pm_remaining numeric;
  v_run_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  SELECT remaining_qty INTO v_bulk_remaining FROM lots 
  WHERE id = p_bulk_lot_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Bulk lot % not found', p_bulk_lot_id; END IF;
  IF v_bulk_remaining < p_bulk_qty THEN 
    RAISE EXCEPTION 'Insufficient bulk stock: %. Available: %', p_bulk_lot_id, v_bulk_remaining; 
  END IF;

  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_remaining FROM lots 
    WHERE id = p_pm_lot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PM lot % not found', p_pm_lot_id; END IF;
    IF v_pm_remaining < p_pm_qty THEN 
      RAISE EXCEPTION 'Insufficient PM stock: %. Available: %', p_pm_lot_id, v_pm_remaining; 
    END IF;
  END IF;

  INSERT INTO packaging_runs (
    id, org_id, bulk_lot_id, fg_lot_id, pm_lot_id, 
    bulk_qty_consumed, fg_qty_produced, pm_qty_consumed,
    operator_id, notes, run_date
  ) VALUES (
    gen_random_uuid(), v_org_id, p_bulk_lot_id, p_fg_lot_id, p_pm_lot_id,
    p_bulk_qty, p_fg_qty, p_pm_qty,
    COALESCE(p_operator_id, auth.uid()), p_notes, now()
  ) RETURNING id INTO v_run_id;

  UPDATE lots SET remaining_qty = remaining_qty - p_bulk_qty 
  WHERE id = p_bulk_lot_id;
  
  INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_bulk_lot_id, 'OUT', -p_bulk_qty, v_run_id, 'Packaging run: ' || p_fg_lot_id, auth.uid());

  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    UPDATE lots SET remaining_qty = remaining_qty - p_pm_qty 
    WHERE id = p_pm_lot_id;
    
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_lot_id, 'OUT', -p_pm_qty, v_run_id, 'PM consumed for FG: ' || p_fg_lot_id, auth.uid());
  END IF;

  UPDATE fg_lots SET qty_on_hand = qty_on_hand + p_fg_qty 
  WHERE id = p_fg_lot_id;
  
  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_fg_lot_id, 'IN', p_fg_qty, v_run_id, 'Packaging run from bulk: ' || p_bulk_lot_id, auth.uid());

  RETURN jsonb_build_object('success', true, 'run_id', v_run_id);
END;
$$;

-- ============================================================================
-- 2. CONVERT_SKU: Source FG deduct -> Target FG add + PM wastage
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_sku(
  p_source_fg_lot_id uuid,
  p_target_fg_lot_id uuid,
  p_qty_convert numeric,
  p_pm_wastage_lot_id uuid DEFAULT NULL,
  p_pm_wastage_qty numeric DEFAULT 0,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_source_qty numeric;
  v_pm_qty numeric;
  v_conv_id uuid := gen_random_uuid();
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  
  SELECT qty_on_hand INTO v_source_qty FROM fg_lots 
  WHERE id = p_source_fg_lot_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Source FG lot not found'; END IF;
  IF v_source_qty < p_qty_convert THEN 
    RAISE EXCEPTION 'Insufficient FG stock. Available: %', v_source_qty; 
  END IF;

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_qty FROM lots 
    WHERE id = p_pm_wastage_lot_id FOR UPDATE;
    IF v_pm_qty < p_pm_wastage_qty THEN 
      RAISE EXCEPTION 'Insufficient PM for wastage. Available: %', v_pm_qty; 
    END IF;
  END IF;

  UPDATE fg_lots SET qty_on_hand = qty_on_hand - p_qty_convert 
  WHERE id = p_source_fg_lot_id;
  
  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_source_fg_lot_id, 'OUT', -p_qty_convert, v_conv_id, 'SKU Conversion to: ' || p_target_fg_lot_id || '. ' || p_reason, auth.uid());

  UPDATE fg_lots SET qty_on_hand = qty_on_hand + p_qty_convert 
  WHERE id = p_target_fg_lot_id;
  
  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_target_fg_lot_id, 'IN', p_qty_convert, v_conv_id, 'SKU Conversion from: ' || p_source_fg_lot_id, auth.uid());

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    UPDATE lots SET remaining_qty = remaining_qty - p_pm_wastage_qty 
    WHERE id = p_pm_wastage_lot_id;
    
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_wastage_lot_id, 'WASTAGE', -p_pm_wastage_qty, v_conv_id, 'SKU Conversion wastage', auth.uid());
  END IF;

  RETURN jsonb_build_object('success', true, 'conversion_id', v_conv_id);
END;
$$;

-- ============================================================================
-- 3. COMPLETE_BATCH: RM deduct + create consumed_lots + auto-expense
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_batch(
  p_batch_id uuid,
  p_actual_qty numeric,
  p_reject_qty numeric DEFAULT 0,
  p_labor_hours numeric DEFAULT 0,
  p_overhead_cost numeric DEFAULT 0,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_batch batches%ROWTYPE;
  v_comp RECORD;
  v_total_rm_cost numeric := 0;
  v_lot_remaining numeric;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  
  SELECT * INTO v_batch FROM batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF v_batch.status != 'RUNNING' THEN RAISE EXCEPTION 'Batch not in RUNNING state'; END IF;

  FOR v_comp IN 
    SELECT bc.*, l.remaining_qty, l.rate 
    FROM batch_components bc
    LEFT JOIN lots l ON l.id = bc.lot_id
    WHERE bc.batch_id = p_batch_id
  LOOP
    IF v_comp.lot_id IS NOT NULL THEN
      SELECT remaining_qty INTO v_lot_remaining FROM lots 
      WHERE id = v_comp.lot_id FOR UPDATE;
      
      IF v_lot_remaining < v_comp.actual_qty THEN
        RAISE EXCEPTION 'Insufficient stock for lot %. Required: %, Available: %', 
          v_comp.lot_id, v_comp.actual_qty, v_lot_remaining;
      END IF;
      
      UPDATE lots SET remaining_qty = remaining_qty - v_comp.actual_qty 
      WHERE id = v_comp.lot_id;
      
      INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
      VALUES (v_org_id, v_comp.lot_id, 'OUT', -v_comp.actual_qty, p_batch_id, 
              'Batch ' || v_batch.batch_no || ' consumption', auth.uid());
      
      INSERT INTO consumed_lots (
        batch_id, batch_no, lot_id, material, qty_consumed, rate, cost
      ) VALUES (
        p_batch_id, v_batch.batch_no, v_comp.lot_id, v_comp.material, 
        v_comp.actual_qty, COALESCE(v_comp.rate, 0), v_comp.actual_qty * COALESCE(v_comp.rate, 0)
      );
      
      v_total_rm_cost := v_total_rm_cost + (v_comp.actual_qty * COALESCE(v_comp.rate, 0));
    END IF;
  END LOOP;

  IF p_labor_hours > 0 THEN
    INSERT INTO labor_hours (org_id, batch_id, hours_worked, hourly_rate, created_by)
    VALUES (v_org_id, p_batch_id, p_labor_hours, 150, auth.uid());
  END IF;

  IF v_total_rm_cost > 0 THEN
    INSERT INTO expenses (org_id, date, category, description, amount, notes)
    VALUES (
      v_org_id, CURRENT_DATE, 'Raw Material', 
      'RM consumed - Batch ' || v_batch.batch_no || ' (' || v_batch.product || ')',
      v_total_rm_cost, 'Auto-created from batch completion'
    );
  END IF;

  UPDATE batches SET 
    status = 'QC_HOLD',
    actual_qty = p_actual_qty,
    reject_qty = p_reject_qty,
    yield_pct = CASE WHEN planned_qty > 0 THEN (p_actual_qty / planned_qty * 100) ELSE 0 END,
    end_time = now(),
    notes = COALESCE(notes || E'\n', '') || 'Batch Cost: ₹' || 
            (v_total_rm_cost + p_labor_hours * 150 + p_overhead_cost)::text || 
            E'\n' || COALESCE(p_notes, '')
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'rm_cost', v_total_rm_cost);
END;
$$;
