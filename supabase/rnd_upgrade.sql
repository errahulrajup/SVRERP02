-- ============================================================
-- Phase 6 RND Upgrade Migration
-- ============================================================

-- 1. Link RND Ingredients to ERP Material Master (products table)
ALTER TABLE public.rnd_ingredients
ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Link RND Formulas to ERP Products (for promotion)
ALTER TABLE public.rnd_formulas
ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 3. The formula status already exists (DRAFT, UNDER_TRIAL, APPROVED, LOCKED, ARCHIVED)
-- Ensure we can lock formulas (maybe add locked_at)
-- RND-13 FIX: moved to rnd_schema.sql with proper FK constraint
-- ALTER TABLE public.rnd_formulas
-- ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
-- ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- 4. Lab Notebook: We already have rnd_notebook. To link to DMS, we can use dms_links which we created in Phase 5.
