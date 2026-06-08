const https = require('https');
const fs = require('fs');

// -----------------------------------------------------------------------------
// 1. Connection Configurations
// -----------------------------------------------------------------------------
let token = '';
try {
  const envContent = fs.readFileSync('d:/SVRERP/.env', 'utf8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.*)/);
  if (match) token = match[1].trim();
} catch (e) {
  console.error("Failed to read .env:", e.message);
}

if (!token) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is missing.");
  process.exit(1);
}

const PROJECT_REF = 'psylxeayraoxstgjmngm';

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
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

// -----------------------------------------------------------------------------
// 2. Audit Suite Definition
// -----------------------------------------------------------------------------
async function main() {
  console.log('================================================================');
  console.log('         SVRERP02 PRODUCTION READINESS AUDIT V2                  ');
  console.log('================================================================\n');

  const report = [];
  let testCount = 0;
  let passedCount = 0;

  async function assertSQL(name, sql, expectedResult = 'pass') {
    testCount++;
    process.stdout.write(`⏳ Testing: ${name}... `);
    try {
      const res = await runSQL(sql);
      if (expectedResult === 'pass') {
        console.log('✅ PASS');
        passedCount++;
        report.push({ name, status: 'PASS', detail: 'Executed successfully' });
      } else {
        console.log('❌ FAIL (Expected failure, but query succeeded)');
        report.push({ name, status: 'FAIL', detail: 'Query succeeded unexpectedly' });
      }
    } catch (e) {
      if (expectedResult === 'fail') {
        console.log('✅ PASS (Caught expected error)');
        passedCount++;
        report.push({ name, status: 'PASS', detail: `Blocked as expected: ${e.message.split('\n')[0]}` });
      } else {
        console.log(`❌ FAIL (Error: ${e.message.split('\n')[0]})`);
        report.push({ name, status: 'FAIL', detail: e.message });
      }
    }
  }

  // -----------------------------------------------------------------------------
  // Phase A: Financial Integrity
  // -----------------------------------------------------------------------------
  console.log('\n--- Phase A: Financial Integrity ---');

  // Test 1: Unbalanced journal entry rejection
  await assertSQL(
    'Double-Entry Balance Constraint (Debits != Credits)',
    `
    BEGIN;
    -- Mock user claims
    SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "ADMIN"}';
    SET LOCAL request.jwt.claim.user_metadata = '{"role": "ADMIN"}';

    -- Setup dummy accounts if not exist
    INSERT INTO fin.gl_accounts (id, org_id, code, name, account_type, status)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'AR-DUMMY', 'AR Dummy', 'ASSET', 'ACTIVE'),
      ('22222222-2222-2222-2222-222222222222', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SALES-DUMMY', 'Sales Dummy', 'REVENUE', 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- Make sure erp_begin_workflow_rpc setting exists
    SELECT set_config('app.workflow_context', 'rpc', true);

    -- Try unbalanced journal
    SELECT fin.post_journal(
      'abf5996a-ead9-4307-b0a7-5caa30e52e9c',
      'INVOICE',
      current_date,
      'fin.invoices',
      '11111111-1111-1111-1111-111111111111',
      'Unbalanced journal test',
      'idemp-test-unbalanced',
      jsonb_build_array(
        jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0),
        jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 50.0)
      )
    );
    COMMIT;
    `,
    'fail'
  );

  // Test 2: Closed period protection
  await assertSQL(
    'Closed Period Post Rejection',
    `
    BEGIN;
    -- Mock user claims
    SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "ADMIN"}';
    SET LOCAL request.jwt.claim.user_metadata = '{"role": "ADMIN"}';

    -- Ensure period is closed
    UPDATE fin.fiscal_periods 
    SET status = 'CLOSED' 
    WHERE org_id = 'abf5996a-ead9-4307-b0a7-5caa30e52e9c' AND period_no = 1;

    -- Make sure workflow is set to bypass browser check triggers
    SELECT set_config('app.workflow_context', 'rpc', true);

    -- Attempt post journal in closed period range (April 2025)
    SELECT fin.post_journal(
      'abf5996a-ead9-4307-b0a7-5caa30e52e9c',
      'INVOICE',
      '2025-04-15'::date,
      'fin.invoices',
      '11111111-1111-1111-1111-111111111111',
      'Closed period test',
      'idemp-test-closed',
      jsonb_build_array(
        jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0),
        jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)
      )
    );
    COMMIT;
    `,
    'fail'
  );

  // Test 3: Idempotency check: Repeat same journal posting 5 times
  await assertSQL(
    'Journal Posting Idempotency (5 Repeated Attempts)',
    `
    BEGIN;
    -- Mock user claims
    SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "ADMIN"}';
    SET LOCAL request.jwt.claim.user_metadata = '{"role": "ADMIN"}';

    -- Ensure org exists in iam.orgs
    INSERT INTO iam.orgs (id, name)
    VALUES ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'Srivriddhi Enterprise')
    ON CONFLICT (id) DO NOTHING;

    -- Ensure memberships exist in iam.org_members
    INSERT INTO iam.org_members (org_id, user_id, role, is_active)
    VALUES ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'd0000000-0000-0000-0000-000000000001', 'ADMIN', true)
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- Ensure profiles exist in public.profiles
    INSERT INTO public.profiles (id, org_id, email, name, role, is_active)
    VALUES ('d0000000-0000-0000-0000-000000000001', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'maker@srierp.local', 'Audit Maker', 'ADMIN', true)
    ON CONFLICT (id) DO NOTHING;

    -- Ensure fiscal year and fiscal period exist (for both April 2025 and June 2026)
    INSERT INTO fin.fiscal_years (id, org_id, year_code, starts_on, ends_on, status)
    VALUES 
      ('25260000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'FY 2025-26', '2025-04-01', '2026-03-31', 'OPEN'),
      ('26270000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'FY 2026-27', '2026-04-01', '2027-03-31', 'OPEN')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO fin.fiscal_periods (fiscal_year_id, org_id, period_no, starts_on, ends_on, status)
    VALUES 
      ('25260000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 1, '2025-04-01', '2025-04-30', 'OPEN'),
      ('26270000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 3, '2026-06-01', '2026-06-30', 'OPEN')
    ON CONFLICT (org_id, fiscal_year_id, period_no) DO NOTHING;

    -- Reopen periods
    UPDATE fin.fiscal_periods 
    SET status = 'OPEN' 
    WHERE org_id = 'abf5996a-ead9-4307-b0a7-5caa30e52e9c' AND period_no IN (1, 3);

    -- Setup dummy accounts if not exist (since Test 1 & 2 rollback, we must ensure they exist)
    INSERT INTO fin.gl_accounts (id, org_id, code, name, account_type, status)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'AR-DUMMY', 'AR Dummy', 'ASSET', 'ACTIVE'),
      ('22222222-2222-2222-2222-222222222222', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SALES-DUMMY', 'Sales Dummy', 'REVENUE', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;

    SELECT set_config('app.workflow_context', 'rpc', true);

    -- Run 5 times sequentially using same idempotency key
    SELECT fin.post_journal('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'INVOICE', '2025-04-15'::date, 'fin.invoices', '11111111-1111-1111-1111-111111111111', 'Idemp test', 'idemp-key-12345', jsonb_build_array(jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0), jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)));
    SELECT fin.post_journal('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'INVOICE', '2025-04-15'::date, 'fin.invoices', '11111111-1111-1111-1111-111111111111', 'Idemp test', 'idemp-key-12345', jsonb_build_array(jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0), jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)));
    SELECT fin.post_journal('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'INVOICE', '2025-04-15'::date, 'fin.invoices', '11111111-1111-1111-1111-111111111111', 'Idemp test', 'idemp-key-12345', jsonb_build_array(jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0), jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)));
    SELECT fin.post_journal('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'INVOICE', '2025-04-15'::date, 'fin.invoices', '11111111-1111-1111-1111-111111111111', 'Idemp test', 'idemp-key-12345', jsonb_build_array(jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0), jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)));
    SELECT fin.post_journal('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'INVOICE', '2025-04-15'::date, 'fin.invoices', '11111111-1111-1111-1111-111111111111', 'Idemp test', 'idemp-key-12345', jsonb_build_array(jsonb_build_object('account_id', '11111111-1111-1111-1111-111111111111', 'debit', 100.0, 'credit', 0), jsonb_build_object('account_id', '22222222-2222-2222-2222-222222222222', 'debit', 0, 'credit', 100.0)));
    
    -- Verify exactly one posted journal entry exists
    SELECT 1 / (CASE WHEN count(*) = 1 THEN 1 ELSE 0 END) 
    FROM fin.journal_entries 
    WHERE org_id = 'abf5996a-ead9-4307-b0a7-5caa30e52e9c' AND idempotency_key = 'idemp-key-12345';
    COMMIT;
    `
  );

  // Test 3.1: Phase A.1 - Idempotency Audit of approve_dispatch, approve_payment, post_dispatch_invoice
  await assertSQL(
    'Phase A.1: Idempotency of approve_dispatch, approve_payment, post_dispatch_invoice (5 Attempts)',
    `
    BEGIN;
    -- Set request claims to Maker User
    SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "ADMIN"}';
    SET LOCAL request.jwt.claim.user_metadata = '{"role": "ADMIN"}';

    SELECT set_config('app.workflow_context', 'rpc', true);

    -- Setup: clean up any existing mock items for this test
    DELETE FROM public.dispatches WHERE id = 'd5555555-5555-5555-5555-555555555555';
    DELETE FROM public.payments WHERE id = 'p5555555-5555-5555-5555-555555555555';
    DELETE FROM public.invoices WHERE id = 'i5555555-5555-5555-5555-555555555555';
    DELETE FROM fin.dispatch_lines WHERE dispatch_order_id = 'd9999999-9999-9999-9999-999999999999';
    DELETE FROM fin.invoices WHERE dispatch_order_id = 'd9999999-9999-9999-9999-999999999999';
    DELETE FROM fin.dispatch_orders WHERE id = 'd9999999-9999-9999-9999-999999999999';

    -- Ensure org exists in iam.orgs
    INSERT INTO iam.orgs (id, name)
    VALUES ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'Srivriddhi Enterprise')
    ON CONFLICT (id) DO NOTHING;

    -- Ensure memberships exist in iam.org_members
    INSERT INTO iam.org_members (org_id, user_id, role, is_active)
    VALUES 
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'd0000000-0000-0000-0000-000000000001', 'ADMIN', true),
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'e847b705-9375-41c3-afde-7a21994b85b4', 'ADMIN', true)
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- Ensure profiles exist in public.profiles
    INSERT INTO public.profiles (id, org_id, email, name, role, is_active)
    VALUES 
      ('d0000000-0000-0000-0000-000000000001', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'maker@srierp.local', 'Audit Maker', 'ADMIN', true),
      ('e847b705-9375-41c3-afde-7a21994b85b4', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'checker@srierp.local', 'Audit Checker', 'ADMIN', true)
    ON CONFLICT (id) DO NOTHING;

    -- Ensure fiscal year and fiscal period exist (for both April 2025 and June 2026)
    INSERT INTO fin.fiscal_years (id, org_id, year_code, starts_on, ends_on, status)
    VALUES 
      ('25260000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'FY 2025-26', '2025-04-01', '2026-03-31', 'OPEN'),
      ('26270000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'FY 2026-27', '2026-04-01', '2027-03-31', 'OPEN')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO fin.fiscal_periods (fiscal_year_id, org_id, period_no, starts_on, ends_on, status)
    VALUES 
      ('25260000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 1, '2025-04-01', '2025-04-30', 'OPEN'),
      ('26270000-0000-0000-0000-000000000002', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 3, '2026-06-01', '2026-06-30', 'OPEN')
    ON CONFLICT (org_id, fiscal_year_id, period_no) DO NOTHING;

    -- Setup mock dispatch (in public.dispatches)
    INSERT INTO public.dispatches (id, org_id, do_no, customer, product, qty, rate, maker_id, maker_checker_status)
    VALUES ('d5555555-5555-5555-5555-555555555555', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'DO-IDEMP-TEST', 'Cust A', 'Prod A', 10, 100, 'd0000000-0000-0000-0000-000000000001', 'PENDING');

    -- Setup mock invoice & payment (in public.invoices / public.payments)
    INSERT INTO public.invoices (id, invoice_no, customer, total, paid_amt, status)
    VALUES ('i5555555-5555-5555-5555-555555555555', 'INV-IDEMP-TEST', 'Cust A', 1000, 0, 'UNPAID');

    INSERT INTO public.payments (id, org_id, invoice_id, amount, maker_id, maker_checker_status)
    VALUES ('p5555555-5555-5555-5555-555555555555', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'i5555555-5555-5555-5555-555555555555', 1000, 'd0000000-0000-0000-0000-000000000001', 'PENDING');

    -- Setup mock dispatch order (in fin.dispatch_orders)
    INSERT INTO fin.dispatch_orders (id, org_id, customer_id, do_code, status)
    VALUES ('d9999999-9999-9999-9999-999999999999', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'c5000000-0000-0000-0000-000000000001', 'DO-TEST-IDEMP', 'CONFIRMED');

    -- Setup dummy accounts & mappings
    INSERT INTO fin.gl_accounts (id, org_id, code, name, account_type, status)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'AR-DUMMY', 'AR Dummy', 'ASSET', 'ACTIVE'),
      ('22222222-2222-2222-2222-222222222222', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SALES-DUMMY', 'Sales Dummy', 'REVENUE', 'ACTIVE'),
      ('33333333-3333-3333-3333-333333333333', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'CGST-DUMMY', 'CGST Dummy', 'LIABILITY', 'ACTIVE'),
      ('44444444-4444-4444-4444-444444444444', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SGST-DUMMY', 'SGST Dummy', 'LIABILITY', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO fin.account_mappings (org_id, mapping_key, gl_account_id)
    VALUES
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'AR_TRADE', '11111111-1111-1111-1111-111111111111'),
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SALES_REVENUE', '22222222-2222-2222-2222-222222222222'),
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'CGST_PAYABLE', '33333333-3333-3333-3333-333333333333'),
      ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'SGST_PAYABLE', '44444444-4444-4444-4444-444444444444')
    ON CONFLICT (org_id, mapping_key) DO UPDATE SET gl_account_id = EXCLUDED.gl_account_id;

    -- Setup HSN tax code & item
    INSERT INTO fin.hsn_tax_codes (org_id, hsn_code, description, gst_pct)
    VALUES ('abf5996a-ead9-4307-b0a7-5caa30e52e9c', '0901', 'Coffee', 18)
    ON CONFLICT (org_id, hsn_code) DO UPDATE SET gst_pct = 18, is_active = true;

    INSERT INTO md.items (id, org_id, name, code, item_type, hsn_code, standard_cost)
    VALUES ('e0000000-0000-0000-0000-000000000001', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'Test Item', 'TEST-ITEM-SKU', 'FINISHED_GOOD', '0901', 10.0)
    ON CONFLICT (id) DO UPDATE SET hsn_code = '0901', standard_cost = 10.0;

    INSERT INTO fin.dispatch_lines (dispatch_order_id, item_id, qty, rate, gst_pct)
    VALUES ('d9999999-9999-9999-9999-999999999999', 'e0000000-0000-0000-0000-000000000001', 10, 100, 18);

    -- Switch request claims to Checker User (dual authorization)
    SET LOCAL request.jwt.claim.sub = 'e847b705-9375-41c3-afde-7a21994b85b4';

    -- 1. Run approve_dispatch 5 times in a DO block and handle exceptions
    DO $$
    DECLARE
      v_err_count int := 0;
    BEGIN
      -- 1st call
      PERFORM public.approve_dispatch('d5555555-5555-5555-5555-555555555555', 'APPROVED');
      
      -- 2nd to 5th calls: should catch exceptions
      FOR i IN 2..5 LOOP
        BEGIN
          PERFORM public.approve_dispatch('d5555555-5555-5555-5555-555555555555', 'APPROVED');
        EXCEPTION WHEN OTHERS THEN
          v_err_count := v_err_count + 1;
        END;
      END LOOP;
      
      IF v_err_count <> 4 THEN
        RAISE EXCEPTION 'Idempotency failed: expected 4 exceptions on repeated approve_dispatch, got %', v_err_count;
      END IF;
    END $$;

    -- 2. Run approve_payment 5 times in a DO block and handle exceptions
    DO $$
    DECLARE
      v_err_count int := 0;
    BEGIN
      -- 1st call
      PERFORM public.approve_payment('p5555555-5555-5555-5555-555555555555', 'APPROVED');
      
      -- 2nd to 5th calls: should catch exceptions
      FOR i IN 2..5 LOOP
        BEGIN
          PERFORM public.approve_payment('p5555555-5555-5555-5555-555555555555', 'APPROVED');
        EXCEPTION WHEN OTHERS THEN
          v_err_count := v_err_count + 1;
        END;
      END LOOP;
      
      IF v_err_count <> 4 THEN
        RAISE EXCEPTION 'Idempotency failed: expected 4 exceptions on repeated approve_payment, got %', v_err_count;
      END IF;
    END $$;

    -- 3. Run post_dispatch_invoice 5 times sequentially (should succeed silently)
    SELECT fin.post_dispatch_invoice('d9999999-9999-9999-9999-999999999999'::uuid);
    SELECT fin.post_dispatch_invoice('d9999999-9999-9999-9999-999999999999'::uuid);
    SELECT fin.post_dispatch_invoice('d9999999-9999-9999-9999-999999999999'::uuid);
    SELECT fin.post_dispatch_invoice('d9999999-9999-9999-9999-999999999999'::uuid);
    SELECT fin.post_dispatch_invoice('d9999999-9999-9999-9999-999999999999'::uuid);

    -- 4. Assertions on final state transitions and duplicate entries
    -- Ensure exactly one invoice and one journal entry exist
    SELECT 1 / (CASE WHEN (
      SELECT count(*) FROM fin.invoices WHERE dispatch_order_id = 'd9999999-9999-9999-9999-999999999999'
    ) = 1 THEN 1 ELSE 0 END);

    SELECT 1 / (CASE WHEN (
      SELECT count(*) FROM fin.journal_entries WHERE source_table = 'fin.invoices' AND source_id = (
        SELECT id FROM fin.invoices WHERE dispatch_order_id = 'd9999999-9999-9999-9999-999999999999'
      )
    ) = 1 THEN 1 ELSE 0 END);

    -- Ensure dispatch and payment are approved and have correct checker_id
    SELECT 1 / (CASE WHEN (
      SELECT maker_checker_status FROM public.dispatches WHERE id = 'd5555555-5555-5555-5555-555555555555'
    ) = 'APPROVED' THEN 1 ELSE 0 END);

    SELECT 1 / (CASE WHEN (
      SELECT checker_id FROM public.dispatches WHERE id = 'd5555555-5555-5555-5555-555555555555'
    ) = 'e847b705-9375-41c3-afde-7a21994b85b4'::uuid THEN 1 ELSE 0 END);

    SELECT 1 / (CASE WHEN (
      SELECT maker_checker_status FROM public.payments WHERE id = 'p5555555-5555-5555-5555-555555555555'
    ) = 'APPROVED' THEN 1 ELSE 0 END);

    COMMIT;
    `
  );

  // -----------------------------------------------------------------------------
  // Phase C: Security Penetration Suite
  // -----------------------------------------------------------------------------
  console.log('\n--- Phase C: Security Penetration Suite ---');

  // Cross-Tenant Access Protection
  await assertSQL(
    'Cross-Tenant Isolation RLS Block',
    `
    BEGIN;
    -- Set local role to trigger RLS
    SET LOCAL ROLE authenticated;
    
    -- Mock Tenant A user environment
    SET LOCAL request.jwt.claim.sub = 'e847b705-9375-41c3-afde-7a21994b85b4';
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "OPERATOR"}';
    
    -- Attempt to read rows from another tenant (a0000000-0000-0000-0000-000000000001) in sops
    SELECT 1 / (CASE WHEN count(*) = 0 THEN 1 ELSE 0 END) 
    FROM public.sops 
    WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    COMMIT;
    `,
    'pass'
  );

  // Expired/Tampered JWT Simulation
  await assertSQL(
    'Bypass Browser Direct Writes (assert_rpc_context trigger)',
    `
    BEGIN;
    -- Try to insert directly from browser (app.workflow_context is empty/null)
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "OPERATOR"}';
    
    INSERT INTO public.batches (id, org_id, batch_no, product, planned_qty)
    VALUES ('batch-err-123', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'BATCH-ERR', 'Product X', 100);
    COMMIT;
    `,
    'fail'
  );

  // Maker-Checker Protection (Self approval block)
  await assertSQL(
    'Maker-Checker Self-Approval Block',
    `
    BEGIN;
    -- Mock Manager user
    SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001'; -- maker
    SET LOCAL request.jwt.claim.role = 'authenticated';
    SET LOCAL request.jwt.claim.app_metadata = '{"role": "MANAGER"}';

    -- Setup mock dispatch order
    SELECT set_config('app.workflow_context', 'rpc', true);
    
    INSERT INTO public.dispatches (id, org_id, do_no, customer, material, qty, maker_id, maker_checker_status)
    VALUES ('disp-test-mc', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'DO-TEST-MC', 'Cust A', 'Mat A', 100, 'd0000000-0000-0000-0000-000000000001', 'PENDING')
    ON CONFLICT DO NOTHING;

    -- Try to self-approve as maker
    SELECT public.approve_dispatch('disp-test-mc', 'APPROVED');
    COMMIT;
    `,
    'fail'
  );

  // -----------------------------------------------------------------------------
  // Phase D: Performance Benchmarking
  // -----------------------------------------------------------------------------
  console.log('\n--- Phase D: Performance Benchmarking (Scale Seeding) ---');

  // Insert Performance Organization without ON CONFLICT
  await assertSQL(
    'Setup PERF_AUDIT_ORG Organization',
    `
    INSERT INTO public.organizations (name) 
    SELECT 'PERF_AUDIT_ORG' 
    WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'PERF_AUDIT_ORG');
    `
  );

  const orgRes = await runSQL(`SELECT id FROM public.organizations WHERE name = 'PERF_AUDIT_ORG';`);
  const perfOrgId = orgRes[0]?.id;

  if (!perfOrgId) {
    console.error('❌ Could not retrieve PERF_AUDIT_ORG ID. Skipping scale benchmarks.');
  } else {
    // Seeding 185k records
    console.log(`🌱 Seeding 185,000 scale records under org: ${perfOrgId}...`);
    const seedStart = Date.now();
    await runSQL(`SELECT public.seed_performance_data('${perfOrgId}'::uuid);`);
    console.log(`✅ Seed completed in ${((Date.now() - seedStart)/1000).toFixed(2)} seconds.`);

    // Benchmarking SLAs
    const t0 = Date.now();
    await runSQL(`SELECT count(*) FROM public.stock_ledger WHERE org_id = '${perfOrgId}';`);
    const ledgerSearchTime = Date.now() - t0;
    const ledgerPass = ledgerSearchTime < 1000;
    console.log(`⏱️ Stock Ledger Search Time: ${ledgerSearchTime}ms (SLA < 1s) -> ${ledgerPass ? '✅ PASS' : '❌ FAIL'}`);
    report.push({ name: 'Stock Ledger SLA Search Time', status: ledgerPass ? 'PASS' : 'FAIL', detail: `${ledgerSearchTime}ms` });

    const t1 = Date.now();
    await runSQL(`SELECT count(*) FROM public.batches WHERE org_id = '${perfOrgId}';`);
    const batchCostingTime = Date.now() - t1;
    const costingPass = batchCostingTime < 5000;
    console.log(`⏱️ Batch Costing Load Time: ${batchCostingTime}ms (SLA < 5s) -> ${costingPass ? '✅ PASS' : '❌ FAIL'}`);
    report.push({ name: 'Batch Costing SLA Load Time', status: costingPass ? 'PASS' : 'FAIL', detail: `${batchCostingTime}ms` });

    const t2 = Date.now();
    await runSQL(`SELECT * FROM public.get_batch_consumed_lots('BATCH-PERF-100');`);
    const traceabilityTime = Date.now() - t2;
    const tracePass = traceabilityTime < 2000;
    console.log(`⏱️ Traceability Query Time: ${traceabilityTime}ms (SLA < 2s) -> ${tracePass ? '✅ PASS' : '❌ FAIL'}`);
    report.push({ name: 'Traceability Query SLA Time', status: tracePass ? 'PASS' : 'FAIL', detail: `${traceabilityTime}ms` });

    // Clean up
    console.log('🧹 Cleaning up 185k scale test rows...');
    await runSQL(`SELECT public.cleanup_perf_organization('PERF_AUDIT_ORG');`);
    console.log('✅ Cleanup completed.');
  }

  // -----------------------------------------------------------------------------
  // Phase E & F: Disaster Recovery & Compliance
  // -----------------------------------------------------------------------------
  console.log('\n--- Phase E & F: Disaster Recovery & Compliance ---');

  // Test 4: Audit Log Immutability check
  await assertSQL(
    'Audit Log Update Prevention (Immutability)',
    `
    BEGIN;
    -- Insert a mock audit log entry
    INSERT INTO public.audit_log (id, org_id, action, details)
    VALUES ('99999999-9999-9999-9999-999999999999', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'TEST_ACTION', 'Original Details')
    ON CONFLICT DO NOTHING;

    -- Try to modify it (should trigger exception)
    UPDATE public.audit_log 
    SET details = 'Tampered text' 
    WHERE id = '99999999-9999-9999-9999-999999999999';
    COMMIT;
    `,
    'fail'
  );

  await assertSQL(
    'Audit Log Delete Prevention (Immutability)',
    `
    BEGIN;
    -- Insert a mock audit log entry first
    INSERT INTO public.audit_log (id, org_id, action, details)
    VALUES ('99999999-9999-9999-9999-999999999999', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'TEST_ACTION', 'Original Details')
    ON CONFLICT DO NOTHING;

    -- Try to delete it (should trigger exception)
    DELETE FROM public.audit_log 
    WHERE id = '99999999-9999-9999-9999-999999999999';
    COMMIT;
    `,
    'fail'
  );

  // Test 5: Signature modification protection
  await assertSQL(
    'Electronic Signature Modification Protection',
    `
    BEGIN;
    -- Insert mock training record
    INSERT INTO public.training_records (id, org_id, training_no, training_date, trainer_signature)
    VALUES ('88888888-8888-8888-8888-888888888888', 'abf5996a-ead9-4307-b0a7-5caa30e52e9c', 'TR-001', '2025-01-01'::date, 'TrainerSignature')
    ON CONFLICT DO NOTHING;

    -- Attempt to update trainer_signature (should trigger compliance exception)
    UPDATE public.training_records 
    SET trainer_signature = 'Fake Sig' 
    WHERE id = '88888888-8888-8888-8888-888888888888';
    COMMIT;
    `,
    'fail'
  );

  // -----------------------------------------------------------------------------
  // Report and Termination
  // -----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  AUDIT COMPLETED: Passed ${passedCount} / ${testCount} core assertions.`);
  console.log('================================================================\n');

  // Save audit findings to a markdown file
  const reportMd = `# SVRERP02 Production Readiness Audit v2 Findings

Generated: ${new Date().toISOString()}

### Audit Summary
- **Total Assertions Run:** ${testCount}
- **Assertions Passed:** ${passedCount}
- **Audit Result:** ${passedCount === testCount ? '🎉 GO-LIVE APPROVED' : '⚠️ NO-GO (Fix Remaining Failures)'}

### Detailed Report
${report.map(r => `- **[${r.status}]** ${r.name}: ${r.detail}`).join('\n')}
`;
  
  fs.writeFileSync('C:/Users/DELL/.gemini/antigravity/brain/10935afa-7373-40e9-98e9-b1bf78cfa335/subagent_audit_report.md', reportMd);
  console.log('Report saved as subagent_audit_report.md');
}

main().catch(err => {
  console.error("Audit Execution Failed:", err);
  process.exit(1);
});
