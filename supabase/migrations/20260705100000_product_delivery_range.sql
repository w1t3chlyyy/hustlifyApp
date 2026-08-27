-- Configurable delivery time estimate for non-instant products.
-- Previously the "от 1 до 24 часов" text on the product page was hardcoded;
-- now it's driven by these columns and editable per-product from /admin.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_min integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delivery_max integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS delivery_unit text NOT NULL DEFAULT 'hours'
    CHECK (delivery_unit IN ('hours', 'days'));
