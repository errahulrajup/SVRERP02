-- =============================================================================
-- SVRERP02 Migration 04: Performance Seeding, Safety Cleanups, and Compliance Hardening
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Safety Cleanup Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_perf_organization(p_org_name text)
RETURNS void AS $$
DECLARE
  v_org_id uuid;
  r RECORD;
BEGIN
  -- Set workflow context so that security triggers allow mutations
  PERFORM set_config('app.workflow_context', 'rpc', true);

  -- SAFETY GUARD
  IF p_org_name <> 'PERF_AUDIT_ORG' THEN
    RAISE EXCEPTION 'Safety Guard: Only PERF_AUDIT_ORG can be deleted using this function.';
  END IF;

  SELECT id INTO v_org_id FROM public.organizations WHERE name = p_org_name;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Disable user triggers on tables we are going to delete from to bypass immutability checks
  BEGIN
    ALTER TABLE public.stock_ledger DISABLE TRIGGER USER;
    ALTER TABLE public.qc_checks DISABLE TRIGGER USER;
    ALTER TABLE public.batches DISABLE TRIGGER USER;
    ALTER TABLE public.lots DISABLE TRIGGER USER;
    ALTER TABLE public.grns DISABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not disable some triggers: %', SQLERRM;
  END;

  -- Delete from all public tables containing org_id column, except organizations itself
  -- Loop multiple times to resolve foreign key dependencies
  FOR i IN 1..3 LOOP
    FOR r IN 
      SELECT table_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'org_id'
        AND table_name != 'organizations'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE org_id = %L;', r.table_name, v_org_id);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore FK or RLS errors on intermediate passes
      END;
    END LOOP;
  END LOOP;

  -- Re-enable triggers
  BEGIN
    ALTER TABLE public.stock_ledger ENABLE TRIGGER USER;
    ALTER TABLE public.qc_checks ENABLE TRIGGER USER;
    ALTER TABLE public.batches ENABLE TRIGGER USER;
    ALTER TABLE public.lots ENABLE TRIGGER USER;
    ALTER TABLE public.grns ENABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not enable some triggers: %', SQLERRM;
  END;

  -- Delete the mock auth user
  DELETE FROM auth.users WHERE id = '99999999-9999-9999-9999-999999999999';

  -- Finally delete the organization itself
  DELETE FROM public.organizations WHERE id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 2. Performance Seeding Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_performance_data(p_org_id uuid)
RETURNS void AS $$
DECLARE
  v_prod_id uuid := '11111111-1111-1111-1111-111111111111';
  v_recipe_id text := 'RECIPE-PERF-001';
  v_profile_id uuid := '99999999-9999-9999-9999-999999999999';
BEGIN
  -- Set workflow context so that security triggers allow mutations
  PERFORM set_config('app.workflow_context', 'rpc', true);

  -- 1. Insert parent lookup data under the target org
  INSERT INTO public.products (
    id, org_id, name, slug, category, visible, featured, in_stock, sort_order, benefits, images, tags
  ) VALUES (
    v_prod_id, p_org_id, 'Performance Test Product', 'performance-test-product', 'Test', true, false, true, 1, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.recipes (
    id, org_id, name, product_id, version, is_active
  ) VALUES (
    v_recipe_id, p_org_id, 'Performance Test Recipe', v_prod_id, 1, true
  ) ON CONFLICT DO NOTHING;

  -- Insert mock auth user to satisfy FK
  INSERT INTO auth.users (
    id, email, aud, role, raw_app_meta_data, raw_user_meta_data, email_confirmed_at
  ) VALUES (
    v_profile_id, 'perf-operator@test.local', 'authenticated', 'authenticated', '{"role": "OPERATOR"}'::jsonb, '{"role": "OPERATOR"}'::jsonb, now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    id, org_id, email, name, role, is_active
  ) VALUES (
    v_profile_id, p_org_id, 'perf-operator@test.local', 'Perf Operator', 'OPERATOR', true
  ) ON CONFLICT DO NOTHING;

  -- 2. Seed 25,000 GRNs and associated Lots
  INSERT INTO public.grns (
    id, org_id, grn_no, material, supplier, qty, rate, total_cost, status, created_at, lot_no, expiry_date, mfg_date, erp_product_id
  )
  SELECT 
    'GRN-PERF-' || s::text,
    p_org_id,
    'GRN-P-' || s::text,
    'Material ' || (s % 50)::text,
    'Supplier ' || (s % 10)::text,
    100.0,
    10.0,
    1000.0,
    CASE 
      WHEN s % 20 = 0 THEN 'REJECTED'
      ELSE 'QC_DONE'
    END,
    now() - (s % 30 || ' days')::interval,
    'LOT-P-' || s::text,
    CASE 
      WHEN s % 20 = 0 THEN now() - '10 days'::interval  -- Expired
      WHEN s % 20 = 1 THEN now() + '5 days'::interval   -- Near-expiry
      ELSE now() + '365 days'::interval                  -- Normal
    END,
    now() - (s % 30 + 10 || ' days')::interval,
    v_prod_id
  FROM generate_series(1, 25000) s
  ON CONFLICT DO NOTHING;

  INSERT INTO public.lots (
    id, org_id, lot_no, material, qty, rate, remaining_qty, qc_status, supplier, total_cost, grn_id, erp_product_id, expiry_date, mfg_date
  )
  SELECT 
    'LOT-PERF-' || s::text,
    p_org_id,
    'LOT-P-' || s::text,
    'Material ' || (s % 50)::text,
    100.0,
    10.0,
    CASE 
      WHEN s % 10 = 0 THEN 0.0          -- Fully consumed
      WHEN s % 10 = 1 THEN 50.0         -- Partially consumed
      ELSE 100.0                        -- Full
    END,
    CASE 
      WHEN s % 20 = 0 THEN 'rejected'
      ELSE 'approved'
    END,
    'Supplier ' || (s % 10)::text,
    1000.0,
    'GRN-PERF-' || s::text,
    v_prod_id,
    CASE 
      WHEN s % 20 = 0 THEN now() - '10 days'::interval
      WHEN s % 20 = 1 THEN now() + '5 days'::interval
      ELSE now() + '365 days'::interval
    END,
    now() - (s % 30 + 10 || ' days')::interval
  FROM generate_series(1, 25000) s
  ON CONFLICT DO NOTHING;

  -- 3. Seed 10,000 Production Batches
  INSERT INTO public.batches (
    id, org_id, batch_no, product, planned_qty, actual_qty, status, recipe_id, recipe_name, created_at, completed_by
  )
  SELECT 
    'BATCH-PERF-' || s::text,
    p_org_id,
    'BATCH-P-' || s::text,
    'Product ' || (s % 5)::text,
    500.0,
    CASE WHEN s % 5 = 0 THEN 0.0 ELSE 490.0 END,
    CASE 
      WHEN s % 10 = 0 THEN 'QC_HOLD'
      WHEN s % 10 = 1 THEN 'REJECTED'
      ELSE 'COMPLETED'
    END,
    v_recipe_id,
    'Performance Test Recipe',
    now() - (s % 30 || ' days')::interval,
    v_profile_id
  FROM generate_series(1, 10000) s
  ON CONFLICT DO NOTHING;

  -- 4. Seed 50,000 QC Records
  INSERT INTO public.qc_checks (
    id, org_id, batch_id, overall, tested_at
  )
  SELECT 
    'QC-PERF-' || s::text,
    p_org_id,
    'BATCH-PERF-' || ((s % 10000) + 1)::text,
    CASE WHEN s % 20 = 0 THEN 'fail' ELSE 'pass' END,
    now() - (s % 10 || ' days')::interval
  FROM generate_series(1, 50000) s
  ON CONFLICT DO NOTHING;

  -- 5. Seed 100,000 Stock Ledger entries
  ALTER TABLE public.stock_ledger DISABLE TRIGGER USER;
  
  INSERT INTO public.stock_ledger (
    id, org_id, lot_id, erp_product_id, qty_change, transaction_type, created_at
  )
  SELECT 
    gen_random_uuid(),
    p_org_id,
    'LOT-PERF-' || ((s % 25000) + 1)::text,
    v_prod_id,
    CASE WHEN s % 2 = 0 THEN 100.0 ELSE -50.0 END,
    CASE WHEN s % 2 = 0 THEN 'IN' ELSE 'OUT' END,
    now() - (s % 60 || ' days')::interval
  FROM generate_series(1, 100000) s
  ON CONFLICT DO NOTHING;

  ALTER TABLE public.stock_ledger ENABLE TRIGGER USER;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 3. Compliance & Immutability Trigger (21 CFR Part 11)
-- -----------------------------------------------------------------------------

-- 3.1 Audit Log Immutability Triggers
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit Trail Integrity: Modification or deletion of historical audit logs is strictly forbidden (21 CFR Part 11).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable_update ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_audit_log_immutable_delete ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_audit_modification();

-- 3.2 Electronic Signatures Tamper Protection Trigger
CREATE OR REPLACE FUNCTION public.trg_prevent_signature_tamper()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trainer_signature IS DISTINCT FROM NEW.trainer_signature OR
     OLD.trainee_signature IS DISTINCT FROM NEW.trainee_signature OR
     OLD.trainer_signed_at IS DISTINCT FROM NEW.trainer_signed_at OR
     OLD.trainee_signed_at IS DISTINCT FROM NEW.trainee_signed_at THEN
    RAISE EXCEPTION 'Audit compliance error: Electronic signatures cannot be updated or tampered (21 CFR Part 11).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_training_records_sig_protect ON public.training_records;
CREATE TRIGGER trg_training_records_sig_protect
  BEFORE UPDATE ON public.training_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_signature_tamper();

DROP TRIGGER IF EXISTS trg_hr_training_records_sig_protect ON public.hr_training_records;
CREATE TRIGGER trg_hr_training_records_sig_protect
  BEFORE UPDATE ON public.hr_training_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_signature_tamper();

-- 3.3 Equipment Calibration Signature Tamper Protection Trigger
CREATE OR REPLACE FUNCTION public.trg_prevent_calibration_sig_tamper()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.technician_signature IS DISTINCT FROM NEW.technician_signature OR
     OLD.signed_at IS DISTINCT FROM NEW.signed_at THEN
    RAISE EXCEPTION 'Audit compliance error: Equipment calibration signatures cannot be updated or tampered (21 CFR Part 11).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_calibration_sig_protect ON public.equipment_calibration_log;
CREATE TRIGGER trg_equipment_calibration_sig_protect
  BEFORE UPDATE ON public.equipment_calibration_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_calibration_sig_tamper();


-- -----------------------------------------------------------------------------
-- 4. Permissions Setup
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.cleanup_perf_organization(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_performance_data(uuid) TO authenticated;
