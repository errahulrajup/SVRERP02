const fs = require('fs');
const path = require('path');

const rootDir = 'd:\\SVRERP';
const outPath = path.join(rootDir, 'FINAL_INSTALL_SCRIPT.sql');

let finalSQL = '';

// 1. MASTER_DB_RESET (Drops everything, recreates all base tables)
const masterContent = fs.readFileSync(path.join(rootDir, 'supabase', 'MASTER_DB_RESET.sql'), 'utf-8');
finalSQL += masterContent + '\n\n';

// 2. Multitenant & Profiles Setup (since it was missing)
finalSQL += `
-- ============================================================
-- MULTI-TENANT FIXES (Organizations, Profiles, org_id columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Srivriddhi Enterprise',
  created_at timestamptz DEFAULT now()
);
INSERT INTO public.organizations (name) VALUES ('Srivriddhi Enterprise') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'OPERATOR' CHECK (role IN ('ADMIN', 'MANAGER', 'QC', 'OPERATOR', 'EDITOR')),
  employee_code text UNIQUE,
  department text,
  is_active boolean DEFAULT true,
  hire_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  INSERT INTO public.profiles (id, org_id, email, name, role)
  VALUES (
    new.id, default_org_id, new.email, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    'ADMIN'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add org_id to base tables so our advanced scripts don't fail
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.fg_lots ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.packaging_runs ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
\n\n`;

// 3. Append all numbered migrations
const files = fs.readdirSync(rootDir)
  .filter(f => /^[0-9]{2}.*\.sql$/.test(f))
  .sort();

for (const f of files) {
  finalSQL += `-- ============================================================\n`;
  finalSQL += `-- FILE: ${f}\n`;
  finalSQL += `-- ============================================================\n`;
  let content = fs.readFileSync(path.join(rootDir, f), 'utf-8');
  
  // FIX ANY SYNTAX ERRORS IN EXISTING FILES
  content = content.replace(
    /DELETE FROM stock_ledger WHERE lot_id = v_rm_lot_id LIMIT 1;/g, 
    'DELETE FROM stock_ledger WHERE id IN (SELECT id FROM stock_ledger WHERE lot_id = v_rm_lot_id LIMIT 1);'
  );
  
  // FIX BUGGY VIEWS IN BASE SCHEMA
  content = content.replace(
    /o\.org_id,\s*o\.site_id,\s*o\.customer_id/g,
    'o.org_id,\n  NULL AS site_id,\n  o.customer_id'
  );
  
  finalSQL += content + '\n\n';
}

fs.writeFileSync(outPath, finalSQL);
console.log('Successfully generated FINAL_INSTALL_SCRIPT.sql');
