const requiredEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isProduction: boolean;
  sentryDsn?: string;
};

// Never throw at module load time — a module-level throw happens before React
// mounts, so ErrorBoundary cannot catch it and the page stays blank.
// Instead we return empty strings and let the app render a visible error.
function getEnv(name: (typeof requiredEnv)[number]): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    console.warn(`[Config] Missing environment variable: ${name}`);
  }
  return value ?? '';
}

export const runtimeConfig: RuntimeConfig = {
  supabaseUrl:    getEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey:getEnv('VITE_SUPABASE_ANON_KEY'),
  sentryDsn:      import.meta.env.VITE_SENTRY_DSN,
  isProduction:   import.meta.env.PROD,
};

/**
 * Call inside the React tree (e.g. in App) so a missing-config error
 * renders as a visible UI rather than a blank screen.
 * Throws only when both vars are truly absent — so ErrorBoundary can catch it.
 */
export function assertRuntimeConfig() {
  const missing = requiredEnv.filter((key) => !import.meta.env[key]);
  if (missing.length === 0) return;
  const message = `[Config] Missing required environment variables: ${missing.join(', ')}. Add them in Vercel → Project Settings → Environment Variables, then redeploy.`;
  // Always throw so ErrorBoundary shows a readable error instead of a blank screen.
  throw new Error(message);
}

/**
 * BUG-015 FIX: Advisory check for optional but important production variables.
 * Does NOT throw — call this after assertRuntimeConfig() for observability warnings.
 */
export function warnOptionalConfig() {
  if (import.meta.env.PROD && !import.meta.env.VITE_SENTRY_DSN) {
    console.warn(
      '[Config] VITE_SENTRY_DSN is not set. Production errors will NOT be reported to Sentry. ' +
      'Add it in Vercel → Project Settings → Environment Variables for full observability.'
    );
  }
}
