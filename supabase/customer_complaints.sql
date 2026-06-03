-- ─────────────────────────────────────────────────────────────────────────────
-- customer_complaints.sql
-- Creates the customer_complaints table to track customer complaints (FR-006).
-- Run this once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.customer_complaints (
  id                text primary key default gen_random_uuid()::text,
  ref_no            text not null unique,
  customer_name     text not null,
  product_name      text,
  batch_no          text,
  issue_description text not null,
  complaint_date    date not null default current_date,
  severity          text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status            text not null default 'OPEN' check (status in ('OPEN', 'INVESTIGATING', 'CAPA_PENDING', 'CLOSED')),
  corrective_action text,
  logged_by         text,
  created_at        timestamptz default now()
);

-- RLS: allow authenticated users full access
alter table public.customer_complaints enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'customer_complaints' and policyname = 'allow_all_customer_complaints') then
    create policy allow_all_customer_complaints on public.customer_complaints
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Refresh schema cache
select pg_notify('pgrst', 'reload schema');
