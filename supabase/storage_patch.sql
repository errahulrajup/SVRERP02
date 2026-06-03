-- ============================================================
-- SVR Storage RLS Policy Patch
-- Fixes: "Upload failed: new row violates row-level security policy"
-- ============================================================

-- 1. Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete product images" ON storage.objects;

DROP POLICY IF EXISTS "Public read blog images"    ON storage.objects;
DROP POLICY IF EXISTS "Auth manage blog images"    ON storage.objects;
DROP POLICY IF EXISTS "Auth insert blog images"    ON storage.objects;
DROP POLICY IF EXISTS "Auth update blog images"    ON storage.objects;
DROP POLICY IF EXISTS "Auth delete blog images"    ON storage.objects;

DROP POLICY IF EXISTS "Public read site assets"    ON storage.objects;
DROP POLICY IF EXISTS "Auth manage site assets"    ON storage.objects;
DROP POLICY IF EXISTS "Auth insert site assets"    ON storage.objects;
DROP POLICY IF EXISTS "Auth update site assets"    ON storage.objects;
DROP POLICY IF EXISTS "Auth delete site assets"    ON storage.objects;

-- 2. Create clean, robust policies for 'product-images' bucket
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Auth insert product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Auth update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Auth delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- 3. Create clean, robust policies for 'blog-images' bucket
CREATE POLICY "Public read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Auth insert blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Auth update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images');

CREATE POLICY "Auth delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images');

-- 4. Create clean, robust policies for 'site-assets' bucket
CREATE POLICY "Public read site assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Auth insert site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "Auth update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets');

CREATE POLICY "Auth delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets');
