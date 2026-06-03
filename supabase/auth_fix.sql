-- ==========================================================
-- AUTHENTICATION BUG FIX & ORG MEMBERSHIP AUTO-SETUP
-- ==========================================================

-- 1. Create a function to auto-configure user metadata and confirm email
CREATE OR REPLACE FUNCTION public.auto_setup_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_count int;
  role_name text;
BEGIN
  -- AUTO-CONFIRM EMAIL: This fixes the "Invalid Credentials" error
  NEW.email_confirmed_at = coalesce(NEW.email_confirmed_at, now());
  
  -- Check how many users exist currently (excluding the new one)
  SELECT count(*) INTO user_count FROM auth.users;
  
  -- AUTO-ASSIGN ROLE: If this is the first user, make them ADMIN
  IF user_count = 0 THEN
    role_name := 'ADMIN';
  ELSE
    role_name := coalesce(NEW.raw_app_meta_data->>'role', 'OPERATOR');
  END IF;
  
  NEW.raw_app_meta_data = coalesce(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', role_name);
  
  RETURN NEW;
END;
$$;

-- 2. Attach trigger BEFORE INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_setup_new_user();

-- 3. Create a function to auto-assign new users to the default organization
CREATE OR REPLACE FUNCTION public.add_user_to_default_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, iam
AS $$
DECLARE
  role_name text;
BEGIN
  role_name := coalesce(NEW.raw_app_meta_data->>'role', 'OPERATOR');
  
  INSERT INTO iam.org_members (org_id, user_id, role, is_active)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    NEW.id,
    role_name,
    true
  ) ON CONFLICT (org_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 4. Attach trigger AFTER INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.add_user_to_default_org();

-- 5. Fix existing users: Confirm email and assign role
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

UPDATE auth.users 
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb 
WHERE raw_app_meta_data->>'role' IS NULL;

-- 6. Link all existing users to the default organization Srivriddhi Foods Pvt Ltd
INSERT INTO iam.org_members (org_id, user_id, role, is_active)
SELECT 
  'a0000000-0000-0000-0000-000000000001',
  id,
  coalesce(raw_app_meta_data->>'role', 'ADMIN'),
  true
FROM auth.users
ON CONFLICT (org_id, user_id) DO NOTHING;
