
-- 1. Remove public SELECT on reviews table, keep service_role access
DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;

-- The public_reviews view (security invoker) already provides safe public access
-- But we need a policy that allows anon to read reviews (for the view to work)
-- So instead, let's create a restrictive policy that blocks direct public access
-- and rely on the view for public reads

-- Actually the view with security_invoker uses the caller's permissions,
-- so we need reviews to be readable. Let's keep it but exclude telegram_id
-- by making the view the only public interface.

-- Better approach: keep SELECT but add explicit "No public access" and 
-- use the security definer view pattern properly

-- Remove the old public readable policy
-- Already dropped above

-- Add explicit denial for public role on reviews
CREATE POLICY "No public access to reviews" ON public.reviews FOR ALL TO public USING (false);

-- Re-create the view as SECURITY DEFINER (owned by postgres/service role) 
-- to bypass RLS and serve safe columns
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews AS
SELECT id, product_id, author, avatar, rating, text, verified, moderation_status, created_at
FROM public.reviews;

GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 2. Add explicit "No public access" to tables missing it
CREATE POLICY "No public access" ON public.orders FOR ALL TO public USING (false);
CREATE POLICY "No public access" ON public.order_items FOR ALL TO public USING (false);
CREATE POLICY "No public access" ON public.user_profiles FOR ALL TO public USING (false);
CREATE POLICY "No public access" ON public.promocodes FOR ALL TO public USING (false);
