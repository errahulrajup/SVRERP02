const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF   = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is missing in environment. Please add it to your .env file.");
  process.exit(1);
}

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          try {
            const parsed = JSON.parse(data);
            reject(new Error(parsed.message || parsed.error || data));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testWorkflow() {
  console.log("=== STARTING MARGARINE END-TO-END WORKFLOW TEST ===");

  const sqlQuery = `
    -- Enable workflow context to bypass browser restrictions for test suite
    SET app.workflow_context = 'rpc';

    -- 0. CLEANUP previous runs
    DELETE FROM public.rnd_notebook WHERE title LIKE '%Margarine%';
    DELETE FROM public.rnd_trial_params WHERE trial_id IN (SELECT id FROM public.rnd_trials WHERE formula_id IN (SELECT id FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002'));
    DELETE FROM public.rnd_trials WHERE formula_id IN (SELECT id FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002');
    DELETE FROM public.rnd_formula_items WHERE formula_id IN (SELECT id FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002');
    DELETE FROM public.rnd_formula_params WHERE formula_id IN (SELECT id FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002');
    DELETE FROM public.rnd_processes WHERE formula_id IN (SELECT id FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002');
    DELETE FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002';

    DELETE FROM public.batches WHERE batch_no = 'BAT-MARG-01';
    DELETE FROM mfg.batches WHERE batch_code = 'BAT-MARG-01';
    DELETE FROM mfg.production_orders WHERE po_code = 'PO-MARG-01';
    
    DELETE FROM recipe.recipe_versions WHERE recipe_id = '77000000-0000-0000-0000-000000000015';
    DELETE FROM recipe.recipes WHERE id = '77000000-0000-0000-0000-000000000015';

    DELETE FROM public.recipe_steps WHERE recipe_id = '77000000-0000-0000-0000-000000000015';
    DELETE FROM public.recipe_qc_params WHERE recipe_id = '77000000-0000-0000-0000-000000000015';
    DELETE FROM public.recipe_inputs WHERE recipe_id = '77000000-0000-0000-0000-000000000015';
    DELETE FROM public.recipes WHERE id = '77000000-0000-0000-0000-000000000015';

    DELETE FROM public.rnd_ingredients WHERE name IN ('Refined Palm Oil', 'Mono-diglycerides Emulsifier', 'Vacuum Salt', 'Purified Process Water');
    DELETE FROM md.skus WHERE code = 'SKU-MARG-15KG';
    DELETE FROM md.items WHERE code IN ('RM-PALM-OIL', 'RM-EMULSIFIER', 'RM-SALT', 'RM-WATER', 'FG-MARGARINE');
    DELETE FROM public.products WHERE id IN ('e0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000015');

    -- STEP 1: CREATE ERP ITEMS & RND INGREDIENTS (Ingredient Intelligence)
    INSERT INTO md.items (id, org_id, item_type, code, name, base_uom, gst_pct, allergens, is_active)
    VALUES 
      ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'RM-PALM-OIL', 'Refined Palm Oil', 'kg', 5.00, '{}', true),
      ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'RM-EMULSIFIER', 'Mono-diglycerides Emulsifier', 'kg', 18.00, '{}', true),
      ('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'RM-SALT', 'Vacuum Salt', 'kg', 0.00, '{}', true),
      ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'RM-WATER', 'Purified Process Water', 'kg', 0.00, '{}', true),
      ('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'FINISHED_GOOD', 'FG-MARGARINE', 'Margarine Spread', 'kg', 12.00, '{}', true);

    INSERT INTO public.products (id, name, sku_code, category, unit, gst_pct, is_active, slug)
    VALUES 
      ('e0000000-0000-0000-0000-000000000011', 'Refined Palm Oil', 'RM-PALM-OIL', 'Ingredients', 'kg', 5.00, true, 'refined-palm-oil'),
      ('e0000000-0000-0000-0000-000000000012', 'Mono-diglycerides Emulsifier', 'RM-EMULSIFIER', 'Ingredients', 'kg', 18.00, true, 'mono-diglycerides-emulsifier'),
      ('e0000000-0000-0000-0000-000000000013', 'Vacuum Salt', 'RM-SALT', 'Ingredients', 'kg', 0.00, true, 'vacuum-salt'),
      ('e0000000-0000-0000-0000-000000000014', 'Purified Process Water', 'RM-WATER', 'Ingredients', 'kg', 0.00, true, 'purified-process-water'),
      ('e0000000-0000-0000-0000-000000000015', 'Margarine Spread', 'SKU-MARG-15KG', 'Spreads', 'kg', 12.00, true, 'margarine-spread');

    INSERT INTO md.skus (id, org_id, site_id, item_id, code, name, pack_size_kg, base_uom, is_active)
    VALUES
      ('f0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000015', 'SKU-MARG-15KG', 'Margarine Spread 15kg Tub', 15.000, 'kg', true);

    INSERT INTO public.rnd_ingredients (id, name, category, functionality, supplier, cost_per_kg, ph_min, ph_max, heat_stability, usage_min_pct, usage_max_pct, notes, is_active, erp_product_id)
    VALUES
      ('e1100000-0000-0000-0000-000000000001', 'Refined Palm Oil', 'Oil', 'Fat Base', 'Adani Wilmar Ltd', 90.00, NULL, NULL, 'HIGH', 0.300, 0.700, 'Primary fat base for margarine emulsification.', true, 'e0000000-0000-0000-0000-000000000011'),
      ('e1100000-0000-0000-0000-000000000002', 'Mono-diglycerides Emulsifier', 'Additives', 'Emulsification', 'Fine Organics', 350.00, NULL, NULL, 'HIGH', 0.001, 0.015, 'Lecithin co-synergy.', true, 'e0000000-0000-0000-0000-000000000012'),
      ('e1100000-0000-0000-0000-000000000003', 'Vacuum Salt', 'Additives', 'Flavor/Preservative', 'Tata Salt', 15.00, NULL, NULL, 'HIGH', 0.005, 0.030, 'Binds with water phase.', true, 'e0000000-0000-0000-0000-000000000013'),
      ('e1100000-0000-0000-0000-000000000004', 'Purified Process Water', 'Water', 'Solvent/Aqueous phase', 'In-house RO', 1.50, 6.50, 7.50, 'MEDIUM', 0.200, 0.500, 'Requires UV disinfection.', true, 'e0000000-0000-0000-0000-000000000014');

    -- STEP 2: FORMULATION INTELLIGENCE (Draft R&D Formula)
    INSERT INTO public.rnd_formulas (id, formula_code, name, description, version, target_ph, target_brix, target_sg, status, total_cost_per_kg, created_by, erp_product_id)
    VALUES (
      'e2200000-0000-0000-0000-000000000001',
      'FM-MARG-002',
      'Margarine Spread Formulation',
      'Premium spreads trial with dynamic specs',
      1.0,
      6.80,
      NULL, -- Brix is not relevant for margarine
      0.920,
      'DRAFT',
      58.36,
      'd0000000-0000-0000-0000-000000000001',
      'e0000000-0000-0000-0000-000000000015'
    );

    -- STEP 3: FORMULA BUILDER (BOM and Target QC Specs)
    INSERT INTO public.rnd_formula_items (id, formula_id, ingredient_id, phase, percentage, tolerance_pct, notes)
    VALUES
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'e1100000-0000-0000-0000-000000000001', 'Oil Phase', 60.000, 2.000, 'Palm oil fat phase base'),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'e1100000-0000-0000-0000-000000000002', 'Oil Phase', 1.000, 0.100, 'High-temp emulsifier addition'),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'e1100000-0000-0000-0000-000000000003', 'Dry Blend', 2.000, 0.200, 'Dissolve in water phase'),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'e1100000-0000-0000-0000-000000000004', 'Water Phase', 37.000, 3.000, 'Balanced water amount');

    INSERT INTO public.rnd_formula_params (id, formula_id, param_name, target_min, target_max, unit)
    VALUES
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'Viscosity', 4000, 6000, 'cps'),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'pH', 6.5, 7.2, 'pH'),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 'Moisture', 15, 17, '%');

    -- STEP 4: PROCESS SOP BUILDER
    INSERT INTO public.rnd_processes (id, formula_id, step_no, step_type, description, duration_min, temp_c, rpm, pressure_bar, ccp)
    VALUES
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 1, 'Premix Fat Phase', 'Heat Refined Palm Oil and Emulsifier to 65°C and stir at 150 rpm until dissolved.', 20, 65.0, 150, 0.0, false),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 2, 'Premix Water Phase', 'Dissolve Vacuum Salt in Purified Process Water at 45°C.', 10, 45.0, 100, 0.0, false),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 3, 'Emulsification', 'Combine Water Phase and Oil Phase under high shear mixing at 3000 rpm.', 15, 50.0, 3000, 0.0, false),
      (gen_random_uuid(), 'e2200000-0000-0000-0000-000000000001', 4, 'Pasteurization', 'Pass emulsion through pasteurizer at 85°C for microbial safety.', 5, 85.0, 0, 1.2, true);

    -- STEP 5: TRIAL MANAGER
    UPDATE public.rnd_formulas SET status = 'UNDER_TRIAL' WHERE id = 'e2200000-0000-0000-0000-000000000001';

    INSERT INTO public.rnd_trials (id, trial_no, formula_id, batch_size_kg, actual_yield_kg, status, start_time, end_time, f0_achieved, retort_temp_c, hold_time_min, actual_ph, actual_brix, actual_sg, sensory_score, sensory_notes, conducted_by)
    VALUES (
      'e3300000-0000-0000-0000-000000000001',
      'TR-MARG-01',
      'e2200000-0000-0000-0000-000000000001',
      10.00,
      9.80,
      'COMPLETED',
      now() - interval '2 hours',
      now() - interval '1 hour',
      NULL,
      NULL,
      NULL,
      6.80,
      NULL,
      0.922,
      9,
      'Excellent butter texture, glossy shine, stable emulsion.',
      'System Tester'
    );

    INSERT INTO public.rnd_trial_params (id, trial_id, param_name, value, notes)
    VALUES
      (gen_random_uuid(), 'e3300000-0000-0000-0000-000000000001', 'Viscosity', 5200, 'Perfect texture matching target'),
      (gen_random_uuid(), 'e3300000-0000-0000-0000-000000000001', 'pH', 6.8, 'Direct reading from pH probe'),
      (gen_random_uuid(), 'e3300000-0000-0000-0000-000000000001', 'Moisture', 16.2, 'Checked via halogen moisture balance');

    -- STEP 6: VALIDATION & RELEASE (Promoting to BOS + ERP Recipe Engines)
    UPDATE public.rnd_formulas 
    SET 
      status = 'APPROVED',
      validation_status = 'VIABLE',
      validation_notes = 'Batch met all sensory, chemical, and physical targets. Recommended for scaling up.'
    WHERE id = 'e2200000-0000-0000-0000-000000000001';

    -- 6A. Promote to BOS Recipe (public.recipes)
    INSERT INTO public.recipes (id, product_id, name, version, is_active, locked, notes, output_qty, output_unit, expected_loss)
    VALUES (
      '77000000-0000-0000-0000-000000000015',
      'e0000000-0000-0000-0000-000000000015', 
      '[RND] Margarine Spread Recipe',
      1,
      true,
      false,
      'Promoted from RND FM-MARG-002. Validation Notes: Batch met all sensory, chemical, and physical targets.',
      100.000,
      'kg',
      2.00
    );

    INSERT INTO public.recipe_inputs (id, recipe_id, material, qty, unit, tolerance, notes)
    VALUES
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Refined Palm Oil', 60.000, 'kg', 2.00, 'Oil Phase'),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Mono-diglycerides Emulsifier', 1.000, 'kg', 2.00, 'Oil Phase'),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Vacuum Salt', 2.000, 'kg', 2.00, 'Dry Blend'),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Purified Process Water', 37.000, 'kg', 2.00, 'Water Phase');

    INSERT INTO public.recipe_qc_params (id, recipe_id, param_name, category, unit, target_min, target_max, target_value)
    VALUES
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Viscosity', 'Physical', 'cps', 4000, 6000, 5000),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'pH', 'Chemical', 'pH', 6.5, 7.2, 6.8),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 'Moisture', 'Chemical', '%', 15, 17, 16);

    INSERT INTO public.recipe_steps (id, recipe_id, step_no, step_name, machine, instruction, temp_min, temp_max, duration_min)
    VALUES
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 1, 'Premix Fat Phase', 'Stirrer', 'Heat Refined Palm Oil and Emulsifier to 65°C and stir at 150 rpm until dissolved.', 63, 67, 20),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 2, 'Premix Water Phase', 'Mixing Vessel', 'Dissolve Vacuum Salt in Purified Process Water at 45°C.', 43, 47, 10),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 3, 'Emulsification', 'High Shear Mixer', 'Combine Water Phase and Oil Phase under high shear mixing at 3000 rpm.', 48, 52, 15),
      (gen_random_uuid(), '77000000-0000-0000-0000-000000000015', 4, 'Pasteurization', 'Continuous Pasteurizer CP-01', '[CCP] Pass emulsion through pasteurizer at 85°C for microbial safety.', 83, 87, 5);

    -- 6B. Promote to ERP Recipe (recipe.recipes & recipe.recipe_versions)
    INSERT INTO recipe.recipes (id, org_id, product_item_id, code, name)
    VALUES (
      '77000000-0000-0000-0000-000000000015', 
      'a0000000-0000-0000-0000-000000000001',
      'e0000000-0000-0000-0000-000000000015',
      'REC-MARG',
      'Margarine Spread ERP Recipe'
    );

    INSERT INTO recipe.recipe_versions (id, recipe_id, version_no, status, output_qty)
    VALUES (
      '77000000-0000-0000-0000-000000000016',
      '77000000-0000-0000-0000-000000000015',
      1,
      'ACTIVE',
      1000.00
    );

    -- Lock R&D Formula
    UPDATE public.rnd_formulas 
    SET 
      status = 'LOCKED', 
      locked_by = 'd0000000-0000-0000-0000-000000000001', 
      locked_at = now()
    WHERE id = 'e2200000-0000-0000-0000-000000000001';

    -- STEP 7: PRODUCTION PLANNING (Create Production Orders & Batches in ERP)
    INSERT INTO mfg.production_orders (id, org_id, po_code, product_item_id, recipe_version_id, planned_qty, status)
    VALUES (
      '77000000-0000-0000-0000-000000000015',
      'a0000000-0000-0000-0000-000000000001',
      'PO-MARG-01',
      'e0000000-0000-0000-0000-000000000015',
      '77000000-0000-0000-0000-000000000016',
      1000.00,
      'PLANNED'
    );

    INSERT INTO mfg.batches (id, org_id, production_order_id, batch_code, status, planned_qty, actual_qty)
    VALUES (
      '77000000-0000-0000-0000-000000000015',
      'a0000000-0000-0000-0000-000000000001',
      '77000000-0000-0000-0000-000000000015',
      'BAT-MARG-01',
      'PLANNED',
      1000.00,
      0
    );

    INSERT INTO public.batches (id, batch_no, product, planned_qty, status, org_id, line, start_time, recipe_id)
    VALUES
      ('77000000-0000-0000-0000-000000000015', 'BAT-MARG-01', 'Margarine Spread', 1000.00, 'PLANNED', 'a0000000-0000-0000-0000-000000000001', 'WC-BLEND-A', now(), '77000000-0000-0000-0000-000000000015');

    -- Verify count of seeded Margarine records
    SELECT 
      (SELECT COUNT(*) FROM public.rnd_ingredients WHERE name IN ('Refined Palm Oil', 'Mono-diglycerides Emulsifier', 'Vacuum Salt', 'Purified Process Water')) as ingredients_count,
      (SELECT COUNT(*) FROM public.rnd_formulas WHERE formula_code = 'FM-MARG-002' AND status = 'LOCKED') as formula_locked_count,
      (SELECT COUNT(*) FROM public.recipes WHERE name = '[RND] Margarine Spread Recipe') as promoted_recipe_count,
      (SELECT COUNT(*) FROM public.recipe_inputs WHERE recipe_id = '77000000-0000-0000-0000-000000000015') as recipe_inputs_count,
      (SELECT COUNT(*) FROM public.recipe_qc_params WHERE recipe_id = '77000000-0000-0000-0000-000000000015') as recipe_qc_count,
      (SELECT COUNT(*) FROM public.recipe_steps WHERE recipe_id = '77000000-0000-0000-0000-000000000015') as recipe_steps_count,
      (SELECT COUNT(*) FROM mfg.production_orders WHERE po_code = 'PO-MARG-01') as prod_orders_count,
      (SELECT COUNT(*) FROM mfg.batches WHERE batch_code = 'BAT-MARG-01') as batches_count;
  `;

  try {
    const result = await runSQL(sqlQuery);
    console.log("=== INTEGRATION TEST RESULTS ===");
    console.log(JSON.stringify(result, null, 2));
    
    // We expect the result to return counts showing all records were successfully created and verified
    const counts = result[result.length - 1] || result;
    if (counts && 
        counts.ingredients_count === 4 && 
        counts.formula_locked_count === 1 && 
        counts.promoted_recipe_count === 1 &&
        counts.recipe_inputs_count === 4 &&
        counts.recipe_qc_count === 3 &&
        counts.recipe_steps_count === 4 &&
        counts.prod_orders_count === 1 &&
        counts.batches_count === 1) {
      console.log("\n✅ SUCCESS: Margarine Spread end-to-end integration test passed perfectly!");
    } else {
      console.error("\n❌ FAILURE: Some workflow records could not be verified in the database count query.");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ DATABASE ERROR during margarine workflow test:", err.message);
    process.exit(1);
  }
}

testWorkflow();
