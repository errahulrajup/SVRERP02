/**
 * scripts/gen-svr-env.js
 * Generates public/svr-env.js from environment variables.
 *
 * Production/CI/Vercel builds fail hard when required Supabase env vars are
 * missing. Local development may still emit a stub so React can render the
 * visible runtime configuration error.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let url = process.env.VITE_SUPABASE_URL;
let anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^\s*VITE_SUPABASE_(URL|ANON_KEY)\s*=\s*(.+)$/);
        if (match) {
          const key = match[1];
          const val = match[2].trim().replace(/^['"]|['"]$/g, '');
          if (key === 'URL') url = val;
          if (key === 'ANON_KEY') anon = val;
        }
      }
    }
  } catch (e) {
    console.warn('[gen-svr-env] Failed to read .env file:', e);
  }
}

const strictEnv = process.env.SVR_STRICT_ENV === '1';

const outPath = path.join(__dirname, '..', 'public', 'svr-env.js');

if (!url || !anon) {
  const missing = [
    !url ? 'VITE_SUPABASE_URL' : null,
    !anon ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean).join(', ');

  if (strictEnv) {
    console.error(`[gen-svr-env] ERROR: Missing required environment variables: ${missing}.`);
    console.error('[gen-svr-env] Refusing to create a broken production/staging build.');
    console.error('[gen-svr-env] Add the variables in Vercel/CI, or set SVR_ALLOW_STUB_ENV=1 only for an intentional local stub build.');
    process.exit(1);
  }

  console.warn(`[gen-svr-env] WARNING: Missing environment variables: ${missing}.`);
  console.warn('[gen-svr-env] Writing local stub svr-env.js. The app will show a runtime config error until env vars are added.');
  const stub = '/* svr-env.js - STUB (env vars not set at build time) */\n'
    + '/* Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings. */\n'
    + 'window.__SVR_ENV = { url: "", anon: "" };\n';
  fs.writeFileSync(outPath, stub, 'utf8');
  console.warn('[gen-svr-env] Wrote stub public/svr-env.js for local development.');
} else {
  const content = `/* Auto-generated at build time - do not edit or commit */\nwindow.__SVR_ENV = { url: ${JSON.stringify(url)}, anon: ${JSON.stringify(anon)} };\n`;
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('[gen-svr-env] Wrote public/svr-env.js');
}
