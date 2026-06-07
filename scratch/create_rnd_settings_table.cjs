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

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.rnd_master_parameters (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) DEFAULT 'Physical',
      default_unit VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name)
    );

    ALTER TABLE public.rnd_master_parameters ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rnd_master_parameters_select_policy" ON public.rnd_master_parameters;
    CREATE POLICY "rnd_master_parameters_select_policy" ON public.rnd_master_parameters
      FOR SELECT USING (true);
      
    DROP POLICY IF EXISTS "rnd_master_parameters_all_policy" ON public.rnd_master_parameters;
    CREATE POLICY "rnd_master_parameters_all_policy" ON public.rnd_master_parameters
      FOR ALL USING (true);

    -- Seed some initial parameters
    INSERT INTO public.rnd_master_parameters (name, category, default_unit) VALUES
    ('pH', 'Chemical', 'pH'),
    ('Brix', 'Physical', '°Bx'),
    ('Viscosity', 'Physical', 'cps'),
    ('Moisture', 'Chemical', '%'),
    ('Specific Gravity', 'Physical', 'g/ml'),
    ('Total Plate Count', 'Microbiological', 'CFU/g')
    ON CONFLICT (name) DO NOTHING;
  `;

  try {
    const result = await runSQL(sql);
    console.log("SUCCESS!", result);
  } catch(e) {
    console.error("FAILED", e.message);
  }
}

run();
