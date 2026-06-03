-- ============================================================
-- SVR Business OS — Supabase Database Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

-- ─── TABLE: grns (Goods Receipt Notes / Inward) ───────────────
create table if not exists grns (
  id           text primary key default gen_random_uuid()::text,
  grn_no       text not null,
  supplier     text not null,
  material     text not null,
  lot_no       text,
  qty          numeric(12,3) not null,
  uom          text default 'kg',
  rate         numeric(12,2) not null,
  gst_pct      numeric(5,2) default 0,
  gst_amt      numeric(12,2) default 0,
  total_cost   numeric(12,2) not null,
  mfg_date     date,
  expiry_date  date,
  invoice_no   text,
  vehicle_no   text,
  remarks      text,
  status       text default 'QC_PENDING'
               check (status in ('QC_PENDING','QC_DONE','REJECTED')),
  reject_reason text,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: lots (Raw Material Lots — created from GRN on approval) ──
create table if not exists lots (
  id           text primary key default gen_random_uuid()::text,
  lot_no       text,
  material     text not null,
  supplier     text,
  qty          numeric(12,3) not null,
  remaining_qty numeric(12,3) not null,
  unit         text default 'kg',
  rate         numeric(12,2),
  total_cost   numeric(12,2),
  mfg_date     date,
  expiry_date  date,
  qc_status    text default 'approved'
               check (qc_status in ('pending','approved','rejected')),
  grn_id       text references grns(id),
  created_at   timestamptz default now()
);

-- ─── TABLE: batches (Production Batches) ──────────────────────
create table if not exists batches (
  id           text primary key default gen_random_uuid()::text,
  batch_no     text not null,
  product      text not null,
  planned_qty  numeric(12,3) not null,
  actual_qty   numeric(12,3) default 0,
  reject_qty   numeric(12,3) default 0,
  yield_pct    numeric(6,2) default 0,
  unit         text default 'kg',
  line         text,
  operator     text,
  overhead     numeric(12,2) default 0,
  labour       numeric(12,2) default 0,
  total_cost   numeric(12,2) default 0,
  unit_cost    numeric(12,4) default 0,
  notes        text,
  comp_notes   text,
  status       text default 'PLANNED'
               check (status in ('PLANNED','RUNNING','QC_HOLD','COMPLETED','REJECTED')),
  qc_verdict   text,
  coa_no       text,
  start_time   timestamptz,
  end_time     timestamptz,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: qc_checks (Quality Control Records + CoA) ────────
create table if not exists qc_checks (
  id           text primary key default gen_random_uuid()::text,
  batch_id     text references batches(id),
  batch_no     text,
  product      text,
  results      jsonb,          -- array of {type, parameter, specification, result, verdict}
  overall      text check (overall in ('pass','fail','pending')),
  coa_issued   boolean default false,
  coa_number   text,
  analyst      text,
  reviewer     text,
  pack_size    text,
  format_no    text,
  remarks      text,
  tested_by    text,
  tested_at    timestamptz default now()
);

-- ─── TABLE: fg_lots (Finished Goods — created on QC pass) ────
create table if not exists fg_lots (
  id            text primary key default gen_random_uuid()::text,
  batch_id      text references batches(id),
  batch_no      text,
  product       text not null,
  qty           numeric(12,3),
  available_qty numeric(12,3),
  unit          text default 'kg',
  unit_cost     numeric(12,4) default 0,
  total_value   numeric(12,2) default 0,
  coa_no        text,
  created_at    timestamptz default now()
);

-- ─── TABLE: dispatches (Dispatch Orders) ─────────────────────
create table if not exists dispatches (
  id           text primary key default gen_random_uuid()::text,
  do_no        text not null,
  customer     text not null,
  product      text not null,
  batch_no     text,                  -- LINK-005: which FG batch was dispatched (traceability)
  qty          numeric(12,3) not null,
  unit         text default 'kg',
  rate         numeric(12,2) not null,
  gst_pct      numeric(5,2) default 18,
  gst_amt      numeric(12,2),
  subtotal     numeric(12,2),
  total        numeric(12,2),
  vehicle_no   text,
  lr_no        text,
  transporter  text,
  notes        text,
  status       text default 'DRAFT'
               check (status in ('DRAFT','CONFIRMED','DISPATCHED')),
  dispatched_at timestamptz,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: invoices (Auto-created when DO is dispatched) ────
create table if not exists invoices (
  id           text primary key default gen_random_uuid()::text,
  invoice_no   text not null,
  customer     text not null,
  do_id        text references dispatches(id),
  do_no        text,
  product      text,
  qty          numeric(12,3),
  rate         numeric(12,2),
  subtotal     numeric(12,2),
  gst_pct      numeric(5,2),
  gst_amt      numeric(12,2),
  total        numeric(12,2) not null,
  paid_amt     numeric(12,2) default 0,
  status       text default 'UNPAID'
               check (status in ('UNPAID','PARTIAL','PAID')),
  date         date default current_date,
  created_at   timestamptz default now()
);

-- ─── TABLE: payments (Payment records against invoices) ───────
create table if not exists payments (
  id           text primary key default gen_random_uuid()::text,
  invoice_id   text references invoices(id),
  invoice_no   text,
  customer     text,
  amount       numeric(12,2) not null,
  mode         text default 'BANK',
  reference    text,
  payment_date date,
  recorded_by  text,
  created_at   timestamptz default now()
);

-- ─── TABLE: expenses (Manual expense entries) ─────────────────
create table if not exists expenses (
  id           text primary key default gen_random_uuid()::text,
  category     text not null,
  date         date not null,
  description  text not null,
  amount       numeric(12,2) not null,
  paid_by      text default 'Cash',
  notes        text,
  created_by   text,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- LINK-010 FIX: All "allow_all" policies replaced with
-- auth.uid() IS NOT NULL — authenticated users only.
-- Previously: using (true) → ANY anonymous caller could
-- read/write/delete all factory data via the anon key.
-- ============================================================

alter table grns        enable row level security;
alter table lots        enable row level security;
alter table batches     enable row level security;
alter table qc_checks   enable row level security;
alter table fg_lots     enable row level security;
alter table dispatches  enable row level security;
alter table invoices    enable row level security;
alter table payments    enable row level security;
alter table expenses    enable row level security;

drop policy if exists "auth_only_grns" on grns;
create policy "auth_only_grns"
  on grns for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_lots" on lots;
create policy "auth_only_lots"
  on lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_batches" on batches;
create policy "auth_only_batches"
  on batches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_qc_checks" on qc_checks;
create policy "auth_only_qc_checks"
  on qc_checks for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_fg_lots" on fg_lots;
create policy "auth_only_fg_lots"
  on fg_lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_dispatches" on dispatches;
create policy "auth_only_dispatches"
  on dispatches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_invoices" on invoices;
create policy "auth_only_invoices"
  on invoices for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_payments" on payments;
create policy "auth_only_payments"
  on payments for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_expenses" on expenses;
create policy "auth_only_expenses"
  on expenses for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================================
-- UNIQUE CONSTRAINTS (LINK-009)
-- Prevent duplicate GRN/batch/DO numbers at DB level.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'grns_grn_no_unique') then
    alter table grns add constraint grns_grn_no_unique unique (grn_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'batches_batch_no_unique') then
    alter table batches add constraint batches_batch_no_unique unique (batch_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dispatches_do_no_unique') then
    alter table dispatches add constraint dispatches_do_no_unique unique (do_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_invoice_no_unique') then
    alter table invoices add constraint invoices_invoice_no_unique unique (invoice_no);
  end if;
end $$;

-- ============================================================
-- INDEXES (for fast queries on commonly filtered columns)
-- ============================================================

create index if not exists idx_grns_status        on grns(status);
create index if not exists idx_grns_created       on grns(created_at desc);
create index if not exists idx_lots_qc_status     on lots(qc_status);
create index if not exists idx_lots_expiry        on lots(expiry_date);
create index if not exists idx_lots_material      on lots(material);         -- for FEFO queries
create index if not exists idx_batches_status     on batches(status);
create index if not exists idx_batches_created    on batches(created_at desc);
create index if not exists idx_qc_batch_id        on qc_checks(batch_id);
create index if not exists idx_fg_lots_product    on fg_lots(product);
create index if not exists idx_fg_lots_batch_no   on fg_lots(batch_no);      -- LINK-005 trace
create index if not exists idx_dispatches_status  on dispatches(status);
create index if not exists idx_dispatches_batch_no on dispatches(batch_no);  -- LINK-005 trace
create index if not exists idx_invoices_status    on invoices(status);
create index if not exists idx_invoices_customer  on invoices(customer);
create index if not exists idx_expenses_category  on expenses(category);
create index if not exists idx_expenses_date      on expenses(date desc);

-- ============================================================
-- TABLE: consumed_lots (LINK-001 — RM consumption audit trail)
-- Created when batch is completed: tracks which lots were used
-- ============================================================
create table if not exists consumed_lots (
  id           text primary key default gen_random_uuid()::text,
  batch_id     text references batches(id) on delete cascade,
  batch_no     text not null,
  lot_id       text references lots(id),
  lot_no       text,
  material     text not null,
  qty_consumed numeric(12,3) not null,
  rate         numeric(12,2),          -- rate at time of consumption (for cost calc)
  cost         numeric(12,2),          -- qty_consumed × rate
  created_at   timestamptz default now()
);

alter table consumed_lots enable row level security;
drop policy if exists "auth_only_consumed_lots" on consumed_lots;
create policy "auth_only_consumed_lots"
  on consumed_lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create index if not exists idx_consumed_lots_batch_id  on consumed_lots(batch_id);
create index if not exists idx_consumed_lots_lot_id    on consumed_lots(lot_id);
create index if not exists idx_consumed_lots_material  on consumed_lots(material);

-- ============================================================
-- Done! All tables created with secure RLS policies.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
--  FOOD SAFETY MODULES — ISO 22000 / FSSAI / Codex
-- ═══════════════════════════════════════════════════════════

-- ── HACCP / CCP Monitoring Logs ───────────────────────────
CREATE TABLE IF NOT EXISTS ccp_logs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ccp_id           TEXT NOT NULL,          -- CCP1, CCP2 ...
  ccp_name         TEXT NOT NULL,
  batch_no         TEXT,
  reading          NUMERIC NOT NULL,
  unit             TEXT,
  critical_limit   TEXT,
  result           TEXT NOT NULL,          -- OK | DEVIATION
  corrective_action TEXT,
  checked_by       TEXT,
  remarks          TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── FSSAI Documents Register ──────────────────────────────
CREATE TABLE IF NOT EXISTS fssai_docs (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doc_type     TEXT NOT NULL,
  doc_no       TEXT,
  issue_date   DATE,
  expiry_date  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── FSSAI Audit Log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fssai_audits (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  audit_date  DATE NOT NULL,
  audit_type  TEXT NOT NULL,
  auditor     TEXT,
  findings    TEXT,
  status      TEXT DEFAULT 'Open',         -- Open | CAPA Raised | Closed
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── CAPA Register ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capas (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  capa_no            TEXT NOT NULL UNIQUE,
  source             TEXT NOT NULL,
  description        TEXT NOT NULL,
  rca_method         TEXT,
  rca_text           TEXT,
  corrective_action  TEXT,
  preventive_action  TEXT,
  owner              TEXT,
  target_date        DATE NOT NULL,
  status             TEXT DEFAULT 'Open',  -- Open | In Progress | Pending Verification | Closed
  verification_note  TEXT,
  closed_at          TIMESTAMPTZ,
  closed_by          TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── Allergen Matrix ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS allergen_matrix (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_name  TEXT NOT NULL,
  gluten        TEXT DEFAULT 'absent',     -- absent | present | risk
  crustacean    TEXT DEFAULT 'absent',
  eggs          TEXT DEFAULT 'absent',
  fish          TEXT DEFAULT 'absent',
  peanuts       TEXT DEFAULT 'absent',
  soy           TEXT DEFAULT 'absent',
  milk          TEXT DEFAULT 'absent',
  nuts          TEXT DEFAULT 'absent',
  celery        TEXT DEFAULT 'absent',
  mustard       TEXT DEFAULT 'absent',
  sesame        TEXT DEFAULT 'absent',
  sulphites     TEXT DEFAULT 'absent',
  lupin         TEXT DEFAULT 'absent',
  molluscs      TEXT DEFAULT 'absent',
  declared      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Recall Register ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS recalls (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recall_no       TEXT NOT NULL UNIQUE,
  is_mock         BOOLEAN DEFAULT false,
  batch_ref       TEXT,
  reason          TEXT NOT NULL,
  qty_dispatched  NUMERIC DEFAULT 0,
  qty_recovered   NUMERIC DEFAULT 0,
  unit            TEXT DEFAULT 'kg',
  initiated_by    TEXT,
  customers       TEXT,
  description     TEXT,
  trace_time      TEXT,
  status          TEXT DEFAULT 'Open',     -- Open | In Progress | Closed
  fssai_notified  BOOLEAN,
  closed_at       TIMESTAMPTZ,
  closed_by       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PRP Logs (Cleaning / Pest / Calibration) ─────────────
CREATE TABLE IF NOT EXISTS prp_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prp_type        TEXT NOT NULL,           -- cleaning | pest | calibration
  area            TEXT,                    -- cleaning / pest
  equipment       TEXT,                    -- calibration
  equipment_id    TEXT,
  cleaning_agent  TEXT,
  method          TEXT,
  pest_type       TEXT,
  chemical        TEXT,
  pco_name        TEXT,
  standard        TEXT,
  before_reading  TEXT,
  after_reading   TEXT,
  result          TEXT,
  next_due        DATE,
  done_by         TEXT,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Row Level Security — LINK-010 FIX ─────────────────────────
ALTER TABLE ccp_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_docs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_audits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergen_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp_logs       ENABLE ROW LEVEL SECURITY;

drop policy if exists "auth_only_ccp_logs" on ccp_logs;
CREATE POLICY "auth_only_ccp_logs"
  ON ccp_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_fssai_docs" on fssai_docs;
CREATE POLICY "auth_only_fssai_docs"
  ON fssai_docs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_fssai_audits" on fssai_audits;
CREATE POLICY "auth_only_fssai_audits"
  ON fssai_audits FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_capas" on capas;
CREATE POLICY "auth_only_capas"
  ON capas FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_allergen_matrix" on allergen_matrix;
CREATE POLICY "auth_only_allergen_matrix"
  ON allergen_matrix FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_recalls" on recalls;
CREATE POLICY "auth_only_recalls"
  ON recalls FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_prp_logs" on prp_logs;
CREATE POLICY "auth_only_prp_logs"
  ON prp_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS PATCH — BOS Tables (DB-003 FIX)
-- Added by audit: all BOS operational tables now require
-- authenticated users with a valid BOS role to read/write.
-- ============================================================

-- Helper function for BOS role check
create or replace function bos_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select (auth.jwt()->'app_metadata'->>'role') = ANY(required_roles)
    and auth.uid() is not null;
$$;

-- GRNs
alter table if exists grns enable row level security;
drop policy if exists "BOS read grns" on grns;
drop policy if exists "BOS write grns" on grns;
create policy "BOS read grns"
  on grns for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write grns" on grns;
create policy "BOS write grns"
  on grns for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- Lots
alter table if exists lots enable row level security;
drop policy if exists "BOS read lots" on lots;
drop policy if exists "BOS write lots" on lots;
create policy "BOS read lots"
  on lots for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write lots" on lots;
create policy "BOS write lots"
  on lots for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER']));

-- Batches
alter table if exists batches enable row level security;
drop policy if exists "BOS read batches" on batches;
drop policy if exists "BOS write batches" on batches;
create policy "BOS read batches"
  on batches for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write batches" on batches;
create policy "BOS write batches"
  on batches for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- BOS Recipe tables (rnd_formulas) - RLS handled in rnd_schema.sql
