-- ─────────────────────────────────────────────────────────────────────────────
-- batch_dynamic_params.sql
-- Adds a dynamic_params JSONB column to the batches table.
-- This allows storing variable recipe parameters natively.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS dynamic_params JSONB DEFAULT '{}'::jsonb;

-- Drop the old hardcoded columns (Optional, but good for cleanup. Let's keep them so we don't break existing data, but we won't use them for new data)
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS fat_melting_temp;
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS mixing_temp;
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS pasteurization_temp;
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS target_fat_melting_temp;
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS target_mixing_temp;
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS target_pasteurization_temp;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
