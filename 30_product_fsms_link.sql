CREATE TABLE IF NOT EXISTS public.haccp_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  plan_code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS recipe_id uuid;
ALTER TABLE products ADD COLUMN IF NOT EXISTS haccp_plan_id uuid REFERENCES public.haccp_plans(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES products(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'OBSOLETE'));

CREATE TABLE IF NOT EXISTS product_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  allergen text NOT NULL,
  contains boolean DEFAULT false,
  may_contain boolean DEFAULT false
);

-- 21 CFR Part 11 History
CREATE TABLE IF NOT EXISTS product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  product_id uuid NOT NULL REFERENCES products(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'OBSOLETE')),
  change_reason text NOT NULL,
  old_data jsonb,
  new_data jsonb
);

ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_history_org ON product_history;
CREATE POLICY product_history_org ON product_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- RPC with versioning
CREATE OR REPLACE FUNCTION upsert_product(
  p_name text,
  p_slug text,
  p_recipe_id uuid,
  p_allergens jsonb, -- [{allergen: 'Milk', contains: true, may_contain: false}]
  p_data jsonb,
  p_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Updated via CMS',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
  v_product_id uuid;
  v_version int;
  v_old_data jsonb;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;

  IF p_id IS NULL THEN
    INSERT INTO products (org_id, name, slug, recipe_id, version, status)
    VALUES (v_org_id, p_name, p_slug, p_recipe_id, 1, 'DRAFT')
    RETURNING id INTO v_product_id;

    INSERT INTO product_history VALUES (
      gen_random_uuid(), v_org_id, v_product_id, 1, p_user_id, now(),
      'CREATE', p_reason, null, p_data
    );
  ELSE
    SELECT version, to_jsonb(products.*) INTO v_version, v_old_data
    FROM products WHERE id = p_id;

    -- Increment version
    UPDATE products SET
      name = p_name, slug = p_slug, recipe_id = p_recipe_id,
      version = v_version + 1, updated_at = now()
    WHERE id = p_id;

    INSERT INTO product_history VALUES (
      gen_random_uuid(), v_org_id, p_id, v_version + 1, p_user_id, now(),
      'UPDATE', p_reason, v_old_data, p_data
    );
    v_product_id := p_id;
  END IF;

  -- Update allergen matrix
  DELETE FROM product_allergens WHERE product_id = v_product_id;
  INSERT INTO product_allergens (product_id, allergen, contains, may_contain)
  SELECT v_product_id, (x->>'allergen')::text, (x->>'contains')::boolean, (x->>'may_contain')::boolean
  FROM jsonb_array_elements(p_allergens) x;

  RETURN v_product_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_product(text, text, uuid, jsonb, jsonb, uuid, text, uuid) TO authenticated;

-- Only QC/ADMIN with valid HACCP training can edit products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_update_trained_only ON products;
CREATE POLICY product_update_trained_only ON products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN training_records tr ON tr.employee_id = p.id
    JOIN sops s ON s.id = tr.sop_id
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'QC', 'MANAGER')
    AND s.sop_no = 'SOP-HACCP-002'
    AND tr.status = 'PASSED'
    AND tr.expiry_date >= CURRENT_DATE
  )
);
