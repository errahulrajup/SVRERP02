-- ============================================================
-- SVR ERP Stabilization Pass
--
-- Run after erp_hardening.sql.
--
-- Focus:
--   concurrency safety, idempotency, direct mutation prevention,
--   FEFO inventory allocation, dead-letter events, reconciliation
--   views, stronger accounting/dispatch invariants.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Workflow guard: direct status mutation is blocked unless an
-- approved RPC sets a transaction-local context flag.
-- ------------------------------------------------------------
create or replace function public.erp_begin_workflow_rpc()
returns void
language sql
security definer
set search_path = public, auth
as $$
  select set_config('app.workflow_context', 'rpc', true);
$$;

create or replace function public.erp_assert_workflow_rpc()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if current_setting('app.workflow_context', true) <> 'rpc' then
    raise exception 'Direct workflow status mutation is forbidden on %.%', tg_table_schema, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists recipe_versions_status_guard on recipe.recipe_versions;
create trigger recipe_versions_status_guard
before update of status on recipe.recipe_versions
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists batches_status_guard on mfg.batches;
create trigger batches_status_guard
before update of status on mfg.batches
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists production_orders_status_guard on mfg.production_orders;
create trigger production_orders_status_guard
before update of status on mfg.production_orders
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists lots_status_guard on inv.lots;
create trigger lots_status_guard
before update of status on inv.lots
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists dispatch_orders_status_guard on fin.dispatch_orders;
create trigger dispatch_orders_status_guard
before update of status on fin.dispatch_orders
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists invoices_status_guard on fin.invoices;
create trigger invoices_status_guard
before update of status on fin.invoices
for each row
when (old.status is distinct from new.status)
execute function public.erp_assert_workflow_rpc();

drop trigger if exists documents_approval_status_guard on dms.documents;
create trigger documents_approval_status_guard
before update of approval_status on dms.documents
for each row
when (old.approval_status is distinct from new.approval_status)
execute function public.erp_assert_workflow_rpc();

-- ------------------------------------------------------------
-- Outbox reliability: idempotency, dead-lettering, replay safety.
-- ------------------------------------------------------------
alter table log.outbox_events
  add column if not exists idempotency_key text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text;

update log.outbox_events
set idempotency_key = coalesce(idempotency_key, event_type || ':' || entity_table || ':' || coalesce(entity_id::text, id::text))
where idempotency_key is null;

alter table log.outbox_events
  alter column idempotency_key set not null;

create unique index if not exists ux_outbox_idempotency
on log.outbox_events(org_id, idempotency_key);

create table if not exists log.dead_letter_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references iam.orgs(id),
  source_event_id uuid not null,
  event_type text not null,
  entity_table text not null,
  entity_id uuid,
  payload jsonb not null default '{}',
  attempts integer not null,
  last_error text,
  failed_at timestamptz not null default now(),
  replayed_at timestamptz
);

alter table log.dead_letter_events enable row level security;
alter table log.dead_letter_events force row level security;

drop policy if exists "admin read dead letters" on log.dead_letter_events;
create policy "admin read dead letters"
on log.dead_letter_events for select
using (iam.is_at_least('ADMIN', org_id));

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
  key text;
begin
  key := event_name || ':' || entity_table_name || ':' || coalesce(entity_uuid::text, encode(digest(coalesce(event_payload, '{}')::text, 'sha256'), 'hex'));

  insert into log.outbox_events(org_id, event_type, entity_table, entity_id, payload, idempotency_key)
  values (target_org_id, event_name, entity_table_name, entity_uuid, coalesce(event_payload, '{}'), key)
  on conflict (org_id, idempotency_key)
  do update set payload = excluded.payload
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function log.claim_outbox_events(batch_size integer default 50, worker_id text default 'worker')
returns setof log.outbox_events
language plpgsql
security definer
set search_path = log, public
as $$
begin
  perform iam.require_role('ADMIN', iam.current_org_id());

  insert into log.dead_letter_events(org_id, source_event_id, event_type, entity_table, entity_id, payload, attempts, last_error)
  select org_id, id, event_type, entity_table, entity_id, payload, attempts, last_error
  from log.outbox_events
  where processed_at is null
    and attempts >= 10
    and not exists (
      select 1 from log.dead_letter_events dle where dle.source_event_id = log.outbox_events.id
    );

  return query
  with due as (
    select id
    from log.outbox_events
    where processed_at is null
      and attempts < 10
      and (next_attempt_at is null or next_attempt_at <= now())
      and (locked_at is null or locked_at < now() - interval '10 minutes')
    order by created_at, id
    for update skip locked
    limit greatest(1, least(batch_size, 200))
  )
  update log.outbox_events e
  set attempts = e.attempts + 1,
      locked_at = now(),
      locked_by = left(worker_id, 100),
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
      last_error = null,
      locked_at = null,
      locked_by = null
  where id = event_id;
end;
$$;

create or replace function log.replay_dead_letter(dead_letter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = log, public
as $$
declare
  d log.dead_letter_events%rowtype;
  replay_id uuid;
begin
  perform iam.require_role('ADMIN', iam.current_org_id());
  select * into d from log.dead_letter_events where id = dead_letter_id for update;
  if not found then raise exception 'Dead-letter event not found'; end if;
  if d.replayed_at is not null then raise exception 'Dead-letter event already replayed'; end if;

  insert into log.outbox_events(org_id, event_type, entity_table, entity_id, payload, idempotency_key)
  values (d.org_id, d.event_type, d.entity_table, d.entity_id, d.payload, 'replay:' || d.id::text)
  returning id into replay_id;

  update log.dead_letter_events set replayed_at = now() where id = dead_letter_id;
  return replay_id;
end;
$$;

-- ------------------------------------------------------------
-- Inventory correctness: FEFO allocator, duplicate reservation
-- prevention, stock reconciliation.
-- ------------------------------------------------------------
create unique index if not exists ux_active_reservation_once
on inv.reservations(lot_id, ref_table, ref_id)
where status = 'ACTIVE';

create or replace function inv.allocate_fefo(
  target_org_id uuid,
  target_item_id uuid,
  required_qty numeric,
  ref_table_name text,
  ref_uuid uuid
)
returns table(reservation_id uuid, lot_id uuid, reserved_qty numeric)
language plpgsql
security definer
set search_path = inv, public
as $$
declare
  remaining numeric := required_qty;
  lot_rec record;
  take_qty numeric;
  new_reservation uuid;
begin
  if required_qty <= 0 then raise exception 'Required quantity must be positive'; end if;
  perform iam.require_role('OPERATOR', target_org_id);

  for lot_rec in
    select l.id, inv.available_qty(l.id) as available
    from inv.lots l
    where l.org_id = target_org_id
      and l.item_id = target_item_id
      and l.status = 'APPROVED'
      and (l.expiry_date is null or l.expiry_date >= current_date)
      and inv.available_qty(l.id) > 0
    order by l.expiry_date nulls last, l.lot_code, l.id
    for update
  loop
    exit when remaining <= 0;
    take_qty := least(remaining, lot_rec.available);

    insert into inv.reservations(org_id, lot_id, qty, ref_table, ref_id)
    values (target_org_id, lot_rec.id, take_qty, ref_table_name, ref_uuid)
    on conflict (lot_id, ref_table, ref_id) where status = 'ACTIVE'
    do update set qty = inv.reservations.qty + excluded.qty
    returning id into new_reservation;

    reservation_id := new_reservation;
    lot_id := lot_rec.id;
    reserved_qty := take_qty;
    remaining := remaining - take_qty;
    return next;
  end loop;

  if remaining > 0 then
    raise exception 'Insufficient FEFO stock for item %, short by %', target_item_id, remaining;
  end if;

  perform log.emit_activity(target_org_id, 'inventory.allocate_fefo', 'inv.reservations', ref_uuid, null, jsonb_build_object('item_id', target_item_id, 'qty', required_qty));
  perform log.enqueue_event(target_org_id, 'inventory.fefo_allocated', 'inv.reservations', ref_uuid, jsonb_build_object('item_id', target_item_id, 'qty', required_qty));
end;
$$;

create or replace view inv.v_stock_reconciliation as
select
  l.org_id,
  l.item_id,
  l.id as lot_id,
  l.lot_code,
  coalesce(sum(m.qty), 0) as ledger_qty,
  coalesce(sum(r.qty) filter (where r.status = 'ACTIVE'), 0) as reserved_qty,
  inv.available_qty(l.id) as available_qty,
  case
    when coalesce(sum(m.qty), 0) < 0 then 'NEGATIVE_LEDGER'
    when inv.available_qty(l.id) < 0 then 'NEGATIVE_AVAILABLE'
    when l.status in ('REJECTED','HOLD','EXPIRED') and coalesce(sum(r.qty) filter (where r.status = 'ACTIVE'), 0) > 0 then 'BLOCKED_LOT_RESERVED'
    else 'OK'
  end as reconciliation_status
from inv.lots l
left join inv.movements m on m.lot_id = l.id
left join inv.reservations r on r.lot_id = l.id
group by l.org_id, l.item_id, l.id, l.lot_code;

-- ------------------------------------------------------------
-- Override workflow RPCs to set direct-mutation guard context and
-- strengthen race-sensitive invariants.
-- ------------------------------------------------------------
create or replace function recipe.activate_version(target_version_id uuid)
returns void
language plpgsql
security definer
set search_path = recipe, public
as $$
declare
  rec recipe.recipes%rowtype;
  old_status text;
  open_orders integer;
begin
  perform public.erp_begin_workflow_rpc();

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

  select count(*) into open_orders
  from mfg.production_orders po
  join recipe.recipe_versions rv on rv.id = po.recipe_version_id
  where rv.recipe_id = rec.id
    and po.status in ('PLANNED','RUNNING');

  update recipe.recipe_versions
  set status = 'SUPERSEDED'
  where recipe_id = rec.id and status = 'ACTIVE' and id <> target_version_id;

  update recipe.recipe_versions set status = 'ACTIVE' where id = target_version_id;
  update recipe.recipes set active_version_id = target_version_id where id = rec.id;

  if open_orders > 0 then
    update mfg.production_orders
    set status = 'NEEDS_REPLAN'
    where recipe_version_id in (select id from recipe.recipe_versions where recipe_id = rec.id and id <> target_version_id)
      and status = 'PLANNED';
  end if;

  perform log.emit_activity(rec.org_id, 'recipe.activate_version', 'recipe.recipe_versions', target_version_id, jsonb_build_object('status', old_status), jsonb_build_object('status', 'ACTIVE', 'open_orders', open_orders));
  perform log.enqueue_event(rec.org_id, 'recipe.version_activated', 'recipe.recipe_versions', target_version_id, jsonb_build_object('recipe_id', rec.id, 'open_orders', open_orders));
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
  po mfg.production_orders%rowtype;
begin
  perform public.erp_begin_workflow_rpc();

  select * into b from mfg.batches where id = target_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  perform iam.require_role('OPERATOR', b.org_id);

  select * into po from mfg.production_orders where id = b.production_order_id for update;
  if po.status = 'NEEDS_REPLAN' then
    raise exception 'Production order requires replanning before batch start';
  end if;
  if b.status <> 'PLANNED' then
    raise exception 'Batch can start only from PLANNED. Current status: %', b.status;
  end if;

  update mfg.production_orders set status = 'RUNNING' where id = b.production_order_id and status = 'PLANNED';
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
  shipped_count integer;
begin
  perform public.erp_begin_workflow_rpc();

  select * into lot from inv.lots where id = target_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  perform iam.require_role('QC', lot.org_id);

  if decision_value not in ('RELEASE','HOLD','REJECT') then
    raise exception 'Invalid QA decision: %', decision_value;
  end if;

  select count(*) into shipped_count
  from inv.movements
  where lot_id = target_lot_id
    and movement_type = 'DISPATCH_SHIP';

  if shipped_count > 0 and decision_value in ('HOLD','REJECT') then
    raise exception 'QA reversal blocked: lot has already shipped. Open recall/CAPA workflow instead.';
  end if;

  if decision_value = 'RELEASE' and lot.expiry_date is not null and lot.expiry_date < current_date then
    raise exception 'Expired lot cannot be released';
  end if;

  next_lot_status := case decision_value when 'RELEASE' then 'APPROVED' when 'HOLD' then 'HOLD' else 'REJECTED' end;

  insert into qa.release_decisions(org_id, entity_table, entity_id, decision, reason, decided_by)
  values (lot.org_id, 'inv.lots', target_lot_id, decision_value, reason_text, auth.uid())
  returning id into decision_id;

  update inv.lots set status = next_lot_status where id = target_lot_id;

  if decision_value in ('HOLD','REJECT') then
    update inv.reservations set status = 'BLOCKED' where lot_id = target_lot_id and status = 'ACTIVE';
    update fin.dispatch_orders
    set status = 'BLOCKED'
    where id in (
      select dl.dispatch_order_id
      from fin.dispatch_lines dl
      where dl.lot_id = target_lot_id
    )
    and status in ('DRAFT','CONFIRMED');
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

create unique index if not exists ux_invoice_one_per_dispatch
on fin.invoices(dispatch_order_id)
where dispatch_order_id is not null and status <> 'VOID';

create or replace function fin.confirm_dispatch(target_dispatch_id uuid)
returns void
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  d fin.dispatch_orders%rowtype;
  blocked_count integer;
  line_count integer;
begin
  perform public.erp_begin_workflow_rpc();

  select * into d from fin.dispatch_orders where id = target_dispatch_id for update;
  if not found then raise exception 'Dispatch order not found'; end if;
  perform iam.require_role('MANAGER', d.org_id);

  if d.status <> 'DRAFT' then
    raise exception 'Dispatch can confirm only from DRAFT. Current status: %', d.status;
  end if;

  select count(*) into line_count from fin.dispatch_lines where dispatch_order_id = target_dispatch_id;
  if line_count = 0 then raise exception 'Dispatch requires at least one line'; end if;

  select count(*) into blocked_count
  from fin.dispatch_lines dl
  left join inv.lots l on l.id = dl.lot_id
  where dl.dispatch_order_id = target_dispatch_id
    and (dl.lot_id is null or l.status <> 'APPROVED' or inv.available_qty(dl.lot_id) < dl.qty);

  if blocked_count > 0 then
    raise exception 'Dispatch cannot be confirmed: lots must be QA approved and available';
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
  perform public.erp_begin_workflow_rpc();

  select * into d from fin.dispatch_orders where id = target_dispatch_id for update;
  if not found then raise exception 'Dispatch order not found'; end if;
  perform iam.require_role('MANAGER', d.org_id);

  if d.status = 'INVOICED' then
    select id into invoice_id from fin.invoices where dispatch_order_id = target_dispatch_id and status <> 'VOID' limit 1;
    if invoice_id is not null then return invoice_id; end if;
  end if;

  if d.status <> 'CONFIRMED' then
    raise exception 'Dispatch can ship only from CONFIRMED. Current status: %', d.status;
  end if;

  for line in
    select dl.*, l.status as lot_status
    from fin.dispatch_lines dl
    join inv.lots l on l.id = dl.lot_id
    where dl.dispatch_order_id = target_dispatch_id
    order by dl.id
    for update of dl, l
  loop
    if line.lot_status <> 'APPROVED' then
      raise exception 'Dispatch line % lot is not QA approved', line.id;
    end if;
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
  on conflict (dispatch_order_id) where dispatch_order_id is not null and status <> 'VOID'
  do update set grand_total = excluded.grand_total
  returning id into invoice_id;

  update fin.dispatch_orders set status = 'INVOICED', actual_ship_date = current_date where id = target_dispatch_id;

  perform log.emit_activity(d.org_id, 'fin.ship_dispatch', 'fin.dispatch_orders', target_dispatch_id, jsonb_build_object('status', d.status), jsonb_build_object('status', 'INVOICED', 'invoice_id', invoice_id));
  perform log.enqueue_event(d.org_id, 'fin.dispatch_shipped', 'fin.dispatch_orders', target_dispatch_id, jsonb_build_object('invoice_id', invoice_id));
  return invoice_id;
end;
$$;

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
  perform public.erp_begin_workflow_rpc();

  if payment_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select * into inv from fin.invoices where id = target_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  perform iam.require_role('MANAGER', inv.org_id);

  if inv.status = 'VOID' then raise exception 'Cannot post payment to void invoice'; end if;

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
  perform public.erp_begin_workflow_rpc();

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
-- Finance correctness views and GST validation.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dispatch_lines_gst_pct_valid'
      and conrelid = 'fin.dispatch_lines'::regclass
  ) then
    alter table fin.dispatch_lines
      add constraint dispatch_lines_gst_pct_valid check (gst_pct >= 0 and gst_pct <= 28) not valid;
  end if;
end $$;

alter table fin.dispatch_lines validate constraint dispatch_lines_gst_pct_valid;

create or replace view fin.v_invoice_reconciliation as
select
  i.org_id,
  i.id as invoice_id,
  i.invoice_no,
  i.dispatch_order_id,
  i.grand_total,
  i.paid_amount,
  coalesce(sum(p.amount), 0) as posted_payments,
  i.grand_total - i.paid_amount as balance,
  case
    when i.paid_amount <> coalesce(sum(p.amount), 0) then 'PAYMENT_MISMATCH'
    when i.paid_amount > i.grand_total then 'OVERPAID'
    when i.status = 'PAID' and i.paid_amount <> i.grand_total then 'STATUS_MISMATCH'
    else 'OK'
  end as reconciliation_status
from fin.invoices i
left join fin.payments p on p.invoice_id = i.id
group by i.org_id, i.id, i.invoice_no, i.dispatch_order_id, i.grand_total, i.paid_amount, i.status;

create or replace view fin.v_inventory_finance_reconciliation as
select
  m.org_id,
  m.ref_table,
  m.ref_id,
  count(*) filter (where m.movement_type = 'DISPATCH_SHIP') as dispatch_movements,
  coalesce(sum(-m.qty) filter (where m.movement_type = 'DISPATCH_SHIP'), 0) as shipped_qty,
  coalesce(sum(dl.qty), 0) as dispatch_line_qty,
  case
    when coalesce(sum(-m.qty) filter (where m.movement_type = 'DISPATCH_SHIP'), 0) <> coalesce(sum(dl.qty), 0) then 'QTY_MISMATCH'
    else 'OK'
  end as reconciliation_status
from inv.movements m
left join fin.dispatch_lines dl on dl.dispatch_order_id = m.ref_id and dl.lot_id = m.lot_id
where m.ref_table = 'fin.dispatch_orders'
group by m.org_id, m.ref_table, m.ref_id;

-- ------------------------------------------------------------
-- Grants for stabilization RPCs.
-- ------------------------------------------------------------
grant execute on function public.erp_begin_workflow_rpc() to authenticated;
grant execute on function inv.allocate_fefo(uuid, uuid, numeric, text, uuid) to authenticated;
grant execute on function log.claim_outbox_events(integer) to authenticated;
grant execute on function log.replay_dead_letter(uuid) to authenticated;
