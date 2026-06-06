-- 23_prp_final_rpc.sql

CREATE OR REPLACE FUNCTION log_prp_execution(
  p_prp_id uuid,
  p_result text,
  p_done_by text,
  p_batch_id uuid DEFAULT NULL,
  p_remarks text DEFAULT NULL,
  p_next_due date DEFAULT NULL,
  p_compliance_standard text DEFAULT 'ISO_22000',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_prp recipe_fsms_prp%ROWTYPE;
  v_log_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_prp FROM recipe_fsms_prp 
  WHERE id = p_prp_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'PRP not found'; END IF;
  IF v_prp.superseded_by IS NOT NULL THEN 
    RAISE EXCEPTION 'This PRP version is obsolete. Use v%', 
      (SELECT version FROM recipe_fsms_prp WHERE id = v_prp.superseded_by);
  END IF;

  INSERT INTO prp_logs (
    org_id, prp_no, prp_type, category, description, area, method,
    result, next_due, done_by, notes, status, recipe_id, batch_id,
    created_by, compliance_standard, frequency, last_reviewed
  ) VALUES (
    v_org_id, v_prp.prp_no, v_prp.prp_type, 'Product-Specific',
    v_prp.prp_name, v_prp.target_area, v_prp.procedure,
    p_result, p_next_due, p_done_by, p_remarks,
    CASE WHEN p_result = 'Pass' THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    v_prp.recipe_id, p_batch_id, p_user_id, p_compliance_standard,
    v_prp.frequency, CURRENT_DATE
  ) RETURNING id INTO v_log_id;

  -- 21 CFR Part 11 audit trail
  INSERT INTO prp_execution_history (org_id, prp_log_id, version, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_log_id, 1, p_user_id, 'CREATE', 
          jsonb_build_object('result', p_result, 'prp_name', v_prp.prp_name),
          'PRP execution logged');

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'prp_name', v_prp.prp_name);
END; $$;

GRANT EXECUTE ON FUNCTION log_prp_execution(uuid, text, text, uuid, text, date, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION log_cleaning_checklist(
  p_sop_code text,
  p_tasks_completed int,
  p_tasks_total int,
  p_checklist jsonb, -- {task_id: true/false}
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_result text;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  
  v_result := CASE WHEN p_tasks_completed = p_tasks_total THEN 'Pass (Complete)' ELSE 'Incomplete' END;
  
  INSERT INTO prp_logs (
    org_id, prp_no, prp_type, category, description, area, method,
    result, done_by, notes, status, created_by, compliance_standard
  ) VALUES (
    v_org_id, p_sop_code || '-DAILY-' || TO_CHAR(now(), 'YYYYMMDD'),
    'Sanitation', 'Cleaning Log', 
    'Daily Sanitation Checklist: ' || p_tasks_completed || '/' || p_tasks_total || ' completed',
    'Production Area', 'CIP & Chemical Spray',
    v_result, v_user_name, p_checklist::text,
    CASE WHEN p_tasks_completed = p_tasks_total THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    p_user_id, 'ISO_22000'
  );
  
  RETURN jsonb_build_object('success', true, 'result', v_result);
END; $$;

GRANT EXECUTE ON FUNCTION log_cleaning_checklist(text, int, int, jsonb, uuid) TO authenticated;
