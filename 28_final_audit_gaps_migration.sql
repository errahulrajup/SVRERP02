-- 28_final_audit_gaps_migration.sql

-- 0. Prerequisites: sops and training_records tables
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

CREATE TABLE IF NOT EXISTS public.training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  sop_id uuid NOT NULL REFERENCES sops(id),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED')),
  expiry_date date,
  trainer_signature text,
  trainee_signature text,
  trainer_signed_at timestamptz,
  trainee_signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_org_isolation ON public.training_records;
CREATE POLICY training_org_isolation ON public.training_records FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 1. AdminSettings 21 CFR Part 11 Audit Trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  setting_key text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  old_value text,
  new_value text
);

ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_history_org ON settings_history;
CREATE POLICY settings_history_org ON settings_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION update_site_setting(
  p_key text,
  p_value text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_old_value text;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  SELECT value INTO v_old_value FROM settings WHERE key = p_key AND org_id = v_org_id;
  
  UPDATE settings SET value = p_value, updated_at = now() 
  WHERE key = p_key AND org_id = v_org_id;
  
  INSERT INTO settings_history (org_id, setting_key, changed_by, old_value, new_value, changed_at)
  VALUES (v_org_id, p_key, p_user_id, v_old_value, p_value, now());
  
  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION update_site_setting(text, text, uuid) TO authenticated;

-- ============================================================================
-- 2. CmsTestimonials Approval Workflow
-- ============================================================================
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE OR REPLACE FUNCTION approve_testimonial(p_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS void AS $$
BEGIN
  UPDATE testimonials SET 
    approved_by = p_user_id, 
    approved_at = now(),
    visible = true 
  WHERE id = p_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_testimonial(uuid, uuid) TO authenticated;

-- ============================================================================
-- 3. Users RBAC Migration
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date date;

CREATE TABLE IF NOT EXISTS user_role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  old_role text,
  new_role text,
  reason text NOT NULL
);

ALTER TABLE user_role_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_history_org ON user_role_history;
CREATE POLICY role_history_org ON user_role_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE OR REPLACE VIEW v_user_training_status AS
SELECT 
  p.id, p.name, p.employee_code, p.role, p.department, p.is_active, p.org_id,
  COUNT(tr.id) FILTER (WHERE tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE) as valid_trainings,
  COUNT(tr.id) FILTER (WHERE tr.expiry_date < CURRENT_DATE OR tr.expiry_date < CURRENT_DATE + 30) as expiring_trainings,
  BOOL_AND(
    CASE 
      WHEN s.sop_no IN ('SOP-ALLERGEN-001', 'SOP-HACCP-002') THEN 
        (tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE)
      ELSE true 
    END
  ) as production_qualified
FROM profiles p
LEFT JOIN training_records tr ON tr.employee_id = p.id
LEFT JOIN sops s ON s.id = tr.sop_id AND s.status = 'Active'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.employee_code, p.role, p.department, p.is_active, p.org_id;

GRANT SELECT ON v_user_training_status TO authenticated;

CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id uuid,
  p_new_role text,
  p_reason text,
  p_changed_by uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_old_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_old_role FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET role = p_new_role, updated_at = now() WHERE id = p_user_id;
  
  INSERT INTO user_role_history (org_id, user_id, changed_by, old_role, new_role, reason)
  VALUES (v_org_id, p_user_id, p_changed_by, v_old_role, p_new_role, p_reason);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_role(uuid, text, text, uuid) TO authenticated;
