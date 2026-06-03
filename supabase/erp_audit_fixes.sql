-- ==============================================================================
-- SVRERP CTO AUDIT FIXES: PHASE 3 - DATABASE INTEGRITY & SOFT DELETES
-- ==============================================================================
-- Description: This script adds soft-delete functionality (`is_active` flag)
-- to master tables. Hard deletes on master data cause catastrophic cascading
-- failures or orphan records in historical ledgers (Traceability).
-- ==============================================================================

-- 1. Add `is_active` flag to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add `is_active` flag to Store Items
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add `is_active` flag to R&D Ingredients
ALTER TABLE rnd_ingredients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Add `is_active` flag to Locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Add `is_active` flag to MD Schema (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'md' AND table_name = 'suppliers') THEN
    EXECUTE 'ALTER TABLE md.suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'md' AND table_name = 'customers') THEN
    EXECUTE 'ALTER TABLE md.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'md' AND table_name = 'items') THEN
    EXECUTE 'ALTER TABLE md.items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;';
  END IF;
END $$;

-- Notes for Frontend Developers:
-- Instead of: `supabase.from('products').delete().eq('id', id)`
-- Use: `supabase.from('products').update({ is_active: false }).eq('id', id)`
-- And filter dropdowns using `.eq('is_active', true)`
