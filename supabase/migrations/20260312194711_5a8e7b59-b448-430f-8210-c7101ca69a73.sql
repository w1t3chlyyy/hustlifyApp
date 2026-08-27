
CREATE OR REPLACE FUNCTION public.validate_shop_promo_code(p_shop_id uuid, p_code text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'found', true,
    'id', id,
    'code', code,
    'discount_type', discount_type,
    'discount_value', discount_value,
    'max_uses', max_uses,
    'used_count', used_count,
    'max_uses_per_user', max_uses_per_user,
    'valid_from', valid_from,
    'valid_until', valid_until
  ) INTO result
  FROM public.shop_promocodes
  WHERE shop_id = p_shop_id
    AND UPPER(code) = UPPER(p_code)
    AND is_active = true;

  IF result IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN result;
END;
$$;
