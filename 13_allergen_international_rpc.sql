-- 13_allergen_international_rpc.sql

CREATE OR REPLACE FUNCTION upsert_allergen_matrix(
  p_product_name text,
  p_declared boolean,
  p_allergens jsonb, -- {gluten: 'present', eggs: 'absent',...}
  p_matrix_id text DEFAULT NULL,
  p_change_reason text DEFAULT NULL,
  p_compliance_standard text DEFAULT 'FSSAI_2020',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_user_role text;
  v_old_record allergen_matrix%ROWTYPE;
  v_new_id text;
  v_new_version int;
BEGIN
  -- 1. Auth + Role check
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only ADMIN/MANAGER/QC can manage allergens';
  END IF;

  -- 2. Validate allergen JSON
  IF jsonb_typeof(p_allergens)!= 'object' THEN
    RAISE EXCEPTION 'allergens must be JSON object with 14 keys';
  END IF;

  -- 3. Update = create new version, supersede old - FDA 21 CFR Part 11
  IF p_matrix_id IS NOT NULL THEN
    SELECT * INTO v_old_record FROM allergen_matrix
    WHERE id = p_matrix_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Matrix not found or access denied'; END IF;
    IF v_old_record.approved_by IS NOT NULL AND v_user_role!= 'ADMIN' THEN
      RAISE EXCEPTION 'Approved declarations can only be modified by ADMIN';
    END IF;

    v_new_version := v_old_record.version + 1;

    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, updated_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    UPDATE allergen_matrix SET superseded_by = v_new_id, updated_at = now() WHERE id = p_matrix_id;

    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, old_data, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'UPDATE', to_jsonb(v_old_record), p_allergens, p_change_reason);

  ELSE
    -- 4. Create new
    v_new_version := 1;
    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'CREATE', p_allergens, p_change_reason);
  END IF;

  RETURN jsonb_build_object('success', true, 'matrix_id', v_new_id, 'version', v_new_version);
END; $$;

GRANT EXECUTE ON FUNCTION upsert_allergen_matrix(text, boolean, jsonb, text, text, text, uuid) TO authenticated;

-- ============================================================================
-- RPC: APPROVE_ALLERGEN_DECLARATION
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_allergen_declaration(
  p_matrix_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role NOT IN ('ADMIN', 'QC') THEN RAISE EXCEPTION 'Only ADMIN/QC can approve'; END IF;

  UPDATE allergen_matrix 
  SET approved_by = p_user_id, approved_at = now() 
  WHERE id = p_matrix_id AND org_id = v_org_id AND superseded_by IS NULL;

  INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, change_reason)
  SELECT org_id, id, version, p_user_id, 'APPROVE', 'QC approval for label printing'
  FROM allergen_matrix WHERE id = p_matrix_id;

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION approve_allergen_declaration(uuid, uuid) TO authenticated;
