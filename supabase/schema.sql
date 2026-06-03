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
