-- =============================================================
--  seed.sql — Standalone seed file for testing
--  Run this AFTER schema.sql to populate test data.
--  Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
--  
--  Usage:
--    Supabase Dashboard → SQL Editor → paste & run
--    Or: supabase db push (if using Supabase CLI)
-- =============================================================

-- ── Seed categories ──────────────────────────────────────────
insert into categories (name, slug, visible, sort_order) values
  ('Butter & Spreads',  'butter-spreads',  true, 1),
  ('Cooking Cream',     'cooking-cream',   true, 2),
  ('Mayonnaise',        'mayonnaise',      true, 3),
  ('Cheese Alternatives','cheese-alt',     true, 4),
  ('Baking Ingredients','baking',          true, 5),
  ('Sauces & Dips',     'sauces-dips',     true, 6)
on conflict (slug) do nothing;

-- ── Seed activity log ─────────────────────────────────────────
insert into activity_logs (action, entity, detail, user_email) values
  ('login',     'auth',       'Admin signed in',                          'admin@srivriddhi.com'),
  ('created',   'product',    'Created: PlantSmör Butter 1kg',            'admin@srivriddhi.com'),
  ('created',   'product',    'Created: PlantSmör Cooking Cream 500ml',   'admin@srivriddhi.com'),
  ('updated',   'product',    'Updated SEO: PlantSmör Butter',            'admin@srivriddhi.com'),
  ('created',   'blog_post',  'Published: Why Plant-Based Butter…',       'admin@srivriddhi.com'),
  ('updated',   'seo',        'Updated SEO for Home page',                'admin@srivriddhi.com'),
  ('created',   'inquiry',    'New inquiry from Rajesh Kumar',             'system'),
  ('updated',   'inquiry',    'Marked inquiry as replied',                 'admin@srivriddhi.com'),
  ('created',   'testimonial','Added testimonial: Chef Arjun Malhotra',   'admin@srivriddhi.com'),
  ('login',     'auth',       'Admin signed in',                          'manager@srivriddhi.com'),
  ('created',   'blog_post',  'Draft created: India Plant-Based 2025',    'manager@srivriddhi.com'),
  ('deleted',   'product',    'Deleted draft product',                    'admin@srivriddhi.com')
on conflict do nothing;

-- ── Verify row counts ─────────────────────────────────────────
select 'products'     as tbl, count(*) from products
union all
select 'blog_posts',          count(*) from blog_posts
union all
select 'inquiries',           count(*) from inquiries
union all
select 'testimonials',        count(*) from testimonials
union all
select 'categories',          count(*) from categories
union all
select 'activity_logs',       count(*) from activity_logs;
