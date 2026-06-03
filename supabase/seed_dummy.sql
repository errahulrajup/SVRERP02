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
