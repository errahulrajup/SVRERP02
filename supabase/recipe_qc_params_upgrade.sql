-- ─────────────────────────────────────────────────────────────────────────────
-- recipe_qc_params_upgrade.sql
-- Dynamic QC target parameters for production recipes.
-- Run this once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.recipe_qc_params (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    text not null references public.recipes(id) on delete cascade,
  param_name   text not null,                -- e.g. "pH", "Brix", "Viscosity"
  category     text not null default 'Chemical', -- "Physical" | "Chemical" | "Microbiological"
  unit         text,                         -- optional unit (e.g. "cP", "°Brix", "%")
  target_min   numeric(10,4),                -- lower limit
  target_max   numeric(10,4),                -- upper limit
  target_value numeric(10,4),               -- target value
  test_method  text,                         -- standard test protocol
  notes        text,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- Row-Level Security
alter table public.recipe_qc_params enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'recipe_qc_params' and policyname = 'allow_all_recipe_qc_params') then
    create policy allow_all_recipe_qc_params on public.recipe_qc_params
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Optimize index
create index if not exists recipe_qc_params_recipe_id_idx on public.recipe_qc_params(recipe_id);

-- Reload postgrest schema cache
select pg_notify('pgrst', 'reload schema');
