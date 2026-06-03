# Srivriddhi ERP — Setup Guide

## Quick Start

### 1. Environment Variables

Create `.env` in project root:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Create `public/svr-env.js` (for BOS HTML pages):
```js
window.__SVR_ENV = {
  url:  "https://YOUR-PROJECT-ID.supabase.co",
  anon: "YOUR-ANON-KEY",
};
```
**⚠ Never commit `.env` or `svr-env.js` to git. Both are in `.gitignore`.**

---

## Fresh Database Reset (Supabase)

> Use this when you need a completely clean slate.

### Option A — One-shot reset (recommended)

Run **a single file** in Supabase → SQL Editor → New Query:

```
supabase/MASTER_DB_RESET.sql
```

This file is fully self-contained. It:
- Drops all schemas (`public`, `iam`, `md`, `recipe`, `inv`, `mfg`, `qa`, `fin`, `cms`, `dms`, `log`)
- Recreates everything from scratch in the correct dependency order
- Includes all upgrade scripts (no separate migrations needed)
- Seeds GL accounts and basic data
- Sets up auth triggers (first signup → ADMIN, subsequent → OPERATOR)
- Reloads the PostgREST schema cache automatically

**To regenerate `MASTER_DB_RESET.sql` after editing individual SQL files:**
```bash
node scripts/build_master_sql.js
```

### Option B — Manual step-by-step (for debugging)

Run SQL files in this order in Supabase → SQL Editor:

| # | File | Purpose |
|---|------|---------|
| 1 | `schema.sql` | CMS tables (products, blog, pages, testimonials, etc.) |
| 2 | `erp_architecture.sql` | ERP schemas: iam, md, recipe, inv, mfg, qa, fin, cms, dms, log |
| 3 | `bos_schema.sql` | BOS tables: grns, lots, batches, qc_checks, dispatches, invoices… |
| 4 | `rnd_schema.sql` | R&D tables: rnd_formulas, rnd_ingredients, rnd_trials… |
| 5 | `bos_recipe_schema.sql` | Recipe engine, allergen matrix |
| 6 | `bos_dms_schema.sql` | Document management tables |
| 7 | `bos_security_hardening.sql` | assert_rpc_context trigger, RLS |
| 8 | `maker_checker_workflow.sql` | Maker-checker workflow triggers |
| 9 | `create_production_support_tables.sql` | work_centers, equipment, daily_logs |
| 10 | `batch_dynamic_params.sql` | batches.dynamic_params column |
| 11 | `upgrade_batches_parameters.sql` | batches.target_temp, actual_temp |
| 12 | `recipe_qc_params_upgrade.sql` | Recipe QC parameters table |
| 13 | `rnd_upgrade.sql` | R&D → ERP product links |
| 14 | `rnd_params_upgrade.sql` | R&D formula dynamic params |
| 15 | `dms_upgrade.sql` | DMS entity links |
| 16 | `inventory_upgrade.sql` | stock_ledger table |
| 17 | `fsms_dynamic_upgrade.sql` | Product-wise FSMS tables |
| 18 | `general_stores.sql` | Store items, maintenance requests |
| 19 | `logistics_reprocessing.sql` | Locations, packaging runs, returns |
| 20 | `customer_complaints.sql` | Customer complaints table |
| 21 | `remaining_features_upgrade.sql` | Remaining feature tables |
| 22 | `storage_patch.sql` | Supabase Storage bucket RLS |
| 23 | `erp_finance.sql` | Finance: fiscal years, GST, GL, costing, AR/AP |
| 24 | `erp_hardening.sql` | Workflow RPCs, RLS hardening, double-entry trigger |
| 25 | `erp_stabilization.sql` | FEFO, dead-letter events, concurrency safety |
| 26 | `gl_seed.sql` | Chart of Accounts + fiscal year for Srivriddhi Foods |
| 27 | `auth_fix.sql` | Auth trigger: auto-confirm + role assignment |

**Optional (dev/staging only):**
- `seed_dummy.sql` — sample data for testing
- `cron_refresh_views.sql` — materialized view auto-refresh (requires pg_cron)

**DO NOT run on production:**
- `erp_failure_tests.sql`
- `erp_finance_failure_tests.sql`

---

### 3. Supabase Storage Buckets

Create these buckets in Supabase → Storage:

| Bucket | Public | Used For |
|--------|--------|---------|
| `product-images` | ✅ Yes | Product photos |
| `blog-images` | ✅ Yes | Blog cover images |
| `site-assets` | ✅ Yes | Logo, hero images, media library |

---

### 4. Create Admin User

After reset, sign up normally through the app. The first user to sign up is **automatically made ADMIN** (by the auth trigger in `auth_fix.sql`). All subsequent signups default to OPERATOR.

To manually set a role via Supabase Dashboard:
1. Authentication → Users → click user → Edit
2. Set **App Metadata**:
```json
{ "role": "ADMIN" }
```

Available roles: `ADMIN`, `MANAGER`, `EDITOR`, `QC`, `OPERATOR`

---

### 5. Vercel Deployment

Vercel → Project Settings → Environment Variables:
```
VITE_SUPABASE_URL      = https://...supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
```

---

## Validate Your Setup

Run the ERP audit script to check for missing tables/functions/security:
```bash
node scripts/erp-audit.mjs
```

---

## Security Checklist

- [ ] `.env` file not committed to git
- [ ] `svr-env.js` not committed to git
- [ ] `MASTER_DB_RESET.sql` run successfully (no errors)
- [ ] Storage buckets created
- [ ] Admin user created and role confirmed
- [ ] `node scripts/erp-audit.mjs` passes

---

## File Structure

```
supabase/
├── MASTER_DB_RESET.sql     ← Run this for fresh install (auto-generated)
├── schema.sql              ← CMS core tables
├── erp_architecture.sql    ← ERP target schemas
├── bos_schema.sql          ← BOS legacy tables
├── bos_recipe_schema.sql   ← Recipe engine
├── bos_dms_schema.sql      ← Document management
├── rnd_schema.sql          ← R&D Lab tables
├── erp_hardening.sql       ← Production RLS/RBAC/RPC hardening
├── erp_stabilization.sql   ← Reliability & concurrency safety
├── erp_finance.sql         ← Enterprise accounting & finance
├── gl_seed.sql             ← Chart of Accounts seed
├── auth_fix.sql            ← Auth trigger
└── seed_dummy.sql          ← Dev/test data (optional)

scripts/
├── build_master_sql.js     ← Regenerates MASTER_DB_RESET.sql
└── erp-audit.mjs           ← Validates project integrity

src/app/
├── components/             ← Shared UI components
├── hooks/                  ← React hooks (useAuth, useProducts, etc.)
├── lib/supabase.ts         ← Supabase client + all API functions
├── modules/                ← Feature modules (admin, inventory, production…)
├── pages/                  ← Public pages
└── App.tsx                 ← Routes + ProtectedRoute guard
```
