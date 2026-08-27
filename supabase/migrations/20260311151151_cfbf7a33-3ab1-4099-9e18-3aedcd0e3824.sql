
-- Fix security definer view by using SECURITY INVOKER
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews WITH (security_invoker = true) AS
SELECT id, product_id, author, avatar, rating, text, verified, moderation_status, created_at
FROM public.reviews;

GRANT SELECT ON public.public_reviews TO anon, authenticated;
