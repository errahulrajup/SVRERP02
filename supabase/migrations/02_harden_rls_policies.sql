-- =============================================================================
-- Migration: 02_harden_rls_policies.sql
-- Description: Drop and recreate all RLS policies with role-based access control.
--              Requires auth.has_role_at_least() from migration 00.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: lots
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS lots_select  ON public.lots;
DROP POLICY IF EXISTS lots_insert  ON public.lots;
DROP POLICY IF EXISTS lots_update  ON public.lots;
DROP POLICY IF EXISTS lots_delete  ON public.lots;

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY lots_select ON public.lots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY lots_insert ON public.lots
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY lots_update ON public.lots
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY lots_delete ON public.lots
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: batches
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS batches_select ON public.batches;
DROP POLICY IF EXISTS batches_insert ON public.batches;
DROP POLICY IF EXISTS batches_update ON public.batches;
DROP POLICY IF EXISTS batches_delete ON public.batches;

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY batches_select ON public.batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY batches_insert ON public.batches
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY batches_update ON public.batches
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY batches_delete ON public.batches
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: grns
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS grns_select ON public.grns;
DROP POLICY IF EXISTS grns_insert ON public.grns;
DROP POLICY IF EXISTS grns_update ON public.grns;
DROP POLICY IF EXISTS grns_delete ON public.grns;

ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;

CREATE POLICY grns_select ON public.grns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY grns_insert ON public.grns
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY grns_update ON public.grns
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY grns_delete ON public.grns
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: fg_lots
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS fg_lots_select ON public.fg_lots;
DROP POLICY IF EXISTS fg_lots_insert ON public.fg_lots;
DROP POLICY IF EXISTS fg_lots_update ON public.fg_lots;
DROP POLICY IF EXISTS fg_lots_delete ON public.fg_lots;

ALTER TABLE public.fg_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY fg_lots_select ON public.fg_lots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fg_lots_insert ON public.fg_lots
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY fg_lots_update ON public.fg_lots
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY fg_lots_delete ON public.fg_lots
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: stock_ledger
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS stock_ledger_select ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_insert ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_update ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_delete ON public.stock_ledger;

ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_ledger_select ON public.stock_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY stock_ledger_insert ON public.stock_ledger
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY stock_ledger_update ON public.stock_ledger
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY stock_ledger_delete ON public.stock_ledger
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: ccp_logs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS ccp_logs_select ON public.ccp_logs;
DROP POLICY IF EXISTS ccp_logs_insert ON public.ccp_logs;
DROP POLICY IF EXISTS ccp_logs_update ON public.ccp_logs;
DROP POLICY IF EXISTS ccp_logs_delete ON public.ccp_logs;

ALTER TABLE public.ccp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccp_logs_select ON public.ccp_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ccp_logs_insert ON public.ccp_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY ccp_logs_update ON public.ccp_logs
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY ccp_logs_delete ON public.ccp_logs
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: prp_logs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS prp_logs_select ON public.prp_logs;
DROP POLICY IF EXISTS prp_logs_insert ON public.prp_logs;
DROP POLICY IF EXISTS prp_logs_update ON public.prp_logs;
DROP POLICY IF EXISTS prp_logs_delete ON public.prp_logs;

ALTER TABLE public.prp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY prp_logs_select ON public.prp_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY prp_logs_insert ON public.prp_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY prp_logs_update ON public.prp_logs
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY prp_logs_delete ON public.prp_logs
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: qc_checks
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS qc_checks_select ON public.qc_checks;
DROP POLICY IF EXISTS qc_checks_insert ON public.qc_checks;
DROP POLICY IF EXISTS qc_checks_update ON public.qc_checks;
DROP POLICY IF EXISTS qc_checks_delete ON public.qc_checks;

ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY qc_checks_select ON public.qc_checks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY qc_checks_insert ON public.qc_checks
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY qc_checks_update ON public.qc_checks
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY qc_checks_delete ON public.qc_checks
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: capas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS capas_select ON public.capas;
DROP POLICY IF EXISTS capas_insert ON public.capas;
DROP POLICY IF EXISTS capas_update ON public.capas;
DROP POLICY IF EXISTS capas_delete ON public.capas;

ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY capas_select ON public.capas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY capas_insert ON public.capas
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY capas_update ON public.capas
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY capas_delete ON public.capas
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- -----------------------------------------------------------------------------
-- TABLE: batch_components
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS batch_components_select ON public.batch_components;
DROP POLICY IF EXISTS batch_components_insert ON public.batch_components;
DROP POLICY IF EXISTS batch_components_update ON public.batch_components;
DROP POLICY IF EXISTS batch_components_delete ON public.batch_components;

ALTER TABLE public.batch_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY batch_components_select ON public.batch_components
  FOR SELECT TO authenticated USING (true);

CREATE POLICY batch_components_insert ON public.batch_components
  FOR INSERT TO authenticated
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY batch_components_update ON public.batch_components
  FOR UPDATE TO authenticated
  USING (auth.has_role_at_least('OPERATOR'))
  WITH CHECK (auth.has_role_at_least('OPERATOR'));

CREATE POLICY batch_components_delete ON public.batch_components
  FOR DELETE TO authenticated
  USING (auth.has_role_at_least('MANAGER'));

-- =============================================================================
-- TABLE: notifications  (create if not exists, then apply RLS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  action_url TEXT,
  read       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop before recreating so re-runs are idempotent
DROP POLICY IF EXISTS notif_select ON public.notifications;
DROP POLICY IF EXISTS notif_insert ON public.notifications;
DROP POLICY IF EXISTS notif_update ON public.notifications;

CREATE POLICY notif_select ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notif_insert ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notif_update ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
