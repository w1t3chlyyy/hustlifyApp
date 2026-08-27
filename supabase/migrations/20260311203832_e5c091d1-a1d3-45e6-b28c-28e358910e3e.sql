
-- Shop-scoped promocodes
CREATE TABLE public.shop_promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  max_uses_per_user integer,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, code)
);

ALTER TABLE public.shop_promocodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.shop_promocodes AS RESTRICTIVE FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_promocodes" ON public.shop_promocodes AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Shop admin logs
CREATE TABLE public.shop_admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  admin_telegram_id bigint NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.shop_admin_logs AS RESTRICTIVE FOR ALL TO public USING (false);
CREATE POLICY "Service role manages shop_admin_logs" ON public.shop_admin_logs AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
