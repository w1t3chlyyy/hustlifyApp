
-- 1. Create RPC for validating promo codes (returns only necessary info)
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo RECORD;
  result JSON;
BEGIN
  SELECT id, code, discount_type, discount_value, is_active, max_uses, used_count, max_uses_per_user, valid_from, valid_until
  INTO promo
  FROM promocodes
  WHERE code = p_code AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;
  
  RETURN json_build_object(
    'found', true,
    'id', promo.id,
    'code', promo.code,
    'discount_type', promo.discount_type,
    'discount_value', promo.discount_value,
    'max_uses', promo.max_uses,
    'used_count', promo.used_count,
    'max_uses_per_user', promo.max_uses_per_user,
    'valid_from', promo.valid_from,
    'valid_until', promo.valid_until
  );
END;
$$;

-- 2. Remove public SELECT on promocodes
DROP POLICY IF EXISTS "Promocodes publicly readable" ON public.promocodes;

-- Add service_role-only policies
CREATE POLICY "Service role reads promocodes" ON public.promocodes FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role inserts promocodes" ON public.promocodes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role updates promocodes" ON public.promocodes FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role deletes promocodes" ON public.promocodes FOR DELETE TO service_role USING (true);

-- 3. Create a view for public reviews without telegram_id
CREATE OR REPLACE VIEW public.public_reviews AS
SELECT id, product_id, author, avatar, rating, text, verified, moderation_status, created_at
FROM public.reviews;

-- Grant access to the view
GRANT SELECT ON public.public_reviews TO anon, authenticated;
