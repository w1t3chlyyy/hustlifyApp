
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS balance_used numeric NOT NULL DEFAULT 0;

ALTER TABLE public.promocodes
  ADD COLUMN IF NOT EXISTS max_uses_per_user integer;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending';
