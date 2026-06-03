import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const masterSql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'master_reset.sql'), 'utf8');
const authFixSql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'auth_fix.sql'), 'utf8');

const insertAdminSql = `
-- ============================================================
-- AUTO-CREATE ADMIN USER (No Email Confirmation required)
-- ============================================================
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'info@srivriddhi.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'info@srivriddhi.com',
      crypt('test@6843', gen_salt('bf')), now(), '{"role": "ADMIN"}', '{}', now(), now()
    );
    
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id, new_user_id::text, jsonb_build_object('sub', new_user_id::text, 'email', 'info@srivriddhi.com'), 'email', now(), now(), now()
    );
  END IF;
END
$$;
`;

const fullSql = masterSql + '\n\n' + authFixSql + '\n\n' + insertAdminSql;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'final_setup.sql'), fullSql, 'utf8');
console.log('Generated final_setup.sql successfully');
