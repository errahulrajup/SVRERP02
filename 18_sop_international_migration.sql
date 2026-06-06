-- 18_sop_international_migration.sql

-- 0. Prerequisite: sops table
CREATE TABLE IF NOT EXISTS public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  sop_no text NOT NULL,
  title text NOT NULL,
  category text,
  version text DEFAULT '1.0',
  status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','RETIRED')),
  document_url text,
  effective_date date,
  review_date date,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage sops" ON public.sops;
CREATE POLICY "Auth manage sops" ON public.sops FOR ALL TO authenticated USING (true);

-- 1. Add compliance columns
ALTER TABLE sops ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES sops(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS parent_sop_id uuid REFERENCES sops(id); -- tracks version chain
ALTER TABLE sops ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'ISO_9001'
CHECK (compliance_standard IN ('ISO_9001', 'ISO_22000', 'FSSC_22000', 'FDA_FSMA'));
ALTER TABLE sops ADD COLUMN IF NOT EXISTS document_path text; -- Supabase storage path for PDF

-- 2. History table for 21 CFR Part 11 + ISO 9001 Cl. 7.5.3
CREATE TABLE IF NOT EXISTS sop_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  sop_id uuid NOT NULL REFERENCES sops(id),
  version text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'OBSOLETE', 'REVIEW')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sop_history ON sop_history(sop_id, version DESC);

-- 3. RLS
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sop_org_isolation ON sops;
CREATE POLICY sop_org_isolation ON sops
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
