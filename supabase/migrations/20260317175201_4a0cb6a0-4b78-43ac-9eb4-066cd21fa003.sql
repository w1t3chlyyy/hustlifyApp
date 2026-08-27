
-- Add legal consent tracking to platform_users
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pd_consent_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
