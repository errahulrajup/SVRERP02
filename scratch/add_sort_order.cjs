const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF   = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is missing in environment.");
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

async function addSortOrder() {
  console.log("Adding sort_order column to public.rnd_formula_params...");
  try {
    const res = await runSQL(`
      ALTER TABLE public.rnd_formula_params ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
      SELECT pg_notify('pgrst', 'reload schema');
    `);
    console.log("✅ Successfully added sort_order column to public.rnd_formula_params!", JSON.stringify(res));
  } catch (err) {
    console.error("❌ Failed to add sort_order column:", err.message);
  }
}

addSortOrder();
