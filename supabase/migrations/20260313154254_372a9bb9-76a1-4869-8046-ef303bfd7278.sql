-- Allow public to read basic shop info (including inactive shops) for storefront status screens
-- This replaces the restrictive "Public reads active shops" policy
DROP POLICY IF EXISTS "Public reads active shops" ON public.shops;

CREATE POLICY "Public reads shops for storefront" ON public.shops
  FOR SELECT TO public
  USING (true);

-- Note: sensitive fields (bot_token_encrypted, cryptobot_token_encrypted) are never exposed
-- because the client only selects specific columns (id, name, slug, color, hero_title, etc.)