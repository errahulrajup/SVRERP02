-- ==============================================================================
-- FSMS and Inventory Schema Fixes
-- Run this script in your Supabase SQL Editor to apply missing schema columns.
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FSMS Module Fixes
-- ─────────────────────────────────────────────────────────────────────────────

-- BUG-FSMS-01: Create training_records table (was entirely missing)
CREATE TABLE IF NOT EXISTS public.training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_no TEXT NOT NULL,
    topic TEXT NOT NULL,
    trainer TEXT,
    department TEXT,
    training_date DATE NOT NULL,
    duration_hours NUMERIC,
    attendees JSONB, -- BUG-FSMS-12: Must be JSONB for array of objects
    training_type TEXT,
    assessment_done BOOLEAN DEFAULT false,
    pass_score NUMERIC,
    status TEXT DEFAULT 'Scheduled',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- BUG-FSMS-02: Fix ccp_logs table
ALTER TABLE public.ccp_logs 
  ADD COLUMN IF NOT EXISTS ccp_no TEXT,
  ADD COLUMN IF NOT EXISTS process_step TEXT,
  ADD COLUMN IF NOT EXISTS hazard TEXT,
  ADD COLUMN IF NOT EXISTS control_measure TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS checked_by TEXT;

-- BUG-FSMS-07: Change reading from NUMERIC to TEXT for qualitative readings
ALTER TABLE public.ccp_logs ALTER COLUMN reading TYPE TEXT USING reading::TEXT;

-- BUG-FSMS-03: Fix prp_logs table
ALTER TABLE public.prp_logs 
  ADD COLUMN IF NOT EXISTS prp_no TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed DATE,
  ADD COLUMN IF NOT EXISTS next_review DATE;

-- BUG-FSMS-04: Fix recalls table
ALTER TABLE public.recalls 
  ADD COLUMN IF NOT EXISTS product TEXT,
  ADD COLUMN IF NOT EXISTS batch_ids TEXT[],
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- BUG-FSMS-06: Fix recalls.customers to be JSONB
ALTER TABLE public.recalls ALTER COLUMN customers TYPE JSONB USING customers::jsonb;

-- BUG-FSMS-05: Fix sops table
ALTER TABLE public.sops 
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add RLS Policies for new table
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_records' AND policyname = 'allow_all_training_records') THEN
    CREATE POLICY allow_all_training_records ON public.training_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Inventory Module Fixes
-- ─────────────────────────────────────────────────────────────────────────────

-- BUG-INV-01: Fix grns table column names
ALTER TABLE public.grns RENAME COLUMN qty TO quantity;
ALTER TABLE public.grns RENAME COLUMN uom TO unit;
ALTER TABLE public.grns RENAME COLUMN rate TO unit_cost;
ALTER TABLE public.grns RENAME COLUMN remarks TO notes;

-- BUG-INV-03: Update CHECK constraint for grns status
ALTER TABLE public.grns DROP CONSTRAINT IF EXISTS grns_status_check;
ALTER TABLE public.grns ADD CONSTRAINT grns_status_check CHECK (status IN ('QC_PENDING', 'APPROVED', 'REJECTED'));
-- Migrate any existing QC_DONE to APPROVED
UPDATE public.grns SET status = 'APPROVED' WHERE status = 'QC_DONE';

-- BUG-INV-02: Fix lots table column names and add missing
ALTER TABLE public.lots RENAME COLUMN qty TO quantity;
ALTER TABLE public.lots RENAME COLUMN rate TO unit_cost;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS notes TEXT;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
