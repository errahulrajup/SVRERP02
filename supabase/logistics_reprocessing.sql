-- Migration: Logistics, Packaging, Holding, Returns & Reprocessing
-- Adds tables to support separated packaging runs, warehousing, and returns

-- 1. Locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('RM Store', 'PM Store', 'Bulk Store', 'FG Store', 'Quarantine', 'Incubation Zone')),
  temperature_zone text,
  created_at timestamptz DEFAULT now()
);

-- 2. Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL, -- The lot_id or fg_lot_id being transferred
  item_type text NOT NULL CHECK (item_type IN ('RM', 'PM', 'BULK', 'FG')),
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid REFERENCES locations(id),
  qty numeric NOT NULL,
  transferred_by uuid,
  transfer_date timestamptz DEFAULT now(),
  reason text
);

-- 3. Bulk Lots
CREATE TABLE IF NOT EXISTS bulk_lots (
  id text PRIMARY KEY,
  product_id uuid NOT NULL,
  batch_id text NOT NULL,
  qty_produced numeric NOT NULL,
  qty_available numeric NOT NULL,
  location_id uuid REFERENCES locations(id),
  status text DEFAULT 'PENDING_QC',
  created_at timestamptz DEFAULT now()
);

-- 4. Packaging Runs
CREATE TABLE IF NOT EXISTS packaging_runs (
  id text PRIMARY KEY,
  bulk_lot_id text REFERENCES bulk_lots(id),
  pm_lot_id text, -- ID of the packaging material lot consumed
  pm_qty_consumed numeric NOT NULL,
  bulk_qty_consumed numeric NOT NULL,
  fg_lot_id text, -- Links to the FG lot created
  run_date timestamptz DEFAULT now(),
  operator_id uuid,
  notes text
);

-- 5. Wastage Logs
CREATE TABLE IF NOT EXISTS wastage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type text NOT NULL CHECK (item_type IN ('RM', 'PM', 'BULK', 'FG')),
  reference_id text NOT NULL, -- The lot_id, bulk_lot_id, or fg_lot_id
  qty numeric NOT NULL,
  reason text NOT NULL,
  logged_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 6. Sales Returns
CREATE TABLE IF NOT EXISTS sales_returns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id uuid, -- Reference to original dispatch if tracked
  invoice_no text,
  fg_lot_id text NOT NULL,
  qty numeric NOT NULL,
  return_date timestamptz DEFAULT now(),
  reason text,
  status text DEFAULT 'PENDING_QC' CHECK (status IN ('PENDING_QC', 'DISPOSITIONED'))
);

-- 7. Return QC & Disposition
CREATE TABLE IF NOT EXISTS return_qc (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id uuid REFERENCES sales_returns(id),
  primary_pm_status text NOT NULL CHECK (primary_pm_status IN ('OK', 'DAMAGED')),
  secondary_pm_status text NOT NULL CHECK (secondary_pm_status IN ('OK', 'DAMAGED')),
  tertiary_pm_status text,
  product_status text NOT NULL CHECK (product_status IN ('OK', 'SPOILED')),
  disposition_action text NOT NULL CHECK (disposition_action IN ('REPACK', 'REPROCESS', 'DISCARD', 'OK')),
  new_lot_id text, -- Tracking what new lot was created
  qc_by uuid,
  qc_date timestamptz DEFAULT now(),
  notes text
);

-- Add holding fields to FG Lots if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='location_id') THEN
    ALTER TABLE fg_lots ADD COLUMN location_id uuid REFERENCES locations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='release_date') THEN
    ALTER TABLE fg_lots ADD COLUMN release_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='holding_status') THEN
    ALTER TABLE fg_lots ADD COLUMN holding_status text DEFAULT 'RELEASED' CHECK (holding_status IN ('INCUBATION', 'MATURATION', 'RELEASED', 'QUARANTINE', 'HOLD'));
  END IF;
END $$;

-- RLS for all tables in this file (were missing — added to prevent anon key access)
ALTER TABLE locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_lots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_qc       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'allow_authenticated_locations') THEN
    CREATE POLICY allow_authenticated_locations ON locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'allow_authenticated_stock_transfers') THEN
    CREATE POLICY allow_authenticated_stock_transfers ON stock_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bulk_lots' AND policyname = 'allow_authenticated_bulk_lots') THEN
    CREATE POLICY allow_authenticated_bulk_lots ON bulk_lots FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'packaging_runs' AND policyname = 'allow_authenticated_packaging_runs') THEN
    CREATE POLICY allow_authenticated_packaging_runs ON packaging_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wastage_logs' AND policyname = 'allow_authenticated_wastage_logs') THEN
    CREATE POLICY allow_authenticated_wastage_logs ON wastage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_returns' AND policyname = 'allow_authenticated_sales_returns') THEN
    CREATE POLICY allow_authenticated_sales_returns ON sales_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_qc' AND policyname = 'allow_authenticated_return_qc') THEN
    CREATE POLICY allow_authenticated_return_qc ON return_qc FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

