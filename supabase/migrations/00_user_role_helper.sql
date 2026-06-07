-- ============================================================
-- SVRERP02 Migration 00: auth.user_role() Helper Function
-- Must run BEFORE any RLS hardening migrations.
-- Reads role from app_metadata (JWT claims) with safe fallback.
-- ============================================================

-- Helper function: reads the user's role from JWT app_metadata
-- Falls back to 'OPERATOR' if not set (safe default for production)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'OPERATOR'
  );
$$;

-- Role rank helper: returns numeric rank for role comparisons
-- OPERATOR=1, QC=2, EDITOR=2, MANAGER=3, ADMIN=4
CREATE OR REPLACE FUNCTION auth.role_rank(role_name TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE role_name
    WHEN 'OPERATOR' THEN 1
    WHEN 'QC'       THEN 2
    WHEN 'EDITOR'   THEN 2
    WHEN 'MANAGER'  THEN 3
    WHEN 'ADMIN'    THEN 4
    ELSE 1
  END;
$$;

-- Convenience: check if current user has AT LEAST the given role
CREATE OR REPLACE FUNCTION auth.has_role_at_least(min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.role_rank(auth.user_role()) >= auth.role_rank(min_role);
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.role_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.has_role_at_least(TEXT) TO authenticated;

-- ── Verify the setup ──
-- Run this to test after applying:
-- SELECT auth.user_role();  -- should return your role
-- SELECT auth.has_role_at_least('MANAGER');  -- should return true/false
