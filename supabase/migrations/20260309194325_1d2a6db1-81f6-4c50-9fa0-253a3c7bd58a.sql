
-- Tighten write policies: only service_role should write (edge functions)
-- Drop permissive policies
DROP POLICY "Profiles can be inserted" ON public.user_profiles;
DROP POLICY "Profiles can be updated" ON public.user_profiles;
DROP POLICY "Orders can be inserted" ON public.orders;
DROP POLICY "Orders can be updated" ON public.orders;
DROP POLICY "Order items can be inserted" ON public.order_items;
DROP POLICY "Reviews can be inserted" ON public.reviews;

-- Recreate: only service_role can write (edge functions use service role key)
CREATE POLICY "Service role inserts profiles" ON public.user_profiles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role updates profiles" ON public.user_profiles FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role inserts orders" ON public.orders FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role updates orders" ON public.orders FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role inserts order items" ON public.order_items FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts reviews" ON public.reviews FOR INSERT TO service_role WITH CHECK (true);
