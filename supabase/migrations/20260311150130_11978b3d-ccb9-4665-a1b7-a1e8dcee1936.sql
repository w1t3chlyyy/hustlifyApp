
-- Table for idempotent invoice processing (top-ups and payments)
CREATE TABLE IF NOT EXISTS public.processed_invoices (
  invoice_id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'payment',
  order_id UUID,
  telegram_id BIGINT,
  amount NUMERIC,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.processed_invoices FOR ALL TO public USING (false);
CREATE POLICY "Service role manages processed_invoices" ON public.processed_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- DB function for atomic inventory reservation (FOR UPDATE SKIP LOCKED pattern)
CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_product_id UUID,
  p_quantity INT,
  p_order_id UUID
)
RETURNS TABLE(id UUID, content TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH reserved AS (
    SELECT i.id
    FROM inventory_items i
    WHERE i.product_id = p_product_id
      AND i.status = 'available'
    ORDER BY i.created_at
    LIMIT p_quantity
    FOR UPDATE SKIP LOCKED
  )
  UPDATE inventory_items inv
  SET status = 'sold',
      order_id = p_order_id,
      sold_at = now()
  FROM reserved r
  WHERE inv.id = r.id
  RETURNING inv.id, inv.content;
END;
$$;

-- DB function for atomic promo increment  
CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE promocodes SET used_count = used_count + 1 WHERE code = p_code;
END;
$$;

-- DB function for atomic balance deduction with optimistic locking
CREATE OR REPLACE FUNCTION public.deduct_balance(
  p_telegram_id BIGINT,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE user_profiles 
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE telegram_id = p_telegram_id 
    AND balance >= p_amount
  RETURNING balance INTO new_bal;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  RETURN new_bal;
END;
$$;

-- DB function for atomic balance credit (for top-ups)
CREATE OR REPLACE FUNCTION public.credit_balance(
  p_telegram_id BIGINT,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE user_profiles 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE telegram_id = p_telegram_id
  RETURNING balance INTO new_bal;
  
  RETURN new_bal;
END;
$$;
