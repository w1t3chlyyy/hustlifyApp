
CREATE OR REPLACE FUNCTION public.increment_shop_promo_usage(p_shop_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE shop_promocodes SET used_count = used_count + 1 
  WHERE shop_id = p_shop_id AND UPPER(code) = UPPER(p_code);
END;
$$;
