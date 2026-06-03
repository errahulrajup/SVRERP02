-- ============================================================
-- SVR Enterprise ERP Production Hardening
--
-- Run after:
--   schema.sql, rls_patch.sql, bos_schema.sql, bos_recipe_schema.sql,
--   bos_dms_schema.sql, erp_architecture.sql
--
-- This file tightens the ERP target schemas without removing legacy BOS
-- tables. It introduces protected RPC workflows, strict RLS helpers,
-- immutable audit controls, outbox processing, accounting enforcement,
-- document approval lifecycle, analytics views, and stress-test fixtures.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Shared helpers
-- ------------------------------------------------------------
create or replace function iam.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = iam, public
as $$
  select om.org_id
  from iam.org_members om
  where om.user_id = auth.uid()
    and om.is_active
  order by
    case om.role
      when 'ADMIN' then 5
      when 'MANAGER' then 4
      when 'EDITOR' then 3
      when 'QC' then 2
      else 1
    end desc
  limit 1;
$$;

create or replace function iam.require_role(required_role text, target_org_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = iam, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not iam.is_at_least(required_role, target_org_id) then
    raise exception 'Role % required for org %', required_role, target_org_id using errcode = '42501';
  end if;
end;
$$;

create or replace function log.emit_activity(
  target_org_id uuid,
  action_name text,
  entity_table_name text,
  entity_uuid uuid,
  old_value jsonb default null,
  new_value jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = log, public
as $$
declare
  activity_id uuid;
begin
  insert into log.activity_logs(org_id, actor_user_id, action, entity_table, entity_id, prev_value, new_value)
  values (target_org_id, auth.uid(), action_name, entity_table_name, entity_uuid, old_value, new_value)
  returning id into activity_id;

  return activity_id;
end;
$$;

create or replace function log.enqueue_event(
  target_org_id uuid,
  event_name text,
  entity_table_name text,
  entity_uuid uuid,
  event_payload jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = log, public
as $$
declare
  event_id uuid;
begin
  insert into log.outbox_events(org_id, event_type, entity_table, entity_id, payload)
  values (target_org_id, event_name, entity_table_name, entity_uuid, coalesce(event_payload, '{}'))
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function log.claim_outbox_events(batch_size integer default 50)
returns setof log.outbox_events
language plpgsql
security definer
set search_path = log, public
as $$
begin
  perform iam.require_role('ADMIN', iam.current_org_id());

  return query
  with due as (
    select id
    from log.outbox_events
    where processed_at is null
      and attempts < 10
      and (next_attempt_at is null or next_attempt_at <= now())
    order by created_at
    for update skip locked
    limit greatest(1, least(batch_size, 200))
  )
  update log.outbox_events e
  set attempts = e.attempts + 1,
      next_attempt_at = now() + make_interval(secs => least(3600, power(2, e.attempts)::integer * 10))
  from due
  where e.id = due.id
  returning e.*;
end;
$$;

create or replace function log.mark_outbox_processed(event_id uuid)
returns void
language plpgsql
security definer
set search_path = log, public
as $$
begin
  perform iam.require_role('ADMIN', iam.current_org_id());

  update log.outbox_events
  set processed_at = now(),
      last_error = null
  where id = event_id;
end;
$$;

create or replace function log.mark_outbox_failed(event_id uuid, error_message text)
returns void
language plpgsql
security definer
set search_path = log, public
as $$
begin
  perform iam.require_role('ADMIN', iam.current_org_id());

  update log.outbox_events
  set last_error = left(error_message, 1000),
      next_attempt_at = now() + make_interval(secs => least(3600, power(2, attempts)::integer * 10))
  where id = event_id;
end;
$$;

alter table log.outbox_events
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_error text;

grant execute on function log.mark_outbox_processed(uuid) to authenticated;
grant execute on function log.mark_outbox_failed(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Strong RLS policies for ERP schemas
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
    execute format('alter table %I.%I force row level security', r.schemaname, r.tablename);
  end loop;
end $$;

drop policy if exists "org member read orgs" on iam.orgs;
create policy "org member read orgs"
on iam.orgs for select
using (exists (
  select 1 from iam.org_members om
  where om.org_id = orgs.id and om.user_id = auth.uid() and om.is_active
));

drop policy if exists "self read memberships" on iam.org_members;
create policy "self read memberships"
on iam.org_members for select
using (user_id = auth.uid() or iam.is_at_least('ADMIN', org_id));

drop policy if exists "admin manage memberships" on iam.org_members;
create policy "admin manage memberships"
on iam.org_members for all
using (iam.is_at_least('ADMIN', org_id))
with check (iam.is_at_least('ADMIN', org_id));

do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname in ('md','recipe','inv','mfg','qa','fin','cms','dms','log')
      and exists (
        select 1
        from information_schema.columns c
        where c.table_schema = schemaname
          and c.table_name = tablename
          and c.column_name = 'org_id'
      )
  loop
    policy_name := format('org scoped access %s_%s', r.schemaname, r.tablename);
    execute format('drop policy if exists %I on %I.%I', policy_name, r.schemaname, r.tablename);
    execute format(
      'create policy %I on %I.%I for all using (iam.is_at_least(''OPERATOR'', org_id)) with check (iam.is_at_least(''OPERATOR'', org_id))',
      policy_name, r.schemaname, r.tablename
    );
  end loop;
end $$;

drop policy if exists "read own org stock view" on inv.movements;
create policy "read own org stock view"
on inv.movements for select
using (iam.is_at_least('OPERATOR', org_id));

-- ------------------------------------------------------------
-- Immutable and append-only controls
-- ------------------------------------------------------------
create or replace function log.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is immutable', tg_table_schema || '.' || tg_table_name using errcode = '55000';
end;
$$;

drop trigger if exists activity_logs_immutable on log.activity_logs;
create trigger activity_logs_immutable
before update or delete on log.activity_logs
for each row execute function log.prevent_mutation();

drop trigger if exists inv_movements_immutable on inv.movements;
create trigger inv_movements_immutable
before update or delete on inv.movements
for each row execute function log.prevent_mutation();

-- Legacy BOS tables: remove obvious open policies if this script is applied.
do $$
declare
  t text;
begin
  foreach t in array array['grns','lots','batches','qc_checks','fg_lots','dispatches','invoices','payments','expenses'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', 'allow_all_' || t, t);
    end if;
  end loop;

  foreach t in array array['products','recipes','recipe_inputs','recipe_steps','documents','dms_companies'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', 'allow_all_' || t, t);
      -- If the table is documents or dms_companies, create replacement auth_only policy
      if t in ('documents', 'dms_companies') then
        execute format('drop policy if exists %I on public.%I', 'auth_only_' || t, t);
        execute format('create policy %I on public.%I for all using (auth.uid() is not null) with check (auth.uid() is not null)', 'auth_only_' || t, t);
      end if;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Recipe intelligence and workflow RPCs
-- ------------------------------------------------------------
alter table recipe.bom_lines
  add column if not exists unit_cost numeric(14,4) not null default 0,
  add column if not exists kcal_per_unit numeric(14,4) not null default 0,
  add column if not exists protein_per_unit numeric(14,4) not null default 0,
  add column if not exists fat_per_unit numeric(14,4) not null default 0,
  add column if not exists carbs_per_unit numeric(14,4) not null default 0;

create or replace view recipe.v_recipe_costing as
select
  rv.id as recipe_version_id,
  r.org_id,
  sum(bl.qty_per * (1 + bl.scrap_pct / 100) * bl.unit_cost) as material_cost,
  sum(bl.qty_per * bl.kcal_per_unit) as kcal,
  sum(bl.qty_per * bl.protein_per_unit) as protein,
  sum(bl.qty_per * bl.fat_per_unit) as fat,
  sum(bl.qty_per * bl.carbs_per_unit) as carbs,
  bool_or(bl.allergen_flag) as has_allergen_flag
from recipe.recipe_versions rv
join recipe.recipes r on r.id = rv.recipe_id
left join recipe.bom_lines bl on bl.recipe_version_id = rv.id
group by rv.id, r.org_id;

create or replace function recipe.activate_version(target_version_id uuid)
returns void
language plpgsql
security definer
set search_path = recipe, public
as $$
declare
  rec recipe.recipes%rowtype;
  old_status text;
begin
  select r.* into rec
  from recipe.recipe_versions rv
  join recipe.recipes r on r.id = rv.recipe_id
  where rv.id = target_version_id
  for update;

  if not found then raise exception 'Recipe version not found'; end if;
  perform iam.require_role('MANAGER', rec.org_id);

  select status into old_status from recipe.recipe_versions where id = target_version_id for update;
  if old_status not in ('APPROVED','ACTIVE') then
    raise exception 'Only APPROVED recipe versions can be activated. Current status: %', old_status;
  end if;

  update recipe.recipe_versions
  set status = 'SUPERSEDED'
  where recipe_id = rec.id and status = 'ACTIVE' and id <> target_version_id;

  update recipe.recipe_versions set status = 'ACTIVE' where id = target_version_id;
  update recipe.recipes set active_version_id = target_version_id where id = rec.id;

  perform log.emit_activity(rec.org_id, 'recipe.activate_version', 'recipe.recipe_versions', target_version_id, jsonb_build_object('status', old_status), jsonb_build_object('status', 'ACTIVE'));
  perform log.enqueue_event(rec.org_id, 'recipe.version_activated', 'recipe.recipe_versions', target_version_id, jsonb_build_object('recipe_id', rec.id));
end;
$$;

create or replace function recipe.scale_bom(target_version_id uuid, target_output_qty numeric)
returns table(component_item_id uuid, scaled_qty numeric, allergens text[])
language sql
stable
security definer
set search_path = recipe, public
as $$
  select
    bl.component_item_id,
    round(bl.qty_per * (target_output_qty / nullif(rv.output_qty, 0)), 4) as scaled_qty,
    i.allergens
  from recipe.recipe_versions rv
  join recipe.recipes r on r.id = rv.recipe_id
  join recipe.bom_lines bl on bl.recipe_version_id = rv.id
  join md.items i on i.id = bl.component_item_id
  where rv.id = target_version_id
    and iam.is_at_least('OPERATOR', r.org_id);
$$;

-- ------------------------------------------------------------
-- Inventory, manufacturing, QA, dispatch, invoices
-- ------------------------------------------------------------
create or replace function inv.available_qty(target_lot_id uuid)
returns numeric
language sql
stable
security definer
set search_path = inv, public
as $$
  select coalesce(sum(m.qty), 0)
       - coalesce((select sum(r.qty) from inv.reservations r where r.lot_id = target_lot_id and r.status = 'ACTIVE'), 0)
  from inv.movements m
  where m.lot_id = target_lot_id;
$$;

create or replace function inv.reserve_lot(target_lot_id uuid, reserve_qty numeric, ref_table_name text, ref_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = inv, public
as $$
declare
  lot inv.lots%rowtype;
  reservation_id uuid;
begin
  if reserve_qty <= 0 then raise exception 'Reservation quantity must be positive'; end if;

  select * into lot from inv.lots where id = target_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  perform iam.require_role('OPERATOR', lot.org_id);

  if lot.status <> 'APPROVED' then
    raise exception 'Lot % is not approved for reservation', lot.lot_code;
  end if;

  if inv.available_qty(target_lot_id) < reserve_qty then
    raise exception 'Insufficient available stock for lot %', lot.lot_code;
  end if;

  insert into inv.reservations(org_id, lot_id, qty, ref_table, ref_id)
  values (lot.org_id, target_lot_id, reserve_qty, ref_table_name, ref_uuid)
  returning id into reservation_id;

  perform log.emit_activity(lot.org_id, 'inventory.reserve_lot', 'inv.reservations', reservation_id, null, to_jsonb(row(reserve_qty, ref_table_name, ref_uuid)));
  perform log.enqueue_event(lot.org_id, 'inventory.reserved', 'inv.reservations', reservation_id, jsonb_build_object('lot_id', target_lot_id, 'qty', reserve_qty));
  return reservation_id;
end;
$$;

create or replace function mfg.start_batch(target_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = mfg, public
as $$
declare
  b mfg.batches%rowtype;
begin
  select * into b from mfg.batches where id = target_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  perform iam.require_role('OPERATOR', b.org_id);

  if b.status <> 'PLANNED' then
    raise exception 'Batch can start only from PLANNED. Current status: %', b.status;
  end if;

  update mfg.batches set status = 'RUNNING' where id = target_batch_id;
  perform log.emit_activity(b.org_id, 'mfg.start_batch', 'mfg.batches', target_batch_id, jsonb_build_object('status', b.status), jsonb_build_object('status', 'RUNNING'));
  perform log.enqueue_event(b.org_id, 'mfg.batch_started', 'mfg.batches', target_batch_id);
end;
$$;

create or replace function qa.record_release_decision(target_lot_id uuid, decision_value text, reason_text text default null)
returns uuid
language plpgsql
security definer
set search_path = qa, public
as $$
declare
  lot inv.lots%rowtype;
  decision_id uuid;
  next_lot_status text;
begin
  select * into lot from inv.lots where id = target_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  perform iam.require_role('QC', lot.org_id);

  if decision_value not in ('RELEASE','HOLD','REJECT') then
    raise exception 'Invalid QA decision: %', decision_value;
  end if;

  next_lot_status := case decision_value when 'RELEASE' then 'APPROVED' when 'HOLD' then 'HOLD' else 'REJECTED' end;

  insert into qa.release_decisions(org_id, entity_table, entity_id, decision, reason, decided_by)
  values (lot.org_id, 'inv.lots', target_lot_id, decision_value, reason_text, auth.uid())
  returning id into decision_id;

  update inv.lots set status = next_lot_status where id = target_lot_id;

  if decision_value in ('HOLD','REJECT') then
    update inv.reservations
    set status = 'BLOCKED'
    where lot_id = target_lot_id and status = 'ACTIVE';
  end if;

  if decision_value = 'REJECT' then
    insert into qa.capas(org_id, capa_type, status, owner_user_id, target_date)
    values (lot.org_id, 'QC_REJECTION', 'OPEN', auth.uid(), current_date + 7);
  end if;

  perform log.emit_activity(lot.org_id, 'qa.release_decision', 'qa.release_decisions', decision_id, jsonb_build_object('lot_status', lot.status), jsonb_build_object('lot_status', next_lot_status, 'decision', decision_value));
  perform log.enqueue_event(lot.org_id, 'qa.release_decision_recorded', 'qa.release_decisions', decision_id, jsonb_build_object('lot_id', target_lot_id, 'decision', decision_value));
  return decision_id;
end;
$$;

create or replace function fin.confirm_dispatch(target_dispatch_id uuid)
returns void
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  d fin.dispatch_orders%rowtype;
  blocked_count integer;
begin
  select * into d from fin.dispatch_orders where id = target_dispatch_id for update;
  if not found then raise exception 'Dispatch order not found'; end if;
  perform iam.require_role('MANAGER', d.org_id);

  if d.status <> 'DRAFT' then
    raise exception 'Dispatch can confirm only from DRAFT. Current status: %', d.status;
  end if;

  select count(*) into blocked_count
  from fin.dispatch_lines dl
  left join inv.lots l on l.id = dl.lot_id
  where dl.dispatch_order_id = target_dispatch_id
    and (dl.lot_id is null or l.status <> 'APPROVED');

  if blocked_count > 0 then
    raise exception 'Dispatch cannot be confirmed: all lots require QA RELEASE';
  end if;

  update fin.dispatch_orders set status = 'CONFIRMED' where id = target_dispatch_id;
  perform log.emit_activity(d.org_id, 'fin.confirm_dispatch', 'fin.dispatch_orders', target_dispatch_id, jsonb_build_object('status', d.status), jsonb_build_object('status', 'CONFIRMED'));
  perform log.enqueue_event(d.org_id, 'fin.dispatch_confirmed', 'fin.dispatch_orders', target_dispatch_id);
end;
$$;

create or replace function fin.ship_dispatch(target_dispatch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  d fin.dispatch_orders%rowtype;
  invoice_id uuid;
  grand numeric(14,2);
  line record;
begin
  select * into d from fin.dispatch_orders where id = target_dispatch_id for update;
  if not found then raise exception 'Dispatch order not found'; end if;
  perform iam.require_role('MANAGER', d.org_id);

  if d.status <> 'CONFIRMED' then
    raise exception 'Dispatch can ship only from CONFIRMED. Current status: %', d.status;
  end if;

  for line in
    select * from fin.dispatch_lines where dispatch_order_id = target_dispatch_id order by id for update
  loop
    if inv.available_qty(line.lot_id) < line.qty then
      raise exception 'Insufficient stock for dispatch line %', line.id;
    end if;

    insert into inv.movements(org_id, movement_type, qty, lot_id, ref_table, ref_id, created_by)
    values (d.org_id, 'DISPATCH_SHIP', -line.qty, line.lot_id, 'fin.dispatch_orders', target_dispatch_id, auth.uid());
  end loop;

  select coalesce(sum(line_total), 0) into grand
  from fin.dispatch_lines
  where dispatch_order_id = target_dispatch_id;

  insert into fin.invoices(org_id, dispatch_order_id, invoice_no, status, grand_total, paid_amount)
  values (d.org_id, target_dispatch_id, d.do_code || '-INV', 'UNPAID', grand, 0)
  returning id into invoice_id;

  update fin.dispatch_orders set status = 'INVOICED', actual_ship_date = current_date where id = target_dispatch_id;

  perform log.emit_activity(d.org_id, 'fin.ship_dispatch', 'fin.dispatch_orders', target_dispatch_id, jsonb_build_object('status', d.status), jsonb_build_object('status', 'INVOICED', 'invoice_id', invoice_id));
  perform log.enqueue_event(d.org_id, 'fin.dispatch_shipped', 'fin.dispatch_orders', target_dispatch_id, jsonb_build_object('invoice_id', invoice_id));
  return invoice_id;
end;
$$;

-- ------------------------------------------------------------
-- Financial integrity
-- ------------------------------------------------------------
create or replace function fin.enforce_balanced_journal()
returns trigger
language plpgsql
as $$
declare
  total_debit numeric(14,2);
  total_credit numeric(14,2);
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into total_debit, total_credit
  from fin.journal_lines
  where journal_entry_id = coalesce(new.journal_entry_id, old.journal_entry_id);

  if total_debit <> total_credit then
    raise exception 'Journal entry % is not balanced. Debit %, credit %', coalesce(new.journal_entry_id, old.journal_entry_id), total_debit, total_credit;
  end if;

  return null;
end;
$$;

drop trigger if exists journal_balance_after_change on fin.journal_lines;
create constraint trigger journal_balance_after_change
after insert or update or delete on fin.journal_lines
deferrable initially deferred
for each row execute function fin.enforce_balanced_journal();

create or replace function fin.post_payment(target_invoice_id uuid, payment_amount numeric, payment_mode text default 'BANK', payment_ref text default null)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  inv fin.invoices%rowtype;
  payment_id uuid;
  next_paid numeric(14,2);
begin
  if payment_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select * into inv from fin.invoices where id = target_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  perform iam.require_role('MANAGER', inv.org_id);

  next_paid := inv.paid_amount + payment_amount;
  if next_paid > inv.grand_total then
    raise exception 'Payment exceeds invoice balance';
  end if;

  insert into fin.payments(org_id, invoice_id, amount, mode, reference)
  values (inv.org_id, target_invoice_id, payment_amount, payment_mode, payment_ref)
  returning id into payment_id;

  update fin.invoices
  set paid_amount = next_paid,
      status = case when next_paid = grand_total then 'PAID' else 'PARTIAL' end
  where id = target_invoice_id;

  perform log.emit_activity(inv.org_id, 'fin.post_payment', 'fin.payments', payment_id, jsonb_build_object('paid_amount', inv.paid_amount), jsonb_build_object('paid_amount', next_paid));
  perform log.enqueue_event(inv.org_id, 'fin.payment_posted', 'fin.payments', payment_id, jsonb_build_object('invoice_id', target_invoice_id));
  return payment_id;
end;
$$;

-- ------------------------------------------------------------
-- DMS lifecycle and signed access registry
-- ------------------------------------------------------------
alter table dms.documents
  add column if not exists approval_status text not null default 'DRAFT' check (approval_status in ('DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED')),
  add column if not exists retention_until date,
  add column if not exists archived_at timestamptz;

create table if not exists dms.document_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  document_id uuid not null references dms.documents(id) on delete cascade,
  status text not null check (status in ('SUBMITTED','APPROVED','REJECTED')),
  comment text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz not null default now()
);

create table if not exists dms.signed_access_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  document_version_id uuid not null references dms.document_versions(id),
  requested_by uuid references auth.users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function dms.approve_document(target_document_id uuid, approve boolean, comment_text text default null)
returns uuid
language plpgsql
security definer
set search_path = dms, public
as $$
declare
  doc dms.documents%rowtype;
  approval_id uuid;
  next_status text;
begin
  select * into doc from dms.documents where id = target_document_id for update;
  if not found then raise exception 'Document not found'; end if;
  perform iam.require_role('MANAGER', doc.org_id);

  if doc.approval_status not in ('DRAFT','SUBMITTED','REJECTED') then
    raise exception 'Document cannot be approved from status %', doc.approval_status;
  end if;

  next_status := case when approve then 'APPROVED' else 'REJECTED' end;
  update dms.documents set approval_status = next_status where id = target_document_id;

  insert into dms.document_approvals(org_id, document_id, status, comment, decided_by)
  values (doc.org_id, target_document_id, next_status, comment_text, auth.uid())
  returning id into approval_id;

  perform log.emit_activity(doc.org_id, 'dms.approve_document', 'dms.documents', target_document_id, jsonb_build_object('approval_status', doc.approval_status), jsonb_build_object('approval_status', next_status));
  perform log.enqueue_event(doc.org_id, 'dms.document_decided', 'dms.documents', target_document_id, jsonb_build_object('approval_id', approval_id, 'status', next_status));
  return approval_id;
end;
$$;

-- ------------------------------------------------------------
-- Analytics and alert surfaces
-- ------------------------------------------------------------
create materialized view if not exists inv.mv_expiry_alerts as
select
  l.org_id,
  l.id as lot_id,
  i.code as item_code,
  i.name as item_name,
  l.lot_code,
  l.status,
  l.expiry_date,
  inv.available_qty(l.id) as available_qty,
  (l.expiry_date - current_date) as days_to_expiry
from inv.lots l
join md.items i on i.id = l.item_id
where l.expiry_date is not null
  and l.expiry_date <= current_date + 30;

create unique index if not exists ux_mv_expiry_alerts_lot on inv.mv_expiry_alerts(lot_id);

create materialized view if not exists fin.mv_invoice_aging as
select
  org_id,
  status,
  count(*) as invoice_count,
  sum(grand_total - paid_amount) as outstanding_amount
from fin.invoices
where status in ('UNPAID','PARTIAL')
group by org_id, status;

create unique index if not exists ux_mv_invoice_aging_org_status on fin.mv_invoice_aging(org_id, status);

create or replace view mfg.v_plant_efficiency as
select
  b.org_id,
  date_trunc('day', coalesce(po.scheduled_start, current_date))::date as production_date,
  count(*) as batches,
  avg(nullif(b.yield_pct, 0)) as avg_yield_pct,
  count(*) filter (where b.status = 'REJECTED') as rejected_batches,
  count(*) filter (where b.status = 'COMPLETED') as completed_batches
from mfg.batches b
join mfg.production_orders po on po.id = b.production_order_id
group by b.org_id, date_trunc('day', coalesce(po.scheduled_start, current_date))::date;

create or replace function public.erp_healthcheck()
returns jsonb
language sql
stable
security definer
set search_path = public, iam, md, recipe, inv, mfg, qa, fin, cms, dms, log, auth
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', now(),
    'pending_outbox', (select count(*) from log.outbox_events where processed_at is null),
    'erp_schemas', array['iam','md','recipe','inv','mfg','qa','fin','cms','dms','log']
  );
$$;

-- ------------------------------------------------------------
-- Grants: expose RPCs, keep schemas tight.
-- ------------------------------------------------------------
revoke all on schema iam, md, recipe, inv, mfg, qa, fin, cms, dms, log from anon;
grant usage on schema md, recipe, inv, mfg, qa, fin, cms, dms, log to authenticated;
grant usage on schema iam to authenticated;
grant execute on function public.erp_healthcheck() to anon, authenticated;
grant execute on function recipe.activate_version(uuid) to authenticated;
grant execute on function recipe.scale_bom(uuid, numeric) to authenticated;
grant execute on function inv.available_qty(uuid) to authenticated;
grant execute on function inv.reserve_lot(uuid, numeric, text, uuid) to authenticated;
grant execute on function mfg.start_batch(uuid) to authenticated;
grant execute on function qa.record_release_decision(uuid, text, text) to authenticated;
grant execute on function fin.confirm_dispatch(uuid) to authenticated;
grant execute on function fin.ship_dispatch(uuid) to authenticated;
grant execute on function fin.post_payment(uuid, numeric, text, text) to authenticated;
grant execute on function dms.approve_document(uuid, boolean, text) to authenticated;
