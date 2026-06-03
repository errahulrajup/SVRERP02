-- ============================================================
-- SVR Business OS — Recipe Engine Schema
-- Run this in Supabase → SQL Editor → New Query
-- (Run AFTER the main schema is already created)
-- ============================================================

-- ─── TABLE: products (Finished products / SKUs) ───────────────
create table if not exists products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sku_code   text unique not null,
  category   text,
  unit       text default 'kg',
  gst_pct    numeric(5,2) default 18,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- Ensure products has the columns needed by the recipe and inventory systems
alter table products add column if not exists sku_code text;
alter table products add column if not exists unit text default 'kg';
alter table products add column if not exists gst_pct numeric(5,2) default 18;
alter table products add column if not exists is_active boolean default true;

-- Add unique constraint to sku_code if not already unique
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_sku_code_key'
  ) then
    alter table products add constraint products_sku_code_key unique (sku_code);
  end if;
end $$;

-- ─── TABLE: recipes (Recipe / BOM header) ─────────────────────
create table if not exists recipes (
  id          text primary key default gen_random_uuid()::text,
  product_id  uuid references products(id) on delete cascade,
  name        text not null,
  version     integer default 1,
  is_active   boolean default true,
  locked      boolean default false,
  notes       text,
  output_qty  numeric(12,3),          -- expected output per batch (kg/units)
  output_unit text default 'kg',
  expected_loss numeric(6,2) default 2,  -- % loss expected
  shelf_life_days integer,
  storage_temp text,
  created_by  text,
  approved_by text,
  created_at  timestamptz default now()
);

-- ─── TABLE: recipe_inputs (Raw materials needed per recipe) ───
create table if not exists recipe_inputs (
  id          text primary key default gen_random_uuid()::text,
  recipe_id   text not null references recipes(id) on delete cascade,
  material    text not null,          -- material name (denormalized for simplicity)
  qty         numeric(12,3) not null, -- qty per batch (not per 100kg)
  unit        text default 'kg',
  tolerance   numeric(5,2) default 2, -- ± % tolerance
  notes       text,
  created_at  timestamptz default now()
);

-- ─── TABLE: recipe_steps (Process steps) ──────────────────────
create table if not exists recipe_steps (
  id           text primary key default gen_random_uuid()::text,
  recipe_id    text not null references recipes(id) on delete cascade,
  step_no      integer not null,
  step_name    text not null,
  machine      text,
  instruction  text,
  temp_min     numeric(7,1),
  temp_max     numeric(7,1),
  duration_min integer,
  created_at   timestamptz default now()
);

-- ─── RLS — LINK-010 FIX: auth.uid() IS NOT NULL ──────────────
alter table products      enable row level security;
alter table recipes       enable row level security;
alter table recipe_inputs enable row level security;
alter table recipe_steps  enable row level security;

create policy "auth_only_products"
  on products for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_recipes"
  on recipes for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_recipe_inputs"
  on recipe_inputs for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_recipe_steps"
  on recipe_steps for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ─── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_recipes_product    on recipes(product_id);
create index if not exists idx_recipes_active     on recipes(is_active, locked);
create index if not exists idx_recipe_inputs_rid  on recipe_inputs(recipe_id);
create index if not exists idx_recipe_steps_rid   on recipe_steps(recipe_id, step_no);
create index if not exists idx_products_active    on products(is_active);

-- Also add recipe_id column to batches table (link batch to recipe)
alter table batches add column if not exists recipe_id   text references recipes(id);
alter table batches add column if not exists recipe_name text;

-- ============================================================
-- Done! 4 new tables + batches updated.
-- ============================================================
