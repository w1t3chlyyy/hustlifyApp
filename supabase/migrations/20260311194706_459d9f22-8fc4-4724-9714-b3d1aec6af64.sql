
-- Shop reviews table
CREATE TABLE public.shop_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  telegram_id bigint NOT NULL,
  author text NOT NULL,
  avatar text NOT NULL DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Public view hiding telegram_id
CREATE VIEW public.public_shop_reviews
WITH (security_invoker = on) AS
  SELECT id, shop_id, product_id, author, avatar, rating, text, verified, moderation_status, created_at
  FROM public.shop_reviews;

-- RLS
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;

-- No direct public access to base table (use view instead)
CREATE POLICY "No public access to shop_reviews"
  ON public.shop_reviews FOR ALL
  TO public
  USING (false);

-- Service role full access
CREATE POLICY "Service role manages shop_reviews"
  ON public.shop_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
