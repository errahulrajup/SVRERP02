#!/usr/bin/env ts-node
// =============================================================================
// test-rls-roles.ts — Automated RLS policy test script
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_KEY=<service-role-key> \
//   OPERATOR_EMAIL=operator@example.com  OPERATOR_PASSWORD=secret \
//   MANAGER_EMAIL=manager@example.com    MANAGER_PASSWORD=secret \
//   QC_EMAIL=qc@example.com              QC_PASSWORD=secret \
//   npx ts-node scripts/test-rls-roles.ts
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config – read from environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';

// Credentials for three role personas
const OPERATOR_EMAIL    = process.env.OPERATOR_EMAIL    ?? 'operator@test.local';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD ?? 'operator-password';
const MANAGER_EMAIL     = process.env.MANAGER_EMAIL     ?? 'manager@test.local';
const MANAGER_PASSWORD  = process.env.MANAGER_PASSWORD  ?? 'manager-password';
const QC_EMAIL          = process.env.QC_EMAIL          ?? 'qc@test.local';
const QC_PASSWORD       = process.env.QC_PASSWORD       ?? 'qc-password';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ERROR] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tables under test
// ---------------------------------------------------------------------------
const TABLES = [
  'lots',
  'batches',
  'grns',
  'fg_lots',
  'stock_ledger',
  'ccp_logs',
  'prp_logs',
] as const;

type TableName = (typeof TABLES)[number];

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------
interface Result {
  table: string;
  role: string;
  operation: string;
  expected: 'PASS' | 'FAIL';
  actual: 'PASS' | 'FAIL';
  ok: boolean;
  detail?: string;
}

const results: Result[] = [];
let totalPass = 0;
let totalFail = 0;

// ---------------------------------------------------------------------------
// Helper: print & record a result
// ---------------------------------------------------------------------------
function record(
  table: string,
  role: string,
  operation: string,
  expected: 'PASS' | 'FAIL',
  actual: 'PASS' | 'FAIL',
  detail?: string,
) {
  const ok = expected === actual;
  results.push({ table, role, operation, expected, actual, ok, detail });

  const icon = ok ? '✅' : '❌';
  const status = ok ? 'PASS' : 'FAIL';
  const roleLabel = role.padEnd(8);
  const opLabel = operation.padEnd(6);
  const tableLabel = table.padEnd(14);
  console.log(
    `  ${icon} [${status}]  table=${tableLabel} role=${roleLabel} op=${opLabel}` +
      (detail ? `  (${detail})` : ''),
  );

  if (ok) totalPass++;
  else totalFail++;
}

// ---------------------------------------------------------------------------
// Helper: create a Supabase client signed in as a given user
// ---------------------------------------------------------------------------
async function makeUserClient(email: string, password: string): Promise<SupabaseClient | null> {
  // Use anon key pattern — sign in with email/password returns a session
  // We create a fresh client and sign in.
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sign in via admin to get a token, then create a regular client
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.warn(`  [WARN] Could not sign in as ${email}: ${error?.message ?? 'no session'}`);
    return null;
  }

  // Create a client that uses the user's JWT
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  return userClient;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
async function testSelect(
  client: SupabaseClient,
  table: TableName,
  role: string,
  expectSuccess: boolean,
) {
  const { error } = await client.from(table).select('id').limit(1);
  const actual = !error ? 'PASS' : 'FAIL';
  const expected = expectSuccess ? 'PASS' : 'FAIL';
  record(table, role, 'SELECT', expected, actual, error?.message);
}

async function testInsert(
  client: SupabaseClient,
  table: TableName,
  role: string,
  expectSuccess: boolean,
  payload: Record<string, unknown>,
) {
  const { error } = await client.from(table).insert(payload);
  // RLS violation → error; unique constraint etc also → error, but we check for RLS specifically
  const rlsBlocked = error?.code === '42501' || error?.message?.includes('policy');
  const actual = expectSuccess ? (rlsBlocked ? 'FAIL' : 'PASS') : (rlsBlocked ? 'PASS' : 'FAIL');
  const expected = expectSuccess ? 'PASS' : 'FAIL';
  record(table, role, 'INSERT', expected, actual, error?.message);
}

async function testDelete(
  client: SupabaseClient,
  table: TableName,
  role: string,
  expectSuccess: boolean,
) {
  // Attempt to delete a non-existent row; RLS is checked before row existence
  const { error } = await client.from(table).delete().eq('id', '00000000-0000-0000-0000-000000000000');
  const rlsBlocked = error?.code === '42501' || error?.message?.includes('policy');
  // If no RLS error → allowed (even if 0 rows deleted)
  const actual = expectSuccess ? (rlsBlocked ? 'FAIL' : 'PASS') : (rlsBlocked ? 'PASS' : 'FAIL');
  const expected = expectSuccess ? 'PASS' : 'FAIL';
  record(table, role, 'DELETE', expected, actual, error?.message);
}

// ---------------------------------------------------------------------------
// Minimal dummy payloads so INSERT doesn't fail on NOT NULL constraints before
// even reaching RLS. Adjust as needed for your schema.
// ---------------------------------------------------------------------------
function dummyPayload(table: TableName): Record<string, unknown> {
  const base = { id: '00000000-0000-0000-0000-000000000001' };
  switch (table) {
    case 'lots':          return { ...base, lot_number: '__test__' };
    case 'batches':       return { ...base, batch_number: '__test__' };
    case 'grns':          return { ...base, grn_number: '__test__' };
    case 'fg_lots':       return { ...base, fg_lot_number: '__test__' };
    case 'stock_ledger':  return { ...base, entry_type: '__test__' };
    case 'ccp_logs':      return { ...base, ccp_code: '__test__' };
    case 'prp_logs':      return { ...base, prp_code: '__test__' };
    default:              return base;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SVRERP02 — RLS Role Test Suite');
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Sign in as each role ──────────────────────────────────────────────────
  console.log('🔑 Signing in…');
  const [operatorClient, managerClient, qcClient] = await Promise.all([
    makeUserClient(OPERATOR_EMAIL, OPERATOR_PASSWORD),
    makeUserClient(MANAGER_EMAIL, MANAGER_PASSWORD),
    makeUserClient(QC_EMAIL, QC_PASSWORD),
  ]);

  if (!operatorClient || !managerClient || !qcClient) {
    console.error('\n[ERROR] One or more sign-ins failed. Aborting.');
    process.exit(1);
  }
  console.log('  Signed in as OPERATOR, MANAGER, QC\n');

  // ── Run tests per table ───────────────────────────────────────────────────
  for (const table of TABLES) {
    console.log(`\n📋 Table: ${table}`);
    const payload = dummyPayload(table);

    // OPERATOR: SELECT ✓  INSERT ✓  DELETE ✗
    await testSelect(operatorClient, table, 'OPERATOR', true);
    await testInsert(operatorClient, table, 'OPERATOR', true, payload);
    await testDelete(operatorClient, table, 'OPERATOR', false);

    // MANAGER: SELECT ✓  INSERT ✓  DELETE ✓
    await testSelect(managerClient, table, 'MANAGER', true);
    await testInsert(managerClient, table, 'MANAGER', true, payload);
    await testDelete(managerClient, table, 'MANAGER', true);

    // QC: SELECT ✓  INSERT ✗  DELETE ✗
    await testSelect(qcClient, table, 'QC', true);
    await testInsert(qcClient, table, 'QC', false, payload);
    await testDelete(qcClient, table, 'QC', false);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  SUMMARY   ✅ PASS: ${totalPass}   ❌ FAIL: ${totalFail}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (totalFail > 0) {
    console.log('Failed checks:');
    results
      .filter((r) => !r.ok)
      .forEach((r) => {
        console.log(
          `  ❌ ${r.table} | ${r.role} | ${r.operation} — expected ${r.expected}, got ${r.actual}` +
            (r.detail ? ` (${r.detail})` : ''),
        );
      });
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
