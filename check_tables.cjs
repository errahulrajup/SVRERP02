const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF  = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

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
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(JSON.parse(data));
        else reject(new Error(JSON.parse(data).message || data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const rows = await runSQL(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog','information_schema','pg_toast')
    ORDER BY table_schema, table_name;
  `);
  console.log('EXISTING TABLES IN DATABASE:');
  console.log('============================');
  rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}`));
  console.log(`\nTotal: ${rows.length} tables`);
}

main().catch(console.error);
