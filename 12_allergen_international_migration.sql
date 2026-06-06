-- ============================================================================
-- 12_allergen_international_migration.sql
-- ============================================================================

-- 1. Add compliance columns
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS superseded_by uuid; -- no FK to avoid type mismatch
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'FSSAI_2020'
CHECK (compliance_standard IN ('FSSAI_2020', 'EU_FIC_1169', 'FDA_FALCPA', 'CODEX_STAN_1'));

-- 2. History table for FDA 21 CFR Part 11 audit trail
CREATE TABLE IF NOT EXISTS allergen_matrix_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  matrix_id text NOT NULL REFERENCES allergen_matrix(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text
);

CREATE INDEX IF NOT EXISTS idx_allergen_history_matrix ON allergen_matrix_history(matrix_id, version DESC);

-- 3. RLS
ALTER TABLE allergen_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allergen_org_isolation ON allergen_matrix;
CREATE POLICY allergen_org_isolation ON allergen_matrix
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 4. Atomic RPC with Audit
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_allergen_matrix(
  p_product_name text,
  p_declared boolean,
  p_allergens jsonb, -- {gluten: 'present', eggs: 'absent',...}
  p_matrix_id text DEFAULT NULL, -- NULL = create, TEXT = update
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
  -- 1. Auth
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Insufficient permissions for allergen management';
  END IF;

  -- 2. Validate allergen values
  IF jsonb_typeof(p_allergens)!= 'object' THEN
    RAISE EXCEPTION 'allergens must be JSON object';
  END IF;

  -- 3. Update existing = create new version, supersede old
  IF p_matrix_id IS NOT NULL THEN
    SELECT * INTO v_old_record FROM allergen_matrix
    WHERE id = p_matrix_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Matrix not found or access denied'; END IF;

    v_new_version := v_old_record.version + 1;

    -- Insert new version
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

    -- Mark old as superseded
    UPDATE allergen_matrix SET superseded_by = v_new_id WHERE id = p_matrix_id;

    -- History entry
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

  RETURN jsonb_build_object(
    'success', true,
    'matrix_id', v_new_id,
    'version', v_new_version,
    'product_name', p_product_name
  );
END; $$;

GRANT EXECUTE ON FUNCTION upsert_allergen_matrix(text, boolean, jsonb, text, text, text, uuid) TO authenticated;
