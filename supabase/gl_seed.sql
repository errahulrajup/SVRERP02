-- ============================================================
-- CHART OF ACCOUNTS + FISCAL YEAR SEED
-- Food Manufacturing Company (Srivriddhi Foods Pvt Ltd)
-- Run this in Supabase SQL Editor AFTER erp_architecture.sql
-- ============================================================

-- STEP 1: Insert Organisation (if not exists)
INSERT INTO iam.orgs (id, name, gstin)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Srivriddhi Foods Pvt Ltd',
  '36AABCS1429B1ZB'
) ON CONFLICT (id) DO NOTHING;

-- STEP 2: Insert Fiscal Year (FY 2025-26)
INSERT INTO fin.fiscal_years (id, org_id, year_code, starts_on, ends_on, status)
VALUES (
  '25260000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'FY 2025-26',
  '2025-04-01',
  '2026-03-31',
  'OPEN'
) ON CONFLICT (id) DO NOTHING;

-- STEP 3: Insert Fiscal Periods (Monthly, Apr 2025 – Mar 2026)
DO $$
DECLARE
  v_fy_id UUID := '25260000-0000-0000-0000-000000000001';
  v_org_id UUID := 'a0000000-0000-0000-0000-000000000001';
  m INT;
  period_start DATE;
  period_end DATE;
  y INT;
BEGIN
  FOR m IN 1..12 LOOP
    IF m <= 9 THEN
      y := 2025;
    ELSE
      y := 2026;
    END IF;
    period_start := make_date(y, (m + 3 - 1) % 12 + 1, 1);
    period_end := (period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    INSERT INTO fin.fiscal_periods (fiscal_year_id, org_id, period_no, starts_on, ends_on, status)
    VALUES (v_fy_id, v_org_id, m, period_start, period_end, 'OPEN')
    ON CONFLICT (org_id, fiscal_year_id, period_no) DO NOTHING;
  END LOOP;
END $$;

-- STEP 4: Chart of Accounts — Indian Food Manufacturing
INSERT INTO fin.gl_accounts (org_id, code, name, account_type, normal_balance) VALUES
-- ASSETS
('a0000000-0000-0000-0000-000000000001', '1001', 'Cash in Hand',                  'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1002', 'HDFC Bank Current Account',     'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1003', 'ICICI Bank Current Account',    'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1100', 'Accounts Receivable (Trade)',   'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1200', 'Raw Material Inventory',        'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1201', 'Packaging Material Inventory',  'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1210', 'Work in Progress (WIP)',        'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1220', 'Finished Goods Inventory',      'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1300', 'GST Input Credit (CGST)',       'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1301', 'GST Input Credit (SGST)',       'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1302', 'GST Input Credit (IGST)',       'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1400', 'Advance to Suppliers',          'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1500', 'Plant & Machinery',             'ASSET',     'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '1501', 'Accumulated Depreciation',      'ASSET',     'CREDIT'),
-- LIABILITIES
('a0000000-0000-0000-0000-000000000001', '2001', 'Accounts Payable (Trade)',      'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2100', 'GST Payable (CGST)',            'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2101', 'GST Payable (SGST)',            'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2102', 'GST Payable (IGST)',            'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2200', 'TDS Payable',                   'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2300', 'Salary Payable',                'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2400', 'Advance from Customers',        'LIABILITY', 'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '2500', 'Bank Loan (Term)',              'LIABILITY', 'CREDIT'),
-- EQUITY
('a0000000-0000-0000-0000-000000000001', '3001', 'Paid-up Share Capital',         'EQUITY',    'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '3002', 'Retained Earnings',             'EQUITY',    'CREDIT'),
-- REVENUE
('a0000000-0000-0000-0000-000000000001', '4001', 'Sales — Domestic (5% GST)',     'REVENUE',   'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '4002', 'Sales — Domestic (12% GST)',    'REVENUE',   'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '4003', 'Sales — Domestic (18% GST)',    'REVENUE',   'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '4100', 'Export Sales (Zero-rated)',      'REVENUE',   'CREDIT'),
('a0000000-0000-0000-0000-000000000001', '4200', 'Other Income',                  'REVENUE',   'CREDIT'),
-- EXPENSES (Including COGS / OPEX)
('a0000000-0000-0000-0000-000000000001', '5001', 'Raw Material Consumed',         'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '5002', 'Packaging Material Consumed',   'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '5003', 'Direct Labour',                 'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '5004', 'Factory Overhead',              'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '5005', 'Quality Control Costs',         'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6001', 'Salaries & Wages',              'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6002', 'Electricity & Utilities',        'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6003', 'Rent & Lease',                  'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6004', 'Freight & Logistics',           'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6005', 'Repairs & Maintenance',         'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6006', 'Testing & Certification',       'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6007', 'Insurance',                     'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6008', 'Depreciation',                  'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6009', 'Professional & Legal Fees',     'EXPENSE',   'DEBIT'),
('a0000000-0000-0000-0000-000000000001', '6010', 'Miscellaneous Expenses',        'EXPENSE',   'DEBIT')
ON CONFLICT (org_id, code) DO NOTHING;

-- STEP 4b: Account Mappings (required by erp_finance functions)
INSERT INTO fin.account_mappings (org_id, mapping_key, gl_account_id) VALUES
('a0000000-0000-0000-0000-000000000001', 'AR_TRADE',      (SELECT id FROM fin.gl_accounts WHERE org_id = 'a0000000-0000-0000-0000-000000000001' AND code = '1100')),
('a0000000-0000-0000-0000-000000000001', 'SALES_REVENUE', (SELECT id FROM fin.gl_accounts WHERE org_id = 'a0000000-0000-0000-0000-000000000001' AND code = '4001')),
('a0000000-0000-0000-0000-000000000001', 'CGST_PAYABLE',  (SELECT id FROM fin.gl_accounts WHERE org_id = 'a0000000-0000-0000-0000-000000000001' AND code = '2100')),
('a0000000-0000-0000-0000-000000000001', 'SGST_PAYABLE',  (SELECT id FROM fin.gl_accounts WHERE org_id = 'a0000000-0000-0000-0000-000000000001' AND code = '2101')),
('a0000000-0000-0000-0000-000000000001', 'BANK',          (SELECT id FROM fin.gl_accounts WHERE org_id = 'a0000000-0000-0000-0000-000000000001' AND code = '1002'))
ON CONFLICT (org_id, mapping_key) DO NOTHING;

-- STEP 5: HSN Codes — Common food manufacturing categories
INSERT INTO fin.hsn_tax_codes (org_id, hsn_code, description, gst_pct) VALUES
('a0000000-0000-0000-0000-000000000001', '0401',   'Milk and cream, not concentrated',                    0),
('a0000000-0000-0000-0000-000000000001', '0402',   'Milk and cream, concentrated or sweetened',           5),
('a0000000-0000-0000-0000-000000000001', '0901',   'Coffee',                                              5),
('a0000000-0000-0000-0000-000000000001', '0902',   'Tea',                                                 5),
('a0000000-0000-0000-0000-000000000001', '1001',   'Wheat and meslin',                                    0),
('a0000000-0000-0000-0000-000000000001', '1006',   'Rice',                                                5),
('a0000000-0000-0000-0000-000000000001', '1101',   'Wheat or meslin flour',                               0),
('a0000000-0000-0000-0000-000000000001', '1507',   'Soya-bean oil and fractions',                         5),
('a0000000-0000-0000-0000-000000000001', '1511',   'Palm oil and fractions',                              5),
('a0000000-0000-0000-0000-000000000001', '1512',   'Sunflower seed, safflower oil',                       5),
('a0000000-0000-0000-0000-000000000001', '1701',   'Cane or beet sugar',                                  5),
('a0000000-0000-0000-0000-000000000001', '1702',   'Other sugars — glucose, fructose',                    18),
('a0000000-0000-0000-0000-000000000001', '1901',   'Malt extract, food preparations (NES)',               18),
('a0000000-0000-0000-0000-000000000001', '2009',   'Fruit juices and vegetable juices',                   12),
('a0000000-0000-0000-0000-000000000001', '2101',   'Extracts, essences of coffee, tea',                   18),
('a0000000-0000-0000-0000-000000000001', '2106',   'Food preparations NEC (health supplements etc.)',     18),
('a0000000-0000-0000-0000-000000000001', '2201',   'Waters, non-sweetened, non-flavoured',                12),
('a0000000-0000-0000-0000-000000000001', '2202',   'Flavoured / sweetened water, soft drinks',            28),
('a0000000-0000-0000-0000-000000000001', '3301',   'Essential oils',                                      18),
('a0000000-0000-0000-0000-000000000001', '3302',   'Odoriferous mixtures used in food industry',          18),
('a0000000-0000-0000-0000-000000000001', '3923',   'Plastic packaging, bottles, containers',             18),
('a0000000-0000-0000-0000-000000000001', '4819',   'Cartons, boxes, cases of corrugated paper',           18),
('a0000000-0000-0000-0000-000000000001', '9602',   'Contract manufacturing services',                    18)
ON CONFLICT (org_id, hsn_code) DO NOTHING;

-- Done! Verify:
SELECT code, name, account_type FROM fin.gl_accounts ORDER BY code;
SELECT hsn_code, description, gst_pct FROM fin.hsn_tax_codes ORDER BY hsn_code;
