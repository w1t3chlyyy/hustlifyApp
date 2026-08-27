CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner','superadmin','support','finance','moderator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.platform_admins FOR ALL USING (false);
CREATE POLICY "Service role manages platform_admins" ON public.platform_admins FOR ALL TO service_role USING (true) WITH CHECK (true);