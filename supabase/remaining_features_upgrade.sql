-- ============================================================
-- SVR ERP - Remaining Features Migration
-- Run this in Supabase SQL editor
-- ============================================================

-- 1. AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name    TEXT,
  user_email   TEXT,
  action       TEXT NOT NULL,         -- INSERT | UPDATE | DELETE | LOGIN | APPROVE | REJECT | EXPORT
  module       TEXT,                  -- Production | Inventory | QC | FSMS | Accounts | Admin
  record_id    TEXT,                  -- ID of the affected record (UUID as text)
  record_label TEXT,                  -- Human-readable label e.g. "Batch B-001"
  details      TEXT,                  -- Free text description of what changed
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_module     ON audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 2. PRODUCTION FLOOR / LINE on BATCHES
-- ============================================================
ALTER TABLE batches ADD COLUMN IF NOT EXISTS production_floor TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS line_operator TEXT;

-- ============================================================
-- 3. CREATE SOPS TABLE AND LINK TO RECIPES / PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sops (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_no         TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  category       TEXT,
  department     TEXT,
  version        TEXT DEFAULT '1.0',
  effective_date DATE,
  review_date    DATE,
  status         TEXT DEFAULT 'Active',
  prepared_by    TEXT,
  approved_by    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sops ADD COLUMN IF NOT EXISTS recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sops_recipe_id  ON sops(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sops_product_id ON sops(product_id);

-- ============================================================
-- 4. site_settings table (if not exists - for AdminSettings)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_all" ON site_settings USING (true) WITH CHECK (true);

-- Done!
