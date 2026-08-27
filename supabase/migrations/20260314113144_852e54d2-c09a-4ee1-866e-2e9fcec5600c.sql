
-- Add balance column to platform_users
ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;

-- Create platform_credit_balance RPC
CREATE OR REPLACE FUNCTION public.platform_credit_balance(p_telegram_id bigint, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE platform_users
  SET balance = balance + p_amount, updated_at = now()
  WHERE telegram_id = p_telegram_id
  RETURNING balance INTO new_bal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Platform user not found';
  END IF;
  RETURN new_bal;
END;
$$;

-- Create platform_deduct_balance RPC
CREATE OR REPLACE FUNCTION public.platform_deduct_balance(p_telegram_id bigint, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE platform_users
  SET balance = balance - p_amount, updated_at = now()
  WHERE telegram_id = p_telegram_id AND balance >= p_amount
  RETURNING balance INTO new_bal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  RETURN new_bal;
END;
$$;

-- Create platform_balance_history table
CREATE TABLE IF NOT EXISTS public.platform_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'credit',
  comment text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.platform_balance_history FOR ALL TO public USING (false);
CREATE POLICY "Service role manages platform_balance_history" ON public.platform_balance_history FOR ALL TO service_role USING (true) WITH CHECK (true);
