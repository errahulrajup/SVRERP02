-- 15_prp_international_rpc.sql

CREATE OR REPLACE FUNCTION log_prp_execution(
  p_prp_id uuid,
  p_result text,
  p_done_by text,
  p_batch_id uuid DEFAULT NULL,
  p_remarks text DEFAULT NULL,
  p_reading text DEFAULT NULL,
  p_next_due date DEFAULT NULL,
  p_compliance_standard text DEFAULT 'ISO_22000',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_user_role text;
  v_prp recipe_fsms_prp%ROWTYPE;
  v_batch batches%ROWTYPE;
  v_log_id uuid;
BEGIN
  -- 1. Auth
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- 2. Lock PRP master
  SELECT * INTO v_prp FROM recipe_fsms_prp
  WHERE id = p_prp_id AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PRP not found or access denied'; END IF;
  IF v_prp.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'This PRP version is obsolete. Use version %',
      (SELECT version FROM recipe_fsms_prp WHERE id = v_prp.superseded_by);
  END IF;

  -- 3. Validate batch if provided
  IF p_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch FROM batches WHERE id = p_batch_id AND org_id = v_org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
    IF v_prp.recipe_id IS NOT NULL AND v_prp.recipe_id!= v_batch.recipe_id THEN
      RAISE EXCEPTION 'PRP % is for different recipe', v_prp.prp_name;
    END IF;
  END IF;

  -- 4. Insert log with full traceability
  INSERT INTO prp_logs (
    org_id, prp_no, prp_type, category, description, area, method,
    result, next_due, done_by, notes, status,
    recipe_id, batch_id, created_by, compliance_standard,
    frequency, last_reviewed
  ) VALUES (
    v_org_id, v_prp.prp_no, v_prp.prp_type, 'Product-Specific',
    v_prp.prp_name, v_prp.target_area, v_prp.procedure,
    p_result, p_next_due, p_done_by, p_remarks,
    CASE WHEN p_result = 'Pass' THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    v_prp.recipe_id, p_batch_id, p_user_id, p_compliance_standard,
    v_prp.frequency, CURRENT_DATE
  ) RETURNING id INTO v_log_id;

  -- 5. Audit trail
  INSERT INTO prp_execution_history (org_id, prp_log_id, version, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_log_id, 1, p_user_id, 'CREATE',
          jsonb_build_object('prp_name', v_prp.prp_name, 'result', p_result, 'batch_no', v_batch.batch_no),
          'Initial PRP execution log');

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'prp_name', v_prp.prp_name);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'PRP logging failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION log_prp_execution(uuid, text, text, uuid, text, text, date, text, uuid) TO authenticated;

-- ============================================================================
-- RPC: log_cleaning_checklist
-- ============================================================================
CREATE OR REPLACE FUNCTION log_cleaning_checklist(
  p_sop_code text,
  p_tasks_completed int,
  p_tasks_total int,
  p_checklist jsonb,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_log_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO prp_logs (
    org_id, prp_no, prp_type, category, description, area, method,
    result, done_by, notes, status, created_by, compliance_standard, frequency, last_reviewed
  ) VALUES (
    v_org_id, p_sop_code, 'SSOP', 'Sanitation', 'Daily Cleaning Checklist', 'Production Floor', 'As per checklist',
    'Pass', (SELECT name FROM profiles WHERE id = p_user_id), 
    'Completed ' || p_tasks_completed || '/' || p_tasks_total || ' tasks. Data: ' || p_checklist::text,
    'ACTIVE', p_user_id, 'FDA_FSMA', 'DAILY', CURRENT_DATE
  ) RETURNING id INTO v_log_id;
  
  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END; $$;

GRANT EXECUTE ON FUNCTION log_cleaning_checklist(text, int, int, jsonb, uuid) TO authenticated;
