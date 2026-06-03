-- ==============================================================================
-- DYNAMIC FSMS & VALIDATION UPGRADE SCRIPT
-- This script adds the necessary tables for product-wise dynamic FSMS.
-- ==============================================================================

-- 1. Modify rnd_formulas to support validation workflow
ALTER TABLE rnd_formulas 
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VIABLE', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS validation_notes text;

-- 2. Recipe Process Steps (Dynamic SOP per product)
-- recipe_steps already exists, just add is_ccp
ALTER TABLE recipe_steps
  ADD COLUMN IF NOT EXISTS is_ccp boolean DEFAULT false;

-- 3. Recipe Dynamic CCPs (Product-specific Critical Control Points)
CREATE TABLE IF NOT EXISTS recipe_fsms_ccp (
    id text DEFAULT gen_random_uuid()::text PRIMARY KEY,
    recipe_id text REFERENCES recipes(id) ON DELETE CASCADE,
    ccp_no text NOT NULL,             -- e.g. "CCP1"
    ccp_name text NOT NULL,           -- e.g. "Cooking Temperature"
    parameter text,                   -- e.g. "Temperature (C)"
    critical_limit text,              -- e.g. ">= 85C for 5 min"
    unit text,                        -- e.g. "C"
    hazard text,                      -- e.g. "Biological"
    control_measure text,             -- e.g. "Thermometer Check"
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. Recipe Dynamic PRPs (Product-specific Prerequisite Programs / SOPs)
CREATE TABLE IF NOT EXISTS recipe_fsms_prp (
    id text DEFAULT gen_random_uuid()::text PRIMARY KEY,
    recipe_id text REFERENCES recipes(id) ON DELETE CASCADE,
    prp_type text NOT NULL,           -- e.g. "cleaning", "pest", "calibration"
    prp_name text NOT NULL,           -- e.g. "Mixer CIP", "Rodent Bait Station"
    frequency text,                   -- e.g. "Daily", "Weekly", "Per Batch"
    target_area text,                 -- e.g. "Mixing Area"
    procedure text,                   -- Specific procedure for this product
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recipe_fsms_ccp ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_fsms_prp ENABLE ROW LEVEL SECURITY;

-- Allow all policy for development (as per current schema patterns)
CREATE POLICY "allow_all_recipe_fsms_ccp" ON recipe_fsms_ccp FOR ALL USING (true);
CREATE POLICY "allow_all_recipe_fsms_prp" ON recipe_fsms_prp FOR ALL USING (true);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_recipe_fsms_ccp_recipe_id ON recipe_fsms_ccp(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_fsms_prp_recipe_id ON recipe_fsms_prp(recipe_id);
