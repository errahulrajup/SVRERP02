-- 50_equipment_cmms.sql

-- Ensure equipment table has all the necessary columns
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS equipment_code text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS last_calibration_date date;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS next_calibration_due date;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS calibration_frequency_days int DEFAULT 365;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS calibration_cert_url text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS last_maintenance_date date;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS next_maintenance_due date;

-- Recreate constraint to support new statuses
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_status_check CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CALIBRATION_DUE', 'RETIRED', 'Operational', 'Down', 'Under Maintenance', 'Decommissioned'));

CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('CCP_MONITOR', 'PRODUCTION', 'TESTING', 'OTHER')),
  location text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CALIBRATION_DUE', 'RETIRED')),

  -- Calibration
  last_calibration_date date,
  next_calibration_due date NOT NULL,
  calibration_frequency_days int DEFAULT 365,
  calibration_cert_url text,

  -- Maintenance
  last_maintenance_date date,
  next_maintenance_due date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_calibration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  calibrated_by uuid REFERENCES profiles(id),
  calibration_date date NOT NULL,
  next_due_date date NOT NULL,
  certificate_url text,
  result text CHECK (result IN ('PASS', 'FAIL', 'ADJUSTED')),
  notes text,
  -- 21 CFR Part 11
  technician_signature text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_org ON equipment;
CREATE POLICY equipment_org ON equipment FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Auto-update equipment status daily
CREATE OR REPLACE FUNCTION update_equipment_status() RETURNS void AS $$
BEGIN
  UPDATE equipment SET status = 'CALIBRATION_DUE'
  WHERE next_calibration_due <= CURRENT_DATE AND status = 'ACTIVE';
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for calibration
CREATE OR REPLACE FUNCTION complete_calibration(
  p_equipment_id uuid,
  p_result text,
  p_next_due date,
  p_notes text,
  p_cert_url text,
  p_signature text,
  p_technician_id uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_technician_id;

  INSERT INTO equipment_calibration_log (
    org_id, equipment_id, calibrated_by, calibration_date, next_due_date,
    certificate_url, result, notes, technician_signature, signed_at
  ) VALUES (
    v_org_id, p_equipment_id, p_technician_id, CURRENT_DATE, p_next_due,
    p_cert_url, p_result, p_notes, p_signature, now()
  );

  UPDATE equipment SET
    last_calibration_date = CURRENT_DATE,
    next_calibration_due = p_next_due,
    calibration_cert_url = p_cert_url,
    status = 'ACTIVE',
    updated_at = now()
  WHERE id = p_equipment_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_calibration(uuid, text, date, text, text, text, uuid) TO authenticated;
