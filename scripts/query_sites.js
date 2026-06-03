import pg from 'pg';

const DB_URL = 'postgresql://postgres:Rubba@@@6843@db.pdpjzyesxptecqklvqjq.supabase.co:5432/postgres';

async function check() {
  const client = new pg.Client({ connectionString: DB_URL });
  try {
    await client.connect();
    console.log('Database connected successfully!');
    
    const resOrgs = await client.query(`SELECT id, name FROM iam.orgs`);
    console.log('iam.orgs:', resOrgs.rows);

    const resSites = await client.query(`SELECT id, org_id, code, name FROM md.sites`);
    console.log('md.sites:', resSites.rows);

  } catch (err) {
    console.error('Error connecting or querying database:', err);
  } finally {
    await client.end();
  }
}

check();
