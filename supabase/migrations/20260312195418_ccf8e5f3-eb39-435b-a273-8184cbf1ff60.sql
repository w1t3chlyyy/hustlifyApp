
ALTER TABLE public.shop_orders 
  ADD COLUMN IF NOT EXISTS promo_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
