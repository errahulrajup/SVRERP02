-- ================================================================
-- General Stores & Maintenance Module
-- ================================================================

-- Item Master (Pencil, Bulb, Knife, Spare Parts, etc.)
CREATE TABLE IF NOT EXISTS store_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',  -- General, Maintenance, Stationery, Electrical, Cleaning, IT, Safety
  unit text NOT NULL DEFAULT 'pcs',
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock_level numeric DEFAULT 0,         -- Alert if stock falls below this
  is_maintenance_part boolean DEFAULT false, -- True = spare part / maintenance item
  equipment_tag text,                        -- Which machine/area it belongs to (if maintenance)
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indent / Requisition (Raised by any department)
CREATE TABLE IF NOT EXISTS store_indents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indent_no text UNIQUE NOT NULL,
  department text NOT NULL,  -- Production, QC, Dispatch, Store, Accounts, Packaging, Maintenance
  requested_by text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  item_id uuid REFERENCES store_items(id),
  item_name text NOT NULL,   -- free text in case item not in master
  qty_requested numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  purpose text,              -- Reason / purpose for request
  is_maintenance boolean DEFAULT false,
  equipment_tag text,        -- If maintenance, which equipment
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PURCHASED', 'ISSUED', 'REJECTED')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Store Transactions (IN = Purchase, OUT = Issue/Consumption)
CREATE TABLE IF NOT EXISTS store_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  txn_type text NOT NULL CHECK (txn_type IN ('IN', 'OUT')),
  item_id uuid REFERENCES store_items(id),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  qty numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  rate numeric,              -- Rate per unit (optional)
  amount numeric,            -- qty * rate (optional)
  has_bill boolean DEFAULT false,
  bill_no text,              -- Bill/invoice number if available
  vendor text,               -- Supplier name (for IN)
  department text,           -- Department (for OUT — issued to whom)
  indent_id uuid REFERENCES store_indents(id),  -- Link to indent if any
  is_maintenance boolean DEFAULT false,
  equipment_tag text,
  notes text,
  entered_by text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Auto-update current stock on transactions
CREATE OR REPLACE FUNCTION update_store_item_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    IF NEW.txn_type = 'IN' THEN
      UPDATE store_items SET current_stock = current_stock + NEW.qty WHERE id = NEW.item_id;
    ELSIF NEW.txn_type = 'OUT' THEN
      UPDATE store_items SET current_stock = current_stock - NEW.qty WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_stock ON store_transactions;
CREATE TRIGGER trg_store_stock
  AFTER INSERT ON store_transactions
  FOR EACH ROW EXECUTE FUNCTION update_store_item_stock();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_transactions_item ON store_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_store_transactions_date ON store_transactions(txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_indents_status ON store_indents(status);
CREATE INDEX IF NOT EXISTS idx_store_indents_dept ON store_indents(department);

-- RLS (permissive for now — same as other tables)
ALTER TABLE store_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_indents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_transactions ENABLE ROW LEVEL SECURITY;

drop policy if exists "allow_all_store_items" on store_items;
CREATE POLICY "allow_all_store_items"   ON store_items        FOR ALL USING (true) WITH CHECK (true);
drop policy if exists "allow_all_store_indents" on store_indents;
CREATE POLICY "allow_all_store_indents" ON store_indents       FOR ALL USING (true) WITH CHECK (true);
drop policy if exists "allow_all_store_txns" on store_transactions;
CREATE POLICY "allow_all_store_txns"    ON store_transactions  FOR ALL USING (true) WITH CHECK (true);
