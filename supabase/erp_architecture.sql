-- ============================================================
-- SVR Enterprise ERP Architecture Scaffold
-- Based on svr_erp_architecture_dashboard.html
--
-- Purpose:
--   Adds the target ERP schemas and core tables beside the current BOS tables.
--   Use this as the migration destination while legacy modules are migrated.
-- ============================================================

create extension if not exists "pgcrypto";

create schema if not exists iam;
create schema if not exists md;
create schema if not exists recipe;
create schema if not exists inv;
create schema if not exists mfg;
create schema if not exists qa;
create schema if not exists fin;
create schema if not exists cms;
create schema if not exists dms;
create schema if not exists log;

-- ------------------------------------------------------------
-- IAM: org isolation and role checks
-- ------------------------------------------------------------
create table if not exists iam.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  created_at timestamptz not null default now()
);

create table if not exists iam.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OPERATOR','QC','EDITOR','MANAGER','ADMIN')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create or replace function iam.is_at_least(required_role text, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = iam, public
as $$
  select exists (
    select 1
    from iam.org_members om
    where om.org_id = target_org_id
      and om.user_id = auth.uid()
      and om.is_active
      and array_position(array['OPERATOR','QC','EDITOR','MANAGER','ADMIN'], om.role)
          >= array_position(array['OPERATOR','QC','EDITOR','MANAGER','ADMIN'], required_role)
  );
$$;

-- ------------------------------------------------------------
-- Master data
-- ------------------------------------------------------------
create table if not exists md.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  code text not null,
  name text not null,
  unique (org_id, code)
);

create table if not exists md.items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  item_type text not null check (item_type in ('RAW_MATERIAL','PACKAGING','WIP','FINISHED_GOOD','SERVICE')),
  code text not null,
  name text not null,
  base_uom text not null default 'kg',
  gst_pct numeric(5,2) not null default 0 check (gst_pct >= 0 and gst_pct <= 28),
  allergens text[] not null default '{}',
  is_active boolean not null default true,
  unique (org_id, code)
);

create table if not exists md.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  code text not null,
  name text not null,
  gstin text,
  credit_terms_days integer not null default 0,
  unique (org_id, code)
);

create table if not exists md.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  code text not null,
  name text not null,
  gstin text,
  payment_terms_days integer not null default 0,
  unique (org_id, code)
);

create table if not exists md.work_centers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  site_id uuid references md.sites(id),
  code text not null,
  name text not null,
  capacity_per_hour numeric(12,3),
  unique (org_id, code)
);

-- ------------------------------------------------------------
-- Recipe: versioned BOM and routing
-- ------------------------------------------------------------
create table if not exists recipe.recipes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  product_item_id uuid not null references md.items(id),
  code text not null,
  name text not null,
  active_version_id uuid,
  unique (org_id, code)
);

create table if not exists recipe.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipe.recipes(id) on delete cascade,
  version_no integer not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','APPROVED','ACTIVE','SUPERSEDED','FROZEN')),
  yield_target_pct numeric(6,2),
  output_qty numeric(12,3) not null check (output_qty > 0),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  unique (recipe_id, version_no)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_active_version_fk'
      and conrelid = 'recipe.recipes'::regclass
  ) then
    alter table recipe.recipes
      add constraint recipes_active_version_fk
      foreign key (active_version_id) references recipe.recipe_versions(id);
  end if;
end $$;

create unique index if not exists uq_one_active_recipe_version
on recipe.recipe_versions(recipe_id)
where status = 'ACTIVE';

create table if not exists recipe.bom_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references recipe.recipe_versions(id) on delete cascade,
  component_item_id uuid not null references md.items(id),
  qty_per numeric(12,4) not null check (qty_per > 0),
  scrap_pct numeric(6,2) not null default 0,
  pct_of_output numeric(8,4),
  allergen_flag boolean not null default false
);

create table if not exists recipe.routing_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references recipe.recipe_versions(id) on delete cascade,
  step_no integer not null,
  work_center_id uuid references md.work_centers(id),
  instruction text,
  is_qc_checkpoint boolean not null default false,
  unique (recipe_version_id, step_no)
);

create table if not exists recipe.approval_requests (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references recipe.recipe_versions(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  requested_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  notes text
);

-- ------------------------------------------------------------
-- Inventory: lots, append-only ledger, reservations
-- ------------------------------------------------------------
create table if not exists inv.lots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  item_id uuid not null references md.items(id),
  lot_code text not null,
  lot_type text not null check (lot_type in ('RAW','WIP','FG')),
  status text not null default 'QC_PENDING' check (status in ('QC_PENDING','APPROVED','HOLD','REJECTED','EXPIRED')),
  expiry_date date,
  batch_ref uuid,
  unique (org_id, lot_code)
);

create table if not exists inv.movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  movement_type text not null check (movement_type in ('GRN_IN','BATCH_ISSUE','BATCH_YIELD','DISPATCH_SHIP','ADJUSTMENT','WIP_IN')),
  qty numeric(14,4) not null check (qty <> 0),
  lot_id uuid not null references inv.lots(id),
  ref_table text,
  ref_id uuid,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create or replace rule inv_movements_no_update as
on update to inv.movements do instead nothing;

create or replace rule inv_movements_no_delete as
on delete to inv.movements do instead nothing;

create table if not exists inv.reservations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  lot_id uuid not null references inv.lots(id),
  qty numeric(14,4) not null check (qty > 0),
  ref_table text not null,
  ref_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CONSUMED','RELEASED','BLOCKED')),
  created_at timestamptz not null default now()
);

create or replace view inv.v_stock_on_hand as
select
  l.org_id,
  l.item_id,
  m.lot_id,
  sum(m.qty) as qty_on_hand
from inv.movements m
join inv.lots l on l.id = m.lot_id
group by l.org_id, l.item_id, m.lot_id;

-- ------------------------------------------------------------
-- Manufacturing
-- ------------------------------------------------------------
create table if not exists mfg.production_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  po_code text not null,
  product_item_id uuid not null references md.items(id),
  recipe_version_id uuid not null references recipe.recipe_versions(id),
  planned_qty numeric(14,4) not null check (planned_qty > 0),
  status text not null default 'PLANNED' check (status in ('PLANNED','NEEDS_REPLAN','RUNNING','QA_HOLD','COMPLETED','REJECTED','CLOSED')),
  scheduled_start date,
  unique (org_id, po_code)
);

create table if not exists mfg.batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  production_order_id uuid not null references mfg.production_orders(id),
  batch_code text not null,
  status text not null default 'PLANNED' check (status in ('PLANNED','RUNNING','QA_HOLD','COMPLETED','REJECTED','CLOSED')),
  actual_qty numeric(14,4) not null default 0,
  planned_qty numeric(14,4) not null default 0,
  yield_pct numeric(8,3) generated always as (
    case when planned_qty > 0 then round((actual_qty / planned_qty) * 100, 3) else 0 end
  ) stored,
  fg_lot_id uuid references inv.lots(id),
  unique (org_id, batch_code)
);

create table if not exists mfg.batch_consumption (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references mfg.batches(id) on delete cascade,
  item_id uuid not null references md.items(id),
  lot_id uuid not null references inv.lots(id),
  qty numeric(14,4) not null check (qty > 0),
  movement_id uuid references inv.movements(id)
);

-- ------------------------------------------------------------
-- QA/QC
-- ------------------------------------------------------------
create table if not exists qa.qc_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  item_id uuid references md.items(id),
  name text not null,
  is_active boolean not null default true
);

create table if not exists qa.qc_specs (
  id uuid primary key default gen_random_uuid(),
  qc_plan_id uuid not null references qa.qc_plans(id) on delete cascade,
  parameter text not null,
  specification text not null,
  is_critical boolean not null default false
);

create table if not exists qa.qc_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  qc_plan_id uuid references qa.qc_plans(id),
  stage text not null check (stage in ('INWARD','IN_PROCESS','FINISHED_GOOD','DISPATCH')),
  batch_id uuid references mfg.batches(id),
  lot_id uuid references inv.lots(id),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED','CANCELLED')),
  coa_number text
);

create table if not exists qa.qc_results (
  id uuid primary key default gen_random_uuid(),
  qc_run_id uuid not null references qa.qc_runs(id) on delete cascade,
  qc_spec_id uuid references qa.qc_specs(id),
  result_value text,
  verdict text not null check (verdict in ('PASS','FAIL','NA')),
  remarks text
);

create table if not exists qa.release_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  entity_table text not null,
  entity_id uuid not null,
  decision text not null check (decision in ('RELEASE','HOLD','REJECT')),
  reason text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz not null default now()
);

create table if not exists qa.capas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  capa_type text not null,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','PENDING_VERIFICATION','CLOSED')),
  owner_user_id uuid references auth.users(id),
  target_date date,
  closed_at timestamptz
);

create table if not exists qa.recall_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  recall_no text not null,
  lot_id uuid references inv.lots(id),
  reason text not null,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','CLOSED')),
  unique (org_id, recall_no)
);

-- ------------------------------------------------------------
-- Finance and GL
-- ------------------------------------------------------------
create table if not exists fin.dispatch_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  customer_id uuid not null references md.customers(id),
  do_code text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','SHIPPED','INVOICED','BLOCKED')),
  actual_ship_date date,
  challan_no text,
  unique (org_id, do_code)
);

create table if not exists fin.dispatch_lines (
  id uuid primary key default gen_random_uuid(),
  dispatch_order_id uuid not null references fin.dispatch_orders(id) on delete cascade,
  item_id uuid not null references md.items(id),
  lot_id uuid references inv.lots(id),
  qty numeric(14,4) not null check (qty > 0),
  rate numeric(14,4) not null check (rate >= 0),
  gst_pct numeric(5,2) not null default 0,
  line_total numeric(14,2) generated always as (round((qty * rate) * (1 + gst_pct / 100), 2)) stored
);

create table if not exists fin.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  dispatch_order_id uuid references fin.dispatch_orders(id),
  invoice_no text not null,
  status text not null default 'UNPAID' check (status in ('UNPAID','PARTIAL','PAID','VOID')),
  grand_total numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, invoice_no)
);

create table if not exists fin.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  invoice_id uuid not null references fin.invoices(id),
  amount numeric(14,2) not null check (amount > 0),
  mode text not null default 'BANK',
  reference text,
  payment_date date not null default current_date
);

create table if not exists fin.gl_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  unique (org_id, code)
);

create table if not exists fin.journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  source_table text,
  source_id uuid,
  posted_at timestamptz not null default now(),
  memo text
);

create table if not exists fin.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references fin.journal_entries(id) on delete cascade,
  gl_account_id uuid not null references fin.gl_accounts(id),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

-- ------------------------------------------------------------
-- CMS, documents, immutable logs, and outbox
-- ------------------------------------------------------------
create table if not exists cms.product_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  item_id uuid not null references md.items(id),
  slug text not null,
  title text not null,
  seo_title text,
  seo_description text,
  is_published boolean not null default false,
  unique (org_id, slug)
);

create table if not exists cms.media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  bucket text not null,
  object_path text not null,
  alt_text text,
  sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists cms.entity_media_links (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references cms.media_assets(id) on delete cascade,
  entity_table text not null,
  entity_id uuid not null,
  sort_order integer not null default 0
);

create table if not exists cms.seo_targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  entity_table text not null,
  entity_id uuid not null,
  meta_title text,
  meta_description text,
  canonical_url text
);

create table if not exists dms.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  title text not null,
  doc_type text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table if not exists dms.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references dms.documents(id) on delete cascade,
  version_no integer not null,
  bucket text not null,
  object_path text not null,
  sha256 text not null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  unique (document_id, version_no)
);

create table if not exists dms.entity_document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references dms.documents(id) on delete cascade,
  entity_table text not null,
  entity_id uuid not null
);

create table if not exists log.activity_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references iam.orgs(id),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  prev_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create or replace rule activity_logs_no_update as
on update to log.activity_logs do instead nothing;

create or replace rule activity_logs_no_delete as
on delete to log.activity_logs do instead nothing;

create table if not exists log.outbox_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references iam.orgs(id),
  event_type text not null,
  entity_table text not null,
  entity_id uuid,
  payload jsonb not null default '{}',
  processed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS baseline: enabled everywhere. Replace permissive legacy
-- policies with org-scoped policies as each module migrates.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname in ('iam','md','recipe','inv','mfg','qa','fin','cms','dms','log')
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;
end $$;

-- Common indexes from the architecture dashboard.
create index if not exists idx_org_members_user on iam.org_members(user_id);
create index if not exists idx_items_org_type on md.items(org_id, item_type);
create index if not exists idx_lots_item_status on inv.lots(item_id, status);
create index if not exists idx_lots_expiry on inv.lots(expiry_date);
create index if not exists idx_movements_lot_time on inv.movements(lot_id, occurred_at desc);
create index if not exists idx_reservations_status on inv.reservations(status);
create index if not exists idx_po_status on mfg.production_orders(status);
create index if not exists idx_batches_status on mfg.batches(status);
create index if not exists idx_qc_runs_batch on qa.qc_runs(batch_id);
create index if not exists idx_release_decisions_entity on qa.release_decisions(entity_table, entity_id);
create index if not exists idx_dispatch_status on fin.dispatch_orders(status);
create index if not exists idx_invoice_status on fin.invoices(status);
create index if not exists idx_activity_entity on log.activity_logs(entity_table, entity_id);
create index if not exists idx_outbox_pending on log.outbox_events(processed_at) where processed_at is null;
