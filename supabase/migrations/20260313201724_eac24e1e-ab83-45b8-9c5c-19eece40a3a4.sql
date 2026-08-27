
-- Add subscription fields to platform_users
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_price_usd numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS first_paid_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamp with time zone DEFAULT NULL;
