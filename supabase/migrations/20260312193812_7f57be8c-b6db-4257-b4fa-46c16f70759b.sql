
-- ═══════════════════════════════════════════════
-- 1. shop_customers: tenant-scoped customer profiles
-- ═══════════════════════════════════════════════
CREATE TABLE public.shop_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text,
  username text,
  photo_url text,
  language_code text,
  is_premium boolean NOT NULL DEFAULT false,
  balance numeric NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'user',
  is_blocked boolean NOT NULL DEFAULT false,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, telegram_id)
);

ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.shop_customers FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_customers" ON public.shop_customers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- 2. shop_balance_history: tenant-scoped balance history
-- ═══════════════════════════════════════════════
CREATE TABLE public.shop_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'credit',
  comment text NOT NULL DEFAULT '',
  admin_telegram_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.shop_balance_history FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_balance_history" ON public.shop_balance_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- 3. shop_credit_balance RPC
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.shop_credit_balance(p_shop_id uuid, p_telegram_id bigint, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE shop_customers
  SET balance = balance + p_amount, updated_at = now()
  WHERE shop_id = p_shop_id AND telegram_id = p_telegram_id
  RETURNING balance INTO new_bal;

  IF NOT FOUND THEN
    INSERT INTO shop_customers (shop_id, telegram_id, balance)
    VALUES (p_shop_id, p_telegram_id, p_amount)
    RETURNING balance INTO new_bal;
  END IF;

  RETURN new_bal;
END;
$$;

-- ═══════════════════════════════════════════════
-- 4. shop_deduct_balance RPC
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.shop_deduct_balance(p_shop_id uuid, p_telegram_id bigint, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE shop_customers
  SET balance = balance - p_amount, updated_at = now()
  WHERE shop_id = p_shop_id AND telegram_id = p_telegram_id AND balance >= p_amount
  RETURNING balance INTO new_bal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  RETURN new_bal;
END;
$$;

-- ═══════════════════════════════════════════════
-- 5. ensure_shop_customer: upsert on first-touch
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ensure_shop_customer(
  p_shop_id uuid,
  p_telegram_id bigint,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_is_premium boolean DEFAULT false,
  p_language_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_id uuid;
BEGIN
  SELECT id INTO cust_id FROM shop_customers
  WHERE shop_id = p_shop_id AND telegram_id = p_telegram_id;

  IF FOUND THEN
    UPDATE shop_customers SET
      first_name = COALESCE(NULLIF(p_first_name, ''), first_name),
      last_name = COALESCE(p_last_name, last_name),
      username = COALESCE(p_username, username),
      is_premium = p_is_premium,
      language_code = COALESCE(p_language_code, language_code),
      updated_at = now()
    WHERE id = cust_id;
    RETURN cust_id;
  END IF;

  INSERT INTO shop_customers (shop_id, telegram_id, first_name, last_name, username, is_premium, language_code)
  VALUES (p_shop_id, p_telegram_id, p_first_name, p_last_name, p_username, p_is_premium, p_language_code)
  RETURNING id INTO cust_id;

  RETURN cust_id;
END;
$$;
