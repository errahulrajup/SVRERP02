-- 40_training_esig.sql

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

CREATE TABLE IF NOT EXISTS hr_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  sop_id uuid NOT NULL REFERENCES sops(id),
  trained_by uuid REFERENCES profiles(id),
  training_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED', 'EXPIRED')),
  score numeric(5,2),
  attempt_number int DEFAULT 1,

  -- 21 CFR Part 11 E-Signature
  trainer_signature text, -- base64 png
  trainer_signed_at timestamptz,
  trainer_user_id uuid REFERENCES profiles(id),
  trainee_signature text, -- base64 png
  trainee_signed_at timestamptz,
  trainee_user_id uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, sop_id, attempt_number)
);

ALTER TABLE hr_training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_org ON hr_training_records;
CREATE POLICY training_org ON hr_training_records
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- View: Employee Competency Matrix
CREATE OR REPLACE VIEW v_employee_competency AS
SELECT
  p.id as employee_id,
  p.name as employee_name,
  p.employee_code,
  p.department,
  p.role,
  s.id as sop_id,
  s.sop_no,
  s.title as sop_title,
  tr.training_date,
  tr.expiry_date,
  tr.status,
  tr.score,
  CASE
    WHEN tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE THEN true
    ELSE false
  END as is_qualified,
  CASE
    WHEN tr.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN tr.expiry_date < CURRENT_DATE + 30 THEN 'EXPIRING_SOON'
    WHEN tr.status = 'PASSED' THEN 'VALID'
    ELSE 'NOT_TRAINED'
  END as qualification_status
FROM profiles p
CROSS JOIN sops s
LEFT JOIN hr_training_records tr ON tr.employee_id = p.id AND tr.sop_id = s.id
  AND tr.id = (
    SELECT id FROM hr_training_records tr2
    WHERE tr2.employee_id = p.id AND tr2.sop_id = s.id
    ORDER BY training_date DESC LIMIT 1
  )
WHERE p.is_active = true AND s.status = 'Active'
ORDER BY p.name, s.sop_no;

GRANT SELECT ON v_employee_competency TO authenticated;

-- RPC: Complete training with dual e-signature
CREATE OR REPLACE FUNCTION complete_training_with_signature(
  p_training_id uuid,
  p_score numeric,
  p_trainer_signature text,
  p_trainee_signature text,
  p_trainee_id uuid,
  p_trainer_id uuid DEFAULT auth.uid()
) RETURNS jsonb AS $$
DECLARE
  v_org_id uuid;
  v_expiry date;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_trainer_id;
  SELECT (CURRENT_DATE + interval '1 year')::date INTO v_expiry;

  UPDATE hr_training_records SET
    status = CASE WHEN p_score >= 80 THEN 'PASSED' ELSE 'FAILED' END,
    score = p_score,
    expiry_date = v_expiry,
    trainer_signature = p_trainer_signature,
    trainer_signed_at = now(),
    trainer_user_id = p_trainer_id,
    trainee_signature = p_trainee_signature,
    trainee_signed_at = now(),
    trainee_user_id = p_trainee_id
  WHERE id = p_training_id AND org_id = v_org_id;

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_score >= 80 THEN 'PASSED' ELSE 'FAILED' END);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_training_with_signature(uuid, numeric, text, text, uuid, uuid) TO authenticated;

-- CRITICAL: Block production if operator not trained on critical SOPs
CREATE OR REPLACE FUNCTION check_operator_qualification(
  p_operator_id uuid,
  p_recipe_id uuid
) RETURNS boolean AS $$
DECLARE
  v_required_sops text[] := ARRAY['SOP-HACCP-002', 'SOP-ALLERGEN-001', 'SOP-GMP-001'];
  v_sop_no text;
BEGIN
  FOREACH v_sop_no IN ARRAY v_required_sops
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM v_employee_competency
      WHERE employee_id = p_operator_id
      AND sop_no = v_sop_no
      AND is_qualified = true
    ) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_operator_qualification(uuid, uuid) TO authenticated;
