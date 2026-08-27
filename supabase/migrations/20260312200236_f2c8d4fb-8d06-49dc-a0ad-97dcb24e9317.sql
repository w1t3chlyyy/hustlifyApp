
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_subscription_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_channel_link text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS required_channel_id text DEFAULT NULL;
