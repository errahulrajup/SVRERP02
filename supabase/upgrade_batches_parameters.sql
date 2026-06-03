-- ─────────────────────────────────────────────────────────────────────────────
-- upgrade_batches_parameters.sql
-- Adds target and actual temperature parameters to the batches table.
-- Run this once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.batches add column if not exists fat_melting_temp numeric(5,2);
alter table public.batches add column if not exists mixing_temp numeric(5,2);
alter table public.batches add column if not exists pasteurization_temp numeric(5,2);

alter table public.batches add column if not exists target_fat_melting_temp numeric(5,2);
alter table public.batches add column if not exists target_mixing_temp numeric(5,2);
alter table public.batches add column if not exists target_pasteurization_temp numeric(5,2);

-- Refresh schema cache
select pg_notify('pgrst', 'reload schema');
