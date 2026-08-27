
-- Add bot metadata columns to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bot_username text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bot_id bigint;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS webhook_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bot_validated_at timestamptz;

-- Create shop_categories table for tenant-specific categories
CREATE TABLE IF NOT EXISTS public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '⚡',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

-- Public can read active categories from active shops
CREATE POLICY "Public reads active shop_categories" ON public.shop_categories
  FOR SELECT TO public USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.shops WHERE shops.id = shop_categories.shop_id AND shops.status = 'active'
    )
  );

-- Service role full access
CREATE POLICY "Service role manages shop_categories" ON public.shop_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);
