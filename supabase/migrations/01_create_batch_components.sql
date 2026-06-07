-- ============================================================
-- SVRERP02 Migration 01: batch_components table
-- Fixes critical data loss bug: bosApi.ts queries this table
-- but it did not exist in the database.
-- Batch ingredient data was silently not being saved.
-- Column names match the BatchComponent TypeScript interface in types/bos.ts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.batch_components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  lot_id       UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  material     TEXT NOT NULL,
  planned_qty  NUMERIC(12, 4) NOT NULL DEFAULT 0,
  actual_qty   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'kg',
  unit_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,

  -- Computed variance column: auto-calculated by DB
  variance_pct NUMERIC(8, 4) GENERATED ALWAYS AS (
    CASE
      WHEN planned_qty = 0 THEN NULL
      ELSE ROUND(((actual_qty - planned_qty) / planned_qty) * 100, 4)
    END
  ) STORED,

  comp_notes   TEXT,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for common join patterns
CREATE INDEX IF NOT EXISTS idx_batch_components_batch ON public.batch_components(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_components_lot   ON public.batch_components(lot_id);
CREATE INDEX IF NOT EXISTS idx_batch_components_added ON public.batch_components(added_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_batch_components()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_batch_components_updated ON public.batch_components;
CREATE TRIGGER trg_batch_components_updated
  BEFORE UPDATE ON public.batch_components
  FOR EACH ROW EXECUTE FUNCTION public.touch_batch_components();

-- Enable RLS
ALTER TABLE public.batch_components ENABLE ROW LEVEL SECURITY;

-- Policies (uses auth.user_role() from migration 00)
-- SELECT: any authenticated user can read
CREATE POLICY bc_select ON public.batch_components
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE: OPERATOR and above can write
CREATE POLICY bc_insert ON public.batch_components
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY bc_update ON public.batch_components
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'));

-- DELETE: MANAGER and above only
CREATE POLICY bc_delete ON public.batch_components
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- Grant to authenticated role
GRANT ALL ON public.batch_components TO authenticated;

-- ── Verify ──
-- SELECT * FROM batch_components LIMIT 5;
-- INSERT INTO batch_components(batch_id, ingredient, planned_kg, actual_kg)
--   VALUES('<valid-batch-uuid>', 'Sunflower Oil', 10.0, 9.8)
--   RETURNING *;
