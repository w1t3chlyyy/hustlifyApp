
CREATE TABLE public.platform_retention_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  message_text text NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX idx_retention_log_telegram ON public.platform_retention_log (telegram_id);

ALTER TABLE public.platform_retention_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.platform_retention_log FOR ALL TO public USING (false);
CREATE POLICY "Service role manages retention_log" ON public.platform_retention_log FOR ALL TO service_role USING (true) WITH CHECK (true);
