import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const requiredFiles = [
  'supabase/erp_architecture.sql',
  'supabase/erp_hardening.sql',
  'supabase/erp_stabilization.sql',
  'supabase/erp_finance.sql',
];

const findings = [];

function file(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) findings.push(message);
}

for (const path of requiredFiles) {
  try {
    statSync(join(root, path));
  } catch {
    findings.push(`Missing required deliverable: ${path}`);
  }
}

const hardening = file('supabase/erp_hardening.sql');
assert(hardening.includes('force row level security'), 'RLS force mode is not enabled.');
assert(hardening.includes('recipe.activate_version'), 'Recipe workflow RPC missing.');
assert(hardening.includes('fin.confirm_dispatch'), 'Dispatch workflow RPC missing.');
assert(hardening.includes('journal_balance_after_change'), 'Double-entry balance trigger missing.');
assert(hardening.includes('log.claim_outbox_events'), 'Outbox claim/retry RPC missing.');
assert(hardening.includes('dms.approve_document'), 'DMS approval RPC missing.');
assert(!/create policy if not exists/i.test(hardening), 'Non-portable CREATE POLICY IF NOT EXISTS found.');

const stabilization = file('supabase/erp_stabilization.sql');
assert(stabilization.includes('erp_assert_workflow_rpc'), 'Direct workflow mutation guard missing.');
assert(stabilization.includes('log.dead_letter_events'), 'Dead-letter event table missing.');
assert(stabilization.includes('idempotency_key'), 'Outbox idempotency key missing.');
assert(stabilization.includes('inv.allocate_fefo'), 'FEFO allocator missing.');
assert(stabilization.includes('ux_invoice_one_per_dispatch'), 'Double-dispatch invoice uniqueness missing.');
assert(stabilization.includes('v_stock_reconciliation'), 'Inventory reconciliation view missing.');
assert(stabilization.includes('v_invoice_reconciliation'), 'Invoice reconciliation view missing.');
assert(!/create policy if not exists/i.test(stabilization), 'Non-portable CREATE POLICY IF NOT EXISTS found in stabilization.');

const finance = file('supabase/erp_finance.sql');
assert(finance.includes('fin.fiscal_years'), 'Fiscal year table missing.');
assert(finance.includes('fin.post_journal'), 'Journal posting engine missing.');
assert(finance.includes('fin.reverse_journal'), 'Journal reversal engine missing.');
assert(finance.includes('fin.hsn_tax_codes'), 'GST/HSN tax engine missing.');
assert(finance.includes('fin.lot_valuations'), 'Lot valuation tracking missing.');
assert(finance.includes('fin.batch_costs'), 'Production batch costing missing.');
assert(finance.includes('fin.post_dispatch_invoice'), 'Dispatch invoice posting engine missing.');
assert(finance.includes('fin.mv_ar_aging'), 'AR aging report missing.');
assert(finance.includes('fin.v_ap_aging'), 'AP aging report missing.');
assert(finance.includes('fin.v_trial_balance'), 'Trial balance report missing.');
assert(finance.includes('fin.v_gst_report'), 'GST report missing.');
assert(finance.includes('fin.close_fiscal_period'), 'Fiscal period close RPC missing.');
assert(finance.includes('fin.assert_financial_rpc'), 'Direct financial mutation guard missing.');
assert(finance.includes('fin.credit_debit_notes'), 'Credit/debit note registry missing.');
assert(finance.includes('fin.bank_reconciliations'), 'Bank reconciliation table missing.');
assert(!/create policy if not exists/i.test(finance), 'Non-portable CREATE POLICY IF NOT EXISTS found in finance.');

const frontendFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name)) frontendFiles.push(path);
  }
}
walk(join(root, 'src'));

for (const path of frontendFiles) {
  const text = readFileSync(path, 'utf8');
  const rel = relative(root, path);
  if (text.includes('user_metadata?.role') && !text.includes('!import.meta.env.PROD')) {
    findings.push(`Production role fallback found in ${rel}`);
  }
}

// ── vercel.json checks ──────────────────────────────────────────────────────
const vercelJson = JSON.parse(file('vercel.json'));
const allHeaders = vercelJson.headers?.flatMap(h => h.headers ?? []) ?? [];
const headerKeys = allHeaders.map(h => h.key);

assert(headerKeys.includes('Content-Security-Policy'), 'vercel.json is missing Content-Security-Policy header.');
assert(headerKeys.includes('X-Frame-Options'), 'vercel.json is missing X-Frame-Options header.');
assert(headerKeys.includes('Strict-Transport-Security'), 'vercel.json is missing Strict-Transport-Security (HSTS) header.');
assert(headerKeys.includes('X-Content-Type-Options'), 'vercel.json is missing X-Content-Type-Options header.');

const cspHeader = allHeaders.find(h => h.key === 'Content-Security-Policy');
if (cspHeader) {
  assert(cspHeader.value.includes("default-src"), 'CSP is missing default-src directive.');
  assert(cspHeader.value.includes("frame-ancestors"), 'CSP is missing frame-ancestors directive (prefer over X-Frame-Options).');
}

// ── vite-env.d.ts checks ───────────────────────────────────────────────────
const viteEnv = file('src/vite-env.d.ts');
assert(viteEnv.includes('VITE_SENTRY_DSN'), 'VITE_SENTRY_DSN missing from vite-env.d.ts ImportMetaEnv.');
assert(viteEnv.includes('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL missing from vite-env.d.ts ImportMetaEnv.');
assert(viteEnv.includes('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY missing from vite-env.d.ts ImportMetaEnv.');

// ── .env.example checks ────────────────────────────────────────────────────
const envExample = file('.env.example');
assert(envExample.includes('VITE_SENTRY_DSN'), 'VITE_SENTRY_DSN missing from .env.example.');
assert(envExample.includes('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL missing from .env.example.');
assert(envExample.includes('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY missing from .env.example.');

if (findings.length > 0) {
  console.error('ERP audit failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('ERP audit passed.');
