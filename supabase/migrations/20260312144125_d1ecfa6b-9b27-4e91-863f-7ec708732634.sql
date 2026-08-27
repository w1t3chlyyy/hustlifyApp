-- Recreate view WITHOUT security_invoker so anon can read it
DROP VIEW IF EXISTS public.public_shop_reviews;
CREATE VIEW public.public_shop_reviews AS
  SELECT id, shop_id, product_id, author, avatar, rating, text, verified, moderation_status, created_at
  FROM public.shop_reviews;

-- Fix the 2 reviews that were approved without verified=true
UPDATE public.shop_reviews SET verified = true WHERE moderation_status = 'approved' AND verified = false;