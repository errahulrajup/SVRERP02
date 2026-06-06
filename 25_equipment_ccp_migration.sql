-- 25_equipment_ccp_migration.sql

-- Ensure equipment table has all the necessary columns
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS equipment_code text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS last_calibrated date;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS next_calibration_due date;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS calibration_cert_url text;

-- 1. Equipment & CMMS Table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_code text UNIQUE NOT NULL, -- e.g., 'THERM-001', 'SCALE-B2'
  name text NOT NULL,
  type text, -- 'Thermometer', 'Scale', 'Metal Detector'
  location text,
  last_calibrated date,
  next_calibration_due date,
  calibration_cert_url text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CALIBRATION_DUE', 'OUT_OF_SERVICE'))
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_org_isolation ON equipment;
CREATE POLICY equipment_org_isolation ON equipment
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- 2. CCP Live Monitor Table
CREATE TABLE IF NOT EXISTS ccp_live_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id text NOT NULL REFERENCES recipe_fsms_ccp(id),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  reading numeric NOT NULL,
  logged_by uuid REFERENCES profiles(id),
  logged_at timestamptz DEFAULT now(),
  deviation_detected boolean DEFAULT false
);

ALTER TABLE ccp_live_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccp_live_org_isolation ON ccp_live_log;
CREATE POLICY ccp_live_org_isolation ON ccp_live_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipe_fsms_ccp r 
    JOIN recipes rec ON rec.id = r.recipe_id
    JOIN products p ON p.id = rec.product_id
    WHERE r.id = ccp_live_log.ccp_id AND p.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  )
);

-- 3. RPC: Log CCP Reading with Calibration Block and Auto-CAPA
CREATE OR REPLACE FUNCTION log_ccp_reading(
  p_ccp_id text, 
  p_equipment_id uuid, 
  p_reading numeric, 
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ccp recipe_fsms_ccp%ROWTYPE;
  v_equipment equipment%ROWTYPE;
  v_is_deviation boolean := false;
  v_limit numeric;
BEGIN
  SELECT * INTO v_ccp FROM recipe_fsms_ccp WHERE id = p_ccp_id;
  SELECT * INTO v_equipment FROM equipment WHERE id = p_equipment_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'CCP or Equipment not found'; END IF;

  -- BLOCK: Equipment calibration expired
  IF v_equipment.next_calibration_due < CURRENT_DATE THEN
    RAISE EXCEPTION 'Equipment % calibration expired on %. Cannot log CCP.', v_equipment.equipment_code, v_equipment.next_calibration_due;
  END IF;

  -- Evaluate Critical Limits (Mock generic parsing)
  -- If ccp is pasteurization, critical limit might be 72C
  -- Here we assume if limit says >=72, we check that
  -- For now we implement a simple mock check based on typical limits or generic rule
  -- (In a real scenario, this would parse a formula like v_ccp.critical_limit)
  
  -- Let's extract the numeric value from the critical limit string if possible
  v_limit := COALESCE(NULLIF(regexp_replace(v_ccp.critical_limit, '[^0-9.]', '', 'g'), '')::numeric, 75);

  IF p_reading < v_limit THEN
    v_is_deviation := true;
  END IF;

  -- Insert live log
  INSERT INTO ccp_live_log (ccp_id, equipment_id, reading, logged_by, deviation_detected) 
  VALUES (p_ccp_id, p_equipment_id, p_reading, p_user_id, v_is_deviation);
  
  -- AUTO-CAPA TRIGGER
  IF v_is_deviation THEN
    PERFORM trigger_capa(
      'CCP_DEVIATION', 
      p_ccp_id, 
      'CCP ' || v_ccp.ccp_name || ' failed. Reading ' || p_reading || ' violates critical limit: ' || v_ccp.critical_limit, 
      p_user_id
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'deviation', v_is_deviation, 'limit', v_limit);
END; $$;

GRANT EXECUTE ON FUNCTION log_ccp_reading(text, uuid, numeric, uuid) TO authenticated;
