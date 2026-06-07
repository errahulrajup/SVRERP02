-- R&D Laboratory Portal Schema
-- Run this in Supabase SQL Editor for the React R&D module (/rnd/*).
-- This script is safe to run more than once when the R&D objects already exist.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'rnd_formula_status'
  ) then
    create type public.rnd_formula_status as enum (
      'DRAFT',
      'UNDER_TRIAL',
      'APPROVED',
      'LOCKED',
      'ARCHIVED'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'rnd_trial_status'
  ) then
    create type public.rnd_trial_status as enum (
      'PLANNED',
      'IN_PROGRESS',
      'COMPLETED',
      'FAILED'
    );
  end if;
end
$$;

-- 1. Ingredient intelligence
create table if not exists public.rnd_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  functionality text,
  supplier text,
  cost_per_kg numeric(10,2) default 0,
  ph_min numeric(4,2),
  ph_max numeric(4,2),
  heat_stability text,
  usage_min_pct numeric(5,3),
  usage_max_pct numeric(5,3),
  notes text,
  coa_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Formulations
create table if not exists public.rnd_formulas (
  id uuid primary key default gen_random_uuid(),
  formula_code text not null unique,
  name text not null,
  description text,
  version numeric(4,1) default 1.0,
  target_ph numeric(4,2),
  target_brix numeric(4,2),
  target_sg numeric(5,3),
  status public.rnd_formula_status default 'DRAFT',
  total_cost_per_kg numeric(10,2) default 0,
  created_by text,
  approved_by text,
  created_at timestamptz default now()
);

-- 3. Formulation items
create table if not exists public.rnd_formula_items (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid references public.rnd_formulas(id) on delete cascade,
  ingredient_id uuid references public.rnd_ingredients(id) on delete restrict,
  phase text,
  percentage numeric(6,3) not null,
  tolerance_pct numeric(5,3) default 0,
  notes text,
  created_at timestamptz default now()
);

-- 4. Process builder
create table if not exists public.rnd_processes (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid references public.rnd_formulas(id) on delete cascade,
  step_no integer not null,
  step_type text,
  description text not null,
  duration_min integer,
  temp_c numeric(5,1),
  rpm integer,
  pressure_bar numeric(5,1),
  ccp boolean default false,
  created_at timestamptz default now()
);

-- 5. Trials
create table if not exists public.rnd_trials (
  id uuid primary key default gen_random_uuid(),
  trial_no text not null unique,
  formula_id uuid references public.rnd_formulas(id) on delete restrict,
  batch_size_kg numeric(8,2) not null,
  actual_yield_kg numeric(8,2),
  status public.rnd_trial_status default 'PLANNED',
  start_time timestamptz,
  end_time timestamptz,
  f0_achieved numeric(5,2),
  retort_temp_c numeric(5,1),
  hold_time_min integer,
  actual_ph numeric(4,2),
  actual_brix numeric(4,2),
  actual_sg numeric(5,3),
  sensory_score integer,
  sensory_notes text,
  stability_notes text,
  failure_reason text,
  conducted_by text,
  created_at timestamptz default now()
);

-- 6. Lab notebook
create table if not exists public.rnd_notebook (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  trial_id uuid references public.rnd_trials(id) on delete set null,
  content text not null,
  author text,
  tags text[],
  is_pinned boolean default false,
  created_at timestamptz default now()
);

-- 7. Files and attachments
create table if not exists public.rnd_files (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  uploaded_by text,
  created_at timestamptz default now()
);

create index if not exists rnd_formula_items_formula_id_idx on public.rnd_formula_items(formula_id);
create index if not exists rnd_formula_items_ingredient_id_idx on public.rnd_formula_items(ingredient_id);
create index if not exists rnd_processes_formula_id_idx on public.rnd_processes(formula_id);
create index if not exists rnd_trials_formula_id_idx on public.rnd_trials(formula_id);
create index if not exists rnd_notebook_trial_id_idx on public.rnd_notebook(trial_id);
create index if not exists rnd_files_entity_idx on public.rnd_files(entity_type, entity_id);

-- RND-01 FIX: Add missing tables that were in rnd_params_upgrade.sql only
CREATE TABLE IF NOT EXISTS rnd_formula_params (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id   uuid NOT NULL REFERENCES rnd_formulas(id) ON DELETE CASCADE,
  param_name   text NOT NULL,
  unit         text,
  target_min   numeric,
  target_max   numeric,
  target_value numeric,
  test_method  text,
  notes        text,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(formula_id, param_name)
);

CREATE TABLE IF NOT EXISTS rnd_trial_params (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id    uuid NOT NULL REFERENCES rnd_trials(id) ON DELETE CASCADE,
  param_name  text NOT NULL,
  value       numeric,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(trial_id, param_name)   -- needed for upsert (RND-09 fix)
);

-- RND-02 FIX: Add missing columns to rnd_formulas
ALTER TABLE rnd_formulas ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'PENDING';
ALTER TABLE rnd_formulas ADD COLUMN IF NOT EXISTS validation_notes text;
ALTER TABLE rnd_formulas ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id);
ALTER TABLE rnd_formulas ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Ask Supabase/PostgREST to refresh its schema cache immediately.
select pg_notify('pgrst', 'reload schema');
