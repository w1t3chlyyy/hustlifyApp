-- Moderators: Telegram users granted their own password to log into the
-- web admin panel (/admin), added via the "🛡 Модераторы" section of the bot.
-- They are separate from ADMIN_TELEGRAM_IDS (bot admin menu access) and from
-- ADMIN_PASSWORD (the owner's login) — this lets the owner hand out limited,
-- revocable admin-panel credentials without sharing their own password.

CREATE TABLE IF NOT EXISTS public.moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  added_by bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (used by admin-api and the bot) can
-- read/write this table, matching the pattern used by admin_sessions etc.

CREATE INDEX IF NOT EXISTS idx_moderators_active ON public.moderators(is_active);
