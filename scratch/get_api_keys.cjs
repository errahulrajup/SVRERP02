const https = require('https');
try { require('dotenv').config(); } catch (e) {}

const PROJECT_REF   = 'psylxeayraoxstgjmngm';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;

function getAPIKeys() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/api-keys`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    const keys = await getAPIKeys();
    console.log("API Keys:", JSON.stringify(keys, null, 2));
  } catch (err) {
    console.error("Error fetching API keys:", err.message);
  }
}

main();
