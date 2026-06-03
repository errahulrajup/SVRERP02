-- ============================================================
-- SFMOS v3.2 — Master Enterprise Architecture Schema Upgrades
-- ============================================================

-- Create new schemas if they do not exist
CREATE SCHEMA IF NOT EXISTS procurement;
CREATE SCHEMA IF NOT EXISTS cold_storage;
CREATE SCHEMA IF NOT EXISTS regulatory;
CREATE SCHEMA IF NOT EXISTS kpi;
CREATE SCHEMA IF NOT EXISTS trade;
CREATE SCHEMA IF NOT EXISTS cm;
CREATE SCHEMA IF NOT EXISTS rnd;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS logistics;
CREATE SCHEMA IF NOT EXISTS sales;

-- ============================================================
-- 1. Unified Master Data & Item Relationships
-- ============================================================

CREATE TABLE IF NOT EXISTS md.item_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  parent_item_id uuid NOT NULL REFERENCES md.items(id), -- Finished good or WIP item
  child_item_id uuid NOT NULL REFERENCES md.items(id),  -- Raw material, packaging, or intermediate
  relation_type text NOT NULL CHECK (relation_type IN ('BOM_INGREDIENT', 'SUBSTITUTE', 'PACKAGING_DEFAULT')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, site_id, parent_item_id, child_item_id, relation_type)
);

CREATE TABLE IF NOT EXISTS md.skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  item_id uuid NOT NULL REFERENCES md.items(id),        -- Base Item (e.g. Margarine FG)
  code text NOT NULL,                                   -- SKU code (e.g. MARG-15KG)
  name text NOT NULL,                                   -- SKU name (e.g. Margarine 15kg Tub)
  pack_size_kg numeric(12,3) NOT NULL CHECK (pack_size_kg > 0),
  base_uom text NOT NULL DEFAULT 'kg',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, site_id, code)
);

-- ============================================================
-- 2. Versioned Packaging BOM & Artwork Control
-- ============================================================

CREATE TABLE IF NOT EXISTS recipe.packaging_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  sku_id uuid NOT NULL REFERENCES md.skus(id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no > 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (org_id, site_id, sku_id, version_no)
);

CREATE TABLE IF NOT EXISTS recipe.packaging_bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_bom_id uuid NOT NULL REFERENCES recipe.packaging_bom(id) ON DELETE CASCADE,
  pm_item_id uuid NOT NULL REFERENCES md.items(id), -- Cardboard, inner liner, tape, label
  qty_per_sku numeric(12,4) NOT NULL CHECK (qty_per_sku > 0),
  scrap_pct numeric(6,2) NOT NULL DEFAULT 0,
  artwork_reference text,                           -- DMS vault path for verification
  UNIQUE (packaging_bom_id, pm_item_id)
);

-- ============================================================
-- 3. HR & LMS Training Records
-- ============================================================

CREATE TABLE IF NOT EXISTS hr.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  employee_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  department text NOT NULL CHECK (department IN ('PRODUCTION','PACKING','STORE','MAINTENANCE','DISPATCH','QA','SAFETY','HR')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, employee_code)
);

CREATE TABLE IF NOT EXISTS hr.training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  employee_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE RESTRICT,
  sop_id text NOT NULL,                         -- References public.sops(id)
  trained_by_id uuid NOT NULL REFERENCES hr.employees(id),
  training_date date NOT NULL DEFAULT current_date,
  evaluation_score numeric(5,2),
  status text NOT NULL DEFAULT 'PASSED' CHECK (status IN ('PASSED', 'FAILED', 'PENDING_EVALUATION')),
  remarks text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. Cold Chain & Continuous Frozen Processing
-- ============================================================

CREATE TABLE IF NOT EXISTS cold_storage.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  code text NOT NULL,
  name text NOT NULL,
  target_temp_c numeric(5,2) NOT NULL DEFAULT -18.00,
  min_temp_c numeric(5,2) NOT NULL DEFAULT -22.00,
  max_temp_c numeric(5,2) NOT NULL DEFAULT -15.00,
  UNIQUE (org_id, site_id, code)
);

CREATE TABLE IF NOT EXISTS cold_storage.temperature_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cold_storage.rooms(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  temperature_c numeric(5,2) NOT NULL,
  recorded_by text
);

CREATE TABLE IF NOT EXISTS cold_storage.alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cold_storage.rooms(id) ON DELETE CASCADE,
  alarm_type text NOT NULL CHECK (alarm_type IN ('TEMP_HIGH', 'TEMP_LOW', 'DOOR_OPEN', 'POWER_FAIL')),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text
);

-- ============================================================
-- 5. Costing Engine (Utilities, Labor, Allocations)
-- ============================================================

CREATE TABLE IF NOT EXISTS fin.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE (org_id, site_id, code)
);

CREATE TABLE IF NOT EXISTS fin.utility_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  cost_center_id uuid REFERENCES fin.cost_centers(id),
  utility_type text NOT NULL CHECK (utility_type IN ('ELECTRICITY', 'DIESEL', 'WATER', 'STEAM')),
  reading_date date NOT NULL,
  qty_consumed numeric(12,3) NOT NULL CHECK (qty_consumed > 0),
  unit text NOT NULL,
  rate numeric(12,4) NOT NULL CHECK (rate >= 0),
  total_cost numeric(12,2) GENERATED ALWAYS AS (round(qty_consumed * rate, 2)) STORED
);

CREATE TABLE IF NOT EXISTS fin.labor_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  batch_id uuid NOT NULL REFERENCES mfg.batches(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr.employees(id),
  hours_worked numeric(5,2) NOT NULL CHECK (hours_worked > 0),
  hourly_rate numeric(12,2) NOT NULL CHECK (hourly_rate >= 0)
);

CREATE TABLE IF NOT EXISTS fin.overhead_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  cost_center_id uuid NOT NULL REFERENCES fin.cost_centers(id),
  allocation_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  allocation_basis text NOT NULL CHECK (allocation_basis IN ('DIRECT', 'MACHINE_HOURS', 'LABOR_HOURS', 'SQUARE_FOOTAGE'))
);

-- ============================================================
-- 6. Logistics Pallet Tracker
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics.pallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  pallet_code text NOT NULL,
  status text NOT NULL DEFAULT 'IN_CUSTODY' CHECK (status IN ('IN_CUSTODY', 'SHIPPED', 'STOWED', 'DISMANTLED')),
  tare_weight numeric(12,3) NOT NULL DEFAULT 25.000,
  gross_weight numeric(12,3),
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, site_id, pallet_code)
);

CREATE TABLE IF NOT EXISTS logistics.pallet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id uuid NOT NULL REFERENCES logistics.pallets(id) ON DELETE CASCADE,
  fg_lot_id uuid NOT NULL REFERENCES inv.lots(id),
  qty_packed integer NOT NULL CHECK (qty_packed > 0),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. Batch Status & Packing Manager OEE
-- ============================================================

-- Add Status Transitions to batches
ALTER TABLE mfg.batches
  DROP CONSTRAINT IF EXISTS batches_status_check,
  ADD CONSTRAINT batches_status_check CHECK (status IN ('PLANNED', 'ISSUED', 'IN_PROCESS', 'QC_HOLD', 'PACKING', 'RELEASED', 'DISPATCHED', 'RECALLED', 'CLOSED'));

CREATE TABLE IF NOT EXISTS mfg.packing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  po_code text NOT NULL,
  batch_id uuid NOT NULL REFERENCES mfg.batches(id),
  sku_id uuid NOT NULL REFERENCES md.skus(id),
  planned_qty integer NOT NULL CHECK (planned_qty > 0),
  actual_qty integer DEFAULT 0,
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'RUNNING', 'COMPLETED', 'CANCELLED')),
  artwork_verified boolean DEFAULT false,
  label_verified boolean DEFAULT false,
  changeover_duration_min integer DEFAULT 0,
  downtime_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, site_id, po_code)
);

-- ============================================================
-- 8. Customer Basket Growth Engine View
-- ============================================================

CREATE OR REPLACE VIEW sales.customer_basket_analysis AS
SELECT 
  o.org_id,
  o.site_id,
  o.customer_id,
  c.name AS customer_name,
  i.id AS product_item_id,
  i.name AS product_name,
  COALESCE(SUM(l.qty), 0) AS total_qty_purchased,
  CASE WHEN COALESCE(SUM(l.qty), 0) > 0 THEN true ELSE false END AS active_buyer
FROM md.customers c
CROSS JOIN md.items i
LEFT JOIN fin.dispatch_orders o ON o.customer_id = c.id
LEFT JOIN fin.dispatch_lines l ON l.dispatch_order_id = o.id AND l.item_id = i.id
WHERE i.item_type = 'FINISHED_GOOD'
GROUP BY o.org_id, o.site_id, o.customer_id, c.name, i.id, i.name;

-- ============================================================
-- 9. Contract Manufacturing
-- ============================================================

CREATE TABLE IF NOT EXISTS cm.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  name text NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('CUSTOMER_OWNED_BRAND', 'THIRD_PARTY_MANUFACTURER')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cm.manufacturing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  partner_id uuid NOT NULL REFERENCES cm.partners(id),
  planned_qty numeric(12,3) NOT NULL,
  recipe_version_id uuid REFERENCES recipe.recipe_versions(id),
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PRODUCTION', 'COMPLETED', 'SHIPPED')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 10. R&D Projects & History Dev
-- ============================================================

CREATE TABLE IF NOT EXISTS rnd.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  name text NOT NULL,
  objective text,
  target_launch_date date,
  status text NOT NULL DEFAULT 'IDEA' CHECK (status IN ('IDEA', 'LAB_TRIAL', 'PILOT_SCALE', 'COMMERCIAL_SCALE', 'LAUNCHED', 'SHELVED'))
);

CREATE TABLE IF NOT EXISTS rnd.scaleup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES rnd.projects(id) ON DELETE CASCADE,
  scaleup_stage text NOT NULL CHECK (scaleup_stage IN ('LAB_TRIAL', 'PILOT_TRIAL', 'COMMERCIAL_TRIAL')),
  batch_scale_kg numeric(12,3) NOT NULL,
  yield_achieved_pct numeric(5,2),
  process_loss_kg numeric(12,3),
  evaluated_by uuid REFERENCES auth.users(id),
  evaluation_verdict text CHECK (evaluation_verdict IN ('APPROVED_FOR_SCALEUP', 'REJECTED_RETRY')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 11. Seasonal Procurement
-- ============================================================

CREATE TABLE IF NOT EXISTS procurement.crop_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  crop_name text NOT NULL CHECK (crop_name IN ('GREEN_PEA', 'SWEET_CORN', 'OTHER')),
  season_year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  estimated_tonnage numeric(12,3),
  UNIQUE (org_id, site_id, crop_name, season_year)
);

CREATE TABLE IF NOT EXISTS procurement.farmer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES procurement.crop_seasons(id) ON DELETE RESTRICT,
  farmer_name text NOT NULL,
  mandi_code text,
  contracted_qty_tons numeric(12,3) NOT NULL,
  rate_per_ton numeric(12,2) NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS procurement.harvest_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES procurement.farmer_contracts(id),
  receipt_no text NOT NULL,
  gross_weight_kg numeric(12,3) NOT NULL,
  tare_weight_kg numeric(12,3) NOT NULL,
  net_weight_kg numeric(12,3) GENERATED ALWAYS AS (gross_weight_kg - tare_weight_kg) STORED,
  moisture_pct numeric(5,2),
  sorting_loss_pct numeric(5,2),
  quality_grade text CHECK (quality_grade IN ('PREMIUM_A', 'STANDARD_B', 'REJECT')),
  received_at timestamptz DEFAULT now(),
  UNIQUE (receipt_no)
);

-- ============================================================
-- 12. Export Documents
-- ============================================================

CREATE TABLE IF NOT EXISTS regulatory.country_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  country_code text NOT NULL,
  allergen_language_rules text,
  halal_required boolean DEFAULT false,
  kosher_required boolean DEFAULT false,
  mrl_limits jsonb,
  UNIQUE (org_id, country_code)
);

CREATE TABLE IF NOT EXISTS regulatory.export_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  dispatch_order_id uuid NOT NULL REFERENCES fin.dispatch_orders(id),
  certificate_type text NOT NULL CHECK (certificate_type IN ('PHYTOSANITARY', 'ORIGIN', 'HEALTH', 'HALAL_BATCH')),
  certificate_no text NOT NULL,
  issued_by text NOT NULL,
  expiry_date date,
  document_vault_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (certificate_no)
);

-- ============================================================
-- 13. KPI Scorecards
-- ============================================================

CREATE TABLE IF NOT EXISTS kpi.hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  level_tier integer NOT NULL CHECK (level_tier IN (1, 2, 3)),
  kpi_name text NOT NULL,
  parent_kpi_id uuid REFERENCES kpi.hierarchy(id),
  target_value numeric(12,4),
  actual_value numeric(12,4),
  unit text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 14. Final Architecture Corrections
-- ============================================================

-- Farmers master
CREATE TABLE IF NOT EXISTS procurement.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  code text NOT NULL,
  name text NOT NULL,
  contact_no text,
  address text,
  UNIQUE (org_id, site_id, code)
);

ALTER TABLE procurement.farmer_contracts
  ADD COLUMN IF NOT EXISTS farmer_id uuid REFERENCES procurement.farmers(id) ON DELETE RESTRICT;

-- Cold storage hourly summaries
CREATE TABLE IF NOT EXISTS cold_storage.temperature_hourly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cold_storage.rooms(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  summary_hour integer NOT NULL CHECK (summary_hour >= 0 AND summary_hour <= 23),
  avg_temperature numeric(5,2) NOT NULL,
  min_temperature numeric(5,2) NOT NULL,
  max_temperature numeric(5,2) NOT NULL,
  UNIQUE (room_id, summary_date, summary_hour)
);

-- Brand registry and ownership links
CREATE TABLE IF NOT EXISTS md.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  code text NOT NULL,
  name text NOT NULL,
  client_partner_id uuid REFERENCES cm.partners(id),
  UNIQUE (org_id, site_id, code)
);

CREATE TABLE IF NOT EXISTS cm.batch_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES mfg.batches(id) ON DELETE CASCADE,
  owner_type text NOT NULL CHECK (owner_type IN ('SRIVRIDDHI', 'PARTNER')),
  partner_id uuid REFERENCES cm.partners(id),
  raw_materials_provided_by text NOT NULL CHECK (raw_materials_provided_by IN ('SRIVRIDDHI', 'PARTNER')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cm.batch_ownership
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES md.brands(id) ON DELETE RESTRICT;

-- Export product registrations
CREATE TABLE IF NOT EXISTS regulatory.product_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  sku_id uuid NOT NULL REFERENCES md.skus(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  registration_no text NOT NULL,
  approval_date date,
  expiry_date date,
  label_artwork_approved boolean DEFAULT false,
  UNIQUE (org_id, site_id, sku_id, country_code)
);

-- KPI Definitions & Snapshots
CREATE TABLE IF NOT EXISTS kpi.definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  code text NOT NULL,
  name text NOT NULL,
  tier_level integer NOT NULL CHECK (tier_level IN (1, 2, 3)),
  target_value numeric(12,4),
  unit text,
  UNIQUE (org_id, site_id, code)
);

CREATE TABLE IF NOT EXISTS kpi.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES kpi.definitions(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  actual_value numeric(12,4) NOT NULL,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Trading Division
CREATE TABLE IF NOT EXISTS trade.purchase_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  item_id uuid NOT NULL REFERENCES md.items(id),
  qty numeric(12,3) NOT NULL CHECK (qty > 0),
  unit_cost numeric(12,4) NOT NULL CHECK (unit_cost >= 0),
  supplier_id uuid NOT NULL REFERENCES md.suppliers(id),
  received_date date NOT NULL DEFAULT current_date
);

CREATE TABLE IF NOT EXISTS trade.repack_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  source_lot_id uuid NOT NULL REFERENCES inv.lots(id),
  target_sku_id uuid NOT NULL REFERENCES md.skus(id),
  input_qty numeric(12,3) NOT NULL CHECK (input_qty > 0),
  output_qty integer NOT NULL CHECK (output_qty > 0),
  waste_qty numeric(12,3) DEFAULT 0,
  run_date date NOT NULL DEFAULT current_date,
  operator_id uuid REFERENCES auth.users(id)
);

-- Dynamic trading margins
CREATE OR REPLACE VIEW trade.margin_analysis AS
SELECT 
  dl.id AS dispatch_line_id,
  dl.item_id,
  i.name AS item_name,
  dl.qty AS qty_sold,
  dl.rate AS selling_rate,
  pl.unit_cost AS purchase_unit_cost,
  (dl.qty * dl.rate) AS revenue,
  (dl.qty * pl.unit_cost) AS cogs,
  (dl.qty * dl.rate) - (dl.qty * pl.unit_cost) AS gross_margin,
  CASE WHEN (dl.qty * dl.rate) > 0 
       THEN round((((dl.qty * dl.rate) - (dl.qty * pl.unit_cost)) / (dl.qty * dl.rate)) * 100, 2) 
       ELSE 0 END AS gross_margin_pct
FROM fin.dispatch_lines dl
JOIN md.items i ON i.id = dl.item_id
LEFT JOIN trade.purchase_lots pl ON pl.item_id = dl.item_id
WHERE i.item_type = 'FINISHED_GOOD';

-- Corporate licenses vault
CREATE TABLE IF NOT EXISTS dms.corporate_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES iam.orgs(id),
  site_id uuid NOT NULL REFERENCES md.sites(id),
  license_type text NOT NULL CHECK (license_type IN ('FSSAI_CENTRAL', 'FSSAI_STATE', 'GSTIN', 'TRADEMARK', 'IMPORT_EXPORT_CODE', 'INSURANCE', 'FACTORY_LICENSE', 'BOILER_CERTIFICATE', 'POLLUTION_NOC', 'OTHER')),
  license_no text NOT NULL,
  issued_date date,
  expiry_date date,
  document_version_id uuid REFERENCES dms.document_versions(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, site_id, license_type, license_no)
);

-- Trading inward goods RPC helper
CREATE OR REPLACE FUNCTION inv.receive_trading_goods(
  target_org_id uuid,
  target_item_id uuid,
  target_lot_code text,
  target_qty numeric,
  target_expiry_date date,
  target_unit_cost numeric,
  target_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  new_lot_id uuid;
  mv_id uuid;
begin
  -- 1. Insert Finished Good lot directly into inv.lots
  INSERT INTO inv.lots (org_id, item_id, lot_code, lot_type, status, expiry_date)
  VALUES (target_org_id, target_item_id, target_lot_code, 'FG', 'APPROVED', target_expiry_date)
  RETURNING id INTO new_lot_id;

  -- 2. Log inward movement
  INSERT INTO inv.movements (org_id, movement_type, qty, lot_id, occurred_at, created_by, unit_cost, total_value)
  VALUES (target_org_id, 'GRN_IN', target_qty, new_lot_id, now(), target_created_by, target_unit_cost, target_qty * target_unit_cost)
  RETURNING id INTO mv_id;

  RETURN new_lot_id;
end;
$$;
