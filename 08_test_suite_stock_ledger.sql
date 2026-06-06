-- ============================================================================
-- SETUP: Test data banao
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'; -- apna org_id daalo
  v_rm_lot_id uuid;
  v_bulk_lot_id uuid;
  v_pm_lot_id uuid;
  v_fg_lot_id uuid;
  v_batch_id uuid;
  v_recipe_id uuid;
  v_product_id uuid;
  v_run_id uuid;
BEGIN
  -- Clean slate for testing
  DELETE FROM stock_ledger WHERE org_id = v_org_id;
  DELETE FROM packaging_runs WHERE org_id = v_org_id;
  DELETE FROM fg_lots WHERE org_id = v_org_id;
  DELETE FROM lots WHERE org_id = v_org_id;
  DELETE FROM batches WHERE org_id = v_org_id;

  -- 1. Create RM Lot: 100kg Sugar
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, rate, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-RM-001', 'Sugar', 100, 100, 'kg', 50, 'APPROVED')
  RETURNING id INTO v_rm_lot_id;

  -- 2. Create Bulk Lot: 50kg Bulk Product
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-BULK-001', 'MotherLite Bulk', 50, 50, 'kg', 'APPROVED')
  RETURNING id INTO v_bulk_lot_id;

  -- 3. Create PM Lot: 1000 wrappers
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-PM-001', 'Wrapper 500G', 1000, 1000, 'pcs', 'APPROVED')
  RETURNING id INTO v_pm_lot_id;

  -- 4. Create FG Lot: 0kg initially
  INSERT INTO fg_lots (id, org_id, fg_lot_no, sku_code, product_name, qty_on_hand, unit)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-FG-500G-001', 'MOTHERLITE-500G', 'MotherLite 500G', 0, 'kg')
  RETURNING id INTO v_fg_lot_id;

  RAISE NOTICE 'Setup complete. RM Lot: %, Bulk: %, PM: %, FG: %', v_rm_lot_id, v_bulk_lot_id, v_pm_lot_id, v_fg_lot_id;

  -- ============================================================================
  -- TEST 1: complete_packaging_run - Normal case
  -- ============================================================================
  RAISE NOTICE '--- TEST 1: Packaging Run 20kg bulk + 40 wrappers -> 20kg FG ---';
  
  SELECT complete_packaging_run(
    p_bulk_lot_id := v_bulk_lot_id,
    p_bulk_qty := 20,
    p_fg_lot_id := v_fg_lot_id,
    p_fg_qty := 20,
    p_pm_lot_id := v_pm_lot_id,
    p_pm_qty := 40,
    p_notes := 'Test Run 1'
  ) INTO v_run_id;

  -- Verify
  IF (SELECT remaining_qty FROM lots WHERE id = v_bulk_lot_id) != 30 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Bulk remaining should be 30, got %', (SELECT remaining_qty FROM lots WHERE id = v_bulk_lot_id);
  END IF;
  
  IF (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id) != 960 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: PM remaining should be 960, got %', (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id);
  END IF;
  
  IF (SELECT qty_on_hand FROM fg_lots WHERE id = v_fg_lot_id) != 20 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: FG qty should be 20, got %', (SELECT qty_on_hand FROM fg_lots WHERE id = v_fg_lot_id);
  END IF;
  
  RAISE NOTICE 'TEST 1 PASSED: Stock updated correctly';

  -- ============================================================================
  -- TEST 2: Negative stock prevention
  -- ============================================================================
  RAISE NOTICE '--- TEST 2: Try to consume 50kg bulk when only 30 left ---';
  
  BEGIN
    PERFORM complete_packaging_run(
      p_bulk_lot_id := v_bulk_lot_id,
      p_bulk_qty := 50, -- Only 30 left
      p_fg_lot_id := v_fg_lot_id,
      p_fg_qty := 50
    );
    RAISE EXCEPTION 'TEST 2 FAILED: Should have thrown insufficient stock error';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Insufficient bulk stock%' THEN
        RAISE NOTICE 'TEST 2 PASSED: Correctly blocked negative stock';
      ELSE
        RAISE EXCEPTION 'TEST 2 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  -- ============================================================================
  -- TEST 3: convert_sku - 10kg 500G to 500G
  -- ============================================================================
  RAISE NOTICE '--- TEST 3: Convert 10kg FG to new FG lot ---';
  
  -- Create target FG lot
  INSERT INTO fg_lots (id, org_id, fg_lot_no, sku_code, product_name, qty_on_hand, unit)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-FG-200G-001', 'MOTHERLITE-200G', 'MotherLite 200G', 0, 'kg')
  RETURNING id INTO v_fg_lot_id;

  PERFORM convert_sku(
    p_source_fg_lot_id := (SELECT id FROM fg_lots WHERE fg_lot_no = 'TEST-FG-500G-001'),
    p_target_fg_lot_id := v_fg_lot_id,
    p_qty_convert := 10,
    p_pm_wastage_lot_id := v_pm_lot_id,
    p_pm_wastage_qty := 20,
    p_reason := 'Test conversion'
  );

  -- Verify
  IF (SELECT qty_on_hand FROM fg_lots WHERE fg_lot_no = 'TEST-FG-500G-001') != 10 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Source FG should be 10';
  END IF;
  
  IF (SELECT qty_on_hand FROM fg_lots WHERE fg_lot_no = 'TEST-FG-200G-001') != 10 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Target FG should be 10';
  END IF;
  
  IF (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id) != 940 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: PM should be 940 after 20 wastage';
  END IF;
  
  RAISE NOTICE 'TEST 3 PASSED: SKU conversion worked';

  -- ============================================================================
  -- TEST 4: Direct stock_ledger insert should update lots
  -- ============================================================================
  RAISE NOTICE '--- TEST 4: Manual ledger insert for RM ---';
  
  INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, notes, created_by)
  VALUES (v_org_id, v_rm_lot_id, 'IN', 50, 'Test GRN', auth.uid());

  IF (SELECT remaining_qty FROM lots WHERE id = v_rm_lot_id) != 150 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: RM should be 150 after +50';
  END IF;
  
  RAISE NOTICE 'TEST 4 PASSED: Ledger trigger updated lot';

  -- ============================================================================
  -- TEST 5: Try to delete stock_ledger - should fail
  -- ============================================================================
  RAISE NOTICE '--- TEST 5: Try to delete ledger entry ---';
  
  BEGIN
    DELETE FROM stock_ledger WHERE id IN (SELECT id FROM stock_ledger WHERE lot_id = v_rm_lot_id LIMIT 1);
    RAISE EXCEPTION 'TEST 5 FAILED: Should not allow delete';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE 'TEST 5 PASSED: Ledger is immutable';
      ELSE
        RAISE EXCEPTION 'TEST 5 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  -- ============================================================================
  -- TEST 6: Try negative stock via direct ledger insert
  -- ============================================================================
  RAISE NOTICE '--- TEST 6: Try to make stock negative ---';
  
  BEGIN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, notes, created_by)
    VALUES (v_org_id, v_bulk_lot_id, 'OUT', -100, 'Test overdraw', auth.uid());
    RAISE EXCEPTION 'TEST 6 FAILED: Should have blocked negative stock';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%would go negative%' THEN
        RAISE NOTICE 'TEST 6 PASSED: Negative stock blocked';
      ELSE
        RAISE EXCEPTION 'TEST 6 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  RAISE NOTICE '=== ALL TESTS PASSED ===';
END $$;
