-- ============================================================
-- SVR ERP Enterprise Finance Layer
--
-- Run after erp_stabilization.sql.
--
-- Adds SAP FI/CO-style foundations:
--   fiscal periods, chart of accounts hierarchy, posting engine,
--   GST engine, inventory valuation, production costing, invoice
--   posting, payment settlement, reversals, AR/AP and financial reports.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Finance permissions
-- ------------------------------------------------------------
create or replace function fin.require_finance_role(target_org_id uuid, action_name text default 'POST')
returns void
language plpgsql
stable
security definer
set search_path = fin, public
as $$
begin
  if action_name in ('POST','REVERSE','CLOSE_PERIOD','REOPEN_PERIOD') then
    perform iam.require_role('ADMIN', target_org_id);
  else
    perform iam.require_role('MANAGER', target_org_id);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Fiscal system
-- ------------------------------------------------------------
create table if not exists fin.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  year_code text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'OPEN' check (status in ('OPEN','LOCKED','CLOSED')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  unique (org_id, year_code),
  check (starts_on <= ends_on)
);

create table if not exists fin.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  fiscal_year_id uuid not null references fin.fiscal_years(id) on delete restrict,
  period_no integer not null check (period_no between 1 and 12),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'OPEN' check (status in ('OPEN','LOCKED','CLOSED')),
  locked_at timestamptz,
  closed_at timestamptz,
  unique (org_id, fiscal_year_id, period_no),
  check (starts_on <= ends_on)
);

create table if not exists fin.accounting_settings (
  org_id uuid primary key references iam.orgs(id) on delete cascade,
  lock_date date,
  inventory_cost_method text not null default 'FIFO' check (inventory_cost_method in ('FIFO','WEIGHTED_AVERAGE','STANDARD')),
  invoice_prefix text not null default 'SVR',
  next_invoice_no bigint not null default 1 check (next_invoice_no > 0),
  updated_at timestamptz not null default now()
);

create or replace function fin.get_open_period(target_org_id uuid, posting_date date)
returns uuid
language plpgsql
stable
security definer
set search_path = fin, public
as $$
declare
  period_id uuid;
  lock_date date;
begin
  select s.lock_date into lock_date from fin.accounting_settings s where s.org_id = target_org_id;
  if lock_date is not null and posting_date <= lock_date then
    raise exception 'Posting date % is locked by accounting lock date %', posting_date, lock_date;
  end if;

  select p.id into period_id
  from fin.fiscal_periods p
  join fin.fiscal_years y on y.id = p.fiscal_year_id
  where p.org_id = target_org_id
    and posting_date between p.starts_on and p.ends_on
    and p.status = 'OPEN'
    and y.status = 'OPEN'
  order by p.starts_on
  limit 1;

  if period_id is null then
    raise exception 'No open fiscal period for org %, date %', target_org_id, posting_date;
  end if;

  return period_id;
end;
$$;

-- ------------------------------------------------------------
-- Chart of accounts and posting model
-- ------------------------------------------------------------
alter table fin.gl_accounts
  add column if not exists parent_account_id uuid references fin.gl_accounts(id),
  add column if not exists account_group text,
  add column if not exists normal_balance text not null default 'DEBIT' check (normal_balance in ('DEBIT','CREDIT')),
  add column if not exists status text not null default 'ACTIVE' check (status in ('ACTIVE','LOCKED','ARCHIVED')),
  add column if not exists is_control_account boolean not null default false;

alter table fin.journal_entries
  add column if not exists fiscal_period_id uuid references fin.fiscal_periods(id),
  add column if not exists journal_type text not null default 'GENERAL' check (journal_type in ('GENERAL','INVOICE','PAYMENT','INVENTORY','PRODUCTION','REVERSAL','ADJUSTMENT','TAX')),
  add column if not exists status text not null default 'DRAFT' check (status in ('DRAFT','POSTED','REVERSED','VOID')),
  add column if not exists posting_date date not null default current_date,
  add column if not exists posted_by uuid references auth.users(id),
  add column if not exists reversed_entry_id uuid references fin.journal_entries(id),
  add column if not exists idempotency_key text,
  add column if not exists locked_at timestamptz;

create unique index if not exists ux_journal_idempotency
on fin.journal_entries(org_id, idempotency_key)
where idempotency_key is not null;

create index if not exists idx_journal_period_status on fin.journal_entries(org_id, fiscal_period_id, status);
create index if not exists idx_journal_source on fin.journal_entries(source_table, source_id);
create index if not exists idx_journal_lines_account on fin.journal_lines(gl_account_id);

create or replace function fin.assert_financial_rpc()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.workflow_context', true), '') <> 'rpc' then
    raise exception 'Direct financial mutation is forbidden on %.%', tg_table_schema, tg_table_name
      using errcode = '42501';
  end if;

  if tg_op in ('UPDATE','DELETE') and tg_table_schema = 'fin' then
    if tg_table_name = 'journal_entries' then
      if exists (
        select 1
        from fin.journal_entries je
        where je.id = old.id
        and je.status in ('POSTED','REVERSED')
      ) then
        if tg_op = 'DELETE' then
          raise exception 'Posted or reversed journal entries cannot be deleted';
        elsif coalesce(current_setting('app.allow_posted_finance_mutation', true), '') <> 'reversal' then
          raise exception 'Posted financial records cannot be mutated directly';
        end if;
      end if;
    elsif tg_table_name = 'journal_lines' then
      if exists (
        select 1
        from fin.journal_entries je
        where je.id = old.journal_entry_id
        and je.status in ('POSTED','REVERSED')
      ) then
        if tg_op = 'DELETE' then
          raise exception 'Journal lines of posted or reversed entries cannot be deleted';
        elsif coalesce(current_setting('app.allow_posted_finance_mutation', true), '') <> 'reversal' then
          raise exception 'Posted financial records cannot be mutated directly';
        end if;
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'journal_entries','journal_lines','invoices','payments','invoice_tax_lines',
    'lot_valuations','batch_costs'
  ] loop
    if to_regclass('fin.' || t) is not null then
      execute format('drop trigger if exists finance_rpc_guard on fin.%I', t);
      execute format(
        'create trigger finance_rpc_guard before insert or update or delete on fin.%I for each row execute function fin.assert_financial_rpc()',
        t
      );
    end if;
  end loop;
end $$;

create table if not exists fin.account_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  mapping_key text not null,
  gl_account_id uuid not null references fin.gl_accounts(id),
  unique (org_id, mapping_key)
);

create or replace function fin.close_fiscal_period(target_period_id uuid)
returns void
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  p fin.fiscal_periods%rowtype;
  unposted_count integer;
begin
  perform public.erp_begin_workflow_rpc();
  select * into p from fin.fiscal_periods where id = target_period_id for update;
  if not found then raise exception 'Fiscal period not found'; end if;
  perform fin.require_finance_role(p.org_id, 'CLOSE_PERIOD');

  select count(*) into unposted_count
  from fin.journal_entries
  where fiscal_period_id = target_period_id and status = 'DRAFT';

  if unposted_count > 0 then
    raise exception 'Cannot close fiscal period with % draft journals', unposted_count;
  end if;

  update fin.fiscal_periods set status = 'CLOSED', closed_at = now() where id = target_period_id;
  update fin.accounting_settings
  set lock_date = greatest(coalesce(lock_date, p.ends_on), p.ends_on), updated_at = now()
  where org_id = p.org_id;

  perform log.emit_activity(p.org_id, 'fin.close_fiscal_period', 'fin.fiscal_periods', target_period_id, jsonb_build_object('status', p.status), jsonb_build_object('status', 'CLOSED'));
  perform log.enqueue_event(p.org_id, 'fin.fiscal_period_closed', 'fin.fiscal_periods', target_period_id);
end;
$$;

create or replace function fin.reopen_fiscal_period(target_period_id uuid, reason_text text)
returns void
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  p fin.fiscal_periods%rowtype;
begin
  perform public.erp_begin_workflow_rpc();
  select * into p from fin.fiscal_periods where id = target_period_id for update;
  if not found then raise exception 'Fiscal period not found'; end if;
  perform fin.require_finance_role(p.org_id, 'REOPEN_PERIOD');

  if p.closed_at is not null and p.closed_at < now() - interval '30 days' then
    raise exception 'Fiscal period can be reopened only within 30 days of close';
  end if;

  update fin.fiscal_periods set status = 'OPEN', closed_at = null, locked_at = null where id = target_period_id;
  update fin.accounting_settings
  set lock_date = null, updated_at = now()
  where org_id = p.org_id and lock_date = p.ends_on;

  perform log.emit_activity(p.org_id, 'fin.reopen_fiscal_period', 'fin.fiscal_periods', target_period_id, jsonb_build_object('status', p.status), jsonb_build_object('status', 'OPEN', 'reason', reason_text));
  perform log.enqueue_event(p.org_id, 'fin.fiscal_period_reopened', 'fin.fiscal_periods', target_period_id, jsonb_build_object('reason', reason_text));
end;
$$;

create or replace function fin.require_account(target_org_id uuid, p_mapping_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = fin, public
as $$
declare
  account_id uuid;
begin
  select gl_account_id into account_id
  from fin.account_mappings
  where org_id = target_org_id and account_mappings.mapping_key = p_mapping_key;

  if account_id is null then
    raise exception 'Missing GL account mapping: %', p_mapping_key;
  end if;

  return account_id;
end;
$$;

create or replace function fin.assert_journal_balanced(target_entry_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = fin, public
as $$
declare
  d numeric(14,2);
  c numeric(14,2);
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into d, c
  from fin.journal_lines
  where journal_entry_id = target_entry_id;

  if d <= 0 or c <= 0 or d <> c then
    raise exception 'Journal entry % is not balanced. Debit %, credit %', target_entry_id, d, c;
  end if;
end;
$$;

create or replace function fin.post_journal(
  target_org_id uuid,
  journal_type text,
  posting_date date,
  source_table_name text,
  source_uuid uuid,
  memo_text text,
  idempotency text,
  lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  period_id uuid;
  entry_id uuid;
  line jsonb;
begin
  perform fin.require_finance_role(target_org_id, 'POST');
  perform public.erp_begin_workflow_rpc();

  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 2 then
    raise exception 'Journal requires at least two lines';
  end if;

  period_id := fin.get_open_period(target_org_id, posting_date);

  if idempotency is not null then
    select id into entry_id
    from fin.journal_entries
    where org_id = target_org_id
      and idempotency_key = idempotency
    for update;

    if entry_id is not null then
      perform fin.assert_journal_balanced(entry_id);
      return entry_id;
    end if;
  end if;

  insert into fin.journal_entries(org_id, fiscal_period_id, journal_type, source_table, source_id, memo, posting_date, status, posted_by, idempotency_key, posted_at)
  values (target_org_id, period_id, journal_type, source_table_name, source_uuid, memo_text, posting_date, 'DRAFT', auth.uid(), idempotency, now())
  returning id into entry_id;

  if exists (select 1 from fin.journal_lines where journal_entry_id = entry_id) then
    perform fin.assert_journal_balanced(entry_id);
    update fin.journal_entries set status = 'POSTED', locked_at = now() where id = entry_id and status <> 'POSTED';
    return entry_id;
  end if;

  for line in select * from jsonb_array_elements(lines)
  loop
    if not exists (
      select 1 from fin.gl_accounts ga
      where ga.id = (line->>'account_id')::uuid
        and ga.org_id = target_org_id
        and ga.status = 'ACTIVE'
    ) then
      raise exception 'Invalid or inactive GL account in journal line';
    end if;

    insert into fin.journal_lines(journal_entry_id, gl_account_id, debit, credit)
    values (
      entry_id,
      (line->>'account_id')::uuid,
      coalesce((line->>'debit')::numeric, 0),
      coalesce((line->>'credit')::numeric, 0)
    );
  end loop;

  perform fin.assert_journal_balanced(entry_id);
  update fin.journal_entries set status = 'POSTED', locked_at = now() where id = entry_id;

  perform log.emit_activity(target_org_id, 'fin.post_journal', 'fin.journal_entries', entry_id, null, jsonb_build_object('journal_type', journal_type, 'source_table', source_table_name));
  perform log.enqueue_event(target_org_id, 'fin.journal_posted', 'fin.journal_entries', entry_id, jsonb_build_object('journal_type', journal_type, 'source_id', source_uuid));
  return entry_id;
end;
$$;

create or replace function fin.reverse_journal(target_entry_id uuid, reason_text text)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  src fin.journal_entries%rowtype;
  reversal_id uuid;
  reversal_lines jsonb;
begin
  select * into src from fin.journal_entries where id = target_entry_id for update;
  if not found then raise exception 'Journal entry not found'; end if;
  perform fin.require_finance_role(src.org_id, 'REVERSE');
  perform public.erp_begin_workflow_rpc();

  if src.status <> 'POSTED' then raise exception 'Only POSTED journals can be reversed'; end if;
  if exists (select 1 from fin.journal_entries where reversed_entry_id = target_entry_id and status = 'POSTED') then
    raise exception 'Journal entry already reversed';
  end if;

  perform set_config('app.allow_posted_finance_mutation', 'reversal', true);

  select jsonb_agg(jsonb_build_object('account_id', gl_account_id, 'debit', credit, 'credit', debit))
  into reversal_lines
  from fin.journal_lines
  where journal_entry_id = target_entry_id;

  reversal_id := fin.post_journal(
    src.org_id,
    'REVERSAL',
    current_date,
    'fin.journal_entries',
    target_entry_id,
    'Reversal: ' || coalesce(reason_text, src.memo),
    'reversal:' || target_entry_id::text,
    reversal_lines
  );

  update fin.journal_entries set status = 'REVERSED' where id = target_entry_id;
  update fin.journal_entries set reversed_entry_id = target_entry_id where id = reversal_id;
  perform log.emit_activity(src.org_id, 'fin.reverse_journal', 'fin.journal_entries', target_entry_id, jsonb_build_object('status', 'POSTED'), jsonb_build_object('status', 'REVERSED', 'reversal_id', reversal_id));
  return reversal_id;
end;
$$;

-- ------------------------------------------------------------
-- GST engine
-- ------------------------------------------------------------
create table if not exists fin.hsn_tax_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  hsn_code text not null,
  description text,
  gst_pct numeric(5,2) not null check (gst_pct >= 0 and gst_pct <= 28),
  is_active boolean not null default true,
  unique (org_id, hsn_code)
);

alter table md.items
  add column if not exists hsn_code text,
  add column if not exists standard_cost numeric(14,4) not null default 0 check (standard_cost >= 0);

alter table fin.dispatch_lines
  add column if not exists hsn_code text,
  add column if not exists taxable_value numeric(14,2) generated always as (round(qty * rate, 2)) stored,
  add column if not exists cgst_amount numeric(14,2) generated always as (case when gst_pct > 0 then round((qty * rate) * (gst_pct / 2) / 100, 2) else 0 end) stored,
  add column if not exists sgst_amount numeric(14,2) generated always as (case when gst_pct > 0 then round((qty * rate) * (gst_pct / 2) / 100, 2) else 0 end) stored,
  add column if not exists igst_amount numeric(14,2) not null default 0;

create or replace function fin.validate_dispatch_tax(target_dispatch_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = fin, public
as $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from fin.dispatch_lines dl
  left join md.items i on i.id = dl.item_id
  left join fin.hsn_tax_codes h on h.org_id = (select org_id from fin.dispatch_orders where id = target_dispatch_id)
    and h.hsn_code = coalesce(dl.hsn_code, i.hsn_code)
    and h.is_active
  where dl.dispatch_order_id = target_dispatch_id
    and (
      coalesce(dl.hsn_code, i.hsn_code) is null
      or h.id is null
      or h.gst_pct <> dl.gst_pct
    );

  if bad_count > 0 then
    raise exception 'Dispatch has invalid GST/HSN configuration';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Inventory valuation and production costing
-- ------------------------------------------------------------
alter table inv.movements
  add column if not exists unit_cost numeric(14,4),
  add column if not exists total_value numeric(14,2),
  add column if not exists journal_entry_id uuid references fin.journal_entries(id);

create table if not exists fin.lot_valuations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  lot_id uuid not null references inv.lots(id),
  valuation_method text not null check (valuation_method in ('FIFO','WEIGHTED_AVERAGE','STANDARD','ACTUAL')),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  qty numeric(14,4) not null,
  total_value numeric(14,2) not null,
  source_table text,
  source_id uuid,
  journal_entry_id uuid references fin.journal_entries(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lot_valuations_lot on fin.lot_valuations(lot_id, created_at desc);

create table if not exists fin.batch_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  batch_id uuid not null references mfg.batches(id),
  material_cost numeric(14,2) not null default 0,
  labor_cost numeric(14,2) not null default 0,
  overhead_cost numeric(14,2) not null default 0,
  scrap_value numeric(14,2) not null default 0,
  finished_goods_value numeric(14,2) not null default 0,
  yield_variance_pct numeric(8,3),
  standard_cost numeric(14,2),
  actual_cost numeric(14,2) generated always as (material_cost + labor_cost + overhead_cost - scrap_value) stored,
  status text not null default 'OPEN' check (status in ('OPEN','CAPITALIZED','ADJUSTED','CLOSED')),
  journal_entry_id uuid references fin.journal_entries(id),
  unique (org_id, batch_id)
);

create or replace function fin.calculate_batch_cost(target_batch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  b mfg.batches%rowtype;
  material numeric(14,2);
  labor numeric(14,2) := 0;
  overhead numeric(14,2) := 0;
  cost_id uuid;
begin
  perform public.erp_begin_workflow_rpc();

  select * into b from mfg.batches where id = target_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  perform fin.require_finance_role(b.org_id, 'CALCULATE');

  select coalesce(sum(bc.qty * coalesce(lv.unit_cost, i.standard_cost, 0)), 0)
  into material
  from mfg.batch_consumption bc
  join md.items i on i.id = bc.item_id
  left join lateral (
    select unit_cost from fin.lot_valuations lv
    where lv.lot_id = bc.lot_id
    order by lv.created_at desc
    limit 1
  ) lv on true
  where bc.batch_id = target_batch_id;

  insert into fin.batch_costs(org_id, batch_id, material_cost, labor_cost, overhead_cost, finished_goods_value, yield_variance_pct)
  values (b.org_id, target_batch_id, material, labor, overhead, material + labor + overhead, b.yield_pct - 100)
  on conflict (org_id, batch_id)
  do update set material_cost = excluded.material_cost,
                labor_cost = excluded.labor_cost,
                overhead_cost = excluded.overhead_cost,
                finished_goods_value = excluded.finished_goods_value,
                yield_variance_pct = excluded.yield_variance_pct
  returning id into cost_id;

  perform log.emit_activity(b.org_id, 'fin.calculate_batch_cost', 'fin.batch_costs', cost_id, null, jsonb_build_object('batch_id', target_batch_id, 'material_cost', material));
  perform log.enqueue_event(b.org_id, 'fin.batch_cost_calculated', 'fin.batch_costs', cost_id, jsonb_build_object('batch_id', target_batch_id));
  return cost_id;
end;
$$;

-- ------------------------------------------------------------
-- Invoice numbering, posting, payment settlement.
-- ------------------------------------------------------------
create or replace function fin.next_invoice_number(target_org_id uuid)
returns text
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  s fin.accounting_settings%rowtype;
  invoice_no text;
begin
  insert into fin.accounting_settings(org_id)
  values (target_org_id)
  on conflict (org_id) do nothing;

  select * into s from fin.accounting_settings where org_id = target_org_id for update;
  invoice_no := s.invoice_prefix || '-' || to_char(current_date, 'YYYY') || '-' || lpad(s.next_invoice_no::text, 6, '0');
  update fin.accounting_settings set next_invoice_no = next_invoice_no + 1, updated_at = now() where org_id = target_org_id;
  return invoice_no;
end;
$$;

create table if not exists fin.invoice_tax_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references fin.invoices(id) on delete cascade,
  tax_type text not null check (tax_type in ('CGST','SGST','IGST')),
  taxable_value numeric(14,2) not null,
  tax_pct numeric(5,2) not null,
  tax_amount numeric(14,2) not null
);

create table if not exists fin.credit_debit_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  invoice_id uuid not null references fin.invoices(id),
  note_no text not null,
  note_type text not null check (note_type in ('CREDIT','DEBIT')),
  reason text not null,
  taxable_adjustment numeric(14,2) not null,
  tax_adjustment numeric(14,2) not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT','POSTED','VOID')),
  journal_entry_id uuid references fin.journal_entries(id),
  created_at timestamptz not null default now(),
  unique (org_id, note_no)
);

create table if not exists fin.vendor_payables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  supplier_id uuid references md.suppliers(id),
  bill_no text not null,
  status text not null default 'OPEN' check (status in ('OPEN','PARTIAL','PAID','VOID')),
  grand_total numeric(14,2) not null check (grand_total >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  due_date date,
  journal_entry_id uuid references fin.journal_entries(id),
  created_at timestamptz not null default now(),
  unique (org_id, bill_no)
);

create table if not exists fin.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  bank_account_id uuid references fin.gl_accounts(id),
  statement_date date not null,
  description text,
  amount numeric(14,2) not null,
  reference text,
  matched_payment_id uuid references fin.payments(id),
  reconciliation_status text not null default 'UNMATCHED' check (reconciliation_status in ('UNMATCHED','MATCHED','IGNORED')),
  created_at timestamptz not null default now()
);

create table if not exists fin.bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references iam.orgs(id),
  bank_account_id uuid not null references fin.gl_accounts(id),
  statement_date date not null,
  book_balance numeric(14,2) not null,
  statement_balance numeric(14,2) not null,
  difference numeric(14,2) generated always as (book_balance - statement_balance) stored,
  status text not null default 'OPEN' check (status in ('OPEN','RECONCILED','LOCKED')),
  reconciled_by uuid references auth.users(id),
  reconciled_at timestamptz,
  unique (org_id, bank_account_id, statement_date)
);

create or replace function fin.post_dispatch_invoice(target_dispatch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = fin, public
as $$
declare
  d fin.dispatch_orders%rowtype;
  v_invoice_id uuid;
  invoice_no text;
  taxable numeric(14,2);
  cgst numeric(14,2);
  sgst numeric(14,2);
  total numeric(14,2);
  ar uuid;
  sales uuid;
  cgst_payable uuid;
  sgst_payable uuid;
  journal_id uuid;
begin
  perform public.erp_begin_workflow_rpc();

  select * into d from fin.dispatch_orders where id = target_dispatch_id for update;
  if not found then raise exception 'Dispatch not found'; end if;
  perform fin.require_finance_role(d.org_id, 'POST');
  perform fin.validate_dispatch_tax(target_dispatch_id);

  if d.status not in ('CONFIRMED','INVOICED') then
    raise exception 'Dispatch must be CONFIRMED or INVOICED before invoice posting. Current %', d.status;
  end if;

  select id into v_invoice_id from fin.invoices where dispatch_order_id = target_dispatch_id and status <> 'VOID' limit 1 for update;
  if v_invoice_id is null then
    invoice_no := fin.next_invoice_number(d.org_id);
    select coalesce(sum(line_total), 0) into total from fin.dispatch_lines where dispatch_order_id = target_dispatch_id;
    insert into fin.invoices(org_id, dispatch_order_id, invoice_no, status, grand_total, paid_amount)
    values (d.org_id, target_dispatch_id, invoice_no, 'UNPAID', total, 0)
    returning id into v_invoice_id;
  end if;

  delete from fin.invoice_tax_lines where fin.invoice_tax_lines.invoice_id = v_invoice_id;
  select coalesce(sum(taxable_value), 0), coalesce(sum(cgst_amount), 0), coalesce(sum(sgst_amount), 0)
  into taxable, cgst, sgst
  from fin.dispatch_lines
  where dispatch_order_id = target_dispatch_id;

  insert into fin.invoice_tax_lines(invoice_id, tax_type, taxable_value, tax_pct, tax_amount)
  values
    (v_invoice_id, 'CGST', taxable, coalesce((select max(gst_pct) / 2 from fin.dispatch_lines where dispatch_order_id = target_dispatch_id), 0), cgst),
    (v_invoice_id, 'SGST', taxable, coalesce((select max(gst_pct) / 2 from fin.dispatch_lines where dispatch_order_id = target_dispatch_id), 0), sgst);

  ar := fin.require_account(d.org_id, 'AR_TRADE');
  sales := fin.require_account(d.org_id, 'SALES_REVENUE');
  cgst_payable := fin.require_account(d.org_id, 'CGST_PAYABLE');
  sgst_payable := fin.require_account(d.org_id, 'SGST_PAYABLE');

  journal_id := fin.post_journal(
    d.org_id,
    'INVOICE',
    current_date,
    'fin.invoices',
    v_invoice_id,
    'Dispatch invoice posting',
    'invoice:' || v_invoice_id::text,
    jsonb_build_array(
      jsonb_build_object('account_id', ar, 'debit', taxable + cgst + sgst, 'credit', 0),
      jsonb_build_object('account_id', sales, 'debit', 0, 'credit', taxable),
      jsonb_build_object('account_id', cgst_payable, 'debit', 0, 'credit', cgst),
      jsonb_build_object('account_id', sgst_payable, 'debit', 0, 'credit', sgst)
    )
  );

  update fin.invoices
  set status = case
    when paid_amount >= grand_total then 'PAID'
    when paid_amount > 0 then 'PARTIAL'
    else 'UNPAID'
  end
  where id = v_invoice_id;
  update fin.dispatch_orders set status = 'INVOICED' where id = target_dispatch_id;
  perform log.enqueue_event(d.org_id, 'fin.invoice_posted', 'fin.invoices', v_invoice_id, jsonb_build_object('journal_entry_id', journal_id));
  return v_invoice_id;
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
  bank_account uuid;
  ar_account uuid;
  journal_id uuid;
begin
  perform public.erp_begin_workflow_rpc();

  if payment_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select * into inv from fin.invoices where id = target_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  perform fin.require_finance_role(inv.org_id, 'POST');

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

  bank_account := fin.require_account(inv.org_id, 'BANK');
  ar_account := fin.require_account(inv.org_id, 'AR_TRADE');
  journal_id := fin.post_journal(
    inv.org_id,
    'PAYMENT',
    current_date,
    'fin.payments',
    payment_id,
    'Customer receipt posting',
    'payment:' || payment_id::text,
    jsonb_build_array(
      jsonb_build_object('account_id', bank_account, 'debit', payment_amount, 'credit', 0),
      jsonb_build_object('account_id', ar_account, 'debit', 0, 'credit', payment_amount)
    )
  );

  perform log.emit_activity(inv.org_id, 'fin.post_payment', 'fin.payments', payment_id, jsonb_build_object('paid_amount', inv.paid_amount), jsonb_build_object('paid_amount', next_paid, 'journal_entry_id', journal_id));
  perform log.enqueue_event(inv.org_id, 'fin.payment_posted', 'fin.payments', payment_id, jsonb_build_object('invoice_id', target_invoice_id, 'journal_entry_id', journal_id));
  return payment_id;
end;
$$;

-- ------------------------------------------------------------
-- Financial reports
-- ------------------------------------------------------------
create or replace view fin.v_trial_balance as
select
  je.org_id,
  je.fiscal_period_id,
  ga.id as gl_account_id,
  ga.code,
  ga.name,
  ga.account_type,
  sum(jl.debit) as debit,
  sum(jl.credit) as credit,
  sum(jl.debit - jl.credit) as net_debit
from fin.journal_entries je
join fin.journal_lines jl on jl.journal_entry_id = je.id
join fin.gl_accounts ga on ga.id = jl.gl_account_id
where je.status = 'POSTED'
group by je.org_id, je.fiscal_period_id, ga.id, ga.code, ga.name, ga.account_type;

create materialized view if not exists fin.mv_ar_aging as
select
  i.org_id,
  i.status,
  count(*) as invoice_count,
  sum(i.grand_total - i.paid_amount) as outstanding,
  sum(i.grand_total - i.paid_amount) filter (where current_date - i.created_at::date between 0 and 30) as bucket_0_30,
  sum(i.grand_total - i.paid_amount) filter (where current_date - i.created_at::date between 31 and 60) as bucket_31_60,
  sum(i.grand_total - i.paid_amount) filter (where current_date - i.created_at::date > 60) as bucket_60_plus
from fin.invoices i
where i.status in ('UNPAID','PARTIAL')
group by i.org_id, i.status;

create unique index if not exists ux_mv_ar_aging_org_status on fin.mv_ar_aging(org_id, status);

create or replace view fin.v_profit_and_loss as
select
  tb.org_id,
  tb.fiscal_period_id,
  sum(case when tb.account_type = 'REVENUE' then tb.credit - tb.debit else 0 end) as revenue,
  sum(case when tb.account_type = 'EXPENSE' then tb.debit - tb.credit else 0 end) as expenses,
  sum(case when tb.account_type = 'REVENUE' then tb.credit - tb.debit else 0 end)
    - sum(case when tb.account_type = 'EXPENSE' then tb.debit - tb.credit else 0 end) as net_profit
from fin.v_trial_balance tb
group by tb.org_id, tb.fiscal_period_id;

create or replace view fin.v_balance_sheet as
select
  tb.org_id,
  tb.fiscal_period_id,
  sum(case when tb.account_type = 'ASSET' then tb.debit - tb.credit else 0 end) as assets,
  sum(case when tb.account_type = 'LIABILITY' then tb.credit - tb.debit else 0 end) as liabilities,
  sum(case when tb.account_type = 'EQUITY' then tb.credit - tb.debit else 0 end) as equity
from fin.v_trial_balance tb
group by tb.org_id, tb.fiscal_period_id;

create or replace view fin.v_gst_report as
select
  i.org_id,
  date_trunc('month', i.created_at)::date as month,
  tl.tax_type,
  sum(tl.taxable_value) as taxable_value,
  sum(tl.tax_amount) as tax_amount
from fin.invoices i
join fin.invoice_tax_lines tl on tl.invoice_id = i.id
where i.status <> 'VOID'
group by i.org_id, date_trunc('month', i.created_at)::date, tl.tax_type;

create or replace view fin.v_ap_aging as
select
  vp.org_id,
  vp.status,
  count(*) as bill_count,
  sum(vp.grand_total - vp.paid_amount) as outstanding,
  sum(vp.grand_total - vp.paid_amount) filter (where current_date - coalesce(vp.due_date, vp.created_at::date) between 0 and 30) as bucket_0_30,
  sum(vp.grand_total - vp.paid_amount) filter (where current_date - coalesce(vp.due_date, vp.created_at::date) between 31 and 60) as bucket_31_60,
  sum(vp.grand_total - vp.paid_amount) filter (where current_date - coalesce(vp.due_date, vp.created_at::date) > 60) as bucket_60_plus
from fin.vendor_payables vp
where vp.status in ('OPEN','PARTIAL')
group by vp.org_id, vp.status;

create or replace view fin.v_dispatch_profitability as
select
  d.org_id,
  d.id as dispatch_order_id,
  d.do_code,
  coalesce(sum(dl.line_total), 0) as revenue,
  coalesce(sum(-m.total_value) filter (where m.movement_type = 'DISPATCH_SHIP'), 0) as inventory_cost,
  coalesce(sum(dl.line_total), 0) - coalesce(sum(-m.total_value) filter (where m.movement_type = 'DISPATCH_SHIP'), 0) as gross_margin
from fin.dispatch_orders d
left join fin.dispatch_lines dl on dl.dispatch_order_id = d.id
left join inv.movements m on m.ref_table = 'fin.dispatch_orders' and m.ref_id = d.id and m.lot_id = dl.lot_id
group by d.org_id, d.id, d.do_code;

create or replace view fin.v_batch_profitability as
select
  bc.org_id,
  bc.batch_id,
  b.batch_code,
  bc.material_cost,
  bc.labor_cost,
  bc.overhead_cost,
  bc.actual_cost,
  bc.finished_goods_value,
  bc.yield_variance_pct
from fin.batch_costs bc
join mfg.batches b on b.id = bc.batch_id;

-- ------------------------------------------------------------
-- RLS and grants
-- ------------------------------------------------------------
do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'fin'
      and exists (
        select 1 from information_schema.columns c
        where c.table_schema = schemaname and c.table_name = tablename and c.column_name = 'org_id'
      )
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    execute format('alter table %I.%I force row level security', r.schemaname, r.tablename);
    policy_name := format('finance org scoped %s', r.tablename);
    execute format('drop policy if exists %I on %I.%I', policy_name, r.schemaname, r.tablename);
    execute format(
      'create policy %I on %I.%I for all using (iam.is_at_least(''MANAGER'', org_id)) with check (iam.is_at_least(''MANAGER'', org_id))',
      policy_name, r.schemaname, r.tablename
    );
  end loop;
end $$;

grant execute on function fin.post_journal(uuid, text, date, text, uuid, text, text, jsonb) to authenticated;
grant execute on function fin.reverse_journal(uuid, text) to authenticated;
grant execute on function fin.calculate_batch_cost(uuid) to authenticated;
grant execute on function fin.post_dispatch_invoice(uuid) to authenticated;
grant execute on function fin.close_fiscal_period(uuid) to authenticated;
grant execute on function fin.reopen_fiscal_period(uuid, text) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'journal_entries','journal_lines','invoices','payments','invoice_tax_lines',
    'lot_valuations','batch_costs'
  ] loop
    if to_regclass('fin.' || t) is not null then
      execute format('drop trigger if exists finance_rpc_guard on fin.%I', t);
      execute format(
        'create trigger finance_rpc_guard before insert or update or delete on fin.%I for each row execute function fin.assert_financial_rpc()',
        t
      );
    end if;
  end loop;
end $$;
