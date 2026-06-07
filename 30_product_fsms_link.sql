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
  p_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_recipe_id uuid DEFAULT NULL,
  p_allergens jsonb DEFAULT '[]'::jsonb,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT 'Updated via CMS',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
  v_product_id uuid;
  v_version int;
  v_old_data jsonb;
  v_images text[];
  v_tags text[];
  v_benefits text[];
BEGIN
  -- Get user organization
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User profile or organization not found for user ID %', p_user_id;
  END IF;

  -- Safely extract text arrays from p_data
  IF p_data->'images' IS NOT NULL AND jsonb_typeof(p_data->'images') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'images'))::text[] INTO v_images;
  ELSE
    v_images := '{}'::text[];
  END IF;

  IF p_data->'tags' IS NOT NULL AND jsonb_typeof(p_data->'tags') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'tags'))::text[] INTO v_tags;
  ELSE
    v_tags := '{}'::text[];
  END IF;

  IF p_data->'benefits' IS NOT NULL AND jsonb_typeof(p_data->'benefits') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'benefits'))::text[] INTO v_benefits;
  ELSE
    v_benefits := '{}'::text[];
  END IF;

  IF p_id IS NULL THEN
    -- Create a new product with all fields mapped
    INSERT INTO public.products (
      org_id, name, slug, recipe_id, version, status,
      tagline, description, short_desc, category, images, tags, benefits,
      usage_home, usage_pro, pack_sizes, in_stock, featured, visible, sort_order,
      seo_title, seo_desc, og_image
    )
    VALUES (
      v_org_id, p_name, p_slug, p_recipe_id, 1, 'DRAFT',
      (p_data->>'tagline')::text,
      (p_data->>'description')::text,
      (p_data->>'short_desc')::text,
      COALESCE((p_data->>'category')::text, 'General'),
      v_images, v_tags, v_benefits,
      (p_data->>'usage_home')::text,
      (p_data->>'usage_pro')::text,
      (p_data->>'pack_sizes')::text,
      COALESCE((p_data->>'in_stock')::boolean, true),
      COALESCE((p_data->>'featured')::boolean, false),
      COALESCE((p_data->>'visible')::boolean, true),
      COALESCE((p_data->>'sort_order')::int, 0),
      (p_data->>'seo_title')::text,
      (p_data->>'seo_desc')::text,
      (p_data->>'og_image')::text
    )
    RETURNING id INTO v_product_id;

    -- Log to history
    INSERT INTO public.product_history VALUES (
      gen_random_uuid(), v_org_id, v_product_id, 1, p_user_id, now(),
      'CREATE', p_reason, null, p_data
    );
  ELSE
    -- Fetch current version and values for history logging
    SELECT version, to_jsonb(products.*) INTO v_version, v_old_data
    FROM public.products WHERE id = p_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', p_id;
    END IF;

    -- Update product with all fields mapped
    UPDATE public.products SET
      name = p_name, 
      slug = p_slug, 
      recipe_id = p_recipe_id,
      tagline = (p_data->>'tagline')::text,
      description = (p_data->>'description')::text,
      short_desc = (p_data->>'short_desc')::text,
      category = COALESCE((p_data->>'category')::text, 'General'),
      images = v_images, 
      tags = v_tags, 
      benefits = v_benefits,
      usage_home = (p_data->>'usage_home')::text,
      usage_pro = (p_data->>'usage_pro')::text,
      pack_sizes = (p_data->>'pack_sizes')::text,
      in_stock = COALESCE((p_data->>'in_stock')::boolean, true),
      featured = COALESCE((p_data->>'featured')::boolean, false),
      visible = COALESCE((p_data->>'visible')::boolean, true),
      sort_order = COALESCE((p_data->>'sort_order')::int, 0),
      seo_title = (p_data->>'seo_title')::text,
      seo_desc = (p_data->>'seo_desc')::text,
      og_image = (p_data->>'og_image')::text,
      version = v_version + 1, 
      updated_at = now()
    WHERE id = p_id;
    
    -- Log to history
    INSERT INTO public.product_history VALUES (
      gen_random_uuid(), v_org_id, p_id, v_version + 1, p_user_id, now(),
      'UPDATE', p_reason, v_old_data, p_data
    );
    v_product_id := p_id;
  END IF;

  -- Update allergen matrix
  DELETE FROM public.product_allergens WHERE product_id = v_product_id;
  INSERT INTO public.product_allergens (product_id, allergen, contains, may_contain)
  SELECT v_product_id, (x->>'allergen')::text, (x->>'contains')::boolean, (x->>'may_contain')::boolean
  FROM jsonb_array_elements(p_allergens) x;

  RETURN v_product_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_product(uuid, text, text, uuid, jsonb, jsonb, text, uuid) TO authenticated;

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
