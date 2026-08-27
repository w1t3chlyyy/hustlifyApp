
-- ═══════════════════════════════════════════════
-- PLATFORM SCHEMA: Multi-tenant SaaS for Telegram shops
-- ═══════════════════════════════════════════════

-- 1. Platform users (sellers)
CREATE TABLE public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT,
  photo_url TEXT,
  language_code TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.platform_users FOR ALL TO public USING (false);
CREATE POLICY "Service role manages platform_users" ON public.platform_users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Shops
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hero_title TEXT NOT NULL DEFAULT '',
  hero_description TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#2B7FFF',
  support_link TEXT NOT NULL DEFAULT '',
  bot_token_encrypted TEXT,
  cryptobot_token_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.shops FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shops" ON public.shops FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public can read active shops (for Mini App)
CREATE POLICY "Public reads active shops" ON public.shops FOR SELECT TO public
  USING (status = 'active');

-- 3. Shop products
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL,
  old_price NUMERIC,
  image TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.shop_products FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_products" ON public.shop_products FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public reads active products of active shops
CREATE POLICY "Public reads active products" ON public.shop_products FOR SELECT TO public
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.shops WHERE shops.id = shop_products.shop_id AND shops.status = 'active'
  ));

-- 4. Shop inventory (digital items for auto-delivery)
CREATE TABLE public.shop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  order_id UUID,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.shop_inventory FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_inventory" ON public.shop_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Shop orders
CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  buyer_telegram_id BIGINT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  invoice_id TEXT,
  pay_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.shop_orders FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_orders" ON public.shop_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Shop order items
CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id),
  product_name TEXT NOT NULL,
  product_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.shop_order_items FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_order_items" ON public.shop_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Subscription payments
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 9,
  currency TEXT NOT NULL DEFAULT 'USD',
  invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.subscription_payments FOR ALL TO public USING (false);
CREATE POLICY "Service role manages subscription_payments" ON public.subscription_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Platform onboarding sessions (for step-by-step bot flow)
CREATE TABLE public.platform_sessions (
  telegram_id BIGINT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.platform_sessions FOR ALL TO public USING (false);
CREATE POLICY "Service role manages platform_sessions" ON public.platform_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Inventory reservation function for shop orders
CREATE OR REPLACE FUNCTION public.reserve_shop_inventory(
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
    FROM shop_inventory i
    WHERE i.product_id = p_product_id
      AND i.status = 'available'
    ORDER BY i.created_at
    LIMIT p_quantity
    FOR UPDATE SKIP LOCKED
  )
  UPDATE shop_inventory inv
  SET status = 'sold',
      order_id = p_order_id,
      sold_at = now()
  FROM reserved r
  WHERE inv.id = r.id
  RETURNING inv.id, inv.content;
END;
$$;

-- 10. Token encryption helpers using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.encrypt_token(p_token TEXT, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(p_token, p_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(p_encrypted TEXT, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(p_encrypted, 'base64'), p_key);
END;
$$;
