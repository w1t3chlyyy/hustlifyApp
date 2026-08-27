-- ============================================
-- Link cases to real products so "Добавить в корзину"
-- can reuse the existing (secure, server-price-verified)
-- cart/checkout pipeline instead of inventing a new one.
--
-- product_id          — the product added to cart for a plain purchase.
-- miniapp_product_id   — optional; when set, the storefront shows a
--                        "Добавить MiniApp-версию" checkbox and adds this
--                        product instead (its price already includes the
--                        markup — set it directly in the linked product).
--
-- Both are nullable: cases without a linked product keep the old
-- "message support in Telegram" behaviour untouched.
-- ============================================
ALTER TABLE public.cases
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN miniapp_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
