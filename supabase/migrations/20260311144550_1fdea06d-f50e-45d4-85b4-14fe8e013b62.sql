
-- 1. Create rate_limits table for tracking request rates
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (identifier, action, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour via a scheduled approach
-- For now we'll clean up inline in edge functions

-- RLS: no public access at all
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.rate_limits
  FOR ALL TO public USING (false);

-- 2. Remove the overly permissive inventory_items read policy
-- This policy leaks digital goods content to ANY user who knows an order_id
DROP POLICY IF EXISTS "Users can read sold inventory items" ON public.inventory_items;

-- 3. Tighten balance_history: remove the public read policy  
-- (will be served via edge function instead)
DROP POLICY IF EXISTS "Balance history publicly readable" ON public.balance_history;

-- 4. Tighten orders: remove public read policy
-- (will be served via edge function instead)
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;

-- 5. Tighten order_items: remove public read policy
DROP POLICY IF EXISTS "Order items are publicly readable" ON public.order_items;

-- 6. Tighten user_profiles: remove public read policy
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.user_profiles;

-- 7. Tighten reviews: keep public read (reviews are meant to be public)
-- No change needed for reviews

-- 8. Add service_role SELECT policies for tables that need server-side reads
CREATE POLICY "Service role reads orders" ON public.orders
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role reads order_items" ON public.order_items
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role reads balance_history" ON public.balance_history
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role reads user_profiles" ON public.user_profiles
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role reads inventory_items" ON public.inventory_items
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role manages inventory_items" ON public.inventory_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages rate_limits" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
