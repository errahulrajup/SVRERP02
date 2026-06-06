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
  console.log("Reading seed SQL files...");
  
  const seedDummyPath = path.join(__dirname, '..', 'supabase', 'seed_dummy.sql');
  const seedPhasesPath = path.join(__dirname, 'seed_all_phases.sql');
  
  const seedDummySql = fs.readFileSync(seedDummyPath, 'utf-8');
  const seedPhasesSql = fs.readFileSync(seedPhasesPath, 'utf-8');
  
  console.log("Executing core dummy seed (seed_dummy.sql)...");
  try {
    await runSQL(seedDummySql);
    console.log("✅ Core dummy seed loaded!");
  } catch (err) {
    console.error("❌ seed_dummy.sql failed:", err.message);
  }

  console.log("Executing phase-wise dummy seed (seed_all_phases.sql)...");
  try {
    await runSQL(seedPhasesSql);
    console.log("✅ Phase-wise dummy seed loaded!");
  } catch (err) {
    console.error("❌ seed_all_phases.sql failed:", err.message);
  }
}

main();
