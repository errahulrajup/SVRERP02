-- 16_recall_international_migration.sql

-- 1. Add compliance columns
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS fssai_notified_at timestamptz;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS fssai_notification_ref text;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'FSSAI_2020'
CHECK (compliance_standard IN ('FSSAI_2020', 'FDA_FSMA', 'EU_FIC_1169', 'ISO_22000'));

-- 2. Batch freeze table - regulator poochta hai "kitna stock rok diya?"
CREATE TABLE IF NOT EXISTS recall_batch_freeze (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  recall_id text NOT NULL REFERENCES recalls(id),
  batch_id text NOT NULL REFERENCES batches(id),
  fg_lot_id text REFERENCES fg_lots(id),
  qty_frozen numeric NOT NULL,
  frozen_at timestamptz DEFAULT now(),
  frozen_by uuid REFERENCES profiles(id),
  location text, -- 'Warehouse A', 'Distributor X'
  UNIQUE(recall_id, batch_id, fg_lot_id)
);

-- 3. Audit trail for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS recall_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  recall_id text NOT NULL REFERENCES recalls(id),
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'FREEZE_STOCK', 'NOTIFY_FSSAI', 'CLOSE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recall_history ON recall_history(recall_id, changed_at DESC);

-- 4. RLS
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recall_org_isolation ON recalls;
CREATE POLICY recall_org_isolation ON recalls
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE recall_batch_freeze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS freeze_org_isolation ON recall_batch_freeze;
CREATE POLICY freeze_org_isolation ON recall_batch_freeze
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
