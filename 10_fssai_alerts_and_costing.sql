-- ============================================================================
-- 0. Prerequisite: labor_hours table (referenced by batch_costing_view below)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.labor_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  batch_id text REFERENCES public.batches(id),
  employee_id uuid,
  hours_worked numeric(8,2),
  hourly_rate numeric(10,2) DEFAULT 150,
  date date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 1. Expiry Alert Cron Function
-- ============================================================================
CREATE OR REPLACE FUNCTION check_expiring_lots() RETURNS void AS $$
BEGIN
  INSERT INTO notifications (org_id, type, title, message, severity)
  SELECT 
    org_id, 'expiry_warning',
    'Lot Expiring Soon',
    'Lot ' || lot_no || ' (' || material || ') expires on ' || expiry_date,
    CASE 
      WHEN expiry_date - CURRENT_DATE <= 30 THEN 'high'
      WHEN expiry_date - CURRENT_DATE <= 60 THEN 'medium'
      ELSE 'low'
    END
  FROM lots 
  WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    AND remaining_qty > 0
    AND qc_status = 'APPROVED';
END; $$ LANGUAGE plpgsql;

-- Supabase cron scheduling command (to be run via SQL editor or pg_cron):
-- SELECT cron.schedule('expiry-check', '0 9 * * *', 'SELECT check_expiring_lots()');

-- ============================================================================
-- 2. Real-Time Batch Costing View
-- ============================================================================
CREATE OR REPLACE VIEW batch_costing_view AS
SELECT 
  b.id, b.batch_no, b.product,
  b.planned_qty, b.actual_qty, b.unit,
  COALESCE(SUM(cl.cost), 0) as rm_cost,
  COALESCE(lh.total_labor, 0) as labor_cost,
  b.overhead,
  COALESCE(SUM(cl.cost), 0) + COALESCE(lh.total_labor, 0) + COALESCE(b.overhead, 0) as total_cost,
  CASE WHEN b.actual_qty > 0 
    THEN (COALESCE(SUM(cl.cost), 0) + COALESCE(lh.total_labor, 0) + COALESCE(b.overhead, 0)) / b.actual_qty 
    ELSE 0 END as unit_cost
FROM batches b
LEFT JOIN consumed_lots cl ON cl.batch_id = b.id
LEFT JOIN (
  SELECT batch_id, SUM(hours_worked * hourly_rate) as total_labor 
  FROM labor_hours GROUP BY batch_id
) lh ON lh.batch_id = b.id
GROUP BY b.id, b.batch_no, b.product, b.planned_qty, b.actual_qty, b.unit, b.overhead, lh.total_labor;
