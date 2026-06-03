-- ─────────────────────────────────────────────────────────────────────────────
-- rnd_flow_upgrade.sql
-- Adds support for machine selection in process steps.
-- Run once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rnd_processes ADD COLUMN IF NOT EXISTS machine text;

-- Ask Supabase to refresh its schema cache
select pg_notify('pgrst', 'reload schema');
