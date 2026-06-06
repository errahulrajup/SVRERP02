-- 24_training_international_migration.sql

-- 0. Prerequisite: sops table
CREATE TABLE IF NOT EXISTS public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  sop_no text NOT NULL,
  title text NOT NULL,
  category text,
  version text DEFAULT '1.0',
  status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','RETIRED')),
  document_url text,
  effective_date date,
  review_date date,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage sops" ON public.sops;
CREATE POLICY "Auth manage sops" ON public.sops FOR ALL TO authenticated USING (true);

-- 1. Create or update training_records table
CREATE TABLE IF NOT EXISTS training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  sop_id uuid NOT NULL REFERENCES sops(id),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED')),
  expiry_date date,
  trainer_signature text, -- FDA 21 CFR 11 electronic signature equivalent
  trainee_signature text,
  trainer_signed_at timestamptz,
  trainee_signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_org_isolation ON training_records;
CREATE POLICY training_org_isolation ON training_records
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- PRODUCTION RPC: complete_production_batch (UPDATED WITH TRAINING BLOCK)
-- Atomic: RM deduct + FG create + Costing + QC + Audit + Training Check
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_production_batch(
  p_batch_id uuid,
  p_fg_data jsonb, -- {product, qty, unit, unit_cost, expiry_date, batch_no}
  p_qc_data jsonb DEFAULT NULL, -- {passed, remarks, coa_no}
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_batch batches%ROWTYPE;
  v_consumed_lot jsonb;
  v_total_rm_cost numeric := 0;
  v_fg_lot_id uuid;
  v_lot record;
  v_produced_qty numeric;
  v_unit_cost numeric;
BEGIN
  -- 1. Auth + Lock batch
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found or not authenticated'; END IF;

  -- ========================================================================
  -- FSSC 22000 / FDA FSMA: TRAINING EXPIRY BLOCK
  -- If operator is not trained on critical SOPs, block the batch completion
  -- ========================================================================
  IF EXISTS (
    SELECT 1 FROM training_records tr
    JOIN sops s ON s.id = tr.sop_id
    WHERE tr.employee_id = p_user_id 
      AND s.sop_no IN ('SOP-ALLERGEN-001', 'SOP-HACCP-002') -- critical SOPs
      AND (tr.status != 'PASSED' OR COALESCE(tr.expiry_date, CURRENT_DATE + 1) < CURRENT_DATE)
  ) THEN
    RAISE EXCEPTION 'Operator training expired for critical SOP. Cannot complete batch.';
  END IF;

  SELECT * INTO v_batch FROM batches 
  WHERE id = p_batch_id AND org_id = v_org_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or access denied', p_batch_id; END IF;
  IF v_batch.status = 'COMPLETED' THEN RAISE EXCEPTION 'Batch % already completed', v_batch.batch_no; END IF;
  IF v_batch.consumed_lots IS NULL OR jsonb_array_length(v_batch.consumed_lots) = 0 THEN
    RAISE EXCEPTION 'No raw materials consumed. Add RM lots first via batch.raw_materials';
  END IF;

  v_produced_qty := (p_fg_data->>'qty')::numeric;
  IF v_produced_qty <= 0 THEN RAISE EXCEPTION 'Produced quantity must be > 0'; END IF;

  -- 2. Validate & deduct each consumed RM lot - FSSAI Traceability Core
  FOR v_consumed_lot IN SELECT * FROM jsonb_array_elements(v_batch.consumed_lots)
  LOOP
    -- Lock RM lot to prevent double consumption
    SELECT * INTO v_lot FROM lots 
    WHERE id = (v_consumed_lot->>'lot_id')::uuid 
      AND org_id = v_org_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
      RAISE EXCEPTION 'RM Lot % not found. Data integrity error', v_consumed_lot->>'lot_id'; 
    END IF;
    
    IF COALESCE(v_lot.remaining_qty, 0) < (v_consumed_lot->>'qty')::numeric THEN
      RAISE EXCEPTION 'Insufficient RM stock for lot %. Available: %, Required: %', 
        v_lot.lot_no, v_lot.remaining_qty, v_consumed_lot->>'qty';
    END IF;

    -- Stock ledger OUT for RM - creates audit trail
    INSERT INTO stock_ledger (
      org_id, lot_id, fg_lot_id, transaction_type, qty_change, 
      reference_id, notes, created_by
    ) VALUES (
      v_org_id, v_lot.id, NULL, 'OUT', -(v_consumed_lot->>'qty')::numeric,
      p_batch_id, 'Production consumption: ' || v_batch.batch_no, p_user_id
    );
    
    -- lots.available_qty updated by trigger on stock_ledger
    
    -- Sum RM cost for FG unit_cost calculation
    v_total_rm_cost := v_total_rm_cost + ((v_consumed_lot->>'qty')::numeric * (v_consumed_lot->>'unit_cost')::numeric);
  END LOOP;

  -- 3. Calculate FG unit cost if not provided
  v_unit_cost := COALESCE(
    (p_fg_data->>'unit_cost')::numeric, 
    ROUND(v_total_rm_cost / v_produced_qty, 2)
  );

  -- 4. Create FG lot with full traceability
  INSERT INTO fg_lots (
    id, org_id, batch_id, batch_no, product, qty_produced, qty_on_hand, 
    unit, unit_cost, expiry_date, coa_no, coa_issued, coa_date,
    created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, p_batch_id, p_fg_data->>'batch_no', p_fg_data->>'product',
    v_produced_qty, v_produced_qty,
    p_fg_data->>'unit', 
    v_unit_cost,
    (p_fg_data->>'expiry_date')::date,
    p_qc_data->>'coa_no',
    COALESCE((p_qc_data->>'passed')::boolean, false),
    CASE WHEN (p_qc_data->>'passed')::boolean THEN CURRENT_DATE ELSE NULL END,
    p_user_id, now()
  ) RETURNING id INTO v_fg_lot_id;

  -- 5. Stock ledger IN for FG
  INSERT INTO stock_ledger (
    org_id, lot_id, fg_lot_id, transaction_type, qty_change,
    reference_id, notes, created_by
  ) VALUES (
    v_org_id, NULL, v_fg_lot_id, 'IN', v_produced_qty,
    p_batch_id, 'Production completed: ' || v_batch.batch_no || ' | RM Cost: ' || v_total_rm_cost, p_user_id
  );

  -- 6. Mark batch completed + store QC result
  UPDATE batches SET 
    status = 'COMPLETED',
    end_time = now(),
    actual_yield = v_produced_qty,
    actual_rm_cost = v_total_rm_cost,
    qc_passed = COALESCE((p_qc_data->>'passed')::boolean, false),
    qc_remarks = p_qc_data->>'remarks',
    completed_by = p_user_id,
    updated_at = now()
  WHERE id = p_batch_id;

  -- 7. Audit log for compliance
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, record_label, details)
  VALUES (v_org_id, p_user_id, 'UPDATE', 'Production', p_batch_id, v_batch.batch_no,
          'Batch completed. FG: ' || v_produced_qty || ' ' || (p_fg_data->>'unit') || 
          ' | RM Cost: ₹' || v_total_rm_cost || 
          ' | Unit Cost: ₹' || v_unit_cost ||
          ' | QC: ' || CASE WHEN (p_qc_data->>'passed')::boolean THEN 'PASSED' ELSE 'PENDING' END);

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'fg_lot_id', v_fg_lot_id,
    'qty_produced', v_produced_qty,
    'total_rm_cost', v_total_rm_cost,
    'unit_cost', v_unit_cost,
    'qc_passed', COALESCE((p_qc_data->>'passed')::boolean, false)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Production completion failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION complete_production_batch(uuid, jsonb, jsonb, uuid) TO authenticated;
