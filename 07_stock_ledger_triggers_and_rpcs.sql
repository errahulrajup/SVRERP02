-- ============================================================================
-- 1. Auto-update Trigger for Stock Ledger
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_stock_on_ledger_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  -- Validate: ya to lot_id ho ya fg_lot_id, dono nahi
  IF (NEW.lot_id IS NOT NULL AND NEW.fg_lot_id IS NOT NULL) OR
     (NEW.lot_id IS NULL AND NEW.fg_lot_id IS NULL) THEN
    RAISE EXCEPTION 'Either lot_id or fg_lot_id must be set, not both';
  END IF;

  -- Update lots table
  IF NEW.lot_id IS NOT NULL THEN
    UPDATE lots 
    SET remaining_qty = remaining_qty + NEW.qty_change
    WHERE id = NEW.lot_id
    RETURNING remaining_qty INTO v_current_qty;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot % not found in lots table', NEW.lot_id;
    END IF;
    
    IF v_current_qty < 0 THEN
      RAISE EXCEPTION 'Stock would go negative for lot %. Current: %, Change: %', 
        NEW.lot_id, v_current_qty - NEW.qty_change, NEW.qty_change;
    END IF;
  END IF;

  -- Update fg_lots table
  IF NEW.fg_lot_id IS NOT NULL THEN
    UPDATE fg_lots 
    SET qty_on_hand = qty_on_hand + NEW.qty_change
    WHERE id = NEW.fg_lot_id
    RETURNING qty_on_hand INTO v_current_qty;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FG Lot % not found in fg_lots table', NEW.fg_lot_id;
    END IF;
    
    IF v_current_qty < 0 THEN
      RAISE EXCEPTION 'Stock would go negative for FG lot %. Current: %, Change: %', 
        NEW.fg_lot_id, v_current_qty - NEW.qty_change, NEW.qty_change;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_ledger_sync ON stock_ledger;
CREATE TRIGGER trg_stock_ledger_sync
AFTER INSERT ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION sync_stock_on_ledger_insert();

-- Prevent manual updates/deletes on stock_ledger - audit trail must be immutable
CREATE OR REPLACE FUNCTION prevent_stock_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_ledger is append-only. Updates/deletes not allowed for audit compliance';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_ledger_no_update ON stock_ledger;
CREATE TRIGGER trg_stock_ledger_no_update
BEFORE UPDATE ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

DROP TRIGGER IF EXISTS trg_stock_ledger_no_delete ON stock_ledger;
CREATE TRIGGER trg_stock_ledger_no_delete
BEFORE DELETE ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

-- ============================================================================
-- 2. UPDATED RPCs (Manual UPDATE removed, delegates to ledger trigger)
-- ============================================================================

-- COMPLETE_PACKAGING_RUN
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

  -- Check bulk lot stock
  SELECT remaining_qty INTO v_bulk_remaining FROM lots WHERE id = p_bulk_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bulk lot % not found', p_bulk_lot_id; END IF;
  IF v_bulk_remaining < p_bulk_qty THEN 
    RAISE EXCEPTION 'Insufficient bulk stock. Available: %', v_bulk_remaining; 
  END IF;

  -- Check PM lot if provided
  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_remaining FROM lots WHERE id = p_pm_lot_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PM lot % not found', p_pm_lot_id; END IF;
    IF v_pm_remaining < p_pm_qty THEN 
      RAISE EXCEPTION 'Insufficient PM stock. Available: %', v_pm_remaining; 
    END IF;
  END IF;

  -- Insert packaging_run
  INSERT INTO packaging_runs (
    id, org_id, bulk_lot_id, fg_lot_id, pm_lot_id, 
    bulk_qty_consumed, fg_qty_produced, pm_qty_consumed,
    operator_id, notes, run_date
  ) VALUES (
    gen_random_uuid(), v_org_id, p_bulk_lot_id, p_fg_lot_id, p_pm_lot_id,
    p_bulk_qty, p_fg_qty, p_pm_qty,
    COALESCE(p_operator_id, auth.uid()), p_notes, now()
  ) RETURNING id INTO v_run_id;

  -- Just insert ledger entries. Trigger will update lots/fg_lots automatically
  INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_bulk_lot_id, 'OUT', -p_bulk_qty, v_run_id, 'Packaging run: ' || p_fg_lot_id, auth.uid());

  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_lot_id, 'OUT', -p_pm_qty, v_run_id, 'PM consumed for FG: ' || p_fg_lot_id, auth.uid());
  END IF;

  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_fg_lot_id, 'IN', p_fg_qty, v_run_id, 'Packaging run from bulk: ' || p_bulk_lot_id, auth.uid());

  RETURN jsonb_build_object('success', true, 'run_id', v_run_id);
END;
$$;

-- CONVERT_SKU
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
  
  SELECT qty_on_hand INTO v_source_qty FROM fg_lots WHERE id = p_source_fg_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source FG lot not found'; END IF;
  IF v_source_qty < p_qty_convert THEN 
    RAISE EXCEPTION 'Insufficient FG stock. Available: %', v_source_qty; 
  END IF;

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_qty FROM lots WHERE id = p_pm_wastage_lot_id;
    IF v_pm_qty < p_pm_wastage_qty THEN 
      RAISE EXCEPTION 'Insufficient PM for wastage. Available: %', v_pm_qty; 
    END IF;
  END IF;

  -- Ledger entries
  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_source_fg_lot_id, 'OUT', -p_qty_convert, v_conv_id, 'SKU Conversion to: ' || p_target_fg_lot_id || '. ' || p_reason, auth.uid());

  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_target_fg_lot_id, 'IN', p_qty_convert, v_conv_id, 'SKU Conversion from: ' || p_source_fg_lot_id, auth.uid());

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_wastage_lot_id, 'WASTAGE', -p_pm_wastage_qty, v_conv_id, 'SKU Conversion wastage', auth.uid());
  END IF;

  RETURN jsonb_build_object('success', true, 'conversion_id', v_conv_id);
END;
$$;

-- COMPLETE_BATCH
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
      SELECT remaining_qty INTO v_lot_remaining FROM lots WHERE id = v_comp.lot_id;
      
      IF v_lot_remaining < v_comp.actual_qty THEN
        RAISE EXCEPTION 'Insufficient stock for lot %. Required: %, Available: %', 
          v_comp.lot_id, v_comp.actual_qty, v_lot_remaining;
      END IF;
      
      -- Ledger triggers lot update
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
