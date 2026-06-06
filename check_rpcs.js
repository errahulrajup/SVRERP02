import pg from 'pg';

const DB_URL = 'postgresql://postgres:Rubba@@@6843@db.pdpjzyesxptecqklvqjq.supabase.co:5432/postgres';

async function check() {
  const client = new pg.Client({ connectionString: DB_URL });
  try {
    await client.connect();
    
    console.log('--- Checking RPCs ---');
    const resRpcs = await client.query(`
      SELECT proname FROM pg_proc WHERE proname IN (
        'approve_grn_and_create_lot', 'dispatch_do_and_create_invoice', 
        'record_payment', 'complete_production_batch', 'upsert_allergen_matrix',
        'log_prp_execution', 'initiate_recall', 'upsert_sop', 'trigger_capa',
        'log_ccp_reading'
      );
    `);
    
    const foundRpcs = resRpcs.rows.map(r => r.proname);
    const expectedRpcs = [
      'approve_grn_and_create_lot', 'dispatch_do_and_create_invoice', 
      'record_payment', 'complete_production_batch', 'upsert_allergen_matrix',
      'log_prp_execution', 'initiate_recall', 'upsert_sop', 'trigger_capa',
      'log_ccp_reading'
    ];
    
    console.log('Found RPCs:', foundRpcs);
    const missing = expectedRpcs.filter(e => !foundRpcs.includes(e));
    if (missing.length > 0) {
      console.log('MISSING RPCs:', missing);
    } else {
      console.log('All expected RPCs exist!');
    }

    console.log('\n--- Checking RLS ---');
    const resRls = await client.query(`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true;
    `);
    console.log('Tables with RLS enabled:', resRls.rows.map(r => r.tablename));

  } catch (err) {
    console.error('Error connecting or querying database:', err);
  } finally {
    await client.end();
  }
}

check();
