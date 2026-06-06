-- 31_product_fsms_view_and_rpc.sql

-- Ensure products table has recipe_id column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS recipe_id uuid;

-- 1. SQL View - Product FSMS Status
CREATE OR REPLACE VIEW v_products_fsms AS
SELECT
  p.*,
  r.name as recipe_name,
  r.version as recipe_version,
  hp.plan_code as haccp_plan,
  COUNT(pa.id) FILTER (WHERE pa.contains = true) as allergen_count,
  STRING_AGG(pa.allergen, ', ') FILTER (WHERE pa.contains = true) as allergen_list,
  EXISTS(SELECT 1 FROM product_history ph WHERE ph.product_id = p.id) as has_history
FROM products p
LEFT JOIN recipes r ON r.id = p.recipe_id::text
LEFT JOIN haccp_plans hp ON hp.id = p.haccp_plan_id
LEFT JOIN product_allergens pa ON pa.product_id = p.id
GROUP BY p.id, r.name, r.version, hp.plan_code;

GRANT SELECT ON v_products_fsms TO authenticated;

-- 2. RPC: obsolete_product with 21 CFR Part 11
CREATE OR REPLACE FUNCTION obsolete_product(
  p_id uuid,
  p_reason text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_old_data jsonb;
BEGIN
  SELECT org_id, to_jsonb(products.*) INTO v_org_id, v_old_data
  FROM products WHERE id = p_id;

  UPDATE products SET
    status = 'OBSOLETE',
    visible = false,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO product_history (org_id, product_id, changed_by, change_type, change_reason, old_data, new_data)
  VALUES (v_org_id, p_id, p_user_id, 'OBSOLETE', p_reason, v_old_data, jsonb_build_object('status', 'OBSOLETE'));
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obsolete_product(uuid, text, uuid) TO authenticated;
