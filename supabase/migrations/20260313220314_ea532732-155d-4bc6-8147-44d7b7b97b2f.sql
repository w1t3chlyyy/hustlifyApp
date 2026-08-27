
-- Create separate seller_sessions table to avoid session conflicts
CREATE TABLE public.seller_sessions (
  telegram_id bigint NOT NULL,
  shop_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'idle',
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_id, shop_id)
);

-- Enable RLS
ALTER TABLE public.seller_sessions ENABLE ROW LEVEL SECURITY;

-- No public access
CREATE POLICY "No public access" ON public.seller_sessions FOR ALL TO public USING (false);

-- Service role full access
CREATE POLICY "Service role manages seller_sessions" ON public.seller_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
