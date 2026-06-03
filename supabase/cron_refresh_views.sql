-- ============================================================
-- MATERIALIZED VIEW CRON REFRESH
-- Run this in Supabase SQL Editor
-- Requires: pg_cron extension (enable in Supabase Dashboard → Database → Extensions)
-- ============================================================

-- Step 1: Enable pg_cron (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Schedule MV refreshes

-- AR Aging — refresh every hour
SELECT cron.schedule(
  'refresh-mv-ar-aging',
  '0 * * * *',   -- every hour at minute 0
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY fin.mv_ar_aging;$$
);

-- Expiry Alerts — refresh every 6 hours
SELECT cron.schedule(
  'refresh-mv-expiry-alerts',
  '0 */6 * * *', -- every 6 hours
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY inv.mv_expiry_alerts;$$
);

-- Invoice Aging — refresh every hour
SELECT cron.schedule(
  'refresh-mv-invoice-aging',
  '30 * * * *',  -- every hour at minute 30
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY fin.mv_invoice_aging;$$
);

-- Step 4: Verify schedules
SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;

-- ============================================================
-- NOTE: If CONCURRENTLY fails (first time), run without it:
-- REFRESH MATERIALIZED VIEW fin.mv_ar_aging;
-- Then the schedule will use CONCURRENTLY on subsequent runs.
-- ============================================================
