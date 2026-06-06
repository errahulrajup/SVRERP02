-- ============================================================================
-- 0. Prerequisite: cost_centers and batch_hours tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  name text NOT NULL,
  code text UNIQUE
);

CREATE SCHEMA IF NOT EXISTS fin;

CREATE TABLE IF NOT EXISTS fin.utility_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  site_id text DEFAULT 'SITE-MAIN',
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  utility_type text NOT NULL CHECK (utility_type IN ('ELECTRICITY', 'DIESEL', 'WATER', 'STEAM')),
  reading_date date NOT NULL,
  qty_consumed numeric(12,3) NOT NULL CHECK (qty_consumed > 0),
  unit text NOT NULL,
  rate numeric(12,4) NOT NULL CHECK (rate >= 0),
  total_cost numeric(12,2) GENERATED ALWAYS AS (round(qty_consumed * rate, 2)) STORED,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin.overhead_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  site_id text DEFAULT 'SITE-MAIN',
  cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  allocation_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  allocation_basis text NOT NULL CHECK (allocation_basis IN ('DIRECT', 'MACHINE_HOURS', 'LABOR_HOURS', 'SQUARE_FOOTAGE')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  batch_id text REFERENCES public.batches(id),
  cost_center_id uuid,
  hours_used numeric(8,2) DEFAULT 0,
  machine_hours numeric(8,2) DEFAULT 0,
  labor_hours numeric(8,2) DEFAULT 0,
  start_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- RPC: RECORD_UTILITY_CONSUMPTION
-- ============================================================================
CREATE OR REPLACE FUNCTION record_utility_consumption(
  p_cost_center_id uuid,
  p_utility_type text,
  p_reading_date date,
  p_qty_consumed numeric,
  p_unit text,
  p_rate numeric,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_total_cost numeric;
  v_utility_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  v_total_cost := p_qty_consumed * p_rate;

  INSERT INTO fin.utility_consumption (
    id, org_id, site_id, cost_center_id, utility_type, reading_date,
    qty_consumed, unit, rate, total_cost, created_by
  ) VALUES (
    gen_random_uuid(), v_org_id, 'SITE-MAIN', p_cost_center_id, p_utility_type, p_reading_date,
    p_qty_consumed, p_unit, p_rate, v_total_cost, p_user_id
  ) RETURNING id INTO v_utility_id;

  -- Auto-create expense entry
  INSERT INTO expenses (
    id, org_id, date, category, description, amount, recorded_by, source
  ) VALUES (
    gen_random_uuid(), v_org_id, p_reading_date, 'Utilities',
    p_utility_type || ' - ' || p_qty_consumed || ' ' || p_unit,
    v_total_cost, (SELECT name FROM profiles WHERE id = p_user_id), 'utility_auto'
  );

  RETURN jsonb_build_object('success', true, 'utility_id', v_utility_id);
END; $$;

-- ============================================================================
-- RPC: ALLOCATE_OVERHEAD
-- ============================================================================
CREATE OR REPLACE FUNCTION allocate_overhead(
  p_cost_center_id uuid,
  p_allocation_date date,
  p_amount numeric,
  p_allocation_basis text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_allocation_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  INSERT INTO fin.overhead_allocations (
    id, org_id, site_id, cost_center_id, allocation_date,
    amount, allocation_basis, created_by
  ) VALUES (
    gen_random_uuid(), v_org_id, 'SITE-MAIN', p_cost_center_id, p_allocation_date,
    p_amount, p_allocation_basis, p_user_id
  ) RETURNING id INTO v_allocation_id;

  -- Auto-create expense
  INSERT INTO expenses (
    id, org_id, date, category, description, amount, recorded_by, source
  ) VALUES (
    gen_random_uuid(), v_org_id, p_allocation_date, 'Overheads',
    'Overhead allocation - ' || p_allocation_basis,
    p_amount, (SELECT name FROM profiles WHERE id = p_user_id), 'overhead_auto'
  );

  RETURN jsonb_build_object('success', true, 'allocation_id', v_allocation_id);
END; $$;

-- ============================================================================
-- VIEW: UTILITY ALLOCATION PER BATCH
-- ============================================================================
CREATE OR REPLACE VIEW utility_allocation_per_batch AS
SELECT 
  b.id as batch_id,
  b.batch_no,
  b.product,
  cc.name as cost_center,
  uc.utility_type,
  ROUND(uc.total_cost * (bh.hours_used / NULLIF(cc_monthly_hours.total_hours, 0)), 2) as allocated_cost
FROM batches b
JOIN batch_hours bh ON bh.batch_id = b.id
JOIN public.cost_centers cc ON cc.id = bh.cost_center_id
JOIN fin.utility_consumption uc ON uc.cost_center_id = cc.id 
  AND uc.reading_date BETWEEN b.start_time::date AND COALESCE(b.end_time::date, CURRENT_DATE)
LEFT JOIN (
  SELECT cost_center_id, SUM(hours_used) as total_hours
  FROM batch_hours 
  WHERE start_time >= date_trunc('month', CURRENT_DATE)
  GROUP BY cost_center_id
) cc_monthly_hours ON cc_monthly_hours.cost_center_id = cc.id;
