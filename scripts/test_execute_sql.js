import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_URL = 'postgresql://postgres:Rubba@@@6843@db.pdpjzyesxptecqklvqjq.supabase.co:5432/postgres';

async function run() {
  console.log('Reading MASTER_DB_RESET.sql...');
  const sqlPath = path.join(__dirname, '..', 'supabase', 'MASTER_DB_RESET.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to Supabase Database...');
  const client = new pg.Client({ connectionString: DB_URL });
  
  try {
    await client.connect();
    console.log('Connected successfully! Executing master SQL script...');
    
    const res = await client.query(sql);
    console.log('SUCCESS! The entire database has been successfully reset and rebuilt in one go.');
  } catch (err) {
    console.error('ERROR encountered during SQL execution:');
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
