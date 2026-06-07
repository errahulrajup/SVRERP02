#!/usr/bin/env node
/**
 * ============================================================
 * SVRERP — Supabase Management API SQL Runner
 * Uses HTTPS (no direct DB connection needed!)
 * ============================================================
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF   = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;
const API_BASE      = 'https://api.supabase.com';

// ============================================================
// MIGRATION FILE ORDER
// ============================================================
const MIGRATION_FILES = [
  // PHASE 1: Base Schemas
  'supabase/schema.sql',
  'supabase/erp_architecture.sql',
  'supabase/bos_schema.sql',
  'supabase/rnd_schema.sql',
  'supabase/bos_recipe_schema.sql',
  'supabase/bos_dms_schema.sql',
  'supabase/create_production_support_tables.sql',
  'supabase/maker_checker_workflow.sql',
  'supabase/bos_security_hardening.sql',
  'supabase/inventory_upgrade.sql',
  'supabase/logistics_reprocessing.sql',
  'supabase/general_stores.sql',
  'supabase/fsms_dynamic_upgrade.sql',
  'supabase/batch_dynamic_params.sql',
  'supabase/upgrade_batches_parameters.sql',
  'supabase/recipe_qc_params_upgrade.sql',
  'supabase/rnd_upgrade.sql',
  'supabase/rnd_params_upgrade.sql',
  'supabase/dms_upgrade.sql',
  'supabase/customer_complaints.sql',

  // PHASE 2: Multi-tenant & Auth (inline)
  '__INLINE__MULTITENANT__',

  // PHASE 3: Master Data
  'master_data_schema.sql',

  // PHASE 4: Stock Ledger & GRN
  '07_stock_ledger_triggers_and_rpcs.sql',
  '09_grn_approval_rpcs.sql',

  // PHASE 5: Production
  '10_production_module_migration.sql',
  '10_fssai_alerts_and_costing.sql',
  '11_batch_qc_rpc.sql',
  '11_production_rpc.sql',

  // PHASE 6: Allergen, Finance, Logistics
  '12_allergen_international_migration.sql',
  '12_finance_logistics_rpcs.sql',
  '13_allergen_international_rpc.sql',
  '13_cogs_view_and_expenses.sql',
  '14_costing_dashboard_rpcs.sql',
  '14_prp_international_migration.sql',
  '15_logistics_fixes.sql',
  '15_prp_international_rpc.sql',
  '16_expenses_fixes.sql',
  '16_recall_international_migration.sql',
  '17_recall_international_rpc.sql',

  // PHASE 7: Compliance
  '18_sop_international_migration.sql',
  '19_sop_international_rpc.sql',
  '20_capa_international_migration.sql',
  '21_capa_update_rpc.sql',
  '23_prp_final_rpc.sql',
  '24_training_international_migration.sql',
  'fssai_atomic_rpc.sql',

  // PHASE 8: Equipment & FSMS
  '25_equipment_ccp_migration.sql',
  '26_cto_dashboard_rpc.sql',
  '27_cto_kpis_and_audit_view.sql',
  '28_final_audit_gaps_migration.sql',
  '30_product_fsms_link.sql',
  '31_product_fsms_view_and_rpc.sql',
  '40_training_esig.sql',
  '50_equipment_cmms.sql',
];

// ============================================================
// INLINE: Multi-tenant SQL
// ============================================================
const MULTITENANT_SQL = `
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Srivriddhi Enterprise',
  created_at timestamptz DEFAULT now()
);
INSERT INTO public.organizations (name) VALUES ('Srivriddhi Enterprise') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'OPERATOR' CHECK (role IN ('ADMIN', 'MANAGER', 'QC', 'OPERATOR', 'EDITOR')),
  employee_code text UNIQUE,
  department text,
  is_active boolean DEFAULT true,
  hire_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  INSERT INTO public.profiles (id, org_id, email, name, role)
  VALUES (new.id, default_org_id, new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'ADMIN')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data,'{}')::jsonb || '{"role":"ADMIN"}'::jsonb,
      raw_user_meta_data = COALESCE(raw_user_meta_data,'{}')::jsonb || '{"role":"ADMIN"}'::jsonb;

UPDATE public.profiles SET role = 'ADMIN' WHERE true;

ALTER TABLE public.lots             ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.batches          ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.fg_lots          ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.packaging_runs   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.products         ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.grns             ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.stock_ledger     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.work_centers     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.equipment        ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
`;

// ============================================================
// API CALL
// ============================================================
function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ ok: true });
        } else {
          try {
            const parsed = JSON.parse(data);
            reject(new Error(parsed.message || parsed.error || data));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================
// COLORS
// ============================================================
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m',
      C = '\x1b[36m', B = '\x1b[1m',  X = '\x1b[0m';

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log(`\n${B}${C}============================================================`);
  console.log(`  SVRERP — Supabase Auto SQL Runner (API Mode)`);
  console.log(`  Project: ${PROJECT_REF}`);
  console.log(`============================================================${X}\n`);

  // Test API connection first
  try {
    await runSQL('SELECT 1');
    console.log(`${G}✅ Connected to Supabase API!${X}\n`);
  } catch (err) {
    console.error(`${R}❌ API CONNECTION FAILED: ${err.message}${X}\n`);
    process.exit(1);
  }

  const ROOT   = __dirname;
  let passed   = 0, failed = 0;
  const errors = [];
  const total  = MIGRATION_FILES.length;

  for (let i = 0; i < total; i++) {
    const file   = MIGRATION_FILES[i];
    const num    = `[${String(i+1).padStart(2,'0')}/${total}]`;
    let sql      = '';
    let label    = '';

    if (file === '__INLINE__MULTITENANT__') {
      sql   = MULTITENANT_SQL;
      label = 'INLINE: Multi-tenant + Profiles + Auth';
    } else {
      const fp = path.join(ROOT, file);
      if (!fs.existsSync(fp)) {
        console.log(`${Y}⚠️  ${num} SKIP (not found): ${file}${X}`);
        continue;
      }
      sql   = fs.readFileSync(fp, 'utf-8');
      label = file;
    }

    process.stdout.write(`${C}⏳ ${num} Running: ${label}...${X}`);

    try {
      await runSQL(sql);
      passed++;
      process.stdout.write(`\r${G}✅ ${num} OK      ${label}${' '.repeat(10)}\n${X}`);
    } catch (err) {
      failed++;
      const short = err.message.split('\n')[0].slice(0, 120);
      process.stdout.write(`\r${R}❌ ${num} FAILED  ${label}${' '.repeat(10)}\n${X}`);
      console.log(`   ${R}↳ ${short}${X}`);
      errors.push({ file: label, error: err.message });
    }
  }

  // Summary
  console.log(`\n${B}${C}============================================================`);
  console.log(`  DONE`);
  console.log(`============================================================${X}`);
  console.log(`  ${G}✅ Passed : ${passed}${X}`);
  console.log(`  ${R}❌ Failed : ${failed}${X}`);

  if (errors.length) {
    const log = path.join(ROOT, 'migration_errors.log');
    fs.writeFileSync(log, errors.map(e =>
      `FILE: ${e.file}\nERROR: ${e.error}\n${'─'.repeat(60)}`).join('\n\n'));
    console.log(`\n  ${Y}Error log: ${log}${X}`);
  } else {
    console.log(`\n  ${G}${B}🎉 ALL DONE! Login at: https://svrerp-02.vercel.app/login${X}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
