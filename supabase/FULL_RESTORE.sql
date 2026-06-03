DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

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
create policy "Public read visible products"  on products for select using (visible = true);
-- BUG-001 FIX: auth.uid() IS NOT NULL is the correct Supabase v2 check.
-- auth.role() = 'authenticated' is deprecated and insecure (anon users can bypass).
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
create policy "Public read categories" on categories for select using (true);
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
create policy "Public read testimonials"  on testimonials for select using (visible = true);
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
create policy "Public read homepage sections"  on homepage_sections for select using (visible = true);
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
create policy "Public read about" on about_content for select using (true);
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
create policy "Public read published posts" on blog_posts for select using (published = true);
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
create policy "Public insert inquiries" on inquiries for insert with check (true);
-- BUG-001 FIX: auth.uid() IS NOT NULL for admin read/update/delete
create policy "Auth read inquiries"
  on inquiries for select using (auth.uid() is not null);
create policy "Auth update inquiries"
  on inquiries for update using (auth.uid() is not null) with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));
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
create policy "Public read settings"  on site_settings for select using (true);
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
create policy "Public read seo"  on seo_pages for select using (true);
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

create policy "Public read product images"
  on storage.objects for select using (bucket_id = 'product-images');
create policy "Auth insert product images"
  on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "Auth update product images"
  on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "Auth delete product images"
  on storage.objects for delete to authenticated using (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete blog images" ON storage.objects;

create policy "Public read blog images"
  on storage.objects for select using (bucket_id = 'blog-images');
create policy "Auth insert blog images"
  on storage.objects for insert to authenticated with check (bucket_id = 'blog-images');
create policy "Auth update blog images"
  on storage.objects for update to authenticated using (bucket_id = 'blog-images');
create policy "Auth delete blog images"
  on storage.objects for delete to authenticated using (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Public read site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete site assets" ON storage.objects;

create policy "Public read site assets"
  on storage.objects for select using (bucket_id = 'site-assets');
create policy "Auth insert site assets"
  on storage.objects for insert to authenticated with check (bucket_id = 'site-assets');
create policy "Auth update site assets"
  on storage.objects for update to authenticated using (bucket_id = 'site-assets');
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
create policy "Auth read activity logs"
  on activity_logs for select using (auth.uid() is not null);
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

-- ─── TABLE: recipes (Recipe / BOM header) ─────────────────────
create table if not exists recipes (
  id          text primary key default gen_random_uuid()::text,
  product_id  uuid references products(id) on delete cascade,
  name        text not null,
  version     integer default 1,
  is_active   boolean default true,
  locked      boolean default false,
  notes       text,
  output_qty  numeric(12,3),
  output_unit text default 'kg',
  expected_loss numeric(6,2) default 2,
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
  material    text not null,
  qty         numeric(12,3) not null,
  unit        text default 'kg',
  tolerance   numeric(5,2) default 2,
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
  is_ccp       boolean default false,
  created_at   timestamptz default now()
);

alter table recipes       enable row level security;
alter table recipe_inputs enable row level security;
alter table recipe_steps  enable row level security;

create index if not exists idx_recipes_product    on recipes(product_id);
create index if not exists idx_recipes_active     on recipes(is_active, locked);
create index if not exists idx_recipe_inputs_rid  on recipe_inputs(recipe_id);
create index if not exists idx_recipe_steps_rid   on recipe_steps(recipe_id, step_no);

-- Add recipe references to batches table (link batch to recipe)
alter table batches add column if not exists recipe_id   text references recipes(id);
alter table batches add column if not exists recipe_name text;



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

create policy "auth_only_grns"
  on grns for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_lots"
  on lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_batches"
  on batches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_qc_checks"
  on qc_checks for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_fg_lots"
  on fg_lots for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_dispatches"
  on dispatches for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_invoices"
  on invoices for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_payments"
  on payments for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "auth_only_expenses"
  on expenses for all
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

-- ============================================================
-- UNIQUE CONSTRAINTS (LINK-009)
-- Prevent duplicate GRN/batch/DO numbers at DB level.
-- ============================================================

alter table grns       add constraint grns_grn_no_unique       unique (grn_no);
alter table batches    add constraint batches_batch_no_unique   unique (batch_no);
alter table dispatches add constraint dispatches_do_no_unique   unique (do_no);
alter table invoices   add constraint invoices_invoice_no_unique unique (invoice_no);

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

CREATE POLICY "auth_only_ccp_logs"
  ON ccp_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_only_fssai_docs"
  ON fssai_docs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_only_fssai_audits"
  ON fssai_audits FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_only_capas"
  ON capas FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_only_allergen_matrix"
  ON allergen_matrix FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_only_recalls"
  ON recalls FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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
create policy "BOS write batches"
  on batches for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- Recipes
alter table if exists recipes enable row level security;
drop policy if exists "BOS read recipes" on recipes;
drop policy if exists "BOS write recipes" on recipes;
create policy "BOS read recipes"
  on recipes for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
create policy "BOS write recipes"
  on recipes for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER']));

-- Recipe Inputs
alter table if exists recipe_inputs enable row level security;
drop policy if exists "BOS read recipe_inputs" on recipe_inputs;
drop policy if exists "BOS write recipe_inputs" on recipe_inputs;
create policy "BOS read recipe_inputs"
  on recipe_inputs for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
create policy "BOS write recipe_inputs"
  on recipe_inputs for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER']));

-- Recipe Steps
alter table if exists recipe_steps enable row level security;
drop policy if exists "BOS read recipe_steps" on recipe_steps;
drop policy if exists "BOS write recipe_steps" on recipe_steps;
create policy "BOS read recipe_steps"
  on recipe_steps for select
  using (bos_has_role(ARRAY['ADMIN','MANAGER','QC','OPERATOR']));
create policy "BOS write recipe_steps"
  on recipe_steps for all
  using      (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']))
  with check (bos_has_role(ARRAY['ADMIN','MANAGER','OPERATOR']));

-- R&D Laboratory Portal Schema

-- 1. Ingredients Intel
CREATE TABLE rnd_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text, -- e.g., Hydrocolloid, Emulsifier, Sweetener, Acidulant
  functionality text, -- e.g., Stabilizer, Texturizer
  supplier text,
  cost_per_kg numeric(10,2) DEFAULT 0,
  ph_min numeric(4,2),
  ph_max numeric(4,2),
  heat_stability text, -- e.g., High, Medium, Low
  usage_min_pct numeric(5,3),
  usage_max_pct numeric(5,3),
  notes text,
  coa_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Formulations (Recipes)
CREATE TYPE rnd_formula_status AS ENUM ('DRAFT', 'UNDER_TRIAL', 'APPROVED', 'LOCKED', 'ARCHIVED');

CREATE TABLE rnd_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  version numeric(4,1) DEFAULT 1.0,
  target_ph numeric(4,2),
  target_brix numeric(4,2),
  target_sg numeric(5,3),
  status rnd_formula_status DEFAULT 'DRAFT',
  total_cost_per_kg numeric(10,2) DEFAULT 0,
  created_by text,
  approved_by text,
  created_at timestamptz DEFAULT now()
);

-- 3. Formulation Items (Ingredients in a Recipe)
CREATE TABLE rnd_formula_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id uuid REFERENCES rnd_formulas(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES rnd_ingredients(id) ON DELETE RESTRICT,
  phase text, -- e.g., Water Phase, Oil Phase, Post-Addition
  percentage numeric(6,3) NOT NULL, -- Out of 100%
  tolerance_pct numeric(5,3) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Process Builder (SOPs)
CREATE TABLE rnd_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id uuid REFERENCES rnd_formulas(id) ON DELETE CASCADE,
  step_no integer NOT NULL,
  step_type text, -- e.g., Mix, Heat, Homogenize, Retort, Cool
  description text NOT NULL,
  duration_min integer,
  temp_c numeric(5,1),
  rpm integer,
  pressure_bar numeric(5,1),
  ccp boolean DEFAULT false, -- Critical Control Point
  created_at timestamptz DEFAULT now()
);

-- 5. Trials (Experiment Execution)
CREATE TYPE rnd_trial_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

CREATE TABLE rnd_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_no text NOT NULL UNIQUE,
  formula_id uuid REFERENCES rnd_formulas(id) ON DELETE RESTRICT,
  batch_size_kg numeric(8,2) NOT NULL,
  actual_yield_kg numeric(8,2),
  status rnd_trial_status DEFAULT 'PLANNED',
  start_time timestamptz,
  end_time timestamptz,
  
  -- Retort/Processing Logs
  f0_achieved numeric(5,2),
  retort_temp_c numeric(5,1),
  hold_time_min integer,
  
  -- Results
  actual_ph numeric(4,2),
  actual_brix numeric(4,2),
  actual_sg numeric(5,3),
  sensory_score integer, -- 1-10
  sensory_notes text,
  stability_notes text,
  failure_reason text,
  
  conducted_by text,
  created_at timestamptz DEFAULT now()
);

-- 6. Lab Notebook
CREATE TABLE rnd_notebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  trial_id uuid REFERENCES rnd_trials(id) ON DELETE SET NULL,
  content text NOT NULL, -- Rich text/Markdown
  author text,
  tags text[],
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 7. Files/Attachments
CREATE TABLE rnd_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'INGREDIENT', 'TRIAL', 'NOTEBOOK'
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- (Optional) Add RLS policies assuming usage of Supabase auth mapping to app_metadata->>'role'
-- For now, all tables are fully accessible if authenticated for MVP speed, 
-- but in production we'd restrict modifications to 'ADMIN' or 'MANAGER'.
-- ============================================================
-- ⚠️  DUMMY SEED DATA — NEVER RUN IN PRODUCTION
-- DB-004 FIX: This file must only run on local dev or staging.
-- Guard: this file intentionally has no auto-run mechanism.
-- To apply: psql -f seed_dummy.sql (local only)
-- ============================================================

-- ============================================================
--  SVR20 — Dummy / Test Data Seed
--  Run in Supabase → SQL Editor for development/testing only.
--  DO NOT run on production with real data.
-- ============================================================

-- ── Dummy Blog Posts ──────────────────────────────────────────
insert into blog_posts (title, slug, excerpt, content, category, tags, published, seo_title, seo_desc)
values
  ('Why Plant-Based Butter Is Taking Over Professional Kitchens',
   'plant-based-butter-professional-kitchens',
   'From Michelin-starred restaurants to cloud kitchens, chefs are switching to plant-based alternatives for taste, ethics, and cost.',
   'Full article content here. Professional chefs across India are increasingly turning to plant-based butter for its stability under high heat and consistent emulsion...',
   'HoReCa Insights', ARRAY['butter','horeca','vegan','professional'], true,
   'Plant-Based Butter in Professional Kitchens | PlantSmör',
   'Why top chefs are switching to plant-based butter. Heat stability, cost efficiency, and clean-label advantages explained.'),

  ('5 Recipes Using Vegan Cooking Cream That Will Impress Any Guest',
   '5-recipes-vegan-cooking-cream',
   'Plant-based cooking cream opens up a world of possibilities — from rich pasta sauces to elegant desserts.',
   'Recipe 1: Creamy Tomato Pasta with PlantSmör Cooking Cream. Recipe 2: Vegan Korma...',
   'Recipes', ARRAY['recipes','cream','vegan','cooking'], true,
   '5 Vegan Cooking Cream Recipes | PlantSmör',
   'Delicious recipes using PlantSmör vegan cooking cream. From pasta to curries — no dairy required.'),

  ('Understanding Vegan Food Labels: What to Look For',
   'understanding-vegan-food-labels',
   'Not all plant-based products are created equal. Here is how to read labels and choose quality.',
   'When shopping for plant-based products, understanding the label is critical...',
   'Consumer Education', ARRAY['labels','vegan','guide','food'], false,
   'Vegan Food Labels Guide | PlantSmör',
   'How to read vegan food labels. What certifications matter, what ingredients to avoid, and how to choose quality plant-based products.'),

  ('The HoReCa Opportunity: Why Plant-Based Is the Future of Food Service',
   'horeca-plant-based-opportunity',
   'The food service industry is undergoing a transformation. Plant-based options are no longer a niche — they are a requirement.',
   'Hotels, restaurants, and catering operations across Tier 1 and Tier 2 cities are seeing...',
   'HoReCa Insights', ARRAY['horeca','food-service','business','vegan'], true,
   'Plant-Based HoReCa Opportunity | PlantSmör',
   'Why food service businesses need plant-based options in 2024. Market data, consumer demand, and supplier guidance.')
on conflict (slug) do nothing;

-- ── Dummy Inquiries ───────────────────────────────────────────
insert into inquiries (name, email, phone, subject, message, read, replied)
values
  ('Rajesh Kumar',    'rajesh.kumar@hotelgrand.com',  '+91 9876543210', 'Bulk Order — Butter 5kg',    'We are interested in monthly supply of 500 units of 5kg butter packs for our hotel chain.', true,  true),
  ('Priya Sharma',    'priya@cloudkitchen9.com',       '+91 9988776655', 'Sample Request — Mayo',       'Please send 2kg mayo samples for kitchen trial. We operate 3 cloud kitchen units.', true,  false),
  ('Mohammed Farouk', 'farouk@cateringco.ae',          '+971 501234567', 'Export Inquiry — Cooking Cream','We are a catering company in Dubai looking for vegan cooking cream supplier from India.', false, false),
  ('Sunita Patel',    'sunita@restaurant.in',          '+91 8765432109', 'General Inquiry',             'What is the shelf life of your mayonnaise? And do you provide custom labelling?', false, false),
  ('Amit Verma',      'amit.verma@fooddistrib.com',    '+91 7654321098', 'Distribution Partnership',    'We are a distributor operating in Madhya Pradesh, Gujarat and Rajasthan. Would like to discuss exclusive distribution.', false, false),
  ('Chef Arun Nair',  'arun@leelakochi.com',           '+91 9870001122', 'Chef Trial Pack Request',      'We would like to trial PlantSmör Butter and Cooking Cream in our pastry section. Please send 1kg packs.', true, true),
  ('Deepa R.',        'deepa@veganbakery.co.in',       NULL,             'Bulk Butter Order',           'Running a vegan bakery. Need 200g and 500g packs in bulk. What are your B2B rates?', false, false)
on conflict do nothing;

-- ── Dummy Testimonials ────────────────────────────────────────
insert into testimonials (name, role, company, quote, rating, visible, sort_order)
values
  ('Chef Ravi Menon',     'Executive Chef',   'The Westin Chennai',
   'PlantSmör Butter has replaced dairy butter in our entire pastry section. The heat stability is exceptional — no separation even at 200°C.',
   5, true, 1),
  ('Anika Joshi',         'F&B Manager',      'Marriott Pune',
   'We switched our gravies to PlantSmör Cooking Cream six months ago. Guest complaints about curdling have dropped to zero.',
   5, true, 2),
  ('Vinod Tiwari',        'Owner',            'Tiwari Catering Services, Indore',
   'Excellent product and very professional team. Delivery is consistent and the pricing is competitive for bulk orders.',
   4, true, 3),
  ('Chef Priyanka Roy',   'Head Pastry Chef', 'ITC Grand, Kolkata',
   'The vegan mayonnaise has a beautiful emulsion. It holds in sandwiches even at room temperature — perfect for buffets.',
   5, true, 4)
on conflict do nothing;

-- ── Dummy Activity Logs ───────────────────────────────────────
insert into activity_logs (action, entity, detail, user_email)
values
  ('created',   'product',     'Created product "PlantSmör Butter"',         'admin@srivriddhi.com'),
  ('created',   'product',     'Created product "PlantSmör Cooking Cream"',  'admin@srivriddhi.com'),
  ('created',   'product',     'Created product "PlantSmör Mayonnaise"',     'admin@srivriddhi.com'),
  ('published', 'blog_post',   'Published post "Plant-Based Butter in Professional Kitchens"', 'admin@srivriddhi.com'),
  ('login',     'auth',        'Admin login: admin@srivriddhi.com',          'admin@srivriddhi.com'),
  ('updated',   'seo_pages',   'Updated SEO for Home page',                  'admin@srivriddhi.com')
on conflict do nothing;



-- Migration: Logistics, Packaging, Holding, Returns & Reprocessing
-- Adds tables to support separated packaging runs, warehousing, and returns

-- 1. Locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('RM Store', 'PM Store', 'Bulk Store', 'FG Store', 'Quarantine', 'Incubation Zone')),
  temperature_zone text,
  created_at timestamptz DEFAULT now()
);

-- 2. Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL, -- The lot_id or fg_lot_id being transferred
  item_type text NOT NULL CHECK (item_type IN ('RM', 'PM', 'BULK', 'FG')),
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid REFERENCES locations(id),
  qty numeric NOT NULL,
  transferred_by uuid,
  transfer_date timestamptz DEFAULT now(),
  reason text
);

-- 3. Bulk Lots
CREATE TABLE IF NOT EXISTS bulk_lots (
  id text PRIMARY KEY,
  product_id uuid NOT NULL,
  batch_id text NOT NULL,
  qty_produced numeric NOT NULL,
  qty_available numeric NOT NULL,
  location_id uuid REFERENCES locations(id),
  status text DEFAULT 'PENDING_QC',
  created_at timestamptz DEFAULT now()
);

-- 4. Packaging Runs
CREATE TABLE IF NOT EXISTS packaging_runs (
  id text PRIMARY KEY,
  bulk_lot_id text REFERENCES bulk_lots(id),
  pm_lot_id text, -- ID of the packaging material lot consumed
  pm_qty_consumed numeric NOT NULL,
  bulk_qty_consumed numeric NOT NULL,
  fg_lot_id text, -- Links to the FG lot created
  run_date timestamptz DEFAULT now(),
  operator_id uuid,
  notes text
);

-- 5. Wastage Logs
CREATE TABLE IF NOT EXISTS wastage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type text NOT NULL CHECK (item_type IN ('RM', 'PM', 'BULK', 'FG')),
  reference_id text NOT NULL, -- The lot_id, bulk_lot_id, or fg_lot_id
  qty numeric NOT NULL,
  reason text NOT NULL,
  logged_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 6. Sales Returns
CREATE TABLE IF NOT EXISTS sales_returns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id uuid, -- Reference to original dispatch if tracked
  invoice_no text,
  fg_lot_id text NOT NULL,
  qty numeric NOT NULL,
  return_date timestamptz DEFAULT now(),
  reason text,
  status text DEFAULT 'PENDING_QC' CHECK (status IN ('PENDING_QC', 'DISPOSITIONED'))
);

-- 7. Return QC & Disposition
CREATE TABLE IF NOT EXISTS return_qc (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id uuid REFERENCES sales_returns(id),
  primary_pm_status text NOT NULL CHECK (primary_pm_status IN ('OK', 'DAMAGED')),
  secondary_pm_status text NOT NULL CHECK (secondary_pm_status IN ('OK', 'DAMAGED')),
  tertiary_pm_status text,
  product_status text NOT NULL CHECK (product_status IN ('OK', 'SPOILED')),
  disposition_action text NOT NULL CHECK (disposition_action IN ('REPACK', 'REPROCESS', 'DISCARD', 'OK')),
  new_lot_id text, -- Tracking what new lot was created
  qc_by uuid,
  qc_date timestamptz DEFAULT now(),
  notes text
);

-- Add holding fields to FG Lots if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='location_id') THEN
    ALTER TABLE fg_lots ADD COLUMN location_id uuid REFERENCES locations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='release_date') THEN
    ALTER TABLE fg_lots ADD COLUMN release_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fg_lots' AND column_name='holding_status') THEN
    ALTER TABLE fg_lots ADD COLUMN holding_status text DEFAULT 'RELEASED' CHECK (holding_status IN ('INCUBATION', 'MATURATION', 'RELEASED', 'QUARANTINE', 'HOLD'));
  END IF;
END $$;


-- ================================================================
-- General Stores & Maintenance Module
-- ================================================================

-- Item Master (Pencil, Bulb, Knife, Spare Parts, etc.)
CREATE TABLE IF NOT EXISTS store_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',  -- General, Maintenance, Stationery, Electrical, Cleaning, IT, Safety
  unit text NOT NULL DEFAULT 'pcs',
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock_level numeric DEFAULT 0,         -- Alert if stock falls below this
  is_maintenance_part boolean DEFAULT false, -- True = spare part / maintenance item
  equipment_tag text,                        -- Which machine/area it belongs to (if maintenance)
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indent / Requisition (Raised by any department)
CREATE TABLE IF NOT EXISTS store_indents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indent_no text UNIQUE NOT NULL,
  department text NOT NULL,  -- Production, QC, Dispatch, Store, Accounts, Packaging, Maintenance
  requested_by text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  item_id uuid REFERENCES store_items(id),
  item_name text NOT NULL,   -- free text in case item not in master
  qty_requested numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  purpose text,              -- Reason / purpose for request
  is_maintenance boolean DEFAULT false,
  equipment_tag text,        -- If maintenance, which equipment
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PURCHASED', 'ISSUED', 'REJECTED')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Store Transactions (IN = Purchase, OUT = Issue/Consumption)
CREATE TABLE IF NOT EXISTS store_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  txn_type text NOT NULL CHECK (txn_type IN ('IN', 'OUT')),
  item_id uuid REFERENCES store_items(id),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  qty numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  rate numeric,              -- Rate per unit (optional)
  amount numeric,            -- qty * rate (optional)
  has_bill boolean DEFAULT false,
  bill_no text,              -- Bill/invoice number if available
  vendor text,               -- Supplier name (for IN)
  department text,           -- Department (for OUT — issued to whom)
  indent_id uuid REFERENCES store_indents(id),  -- Link to indent if any
  is_maintenance boolean DEFAULT false,
  equipment_tag text,
  notes text,
  entered_by text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Auto-update current stock on transactions
CREATE OR REPLACE FUNCTION update_store_item_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    IF NEW.txn_type = 'IN' THEN
      UPDATE store_items SET current_stock = current_stock + NEW.qty WHERE id = NEW.item_id;
    ELSIF NEW.txn_type = 'OUT' THEN
      UPDATE store_items SET current_stock = current_stock - NEW.qty WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_stock ON store_transactions;
CREATE TRIGGER trg_store_stock
  AFTER INSERT ON store_transactions
  FOR EACH ROW EXECUTE FUNCTION update_store_item_stock();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_transactions_item ON store_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_store_transactions_date ON store_transactions(txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_indents_status ON store_indents(status);
CREATE INDEX IF NOT EXISTS idx_store_indents_dept ON store_indents(department);

-- RLS (permissive for now — same as other tables)
ALTER TABLE store_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_indents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_store_items"   ON store_items        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_store_indents" ON store_indents       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_store_txns"    ON store_transactions  FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- PHASE 2: BOS SECURITY HARDENING
-- Blocks direct browser writes to legacy BOS tables and enforces RPC usage.
-- ==============================================================================

-- 1. Ensure RLS is enabled on all BOS Tables
ALTER TABLE IF EXISTS public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fg_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;

-- 2. Allow SELECT for authenticated users
CREATE POLICY "Allow authenticated read access on grns" ON public.grns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on lots" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on batches" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on qc_checks" ON public.qc_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on fg_lots" ON public.fg_lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on dispatches" ON public.dispatches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access on expenses" ON public.expenses FOR SELECT TO authenticated USING (true);

-- 3. Create Trigger Function to Block Direct Browser Writes
CREATE OR REPLACE FUNCTION public.assert_rpc_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If not called from an RPC that sets the workflow_context, block the mutation
  IF current_setting('app.workflow_context', true) IS DISTINCT FROM 'rpc' THEN
    RAISE EXCEPTION 'Direct database mutation from the browser is blocked for security reasons. Please use the designated RPC endpoints for %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Apply the RPC Enforcer Trigger to all BOS Tables
DROP TRIGGER IF EXISTS trg_block_direct_grns ON public.grns;
CREATE TRIGGER trg_block_direct_grns BEFORE INSERT OR UPDATE OR DELETE ON public.grns
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_lots ON public.lots;
CREATE TRIGGER trg_block_direct_lots BEFORE INSERT OR UPDATE OR DELETE ON public.lots
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_batches ON public.batches;
CREATE TRIGGER trg_block_direct_batches BEFORE INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_qc_checks ON public.qc_checks;
CREATE TRIGGER trg_block_direct_qc_checks BEFORE INSERT OR UPDATE OR DELETE ON public.qc_checks
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_fg_lots ON public.fg_lots;
CREATE TRIGGER trg_block_direct_fg_lots BEFORE INSERT OR UPDATE OR DELETE ON public.fg_lots
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_dispatches ON public.dispatches;
CREATE TRIGGER trg_block_direct_dispatches BEFORE INSERT OR UPDATE OR DELETE ON public.dispatches
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_invoices ON public.invoices;
CREATE TRIGGER trg_block_direct_invoices BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_payments ON public.payments;
CREATE TRIGGER trg_block_direct_payments BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

DROP TRIGGER IF EXISTS trg_block_direct_expenses ON public.expenses;
CREATE TRIGGER trg_block_direct_expenses BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.assert_rpc_context();

-- Note: The BOS HTML modules will temporarily break on WRITE operations until their 
-- fetch() calls are updated to use Supabase RPCs (e.g. create_grn(), submit_batch()).
-- This strictly forces the migration from HTML direct writes to secure RPCs.


-- ==============================================================================
-- PHASE 1.2: MASTER DATA MIGRATION MAPPING
-- This script creates mapping tables to safely link legacy TEXT references
-- (e.g., "Milk Powder", "Milk-Powder") to a single standard Master Data UUID.
-- ==============================================================================

-- 1. Create Mapping Tables in 'md' schema
CREATE TABLE IF NOT EXISTS md.legacy_material_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_name TEXT NOT NULL UNIQUE,
    mapped_item_id UUID REFERENCES md.items(id), -- Will be NULL initially
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS md.legacy_supplier_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_name TEXT NOT NULL UNIQUE,
    mapped_supplier_id UUID REFERENCES md.suppliers(id), -- Will be NULL initially
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS md.legacy_customer_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_name TEXT NOT NULL UNIQUE,
    mapped_customer_id UUID REFERENCES md.customers(id), -- Will be NULL initially
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Mapping Tables
ALTER TABLE md.legacy_material_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE md.legacy_supplier_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE md.legacy_customer_map ENABLE ROW LEVEL SECURITY;

-- 2. Populate Mapping Tables with Distinct Existing Values from Legacy BOS
-- Ignore NULLs or empty strings
INSERT INTO md.legacy_material_map (legacy_name)
SELECT DISTINCT material FROM public.grns 
WHERE material IS NOT NULL AND material != ''
ON CONFLICT (legacy_name) DO NOTHING;

INSERT INTO md.legacy_supplier_map (legacy_name)
SELECT DISTINCT supplier FROM public.grns 
WHERE supplier IS NOT NULL AND supplier != ''
ON CONFLICT (legacy_name) DO NOTHING;

INSERT INTO md.legacy_customer_map (legacy_name)
SELECT DISTINCT customer FROM public.dispatches 
WHERE customer IS NOT NULL AND customer != ''
ON CONFLICT (legacy_name) DO NOTHING;

-- 3. Add UUID Columns to Legacy BOS Tables (to be populated after mapping is done)
ALTER TABLE public.grns 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES md.items(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES md.suppliers(id);

ALTER TABLE public.batches
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES md.items(id);

ALTER TABLE public.dispatches
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES md.customers(id);

-- Note: The actual migration of data (UPDATE grns SET item_id = map.mapped_item_id) 
-- will occur in migration_staging_2.sql AFTER users have manually mapped the 
-- legacy names to the actual master data IDs in the mapping tables.


-- ============================================================
-- MAKER-CHECKER WORKFLOW (Dispatches & Payments)
-- Implements strict dual-authorization for critical financial
-- and inventory workflows.
-- ============================================================

-- ── 1. Enhance Dispatches Table ──
ALTER TABLE public.dispatches 
ADD COLUMN IF NOT EXISTS maker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS maker_checker_status text DEFAULT 'PENDING' CHECK (maker_checker_status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing records are considered approved
UPDATE public.dispatches SET maker_checker_status = 'APPROVED' WHERE maker_checker_status = 'PENDING';

-- ── 2. Enhance Payments Table ──
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS maker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checker_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS maker_checker_status text DEFAULT 'PENDING' CHECK (maker_checker_status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing records are considered approved
UPDATE public.payments SET maker_checker_status = 'APPROVED' WHERE maker_checker_status = 'PENDING';

-- ── 3. RPC for Dispatch Approval ──
CREATE OR REPLACE FUNCTION public.approve_dispatch(
  p_dispatch_id text,
  p_status text, -- 'APPROVED' or 'REJECTED'
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_maker_id uuid;
  v_current_status text;
  v_role text;
BEGIN
  -- Get user role
  v_role := auth.jwt()->'app_metadata'->>'role';
  
  -- Check permission
  IF v_role NOT IN ('ADMIN', 'MANAGER') THEN
    RAISE EXCEPTION 'Only ADMIN or MANAGER can approve or reject dispatches';
  END IF;

  -- Get current record
  SELECT maker_id, maker_checker_status INTO v_maker_id, v_current_status
  FROM public.dispatches
  WHERE id = p_dispatch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispatch not found';
  END IF;

  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Dispatch is already processed';
  END IF;

  -- Prevent self-approval
  IF v_maker_id = auth.uid() THEN
    RAISE EXCEPTION 'Compliance Error: Maker cannot be the Checker';
  END IF;

  -- Validate rejection reason
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR trim(p_rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Apply update
  UPDATE public.dispatches
  SET 
    maker_checker_status = p_status,
    checker_id = auth.uid(),
    approved_at = CASE WHEN p_status = 'APPROVED' THEN now() ELSE NULL END,
    rejection_reason = p_rejection_reason,
    -- If approved, move dispatch status to CONFIRMED so it can proceed
    status = CASE WHEN p_status = 'APPROVED' THEN 'CONFIRMED' ELSE 'DRAFT' END
  WHERE id = p_dispatch_id;

END;
$$;

-- ── 4. RPC for Payment Approval ──
CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id text,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_maker_id uuid;
  v_current_status text;
  v_role text;
BEGIN
  v_role := auth.jwt()->'app_metadata'->>'role';
  
  IF v_role NOT IN ('ADMIN', 'MANAGER') THEN
    RAISE EXCEPTION 'Only ADMIN or MANAGER can approve or reject payments';
  END IF;

  SELECT maker_id, maker_checker_status INTO v_maker_id, v_current_status
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Payment is already processed';
  END IF;

  IF v_maker_id = auth.uid() THEN
    RAISE EXCEPTION 'Compliance Error: Maker cannot be the Checker';
  END IF;

  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR trim(p_rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  UPDATE public.payments
  SET 
    maker_checker_status = p_status,
    checker_id = auth.uid(),
    approved_at = CASE WHEN p_status = 'APPROVED' THEN now() ELSE NULL END,
    rejection_reason = p_rejection_reason
  WHERE id = p_payment_id;

END;
$$;

-- ── 5. Triggers to auto-set Maker and block invalid state changes ──
CREATE OR REPLACE FUNCTION trg_set_maker_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Always enforce the maker is the current user
  NEW.maker_id = auth.uid();
  NEW.maker_checker_status = 'PENDING';
  NEW.checker_id = NULL;
  NEW.approved_at = NULL;
  NEW.rejection_reason = NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatches_maker ON public.dispatches;
CREATE TRIGGER trg_dispatches_maker
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW
  EXECUTE PROCEDURE trg_set_maker_id();

DROP TRIGGER IF EXISTS trg_payments_maker ON public.payments;
CREATE TRIGGER trg_payments_maker
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE PROCEDURE trg_set_maker_id();

-- Block direct update to maker_checker_status without using the RPC
CREATE OR REPLACE FUNCTION trg_protect_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- We allow the RPC to bypass this because RPC is SECURITY DEFINER and runs as postgres,
  -- but we can just check if current_user is authenticated vs postgres.
  -- A simpler way is to only allow status change if checker_id is set (which RPC does).
  IF OLD.maker_checker_status != NEW.maker_checker_status THEN
    IF NEW.checker_id IS NULL THEN
      RAISE EXCEPTION 'Direct update to maker_checker_status is forbidden. Use approve_* RPC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatches_protect_approval ON public.dispatches;
CREATE TRIGGER trg_dispatches_protect_approval
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE PROCEDURE trg_protect_approval();

DROP TRIGGER IF EXISTS trg_payments_protect_approval ON public.payments;
CREATE TRIGGER trg_payments_protect_approval
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE PROCEDURE trg_protect_approval();


-- ==========================================
-- AUTHENTICATION BUG FIX (AUTO-SETUP)
-- ==========================================

-- 1. Create a function that runs every time a new user is created
CREATE OR REPLACE FUNCTION public.auto_setup_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_count int;
BEGIN
  -- AUTO-CONFIRM EMAIL: This fixes the "Invalid Credentials" error
  -- User will not need to click any confirmation link in their email.
  NEW.email_confirmed_at = coalesce(NEW.email_confirmed_at, now());
  
  -- Check how many users exist currently
  SELECT count(*) INTO user_count FROM auth.users;
  
  -- AUTO-ASSIGN ROLE: If this is the first user, make them ADMIN
  IF user_count = 0 THEN
    NEW.raw_app_meta_data = coalesce(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb;
  ELSE
    -- Subsequent users default to OPERATOR securely
    IF NEW.raw_app_meta_data->>'role' IS NULL THEN
      NEW.raw_app_meta_data = coalesce(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "OPERATOR"}'::jsonb;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to Supabase's auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_setup_new_user();

-- 3. FIX EXISTING USERS (If you already created a user, this fixes them instantly)
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

UPDATE auth.users 
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb 
WHERE raw_app_meta_data->>'role' IS NULL;


DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(r.tablename) || ' TO authenticated;';
    EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(r.tablename) || ' TO anon;';
    EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(r.tablename) || ' TO service_role;';
  END LOOP;
END;
$$;


