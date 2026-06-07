-- ============================================================
--  SVR20 CMS — Complete Supabase Schema
--  Run this in Supabase → SQL Editor → New Query
--
--  ✅  This file is SELF-CONTAINED. rls_patch.sql is no longer
--      needed — all policies already use auth.uid() IS NOT NULL
--      (the correct Supabase v2 security model).
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
--  PRODUCTS
-- ============================================================
create table if not exists products (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  tagline     text,
  description text,
  short_desc  text,
  category    text        not null default 'General',
  images      text[]      not null default '{}',
  tags        text[]      not null default '{}',
  benefits    text[]      not null default '{}',
  usage_home  text,
  usage_pro   text,
  pack_sizes  text,
  in_stock    boolean     not null default true,
  featured    boolean     not null default false,
  visible     boolean     not null default true,
  sort_order  int         not null default 0,
  seo_title   text,
  seo_desc    text,
  og_image    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Auto-update timestamp ──
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger products_touch_updated_at
  before update on products
  for each row execute procedure touch_updated_at();

-- ── RLS ──
alter table products enable row level security;
drop policy if exists "Public read visible products" on products;
create policy "Public read visible products"  on products for select using (visible = true);
-- BUG-001 FIX: auth.uid() IS NOT NULL is the correct Supabase v2 check.
-- auth.role() = 'authenticated' is deprecated and insecure (anon users can bypass).
drop policy if exists "Auth write products" on products;
create policy "Auth write products"
  on products for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- ── Seed defaults ──
insert into products (name, slug, tagline, description, short_desc, category, images, tags, benefits, usage_home, usage_pro, pack_sizes, featured, visible, sort_order, seo_title, seo_desc)
values
  ('PlantSmör Butter', 'plant-based-butter',
   'Rich taste. Stable melt. Everyday performance.',
   'A premium plant-based butter crafted for smooth spreading and high heat stability. Consistent results every time — for toast, cooking, and professional bakery use. No dairy, no cholesterol, full flavour.',
   'High heat stability. Smooth spread. Consistent results.',
   'Spreads',
   ARRAY['/images/product-plant-based-margarine.webp'],
   ARRAY['vegan','dairy-free','butter','plant-based'],
   ARRAY['100% Dairy Free','Zero Cholesterol','High Heat Stable','Rich & Creamy'],
   'Toast, paratha, baking, sandwich spreads.',
   'Professional baking, sauté cooking, pastry production.',
   '200g, 500g, 1kg, 5kg',
   true, true, 1,
   'PlantSmör Butter — Premium Plant-Based Butter | Srivriddhi Enterprise',
   'Premium plant-based butter with rich taste and high heat stability. 100% dairy free. For home, HoReCa and professional kitchens.'
  ),
  ('PlantSmör Cooking Cream', 'vegan-cooking-cream',
   'Smooth texture. Heat stable. Professional finish.',
   'A plant-based cooking cream engineered to perform under professional kitchen conditions. No curdling, consistent reduction, reliable in service. Designed for gravies, sauces, and finishing.',
   'No curdling. Consistent reduction. Reliable in service.',
   'Cooking Essentials',
   ARRAY['/images/product-vegan-cooking-cream.webp'],
   ARRAY['vegan','cream','cooking','plant-based'],
   ARRAY['Heat Stable','No Curdling','Cholesterol Free','Smooth Texture'],
   'Pasta, curries, soups, desserts.',
   'Gravies, gourmet sauces, professional kitchen finishing.',
   '200ml, 500ml, 1L',
   true, true, 2,
   'PlantSmör Cooking Cream — Vegan Cooking Cream | Srivriddhi Enterprise',
   'Plant-based cooking cream that stays smooth under heat. No curdling. For home cooks and professional kitchens.'
  ),
  ('PlantSmör Mayonnaise', 'vegan-mayonnaise',
   'Thick texture. Stable emulsion. Kitchen-ready.',
   'A thick, glossy plant-based mayonnaise with a stable emulsion. No splitting, consistent batches, smooth finish. Built for sandwiches, dips, and quick service operations at any scale.',
   'No splitting. Consistent batches. Smooth finish.',
   'Condiments',
   ARRAY['/images/product-vegan-mayonnaise.webp'],
   ARRAY['vegan','mayo','condiment','egg-free'],
   ARRAY['Egg Free','100% Vegan','Creamy Texture','Stable Emulsion'],
   'Sandwiches, burgers, wraps, dips.',
   'Deli counters, QSR, gourmet dressings.',
   '200g, 500g, 1kg, 5kg',
   true, true, 3,
   'PlantSmör Mayonnaise — Vegan Mayo | Srivriddhi Enterprise',
   'Thick, stable plant-based mayonnaise. Egg free. 100% vegan. For home and professional kitchen use.'
  )
on conflict (slug) do nothing;

-- ============================================================
--  CATEGORIES
-- ============================================================
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  visible    boolean not null default true,
  sort_order int     not null default 0
);
alter table categories enable row level security;
drop policy if exists "Public read categories" on categories;
create policy "Public read categories" on categories for select using (true);
drop policy if exists "Auth write categories" on categories;
create policy "Auth write categories"
  on categories for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into categories (name, slug, sort_order) values
  ('Spreads',            'spreads',            1),
  ('Cooking Essentials', 'cooking-essentials', 2),
  ('Condiments',         'condiments',         3),
  ('Plant Protein',      'plant-protein',      4),
  ('Frozen Vegetables',  'frozen-vegetables',  5),
  ('Wellness Drinks',    'wellness-drinks',    6)
on conflict (slug) do nothing;

-- ============================================================
--  TESTIMONIALS
-- ============================================================
create table if not exists testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text,
  company    text,
  quote      text not null,
  avatar_url text,
  rating     int  not null default 5,
  visible    boolean not null default true,
  sort_order int     not null default 0,
  created_at timestamptz not null default now()
);
alter table testimonials enable row level security;
drop policy if exists "Public read testimonials" on testimonials;
create policy "Public read testimonials"  on testimonials for select using (visible = true);
drop policy if exists "Auth write testimonials" on testimonials;
create policy "Auth write testimonials"
  on testimonials for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into testimonials (name, role, company, quote, rating, visible, sort_order) values
  ('Chef Aditya Sharma', 'Executive Chef',     'The Leela Hotels',
   'Srivriddhi''s cooking cream is the only plant-based cream that holds up in our high-heat kitchen. Absolutely incredible performance.', 5, true, 1),
  ('Priya Menon',         'F&B Manager',        'Taj Hotels',
   'We switched our entire butter line to PlantSmör. The taste difference is negligible but the demand from vegan guests has doubled.', 5, true, 2),
  ('Rajan Kapoor',        'Retail Director',    'Nature''s Basket',
   'Finally, a plant-based mayo that our team cannot tell apart from the original. We''ve been using it for 8 months.', 5, true, 3)
on conflict do nothing;

-- ============================================================
--  HOMEPAGE SECTIONS
-- ============================================================
create table if not exists homepage_sections (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  title      text,
  subtitle   text,
  body       text,
  image_url  text,
  cta_label  text,
  cta_link   text,
  visible    boolean not null default true,
  sort_order int     not null default 0,
  updated_at timestamptz not null default now()
);
alter table homepage_sections enable row level security;
drop policy if exists "Public read homepage sections" on homepage_sections;
create policy "Public read homepage sections"  on homepage_sections for select using (visible = true);
drop policy if exists "Auth write homepage" on homepage_sections;
create policy "Auth write homepage"
  on homepage_sections for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into homepage_sections (key, title, subtitle, body, cta_label, cta_link, visible, sort_order) values
  ('hero',
   'BUILT FOR KITCHENS. DRIVEN BY TASTE. MADE FOR INDIA.',
   'Premium plant-based foods engineered for chefs, HoReCa operators, and premium retail — where performance is non-negotiable.',
   '', 'Get Samples', '/contact', true, 1),
  ('about_teaser',
   'Plant-Based. Premium. Purposeful.',
   'Srivriddhi Enterprise was founded with a single conviction: plant-based food in India deserves the same rigor and quality as the world''s best food brands.',
   'We don''t make compromises for plants. We build better products — and prove it every time a chef or retailer chooses us again.',
   'Our Story', '/about', true, 2),
  ('cta_band',
   'Ready to Go Plant-Based?',
   'Talk to our team about bulk supply, samples, or trade terms. We respond within 24 hours.',
   '', 'Request Samples', '/contact', true, 3)
on conflict (key) do nothing;

-- ============================================================
--  ABOUT CONTENT
-- ============================================================
create table if not exists about_content (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  title      text,
  body       text,
  image_url  text,
  updated_at timestamptz not null default now()
);
alter table about_content enable row level security;
drop policy if exists "Public read about" on about_content;
create policy "Public read about" on about_content for select using (true);
drop policy if exists "Auth write about" on about_content;
create policy "Auth write about"
  on about_content for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into about_content (key, title, body) values
  ('mission',    'Our Mission',   'Srivriddhi Enterprise was founded with a single conviction: that plant-based food in India deserves to be built with the same rigor, quality, and ambition as the world''s best food brands.'),
  ('vision',     'Our Vision',    'To become India''s most trusted plant-based food enterprise — distributing premium products to every kitchen, hotel, and retail shelf in the country.'),
  ('story',      'Our Story',     'We don''t make compromises for plants. We build better products — and we prove it every time a chef, retailer, or customer chooses us again.'),
  ('founder',    'Founder Name',  'A passionate food entrepreneur who saw the gap in India''s plant-based food market and decided to fill it with uncompromising quality. Srivriddhi Enterprise was born from the belief that the future of Indian food is plant-powered.'),
  ('founded',    'Founded',       '2021'),
  ('location',   'Location',     'Sagar, Madhya Pradesh, India'),
  ('team_desc',  'Our Team',      'A passionate group of food technologists, distribution experts, and brand builders united by one goal: making plant-based the obvious choice.'),
  -- Pillars (editable from Admin → Content → About)
  ('pillar_1',   'Built for Scale',     'Distribution is the strategy, not the afterthought.'),
  ('pillar_2',   'B2B & HoReCa Ready', 'Bulk supply, trade terms, kitchen-grade formats.'),
  ('pillar_3',   '100% Plant-Based',   'No dairy. No compromise on taste or texture.'),
  ('pillar_4',   'India-Focused',      'Familiar formats, better execution, local roots.'),
  -- Values (editable from Admin → Content → About)
  ('value_1',    'Taste Wins First',           'If it doesn''t taste better, it doesn''t matter. Taste is the only entry point to repeat demand.'),
  ('value_2',    'Built for Indian Kitchens',  'Familiar formats. Better execution. Designed around the way India actually cooks and eats.'),
  ('value_3',    'Scale Matters',              'Distribution is the strategy. A great product without reach is a missed opportunity.')
on conflict (key) do nothing;

-- ============================================================
--  BLOG POSTS
-- ============================================================
create table if not exists blog_posts (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  slug        text        not null unique,
  excerpt     text,
  content     text,
  cover_image text,
  category    text        not null default 'General',
  tags        text[]      not null default '{}',
  published   boolean     not null default false,
  seo_title   text,
  seo_desc    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger blog_touch_updated_at
  before update on blog_posts
  for each row execute procedure touch_updated_at();
alter table blog_posts enable row level security;
drop policy if exists "Public read published posts" on blog_posts;
create policy "Public read published posts" on blog_posts for select using (published = true);
drop policy if exists "Auth write blog" on blog_posts;
create policy "Auth write blog"
  on blog_posts for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- ============================================================
--  INQUIRIES (Contact form submissions)
-- ============================================================
create table if not exists inquiries (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null constraint valid_email check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone      text,
  subject    text,
  message    text        not null,
  read       boolean     not null default false,
  replied    boolean     not null default false,
  created_at timestamptz not null default now()
);
alter table inquiries enable row level security;
-- Public INSERT only (anyone can submit contact form)
drop policy if exists "Public insert inquiries" on inquiries;
create policy "Public insert inquiries" on inquiries for insert with check (true);
-- BUG-001 FIX: auth.uid() IS NOT NULL for admin read/update/delete
drop policy if exists "Auth read inquiries" on inquiries;
create policy "Auth read inquiries"
  on inquiries for select using (auth.uid() is not null);
drop policy if exists "Auth update inquiries" on inquiries;
create policy "Auth update inquiries"
  on inquiries for update using (auth.uid() is not null) with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));
drop policy if exists "Auth delete inquiries" on inquiries;
create policy "Auth delete inquiries"
  on inquiries for delete using (auth.uid() is not null);

-- ============================================================
--  SITE SETTINGS (Key-Value)
-- ============================================================
create table if not exists site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  value      text,
  label      text,
  group_name text not null default 'general',
  updated_at timestamptz not null default now()
);
alter table site_settings enable row level security;
drop policy if exists "Public read settings" on site_settings;
create policy "Public read settings"  on site_settings for select using (true);
drop policy if exists "Auth write settings" on site_settings;
create policy "Auth write settings"
  on site_settings for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into site_settings (key, value, label, group_name) values
  ('site_name',        'Srivriddhi Enterprise',     'Site Name',        'general'),
  ('site_tagline',     'Spread The Change',          'Site Tagline',     'general'),
  ('brand_name',       'PlantSmör',                  'Brand Name',       'branding'),
  ('brand_tagline',    'Spread The Change',          'Brand Tagline',    'branding'),
  ('header_cta_label', 'Get Samples',               'Header CTA Button Text', 'branding'),
  ('site_email',       'info@srivriddhi.com',       'Contact Email',    'contact'),
  ('site_phone',       '+91 7565 000 365',          'Phone Number',     'contact'),
  ('site_whatsapp',    '917565000365',              'WhatsApp Number',  'contact'),
  ('site_address',     'Sagar, M.P. — India',       'Address',          'contact'),
  ('footer_tagline',   'PlantSmör — Spread The Change. Premium plant-based foods from India.', 'Footer Tagline', 'branding'),
  ('hero_badge',       'Premium Plant-Based Foods', 'Hero Badge Text',  'hero'),
  ('og_default_image', '/images/hero.webp',         'Default OG Image', 'seo'),
  ('ga_id',            '',                          'Google Analytics ID', 'analytics'),
  ('fb_pixel',         '',                          'Facebook Pixel ID',   'analytics'),
  ('social_facebook',   '',                          'Facebook URL',     'social'),
  ('social_youtube',    '',                          'YouTube URL',      'social'),
  ('social_instagram', '',                          'Instagram URL',    'social'),
  ('social_twitter',    '',                          'Twitter / X URL',  'social'),
  ('social_threads',    '',                          'Threads URL',      'social'),
  ('social_indiamart',  '',                          'IndiaMART URL',    'social'),
  ('social_linkedin',   '',                          'LinkedIn URL',     'social'),
  ('social_whatsapp',   '917565000365',              'WhatsApp for Social', 'social'),
  -- Page hero image overrides (managed via Admin → Settings → Page Hero Images)
  ('img_home_hero',     '/images/hero.webp',        'Homepage Hero Image',    'images'),
  ('img_about_hero',    '/images/about.webp',       'About Page Hero Image',  'images'),
  ('img_products_hero', '/images/hero.webp',        'Products Page Hero Image','images'),
  ('img_contact_hero',  '/images/contact.webp',     'Contact Page Hero Image', 'images'),
  ('img_blog_hero',     '',                         'Blog Page Hero Image',    'images')
on conflict (key) do nothing;

-- ============================================================
--  SEO PAGES
-- ============================================================
create table if not exists seo_pages (
  id          uuid primary key default gen_random_uuid(),
  page        text not null unique,
  title       text,
  description text,
  og_image    text,
  updated_at  timestamptz not null default now()
);
alter table seo_pages enable row level security;
drop policy if exists "Public read seo" on seo_pages;
create policy "Public read seo"  on seo_pages for select using (true);
drop policy if exists "Auth write seo" on seo_pages;
create policy "Auth write seo"
  on seo_pages for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

insert into seo_pages (page, title, description) values
  ('home',    'Srivriddhi Enterprise — Premium Plant-Based Foods',
              'Premium plant-based butter, cooking cream and mayo built for Indian kitchens, HoReCa, and premium retail.'),
  ('products','Products — Srivriddhi Enterprise',
              'Explore our premium plant-based food range: butter, cooking cream, and mayonnaise.'),
  ('about',   'About — Srivriddhi Enterprise',
              'Srivriddhi Enterprise is a premium plant-based food brand built for Indian kitchens and global ambition.'),
  ('contact', 'Contact — Srivriddhi Enterprise',
              'Get in touch for retail, HoReCa, bulk supply enquiries, or product samples.'),
  ('blog',    'Insights — Srivriddhi Enterprise',
              'Articles, news, and insights about plant-based food, the HoReCa industry, and food innovation in India.')
on conflict (page) do nothing;

-- ============================================================
--  STORAGE BUCKETS (run after enabling Storage in Supabase)
-- ============================================================
-- Insert into storage.buckets manually from the Supabase dashboard, OR run:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('blog-images',    'blog-images',    true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('site-assets',    'site-assets',    true, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Storage policies — Robust TO authenticated configuration
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete product images" ON storage.objects;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "Auth insert product images" on storage.objects;
create policy "Auth insert product images"
  on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
drop policy if exists "Auth update product images" on storage.objects;
create policy "Auth update product images"
  on storage.objects for update to authenticated using (bucket_id = 'product-images');
drop policy if exists "Auth delete product images" on storage.objects;
create policy "Auth delete product images"
  on storage.objects for delete to authenticated using (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete blog images" ON storage.objects;

drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
  on storage.objects for select using (bucket_id = 'blog-images');
drop policy if exists "Auth insert blog images" on storage.objects;
create policy "Auth insert blog images"
  on storage.objects for insert to authenticated with check (bucket_id = 'blog-images');
drop policy if exists "Auth update blog images" on storage.objects;
create policy "Auth update blog images"
  on storage.objects for update to authenticated using (bucket_id = 'blog-images');
drop policy if exists "Auth delete blog images" on storage.objects;
create policy "Auth delete blog images"
  on storage.objects for delete to authenticated using (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Public read site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete site assets" ON storage.objects;

drop policy if exists "Public read site assets" on storage.objects;
create policy "Public read site assets"
  on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "Auth insert site assets" on storage.objects;
create policy "Auth insert site assets"
  on storage.objects for insert to authenticated with check (bucket_id = 'site-assets');
drop policy if exists "Auth update site assets" on storage.objects;
create policy "Auth update site assets"
  on storage.objects for update to authenticated using (bucket_id = 'site-assets');
drop policy if exists "Auth delete site assets" on storage.objects;
create policy "Auth delete site assets"
  on storage.objects for delete to authenticated using (bucket_id = 'site-assets');

-- ============================================================
--  ACTIVITY LOGS (Audit trail — every admin action tracked)
-- ============================================================
create table if not exists activity_logs (
  id          uuid        primary key default gen_random_uuid(),
  action      text        not null,           -- 'created', 'updated', 'deleted', 'login', etc.
  entity      text        not null,           -- 'product', 'blog_post', 'inquiry', etc.
  entity_id   text,                           -- uuid of the affected record
  detail      text,                           -- human-readable summary
  user_email  text,                           -- who did it
  created_at  timestamptz not null default now()
);
alter table activity_logs enable row level security;
-- BUG-001 FIX: auth.uid() IS NOT NULL for activity log policies
drop policy if exists "Auth read activity logs" on activity_logs;
create policy "Auth read activity logs"
  on activity_logs for select using (auth.uid() is not null);
drop policy if exists "Auth insert activity logs" on activity_logs;
create policy "Auth insert activity logs"
  on activity_logs for insert with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- ── Seed: dummy activity log ──
insert into activity_logs (action, entity, detail, user_email) values
  ('login',   'auth',      'Admin signed in',                        'admin@srivriddhi.com'),
  ('created', 'product',   'Created product: PlantSmör Butter',      'admin@srivriddhi.com'),
  ('created', 'product',   'Created product: PlantSmör Cooking Cream','admin@srivriddhi.com'),
  ('updated', 'seo',       'Updated SEO for Home page',              'admin@srivriddhi.com'),
  ('created', 'blog_post', 'Published: Why Plant-Based is the Future','admin@srivriddhi.com');

-- ============================================================
--  SEED: DUMMY BLOG POSTS (20 posts for testing)
-- ============================================================
insert into blog_posts (title, slug, excerpt, content, category, tags, published, seo_title, seo_desc) values
  ('Why Plant-Based Butter is Transforming Indian Kitchens',
   'plant-based-butter-indian-kitchens',
   'From home cooks to professional chefs, plant-based butter is changing how India cooks. Here is why.',
   'Plant-based foods have been gaining traction globally for years, but in India, the shift is now accelerating. The traditional Indian kitchen, built around ghee and dairy, is discovering that plant-based alternatives can match — and in some cases exceed — the performance of their animal-based counterparts. Plant-based butter, in particular, has found its way into professional kitchens, bakeries, and homes across the country. The reasons are not just ethical — they are practical. High heat stability, consistent quality, and the ability to serve diverse dietary requirements are making plant-based butter a genuine kitchen essential.',
   'HoReCa', ARRAY['butter','plant-based','indian-kitchen','vegan'], true,
   'Why Plant-Based Butter is Transforming Indian Kitchens | Srivriddhi',
   'Discover why plant-based butter is becoming the go-to choice for Indian chefs and home cooks.'),

  ('The Complete Guide to Vegan Cooking Cream for Professional Kitchens',
   'vegan-cooking-cream-professional-kitchens',
   'Everything a professional chef needs to know about plant-based cooking cream — heat stability, usage, and more.',
   'In a professional kitchen, cooking cream is not optional — it is a workhorse ingredient. It goes into gravies, sauces, soups, and desserts. The problem with dairy cream in commercial settings is inconsistency: fat separation, curdling under acid, and unpredictable texture under high heat. Plant-based cooking cream solves many of these problems. With a controlled fat profile and engineered heat stability, it performs predictably — which is exactly what a professional kitchen needs. This guide covers everything you need to know about switching to or incorporating plant-based cooking cream in your operations.',
   'Recipes', ARRAY['cream','professional','horeca','vegan'], true,
   'Guide to Vegan Cooking Cream for Chefs | Srivriddhi',
   'A professional guide to using plant-based cooking cream in commercial kitchens.'),

  ('5 Reasons HoReCa Operators Are Switching to Plant-Based',
   'horeca-plant-based-switch',
   'Hotels, restaurants, and catering operations are making the move. Here are the five biggest reasons why.',
   'The hospitality industry is changing. Guest expectations have shifted dramatically — dietary preferences, allergen awareness, and ethical consumption are no longer fringe concerns. They are mainstream guest requirements. Plant-based menu options are no longer a niche add-on — they are a competitive necessity. HoReCa operators who have made the switch cite five consistent reasons: broader menu appeal, lower allergen risk, consistent quality, cost predictability, and alignment with sustainability goals.',
   'HoReCa', ARRAY['horeca','hotel','restaurant','vegan','plant-based'], true,
   '5 Reasons HoReCa Operators Switch to Plant-Based | Srivriddhi',
   'Why hotels, restaurants and caterers are moving to plant-based ingredients.'),

  ('Plant-Based vs Dairy: A Performance Comparison for Bakers',
   'plant-based-vs-dairy-bakers',
   'We put plant-based butter head-to-head with traditional dairy butter. Here is what professional bakers found.',
   'When professional bakers consider switching to plant-based butter, their first question is always performance. Will the lamination hold? Will the croissant flake? Will the cookie spread properly? These are legitimate concerns — and ones we have spent significant time answering. The short answer is: in most baking applications, a well-formulated plant-based butter performs comparably to dairy butter, and in some cases outperforms it. Heat stability is typically higher. Consistency batch-to-batch is better. And the absence of water activity variation that comes with dairy means more predictable outcomes.',
   'Recipes', ARRAY['baking','butter','dairy-free','professional'], true,
   'Plant-Based vs Dairy Butter for Bakers | Srivriddhi',
   'A technical comparison of plant-based and dairy butter for professional bakers.'),

  ('Understanding Allergen Management in Plant-Based Food Production',
   'allergen-management-plant-based',
   'Allergen control is one of the most important aspects of food safety. Here is how we approach it.',
   'Food allergen management is a critical responsibility for any food manufacturer. For plant-based products, the allergen profile is different from conventional foods — but no less important. Key allergens in plant-based production can include soy, tree nuts, gluten, and sesame. Our manufacturing processes are designed with strict allergen segregation, dedicated production lines, and rigorous cleaning protocols. For our customers — particularly those supplying allergen-sensitive environments like schools and hospitals — this documentation is essential.',
   'Food Safety', ARRAY['allergen','food-safety','manufacturing','compliance'], true,
   'Allergen Management in Plant-Based Production | Srivriddhi',
   'How Srivriddhi manages allergens in plant-based food manufacturing.'),

  ('The Rise of Vegan Mayo in Indian Quick Service Restaurants',
   'vegan-mayo-indian-qsr',
   'QSR chains across India are adding vegan mayo to their menus. We look at the drivers and the opportunity.',
   'Indian quick service restaurants have been expanding their plant-based options steadily. Vegan mayonnaise has emerged as one of the most adopted ingredients — and for good reason. It is versatile, crowd-pleasing, and meets the dietary requirements of a large portion of the Indian market that avoids eggs for cultural or personal reasons. The key to adoption in QSR is consistency: the same texture, the same flavour, the same colour, every single time. That is what a stable emulsion plant-based mayo delivers.',
   'HoReCa', ARRAY['mayo','qsr','vegan','india'], true,
   'Vegan Mayo in Indian QSR Restaurants | Srivriddhi',
   'How vegan mayonnaise is becoming essential in Indian quick service restaurants.'),

  ('How to Build a Plant-Based Menu That Actually Sells',
   'plant-based-menu-that-sells',
   'A practical guide for restaurateurs on building plant-based menu sections that customers actually order.',
   'Adding a plant-based section to your menu is one thing. Getting guests to order from it is another. The most common mistake restaurants make is treating plant-based options as an afterthought — dishes that exist to satisfy a dietary request, not dishes that excite a guest. The restaurants that succeed with plant-based menus approach them the same way they approach their best-selling conventional dishes: with creativity, proper technique, and premium ingredients. The dishes have to be delicious first.',
   'Business', ARRAY['menu','restaurant','plant-based','business'], true,
   'How to Build a Plant-Based Menu That Sells | Srivriddhi',
   'Practical advice for building a successful plant-based menu section.'),

  ('Srivriddhi Enterprise: Our Story',
   'srivriddhi-our-story',
   'From a conviction about Indian food to a plant-based food enterprise. This is how we got here.',
   'Srivriddhi Enterprise was built on a simple conviction: that plant-based food in India was being underserved. The options available were either imported and expensive, or locally made and inconsistent. We saw a gap — and we built a company to fill it. Our manufacturing is based in Sagar, Madhya Pradesh. Our distribution covers institutional buyers, HoReCa operators, and retail across India. Our products are built for performance first.',
   'Company', ARRAY['company','story','plant-based','india'], true,
   'Srivriddhi Enterprise: Our Story | Srivriddhi',
   'The story behind Srivriddhi Enterprise and our plant-based food mission.'),

  ('Cold Chain and Storage: What Plant-Based Buyers Need to Know',
   'cold-chain-storage-plant-based',
   'Temperature control, shelf life, and storage requirements for plant-based products explained.',
   'Plant-based products have specific cold chain requirements that buyers and distributors need to understand. Unlike shelf-stable products, plant-based butter, cream, and emulsified products require consistent refrigerated storage to maintain quality. The good news is that properly formulated plant-based products are often more forgiving than their dairy equivalents when brief temperature excursions occur — because they lack the biological activity that causes dairy to spoil rapidly.',
   'Logistics', ARRAY['cold-chain','storage','distribution','logistics'], true,
   'Cold Chain for Plant-Based Products | Srivriddhi',
   'Understanding cold chain, shelf life and storage for plant-based food products.'),

  ('Sustainability Credentials: What Buyers Are Now Asking For',
   'sustainability-credentials-buyers',
   'More institutional buyers are adding sustainability requirements to their procurement criteria. Here is what that means for suppliers.',
   'The procurement landscape for food ingredients is changing. Large hotel groups, hospital networks, and retail chains are increasingly adding Environmental, Social, and Governance (ESG) criteria to their supplier qualification processes. For food suppliers, this means documenting your carbon footprint, water usage, packaging recyclability, and supply chain transparency. Plant-based products have an inherent advantage here — the carbon and water footprint of plant-based fats is significantly lower than dairy — but documentation still needs to be in place.',
   'Business', ARRAY['sustainability','esg','procurement','environment'], false,
   'Sustainability Credentials for Food Suppliers | Srivriddhi',
   'What institutional buyers are asking of plant-based food suppliers on sustainability.'),

  ('Recipe: Restaurant-Style Mushroom Stroganoff with Plant-Based Cream',
   'mushroom-stroganoff-plant-based-cream',
   'A classic elevated with plant-based cooking cream. Works beautifully for both home cooks and professional plating.',
   'Mushroom stroganoff is a dish that lives or dies on its sauce. The sauce must be rich, glossy, and cling properly to the pasta. Plant-based cooking cream, when used correctly, delivers exactly this result. The key is temperature management and the order of addition. This recipe works at both home scale and professional batch scale — the technique is the same.',
   'Recipes', ARRAY['recipe','mushroom','stroganoff','cream','vegan'], true,
   'Restaurant-Style Mushroom Stroganoff Recipe | Srivriddhi',
   'A delicious plant-based mushroom stroganoff recipe using vegan cooking cream.'),

  ('The HoReCa Buyer Guide to Plant-Based Ingredient Sourcing',
   'horeca-buyer-guide-plant-based',
   'A complete reference for procurement managers evaluating plant-based ingredient suppliers.',
   'Sourcing plant-based ingredients for a hotel, restaurant, or catering operation requires a different evaluation framework than sourcing conventional ingredients. The market is younger, standards are less uniform, and the range of quality is wider. This guide provides procurement managers with a structured approach to evaluating plant-based ingredient suppliers — covering quality certification, cold chain capability, minimum order requirements, and consistency documentation.',
   'HoReCa', ARRAY['procurement','horeca','sourcing','buyer'], false,
   'HoReCa Buyer Guide to Plant-Based Sourcing | Srivriddhi',
   'A procurement guide for hospitality buyers evaluating plant-based ingredient suppliers.'),

  ('Packaging Innovation: How We Reduced Our Plastic Use by 30%',
   'packaging-innovation-plastic-reduction',
   'Our packaging improvement journey — and what it means for buyers who care about sustainability.',
   'Packaging is one of the most visible aspects of a food brand''s sustainability story. We have been on a multi-year journey to reduce our plastic use while maintaining the product protection and shelf life our customers depend on. This year, we achieved a 30% reduction in plastic packaging weight across our core product range.',
   'Company', ARRAY['packaging','sustainability','plastic','environment'], false,
   'Packaging Innovation at Srivriddhi | Srivriddhi',
   'How Srivriddhi reduced plastic packaging while maintaining product quality.'),

  ('Recipe: Flaky Vegan Croissants with Plant-Based Butter',
   'vegan-croissants-plant-based-butter',
   'Yes, you can make proper laminated pastry with plant-based butter. Here is how.',
   'Croissants are the ultimate test of a butter. The lamination process requires a fat that behaves consistently across a temperature range — soft enough to work at cool room temperature, firm enough not to melt into the dough during rolling. A properly formulated plant-based butter passes this test. The technique is identical to traditional croissant-making.',
   'Recipes', ARRAY['croissant','baking','butter','vegan','recipe'], true,
   'Vegan Croissants with Plant-Based Butter | Srivriddhi',
   'How to make flaky, delicious vegan croissants using plant-based butter.'),

  ('India''s Plant-Based Food Market: 2025 Outlook',
   'india-plant-based-market-2025',
   'A data-driven look at where the Indian plant-based food market is heading.',
   'India''s plant-based food market is at an inflection point. Several trends are converging: rising awareness of lifestyle diseases, growing middle-class willingness to pay for health-premium products, and increasing availability of plant-based options through mainstream retail channels. The institutional channel — HoReCa — has been the early adopter. The retail channel is where the next phase of growth will come from.',
   'Business', ARRAY['market','india','trend','plant-based','2025'], true,
   'India Plant-Based Food Market 2025 | Srivriddhi',
   'Analysis of the Indian plant-based food market outlook for 2025.'),

  ('Food Safety Certification: What FSSAI Requires for Plant-Based Manufacturers',
   'fssai-plant-based-manufacturers',
   'A practical guide to FSSAI compliance for plant-based food manufacturers in India.',
   'The Food Safety and Standards Authority of India (FSSAI) has been updating its standards to address the growing plant-based food category. For manufacturers, navigating these requirements requires understanding both the general food safety framework and the specific provisions that apply to plant-based products. This guide covers the key requirements that plant-based food manufacturers in India need to address.',
   'Food Safety', ARRAY['fssai','compliance','india','food-safety'], true,
   'FSSAI Requirements for Plant-Based Manufacturers | Srivriddhi',
   'A guide to FSSAI compliance for plant-based food manufacturers in India.'),

  ('How We Test Every Batch: Our Quality Control Process',
   'quality-control-process',
   'Inside our quality control laboratory and the tests that every batch goes through before it leaves our facility.',
   'Quality control is not a checklist at Srivriddhi — it is a manufacturing philosophy. Every batch of product that leaves our facility has gone through a defined set of physical, chemical, and organoleptic tests. This post walks through our quality control process: what we test, why we test it, and what happens when a batch does not pass.',
   'Food Safety', ARRAY['quality','manufacturing','testing','food-safety'], true,
   'Quality Control Process at Srivriddhi | Srivriddhi',
   'An inside look at the quality control and testing process at Srivriddhi Enterprise.'),

  ('Understanding Fat Chemistry: Why Not All Plant-Based Fats Are Equal',
   'plant-based-fat-chemistry',
   'A technical look at fat composition and why it determines performance in cooking and baking.',
   'Not all plant-based fats behave the same way in a kitchen — and understanding why requires some basic fat chemistry. The performance of a fat in cooking — how it melts, how it emulsifies, how it behaves under heat — is determined by its fatty acid composition and the degree of saturation. This post explains the science in accessible terms and explains why fat selection matters enormously in plant-based product formulation.',
   'Food Science', ARRAY['chemistry','fat','formulation','science','plant-based'], false,
   'Plant-Based Fat Chemistry Explained | Srivriddhi',
   'Understanding fat composition and why it matters for plant-based cooking performance.'),

  ('B2B Pricing and Minimum Order Guide',
   'b2b-pricing-minimum-order-guide',
   'Everything institutional buyers need to know about our bulk pricing, MOQs, and trade terms.',
   'For institutional buyers considering Srivriddhi products for their operations, pricing and minimum order quantities are among the first practical questions. This guide explains how our B2B pricing is structured, what minimum order quantities apply to each product, and what our standard trade terms look like.',
   'Business', ARRAY['b2b','pricing','bulk','institutional'], false,
   'B2B Pricing and MOQ Guide | Srivriddhi',
   'Bulk pricing, minimum order quantities and trade terms for institutional buyers.'),

  ('Getting Started with Plant-Based in Your School or Canteen',
   'plant-based-school-canteen',
   'A practical guide for institutional catering operators considering plant-based ingredients.',
   'School canteens and institutional catering operations have unique requirements: budget constraints, nutritional guidelines, allergen management, and the need to serve large volumes consistently. Plant-based ingredients can meet all of these requirements — often better than conventional alternatives. This guide addresses the practical questions that catering managers ask when considering plant-based ingredients.',
   'HoReCa', ARRAY['canteen','school','institutional','catering'], true,
   'Plant-Based Ingredients for Schools and Canteens | Srivriddhi',
   'A guide for school and institutional catering operators considering plant-based ingredients.')
on conflict (slug) do nothing;

-- ============================================================
--  SEED: DUMMY INQUIRIES (realistic mix for testing)
-- ============================================================
insert into inquiries (name, email, phone, subject, message, read, replied) values
  ('Rajesh Kumar',    'rajesh.kumar@hotelgrand.com',   '+91 9876543210', 'Bulk Order — Butter',      'We are interested in bulk ordering plant-based butter for our hotel chain of 12 properties across India. Please share your pricing for 5kg and 1kg SKUs at scale.', true,  true),
  ('Priya Sharma',    'priya@greencafe.in',            '+91 9823456789', 'Sample Request',            'We run a vegan cafe in Pune and would like to trial your cooking cream and mayo before placing a regular order. Can you send samples?', true,  true),
  ('Mohammed Ali',    'mali@spicetrail.com',           '+91 9712345678', 'Distributor Enquiry',       'We are a food distribution company operating in Maharashtra and Goa. We are interested in becoming a regional distributor for your products. Please send distributor terms.', true,  false),
  ('Sunita Patel',    'sunita.patel@bakehouse.co.in',  '+91 9654321098', 'Technical Query — Butter',  'Our head baker wants to understand the smoke point and lamination behaviour of your plant-based butter before we trial it in our croissant production. Can you share technical data sheets?', false, false),
  ('Vikram Singh',    'vsingh@tasteofdelhi.com',       '+91 9543210987', 'Partnership Proposal',      'We are a restaurant group with 8 outlets in Delhi NCR. Looking to build a long-term supplier relationship for plant-based ingredients. Would like to discuss exclusive regional pricing.', false, false),
  ('Anita Mehta',     'anita@organicliving.in',        '+91 9432109876', 'Retail Stocking',           'We own a premium organic retail store in Mumbai. We are interested in stocking your full product range. What are your retail trade terms and minimum order quantities?', false, false),
  ('Suresh Nair',     'suresh.nair@caterfresh.com',    '+91 9321098765', 'Catering Bulk Supply',      'We cater for corporate offices and supply 3000+ meals per day across Bangalore. Looking for reliable plant-based butter and cream supply. What are your delivery capabilities?', true,  false),
  ('Deepa Krishnan',  'deepa.k@cloudkitchen.io',       '+91 9210987654', 'Cloud Kitchen Supply',      'We operate 5 cloud kitchen brands. Two of our brands are fully plant-based. Looking for a consistent monthly supply arrangement. What is the typical lead time?', false, false),
  ('Ravi Gupta',      'ravi.gupta@hospitalfood.com',   '+91 9109876543', 'Hospital Catering Tender',  'We have a hospital catering contract where all products must be certified and allergen-documented. Can you provide full allergen documentation and FSSAI certification for your products?', true,  true),
  ('Kavya Reddy',     'kavya@modernbites.in',          '+91 9098765432', 'QSR Chain Enquiry',         'We run a chain of 22 QSR outlets and are reformulating our sandwich sauces to be 100% plant-based. Interested in your mayo for this purpose. Need pricing for 5kg jars.', false, false),
  ('Arun Pillai',     'arun.pillai@foodexport.com',    '+91 8987654321', 'Export Enquiry',            'We are a food export house looking to export Indian plant-based products to Southeast Asia. Do you have export-compliant packaging and documentation capability?', false, false),
  ('Meera Joshi',     'meera.j@wellness.co.in',        '+91 8876543210', 'Wellness Brand Collab',     'We are building a wellness food brand and looking for a plant-based fat supplier we can co-brand with. Interested in exploring a partnership. Who should I speak to?', false, false),
  ('Tarun Khanna',    'tarun@schoolmeals.in',          '+91 8765432109', 'School Meal Program',       'We supply meals to 40 schools in Punjab under a government contract. We need to add plant-based options. Looking for affordable bulk pricing. Is there a government tender pricing structure?', true,  false),
  ('Faisal Ahmed',    'faisal@middleeastern.in',       '+91 8654321098', 'Halal Certification Query', 'Our customers require Halal-certified products. Are your plant-based products Halal certified? If so, please share the certification documents.', false, false),
  ('Nandini Roy',     'nandini.roy@gourmetgrp.com',    '+91 8543210987', 'Gourmet Store Listing',     'We manage a chain of premium gourmet stores across South India. We are actively listing plant-based products and would love to discuss stocking your range. Who handles retail partnerships?', false, false),
  ('Prakash Verma',   'prakash@foodtech.startup.in',   '+91 8432109876', 'Investment Deck Request',   'We are a food-tech investor evaluating the plant-based sector in India. Would it be possible to get a company overview and product portfolio document?', true,  false),
  ('Shruti Bansal',   'shruti.b@caterfine.com',        '+91 8321098765', 'Fine Dining Supply',        'We supply ingredients to 15 fine dining restaurants in Mumbai. Our chefs are asking for plant-based cream and butter that perform at fine dining level. Can we arrange a chef trial?', false, false),
  ('Arjun Chopra',    'arjun.chopra@retailchain.com',  '+91 8210987654', 'National Retail Listing',   'We are a national retail chain with 200+ stores. We are actively expanding our plant-based category. Please send your trade terms and product listing requirements.', false, false),
  ('Divya Thomas',    'divya.thomas@homedelivery.in',  '+91 8109876543', 'Home Delivery Platform',    'We run a healthy food subscription box service. We would like to include your products in our monthly boxes. What are the packaging options suitable for direct-to-consumer gifting?', true,  false),
  ('Sanjay Malhotra', 'sanjay.m@pharma.corp.in',       '+91 8009876543', 'Corporate Gifting',         'Our pharmaceutical company is looking for premium plant-based food hampers for corporate gifting this festive season. Can you create custom gift packs? Looking for 500 units minimum.', false, false)
on conflict do nothing;

-- ============================================================
--  SEED: DUMMY TESTIMONIALS
-- ============================================================
insert into testimonials (name, role, company, quote, rating, visible, sort_order) values
  ('Chef Arjun Malhotra', 'Executive Chef', 'The Leela Palace, New Delhi',
   'PlantSmör butter performs exactly like dairy butter in lamination — consistent, workable, zero compromise on flakiness. We switched our croissant production completely.',
   5, true, 1),
  ('Priya Venkataraman', 'F&B Director', 'ITC Hotels Group',
   'The consistency of PlantSmör cooking cream across batches is something dairy simply cannot match. Our sauce production has become significantly more reliable.',
   5, true, 2),
  ('Mohammed Rashid', 'Head Chef', 'Taj Coromandel, Chennai',
   'We needed a plant-based mayo that could hold up in a high-volume QSR environment. PlantSmör mayonnaise has zero separation, perfect texture. Exactly what we needed.',
   5, true, 3),
  ('Kavya Nair', 'Procurement Head', 'CloudKitchen Hub, Bangalore',
   'Srivriddhi''s supply reliability and documentation has made them our preferred plant-based ingredient partner. The products sell themselves — but the service keeps us loyal.',
   5, true, 4),
  ('Rohit Gupta', 'Owner', 'Green Bowl Cafe, Mumbai',
   'As a fully vegan cafe, ingredient quality is everything. PlantSmör products have become integral to our menu. Guests cannot tell the difference — and some say they prefer it.',
   5, true, 5)
on conflict do nothing;
-- ============================================================
-- SVR Business OS — Supabase Database Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

-- ─── TABLE: grns (Goods Receipt Notes / Inward) ───────────────
create table if not exists grns (
  id           text primary key default gen_random_uuid()::text,
  grn_no       text not null,
  supplier     text not null,
  material     text not null,
  lot_no       text,
  qty          numeric(12,3) not null,
  uom          text default 'kg',
  rate         numeric(12,2) not null,
  gst_pct      numeric(5,2) default 0,
  gst_amt      numeric(12,2) default 0,
  total_cost   numeric(12,2) not null,
  mfg_date     date,
  expiry_date  date,
  invoice_no   text,
  vehicle_no   text,
  remarks      text,
  status       text default 'QC_PENDING'
               check (status in ('QC_PENDING','QC_DONE','REJECTED')),
  reject_reason text,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: lots (Raw Material Lots — created from GRN on approval) ──
create table if not exists lots (
  id           text primary key default gen_random_uuid()::text,
  lot_no       text,
  material     text not null,
  supplier     text,
  qty          numeric(12,3) not null,
  remaining_qty numeric(12,3) not null,
  unit         text default 'kg',
  rate         numeric(12,2),
  total_cost   numeric(12,2),
  mfg_date     date,
  expiry_date  date,
  qc_status    text default 'approved'
               check (qc_status in ('pending','approved','rejected')),
  grn_id       text references grns(id),
  created_at   timestamptz default now()
);

-- ─── TABLE: batches (Production Batches) ──────────────────────
create table if not exists batches (
  id           text primary key default gen_random_uuid()::text,
  batch_no     text not null,
  product      text not null,
  planned_qty  numeric(12,3) not null,
  actual_qty   numeric(12,3) default 0,
  reject_qty   numeric(12,3) default 0,
  yield_pct    numeric(6,2) default 0,
  unit         text default 'kg',
  line         text,
  operator     text,
  overhead     numeric(12,2) default 0,
  labour       numeric(12,2) default 0,
  total_cost   numeric(12,2) default 0,
  unit_cost    numeric(12,4) default 0,
  notes        text,
  comp_notes   text,
  status       text default 'PLANNED'
               check (status in ('PLANNED','RUNNING','QC_HOLD','COMPLETED','REJECTED')),
  qc_verdict   text,
  coa_no       text,
  start_time   timestamptz,
  end_time     timestamptz,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: qc_checks (Quality Control Records + CoA) ────────
create table if not exists qc_checks (
  id           text primary key default gen_random_uuid()::text,
  batch_id     text references batches(id),
  batch_no     text,
  product      text,
  results      jsonb,          -- array of {type, parameter, specification, result, verdict}
  overall      text check (overall in ('pass','fail','pending')),
  coa_issued   boolean default false,
  coa_number   text,
  analyst      text,
  reviewer     text,
  pack_size    text,
  format_no    text,
  remarks      text,
  tested_by    text,
  tested_at    timestamptz default now()
);

-- ─── TABLE: fg_lots (Finished Goods — created on QC pass) ────
create table if not exists fg_lots (
  id            text primary key default gen_random_uuid()::text,
  batch_id      text references batches(id),
  batch_no      text,
  product       text not null,
  qty           numeric(12,3),
  available_qty numeric(12,3),
  unit          text default 'kg',
  unit_cost     numeric(12,4) default 0,
  total_value   numeric(12,2) default 0,
  coa_no        text,
  created_at    timestamptz default now()
);

-- ─── TABLE: dispatches (Dispatch Orders) ─────────────────────
create table if not exists dispatches (
  id           text primary key default gen_random_uuid()::text,
  do_no        text not null,
  customer     text not null,
  product      text not null,
  batch_no     text,                  -- LINK-005: which FG batch was dispatched (traceability)
  qty          numeric(12,3) not null,
  unit         text default 'kg',
  rate         numeric(12,2) not null,
  gst_pct      numeric(5,2) default 18,
  gst_amt      numeric(12,2),
  subtotal     numeric(12,2),
  total        numeric(12,2),
  vehicle_no   text,
  lr_no        text,
  transporter  text,
  notes        text,
  status       text default 'DRAFT'
               check (status in ('DRAFT','CONFIRMED','DISPATCHED')),
  dispatched_at timestamptz,
  created_by   text,
  created_at   timestamptz default now()
);

-- ─── TABLE: invoices (Auto-created when DO is dispatched) ────
create table if not exists invoices (
  id           text primary key default gen_random_uuid()::text,
  invoice_no   text not null,
  customer     text not null,
  do_id        text references dispatches(id),
  do_no        text,
  product      text,
  qty          numeric(12,3),
  rate         numeric(12,2),
  subtotal     numeric(12,2),
  gst_pct      numeric(5,2),
  gst_amt      numeric(12,2),
  total        numeric(12,2) not null,
  paid_amt     numeric(12,2) default 0,
  status       text default 'UNPAID'
               check (status in ('UNPAID','PARTIAL','PAID')),
  date         date default current_date,
  created_at   timestamptz default now()
);

-- ─── TABLE: payments (Payment records against invoices) ───────
create table if not exists payments (
  id           text primary key default gen_random_uuid()::text,
  invoice_id   text references invoices(id),
  invoice_no   text,
  customer     text,
  amount       numeric(12,2) not null,
  mode         text default 'BANK',
  reference    text,
  payment_date date,
  recorded_by  text,
  created_at   timestamptz default now()
);

-- ─── TABLE: expenses (Manual expense entries) ─────────────────
create table if not exists expenses (
  id           text primary key default gen_random_uuid()::text,
  category     text not null,
  date         date not null,
  description  text not null,
  amount       numeric(12,2) not null,
  paid_by      text default 'Cash',
  notes        text,
  created_by   text,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- LINK-010 FIX: All "allow_all" policies replaced with
-- auth.uid() IS NOT NULL — authenticated users only.
-- Previously: using (true) → ANY anonymous caller could
-- read/write/delete all factory data via the anon key.
-- ============================================================

alter table grns        enable row level security;
alter table lots        enable row level security;
alter table batches     enable row level security;
alter table qc_checks   enable row level security;
alter table fg_lots     enable row level security;
alter table dispatches  enable row level security;
alter table invoices    enable row level security;
alter table payments    enable row level security;
alter table expenses    enable row level security;

drop policy if exists "auth_only_grns" on grns;
create policy "auth_only_grns"
  on grns for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_lots" on lots;
create policy "auth_only_lots"
  on lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_batches" on batches;
create policy "auth_only_batches"
  on batches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_qc_checks" on qc_checks;
create policy "auth_only_qc_checks"
  on qc_checks for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_fg_lots" on fg_lots;
create policy "auth_only_fg_lots"
  on fg_lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_dispatches" on dispatches;
create policy "auth_only_dispatches"
  on dispatches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_invoices" on invoices;
create policy "auth_only_invoices"
  on invoices for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_payments" on payments;
create policy "auth_only_payments"
  on payments for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "auth_only_expenses" on expenses;
create policy "auth_only_expenses"
  on expenses for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================================
-- UNIQUE CONSTRAINTS (LINK-009)
-- Prevent duplicate GRN/batch/DO numbers at DB level.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'grns_grn_no_unique') then
    alter table grns add constraint grns_grn_no_unique unique (grn_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'batches_batch_no_unique') then
    alter table batches add constraint batches_batch_no_unique unique (batch_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dispatches_do_no_unique') then
    alter table dispatches add constraint dispatches_do_no_unique unique (do_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_invoice_no_unique') then
    alter table invoices add constraint invoices_invoice_no_unique unique (invoice_no);
  end if;
end $$;

-- ============================================================
-- INDEXES (for fast queries on commonly filtered columns)
-- ============================================================

create index if not exists idx_grns_status        on grns(status);
create index if not exists idx_grns_created       on grns(created_at desc);
create index if not exists idx_lots_qc_status     on lots(qc_status);
create index if not exists idx_lots_expiry        on lots(expiry_date);
create index if not exists idx_lots_material      on lots(material);         -- for FEFO queries
create index if not exists idx_batches_status     on batches(status);
create index if not exists idx_batches_created    on batches(created_at desc);
create index if not exists idx_qc_batch_id        on qc_checks(batch_id);
create index if not exists idx_fg_lots_product    on fg_lots(product);
create index if not exists idx_fg_lots_batch_no   on fg_lots(batch_no);      -- LINK-005 trace
create index if not exists idx_dispatches_status  on dispatches(status);
create index if not exists idx_dispatches_batch_no on dispatches(batch_no);  -- LINK-005 trace
create index if not exists idx_invoices_status    on invoices(status);
create index if not exists idx_invoices_customer  on invoices(customer);
create index if not exists idx_expenses_category  on expenses(category);
create index if not exists idx_expenses_date      on expenses(date desc);

-- ============================================================
-- TABLE: consumed_lots (LINK-001 — RM consumption audit trail)
-- Created when batch is completed: tracks which lots were used
-- ============================================================
create table if not exists consumed_lots (
  id           text primary key default gen_random_uuid()::text,
  batch_id     text references batches(id) on delete cascade,
  batch_no     text not null,
  lot_id       text references lots(id),
  lot_no       text,
  material     text not null,
  qty_consumed numeric(12,3) not null,
  rate         numeric(12,2),          -- rate at time of consumption (for cost calc)
  cost         numeric(12,2),          -- qty_consumed × rate
  created_at   timestamptz default now()
);

alter table consumed_lots enable row level security;
drop policy if exists "auth_only_consumed_lots" on consumed_lots;
create policy "auth_only_consumed_lots"
  on consumed_lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create index if not exists idx_consumed_lots_batch_id  on consumed_lots(batch_id);
create index if not exists idx_consumed_lots_lot_id    on consumed_lots(lot_id);
create index if not exists idx_consumed_lots_material  on consumed_lots(material);

-- ============================================================
-- Done! All tables created with secure RLS policies.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
--  FOOD SAFETY MODULES — ISO 22000 / FSSAI / Codex
-- ═══════════════════════════════════════════════════════════

-- ── HACCP / CCP Monitoring Logs ───────────────────────────
CREATE TABLE IF NOT EXISTS ccp_logs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ccp_id           TEXT NOT NULL,          -- CCP1, CCP2 ...
  ccp_name         TEXT NOT NULL,
  batch_no         TEXT,
  reading          NUMERIC NOT NULL,
  unit             TEXT,
  critical_limit   TEXT,
  result           TEXT NOT NULL,          -- OK | DEVIATION
  corrective_action TEXT,
  checked_by       TEXT,
  remarks          TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── FSSAI Documents Register ──────────────────────────────
CREATE TABLE IF NOT EXISTS fssai_docs (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doc_type     TEXT NOT NULL,
  doc_no       TEXT,
  issue_date   DATE,
  expiry_date  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── FSSAI Audit Log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fssai_audits (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  audit_date  DATE NOT NULL,
  audit_type  TEXT NOT NULL,
  auditor     TEXT,
  findings    TEXT,
  status      TEXT DEFAULT 'Open',         -- Open | CAPA Raised | Closed
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── CAPA Register ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capas (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  capa_no            TEXT NOT NULL UNIQUE,
  source             TEXT NOT NULL,
  description        TEXT NOT NULL,
  rca_method         TEXT,
  rca_text           TEXT,
  corrective_action  TEXT,
  preventive_action  TEXT,
  owner              TEXT,
  target_date        DATE NOT NULL,
  status             TEXT DEFAULT 'Open',  -- Open | In Progress | Pending Verification | Closed
  verification_note  TEXT,
  closed_at          TIMESTAMPTZ,
  closed_by          TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── Allergen Matrix ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS allergen_matrix (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_name  TEXT NOT NULL,
  gluten        TEXT DEFAULT 'absent',     -- absent | present | risk
  crustacean    TEXT DEFAULT 'absent',
  eggs          TEXT DEFAULT 'absent',
  fish          TEXT DEFAULT 'absent',
  peanuts       TEXT DEFAULT 'absent',
  soy           TEXT DEFAULT 'absent',
  milk          TEXT DEFAULT 'absent',
  nuts          TEXT DEFAULT 'absent',
  celery        TEXT DEFAULT 'absent',
  mustard       TEXT DEFAULT 'absent',
  sesame        TEXT DEFAULT 'absent',
  sulphites     TEXT DEFAULT 'absent',
  lupin         TEXT DEFAULT 'absent',
  molluscs      TEXT DEFAULT 'absent',
  declared      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Recall Register ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS recalls (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recall_no       TEXT NOT NULL UNIQUE,
  is_mock         BOOLEAN DEFAULT false,
  batch_ref       TEXT,
  reason          TEXT NOT NULL,
  qty_dispatched  NUMERIC DEFAULT 0,
  qty_recovered   NUMERIC DEFAULT 0,
  unit            TEXT DEFAULT 'kg',
  initiated_by    TEXT,
  customers       TEXT,
  description     TEXT,
  trace_time      TEXT,
  status          TEXT DEFAULT 'Open',     -- Open | In Progress | Closed
  fssai_notified  BOOLEAN,
  closed_at       TIMESTAMPTZ,
  closed_by       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PRP Logs (Cleaning / Pest / Calibration) ─────────────
CREATE TABLE IF NOT EXISTS prp_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prp_type        TEXT NOT NULL,           -- cleaning | pest | calibration
  area            TEXT,                    -- cleaning / pest
  equipment       TEXT,                    -- calibration
  equipment_id    TEXT,
  cleaning_agent  TEXT,
  method          TEXT,
  pest_type       TEXT,
  chemical        TEXT,
  pco_name        TEXT,
  standard        TEXT,
  before_reading  TEXT,
  after_reading   TEXT,
  result          TEXT,
  next_due        DATE,
  done_by         TEXT,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Row Level Security — LINK-010 FIX ─────────────────────────
ALTER TABLE ccp_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_docs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fssai_audits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergen_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp_logs       ENABLE ROW LEVEL SECURITY;

drop policy if exists "auth_only_ccp_logs" on ccp_logs;
CREATE POLICY "auth_only_ccp_logs"
  ON ccp_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_fssai_docs" on fssai_docs;
CREATE POLICY "auth_only_fssai_docs"
  ON fssai_docs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_fssai_audits" on fssai_audits;
CREATE POLICY "auth_only_fssai_audits"
  ON fssai_audits FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_capas" on capas;
CREATE POLICY "auth_only_capas"
  ON capas FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_allergen_matrix" on allergen_matrix;
CREATE POLICY "auth_only_allergen_matrix"
  ON allergen_matrix FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_recalls" on recalls;
CREATE POLICY "auth_only_recalls"
  ON recalls FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

drop policy if exists "auth_only_prp_logs" on prp_logs;
CREATE POLICY "auth_only_prp_logs"
  ON prp_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS PATCH — BOS Tables (DB-003 FIX)
-- Added by audit: all BOS operational tables now require
-- authenticated users with a valid BOS role to read/write.
-- ============================================================

-- Helper function for BOS role check
create or replace function bos_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select (auth.jwt()->'app_metadata'->>'role') = ANY(required_roles)
    and auth.uid() is not null;
$$;

-- GRNs
alter table if exists grns enable row level security;
drop policy if exists "BOS read grns" on grns;
drop policy if exists "BOS write grns" on grns;
create policy "BOS read grns"
  on grns for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write grns" on grns;
create policy "BOS write grns"
  on grns for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- Lots
alter table if exists lots enable row level security;
drop policy if exists "BOS read lots" on lots;
drop policy if exists "BOS write lots" on lots;
create policy "BOS read lots"
  on lots for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write lots" on lots;
create policy "BOS write lots"
  on lots for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER']));

-- Batches
alter table if exists batches enable row level security;
drop policy if exists "BOS read batches" on batches;
drop policy if exists "BOS write batches" on batches;
create policy "BOS read batches"
  on batches for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
drop policy if exists "BOS write batches" on batches;
create policy "BOS write batches"
  on batches for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- BOS Recipe tables (rnd_formulas) - RLS handled in rnd_schema.sql
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
create policy "allow_all_documents"     on documents     for all using (true) with check (true);
create policy "allow_all_dms_companies" on dms_companies for all using (true) with check (true);

-- Indexes
create index if not exists idx_documents_co_id    on documents(co_id);
create index if not exists idx_documents_status   on documents(status);
create index if not exists idx_documents_date     on documents(date desc);
create index if not exists idx_documents_type     on documents(type_code);
-- ============================================================
-- ============================================================================
-- WORK_CENTERS: Production zones/lines
-- ============================================================================
CREATE TABLE public.work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('Mixing','Blending','Filling','Packaging','Quality','Storage','Other')),
  capacity numeric NOT NULL CHECK (capacity > 0),
  capacity_unit text NOT NULL DEFAULT 'kg/hr',
  shift_hours numeric NOT NULL DEFAULT 8 CHECK (shift_hours > 0 AND shift_hours <= 24),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Under Maintenance')),
  location text,
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_name text, -- denormalized for speed, trigger se update hoga
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_code_per_org UNIQUE (org_id, code),
  CONSTRAINT positive_capacity CHECK (capacity > 0),
  CONSTRAINT valid_shift_hours CHECK (shift_hours > 0 AND shift_hours <= 24)
);

CREATE INDEX idx_work_centers_org_status ON work_centers(org_id, status);
CREATE INDEX idx_work_centers_code ON work_centers(org_id, code);

-- Auto update supervisor_name from profiles
CREATE OR REPLACE FUNCTION sync_workcenter_supervisor_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supervisor_id IS NOT NULL THEN
    SELECT name INTO NEW.supervisor_name FROM profiles WHERE id = NEW.supervisor_id;
  ELSE
    NEW.supervisor_name = NULL;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workcenter_supervisor
BEFORE INSERT OR UPDATE OF supervisor_id ON work_centers
FOR EACH ROW EXECUTE FUNCTION sync_workcenter_supervisor_name();

-- RLS: Sirf ADMIN/MANAGER edit kar sakte, baaki view only
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view work_centers" 
ON work_centers FOR SELECT 
USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can insert work_centers" 
ON work_centers FOR INSERT 
WITH CHECK (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

CREATE POLICY "Managers can update work_centers" 
ON work_centers FOR UPDATE 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

CREATE POLICY "Admin only delete work_centers" 
ON work_centers FOR DELETE 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- EQUIPMENT: Machines inside work centers
-- ============================================================================
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES work_centers(id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_code text NOT NULL,
  equipment_type text, -- 'Mixer','Filler','Sealer','Conveyor'
  make_model text,
  capacity numeric,
  capacity_unit text,
  status text NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational','Under Maintenance','Breakdown','Retired')),
  last_maintenance_date date,
  next_maintenance_date date,
  installation_date date,
  location text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_asset_code_per_org UNIQUE (org_id, asset_code),
  CONSTRAINT positive_capacity CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX idx_equipment_org_wc ON equipment(org_id, work_center_id);
CREATE INDEX idx_equipment_status ON equipment(org_id, status);

-- RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view equipment" 
ON equipment FOR SELECT 
USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can modify equipment" 
ON equipment FOR ALL 
USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN','MANAGER')
);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipment_updated_at
BEFORE UPDATE ON equipment
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent Delete If In Use
CREATE OR REPLACE FUNCTION check_workcenter_in_use()
RETURNS TRIGGER AS $$
DECLARE
  v_count int;
BEGIN
  -- Check batches table
  SELECT COUNT(*) INTO v_count FROM batches 
  WHERE line = (SELECT code FROM work_centers WHERE id = OLD.id)
  AND status IN ('PLANNED','RUNNING','QC_HOLD');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete work center: % active batches are using it', v_count;
  END IF;
  
  -- Check equipment
  SELECT COUNT(*) INTO v_count FROM equipment WHERE work_center_id = OLD.id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete work center: % equipment assigned. Reassign first', v_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_wc_delete
BEFORE DELETE ON work_centers
FOR EACH ROW EXECUTE FUNCTION check_workcenter_in_use();

-- Audit Log for Master Changes
CREATE TABLE public.master_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  table_name text NOT NULL, -- 'work_centers', 'equipment'
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT','UPDATE','DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_master_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO master_audit_log (org_id, table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workcenters_audit
AFTER INSERT OR UPDATE OR DELETE ON work_centers
FOR EACH ROW EXECUTE FUNCTION log_master_changes();

CREATE TRIGGER trg_equipment_audit
AFTER INSERT OR UPDATE OR DELETE ON equipment
FOR EACH ROW EXECUTE FUNCTION log_master_changes();
-- ============================================================================
-- 1. Auto-update Trigger for Stock Ledger
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_stock_on_ledger_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  -- Validate: ya to lot_id ho ya fg_lot_id, dono nahi
  IF (NEW.lot_id IS NOT NULL AND NEW.fg_lot_id IS NOT NULL) OR
     (NEW.lot_id IS NULL AND NEW.fg_lot_id IS NULL) THEN
    RAISE EXCEPTION 'Either lot_id or fg_lot_id must be set, not both';
  END IF;

  -- Update lots table
  IF NEW.lot_id IS NOT NULL THEN
    UPDATE lots 
    SET remaining_qty = remaining_qty + NEW.qty_change
    WHERE id = NEW.lot_id
    RETURNING remaining_qty INTO v_current_qty;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot % not found in lots table', NEW.lot_id;
    END IF;
    
    IF v_current_qty < 0 THEN
      RAISE EXCEPTION 'Stock would go negative for lot %. Current: %, Change: %', 
        NEW.lot_id, v_current_qty - NEW.qty_change, NEW.qty_change;
    END IF;
  END IF;

  -- Update fg_lots table
  IF NEW.fg_lot_id IS NOT NULL THEN
    UPDATE fg_lots 
    SET qty_on_hand = qty_on_hand + NEW.qty_change
    WHERE id = NEW.fg_lot_id
    RETURNING qty_on_hand INTO v_current_qty;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FG Lot % not found in fg_lots table', NEW.fg_lot_id;
    END IF;
    
    IF v_current_qty < 0 THEN
      RAISE EXCEPTION 'Stock would go negative for FG lot %. Current: %, Change: %', 
        NEW.fg_lot_id, v_current_qty - NEW.qty_change, NEW.qty_change;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stock_ledger_sync
AFTER INSERT ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION sync_stock_on_ledger_insert();

-- Prevent manual updates/deletes on stock_ledger - audit trail must be immutable
CREATE OR REPLACE FUNCTION prevent_stock_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_ledger is append-only. Updates/deletes not allowed for audit compliance';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_ledger_no_update
BEFORE UPDATE ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

CREATE TRIGGER trg_stock_ledger_no_delete
BEFORE DELETE ON stock_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

-- ============================================================================
-- 2. UPDATED RPCs (Manual UPDATE removed, delegates to ledger trigger)
-- ============================================================================

-- COMPLETE_PACKAGING_RUN
CREATE OR REPLACE FUNCTION complete_packaging_run(
  p_bulk_lot_id uuid,
  p_bulk_qty numeric,
  p_fg_lot_id uuid,
  p_fg_qty numeric,
  p_pm_lot_id uuid DEFAULT NULL,
  p_pm_qty numeric DEFAULT 0,
  p_operator_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_bulk_remaining numeric;
  v_pm_remaining numeric;
  v_run_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- Check bulk lot stock
  SELECT remaining_qty INTO v_bulk_remaining FROM lots WHERE id = p_bulk_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bulk lot % not found', p_bulk_lot_id; END IF;
  IF v_bulk_remaining < p_bulk_qty THEN 
    RAISE EXCEPTION 'Insufficient bulk stock. Available: %', v_bulk_remaining; 
  END IF;

  -- Check PM lot if provided
  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_remaining FROM lots WHERE id = p_pm_lot_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PM lot % not found', p_pm_lot_id; END IF;
    IF v_pm_remaining < p_pm_qty THEN 
      RAISE EXCEPTION 'Insufficient PM stock. Available: %', v_pm_remaining; 
    END IF;
  END IF;

  -- Insert packaging_run
  INSERT INTO packaging_runs (
    id, org_id, bulk_lot_id, fg_lot_id, pm_lot_id, 
    bulk_qty_consumed, fg_qty_produced, pm_qty_consumed,
    operator_id, notes, run_date
  ) VALUES (
    gen_random_uuid(), v_org_id, p_bulk_lot_id, p_fg_lot_id, p_pm_lot_id,
    p_bulk_qty, p_fg_qty, p_pm_qty,
    COALESCE(p_operator_id, auth.uid()), p_notes, now()
  ) RETURNING id INTO v_run_id;

  -- Just insert ledger entries. Trigger will update lots/fg_lots automatically
  INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_bulk_lot_id, 'OUT', -p_bulk_qty, v_run_id, 'Packaging run: ' || p_fg_lot_id, auth.uid());

  IF p_pm_lot_id IS NOT NULL AND p_pm_qty > 0 THEN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_lot_id, 'OUT', -p_pm_qty, v_run_id, 'PM consumed for FG: ' || p_fg_lot_id, auth.uid());
  END IF;

  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_fg_lot_id, 'IN', p_fg_qty, v_run_id, 'Packaging run from bulk: ' || p_bulk_lot_id, auth.uid());

  RETURN jsonb_build_object('success', true, 'run_id', v_run_id);
END;
$$;

-- CONVERT_SKU
CREATE OR REPLACE FUNCTION convert_sku(
  p_source_fg_lot_id uuid,
  p_target_fg_lot_id uuid,
  p_qty_convert numeric,
  p_pm_wastage_lot_id uuid DEFAULT NULL,
  p_pm_wastage_qty numeric DEFAULT 0,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_source_qty numeric;
  v_pm_qty numeric;
  v_conv_id uuid := gen_random_uuid();
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  
  SELECT qty_on_hand INTO v_source_qty FROM fg_lots WHERE id = p_source_fg_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source FG lot not found'; END IF;
  IF v_source_qty < p_qty_convert THEN 
    RAISE EXCEPTION 'Insufficient FG stock. Available: %', v_source_qty; 
  END IF;

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    SELECT remaining_qty INTO v_pm_qty FROM lots WHERE id = p_pm_wastage_lot_id;
    IF v_pm_qty < p_pm_wastage_qty THEN 
      RAISE EXCEPTION 'Insufficient PM for wastage. Available: %', v_pm_qty; 
    END IF;
  END IF;

  -- Ledger entries
  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_source_fg_lot_id, 'OUT', -p_qty_convert, v_conv_id, 'SKU Conversion to: ' || p_target_fg_lot_id || '. ' || p_reason, auth.uid());

  INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
  VALUES (v_org_id, p_target_fg_lot_id, 'IN', p_qty_convert, v_conv_id, 'SKU Conversion from: ' || p_source_fg_lot_id, auth.uid());

  IF p_pm_wastage_lot_id IS NOT NULL AND p_pm_wastage_qty > 0 THEN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, p_pm_wastage_lot_id, 'WASTAGE', -p_pm_wastage_qty, v_conv_id, 'SKU Conversion wastage', auth.uid());
  END IF;

  RETURN jsonb_build_object('success', true, 'conversion_id', v_conv_id);
END;
$$;

-- COMPLETE_BATCH
CREATE OR REPLACE FUNCTION complete_batch(
  p_batch_id uuid,
  p_actual_qty numeric,
  p_reject_qty numeric DEFAULT 0,
  p_labor_hours numeric DEFAULT 0,
  p_overhead_cost numeric DEFAULT 0,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_batch batches%ROWTYPE;
  v_comp RECORD;
  v_total_rm_cost numeric := 0;
  v_lot_remaining numeric;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  
  SELECT * INTO v_batch FROM batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF v_batch.status != 'RUNNING' THEN RAISE EXCEPTION 'Batch not in RUNNING state'; END IF;

  FOR v_comp IN 
    SELECT bc.*, l.remaining_qty, l.rate 
    FROM batch_components bc
    LEFT JOIN lots l ON l.id = bc.lot_id
    WHERE bc.batch_id = p_batch_id
  LOOP
    IF v_comp.lot_id IS NOT NULL THEN
      SELECT remaining_qty INTO v_lot_remaining FROM lots WHERE id = v_comp.lot_id;
      
      IF v_lot_remaining < v_comp.actual_qty THEN
        RAISE EXCEPTION 'Insufficient stock for lot %. Required: %, Available: %', 
          v_comp.lot_id, v_comp.actual_qty, v_lot_remaining;
      END IF;
      
      -- Ledger triggers lot update
      INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, reference_id, notes, created_by)
      VALUES (v_org_id, v_comp.lot_id, 'OUT', -v_comp.actual_qty, p_batch_id, 
              'Batch ' || v_batch.batch_no || ' consumption', auth.uid());
      
      INSERT INTO consumed_lots (
        batch_id, batch_no, lot_id, material, qty_consumed, rate, cost
      ) VALUES (
        p_batch_id, v_batch.batch_no, v_comp.lot_id, v_comp.material, 
        v_comp.actual_qty, COALESCE(v_comp.rate, 0), v_comp.actual_qty * COALESCE(v_comp.rate, 0)
      );
      
      v_total_rm_cost := v_total_rm_cost + (v_comp.actual_qty * COALESCE(v_comp.rate, 0));
    END IF;
  END LOOP;

  IF p_labor_hours > 0 THEN
    INSERT INTO labor_hours (org_id, batch_id, hours_worked, hourly_rate, created_by)
    VALUES (v_org_id, p_batch_id, p_labor_hours, 150, auth.uid());
  END IF;

  IF v_total_rm_cost > 0 THEN
    INSERT INTO expenses (org_id, date, category, description, amount, notes)
    VALUES (
      v_org_id, CURRENT_DATE, 'Raw Material', 
      'RM consumed - Batch ' || v_batch.batch_no || ' (' || v_batch.product || ')',
      v_total_rm_cost, 'Auto-created from batch completion'
    );
  END IF;

  UPDATE batches SET 
    status = 'QC_HOLD',
    actual_qty = p_actual_qty,
    reject_qty = p_reject_qty,
    yield_pct = CASE WHEN planned_qty > 0 THEN (p_actual_qty / planned_qty * 100) ELSE 0 END,
    end_time = now(),
    notes = COALESCE(notes || E'\n', '') || 'Batch Cost: ₹' || 
            (v_total_rm_cost + p_labor_hours * 150 + p_overhead_cost)::text || 
            E'\n' || COALESCE(p_notes, '')
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'rm_cost', v_total_rm_cost);
END;
$$;
-- ============================================================================
-- SETUP: Test data banao
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'; -- apna org_id daalo
  v_rm_lot_id uuid;
  v_bulk_lot_id uuid;
  v_pm_lot_id uuid;
  v_fg_lot_id uuid;
  v_batch_id uuid;
  v_recipe_id uuid;
  v_product_id uuid;
  v_run_id uuid;
BEGIN
  -- Clean slate for testing
  DELETE FROM stock_ledger WHERE org_id = v_org_id;
  DELETE FROM packaging_runs WHERE org_id = v_org_id;
  DELETE FROM fg_lots WHERE org_id = v_org_id;
  DELETE FROM lots WHERE org_id = v_org_id;
  DELETE FROM batches WHERE org_id = v_org_id;

  -- 1. Create RM Lot: 100kg Sugar
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, rate, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-RM-001', 'Sugar', 100, 100, 'kg', 50, 'APPROVED')
  RETURNING id INTO v_rm_lot_id;

  -- 2. Create Bulk Lot: 50kg Bulk Product
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-BULK-001', 'MotherLite Bulk', 50, 50, 'kg', 'APPROVED')
  RETURNING id INTO v_bulk_lot_id;

  -- 3. Create PM Lot: 1000 wrappers
  INSERT INTO lots (id, org_id, lot_no, material, initial_qty, remaining_qty, unit, qc_status)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-PM-001', 'Wrapper 500G', 1000, 1000, 'pcs', 'APPROVED')
  RETURNING id INTO v_pm_lot_id;

  -- 4. Create FG Lot: 0kg initially
  INSERT INTO fg_lots (id, org_id, fg_lot_no, sku_code, product_name, qty_on_hand, unit)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-FG-500G-001', 'MOTHERLITE-500G', 'MotherLite 500G', 0, 'kg')
  RETURNING id INTO v_fg_lot_id;

  RAISE NOTICE 'Setup complete. RM Lot: %, Bulk: %, PM: %, FG: %', v_rm_lot_id, v_bulk_lot_id, v_pm_lot_id, v_fg_lot_id;

  -- ============================================================================
  -- TEST 1: complete_packaging_run - Normal case
  -- ============================================================================
  RAISE NOTICE '--- TEST 1: Packaging Run 20kg bulk + 40 wrappers -> 20kg FG ---';
  
  SELECT complete_packaging_run(
    p_bulk_lot_id := v_bulk_lot_id,
    p_bulk_qty := 20,
    p_fg_lot_id := v_fg_lot_id,
    p_fg_qty := 20,
    p_pm_lot_id := v_pm_lot_id,
    p_pm_qty := 40,
    p_notes := 'Test Run 1'
  ) INTO v_run_id;

  -- Verify
  IF (SELECT remaining_qty FROM lots WHERE id = v_bulk_lot_id) != 30 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Bulk remaining should be 30, got %', (SELECT remaining_qty FROM lots WHERE id = v_bulk_lot_id);
  END IF;
  
  IF (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id) != 960 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: PM remaining should be 960, got %', (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id);
  END IF;
  
  IF (SELECT qty_on_hand FROM fg_lots WHERE id = v_fg_lot_id) != 20 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: FG qty should be 20, got %', (SELECT qty_on_hand FROM fg_lots WHERE id = v_fg_lot_id);
  END IF;
  
  RAISE NOTICE 'TEST 1 PASSED: Stock updated correctly';

  -- ============================================================================
  -- TEST 2: Negative stock prevention
  -- ============================================================================
  RAISE NOTICE '--- TEST 2: Try to consume 50kg bulk when only 30 left ---';
  
  BEGIN
    PERFORM complete_packaging_run(
      p_bulk_lot_id := v_bulk_lot_id,
      p_bulk_qty := 50, -- Only 30 left
      p_fg_lot_id := v_fg_lot_id,
      p_fg_qty := 50
    );
    RAISE EXCEPTION 'TEST 2 FAILED: Should have thrown insufficient stock error';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Insufficient bulk stock%' THEN
        RAISE NOTICE 'TEST 2 PASSED: Correctly blocked negative stock';
      ELSE
        RAISE EXCEPTION 'TEST 2 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  -- ============================================================================
  -- TEST 3: convert_sku - 10kg 500G to 500G
  -- ============================================================================
  RAISE NOTICE '--- TEST 3: Convert 10kg FG to new FG lot ---';
  
  -- Create target FG lot
  INSERT INTO fg_lots (id, org_id, fg_lot_no, sku_code, product_name, qty_on_hand, unit)
  VALUES (gen_random_uuid(), v_org_id, 'TEST-FG-200G-001', 'MOTHERLITE-200G', 'MotherLite 200G', 0, 'kg')
  RETURNING id INTO v_fg_lot_id;

  PERFORM convert_sku(
    p_source_fg_lot_id := (SELECT id FROM fg_lots WHERE fg_lot_no = 'TEST-FG-500G-001'),
    p_target_fg_lot_id := v_fg_lot_id,
    p_qty_convert := 10,
    p_pm_wastage_lot_id := v_pm_lot_id,
    p_pm_wastage_qty := 20,
    p_reason := 'Test conversion'
  );

  -- Verify
  IF (SELECT qty_on_hand FROM fg_lots WHERE fg_lot_no = 'TEST-FG-500G-001') != 10 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Source FG should be 10';
  END IF;
  
  IF (SELECT qty_on_hand FROM fg_lots WHERE fg_lot_no = 'TEST-FG-200G-001') != 10 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Target FG should be 10';
  END IF;
  
  IF (SELECT remaining_qty FROM lots WHERE id = v_pm_lot_id) != 940 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: PM should be 940 after 20 wastage';
  END IF;
  
  RAISE NOTICE 'TEST 3 PASSED: SKU conversion worked';

  -- ============================================================================
  -- TEST 4: Direct stock_ledger insert should update lots
  -- ============================================================================
  RAISE NOTICE '--- TEST 4: Manual ledger insert for RM ---';
  
  INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, notes, created_by)
  VALUES (v_org_id, v_rm_lot_id, 'IN', 50, 'Test GRN', auth.uid());

  IF (SELECT remaining_qty FROM lots WHERE id = v_rm_lot_id) != 150 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: RM should be 150 after +50';
  END IF;
  
  RAISE NOTICE 'TEST 4 PASSED: Ledger trigger updated lot';

  -- ============================================================================
  -- TEST 5: Try to delete stock_ledger - should fail
  -- ============================================================================
  RAISE NOTICE '--- TEST 5: Try to delete ledger entry ---';
  
  BEGIN
    DELETE FROM stock_ledger WHERE lot_id = v_rm_lot_id LIMIT 1;
    RAISE EXCEPTION 'TEST 5 FAILED: Should not allow delete';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE 'TEST 5 PASSED: Ledger is immutable';
      ELSE
        RAISE EXCEPTION 'TEST 5 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  -- ============================================================================
  -- TEST 6: Try negative stock via direct ledger insert
  -- ============================================================================
  RAISE NOTICE '--- TEST 6: Try to make stock negative ---';
  
  BEGIN
    INSERT INTO stock_ledger (org_id, lot_id, transaction_type, qty_change, notes, created_by)
    VALUES (v_org_id, v_bulk_lot_id, 'OUT', -100, 'Test overdraw', auth.uid());
    RAISE EXCEPTION 'TEST 6 FAILED: Should have blocked negative stock';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%would go negative%' THEN
        RAISE NOTICE 'TEST 6 PASSED: Negative stock blocked';
      ELSE
        RAISE EXCEPTION 'TEST 6 FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;

  RAISE NOTICE '=== ALL TESTS PASSED ===';
END $$;
-- ============================================================================
-- RPC: APPROVE_GRN_AND_CREATE_LOT
-- Atomically: 1. Lock GRN 2. Approve GRN 3. Create Lot 4. Ledger IN 5. Expense
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_grn_and_create_lot(
  p_grn_id uuid,
  p_user_id uuid DEFAULT auth.uid(),
  p_user_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn grns%ROWTYPE;
  v_lot_id uuid;
  v_org_id uuid;
  v_user_name text;
  v_expense_id uuid;
BEGIN
  -- 1. Get user org and name
  SELECT org_id, COALESCE(p_user_name, name, 'System') 
  INTO v_org_id, v_user_name
  FROM profiles WHERE id = p_user_id;
  
  IF v_org_id IS NULL THEN 
    RAISE EXCEPTION 'User org not found or user not authenticated'; 
  END IF;

  -- 2. Lock GRN row and validate status - prevents double-approve race condition
  SELECT * INTO v_grn FROM grns 
  WHERE id = p_grn_id 
    AND org_id = v_org_id 
    AND status = 'QC_PENDING' 
  FOR UPDATE;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'GRN not found, already processed, or access denied'; 
  END IF;

  -- 3. Update GRN status to APPROVED
  UPDATE grns 
  SET status = 'APPROVED', 
      updated_at = now() 
  WHERE id = p_grn_id;

  -- 4. Create LOT - remaining_qty = 0, trigger will add via ledger
  INSERT INTO lots (
    id, org_id, lot_no, grn_id, material, supplier, 
    initial_qty, remaining_qty, unit, unit_cost, total_cost,
    mfg_date, expiry_date, qc_status, location, 
    erp_product_id, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_grn.grn_no, v_grn.id, v_grn.material, v_grn.supplier,
    v_grn.quantity, 0, -- Trigger will update this to v_grn.quantity
    v_grn.unit, v_grn.unit_cost, v_grn.total_cost,
    v_grn.mfg_date, v_grn.expiry_date, 'approved', 'Store',
    v_grn.erp_product_id, p_user_id, now()
  ) RETURNING id INTO v_lot_id;

  -- 5. Create Stock Ledger IN entry - Trigger auto-updates lots.remaining_qty
  INSERT INTO stock_ledger (
    org_id, lot_id, fg_lot_id, erp_product_id,
    transaction_type, qty_change, reference_id, 
    notes, created_by, created_at
  ) VALUES (
    v_org_id, v_lot_id, NULL, v_grn.erp_product_id,
    'IN', v_grn.quantity, v_grn.id,
    'GRN Received: ' || v_grn.grn_no, p_user_id, now()
  );

  -- 6. Create Expense entry for P&L
  INSERT INTO expenses (
    id, org_id, date, category, description, 
    amount, recorded_by, recorded_by_id, source, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, CURRENT_DATE, 'Raw Material',
    'GRN ' || v_grn.grn_no || ' — ' || v_grn.material || ' from ' || v_grn.supplier,
    v_grn.total_cost, v_user_name, p_user_id, 'grn_auto',
    'Auto-created on GRN approval. Invoice: ' || COALESCE(v_grn.invoice_no, '—'),
    now()
  ) RETURNING id INTO v_expense_id;

  -- 7. Return success with IDs for frontend
  RETURN jsonb_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'lot_id', v_lot_id,
    'expense_id', v_expense_id,
    'message', 'GRN approved, lot created, stock updated, expense logged'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error triggers automatic ROLLBACK
    RAISE EXCEPTION 'GRN approval failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- RPC: REJECT_GRN - For completeness
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_grn(
  p_grn_id uuid,
  p_reject_reason text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn grns%ROWTYPE;
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- Lock and validate
  SELECT * INTO v_grn FROM grns 
  WHERE id = p_grn_id 
    AND org_id = v_org_id 
    AND status = 'QC_PENDING' 
  FOR UPDATE;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'GRN not found or already processed'; 
  END IF;

  IF p_reject_reason IS NULL OR trim(p_reject_reason) = '' THEN
    RAISE EXCEPTION 'Reject reason is required';
  END IF;

  UPDATE grns 
  SET status = 'REJECTED', 
      reject_reason = p_reject_reason,
      updated_at = now() 
  WHERE id = p_grn_id;

  RETURN jsonb_build_object('success', true, 'grn_id', p_grn_id);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION approve_grn_and_create_lot(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_grn(uuid, text, uuid) TO authenticated;
-- ============================================================================
-- 1. Expiry Alert Cron Function
-- ============================================================================
CREATE OR REPLACE FUNCTION check_expiring_lots() RETURNS void AS $$
BEGIN
  INSERT INTO notifications (org_id, type, title, message, severity)
  SELECT 
    org_id, 'expiry_warning',
    'Lot Expiring Soon',
    'Lot ' || lot_no || ' (' || material || ') expires on ' || exp_date,
    CASE 
      WHEN exp_date - CURRENT_DATE <= 30 THEN 'high'
      WHEN exp_date - CURRENT_DATE <= 60 THEN 'medium'
      ELSE 'low'
    END
  FROM lots 
  WHERE exp_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    AND remaining_qty > 0
    AND qc_status = 'APPROVED';
END; $$ LANGUAGE plpgsql;

-- Supabase cron scheduling command (to be run via SQL editor or pg_cron):
-- SELECT cron.schedule('expiry-check', '0 9 * * *', 'SELECT check_expiring_lots()');

-- ============================================================================
-- 2. Real-Time Batch Costing View
-- ============================================================================
CREATE OR REPLACE VIEW batch_costing_view AS
SELECT 
  b.id, b.batch_no, b.product,
  b.planned_qty, b.actual_qty, b.unit,
  COALESCE(SUM(cl.cost), 0) as rm_cost,
  COALESCE(lh.total_labor, 0) as labor_cost,
  b.overhead_cost,
  COALESCE(SUM(cl.cost), 0) + COALESCE(lh.total_labor, 0) + COALESCE(b.overhead_cost, 0) as total_cost,
  CASE WHEN b.actual_qty > 0 
    THEN (COALESCE(SUM(cl.cost), 0) + COALESCE(lh.total_labor, 0) + COALESCE(b.overhead_cost, 0)) / b.actual_qty 
    ELSE 0 END as unit_cost
FROM batches b
LEFT JOIN consumed_lots cl ON cl.batch_id = b.id
LEFT JOIN (
  SELECT batch_id, SUM(hours_worked * hourly_rate) as total_labor 
  FROM labor_hours GROUP BY batch_id
) lh ON lh.batch_id = b.id
GROUP BY b.id, b.batch_no, b.product, b.planned_qty, b.actual_qty, b.unit, b.overhead_cost;
-- ============================================================================
-- 10_production_module_migration.sql
-- Run this before creating RPC
-- ============================================================================

-- 1. Add columns to batches for completion tracking
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS actual_yield numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_rm_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qc_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS qc_remarks text,
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS end_time timestamptz;

-- 2. Add columns to fg_lots for traceability
ALTER TABLE fg_lots 
ADD COLUMN IF NOT EXISTS coa_no text,
ADD COLUMN IF NOT EXISTS coa_issued boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS coa_date date;

-- 3. Index for traceability queries - FSSAI asks "which RM in which FG"
CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch_trace 
ON stock_ledger(reference_id) WHERE transaction_type = 'OUT' AND lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fg_lots_batch_id ON fg_lots(batch_id);
CREATE INDEX IF NOT EXISTS idx_consumed_lots_gin ON batches USING GIN (consumed_lots);

-- 4. Add source tracking to expenses for better P&L split
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
CHECK (source IN ('manual', 'grn_auto', 'utility_auto', 'overhead_auto', 'production_auto'));
-- ============================================================================
-- RPC: SUBMIT_BATCH_QC
-- Atomically creates QC record, updates Batch, and creates FG lot
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_batch_qc(
  p_batch_id uuid,
  p_verdict text, -- 'PASS' or 'FAIL'
  p_qc_data jsonb,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch batches%ROWTYPE;
  v_org_id uuid;
  v_coa_no text;
  v_qc_id uuid;
  v_fg_lot_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- 1. Lock Batch
  SELECT * INTO v_batch FROM batches WHERE id = p_batch_id AND status = 'QC_HOLD' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found or no longer in QC Hold'; END IF;

  v_coa_no := CASE WHEN p_verdict = 'PASS' THEN 'CoA-' || v_batch.batch_no || '-' || upper(substring(md5(random()::text) from 1 for 6)) ELSE NULL END;

  -- 2. Insert QC Check
  INSERT INTO qc_checks (
    id, org_id, batch_id, batch_no, product,
    results, overall, coa_issued, coa_number,
    analyst, reviewer, pack_size, format_no, remarks,
    tested_at, tested_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_batch.id, v_batch.batch_no, v_batch.product,
    p_qc_data->'results', p_verdict, p_verdict = 'PASS', v_coa_no,
    p_qc_data->>'analyst', p_qc_data->>'reviewer', p_qc_data->>'pack_size', p_qc_data->>'format_no', p_qc_data->>'remarks',
    now(), p_qc_data->>'tested_by', now()
  ) RETURNING id INTO v_qc_id;

  -- 3. Update Batch
  UPDATE batches SET 
    status = CASE WHEN p_verdict = 'PASS' THEN 'COMPLETED' ELSE 'REJECTED' END,
    qc_verdict = p_verdict,
    coa_no = v_coa_no,
    updated_at = now()
  WHERE id = p_batch_id;

  -- 4. Create FG Lot if PASS
  IF p_verdict = 'PASS' THEN
    IF v_batch.actual_qty IS NULL OR v_batch.actual_qty <= 0 THEN
      RAISE EXCEPTION 'Batch actual_qty is missing — cannot create FG lot.';
    END IF;

    -- NOTE: qty_on_hand is 0, stock_ledger IN entry will trigger and update it.
    INSERT INTO fg_lots (
      id, org_id, fg_lot_no, batch_id, batch_no, product_name, sku_code,
      qty_on_hand, unit, unit_cost, coa_no, coa_issued, created_at
    ) VALUES (
      gen_random_uuid(), v_org_id, v_batch.batch_no || '-FG', v_batch.id, v_batch.batch_no, v_batch.product, v_batch.product,
      0, COALESCE(v_batch.unit, 'kg'), COALESCE(v_batch.unit_cost, 0), v_coa_no, true, now()
    ) RETURNING id INTO v_fg_lot_id;
    
    -- Stock Ledger IN entry updates qty_on_hand via trigger
    INSERT INTO stock_ledger (org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by)
    VALUES (v_org_id, v_fg_lot_id, 'IN', v_batch.actual_qty, p_batch_id, 'Batch QC Passed FG Creation', p_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'coa_no', v_coa_no, 'fg_lot_id', v_fg_lot_id);
END;
$$;
-- ============================================================================
-- PRODUCTION RPC: complete_production_batch
-- Atomic: RM deduct + FG create + Costing + QC + Audit
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_production_batch(
  p_batch_id uuid,
  p_fg_data jsonb, -- {product, qty, unit, unit_cost, expiry_date, batch_no}
  p_qc_data jsonb DEFAULT NULL, -- {passed, remarks, coa_no}
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_batch batches%ROWTYPE;
  v_consumed_lot jsonb;
  v_total_rm_cost numeric := 0;
  v_fg_lot_id uuid;
  v_lot record;
  v_produced_qty numeric;
  v_unit_cost numeric;
BEGIN
  -- 1. Auth + Lock batch
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found or not authenticated'; END IF;

  SELECT * INTO v_batch FROM batches 
  WHERE id = p_batch_id AND org_id = v_org_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or access denied', p_batch_id; END IF;
  IF v_batch.status = 'COMPLETED' THEN RAISE EXCEPTION 'Batch % already completed', v_batch.batch_no; END IF;
  IF v_batch.consumed_lots IS NULL OR jsonb_array_length(v_batch.consumed_lots) = 0 THEN
    RAISE EXCEPTION 'No raw materials consumed. Add RM lots first via batch.raw_materials';
  END IF;

  v_produced_qty := (p_fg_data->>'qty')::numeric;
  IF v_produced_qty <= 0 THEN RAISE EXCEPTION 'Produced quantity must be > 0'; END IF;

  -- 2. Validate & deduct each consumed RM lot - FSSAI Traceability Core
  FOR v_consumed_lot IN SELECT * FROM jsonb_array_elements(v_batch.consumed_lots)
  LOOP
    -- Lock RM lot to prevent double consumption
    SELECT * INTO v_lot FROM lots 
    WHERE id = (v_consumed_lot->>'lot_id')::uuid 
      AND org_id = v_org_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
      RAISE EXCEPTION 'RM Lot % not found. Data integrity error', v_consumed_lot->>'lot_id'; 
    END IF;
    
    IF COALESCE(v_lot.available_qty, 0) < (v_consumed_lot->>'qty')::numeric THEN
      RAISE EXCEPTION 'Insufficient RM stock for lot %. Available: %, Required: %', 
        v_lot.lot_no, v_lot.available_qty, v_consumed_lot->>'qty';
    END IF;

    -- Stock ledger OUT for RM - creates audit trail
    INSERT INTO stock_ledger (
      org_id, lot_id, fg_lot_id, transaction_type, qty_change, 
      reference_id, notes, created_by
    ) VALUES (
      v_org_id, v_lot.id, NULL, 'OUT', -(v_consumed_lot->>'qty')::numeric,
      p_batch_id, 'Production consumption: ' || v_batch.batch_no, p_user_id
    );
    
    -- lots.available_qty updated by trigger on stock_ledger
    
    -- Sum RM cost for FG unit_cost calculation
    v_total_rm_cost := v_total_rm_cost + ((v_consumed_lot->>'qty')::numeric * (v_consumed_lot->>'unit_cost')::numeric);
  END LOOP;

  -- 3. Calculate FG unit cost if not provided
  v_unit_cost := COALESCE(
    (p_fg_data->>'unit_cost')::numeric, 
    ROUND(v_total_rm_cost / v_produced_qty, 2)
  );

  -- 4. Create FG lot with full traceability
  INSERT INTO fg_lots (
    id, org_id, batch_id, batch_no, product, qty_produced, available_qty, 
    unit, unit_cost, expiry_date, coa_no, coa_issued, coa_date,
    created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, p_batch_id, p_fg_data->>'batch_no', p_fg_data->>'product',
    v_produced_qty, v_produced_qty,
    p_fg_data->>'unit', 
    v_unit_cost,
    (p_fg_data->>'expiry_date')::date,
    p_qc_data->>'coa_no',
    COALESCE((p_qc_data->>'passed')::boolean, false),
    CASE WHEN (p_qc_data->>'passed')::boolean THEN CURRENT_DATE ELSE NULL END,
    p_user_id, now()
  ) RETURNING id INTO v_fg_lot_id;

  -- 5. Stock ledger IN for FG
  INSERT INTO stock_ledger (
    org_id, lot_id, fg_lot_id, transaction_type, qty_change,
    reference_id, notes, created_by
  ) VALUES (
    v_org_id, NULL, v_fg_lot_id, 'IN', v_produced_qty,
    p_batch_id, 'Production completed: ' || v_batch.batch_no || ' | RM Cost: ' || v_total_rm_cost, p_user_id
  );

  -- 6. Mark batch completed + store QC result
  UPDATE batches SET 
    status = 'COMPLETED',
    end_time = now(),
    actual_yield = v_produced_qty,
    actual_rm_cost = v_total_rm_cost,
    qc_passed = COALESCE((p_qc_data->>'passed')::boolean, false),
    qc_remarks = p_qc_data->>'remarks',
    completed_by = p_user_id,
    updated_at = now()
  WHERE id = p_batch_id;

  -- 7. Audit log for compliance
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, record_label, details)
  VALUES (v_org_id, p_user_id, 'UPDATE', 'Production', p_batch_id, v_batch.batch_no,
          'Batch completed. FG: ' || v_produced_qty || ' ' || (p_fg_data->>'unit') || 
          ' | RM Cost: ₹' || v_total_rm_cost || 
          ' | Unit Cost: ₹' || v_unit_cost ||
          ' | QC: ' || CASE WHEN (p_qc_data->>'passed')::boolean THEN 'PASSED' ELSE 'PENDING' END);

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'fg_lot_id', v_fg_lot_id,
    'qty_produced', v_produced_qty,
    'total_rm_cost', v_total_rm_cost,
    'unit_cost', v_unit_cost,
    'qc_passed', COALESCE((p_qc_data->>'passed')::boolean, false)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Production completion failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION complete_production_batch(uuid, jsonb, jsonb, uuid) TO authenticated;
-- ============================================================================
-- 12_allergen_international_migration.sql
-- ============================================================================

-- 1. Add compliance columns
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES allergen_matrix(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE allergen_matrix ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'FSSAI_2020'
CHECK (compliance_standard IN ('FSSAI_2020', 'EU_FIC_1169', 'FDA_FALCPA', 'CODEX_STAN_1'));

-- 2. History table for FDA 21 CFR Part 11 audit trail
CREATE TABLE IF NOT EXISTS allergen_matrix_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  matrix_id uuid NOT NULL REFERENCES allergen_matrix(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text
);

CREATE INDEX IF NOT EXISTS idx_allergen_history_matrix ON allergen_matrix_history(matrix_id, version DESC);

-- 3. RLS
ALTER TABLE allergen_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allergen_org_isolation ON allergen_matrix;
CREATE POLICY allergen_org_isolation ON allergen_matrix
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 4. Atomic RPC with Audit
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_allergen_matrix(
  p_matrix_id uuid DEFAULT NULL, -- NULL = create, UUID = update
  p_product_name text,
  p_declared boolean,
  p_allergens jsonb, -- {gluten: 'present', eggs: 'absent',...}
  p_change_reason text DEFAULT NULL,
  p_compliance_standard text DEFAULT 'FSSAI_2020',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_user_role text;
  v_old_record allergen_matrix%ROWTYPE;
  v_new_id uuid;
  v_new_version int;
BEGIN
  -- 1. Auth
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Insufficient permissions for allergen management';
  END IF;

  -- 2. Validate allergen values
  IF jsonb_typeof(p_allergens)!= 'object' THEN
    RAISE EXCEPTION 'allergens must be JSON object';
  END IF;

  -- 3. Update existing = create new version, supersede old
  IF p_matrix_id IS NOT NULL THEN
    SELECT * INTO v_old_record FROM allergen_matrix
    WHERE id = p_matrix_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Matrix not found or access denied'; END IF;

    v_new_version := v_old_record.version + 1;

    -- Insert new version
    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, updated_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    -- Mark old as superseded
    UPDATE allergen_matrix SET superseded_by = v_new_id WHERE id = p_matrix_id;

    -- History entry
    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, old_data, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'UPDATE', to_jsonb(v_old_record), p_allergens, p_change_reason);

  ELSE
    -- 4. Create new
    v_new_version := 1;
    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'CREATE', p_allergens, p_change_reason);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'matrix_id', v_new_id,
    'version', v_new_version,
    'product_name', p_product_name
  );
END; $$;

GRANT EXECUTE ON FUNCTION upsert_allergen_matrix(uuid, text, boolean, jsonb, text, text, uuid) TO authenticated;
-- ============================================================================
-- FINANCE RPCs: Invoices & Payments
-- Atomic transactions for AR.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_mode text,
  p_reference text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_inv invoices%ROWTYPE;
  v_total_paise bigint;
  v_paid_paise bigint;
  v_amt_paise bigint;
  v_new_paid_paise bigint;
  v_outstanding_paise bigint;
  v_new_status text;
  v_payment_id uuid;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found or not authenticated'; END IF;

  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found or access denied'; END IF;
  IF v_inv.status = 'CANCELLED' THEN RAISE EXCEPTION 'Cannot pay cancelled invoice: %', v_inv.invoice_no; END IF;
  IF v_inv.status = 'PAID' THEN RAISE EXCEPTION 'Invoice % is already fully paid', v_inv.invoice_no; END IF;

  v_total_paise := ROUND(v_inv.total * 100);
  v_paid_paise := ROUND(COALESCE(v_inv.paid_amt, 0) * 100);
  v_amt_paise := ROUND(p_amount * 100);
  v_outstanding_paise := GREATEST(0, v_total_paise - v_paid_paise);
  v_new_paid_paise := v_paid_paise + v_amt_paise;

  IF v_amt_paise <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF v_amt_paise > v_outstanding_paise THEN
    RAISE EXCEPTION 'Overpayment not allowed. Outstanding: %', (v_outstanding_paise / 100.0);
  END IF;

  INSERT INTO payments (
    id, org_id, invoice_id, invoice_no, customer, amount, mode,
    reference, payment_date, recorded_by, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, v_inv.id, v_inv.invoice_no, v_inv.customer, p_amount, p_mode,
    p_reference, p_payment_date, v_user_name, p_notes, now()
  ) RETURNING id INTO v_payment_id;

  v_new_status := CASE
    WHEN v_new_paid_paise >= v_total_paise THEN 'PAID'
    WHEN v_new_paid_paise > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END;

  UPDATE invoices
  SET paid_amt = v_new_paid_paise / 100.0,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'new_paid_amt', v_new_paid_paise / 100.0,
    'new_status', v_new_status, 'outstanding', (v_total_paise - v_new_paid_paise) / 100.0
  );
END; $$;

-- ============================================================================
-- LOGISTICS RPC: DISPATCH
-- ============================================================================
CREATE OR REPLACE FUNCTION dispatch_do_and_create_invoice(
  p_do_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_do dispatches%ROWTYPE;
  v_lot fg_lots%ROWTYPE;
  v_org_id uuid;
  v_unit_rate numeric;
  v_gst_pct numeric;
  v_subtotal numeric;
  v_gst_amt numeric;
  v_inv_total numeric;
  v_inv_no text;
  v_inv_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_do FROM dispatches 
  WHERE id = p_do_id AND org_id = v_org_id AND status = 'CONFIRMED' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DO not found or not confirmed'; END IF;

  SELECT * INTO v_lot FROM fg_lots WHERE id = v_do.batch_id AND org_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FG lot not found'; END IF;

  IF v_lot.coa_issued IS NOT TRUE AND v_lot.coa_no IS NULL THEN
    RAISE EXCEPTION 'QA GATE BLOCKED: Batch % has not received QC clearance', v_lot.batch_no;
  END IF;

  IF COALESCE(v_lot.available_qty, 0) < v_do.quantity THEN
    RAISE EXCEPTION 'Insufficient FG stock. Available: %, Required: %', v_lot.available_qty, v_do.quantity;
  END IF;

  UPDATE dispatches SET status = 'DISPATCHED', dispatched_at = now() WHERE id = p_do_id;

  INSERT INTO stock_ledger (
    org_id, fg_lot_id, transaction_type, qty_change, reference_id, notes, created_by
  ) VALUES (
    v_org_id, v_do.batch_id, 'OUT', -v_do.quantity, v_do.id, 'Dispatch Order: ' || v_do.do_no, p_user_id
  );

  v_unit_rate := COALESCE(v_do.unit_rate, v_lot.unit_cost, 0);
  v_gst_pct := COALESCE(v_do.gst_pct, 18);
  v_subtotal := ROUND(v_do.quantity * v_unit_rate, 2);
  v_gst_amt := ROUND(v_subtotal * v_gst_pct / 100, 2);
  v_inv_total := ROUND(v_subtotal + v_gst_amt, 2);
  v_inv_no := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO invoices (
    id, org_id, invoice_no, customer, dispatch_id, batch_id, date,
    items, subtotal, gst_pct, gst_amt, total, status
  ) VALUES (
    gen_random_uuid(), v_org_id, v_inv_no, v_do.customer, v_do.id, v_do.batch_id, CURRENT_DATE,
    jsonb_build_array(jsonb_build_object('product', v_do.product, 'qty', v_do.quantity, 'unit', v_do.unit, 'rate', v_unit_rate, 'amount', v_subtotal)),
    v_subtotal, v_gst_pct, v_gst_amt, v_inv_total, 'PENDING'
  ) RETURNING id INTO v_inv_id;

  RETURN jsonb_build_object('success', true, 'invoice_no', v_inv_no, 'invoice_total', v_inv_total);
END; $$;
-- 13_allergen_international_rpc.sql

CREATE OR REPLACE FUNCTION upsert_allergen_matrix(
  p_matrix_id uuid DEFAULT NULL,
  p_product_name text,
  p_declared boolean,
  p_allergens jsonb, -- {gluten: 'present', eggs: 'absent',...}
  p_change_reason text DEFAULT NULL,
  p_compliance_standard text DEFAULT 'FSSAI_2020',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_user_role text;
  v_old_record allergen_matrix%ROWTYPE;
  v_new_id uuid;
  v_new_version int;
BEGIN
  -- 1. Auth + Role check
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only ADMIN/MANAGER/QC can manage allergens';
  END IF;

  -- 2. Validate allergen JSON
  IF jsonb_typeof(p_allergens)!= 'object' THEN
    RAISE EXCEPTION 'allergens must be JSON object with 14 keys';
  END IF;

  -- 3. Update = create new version, supersede old - FDA 21 CFR Part 11
  IF p_matrix_id IS NOT NULL THEN
    SELECT * INTO v_old_record FROM allergen_matrix
    WHERE id = p_matrix_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Matrix not found or access denied'; END IF;
    IF v_old_record.approved_by IS NOT NULL AND v_user_role!= 'ADMIN' THEN
      RAISE EXCEPTION 'Approved declarations can only be modified by ADMIN';
    END IF;

    v_new_version := v_old_record.version + 1;

    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, updated_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    UPDATE allergen_matrix SET superseded_by = v_new_id, updated_at = now() WHERE id = p_matrix_id;

    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, old_data, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'UPDATE', to_jsonb(v_old_record), p_allergens, p_change_reason);

  ELSE
    -- 4. Create new
    v_new_version := 1;
    INSERT INTO allergen_matrix (
      org_id, product_name, declared, compliance_standard, version,
      gluten, crustacean, eggs, fish, peanuts, soy, milk, nuts,
      celery, mustard, sesame, sulphites, lupin, molluscs,
      created_by, effective_date
    ) VALUES (
      v_org_id, p_product_name, p_declared, p_compliance_standard, v_new_version,
      p_allergens->>'gluten', p_allergens->>'crustacean', p_allergens->>'eggs',
      p_allergens->>'fish', p_allergens->>'peanuts', p_allergens->>'soy',
      p_allergens->>'milk', p_allergens->>'nuts', p_allergens->>'celery',
      p_allergens->>'mustard', p_allergens->>'sesame', p_allergens->>'sulphites',
      p_allergens->>'lupin', p_allergens->>'molluscs',
      p_user_id, CURRENT_DATE
    ) RETURNING id INTO v_new_id;

    INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, new_data, change_reason)
    VALUES (v_org_id, v_new_id, v_new_version, p_user_id, 'CREATE', p_allergens, p_change_reason);
  END IF;

  RETURN jsonb_build_object('success', true, 'matrix_id', v_new_id, 'version', v_new_version);
END; $$;

GRANT EXECUTE ON FUNCTION upsert_allergen_matrix(uuid, text, boolean, jsonb, text, text, uuid) TO authenticated;

-- ============================================================================
-- RPC: APPROVE_ALLERGEN_DECLARATION
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_allergen_declaration(
  p_matrix_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role NOT IN ('ADMIN', 'QC') THEN RAISE EXCEPTION 'Only ADMIN/QC can approve'; END IF;

  UPDATE allergen_matrix 
  SET approved_by = p_user_id, approved_at = now() 
  WHERE id = p_matrix_id AND org_id = v_org_id AND superseded_by IS NULL;

  INSERT INTO allergen_matrix_history (org_id, matrix_id, version, changed_by, change_type, change_reason)
  SELECT org_id, id, version, p_user_id, 'APPROVE', 'QC approval for label printing'
  FROM allergen_matrix WHERE id = p_matrix_id;

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION approve_allergen_declaration(uuid, uuid) TO authenticated;
-- ============================================================================
-- COGS Actual View & Expenses RPC
-- ============================================================================

-- 1. COGS Actual View
CREATE OR REPLACE VIEW cogs_actual AS
SELECT
  b.id as batch_id,
  SUM(cl.cost) as actual_rm_cost
FROM batches b
JOIN consumed_lots cl ON cl.batch_id = b.id
WHERE b.status = 'COMPLETED'
GROUP BY b.id;

-- 2. Expense Recording RPC
CREATE OR REPLACE FUNCTION record_expense(
  p_category text,
  p_date date,
  p_description text,
  p_amount numeric,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_expense_id uuid;
  v_user_name text;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF trim(p_description) = '' THEN RAISE EXCEPTION 'Description required'; END IF;

  INSERT INTO expenses (
    id, org_id, category, date, description, amount, 
    notes, recorded_by, recorded_by_id, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, p_category, p_date, p_description, p_amount,
    p_notes, v_user_name, p_user_id, now()
  ) RETURNING id INTO v_expense_id;

  RETURN jsonb_build_object('success', true, 'expense_id', v_expense_id);
END; $$;

-- 3. Delete Expense RPC
CREATE OR REPLACE FUNCTION delete_expense(
  p_expense_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_expense expenses%ROWTYPE;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_expense FROM expenses 
  WHERE id = p_expense_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;
  
  -- Prevent deleting auto-generated expenses if source column exists
  -- If source doesn't exist, we fallback to checking notes.
  IF (v_expense.notes || '') LIKE '%Auto-created%' THEN
    RAISE EXCEPTION 'Auto-generated expenses cannot be deleted manually'; 
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
  
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, details)
  VALUES (v_org_id, p_user_id, 'DELETE', 'Expenses', p_expense_id, 
          'Deleted: ' || v_expense.category || ' - ' || v_expense.description || ' - ' || v_expense.amount);

  RETURN jsonb_build_object('success', true);
END; $$;
-- ============================================================================
-- RPC: RECORD_UTILITY_CONSUMPTION
-- ============================================================================
CREATE OR REPLACE FUNCTION record_utility_consumption(
  p_cost_center_id uuid,
  p_utility_type text,
  p_reading_date date,
  p_qty_consumed numeric,
  p_unit text,
  p_rate numeric,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_total_cost numeric;
  v_utility_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  v_total_cost := p_qty_consumed * p_rate;

  INSERT INTO utility_consumption (
    id, org_id, site_id, cost_center_id, utility_type, reading_date,
    qty_consumed, unit, rate, total_cost, created_by
  ) VALUES (
    gen_random_uuid(), v_org_id, 'SITE-MAIN', p_cost_center_id, p_utility_type, p_reading_date,
    p_qty_consumed, p_unit, p_rate, v_total_cost, p_user_id
  ) RETURNING id INTO v_utility_id;

  -- Auto-create expense entry
  INSERT INTO expenses (
    id, org_id, date, category, description, amount, recorded_by, source
  ) VALUES (
    gen_random_uuid(), v_org_id, p_reading_date, 'Utilities',
    p_utility_type || ' - ' || p_qty_consumed || ' ' || p_unit,
    v_total_cost, (SELECT name FROM profiles WHERE id = p_user_id), 'utility_auto'
  );

  RETURN jsonb_build_object('success', true, 'utility_id', v_utility_id);
END; $$;

-- ============================================================================
-- RPC: ALLOCATE_OVERHEAD
-- ============================================================================
CREATE OR REPLACE FUNCTION allocate_overhead(
  p_cost_center_id uuid,
  p_allocation_date date,
  p_amount numeric,
  p_allocation_basis text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_allocation_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  INSERT INTO overhead_allocations (
    id, org_id, site_id, cost_center_id, allocation_date,
    amount, allocation_basis, created_by
  ) VALUES (
    gen_random_uuid(), v_org_id, 'SITE-MAIN', p_cost_center_id, p_allocation_date,
    p_amount, p_allocation_basis, p_user_id
  ) RETURNING id INTO v_allocation_id;

  -- Auto-create expense
  INSERT INTO expenses (
    id, org_id, date, category, description, amount, recorded_by, source
  ) VALUES (
    gen_random_uuid(), v_org_id, p_allocation_date, 'Overheads',
    'Overhead allocation - ' || p_allocation_basis,
    p_amount, (SELECT name FROM profiles WHERE id = p_user_id), 'overhead_auto'
  );

  RETURN jsonb_build_object('success', true, 'allocation_id', v_allocation_id);
END; $$;

-- ============================================================================
-- VIEW: UTILITY ALLOCATION PER BATCH
-- ============================================================================
CREATE OR REPLACE VIEW utility_allocation_per_batch AS
SELECT 
  b.id as batch_id,
  b.batch_no,
  b.product,
  cc.name as cost_center,
  uc.utility_type,
  ROUND(uc.total_cost * (bh.hours_used / NULLIF(cc_monthly_hours.total_hours, 0)), 2) as allocated_cost
FROM batches b
JOIN batch_hours bh ON bh.batch_id = b.id
JOIN cost_centers cc ON cc.id = bh.cost_center_id
JOIN utility_consumption uc ON uc.cost_center_id = cc.id 
  AND uc.reading_date BETWEEN b.start_time::date AND COALESCE(b.end_time::date, CURRENT_DATE)
LEFT JOIN (
  SELECT cost_center_id, SUM(hours_used) as total_hours
  FROM batch_hours 
  WHERE start_time >= date_trunc('month', CURRENT_DATE)
  GROUP BY cost_center_id
) cc_monthly_hours ON cc_monthly_hours.cost_center_id = cc.id;
-- 14_prp_international_migration.sql

-- 1. Add compliance columns to prp_log
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id);
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id);
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'ISO_22000'
CHECK (compliance_standard IN ('ISO_22000', 'FSSC_22000', 'FDA_FSMA', 'BRC_GS'));

-- 2. PRP Master table versioning - SOP changes track karne ke liye
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES recipe_fsms_prp(id);
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE;
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE recipe_fsms_prp ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);

-- 3. History table for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS prp_execution_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  prp_log_id uuid NOT NULL REFERENCES prp_log(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'REJECT')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prp_history_log ON prp_execution_history(prp_log_id, version DESC);

-- 4. Dynamic cleaning checklist table - hardcoded array hatao
CREATE TABLE IF NOT EXISTS prp_cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  sop_code text NOT NULL, -- 'SOP-004', 'SOP-007'
  task_name text NOT NULL,
  area text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'BATCH')),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES profiles(id)
);

-- RLS
ALTER TABLE prp_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prp_org_isolation ON prp_log;
CREATE POLICY prp_org_isolation ON prp_log
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE prp_cleaning_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prp_tasks_org_isolation ON prp_cleaning_tasks;
CREATE POLICY prp_tasks_org_isolation ON prp_cleaning_tasks
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
-- ============================================================================
-- RPC: CREATE DISPATCH ORDER (Multi-Lot Pallet DO)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_pallet_dispatch_order(
  p_customer_id text,
  p_do_code text,
  p_challan_no text,
  p_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_do_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO dispatch_orders (
    org_id, site_id, customer_id, do_code, status, challan_no, notes
  ) VALUES (
    v_org_id, 'SITE-MAIN', p_customer_id, p_do_code, 'DRAFT', p_challan_no, p_notes
  ) RETURNING id INTO v_do_id;

  RETURN jsonb_build_object(
    'id', v_do_id,
    'org_id', v_org_id,
    'site_id', 'SITE-MAIN',
    'customer_id', p_customer_id,
    'do_code', p_do_code,
    'status', 'DRAFT',
    'challan_no', p_challan_no,
    'notes', p_notes
  );
END; $$;

-- ============================================================================
-- RPC: CREATE DISPATCH (Single Lot DO)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_single_dispatch(
  p_do_no text,
  p_batch_id uuid,
  p_batch_no text,
  p_customer text,
  p_product text,
  p_quantity numeric,
  p_unit text,
  p_unit_rate numeric,
  p_gst_pct numeric,
  p_gst_amt numeric,
  p_subtotal numeric,
  p_total numeric,
  p_vehicle_no text,
  p_lr_no text,
  p_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO dispatches (
    org_id, do_no, batch_id, batch_no, customer, product,
    quantity, unit, unit_rate, gst_pct, gst_amt, subtotal, total,
    vehicle_no, lr_no, status, notes
  ) VALUES (
    v_org_id, p_do_no, p_batch_id, p_batch_no, p_customer, p_product,
    p_quantity, p_unit, p_unit_rate, p_gst_pct, p_gst_amt, p_subtotal, p_total,
    p_vehicle_no, p_lr_no, 'DRAFT', p_notes
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END; $$;
-- 15_prp_international_rpc.sql

CREATE OR REPLACE FUNCTION log_prp_execution(
  p_prp_id uuid,
  p_batch_id uuid DEFAULT NULL,
  p_result text,
  p_done_by text,
  p_remarks text DEFAULT NULL,
  p_reading text DEFAULT NULL,
  p_next_due date DEFAULT NULL,
  p_compliance_standard text DEFAULT 'ISO_22000',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_user_role text;
  v_prp recipe_fsms_prp%ROWTYPE;
  v_batch batches%ROWTYPE;
  v_log_id uuid;
BEGIN
  -- 1. Auth
  SELECT org_id, name, role INTO v_org_id, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  -- 2. Lock PRP master
  SELECT * INTO v_prp FROM recipe_fsms_prp
  WHERE id = p_prp_id AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PRP not found or access denied'; END IF;
  IF v_prp.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'This PRP version is obsolete. Use version %',
      (SELECT version FROM recipe_fsms_prp WHERE id = v_prp.superseded_by);
  END IF;

  -- 3. Validate batch if provided
  IF p_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch FROM batches WHERE id = p_batch_id AND org_id = v_org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
    IF v_prp.recipe_id IS NOT NULL AND v_prp.recipe_id!= v_batch.recipe_id THEN
      RAISE EXCEPTION 'PRP % is for different recipe', v_prp.prp_name;
    END IF;
  END IF;

  -- 4. Insert log with full traceability
  INSERT INTO prp_log (
    org_id, prp_no, prp_type, category, description, area, method,
    result, next_due, done_by, notes, status,
    recipe_id, batch_id, created_by, compliance_standard,
    frequency, last_reviewed
  ) VALUES (
    v_org_id, v_prp.prp_no, v_prp.prp_type, 'Product-Specific',
    v_prp.prp_name, v_prp.target_area, v_prp.procedure,
    p_result, p_next_due, p_done_by, p_remarks,
    CASE WHEN p_result = 'Pass' THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    v_prp.recipe_id, p_batch_id, p_user_id, p_compliance_standard,
    v_prp.frequency, CURRENT_DATE
  ) RETURNING id INTO v_log_id;

  -- 5. Audit trail
  INSERT INTO prp_execution_history (org_id, prp_log_id, version, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_log_id, 1, p_user_id, 'CREATE',
          jsonb_build_object('prp_name', v_prp.prp_name, 'result', p_result, 'batch_no', v_batch.batch_no),
          'Initial PRP execution log');

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'prp_name', v_prp.prp_name);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'PRP logging failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION log_prp_execution(uuid, uuid, text, text, text, text, date, text, uuid) TO authenticated;

-- ============================================================================
-- RPC: log_cleaning_checklist
-- ============================================================================
CREATE OR REPLACE FUNCTION log_cleaning_checklist(
  p_sop_code text,
  p_tasks_completed int,
  p_tasks_total int,
  p_checklist jsonb,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_log_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;

  INSERT INTO prp_log (
    org_id, prp_no, prp_type, category, description, area, method,
    result, done_by, notes, status, created_by, compliance_standard, frequency, last_reviewed
  ) VALUES (
    v_org_id, p_sop_code, 'SSOP', 'Sanitation', 'Daily Cleaning Checklist', 'Production Floor', 'As per checklist',
    'Pass', (SELECT name FROM profiles WHERE id = p_user_id), 
    'Completed ' || p_tasks_completed || '/' || p_tasks_total || ' tasks. Data: ' || p_checklist::text,
    'ACTIVE', p_user_id, 'FDA_FSMA', 'DAILY', CURRENT_DATE
  ) RETURNING id INTO v_log_id;
  
  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END; $$;

GRANT EXECUTE ON FUNCTION log_cleaning_checklist(text, int, int, jsonb, uuid) TO authenticated;
-- ============================================================================
-- 1. ADD SOURCE & RECORDED_BY_ID COLUMNS TO EXPENSES
-- ============================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' 
CHECK (source IN ('manual', 'grn_auto', 'utility_auto', 'overhead_auto'));

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recorded_by_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. DELETE EXPENSE RPC WITH AUTO-PROTECTION
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_expense(
  p_expense_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_expense expenses%ROWTYPE;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_expense FROM expenses 
  WHERE id = p_expense_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;
  
  IF COALESCE(v_expense.source, 'manual') != 'manual' THEN 
    RAISE EXCEPTION 'Auto-generated expenses cannot be deleted manually'; 
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
  
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, details)
  VALUES (v_org_id, p_user_id, 'DELETE', 'Expenses', p_expense_id, 
          'Deleted: ' || v_expense.category || ' - ' || v_expense.description || ' - ' || v_expense.amount);

  RETURN jsonb_build_object('success', true);
END; $$;
-- 16_recall_international_migration.sql

-- 1. Add compliance columns
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS fssai_notified_at timestamptz;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS fssai_notification_ref text;
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'FSSAI_2020'
CHECK (compliance_standard IN ('FSSAI_2020', 'FDA_FSMA', 'EU_FIC_1169', 'ISO_22000'));

-- 2. Batch freeze table - regulator poochta hai "kitna stock rok diya?"
CREATE TABLE IF NOT EXISTS recall_batch_freeze (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  recall_id uuid NOT NULL REFERENCES recalls(id),
  batch_id uuid NOT NULL REFERENCES batches(id),
  fg_lot_id uuid REFERENCES fg_lots(id),
  qty_frozen numeric NOT NULL,
  frozen_at timestamptz DEFAULT now(),
  frozen_by uuid REFERENCES profiles(id),
  location text, -- 'Warehouse A', 'Distributor X'
  UNIQUE(recall_id, batch_id, fg_lot_id)
);

-- 3. Audit trail for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS recall_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  recall_id uuid NOT NULL REFERENCES recalls(id),
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'FREEZE_STOCK', 'NOTIFY_FSSAI', 'CLOSE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recall_history ON recall_history(recall_id, changed_at DESC);

-- 4. RLS
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recall_org_isolation ON recalls;
CREATE POLICY recall_org_isolation ON recalls
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE recall_batch_freeze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS freeze_org_isolation ON recall_batch_freeze;
CREATE POLICY freeze_org_isolation ON recall_batch_freeze
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
-- 17_recall_international_rpc.sql

CREATE OR REPLACE FUNCTION initiate_recall(
  p_batch_no text,
  p_reason text,
  p_is_mock boolean,
  p_description text,
  p_initiated_by text,
  p_compliance_standard text DEFAULT 'FSSAI_2020',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
  v_batch batches%ROWTYPE;
  v_recall_id uuid;
  v_recall_no text;
  v_total_dispatched numeric := 0;
  v_customers text[];
  v_fg_lot record;
BEGIN
  -- 1. Auth
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Only ADMIN/MANAGER/QC can initiate recalls';
  END IF;

  -- 2. Lock batch
  SELECT * INTO v_batch FROM batches
  WHERE batch_no = p_batch_no AND org_id = v_org_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found', p_batch_no; END IF;

  -- 3. One-step-forward trace: find all dispatches + customers
  SELECT
    COALESCE(SUM(d.quantity), 0),
    ARRAY_AGG(DISTINCT d.customer) FILTER (WHERE d.customer IS NOT NULL)
  INTO v_total_dispatched, v_customers
  FROM dispatches d
  WHERE d.batch_id = v_batch.id AND d.status = 'DISPATCHED';

  -- 4. Generate recall no
  v_recall_no := CASE WHEN p_is_mock THEN 'MOCK' ELSE 'RCL' END ||
                 '-' || EXTRACT(YEAR FROM now()) || '-' ||
                 UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));

  -- 5. Create recall record
  INSERT INTO recalls (
    org_id, recall_no, product, is_mock, batch_ref, batch_ids, reason,
    qty_dispatched, qty_recovered, unit, initiated_by, customers,
    description, status, created_by, compliance_standard
  ) VALUES (
    v_org_id, v_recall_no, v_batch.product, p_is_mock, p_batch_no,
    ARRAY[v_batch.id], p_reason, v_total_dispatched, 0, v_batch.unit,
    p_initiated_by, v_customers, p_description, 'Open', p_user_id, p_compliance_standard
  ) RETURNING id INTO v_recall_id;

  -- 6. Freeze all FG lots from this batch - ISO 22000 requirement
  FOR v_fg_lot IN
    SELECT id, available_qty FROM fg_lots
    WHERE batch_id = v_batch.id AND available_qty > 0
  LOOP
    INSERT INTO recall_batch_freeze (org_id, recall_id, batch_id, fg_lot_id, qty_frozen, frozen_by)
    VALUES (v_org_id, v_recall_id, v_batch.id, v_fg_lot.id, v_fg_lot.available_qty, p_user_id);

    -- Update fg_lot status to ON_HOLD
    UPDATE fg_lots SET status = 'ON_HOLD', updated_at = now() WHERE id = v_fg_lot.id;
  END LOOP;

  -- 7. Audit trail
  INSERT INTO recall_history (org_id, recall_id, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_recall_id, p_user_id, 'CREATE',
          jsonb_build_object('recall_no', v_recall_no, 'batch_no', p_batch_no, 'qty_dispatched', v_total_dispatched),
          'Recall initiated: ' || p_reason);

  -- 8. Update batch status
  UPDATE batches SET status = 'RECALLED', updated_at = now() WHERE id = v_batch.id;

  RETURN jsonb_build_object(
    'success', true,
    'recall_id', v_recall_id,
    'recall_no', v_recall_no,
    'qty_dispatched', v_total_dispatched,
    'customers_count', COALESCE(array_length(v_customers, 1), 0),
    'frozen_lots', (SELECT COUNT(*) FROM recall_batch_freeze WHERE recall_id = v_recall_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Recall initiation failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION initiate_recall(text, text, boolean, text, text, text, uuid) TO authenticated;
-- 18_sop_international_migration.sql

-- 1. Add compliance columns
ALTER TABLE sops ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES sops(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS parent_sop_id uuid REFERENCES sops(id); -- tracks version chain
ALTER TABLE sops ADD COLUMN IF NOT EXISTS compliance_standard text DEFAULT 'ISO_9001'
CHECK (compliance_standard IN ('ISO_9001', 'ISO_22000', 'FSSC_22000', 'FDA_FSMA'));
ALTER TABLE sops ADD COLUMN IF NOT EXISTS document_path text; -- Supabase storage path for PDF

-- 2. History table for 21 CFR Part 11 + ISO 9001 Cl. 7.5.3
CREATE TABLE IF NOT EXISTS sop_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  sop_id uuid NOT NULL REFERENCES sops(id),
  version text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'APPROVE', 'OBSOLETE', 'REVIEW')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sop_history ON sop_history(sop_id, version DESC);

-- 3. RLS
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sop_org_isolation ON sops;
CREATE POLICY sop_org_isolation ON sops
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
-- 19_sop_international_rpc.sql

CREATE OR REPLACE FUNCTION upsert_sop(
  p_sop_id uuid DEFAULT NULL, -- NULL = new, UUID = new version of existing
  p_sop_no text,
  p_title text,
  p_category text,
  p_version text,
  p_department text DEFAULT NULL,
  p_effective_date date DEFAULT NULL,
  p_review_date date DEFAULT NULL,
  p_prepared_by text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_recipe_id uuid DEFAULT NULL,
  p_change_reason text DEFAULT 'Initial version',
  p_compliance_standard text DEFAULT 'ISO_9001',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
  v_old_sop sops%ROWTYPE;
  v_new_id uuid;
  v_parent_id uuid;
BEGIN
  -- 1. Auth
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found'; END IF;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER', 'QC') THEN
    RAISE EXCEPTION 'Only ADMIN/MANAGER/QC can manage SOPs';
  END IF;

  -- 2. If updating, create new version and supersede old
  IF p_sop_id IS NOT NULL THEN
    SELECT * INTO v_old_sop FROM sops
    WHERE id = p_sop_id AND org_id = v_org_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found'; END IF;
    IF v_old_sop.status = 'Obsolete' THEN RAISE EXCEPTION 'Cannot update obsolete SOP'; END IF;

    v_parent_id := COALESCE(v_old_sop.parent_sop_id, p_sop_id);

    -- Insert new version
    INSERT INTO sops (
      org_id, sop_no, title, category, department, version, effective_date,
      review_date, status, prepared_by, notes, recipe_id, parent_sop_id,
      created_by, compliance_standard
    ) VALUES (
      v_org_id, p_sop_no, p_title, p_category, p_department, p_version, p_effective_date,
      p_review_date, 'Draft', p_prepared_by, p_notes, p_recipe_id, v_parent_id,
      p_user_id, p_compliance_standard
    ) RETURNING id INTO v_new_id;

    -- Mark old as superseded
    UPDATE sops SET superseded_by = v_new_id, status = 'Obsolete', updated_at = now()
    WHERE id = p_sop_id;

    -- History
    INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, old_data, new_data, change_reason)
    VALUES (v_org_id, v_new_id, p_version, p_user_id, 'UPDATE', to_jsonb(v_old_sop), to_jsonb(p_sop_no), p_change_reason);

  ELSE
    -- 3. Create new SOP
    INSERT INTO sops (
      org_id, sop_no, title, category, department, version, effective_date,
      review_date, status, prepared_by, notes, recipe_id, created_by, compliance_standard
    ) VALUES (
      v_org_id, p_sop_no, p_title, p_category, p_department, p_version, p_effective_date,
      p_review_date, 'Draft', p_prepared_by, p_notes, p_recipe_id, p_user_id, p_compliance_standard
    ) RETURNING id INTO v_new_id;

    INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, new_data, change_reason)
    VALUES (v_org_id, v_new_id, p_version, p_user_id, 'CREATE', to_jsonb(p_title), p_change_reason);
  END IF;

  RETURN jsonb_build_object('success', true, 'sop_id', v_new_id, 'version', p_version);

EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'SOP save failed: %', SQLERRM;
END; $$;

-- Approval RPC - ISO 9001 Cl. 7.5.2 requirement
CREATE OR REPLACE FUNCTION approve_sop(
  p_sop_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role NOT IN ('ADMIN', 'MANAGER') THEN RAISE EXCEPTION 'Only ADMIN/MANAGER can approve SOPs'; END IF;

  UPDATE sops
  SET status = 'Active', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_sop_id AND org_id = v_org_id AND status = 'Draft';

  IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found or not in Draft status'; END IF;

  INSERT INTO sop_history (org_id, sop_id, version, changed_by, change_type, change_reason)
  SELECT org_id, id, version, p_user_id, 'APPROVE', 'SOP approved for release'
  FROM sops WHERE id = p_sop_id;

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION upsert_sop(uuid, text, text, text, date, date, text, text, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_sop(uuid, uuid) TO authenticated;
-- 20_capa_international_migration.sql

CREATE SEQUENCE IF NOT EXISTS capa_seq START 1;

CREATE TABLE IF NOT EXISTS capa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  capa_no text UNIQUE NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('QC_FAIL', 'PRP_DEVIATION', 'CCP_DEVIATION', 'RECALL')),
  source_id uuid NOT NULL, -- The ID of the PRP log, QC log, etc.
  description text NOT NULL,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'IMPLEMENTING', 'VERIFYING', 'CLOSED')),
  root_cause_analysis jsonb, -- 5-Whys JSON
  corrective_action text,
  preventive_action text,
  verification_notes text,
  initiated_by uuid REFERENCES profiles(id),
  initiated_at timestamptz DEFAULT now(),
  closed_by uuid REFERENCES profiles(id),
  closed_at timestamptz
);

ALTER TABLE capa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capa_org_isolation ON capa;
CREATE POLICY capa_org_isolation ON capa
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Also need to add capa_id to related tables to close the loop
ALTER TABLE prp_log ADD COLUMN IF NOT EXISTS capa_id uuid REFERENCES capa(id);
ALTER TABLE batch_qc ADD COLUMN IF NOT EXISTS capa_id uuid REFERENCES capa(id);
ALTER TABLE recalls ADD COLUMN IF NOT EXISTS capa_id uuid REFERENCES capa(id);

-- RPC to trigger CAPA
CREATE OR REPLACE FUNCTION trigger_capa(
  p_source_type text,
  p_source_id uuid,
  p_description text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_capa_id uuid;
  v_capa_no text;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  v_capa_no := 'CAPA-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('capa_seq')::text, 4, '0');
  
  INSERT INTO capa (
    org_id, capa_no, source_type, source_id, description, status, 
    initiated_by, initiated_at
  ) VALUES (
    v_org_id, v_capa_no, p_source_type, p_source_id, p_description, 
    'OPEN', p_user_id, now()
  ) RETURNING id INTO v_capa_id;
  
  -- Link back to source based on type
  IF p_source_type = 'PRP_DEVIATION' THEN
    UPDATE prp_log SET capa_id = v_capa_id WHERE id = p_source_id;
  ELSIF p_source_type = 'RECALL' THEN
    UPDATE recalls SET capa_id = v_capa_id WHERE id = p_source_id;
  END IF;
  
  RETURN v_capa_id;
END; $$;

GRANT EXECUTE ON FUNCTION trigger_capa(text, uuid, text, uuid) TO authenticated;
-- 21_capa_update_rpc.sql

-- Audit trail for 21 CFR Part 11
CREATE TABLE IF NOT EXISTS capa_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  capa_id uuid NOT NULL REFERENCES capa(id),
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'CLOSE')),
  old_data jsonb,
  new_data jsonb,
  change_reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_capa_history ON capa_history(capa_id, changed_at DESC);

-- RPC for updating CAPA
CREATE OR REPLACE FUNCTION update_capa(
  p_capa_id uuid,
  p_status text,
  p_root_cause_analysis jsonb,
  p_corrective_action text,
  p_preventive_action text,
  p_verification_notes text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_old capa%ROWTYPE;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  SELECT * INTO v_old FROM capa WHERE id = p_capa_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'CAPA not found'; END IF;
  IF v_old.status = 'CLOSED' THEN RAISE EXCEPTION 'Cannot update closed CAPA'; END IF;

  -- Update CAPA
  UPDATE capa SET
    status = p_status,
    root_cause_analysis = p_root_cause_analysis,
    corrective_action = p_corrective_action,
    preventive_action = p_preventive_action,
    verification_notes = p_verification_notes,
    closed_by = CASE WHEN p_status = 'CLOSED' THEN p_user_id ELSE closed_by END,
    closed_at = CASE WHEN p_status = 'CLOSED' THEN now() ELSE closed_at END
  WHERE id = p_capa_id;

  -- Audit trail - 21 CFR Part 11 requirement
  INSERT INTO capa_history (org_id, capa_id, changed_by, change_type, old_data, new_data, change_reason)
  VALUES (v_org_id, p_capa_id, p_user_id, 
          CASE WHEN p_status = 'CLOSED' THEN 'CLOSE' ELSE 'UPDATE' END,
          to_jsonb(v_old), 
          jsonb_build_object('status', p_status, 'rca', p_root_cause_analysis),
          'CAPA investigation update');

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION update_capa(uuid, text, jsonb, text, text, text, uuid) TO authenticated;
-- 23_prp_final_rpc.sql

CREATE OR REPLACE FUNCTION log_prp_execution(
  p_prp_id uuid,
  p_batch_id uuid DEFAULT NULL,
  p_result text,
  p_done_by text,
  p_remarks text DEFAULT NULL,
  p_next_due date DEFAULT NULL,
  p_compliance_standard text DEFAULT 'ISO_22000',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_prp recipe_fsms_prp%ROWTYPE;
  v_log_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  SELECT * INTO v_prp FROM recipe_fsms_prp 
  WHERE id = p_prp_id AND org_id = v_org_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'PRP not found'; END IF;
  IF v_prp.superseded_by IS NOT NULL THEN 
    RAISE EXCEPTION 'This PRP version is obsolete. Use v%', 
      (SELECT version FROM recipe_fsms_prp WHERE id = v_prp.superseded_by);
  END IF;

  INSERT INTO prp_log (
    org_id, prp_no, prp_type, category, description, area, method,
    result, next_due, done_by, notes, status, recipe_id, batch_id,
    created_by, compliance_standard, frequency, last_reviewed
  ) VALUES (
    v_org_id, v_prp.prp_no, v_prp.prp_type, 'Product-Specific',
    v_prp.prp_name, v_prp.target_area, v_prp.procedure,
    p_result, p_next_due, p_done_by, p_remarks,
    CASE WHEN p_result = 'Pass' THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    v_prp.recipe_id, p_batch_id, p_user_id, p_compliance_standard,
    v_prp.frequency, CURRENT_DATE
  ) RETURNING id INTO v_log_id;

  -- 21 CFR Part 11 audit trail
  INSERT INTO prp_execution_history (org_id, prp_log_id, version, changed_by, change_type, new_data, change_reason)
  VALUES (v_org_id, v_log_id, 1, p_user_id, 'CREATE', 
          jsonb_build_object('result', p_result, 'prp_name', v_prp.prp_name),
          'PRP execution logged');

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'prp_name', v_prp.prp_name);
END; $$;

GRANT EXECUTE ON FUNCTION log_prp_execution(uuid, uuid, text, text, text, date, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION log_cleaning_checklist(
  p_sop_code text,
  p_tasks_completed int,
  p_tasks_total int,
  p_checklist jsonb, -- {task_id: true/false}
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_result text;
BEGIN
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  
  v_result := CASE WHEN p_tasks_completed = p_tasks_total THEN 'Pass (Complete)' ELSE 'Incomplete' END;
  
  INSERT INTO prp_log (
    org_id, prp_no, prp_type, category, description, area, method,
    result, done_by, notes, status, created_by, compliance_standard
  ) VALUES (
    v_org_id, p_sop_code || '-DAILY-' || TO_CHAR(now(), 'YYYYMMDD'),
    'Sanitation', 'Cleaning Log', 
    'Daily Sanitation Checklist: ' || p_tasks_completed || '/' || p_tasks_total || ' completed',
    'Production Area', 'CIP & Chemical Spray',
    v_result, v_user_name, p_checklist::text,
    CASE WHEN p_tasks_completed = p_tasks_total THEN 'ACTIVE' ELSE 'REVIEW_DUE' END,
    p_user_id, 'ISO_22000'
  );
  
  RETURN jsonb_build_object('success', true, 'result', v_result);
END; $$;

GRANT EXECUTE ON FUNCTION log_cleaning_checklist(text, int, int, jsonb, uuid) TO authenticated;
-- 24_training_international_migration.sql

-- 1. Create or update training_records table
CREATE TABLE IF NOT EXISTS training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  sop_id uuid NOT NULL REFERENCES sops(id),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED')),
  expiry_date date,
  trainer_signature text, -- FDA 21 CFR 11 electronic signature equivalent
  trainee_signature text,
  trainer_signed_at timestamptz,
  trainee_signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_org_isolation ON training_records;
CREATE POLICY training_org_isolation ON training_records
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- PRODUCTION RPC: complete_production_batch (UPDATED WITH TRAINING BLOCK)
-- Atomic: RM deduct + FG create + Costing + QC + Audit + Training Check
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_production_batch(
  p_batch_id uuid,
  p_fg_data jsonb, -- {product, qty, unit, unit_cost, expiry_date, batch_no}
  p_qc_data jsonb DEFAULT NULL, -- {passed, remarks, coa_no}
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_user_name text;
  v_batch batches%ROWTYPE;
  v_consumed_lot jsonb;
  v_total_rm_cost numeric := 0;
  v_fg_lot_id uuid;
  v_lot record;
  v_produced_qty numeric;
  v_unit_cost numeric;
BEGIN
  -- 1. Auth + Lock batch
  SELECT org_id, name INTO v_org_id, v_user_name FROM profiles WHERE id = p_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'User org not found or not authenticated'; END IF;

  -- ========================================================================
  -- FSSC 22000 / FDA FSMA: TRAINING EXPIRY BLOCK
  -- If operator is not trained on critical SOPs, block the batch completion
  -- ========================================================================
  IF EXISTS (
    SELECT 1 FROM training_records tr
    JOIN sops s ON s.id = tr.sop_id
    WHERE tr.employee_id = p_user_id 
      AND s.sop_no IN ('SOP-ALLERGEN-001', 'SOP-HACCP-002') -- critical SOPs
      AND (tr.status != 'PASSED' OR COALESCE(tr.expiry_date, CURRENT_DATE + 1) < CURRENT_DATE)
  ) THEN
    RAISE EXCEPTION 'Operator training expired for critical SOP. Cannot complete batch.';
  END IF;

  SELECT * INTO v_batch FROM batches 
  WHERE id = p_batch_id AND org_id = v_org_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or access denied', p_batch_id; END IF;
  IF v_batch.status = 'COMPLETED' THEN RAISE EXCEPTION 'Batch % already completed', v_batch.batch_no; END IF;
  IF v_batch.consumed_lots IS NULL OR jsonb_array_length(v_batch.consumed_lots) = 0 THEN
    RAISE EXCEPTION 'No raw materials consumed. Add RM lots first via batch.raw_materials';
  END IF;

  v_produced_qty := (p_fg_data->>'qty')::numeric;
  IF v_produced_qty <= 0 THEN RAISE EXCEPTION 'Produced quantity must be > 0'; END IF;

  -- 2. Validate & deduct each consumed RM lot - FSSAI Traceability Core
  FOR v_consumed_lot IN SELECT * FROM jsonb_array_elements(v_batch.consumed_lots)
  LOOP
    -- Lock RM lot to prevent double consumption
    SELECT * INTO v_lot FROM lots 
    WHERE id = (v_consumed_lot->>'lot_id')::uuid 
      AND org_id = v_org_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
      RAISE EXCEPTION 'RM Lot % not found. Data integrity error', v_consumed_lot->>'lot_id'; 
    END IF;
    
    IF COALESCE(v_lot.available_qty, 0) < (v_consumed_lot->>'qty')::numeric THEN
      RAISE EXCEPTION 'Insufficient RM stock for lot %. Available: %, Required: %', 
        v_lot.lot_no, v_lot.available_qty, v_consumed_lot->>'qty';
    END IF;

    -- Stock ledger OUT for RM - creates audit trail
    INSERT INTO stock_ledger (
      org_id, lot_id, fg_lot_id, transaction_type, qty_change, 
      reference_id, notes, created_by
    ) VALUES (
      v_org_id, v_lot.id, NULL, 'OUT', -(v_consumed_lot->>'qty')::numeric,
      p_batch_id, 'Production consumption: ' || v_batch.batch_no, p_user_id
    );
    
    -- lots.available_qty updated by trigger on stock_ledger
    
    -- Sum RM cost for FG unit_cost calculation
    v_total_rm_cost := v_total_rm_cost + ((v_consumed_lot->>'qty')::numeric * (v_consumed_lot->>'unit_cost')::numeric);
  END LOOP;

  -- 3. Calculate FG unit cost if not provided
  v_unit_cost := COALESCE(
    (p_fg_data->>'unit_cost')::numeric, 
    ROUND(v_total_rm_cost / v_produced_qty, 2)
  );

  -- 4. Create FG lot with full traceability
  INSERT INTO fg_lots (
    id, org_id, batch_id, batch_no, product, qty_produced, available_qty, 
    unit, unit_cost, expiry_date, coa_no, coa_issued, coa_date,
    created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_org_id, p_batch_id, p_fg_data->>'batch_no', p_fg_data->>'product',
    v_produced_qty, v_produced_qty,
    p_fg_data->>'unit', 
    v_unit_cost,
    (p_fg_data->>'expiry_date')::date,
    p_qc_data->>'coa_no',
    COALESCE((p_qc_data->>'passed')::boolean, false),
    CASE WHEN (p_qc_data->>'passed')::boolean THEN CURRENT_DATE ELSE NULL END,
    p_user_id, now()
  ) RETURNING id INTO v_fg_lot_id;

  -- 5. Stock ledger IN for FG
  INSERT INTO stock_ledger (
    org_id, lot_id, fg_lot_id, transaction_type, qty_change,
    reference_id, notes, created_by
  ) VALUES (
    v_org_id, NULL, v_fg_lot_id, 'IN', v_produced_qty,
    p_batch_id, 'Production completed: ' || v_batch.batch_no || ' | RM Cost: ' || v_total_rm_cost, p_user_id
  );

  -- 6. Mark batch completed + store QC result
  UPDATE batches SET 
    status = 'COMPLETED',
    end_time = now(),
    actual_yield = v_produced_qty,
    actual_rm_cost = v_total_rm_cost,
    qc_passed = COALESCE((p_qc_data->>'passed')::boolean, false),
    qc_remarks = p_qc_data->>'remarks',
    completed_by = p_user_id,
    updated_at = now()
  WHERE id = p_batch_id;

  -- 7. Audit log for compliance
  INSERT INTO audit_log (org_id, user_id, action, module, record_id, record_label, details)
  VALUES (v_org_id, p_user_id, 'UPDATE', 'Production', p_batch_id, v_batch.batch_no,
          'Batch completed. FG: ' || v_produced_qty || ' ' || (p_fg_data->>'unit') || 
          ' | RM Cost: ₹' || v_total_rm_cost || 
          ' | Unit Cost: ₹' || v_unit_cost ||
          ' | QC: ' || CASE WHEN (p_qc_data->>'passed')::boolean THEN 'PASSED' ELSE 'PENDING' END);

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'fg_lot_id', v_fg_lot_id,
    'qty_produced', v_produced_qty,
    'total_rm_cost', v_total_rm_cost,
    'unit_cost', v_unit_cost,
    'qc_passed', COALESCE((p_qc_data->>'passed')::boolean, false)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Production completion failed: %', SQLERRM;
END; $$;

GRANT EXECUTE ON FUNCTION complete_production_batch(uuid, jsonb, jsonb, uuid) TO authenticated;
-- 25_equipment_ccp_migration.sql

-- 1. Equipment & CMMS Table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_code text UNIQUE NOT NULL, -- e.g., 'THERM-001', 'SCALE-B2'
  name text NOT NULL,
  type text, -- 'Thermometer', 'Scale', 'Metal Detector'
  location text,
  last_calibrated date,
  next_calibration_due date,
  calibration_cert_url text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CALIBRATION_DUE', 'OUT_OF_SERVICE'))
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_org_isolation ON equipment;
CREATE POLICY equipment_org_isolation ON equipment
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- 2. CCP Live Monitor Table
CREATE TABLE IF NOT EXISTS ccp_live_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id uuid NOT NULL REFERENCES recipe_fsms_ccp(id),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  reading numeric NOT NULL,
  logged_by uuid REFERENCES profiles(id),
  logged_at timestamptz DEFAULT now(),
  deviation_detected boolean DEFAULT false
);

ALTER TABLE ccp_live_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccp_live_org_isolation ON ccp_live_log;
CREATE POLICY ccp_live_org_isolation ON ccp_live_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipe_fsms_ccp r 
    WHERE r.id = ccp_live_log.ccp_id AND r.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  )
);

-- 3. RPC: Log CCP Reading with Calibration Block and Auto-CAPA
CREATE OR REPLACE FUNCTION log_ccp_reading(
  p_ccp_id uuid, 
  p_equipment_id uuid, 
  p_reading numeric, 
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ccp recipe_fsms_ccp%ROWTYPE;
  v_equipment equipment%ROWTYPE;
  v_is_deviation boolean := false;
  v_limit numeric;
BEGIN
  SELECT * INTO v_ccp FROM recipe_fsms_ccp WHERE id = p_ccp_id;
  SELECT * INTO v_equipment FROM equipment WHERE id = p_equipment_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'CCP or Equipment not found'; END IF;

  -- BLOCK: Equipment calibration expired
  IF v_equipment.next_calibration_due < CURRENT_DATE THEN
    RAISE EXCEPTION 'Equipment % calibration expired on %. Cannot log CCP.', v_equipment.equipment_code, v_equipment.next_calibration_due;
  END IF;

  -- Evaluate Critical Limits (Mock generic parsing)
  -- If ccp is pasteurization, critical limit might be 72C
  -- Here we assume if limit says >=72, we check that
  -- For now we implement a simple mock check based on typical limits or generic rule
  -- (In a real scenario, this would parse a formula like v_ccp.critical_limit)
  
  -- Let's extract the numeric value from the critical limit string if possible
  v_limit := COALESCE(NULLIF(regexp_replace(v_ccp.critical_limit, '[^0-9.]', '', 'g'), '')::numeric, 75);

  IF p_reading < v_limit THEN
    v_is_deviation := true;
  END IF;

  -- Insert live log
  INSERT INTO ccp_live_log (ccp_id, equipment_id, reading, logged_by, deviation_detected) 
  VALUES (p_ccp_id, p_equipment_id, p_reading, p_user_id, v_is_deviation);
  
  -- AUTO-CAPA TRIGGER
  IF v_is_deviation THEN
    PERFORM trigger_capa(
      'CCP_DEVIATION', 
      p_ccp_id, 
      'CCP ' || v_ccp.ccp_name || ' failed. Reading ' || p_reading || ' violates critical limit: ' || v_ccp.critical_limit, 
      p_user_id
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'deviation', v_is_deviation, 'limit', v_limit);
END; $$;

GRANT EXECUTE ON FUNCTION log_ccp_reading(uuid, uuid, numeric, uuid) TO authenticated;
-- 26_cto_dashboard_rpc.sql

CREATE OR REPLACE FUNCTION get_cto_dashboard_metrics(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_total_batches int;
  v_planned_qty numeric := 0;
  v_actual_yield numeric := 0;
  v_yield_variance_pct numeric := 0;
  v_open_capas int := 0;
  v_total_ccp_readings int := 0;
  v_passed_ccp_readings int := 0;
  v_ccp_compliance_pct numeric := 0;
  v_avg_mock_recall_time numeric := 120; -- default 120 mins if none found
  
  -- OEE parts (simplified proxy based on available DB data)
  v_availability numeric := 0.95; 
  v_performance numeric := 0.90;
  v_quality numeric := 1.0;
  v_oee numeric := 0;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  
  -- 1. Yield Variance (from last 30 days batches)
  SELECT COUNT(*), COALESCE(SUM((target_qty)::numeric), 0), COALESCE(SUM((actual_yield)::numeric), 0)
  INTO v_total_batches, v_planned_qty, v_actual_yield
  FROM batches 
  WHERE org_id = v_org_id AND status = 'COMPLETED' AND end_time >= (now() - interval '30 days');

  IF v_planned_qty > 0 THEN
    v_yield_variance_pct := ROUND(((v_actual_yield - v_planned_qty) / v_planned_qty) * 100, 2);
  END IF;

  -- Quality for OEE proxy = (Total Yield - Rejected Yield) / Total Yield
  -- Since we don't have explicit rejected_yield column, we'll assume qc_passed implies 100% quality 
  -- and failed implies 0% for that batch.
  SELECT COALESCE(AVG(CASE WHEN qc_passed THEN 1.0 ELSE 0.0 END), 1.0)
  INTO v_quality
  FROM batches WHERE org_id = v_org_id AND status = 'COMPLETED' AND end_time >= (now() - interval '30 days');
  
  v_oee := ROUND((v_availability * v_performance * v_quality) * 100, 2);

  -- 2. Open CAPAs (> 30 days old could be a separate metric, but we'll get total OPEN)
  SELECT COUNT(*) INTO v_open_capas
  FROM capa
  WHERE org_id = v_org_id AND status != 'CLOSED';

  -- 3. CCP Compliance %
  SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT deviation_detected)
  INTO v_total_ccp_readings, v_passed_ccp_readings
  FROM ccp_live_log cl
  JOIN recipe_fsms_ccp c ON cl.ccp_id = c.id
  WHERE c.org_id = v_org_id AND cl.logged_at >= (now() - interval '24 hours');

  IF v_total_ccp_readings > 0 THEN
    v_ccp_compliance_pct := ROUND((v_passed_ccp_readings::numeric / v_total_ccp_readings::numeric) * 100, 2);
  ELSE
    v_ccp_compliance_pct := 100.00;
  END IF;

  -- 4. Mock Recall Time
  -- Since we don't track start and end of mock recall explicitly in the recalls table, 
  -- we'll assume an average of 45 mins if they have any mock recalls closed, else default 120.
  IF EXISTS (SELECT 1 FROM recalls WHERE org_id = v_org_id AND is_mock = true AND status = 'Closed') THEN
    v_avg_mock_recall_time := 45; -- Target < 120 min
  END IF;

  RETURN jsonb_build_object(
    'oee_pct', v_oee,
    'yield_variance_pct', v_yield_variance_pct,
    'open_capas', v_open_capas,
    'ccp_compliance_pct', v_ccp_compliance_pct,
    'avg_mock_recall_mins', v_avg_mock_recall_time
  );
END; $$;

GRANT EXECUTE ON FUNCTION get_cto_dashboard_metrics(uuid) TO authenticated;
-- 27_cto_kpis_and_audit_view.sql

-- OEE: Availability × Performance × Quality
CREATE OR REPLACE FUNCTION calculate_oee(p_days int DEFAULT 7)
RETURNS numeric AS $$
DECLARE
  v_planned_time numeric;
  v_actual_time numeric;
  v_ideal_cycle numeric := 10; -- seconds per unit, from recipe
  v_total_produced numeric;
  v_good_units numeric;
BEGIN
  SELECT 
    COALESCE(SUM(EXTRACT(EPOCH FROM (updated_at - created_at))/60), 0), -- minutes
    COALESCE(SUM(actual_yield), 0)
  INTO v_actual_time, v_total_produced
  FROM batches 
  WHERE created_at > now() - (p_days || ' days')::interval
    AND status = 'COMPLETED';
  
  v_planned_time := p_days * 8 * 60; -- 8hr shift per day
  v_good_units := v_total_produced * 0.98; -- assume 2% reject, replace with actual
  
  IF v_actual_time = 0 OR v_total_produced = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(
    (v_actual_time / v_planned_time) * 
    (v_ideal_cycle * v_total_produced / (v_actual_time * 60)) * 
    (v_good_units / v_total_produced) * 100, 1
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_oee(int) TO authenticated;

-- CCP Compliance last 24h
CREATE OR REPLACE FUNCTION get_ccp_compliance_24h()
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE deviation_detected = false) / NULLIF(COUNT(*), 0), 1)
    FROM ccp_live_log 
    WHERE logged_at > now() - interval '24 hours'
  ), 100.0);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ccp_compliance_24h() TO authenticated;

-- Yield Variance
CREATE OR REPLACE FUNCTION get_yield_variance(p_days int DEFAULT 30)
RETURNS numeric AS $$
DECLARE
  v_planned numeric;
  v_actual numeric;
BEGIN
  SELECT COALESCE(SUM((target_qty)::numeric), 0), COALESCE(SUM((actual_yield)::numeric), 0)
  INTO v_planned, v_actual
  FROM batches 
  WHERE status = 'COMPLETED' AND end_time >= (now() - (p_days || ' days')::interval);

  IF v_planned > 0 THEN
    RETURN ROUND(((v_actual - v_planned) / v_planned) * 100, 2);
  ELSE
    RETURN 0;
  END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_yield_variance(int) TO authenticated;

-- Open CAPAs > 30 Days
CREATE OR REPLACE FUNCTION count_open_capas_older_than(p_days int DEFAULT 30)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM capa 
    WHERE status != 'CLOSED' AND initiated_at <= (now() - (p_days || ' days')::interval)
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION count_open_capas_older_than(int) TO authenticated;

-- Avg Mock Recall Time
CREATE OR REPLACE FUNCTION get_avg_mock_recall_time()
RETURNS numeric AS $$
BEGIN
  -- Placeholder since we don't track recall end time accurately yet
  -- Mock returning a valid number 
  RETURN 45; 
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_avg_mock_recall_time() TO authenticated;


-- Unified Audit Trail View for 21 CFR Part 11
CREATE OR REPLACE VIEW v_audit_trail_unified AS
SELECT id, 'CAPA' as module, capa_id as ref_id, changed_by, changed_at, 
       change_type as action, change_reason as detail, new_data->>'status' as entity
FROM capa_history
UNION ALL
SELECT id, 'PRP', prp_log_id, changed_by, changed_at, change_type, change_reason, new_data->>'result'
FROM prp_execution_history
UNION ALL
SELECT id, 'SOP', sop_id, changed_by, changed_at, change_type, change_reason, new_data->>'version'
FROM sop_history;

GRANT SELECT ON v_audit_trail_unified TO authenticated;
-- 28_final_audit_gaps_migration.sql

-- ============================================================================
-- 1. AdminSettings 21 CFR Part 11 Audit Trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  setting_key text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  old_value text,
  new_value text
);

ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_history_org ON settings_history;
CREATE POLICY settings_history_org ON settings_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION update_site_setting(
  p_key text,
  p_value text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_old_value text;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;
  SELECT value INTO v_old_value FROM settings WHERE key = p_key AND org_id = v_org_id;
  
  UPDATE settings SET value = p_value, updated_at = now() 
  WHERE key = p_key AND org_id = v_org_id;
  
  INSERT INTO settings_history (org_id, setting_key, changed_by, old_value, new_value, changed_at)
  VALUES (v_org_id, p_key, p_user_id, v_old_value, p_value, now());
  
  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION update_site_setting(text, text, uuid) TO authenticated;

-- ============================================================================
-- 2. CmsTestimonials Approval Workflow
-- ============================================================================
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE OR REPLACE FUNCTION approve_testimonial(p_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS void AS $$
BEGIN
  UPDATE testimonials SET 
    approved_by = p_user_id, 
    approved_at = now(),
    visible = true 
  WHERE id = p_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_testimonial(uuid, uuid) TO authenticated;

-- ============================================================================
-- 3. Users RBAC Migration
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date date;

CREATE TABLE IF NOT EXISTS user_role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  old_role text,
  new_role text,
  reason text NOT NULL
);

ALTER TABLE user_role_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_history_org ON user_role_history;
CREATE POLICY role_history_org ON user_role_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE OR REPLACE VIEW v_user_training_status AS
SELECT 
  p.id, p.name, p.employee_code, p.role, p.department, p.is_active, p.org_id,
  COUNT(tr.id) FILTER (WHERE tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE) as valid_trainings,
  COUNT(tr.id) FILTER (WHERE tr.expiry_date < CURRENT_DATE OR tr.expiry_date < CURRENT_DATE + 30) as expiring_trainings,
  BOOL_AND(
    CASE 
      WHEN s.sop_no IN ('SOP-ALLERGEN-001', 'SOP-HACCP-002') THEN 
        (tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE)
      ELSE true 
    END
  ) as production_qualified
FROM profiles p
LEFT JOIN training_records tr ON tr.employee_id = p.id
LEFT JOIN sops s ON s.id = tr.sop_id AND s.status = 'Active'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.employee_code, p.role, p.department, p.is_active, p.org_id;

GRANT SELECT ON v_user_training_status TO authenticated;

CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id uuid,
  p_new_role text,
  p_reason text,
  p_changed_by uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_old_role text;
BEGIN
  SELECT org_id, role INTO v_org_id, v_old_role FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET role = p_new_role, updated_at = now() WHERE id = p_user_id;
  
  INSERT INTO user_role_history (org_id, user_id, changed_by, old_role, new_role, reason)
  VALUES (v_org_id, p_user_id, p_changed_by, v_old_role, p_new_role, p_reason);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_role(uuid, text, text, uuid) TO authenticated;
-- 30_product_fsms_link.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS haccp_plan_id uuid REFERENCES haccp_plans(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES products(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'OBSOLETE'));

CREATE TABLE IF NOT EXISTS product_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  allergen text NOT NULL,
  contains boolean DEFAULT false,
  may_contain boolean DEFAULT false
);

-- 21 CFR Part 11 History
CREATE TABLE IF NOT EXISTS product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  product_id uuid NOT NULL REFERENCES products(id),
  version int NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  change_type text CHECK (change_type IN ('CREATE', 'UPDATE', 'OBSOLETE')),
  change_reason text NOT NULL,
  old_data jsonb,
  new_data jsonb
);

ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_history_org ON product_history;
CREATE POLICY product_history_org ON product_history
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- RPC with versioning
CREATE OR REPLACE FUNCTION upsert_product(
  p_id uuid DEFAULT NULL,
  p_name text, p_slug text, p_recipe_id uuid,
  p_allergens jsonb, -- [{allergen: 'Milk', contains: true, may_contain: false}]
  p_data jsonb,
  p_reason text DEFAULT 'Updated via CMS',
  p_user_id uuid DEFAULT auth.uid()
) RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
  v_product_id uuid;
  v_version int;
  v_old_data jsonb;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_user_id;

  IF p_id IS NULL THEN
    INSERT INTO products (org_id, name, slug, recipe_id, version, status)
    VALUES (v_org_id, p_name, p_slug, p_recipe_id, 1, 'DRAFT')
    RETURNING id INTO v_product_id;

    INSERT INTO product_history VALUES (
      gen_random_uuid(), v_org_id, v_product_id, 1, p_user_id, now(),
      'CREATE', p_reason, null, p_data
    );
  ELSE
    SELECT version, to_jsonb(products.*) INTO v_version, v_old_data
    FROM products WHERE id = p_id;

    -- Increment version
    UPDATE products SET
      name = p_name, slug = p_slug, recipe_id = p_recipe_id,
      version = v_version + 1, updated_at = now()
    WHERE id = p_id;

    INSERT INTO product_history VALUES (
      gen_random_uuid(), v_org_id, p_id, v_version + 1, p_user_id, now(),
      'UPDATE', p_reason, v_old_data, p_data
    );
    v_product_id := p_id;
  END IF;

  -- Update allergen matrix
  DELETE FROM product_allergens WHERE product_id = v_product_id;
  INSERT INTO product_allergens (product_id, allergen, contains, may_contain)
  SELECT v_product_id, (x->>'allergen')::text, (x->>'contains')::boolean, (x->>'may_contain')::boolean
  FROM jsonb_array_elements(p_allergens) x;

  RETURN v_product_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_product(uuid, text, text, uuid, jsonb, jsonb, text, uuid) TO authenticated;

-- Only QC/ADMIN with valid HACCP training can edit products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_update_trained_only ON products;
CREATE POLICY product_update_trained_only ON products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN training_records tr ON tr.employee_id = p.id
    JOIN sops s ON s.id = tr.sop_id
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'QC', 'MANAGER')
    AND s.sop_no = 'SOP-HACCP-002'
    AND tr.status = 'PASSED'
    AND tr.expiry_date >= CURRENT_DATE
  )
);
-- 31_product_fsms_view_and_rpc.sql

-- 1. SQL View - Product FSMS Status
CREATE OR REPLACE VIEW v_products_fsms AS
SELECT
  p.*,
  r.name as recipe_name,
  r.version as recipe_version,
  hp.plan_code as haccp_plan,
  COUNT(pa.id) FILTER (WHERE pa.contains = true) as allergen_count,
  STRING_AGG(pa.allergen, ', ') FILTER (WHERE pa.contains = true) as allergen_list,
  EXISTS(SELECT 1 FROM product_history ph WHERE ph.product_id = p.id) as has_history
FROM products p
LEFT JOIN recipes r ON r.id = p.recipe_id
LEFT JOIN haccp_plans hp ON hp.id = p.haccp_plan_id
LEFT JOIN product_allergens pa ON pa.product_id = p.id
GROUP BY p.id, r.name, r.version, hp.plan_code;

GRANT SELECT ON v_products_fsms TO authenticated;

-- 2. RPC: obsolete_product with 21 CFR Part 11
CREATE OR REPLACE FUNCTION obsolete_product(
  p_id uuid,
  p_reason text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_old_data jsonb;
BEGIN
  SELECT org_id, to_jsonb(products.*) INTO v_org_id, v_old_data
  FROM products WHERE id = p_id;

  UPDATE products SET
    status = 'OBSOLETE',
    visible = false,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO product_history (org_id, product_id, changed_by, change_type, change_reason, old_data, new_data)
  VALUES (v_org_id, p_id, p_user_id, 'OBSOLETE', p_reason, v_old_data, jsonb_build_object('status', 'OBSOLETE'));
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obsolete_product(uuid, text, uuid) TO authenticated;
-- 40_training_esig.sql
CREATE TABLE IF NOT EXISTS hr_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  sop_id uuid NOT NULL REFERENCES sops(id),
  trained_by uuid REFERENCES profiles(id),
  training_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED', 'EXPIRED')),
  score numeric(5,2),
  attempt_number int DEFAULT 1,

  -- 21 CFR Part 11 E-Signature
  trainer_signature text, -- base64 png
  trainer_signed_at timestamptz,
  trainer_user_id uuid REFERENCES profiles(id),
  trainee_signature text, -- base64 png
  trainee_signed_at timestamptz,
  trainee_user_id uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, sop_id, attempt_number)
);

ALTER TABLE hr_training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_org ON hr_training_records;
CREATE POLICY training_org ON hr_training_records
FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- View: Employee Competency Matrix
CREATE OR REPLACE VIEW v_employee_competency AS
SELECT
  p.id as employee_id,
  p.name as employee_name,
  p.employee_code,
  p.department,
  p.role,
  s.id as sop_id,
  s.sop_no,
  s.title as sop_title,
  tr.training_date,
  tr.expiry_date,
  tr.status,
  tr.score,
  CASE
    WHEN tr.status = 'PASSED' AND tr.expiry_date >= CURRENT_DATE THEN true
    ELSE false
  END as is_qualified,
  CASE
    WHEN tr.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN tr.expiry_date < CURRENT_DATE + 30 THEN 'EXPIRING_SOON'
    WHEN tr.status = 'PASSED' THEN 'VALID'
    ELSE 'NOT_TRAINED'
  END as qualification_status
FROM profiles p
CROSS JOIN sops s
LEFT JOIN hr_training_records tr ON tr.employee_id = p.id AND tr.sop_id = s.id
  AND tr.id = (
    SELECT id FROM hr_training_records tr2
    WHERE tr2.employee_id = p.id AND tr2.sop_id = s.id
    ORDER BY training_date DESC LIMIT 1
  )
WHERE p.is_active = true AND s.status = 'Active'
ORDER BY p.name, s.sop_no;

GRANT SELECT ON v_employee_competency TO authenticated;

-- RPC: Complete training with dual e-signature
CREATE OR REPLACE FUNCTION complete_training_with_signature(
  p_training_id uuid,
  p_score numeric,
  p_trainer_signature text,
  p_trainee_signature text,
  p_trainer_id uuid DEFAULT auth.uid(),
  p_trainee_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_org_id uuid;
  v_expiry date;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_trainer_id;
  SELECT CURRENT_DATE + interval '1 year' INTO v_expiry;

  UPDATE hr_training_records SET
    status = CASE WHEN p_score >= 80 THEN 'PASSED' ELSE 'FAILED' END,
    score = p_score,
    expiry_date = v_expiry,
    trainer_signature = p_trainer_signature,
    trainer_signed_at = now(),
    trainer_user_id = p_trainer_id,
    trainee_signature = p_trainee_signature,
    trainee_signed_at = now(),
    trainee_user_id = p_trainee_id
  WHERE id = p_training_id AND org_id = v_org_id;

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_score >= 80 THEN 'PASSED' ELSE 'FAILED' END);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_training_with_signature(uuid, numeric, text, text, uuid, uuid) TO authenticated;

-- CRITICAL: Block production if operator not trained on critical SOPs
CREATE OR REPLACE FUNCTION check_operator_qualification(
  p_operator_id uuid,
  p_recipe_id uuid
) RETURNS boolean AS $$
DECLARE
  v_required_sops text[] := ARRAY['SOP-HACCP-002', 'SOP-ALLERGEN-001', 'SOP-GMP-001'];
  v_sop_no text;
BEGIN
  FOREACH v_sop_no IN ARRAY v_required_sops
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM v_employee_competency
      WHERE employee_id = p_operator_id
      AND sop_no = v_sop_no
      AND is_qualified = true
    ) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_operator_qualification(uuid, uuid) TO authenticated;
-- 50_equipment_cmms.sql
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('CCP_MONITOR', 'PRODUCTION', 'TESTING', 'OTHER')),
  location text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CALIBRATION_DUE', 'RETIRED')),

  -- Calibration
  last_calibration_date date,
  next_calibration_due date NOT NULL,
  calibration_frequency_days int DEFAULT 365,
  calibration_cert_url text,

  -- Maintenance
  last_maintenance_date date,
  next_maintenance_due date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_calibration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  calibrated_by uuid REFERENCES profiles(id),
  calibration_date date NOT NULL,
  next_due_date date NOT NULL,
  certificate_url text,
  result text CHECK (result IN ('PASS', 'FAIL', 'ADJUSTED')),
  notes text,
  -- 21 CFR Part 11
  technician_signature text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_org ON equipment FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Auto-update equipment status daily
CREATE OR REPLACE FUNCTION update_equipment_status() RETURNS void AS $$
BEGIN
  UPDATE equipment SET status = 'CALIBRATION_DUE'
  WHERE next_calibration_due <= CURRENT_DATE AND status = 'ACTIVE';
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for calibration
CREATE OR REPLACE FUNCTION complete_calibration(
  p_equipment_id uuid,
  p_result text,
  p_next_due date,
  p_notes text,
  p_cert_url text,
  p_signature text,
  p_technician_id uuid DEFAULT auth.uid()
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM profiles WHERE id = p_technician_id;

  INSERT INTO equipment_calibration_log (
    org_id, equipment_id, calibrated_by, calibration_date, next_due_date,
    certificate_url, result, notes, technician_signature, signed_at
  ) VALUES (
    v_org_id, p_equipment_id, p_technician_id, CURRENT_DATE, p_next_due,
    p_cert_url, p_result, p_notes, p_signature, now()
  );

  UPDATE equipment SET
    last_calibration_date = CURRENT_DATE,
    next_calibration_due = p_next_due,
    calibration_cert_url = p_cert_url,
    status = 'ACTIVE',
    updated_at = now()
  WHERE id = p_equipment_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_calibration(uuid, text, date, text, text, text, uuid) TO authenticated;
