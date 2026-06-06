-- 19_sop_international_rpc.sql

CREATE OR REPLACE FUNCTION upsert_sop(
  p_sop_no text,
  p_title text,
  p_category text,
  p_version text,
  p_sop_id uuid DEFAULT NULL, -- NULL = new, UUID = new version of existing
  p_department text DEFAULT NULL,
  p_effective_date date DEFAULT NULL,
  p_review_date date DEFAULT NULL,
  p_prepared_by text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_recipe_id uuid DEFAULT NULL,
  p_change_reason text DEFAULT 'Initial version',
  p_compliance_standard text DEFAULT 'ISO_9001',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
  v_old_sop sops%ROWTYPE;
  v_new_id uuid;
  v_parent_id uuid;
BEGIN
  -- 1. Auth
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Only ADMIN/MANAGER/QC can manage SOPs';
  END IF;

  -- 2. If updating, create new version and supersede old
  IF p_sop_id IS NOT NULL THEN
    SELECT * INTO v_old_sop FROM sops
    WHERE id = p_sop_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found'; END IF;
    IF v_old_sop.status = 'Obsolete' THEN RAISE EXCEPTION 'Cannot update obsolete SOP'; END IF;

    v_parent_id := COALESCE(v_old_sop.parent_sop_id, p_sop_id);

    -- Insert new version
    INSERT INTO sops (
      org_id, sop_no, title, category, department, version, effective_date,
      review_date, status, prepared_by, notes, recipe_id, parent_sop_id,
      created_by, compliance_standard
    ) VALUES (
      v_org_id, p_sop_no, p_title, p_category, p_department, p_version, p_effective_date,
      p_review_date, 'Draft', p_prepared_by, p_notes, p_recipe_id, v_parent_id,
      p_user_id, p_compliance_standard
    ) RETURNING id INTO v_new_id;

    -- Mark old as superseded
    UPDATE sops SET superseded_by = v_new_id, status = 'Obsolete', updated_at = now()
    WHERE id = p_sop_id;

    -- History
    INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, old_data, new_data, change_reason)
    VALUES (v_org_id, v_new_id, p_version, p_user_id, 'UPDATE', to_jsonb(v_old_sop), to_jsonb(p_sop_no), p_change_reason);

  ELSE
    -- 3. Create new SOP
    INSERT INTO sops (
      org_id, sop_no, title, category, department, version, effective_date,
      review_date, status, prepared_by, notes, recipe_id, created_by, compliance_standard
    ) VALUES (
      v_org_id, p_sop_no, p_title, p_category, p_department, p_version, p_effective_date,
      p_review_date, 'Draft', p_prepared_by, p_notes, p_recipe_id, p_user_id, p_compliance_standard
    ) RETURNING id INTO v_new_id;

    INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, new_data, change_reason)
    VALUES (v_org_id, v_new_id, p_version, p_user_id, 'CREATE', to_jsonb(p_title), p_change_reason);
  END IF;

  RETURN jsonb_build_object('success', true, 'sop_id', v_new_id, 'version', p_version);

EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'SOP save failed: %', SQLERRM;
END; $$;

-- Approval RPC - ISO 9001 Cl. 7.5.2 requirement
CREATE OR REPLACE FUNCTION approve_sop(
  p_sop_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER') THEN RAISE EXCEPTION 'Only ADMIN/MANAGER can approve SOPs'; END IF;

  UPDATE sops
  SET status = 'Active', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_sop_id AND org_id = v_org_id AND status = 'Draft';

  IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found or not in Draft status'; END IF;

  INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, change_reason)
  SELECT org_id, id, version, p_user_id, 'APPROVE', 'SOP approved for release'
  FROM sops WHERE id = p_sop_id;

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION upsert_sop(text, text, text, text, uuid, text, date, date, text, text, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_sop(uuid, uuid) TO authenticated;
