-- ============================================================================
-- WORK_CENTERS: Production zones/lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('Mixing','Blending','Filling','Packaging','Quality','Storage','Other')),
  capacity numeric NOT NULL CHECK (capacity > 0),
  capacity_unit text NOT NULL DEFAULT 'kg/hr',
  shift_hours numeric NOT NULL DEFAULT 8 CHECK (shift_hours > 0 AND shift_hours <= 24),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Under Maintenance')),
  location text,
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_name text, -- denormalized for speed, trigger se update hoga
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_code_per_org UNIQUE (org_id, code),
  CONSTRAINT positive_capacity CHECK (capacity > 0),
  CONSTRAINT valid_shift_hours CHECK (shift_hours > 0 AND shift_hours <= 24)
);

-- Ensure columns exist if table was already created
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS capacity_unit text NOT NULL DEFAULT 'kg/hr';
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS shift_hours numeric NOT NULL DEFAULT 8;
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS supervisor_name text;
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.work_centers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_work_centers_org_status ON work_centers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_work_centers_code ON work_centers(org_id, code);

-- Auto update supervisor_name from profiles
CREATE OR REPLACE FUNCTION sync_workcenter_supervisor_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supervisor_id IS NOT NULL THEN
    SELECT name INTO NEW.supervisor_name FROM profiles WHERE id = NEW.supervisor_id;
  ELSE
    NEW.supervisor_name = NULL;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workcenter_supervisor ON work_centers;
CREATE TRIGGER trg_workcenter_supervisor
BEFORE INSERT OR UPDATE OF supervisor_id ON work_centers
FOR EACH ROW EXECUTE FUNCTION sync_workcenter_supervisor_name();

-- RLS: Sirf ADMIN/MANAGER edit kar sakte, baaki view only
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view work_centers" ON work_centers;
DROP POLICY IF EXISTS "Managers can insert work_centers" ON work_centers;
DROP POLICY IF EXISTS "Managers can update work_centers" ON work_centers;
DROP POLICY IF EXISTS "Admin only delete work_centers" ON work_centers;

CREATE POLICY "Org members can view work_centers" 
ON work_centers FOR SELECT 
USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can insert work_centers" 
ON work_centers FOR INSERT 
WITH CHECK (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

CREATE POLICY "Managers can update work_centers" 
ON work_centers FOR UPDATE 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

CREATE POLICY "Admin only delete work_centers" 
ON work_centers FOR DELETE 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- EQUIPMENT: Machines inside work centers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES work_centers(id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_code text NOT NULL,
  equipment_type text, -- 'Mixer','Filler','Sealer','Conveyor'
  make_model text,
  capacity numeric,
  capacity_unit text,
  status text NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational','Under Maintenance','Breakdown','Retired')),
  last_maintenance_date date,
  next_maintenance_date date,
  installation_date date,
  location text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_asset_code_per_org UNIQUE (org_id, asset_code),
  CONSTRAINT positive_capacity CHECK (capacity IS NULL OR capacity > 0)
);

-- Ensure columns exist if table was already created
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS work_center_id uuid REFERENCES public.work_centers(id) ON DELETE SET NULL;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS asset_code text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS equipment_type text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS make_model text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS capacity numeric;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS capacity_unit text;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS installation_date date;

CREATE INDEX IF NOT EXISTS idx_equipment_org_wc ON equipment(org_id, work_center_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(org_id, status);

-- RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view equipment" ON equipment;
DROP POLICY IF EXISTS "Managers can modify equipment" ON equipment;

CREATE POLICY "Org members can view equipment" 
ON equipment FOR SELECT 
USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can modify equipment" 
ON equipment FOR ALL 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_updated_at ON equipment;
CREATE TRIGGER trg_equipment_updated_at
BEFORE UPDATE ON equipment
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent Delete If In Use
CREATE OR REPLACE FUNCTION check_workcenter_in_use()
RETURNS TRIGGER AS $$
DECLARE
  v_count int;
BEGIN
  -- Check batches table
  SELECT COUNT(*) INTO v_count FROM batches 
  WHERE line = (SELECT code FROM work_centers WHERE id = OLD.id)
  AND status IN ('PLANNED','RUNNING','QC_HOLD');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete work center: % active batches are using it', v_count;
  END IF;
  
  -- Check equipment
  SELECT COUNT(*) INTO v_count FROM equipment WHERE work_center_id = OLD.id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete work center: % equipment assigned. Reassign first', v_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_wc_delete ON work_centers;
CREATE TRIGGER trg_prevent_wc_delete
BEFORE DELETE ON work_centers
FOR EACH ROW EXECUTE FUNCTION check_workcenter_in_use();

-- Audit Log for Master Changes
CREATE TABLE IF NOT EXISTS public.master_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  table_name text NOT NULL, -- 'work_centers', 'equipment'
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT','UPDATE','DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_master_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO master_audit_log (org_id, table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workcenters_audit ON work_centers;
CREATE TRIGGER trg_workcenters_audit
AFTER INSERT OR UPDATE OR DELETE ON work_centers
FOR EACH ROW EXECUTE FUNCTION log_master_changes();

DROP TRIGGER IF EXISTS trg_equipment_audit ON equipment;
CREATE TRIGGER trg_equipment_audit
AFTER INSERT OR UPDATE OR DELETE ON equipment
FOR EACH ROW EXECUTE FUNCTION log_master_changes();
