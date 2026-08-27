-- Идемпотентный фикс: гарантирует, что таблица moderators существует
-- и содержит все нужные колонки (в т.ч. is_active).
CREATE TABLE IF NOT EXISTS public.moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  added_by bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderators ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.moderators ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.moderators ADD COLUMN IF NOT EXISTS added_by bigint;
ALTER TABLE public.moderators ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_moderators_active ON public.moderators(is_active);
