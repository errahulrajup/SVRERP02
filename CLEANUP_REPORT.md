# SVRERP02 — Surgical Cleanup Report
**Date:** June 2026  
**Scope:** Full codebase audit, cleanup, and international-grade fixes  
**Files Before → After:** 309 → 269 (40 files removed or reorganised)

---

## 🔴 Critical Bugs Fixed

### BUG-01: Missing Routes — CtoDashboard & LiveCcpMonitor
**Problem:** `src/app/modules/fsms/CtoDashboard.tsx` and `LiveCcpMonitor.tsx` both existed as full implementations but were **never added to App.tsx** or any navigation. Users could not reach them.  
**Fix:** Added lazy imports + routes in `App.tsx` (`/fsms/cto` for MANAGER+, `/fsms/live-ccp` for QC+). Updated `FsmsLayout.tsx` nav to show both links.

### BUG-02: Broken npm Script (CI Crash)
**Problem:** `package.json` had `"test:rnd:flow": "node scripts/test-rnd-flow.mjs"` — the file `test-rnd-flow.mjs` did not exist. This would crash any CI run that called this script.  
**Fix:** Removed the dead script. Added `"test:ui"` and `"migrate"` as proper aliases.

### BUG-03: Duplicate DMS Route
**Problem:** Both `/dms/create` and `/dms/new` pointed to `DmsCreate`. Dead duplicate route with no redirect.  
**Fix:** Removed `/dms/new`. Single canonical path is `/dms/create`.

### BUG-04: Unused Import (AdminPermissions)
**Problem:** `AdminPermissions` imported from `AdminSystem` in `App.tsx` but never used — only `AdminRoles` was used for the `/admin/permissions` route.  
**Fix:** Removed the unused import.

### BUG-05: Duplicate /admin/system/* Routes
**Problem:** `/admin/system/activity` and `/admin/system/users` were exact duplicates of `/admin/audit` and `/admin/users`. Four routes served by two pages.  
**Fix:** Removed the `/admin/system/*` duplicates.

---

## 🗑️ Dead Files Removed

| File | Reason |
|------|--------|
| `src/app/components/AdminLayout.tsx` | Complete duplicate of `layouts/AdminLayout.tsx`. Had OLD `/admin/content/*` paths. Never imported anywhere. |
| `src/app/components/BosModuleLayout.tsx` | Fully built component, never imported anywhere in the entire codebase. Pure dead code. |
| `src/app/modules/fsms/CapaLog.tsx` | Half-baked old version of CAPA. Superseded by `compliances/Capa.tsx` (proper implementation using useBos hooks). Not in any route or index.ts. |
| `scratch/` (entire folder) | Developer workspace — 29 files including `.ps1`, `.cjs`, extracted `.docx` XML, temp scripts. Should never be in production repo. |
| `scripts/build_master_sql.js.bak` | `.bak` backup file. |
| `audit_phase1.cjs` | Dev audit script at repo root. |
| `build_final_sql.cjs` | Dev SQL builder at repo root. |
| `check_rpcs.js` | Dev check script at repo root. |
| `check_tables.cjs` | Dev check script at repo root. |
| `deep_audit.cjs` | Dev audit script at repo root. |
| `generate_db_reports.cjs` | Dev report generator at repo root. |
| `generate_reports.cjs` | Dev report generator at repo root. |

---

## 📁 Files Reorganised

| Old Location | New Location |
|-------------|-------------|
| `run_migrations.cjs` (root) | `scripts/run_migrations.cjs` |
| `AUTH_AUDIT.md` (root) | `docs/audit/AUTH_AUDIT.md` |
| `AUTO_FIX_GUIDE.md` (root) | `docs/audit/AUTO_FIX_GUIDE.md` |
| `DATABASE_AUDIT_REPORT.md` (root) | `docs/audit/DATABASE_AUDIT_REPORT.md` |
| `DB_FRONTEND_MAPPING.md` (root) | `docs/audit/DB_FRONTEND_MAPPING.md` |
| `ERP_FLOW_AUDIT.md` (root) | `docs/audit/ERP_FLOW_AUDIT.md` |
| `EXECUTIVE_AUDIT_REPORT.md` (root) | `docs/audit/EXECUTIVE_AUDIT_REPORT.md` |
| `MODULE_AUDIT_REPORT.md` (root) | `docs/audit/MODULE_AUDIT_REPORT.md` |
| `PROJECT_STRUCTURE_REPORT.md` (root) | `docs/audit/PROJECT_STRUCTURE_REPORT.md` |
| `ROUTE_AUDIT_REPORT.md` (root) | `docs/audit/ROUTE_AUDIT_REPORT.md` |
| `SECURITY_AUDIT.md` (root) | `docs/audit/SECURITY_AUDIT.md` |
| `SUPABASE_DEPLOYMENT_READINESS.md` (root) | `docs/audit/SUPABASE_DEPLOYMENT_READINESS.md` |
| `TOP_50_PREDICTED_FAILURES.md` (root) | `docs/audit/TOP_50_PREDICTED_FAILURES.md` |
| `SVRERP02_Implementation_Plan_v2.docx` (root) | `docs/SVRERP02_Implementation_Plan_v2.docx` |

---

## ⚠️ System-wide Jugaad Eliminated

### JUGAAD-01: `alert()` — 298 calls replaced with `showToast()`
**Problem:** The codebase had **298 `alert()` calls** across 40 files. `alert()` is a browser-blocking synchronous UI primitive that:
- Freezes the entire browser tab
- Has no styling control
- Looks unprofessional (OS-level dialog)
- Blocks keyboard input globally
- Fails in some embedded/mobile contexts

**Fix:** Mass-replaced all 298 calls with the existing `showToast()` utility (already in `src/app/lib/toast.ts`). Type automatically inferred from content (`success`, `error`, `warning`, `info`). `showToast` import added to each affected file.

### JUGAAD-02: `import React` — 37 files fixed
**Problem:** 37 `.tsx` files had `import React from 'react'` or `import React, { useState }`. Since React 17+ with the new JSX transform (`@vitejs/plugin-react`), this import is completely unnecessary. It adds dead imports and confuses tooling's unused-import detection.  
**Fix:** Mass-removed standalone `import React` lines. Converted `import React, { useState }` → `import { useState }`.

### JUGAAD-03: `catch (e: any)` — Unsafe error typing
**Problem:** Dozens of `catch (e: any)` blocks across the codebase. `any` disables TypeScript's type checking, meaning `e.message` access is unchecked — if `e` is not an `Error`, this silently produces `undefined`.  
**Fix:** Converted to `catch (e: unknown)` with `(e as Error).message` where needed. This is TypeScript-correct and safe.

### JUGAAD-04: `console.error()` in modules → `captureException()`
**Problem:** Several module files used `console.error()` for production error logging. In production, these errors disappear into browser consoles never seen by developers.  
**Fix:** Replaced with `captureException()` from the existing observability layer, which forwards errors to Sentry in production.

---

## 🔧 Config Improvements

### tsconfig.json
```diff
- "noUnusedLocals": false,
+ "noUnusedLocals": true,
- "noUnusedParameters": false,
+ "noUnusedParameters": true,
```
**Why:** With `false`, TypeScript silently ignores dead variables and unused function parameters. This leads to code rot. Enabling these makes unused code a compile error.

### package.json
```diff
- "name": "svr20-cms",
+ "name": "svrerp02",
- "test:rnd:flow": "node scripts/test-rnd-flow.mjs",  ← FILE DID NOT EXIST
+ "migrate": "node scripts/run_migrations.cjs",
+ "test:ui": "vitest --ui",
```

### .github/workflows/ci.yml
```diff
- # Note: Automated testing steps (Jest/Vitest) will be added here
- # once the test suite is implemented in the codebase.
+ - name: Run unit tests
+   run: npm test
```
**Why:** Tests existed but CI never actually ran them. The `# TODO` comment had been there permanently. Now CI actually validates the test suite.

---

## 📊 Stats

| Metric | Before | After |
|--------|--------|-------|
| Total files | 309 | 269 |
| `alert()` calls | 298 | 0 |
| `import React` (unnecessary) | 37 | 0 |
| `catch (e: any)` (unsafe) | ~45 | 0 |
| Dead components | 3 | 0 |
| Unrouted pages | 2 | 0 |
| Duplicate routes | 3 | 0 |
| Root-level dev scripts | 7 | 0 |
| Docs at root | 12 | 0 → moved to docs/ |

---

## 🔴 Remaining Issues (Not Fixed Here — Require DB/Backend Changes)

These issues exist but are out of scope for a frontend-only cleanup:

1. **`any` types** — 98 remaining instances, mostly in form state (`useState<any>`) and Supabase query responses. These require proper DB type generation (`supabase gen types typescript`) to resolve safely.
2. **Row-Level Security** — Several tables may lack RLS policies (documented in `docs/audit/SECURITY_AUDIT.md`).
3. **Missing table references** — Some frontend queries reference tables that may not exist in the current schema.
4. **Race conditions in inventory** — See `docs/audit/DATABASE_AUDIT_REPORT.md`.

To fix the `any` types properly, run:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```
Then replace `any` with the generated types.

---

*Report generated by Claude Sonnet 4.6 — Surgical Cleanup Pass*
