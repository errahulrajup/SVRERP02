import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_URL = 'postgresql://postgres:Rubba@@@6843@db.pdpjzyesxptecqklvqjq.supabase.co:5432/postgres';

async function run() {
  console.log('Connecting to database...');
  const client = new pg.Client({ connectionString: DB_URL });
  
  try {
    await client.connect();
    console.log('Connected!');

    const updateRoleSql = `
      UPDATE auth.users 
      SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb 
      WHERE email = 'info@srivriddhi.com';
    `;
    await client.query(updateRoleSql);
    console.log('Successfully updated info@srivriddhi.com to ADMIN!');

  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await client.end();
  }
}

run();
