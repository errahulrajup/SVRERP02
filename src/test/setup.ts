import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';

// Load staging variables from .env.staging
dotenv.config({ path: path.resolve(process.cwd(), '.env.staging') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Staging Supabase URL and Anon Key are missing in .env.staging');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// We will need an admin client for tests to bypass RLS when creating setup data
// But for now we use the anon client.
// To truly test the backend, we might need a test user account.
export let testUser: any = null;

beforeAll(async () => {
  // Try to sign in with a test user or create one if we want to run authenticated tests
  // For safety and isolation on the fresh staging environment, we'll run an RPC or just let tests handle their own auth
  
  // Example dummy login attempt if needed
  // const { data, error } = await supabase.auth.signInWithPassword({ ... })
});

afterAll(async () => {
  // Cleanup test data if necessary
});
