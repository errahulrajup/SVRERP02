-- ⚠️  DEPRECATED — All policies merged into schema.sql. Do NOT run separately.
-- ============================================================
--  SVR20 RLS PATCH — LEGACY FILE (No longer needed)
--
--  ✅ BUG-014 FIX: All policies in this file have been merged
--     directly into supabase/schema.sql using auth.uid() IS NOT NULL.
--
--  DO NOT run this file separately — schema.sql is now self-contained.
--  This file is kept for reference only and will be removed in a future cleanup.
-- ============================================================

-- ── Helper: drop & recreate all write policies with uid check ──

-- Products
drop policy if exists "Admin full access products"    on products;
create policy "Auth write products"
  on products for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Categories
drop policy if exists "Admin full access categories"  on categories;
create policy "Auth write categories"
  on categories for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Testimonials
drop policy if exists "Admin full access testimonials" on testimonials;
create policy "Auth write testimonials"
  on testimonials for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Homepage sections
drop policy if exists "Admin full access homepage"    on homepage_sections;
create policy "Auth write homepage"
  on homepage_sections for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- About content
drop policy if exists "Admin full access about"       on about_content;
create policy "Auth write about"
  on about_content for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Blog posts
drop policy if exists "Admin full access blog"        on blog_posts;
create policy "Auth write blog"
  on blog_posts for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Inquiries (public insert stays, only auth reads/deletes)
drop policy if exists "Admin read inquiries"          on inquiries;
drop policy if exists "Admin update inquiries"        on inquiries;
drop policy if exists "Admin delete inquiries"        on inquiries;
create policy "Auth read inquiries"
  on inquiries for select using (auth.uid() is not null);
create policy "Auth update inquiries"
  on inquiries for update using (auth.uid() is not null) with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));
create policy "Auth delete inquiries"
  on inquiries for delete using (auth.uid() is not null);

-- Site settings
drop policy if exists "Admin full settings"           on site_settings;
create policy "Auth write settings"
  on site_settings for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- SEO pages
drop policy if exists "Admin full seo"                on seo_pages;
create policy "Auth write seo"
  on seo_pages for all
  using      (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'))
  with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Activity logs
drop policy if exists "Admin read activity logs"      on activity_logs;
drop policy if exists "Admin insert activity logs"    on activity_logs;
create policy "Auth read activity logs"
  on activity_logs for select using (auth.uid() is not null);
create policy "Auth insert activity logs"
  on activity_logs for insert with check (auth.uid() is not null AND (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER','EDITOR'));

-- Storage
drop policy if exists "Auth upload product images"    on storage.objects;
drop policy if exists "Auth update product images"    on storage.objects;
drop policy if exists "Auth delete product images"    on storage.objects;
drop policy if exists "Auth upload blog images"       on storage.objects;
drop policy if exists "Auth update blog images"       on storage.objects;
drop policy if exists "Auth delete blog images"       on storage.objects;
drop policy if exists "Auth manage site assets"       on storage.objects;

create policy "Auth manage product images"
  on storage.objects for all
  using      (bucket_id = 'product-images' and auth.uid() is not null)
  with check (bucket_id = 'product-images' and auth.uid() is not null);

create policy "Auth manage blog images"
  on storage.objects for all
  using      (bucket_id = 'blog-images' and auth.uid() is not null)
  with check (bucket_id = 'blog-images' and auth.uid() is not null);

create policy "Auth manage site assets"
  on storage.objects for all
  using      (bucket_id = 'site-assets' and auth.uid() is not null)
  with check (bucket_id = 'site-assets' and auth.uid() is not null);
