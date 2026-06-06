-- ============================================================
-- SVRERP — ALL-PHASE DUMMY/TEST SEED DATA (Aligned with gl_seed org)
-- ============================================================

-- Bypass browser direct write blocking trigger for CLI seeds
SET app.workflow_context = 'rpc';

-- 1. Organizations
INSERT INTO public.organizations (id, name) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'Srivriddhi Foods Pvt Ltd') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO iam.orgs (id, name, gstin) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'Srivriddhi Foods Pvt Ltd', '36AABCS1429B1ZB') 
ON CONFLICT (id) DO NOTHING;

-- 2. Sites
INSERT INTO md.sites (id, org_id, code, name) 
VALUES ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'SITE-MAIN', 'Srivriddhi Main Plant') 
ON CONFLICT (id) DO NOTHING;

-- 3. Users / Profiles
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, confirmation_token)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'admin@srivriddhi.com',
  '$2a$10$abcdefghijklmnopqrstuv',
  now(),
  '{"role": "ADMIN"}'::jsonb,
  '{"name": "System Admin"}'::jsonb,
  'authenticated',
  'authenticated',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, org_id, email, name, role, is_active)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@srivriddhi.com',
  'System Admin',
  'ADMIN',
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. Master Items (Phase 2)
INSERT INTO md.items (id, org_id, item_type, code, name, base_uom, gst_pct, allergens, is_active)
VALUES 
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'RM-OIL', 'Sunflower Oil', 'kg', 5.00, '{}', true),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PACKAGING', 'PM-BOX', 'Carton Box 15kg', 'pcs', 18.00, '{}', true),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'FINISHED_GOOD', 'FG-BUTTER', 'PlantSmör Butter', 'kg', 12.00, '{}', true)
ON CONFLICT (id) DO NOTHING;

-- 5. SKUs (Phase 2)
INSERT INTO md.skus (id, org_id, site_id, item_id, code, name, pack_size_kg, base_uom, is_active)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'SKU-BUTTER-15KG', 'PlantSmör Butter 15kg Tub', 15.000, 'kg', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Partners & Brands (Phase 2)
INSERT INTO cm.partners (id, org_id, site_id, name, relationship_type, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Hotel Grand', 'CUSTOMER_OWNED_BRAND', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO md.brands (id, org_id, site_id, code, name, client_partner_id)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'BR-SVR', 'PlantSmör', NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. Customers & Suppliers (Phase 2)
INSERT INTO md.customers (id, org_id, code, name, gstin, credit_terms_days)
VALUES
  ('c5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CUST-GRAND', 'Hotel Grand Chain', '22BCDEF1234F1Z1', 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO md.suppliers (id, org_id, code, name, gstin, payment_terms_days)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SUPP-AGRO', 'Adani Wilmar Ltd', '22GHIJK5678F1Z2', 15)
ON CONFLICT (id) DO NOTHING;

-- 8. SOPs (Phase 5)
INSERT INTO public.sops (id, org_id, sop_no, title, category, version, status, effective_date)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SOP-HACCP-002', 'HACCP Safety Monitoring', 'QA', '1.0', 'ACTIVE', '2026-01-01')
ON CONFLICT (id) DO NOTHING;

-- 9. Employees & Training (Phase 5)
INSERT INTO hr.employees (id, org_id, site_id, employee_code, first_name, last_name, department, is_active)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'EMP-001', 'Aarav', 'Sharma', 'QA', true),
  ('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'EMP-002', 'Vihaan', 'Verma', 'PRODUCTION', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hr.training_records (id, org_id, site_id, employee_id, sop_id, trained_by_id, training_date, evaluation_score, status)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '2026-05-15', 92.50, 'PASSED')
ON CONFLICT (id) DO NOTHING;

-- 10. Cost Centers & Costing (Phase 4)
INSERT INTO public.cost_centers (id, org_id, name, code)
VALUES
  ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Production Blending Cost Center', 'CC-PROD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fin.cost_centers (id, org_id, site_id, code, name)
VALUES
  ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'CC-PROD', 'Production Blending Cost Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fin.utility_consumption (org_id, site_id, cost_center_id, utility_type, reading_date, qty_consumed, unit, rate)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000001', 'ELECTRICITY', '2026-06-01', 120.500, 'kWh', 8.5000)
ON CONFLICT DO NOTHING;

INSERT INTO fin.overhead_allocations (org_id, site_id, cost_center_id, allocation_date, amount, allocation_basis)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000001', '2026-06-01', 5000.00, 'DIRECT')
ON CONFLICT DO NOTHING;

-- 11. Work Centers & Equipment (Phase 4)
INSERT INTO public.work_centers (id, org_id, name, code, type, capacity, capacity_unit, shift_hours, status)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Blending Area A', 'WC-BLEND-A', 'Blending', 5000, 'kg/hr', 8, 'Active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment (id, org_id, work_center_id, name, asset_code, equipment_type, status, last_calibration_date, next_calibration_due)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Continuous Pasteurizer CP-01', 'EQ-PAST-01', 'CCP_MONITOR', 'ACTIVE', '2026-01-10', '2027-01-10')
ON CONFLICT (id) DO NOTHING;

-- 12. Recipes, Orders & Batches (Phase 4)
INSERT INTO recipe.recipes (id, org_id, product_item_id, code, name)
VALUES ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'REC-BUTTER', 'PlantSmör Butter Recipe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe.recipe_versions (id, recipe_id, version_no, status, output_qty)
VALUES ('70000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 1, 'ACTIVE', 1000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mfg.production_orders (id, org_id, po_code, product_item_id, recipe_version_id, planned_qty, status)
VALUES (
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'PO-BUTTER-01',
  'e0000000-0000-0000-0000-000000000003', -- FG-BUTTER item
  '70000000-0000-0000-0000-000000000003',
  1000.00,
  'PLANNED'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO mfg.batches (id, org_id, production_order_id, batch_code, status, planned_qty, actual_qty)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'BAT-20260606-01',
  'PLANNED',
  1000.00,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.batches (id, batch_no, product, planned_qty, status, org_id, line, start_time)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'BAT-20260606-01', 'PlantSmör Butter', 1000.00, 'PLANNED', 'a0000000-0000-0000-0000-000000000001', 'WC-BLEND-A', now())
ON CONFLICT (id) DO NOTHING;

-- 13. Labor Hours (Phase 4)
INSERT INTO fin.labor_hours (org_id, site_id, batch_id, employee_id, hours_worked, hourly_rate)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 8.00, 150.00)
ON CONFLICT DO NOTHING;

-- 14. Pallets (Phase 3)
INSERT INTO logistics.pallets (id, org_id, site_id, pallet_code, status, tare_weight, gross_weight)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'PAL-001', 'IN_CUSTODY', 25.000, 325.000)
ON CONFLICT (id) DO NOTHING;

-- 15. Dispatches & Invoices (Phase 3)
INSERT INTO fin.dispatch_orders (id, org_id, customer_id, do_code, status, actual_ship_date, challan_no)
VALUES
  ('d8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'DO-2026-001', 'DRAFT', NULL, 'CHALLAN-991')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fin.dispatch_lines (id, dispatch_order_id, item_id, lot_id, qty, rate, gst_pct)
VALUES
  ('d9000000-0000-0000-0000-000000000001', 'd8000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', NULL, 100.00, 320.00, 12.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fin.invoices (id, org_id, dispatch_order_id, invoice_no, status, grand_total, paid_amount)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd8000000-0000-0000-0000-000000000001', 'INV-2026-001', 'UNPAID', 35840.00, 0)
ON CONFLICT (id) DO NOTHING;
