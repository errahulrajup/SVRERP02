-- ============================================================
-- Phase 7 Inventory & Material Control Upgrade
-- ============================================================

-- 1. Add erp_product_id to GRNs and Lots to link strictly to Material Master
ALTER TABLE public.grns
ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.lots
ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Create Stock Ledger Table
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id TEXT REFERENCES public.lots(id) ON DELETE CASCADE,
    fg_lot_id TEXT REFERENCES public.fg_lots(id) ON DELETE CASCADE,
    erp_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
    qty_change NUMERIC(12,3) NOT NULL, -- positive for IN, negative for OUT
    reference_id TEXT, -- e.g. dispatch_id, invoice_id, or production_run_id
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Trigger to Auto-Update Lots/FgLots Remaining Qty based on Ledger inserts
CREATE OR REPLACE FUNCTION update_lot_remaining_qty()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lot_id IS NOT NULL THEN
        UPDATE public.lots
        SET remaining_qty = remaining_qty + NEW.qty_change
        WHERE id = NEW.lot_id;
    END IF;
    IF NEW.fg_lot_id IS NOT NULL THEN
        UPDATE public.fg_lots
        SET available_qty = available_qty + NEW.qty_change
        WHERE id = NEW.fg_lot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lot_qty ON public.stock_ledger;

CREATE TRIGGER trigger_update_lot_qty
AFTER INSERT ON public.stock_ledger
FOR EACH ROW
EXECUTE FUNCTION update_lot_remaining_qty();

-- RLS for stock_ledger (was missing — added to prevent anon key access)
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_ledger' AND policyname = 'allow_authenticated_stock_ledger') THEN
    CREATE POLICY allow_authenticated_stock_ledger ON public.stock_ledger
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
