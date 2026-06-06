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

async function main() {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM public.organizations) as orgs_count,
      (SELECT COUNT(*) FROM iam.orgs) as iam_orgs_count,
      (SELECT COUNT(*) FROM public.profiles) as profiles_count,
      (SELECT COUNT(*) FROM md.sites) as sites_count,
      (SELECT COUNT(*) FROM md.items) as items_count,
      (SELECT COUNT(*) FROM md.skus) as skus_count,
      (SELECT COUNT(*) FROM md.customers) as customers_count,
      (SELECT COUNT(*) FROM md.suppliers) as suppliers_count,
      (SELECT COUNT(*) FROM public.sops) as sops_count,
      (SELECT COUNT(*) FROM hr.employees) as employees_count,
      (SELECT COUNT(*) FROM hr.training_records) as training_records_count,
      (SELECT COUNT(*) FROM public.work_centers) as work_centers_count,
      (SELECT COUNT(*) FROM public.equipment) as equipment_count,
      (SELECT COUNT(*) FROM public.batches) as legacy_batches_count,
      (SELECT COUNT(*) FROM mfg.batches) as mfg_batches_count,
      (SELECT COUNT(*) FROM fin.labor_hours) as labor_hours_count,
      (SELECT COUNT(*) FROM logistics.pallets) as pallets_count,
      (SELECT COUNT(*) FROM fin.dispatch_orders) as dispatch_orders_count,
      (SELECT COUNT(*) FROM fin.invoices) as invoices_count
  `;
  try {
    const result = await runSQL(query);
    console.log("Database Stats:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error running query:", err.message);
  }
}

main();
