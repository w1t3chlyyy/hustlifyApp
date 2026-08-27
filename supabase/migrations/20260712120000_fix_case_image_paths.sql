-- ============================================
-- `/src/assets/...` only resolves in the Vite dev server — it does
-- NOT exist in a production build (Vite only bundles assets that are
-- imported via `import x from '...'` somewhere in code; nothing
-- imports these, so the files never get copied to the build output).
-- That made every case/product image using this path 404 on the
-- live site, even though it looked fine in local/editor preview.
--
-- Fix: the same 4 images now also live in /public/cases/ (served
-- verbatim, in dev AND in production), and both `cases.image_url`
-- and the mirrored `products.image` are repointed there.
-- ============================================
UPDATE public.cases SET image_url = '/cases/business.png' WHERE slug = 'business';
UPDATE public.cases SET image_url = '/cases/standard.jpg' WHERE slug = 'standard';
UPDATE public.cases SET image_url = '/cases/extended.jpg' WHERE slug = 'extended';
UPDATE public.cases SET image_url = '/cases/premium.jpg' WHERE slug = 'premium';

UPDATE public.products SET image = '/cases/business.png' WHERE image = '/src/assets/case-business.png';
UPDATE public.products SET image = '/cases/standard.jpg' WHERE image = '/src/assets/case-pencil.jpg';
UPDATE public.products SET image = '/cases/extended.jpg' WHERE image = '/src/assets/case-palette.jpg';
UPDATE public.products SET image = '/cases/premium.jpg' WHERE image = '/src/assets/case-organizer.jpg';
