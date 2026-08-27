CREATE OR REPLACE FUNCTION public.check_shop_payments_configured(p_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shops
    WHERE id = p_shop_id
      AND cryptobot_token_encrypted IS NOT NULL
      AND cryptobot_token_encrypted <> ''
  );
$$;