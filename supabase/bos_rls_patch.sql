-- ============================================================
--  SVR BOS — RLS Migration Patch
--  Run this on an EXISTING Supabase deployment that was set up
--  with the old bos_schema.sql (allow_all policies).
--
--  What this does:
--    1. LINK-010: Drops all "allow_all" policies → auth.uid() IS NOT NULL
--    2. LINK-005: Adds batch_no column to dispatches table
--    3. LINK-009: Adds UNIQUE constraints on key identifier columns
--    4. LINK-001: Creates consumed_lots table for RM tracking
--
--  Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS).
-- ============================================================

-- ── STEP 1: Drop old insecure allow_all policies ─────────────

DROP POLICY IF EXISTS "allow_all_grns"        ON grns;
DROP POLICY IF EXISTS "allow_all_lots"        ON lots;
DROP POLICY IF EXISTS "allow_all_batches"     ON batches;
DROP POLICY IF EXISTS "allow_all_qc_checks"   ON qc_checks;
DROP POLICY IF EXISTS "allow_all_fg_lots"     ON fg_lots;
DROP POLICY IF EXISTS "allow_all_dispatches"  ON dispatches;
DROP POLICY IF EXISTS "allow_all_invoices"    ON invoices;
DROP POLICY IF EXISTS "allow_all_payments"    ON payments;
DROP POLICY IF EXISTS "allow_all_expenses"    ON expenses;
DROP POLICY IF EXISTS "allow_all_products"    ON products;
DROP POLICY IF EXISTS "allow_all_recipes"     ON recipes;
DROP POLICY IF EXISTS "allow_all_recipe_inputs" ON recipe_inputs;
DROP POLICY IF EXISTS "allow_all_recipe_steps"  ON recipe_steps;

-- ── STEP 2: Create auth.uid() IS NOT NULL policies ───────────

CREATE POLICY IF NOT EXISTS "auth_only_grns"
  ON grns FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_lots"
  ON lots FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_batches"
  ON batches FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_qc_checks"
  ON qc_checks FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_fg_lots"
  ON fg_lots FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_dispatches"
  ON dispatches FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_invoices"
  ON invoices FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_payments"
  ON payments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_expenses"
  ON expenses FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_products"
  ON products FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_recipes"
  ON recipes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_recipe_inputs"
  ON recipe_inputs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "auth_only_recipe_steps"
  ON recipe_steps FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Food safety tables (may not have policies yet)
ALTER TABLE ccp_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_docs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_audits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergen_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp_logs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "auth_only_ccp_logs"
  ON ccp_logs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_fssai_docs"
  ON fssai_docs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_fssai_audits"
  ON fssai_audits FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_capas"
  ON capas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_allergen_matrix"
  ON allergen_matrix FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_recalls"
  ON recalls FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "auth_only_prp_logs"
  ON prp_logs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ── STEP 3: LINK-005 — Add batch_no to dispatches ─────────────

ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS batch_no text;
CREATE INDEX IF NOT EXISTS idx_dispatches_batch_no ON dispatches(batch_no);
CREATE INDEX IF NOT EXISTS idx_fg_lots_batch_no    ON fg_lots(batch_no);
CREATE INDEX IF NOT EXISTS idx_lots_material       ON lots(material);

-- ── STEP 4: LINK-009 — Unique constraints ──────────────────────

ALTER TABLE grns       add constraint grns_grn_no_unique        UNIQUE (grn_no);
ALTER TABLE batches    add constraint batches_batch_no_unique    UNIQUE (batch_no);
ALTER TABLE dispatches add constraint dispatches_do_no_unique    UNIQUE (do_no);
ALTER TABLE invoices   add constraint invoices_invoice_no_unique UNIQUE (invoice_no);

-- ── STEP 5: LINK-001 — consumed_lots table ─────────────────────

CREATE TABLE IF NOT EXISTS consumed_lots (
  id           text primary key default gen_random_uuid()::text,
  batch_id     text references batches(id) on delete cascade,
  batch_no     text not null,
  lot_id       text references lots(id),
  lot_no       text,
  material     text not null,
  qty_consumed numeric(12,3) not null,
  rate         numeric(12,2),
  cost         numeric(12,2),
  created_at   timestamptz default now()
);

ALTER TABLE consumed_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "auth_only_consumed_lots"
  ON consumed_lots FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_consumed_lots_batch_id ON consumed_lots(batch_id);
CREATE INDEX IF NOT EXISTS idx_consumed_lots_lot_id   ON consumed_lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_consumed_lots_material ON consumed_lots(material);

-- ── STEP 6: LINK-007 — HACCP ccp_logs batch_id FK ─────────────

ALTER TABLE ccp_logs ADD COLUMN IF NOT EXISTS batch_id text REFERENCES batches(id);
CREATE INDEX IF NOT EXISTS idx_ccp_logs_batch_id ON ccp_logs(batch_id);

-- ── STEP 7: LINK-011 — Enable RLS and add auth.uid() IS NOT NULL policies for DMS tables ─────────────

ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_only_documents" ON documents;
CREATE POLICY "auth_only_documents"
  ON documents FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth_only_dms_companies" ON dms_companies;
CREATE POLICY "auth_only_dms_companies"
  ON dms_companies FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Migration complete! Verify in Supabase Dashboard:
--   Authentication > Policies — should show auth_only_* policies
--   Table Editor > dispatches — should show batch_no column
-- ============================================================

