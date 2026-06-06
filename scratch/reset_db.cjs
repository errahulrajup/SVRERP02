const fs = require('fs');
const path = require('path');
const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF   = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;

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
          resolve({ ok: true });
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

async function main() {
  console.log("Reading MASTER_DB_RESET.sql...");
  const resetPath = path.join(__dirname, '..', 'supabase', 'MASTER_DB_RESET.sql');
  const resetSql = fs.readFileSync(resetPath, 'utf-8');
  
  console.log("Executing MASTER_DB_RESET.sql on Supabase... (this might take a few seconds)");
  try {
    await runSQL(resetSql);
    console.log("✅ Database reset successfully completed!");
  } catch (err) {
    console.error("❌ Database reset failed:", err.message);
  }
}

main();
