import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseDir = path.join(__dirname, '..', 'supabase');

// ── ORDER MATTERS ──────────────────────────────────────────────────────────────
// 1. Core CMS schema (products, blog, pages, testimonials, etc.)
// 2. ERP architecture (new schemas: iam, md, recipe, inv, mfg, qa, fin, cms, dms, log)
// 3. BOS legacy tables (grns, lots, batches, qc_checks, dispatches, invoices, payments, expenses)
// 4. BOS extensions (recipe engine, DMS, R&D)
// 5. Security hardening (RLS + assert_rpc_context trigger – must come AFTER BOS tables exist)
// 6. Maker-checker workflow (depends on dispatch/payment triggers from hardening)
// 7. Feature upgrade scripts (add columns / tables to existing base tables – idempotent ALTER … ADD COLUMN IF NOT EXISTS)
// 8. Finance (depends on fin.* schema from erp_architecture + base tables)
// 9. ERP hardening (RLS/RBAC/RPC hardening – depends on all tables)
// 10. ERP stabilization (FEFO, dead-letter, concurrency – depends on hardening)
// 11. Seed data
// 12. Auth fix (must be last so it sees all tables)
const filesToInclude = [
  // ── Core ────────────────────────────────────────────────────────────────────
  'schema.sql',                        // CMS tables + seed products
  'erp_architecture.sql',              // iam/md/recipe/inv/mfg/qa/fin/cms/dms/log schemas

  // ── BOS legacy ──────────────────────────────────────────────────────────────
  'bos_schema.sql',                    // grns, lots, batches, fg_lots, dispatches, invoices…
  'rnd_schema.sql',                    // rnd_formulas, rnd_ingredients, rnd_trials…
  'bos_recipe_schema.sql',             // recipes, recipe_inputs, recipe_steps, allergen_matrix…
  'bos_dms_schema.sql',                // documents, dms_companies, dms.* tables

  // ── Security ────────────────────────────────────────────────────────────────
  'bos_security_hardening.sql',        // assert_rpc_context, DROP+CREATE triggers (idempotent)
  'maker_checker_workflow.sql',        // trg_dispatches_maker, trg_payments_maker (idempotent)

  // ── Feature upgrades (idempotent ALTER / CREATE … IF NOT EXISTS) ───────────
  'create_production_support_tables.sql',  // work_centers, equipment, daily_logs
  'batch_dynamic_params.sql',              // batches.dynamic_params JSONB column
  'upgrade_batches_parameters.sql',        // batches.target_temp, actual_temp columns
  'recipe_qc_params_upgrade.sql',          // recipe_qc_params table
  'rnd_upgrade.sql',                       // rnd_ingredients.erp_product_id, rnd_formulas.erp_product_id
  'rnd_params_upgrade.sql',               // rnd_formula_params table
  'dms_upgrade.sql',                       // dms_links table
  'inventory_upgrade.sql',                 // stock_ledger table, erp_product_id on grns/lots
  'fsms_dynamic_upgrade.sql',              // fsms product-wise dynamic tables
  'general_stores.sql',                    // store_items, store_transactions, maintenance_requests
  'logistics_reprocessing.sql',            // locations, packaging_runs, holding_orders, returns
  'customer_complaints.sql',               // customer_complaints table
  'remaining_features_upgrade.sql',        // any remaining feature tables
  'storage_patch.sql',                     // Supabase Storage bucket RLS policies

  // ── Finance ─────────────────────────────────────────────────────────────────
  'erp_finance.sql',                   // fin.fiscal_years, fin.post_journal, GST, AR/AP, costing

  // ── ERP hardening & stabilization ───────────────────────────────────────────
  'erp_hardening.sql',                 // force RLS, workflow RPCs, double-entry trigger, outbox
  'erp_stabilization.sql',             // FEFO allocator, dead-letter, idempotency, reconciliation views
  'sfmos_v3_upgrade.sql',              // SFMOS v3.2 Master Enterprise upgrades

  // ── Seed ────────────────────────────────────────────────────────────────────
  'gl_seed.sql',                       // Chart of Accounts + fiscal year seed for Srivriddhi Foods

  // ── Auth (must be last) ──────────────────────────────────────────────────────
  'auth_fix.sql',                      // auto_setup_new_user trigger on auth.users
];

// Helper: fix trigger definitions that are missing DROP IF EXISTS
// (only needed for schema.sql and bos_schema.sql which have bare CREATE TRIGGER)
function fixTriggers(content, filename) {
  // Replace bare "create trigger <name>" with "DROP TRIGGER IF EXISTS <name> ON <table>; CREATE TRIGGER <name>"
  return content.replace(
    /^(create trigger (\w+)\s*\n\s*(before|after|instead of)\s+\S+.*?\s+on\s+(\w+))/gim,
    (match, full, triggerName, _timing, tableName) => {
      return `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};\n${full}`;
    }
  );
}

let finalSql = `-- ============================================================
-- MASTER DB RESET  —  Srivriddhi ERP
-- Auto-generated by scripts/build_master_sql.js
--
-- ✅  Safe to run multiple times (fully idempotent)
-- ✅  Drops all schemas and rebuilds from scratch
-- ✅  Includes: CMS, BOS, R&D, DMS, Finance, ERP hardening & stabilization
-- ============================================================

-- ── Drop everything ───────────────────────────────────────────────────────────
DROP SCHEMA IF EXISTS public  CASCADE;
DROP SCHEMA IF EXISTS iam     CASCADE;
DROP SCHEMA IF EXISTS md      CASCADE;
DROP SCHEMA IF EXISTS recipe  CASCADE;
DROP SCHEMA IF EXISTS inv     CASCADE;
DROP SCHEMA IF EXISTS mfg     CASCADE;
DROP SCHEMA IF EXISTS qa      CASCADE;
DROP SCHEMA IF EXISTS fin     CASCADE;
DROP SCHEMA IF EXISTS cms     CASCADE;
DROP SCHEMA IF EXISTS dms     CASCADE;
DROP SCHEMA IF EXISTS log     CASCADE;

-- ── Recreate public ───────────────────────────────────────────────────────────
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

`;

let injected = 0;
let skipped = 0;

for (const file of filesToInclude) {
  const filePath = path.join(supabaseDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠  Skipping missing file: ${file}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix bare CREATE TRIGGER (without DROP IF EXISTS) in files that need it
  if (['schema.sql', 'bos_schema.sql'].includes(file)) {
    content = fixTriggers(content, file);
  }

  finalSql += `\n\n-- ============================================================\n`;
  finalSql += `-- INJECTED FILE: ${file}\n`;
  finalSql += `-- ============================================================\n\n`;
  finalSql += content;
  injected++;
}

// ── Global permissions ────────────────────────────────────────────────────────
finalSql += `
-- ============================================================
-- GLOBAL PERMISSIONS
-- Grant full access to authenticated/anon/service_role on
-- every table in public, iam, md, recipe, inv, mfg, qa,
-- fin, cms, dms, and log schemas.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('public','iam','md','recipe','inv','mfg','qa','fin','cms','dms','log')
  ) LOOP
    EXECUTE format(
      'GRANT ALL ON TABLE %I.%I TO authenticated, anon, service_role;',
      r.schemaname, r.tablename
    );
  END LOOP;
END $$;

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');
`;

const outPath = path.join(supabaseDir, 'MASTER_DB_RESET.sql');
fs.writeFileSync(outPath, finalSql, 'utf8');
const lines = finalSql.split('\n').length;
console.log(`✅  MASTER_DB_RESET.sql written  (${lines} lines, ${injected} files injected, ${skipped} skipped)`);
