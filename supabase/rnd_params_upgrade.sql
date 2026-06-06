-- ─────────────────────────────────────────────────────────────────────────────
-- rnd_params_upgrade.sql
-- Dynamic parameter targets for R&D formulas.
-- Run this once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Dynamic QC target parameters per formula (fully dynamic — any param name/unit)
create table if not exists public.rnd_formula_params (
  id           uuid primary key default gen_random_uuid(),
  formula_id   uuid not null references public.rnd_formulas(id) on delete cascade,
  param_name   text not null,                -- e.g. "pH", "Brix", "Viscosity", "Moisture"
  unit         text,                          -- e.g. "cP", "°Brix", "%" — optional
  target_min   numeric(10,4),                -- lower bound (optional)
  target_max   numeric(10,4),                -- upper bound (optional)
  target_value numeric(10,4),               -- exact target (optional)
  test_method  text,                         -- e.g. "AOAC 925.10", "Brookfield RVT"
  notes        text,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- Dynamic trial parameter readings (measured against formula params)
create table if not exists public.rnd_trial_params (
  id           uuid primary key default gen_random_uuid(),
  trial_id     uuid not null references public.rnd_trials(id) on delete cascade,
  param_name   text not null,
  unit         text,
  measured_value numeric(10,4),
  pass         boolean,                       -- auto-calculated vs formula targets
  notes        text,
  created_at   timestamptz default now(),
  unique(trial_id, param_name)               -- required for upsert (matches rnd_schema.sql)
);

-- Indexes
create index if not exists rnd_formula_params_formula_id_idx on public.rnd_formula_params(formula_id);
create index if not exists rnd_trial_params_trial_id_idx on public.rnd_trial_params(trial_id);

-- RLS: allow authenticated users full access
alter table public.rnd_formula_params enable row level security;
alter table public.rnd_trial_params   enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rnd_formula_params' and policyname = 'allow_all_rnd_formula_params') then
    create policy allow_all_rnd_formula_params on public.rnd_formula_params
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rnd_trial_params' and policyname = 'allow_all_rnd_trial_params') then
    create policy allow_all_rnd_trial_params on public.rnd_trial_params
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Also add locked_by / locked_at / erp_product_id columns to rnd_formulas if missing
-- RND-13 FIX: moved to rnd_schema.sql with proper FK constraint
-- alter table public.rnd_formulas add column if not exists locked_by  uuid;
alter table public.rnd_formulas add column if not exists locked_at  timestamptz;
alter table public.rnd_formulas add column if not exists erp_product_id uuid;

-- Refresh schema cache
select pg_notify('pgrst', 'reload schema');
