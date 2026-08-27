
-- 1. Platform subscription promos table
CREATE TABLE public.platform_subscription_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL,
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses integer,
  max_uses_per_user integer DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  created_by bigint NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code)
);

ALTER TABLE public.platform_subscription_promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.platform_subscription_promos FOR ALL TO public USING (false);
CREATE POLICY "Service role manages platform_subscription_promos" ON public.platform_subscription_promos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Platform promo usages table
CREATE TABLE public.platform_promo_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.platform_subscription_promos(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL,
  subscription_payment_id uuid REFERENCES public.subscription_payments(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_promo_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.platform_promo_usages FOR ALL TO public USING (false);
CREATE POLICY "Service role manages platform_promo_usages" ON public.platform_promo_usages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Add promo fields to subscription_payments
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount numeric;

-- Set final_amount = amount for existing rows
UPDATE public.subscription_payments SET final_amount = amount WHERE final_amount IS NULL;

-- 4. Validation function
CREATE OR REPLACE FUNCTION public.validate_platform_subscription_promo(p_code text, p_telegram_id bigint)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  promo RECORD;
  user_usage_count integer;
BEGIN
  SELECT * INTO promo
  FROM platform_subscription_promos
  WHERE UPPER(code) = UPPER(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Промокод не найден');
  END IF;

  IF promo.valid_from IS NOT NULL AND now() < promo.valid_from THEN
    RETURN json_build_object('valid', false, 'error', 'Промокод ещё не активен');
  END IF;

  IF promo.valid_until IS NOT NULL AND now() > promo.valid_until THEN
    RETURN json_build_object('valid', false, 'error', 'Промокод истёк');
  END IF;

  IF promo.max_uses IS NOT NULL AND promo.used_count >= promo.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Лимит использований исчерпан');
  END IF;

  IF promo.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM platform_promo_usages
    WHERE promo_id = promo.id AND telegram_id = p_telegram_id;

    IF user_usage_count >= promo.max_uses_per_user THEN
      RETURN json_build_object('valid', false, 'error', 'Вы уже использовали этот промокод');
    END IF;
  END IF;

  RETURN json_build_object(
    'valid', true,
    'id', promo.id,
    'code', promo.code,
    'discount_type', promo.discount_type,
    'discount_value', promo.discount_value
  );
END;
$$;

-- 5. Increment usage function
CREATE OR REPLACE FUNCTION public.increment_platform_promo_usage(p_promo_id uuid, p_telegram_id bigint, p_payment_id uuid, p_discount_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO platform_promo_usages (promo_id, telegram_id, subscription_payment_id, discount_amount)
  VALUES (p_promo_id, p_telegram_id, p_payment_id, p_discount_amount);

  UPDATE platform_subscription_promos
  SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_promo_id;
END;
$$;
