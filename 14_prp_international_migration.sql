-- 14_prp_international_migration.sql

-- 1. Add compliance columns to prp_log
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS recipe_id text REFERENCES recipes(id);
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS batch_id text REFERENCES batches(id);
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE prp_logs ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'ISO_22000'
CHECK (compliance_standard IN ('ISO_22000', 'FSSC_22000', 'FDA_FSMA', 'BRC_GS'));

-- 2. PRP Master table versioning - SOP changes track karne ke liye
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS superseded_by text REFERENCES recipe_fsms_prp(id);
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE;
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);

-- 3. History table for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS prp_execution_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  prp_log_id text NOT NULL REFERENCES prp_logs(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'REJECT')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prp_history_log ON prp_execution_history(prp_log_id, version DESC);

-- 4. Dynamic cleaning checklist table - hardcoded array hatao
CREATE TABLE IF NOT EXISTS prp_cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  sop_code text NOT NULL, -- 'SOP-004', 'SOP-007'
  task_name text NOT NULL,
  area text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'BATCH')),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES profiles(id)
);

-- RLS
ALTER TABLE prp_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prp_org_isolation ON prp_logs;
CREATE POLICY prp_org_isolation ON prp_logs
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE prp_cleaning_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prp_tasks_org_isolation ON prp_cleaning_tasks;
CREATE POLICY prp_tasks_org_isolation ON prp_cleaning_tasks
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
