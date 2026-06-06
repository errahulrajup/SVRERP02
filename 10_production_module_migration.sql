-- ============================================================================
-- 10_production_module_migration.sql
-- Run this before creating RPC
-- ============================================================================

-- 1. Add columns to batches for completion tracking
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS actual_yield numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_rm_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qc_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS qc_remarks text,
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS end_time timestamptz;

-- 2. Add columns to fg_lots for traceability
ALTER TABLE fg_lots 
ADD COLUMN IF NOT EXISTS coa_no text,
ADD COLUMN IF NOT EXISTS coa_issued boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS coa_date date;

-- 3. Index for traceability queries - FSSAI asks "which RM in which FG"
CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch_trace 
ON stock_ledger(reference_id) WHERE transaction_type = 'OUT' AND lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fg_lots_batch_id ON fg_lots(batch_id);
CREATE INDEX IF NOT EXISTS idx_consumed_lots_batch_id ON consumed_lots(batch_id);

-- 4. Add source tracking to expenses for better P&L split
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
CHECK (source IN ('manual', 'grn_auto', 'utility_auto', 'overhead_auto', 'production_auto'));
