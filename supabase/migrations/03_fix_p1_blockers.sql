-- =============================================================================
-- SVRERP02 Migration 03: P1 Blockers Fixes
-- Recreates helpers, creates missing tables, secures all tables with org_id
-- and triggers, flushes all old public policies, and creates missing RPCs.
-- =============================================================================

-- Create helper functions in public schema (since auth schema is read-only for migrations)
CREATE OR REPLACE FUNCTION public.user_role()
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

CREATE OR REPLACE FUNCTION public.role_rank(role_name TEXT)
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

CREATE OR REPLACE FUNCTION public.has_role_at_least(min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.role_rank(public.user_role()) >= public.role_rank(min_role);
$$;

GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_at_least(TEXT) TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. Create Missing Table: batch_components
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  lot_id       TEXT REFERENCES public.lots(id) ON DELETE SET NULL,
  material     TEXT NOT NULL,
  planned_qty  NUMERIC(12, 4) NOT NULL DEFAULT 0,
  actual_qty   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'kg',
  unit_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(8, 4) GENERATED ALWAYS AS (
    CASE
      WHEN planned_qty = 0 THEN NULL
      ELSE ROUND(((actual_qty - planned_qty) / planned_qty) * 100, 4)
    END
  ) STORED,
  comp_notes   TEXT,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_components_batch ON public.batch_components(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_components_lot   ON public.batch_components(lot_id);
CREATE INDEX IF NOT EXISTS idx_batch_components_added ON public.batch_components(created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_batch_components()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_batch_components_updated ON public.batch_components;
CREATE TRIGGER trg_batch_components_updated
  BEFORE UPDATE ON public.batch_components
  FOR EACH ROW EXECUTE FUNCTION public.touch_batch_components();

-- -----------------------------------------------------------------------------
-- 3. Create Missing Table: audit_schedules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_no       TEXT NOT NULL,
  audit_type     TEXT NOT NULL,
  department     TEXT,
  auditor        TEXT,
  scheduled_date DATE NOT NULL,
  scope          TEXT,
  status         TEXT NOT NULL DEFAULT 'Scheduled',
  notes          TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_schedules_date ON public.audit_schedules(scheduled_date DESC);

-- -----------------------------------------------------------------------------
-- 4. Dynamically Add org_id to public Tables
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  default_org_id uuid;
BEGIN
  -- Ensure organization exists
  INSERT INTO public.organizations (name) VALUES ('Srivriddhi Enterprise') ON CONFLICT DO NOTHING;
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

  FOR r IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE' 
      AND table_name NOT IN ('organizations', 'profiles')
      AND table_name NOT IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'org_id'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);', r.table_name);
      
      IF default_org_id IS NOT NULL THEN
        EXECUTE format('UPDATE public.%I SET org_id = %L WHERE org_id IS NULL;', r.table_name, default_org_id);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add org_id to table %: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Create Trigger for org_id Auto-Set
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_org_id()
RETURNS TRIGGER SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  user_org_id uuid;
BEGIN
  IF NEW.org_id IS NULL THEN
    -- Try to fetch org_id from user's profile
    SELECT org_id INTO user_org_id FROM public.profiles WHERE id = auth.uid();
    
    -- Fallback to first organization if profiles doesn't contain it or user not logged in
    IF user_org_id IS NULL THEN
      SELECT id INTO user_org_id FROM public.organizations LIMIT 1;
    END IF;
    
    NEW.org_id := user_org_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'org_id'
      AND table_name NOT IN ('organizations', 'profiles')
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_id ON public.%I;', r.table_name);
      EXECUTE format('CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_org_id();', r.table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create trigger on table %: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Flush All Policies & Rebuild with Tenant Isolation
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 6.1 Organizations Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated USING (id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY organizations_admin ON public.organizations
  FOR ALL TO authenticated USING (public.has_role_at_least('ADMIN'));

-- 6.2 Profiles Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role_at_least('ADMIN'));
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role_at_least('ADMIN'));

-- 6.3 Standard Tables Policies Loop
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'org_id'
      AND table_name NOT IN ('organizations', 'profiles')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
      
      -- SELECT: restricted to org
      EXECUTE format('
        CREATE POLICY %I_select ON public.%I
          FOR SELECT TO authenticated 
          USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
      ', r.table_name, r.table_name);
      
      -- INSERT: restricted to org + OPERATOR
      EXECUTE format('
        CREATE POLICY %I_insert ON public.%I
          FOR INSERT TO authenticated 
          WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role_at_least(''OPERATOR''));
      ', r.table_name, r.table_name);

      -- UPDATE: restricted to org + OPERATOR
      EXECUTE format('
        CREATE POLICY %I_update ON public.%I
          FOR UPDATE TO authenticated 
          USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role_at_least(''OPERATOR''))
          WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role_at_least(''OPERATOR''));
      ', r.table_name, r.table_name);

      -- DELETE: restricted to org + MANAGER
      EXECUTE format('
        CREATE POLICY %I_delete ON public.%I
          FOR DELETE TO authenticated 
          USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role_at_least(''MANAGER''));
      ', r.table_name, r.table_name);
      
      EXECUTE format('GRANT ALL ON public.%I TO authenticated;', r.table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not recreate RLS for table %: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 7. Create Missing RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hello_world()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'hello'::text;
$$;

CREATE OR REPLACE FUNCTION public.get_batch_consumed_lots(p_batch_id text)
RETURNS TABLE (
  id text,
  batch_id text,
  batch_no text,
  lot_id text,
  lot_no text,
  material text,
  qty_consumed numeric,
  rate numeric,
  cost numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, batch_id, batch_no, lot_id, lot_no, material, qty_consumed, rate, cost, created_at
  FROM public.consumed_lots
  WHERE batch_id = p_batch_id;
$$;

GRANT EXECUTE ON FUNCTION public.hello_world() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_batch_consumed_lots(text) TO authenticated;
