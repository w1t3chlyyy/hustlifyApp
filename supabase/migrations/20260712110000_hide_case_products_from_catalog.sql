-- ============================================
-- Products that are only meant to be bought through a specific
-- flow (e.g. cases' "Добавить в корзину") shouldn't also show up
-- as regular tiles in the catalog / homepage showcase / "similar
-- products". hidden_from_catalog keeps them fully purchasable
-- (cart + checkout don't look at this flag at all) while hiding
-- them from general browsing.
-- ============================================
ALTER TABLE public.products
  ADD COLUMN hidden_from_catalog boolean NOT NULL DEFAULT false;

-- The case-linked products created in the previous migration were
-- never meant to be browsed directly — hide them now.
UPDATE public.products SET hidden_from_catalog = true
WHERE id IN (
  SELECT product_id FROM public.cases WHERE product_id IS NOT NULL
  UNION
  SELECT miniapp_product_id FROM public.cases WHERE miniapp_product_id IS NOT NULL
);
