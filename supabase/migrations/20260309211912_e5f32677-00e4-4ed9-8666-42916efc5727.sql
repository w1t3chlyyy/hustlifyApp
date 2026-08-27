
-- Add fields to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_note text;

-- Create balance_history table
CREATE TABLE IF NOT EXISTS public.balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'credit',
  comment text NOT NULL DEFAULT '',
  admin_telegram_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.balance_history FOR ALL USING (false);

-- Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product-images bucket
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Allow service_role to upload to product-images
CREATE POLICY "Service role uploads product images" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'product-images');

-- Insert default shop_settings
INSERT INTO public.shop_settings (key, value) VALUES
  ('shop_name', 'Digital Store'),
  ('support_username', 'paveldurov'),
  ('currency', 'USD')
ON CONFLICT (key) DO NOTHING;
