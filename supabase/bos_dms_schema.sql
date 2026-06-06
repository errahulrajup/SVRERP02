-- ============================================================
-- SVR Business OS — DMS Schema
-- Run in Supabase → SQL Editor → New Query
-- ============================================================

-- Documents table
create table if not exists documents (
  id           text primary key,
  co_id        text,
  date         date,
  type_code    text,
  type         text,
  priority     text default 'normal',
  ref_no       text,
  to_name      text,
  to_company   text,
  to_address   text,
  to_city      text,
  salutation   text,
  subject      text,
  content      text,
  closing      text,
  issued_by    text,
  designation  text,
  status       text default 'draft',
  created_at   timestamptz default now()
);

-- DMS Companies table
create table if not exists dms_companies (
  id           text primary key,
  name         text not null,
  prefix       text,
  addr1        text,
  addr2        text,
  phone        text,
  email        text,
  website      text,
  gst          text,
  verify_url   text,
  year         text,
  color1       text default '#D4A017',
  color2       text default '#8B5E00',
  footer_text  text,
  watermark_text text,
  watermark_on boolean default false,
  qr_on        boolean default true,
  logo         text,
  signature    text,
  default_signatory   text,
  default_designation text,
  created_at   timestamptz default now()
);

-- RLS
alter table documents    enable row level security;
alter table dms_companies enable row level security;
drop policy if exists "allow_all_documents" on documents;
create policy "allow_all_documents"     on documents     for all using (true) with check (true);
drop policy if exists "allow_all_dms_companies" on dms_companies;
create policy "allow_all_dms_companies" on dms_companies for all using (true) with check (true);

-- Indexes
create index if not exists idx_documents_co_id    on documents(co_id);
create index if not exists idx_documents_status   on documents(status);
create index if not exists idx_documents_date     on documents(date desc);
create index if not exists idx_documents_type     on documents(type_code);
-- ============================================================
