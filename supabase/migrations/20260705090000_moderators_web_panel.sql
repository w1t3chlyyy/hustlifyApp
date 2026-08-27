-- Moderators added via the Telegram bot by a super-admin (ADMIN_TELEGRAM_IDS).
-- Gives them a login/password pair for the separate static web admin panel
-- (see /admin-panel in the repo). This does NOT grant them bot admin access —
-- that stays limited to ADMIN_TELEGRAM_IDS, unchanged.
create table if not exists public.moderators (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  login text not null unique,
  password_hash text not null,
  pending_password text,
  role text not null default 'moderator',
  added_by bigint,
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;
-- No public policies on purpose: only the service-role key (bot + admin-api
-- edge function) may read/write this table.

-- Opaque session tokens for the web admin panel (custom login, not Supabase Auth).
create table if not exists public.admin_web_sessions (
  token text primary key,
  moderator_id uuid not null references public.moderators(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.admin_web_sessions enable row level security;

-- Default super-admin login for the standalone web panel: admin / 123
-- CHANGE THIS PASSWORD as soon as you deploy — add a real moderator from the
-- bot's "🛡 Модераторы" menu and stop using this default account.
insert into public.moderators (login, password_hash, role, delivered)
values ('admin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'superadmin', true)
on conflict (login) do nothing;
