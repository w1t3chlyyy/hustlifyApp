-- ============================================
-- Восстановление / актуализация проекта CURSOR
-- Идемпотентно: можно запускать сколько угодно раз,
-- ничего не задублирует.
-- ============================================

-- 1) Сам проект (магазин "CURSOR")
INSERT INTO public.projects (id, title, subtitle, description, icon, sort_order, is_active)
VALUES (
  'cursor',
  'CURSOR',
  'Цифровые товары',
  'Подписки, NFT-товары, звёзды Telegram и аренда NFT-юзернеймов.',
  '🪙',
  3,
  true
)
ON CONFLICT (id) DO UPDATE SET
  title       = EXCLUDED.title,
  subtitle    = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  is_active   = true,
  updated_at  = now();

-- 2) Telegram Premium — сроки и цены как на скриншоте (3/6/12 мес)
UPDATE public.products
SET
  term_options = '[{"months":3,"price":14},{"months":6,"price":20},{"months":12,"price":35}]'::jsonb,
  subtitle = 'Подписка с моментальной активацией',
  is_active = true
WHERE project_id = 'cursor' AND product_type = 'premium_term';

INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, stock, sort_order, term_options, is_active)
SELECT
  'cursor', 'premium_term', 'Telegram Premium', 'Подписка с моментальной активацией',
  'Активация Telegram Premium на выбранный срок.', 0, 999, 1,
  '[{"months":3,"price":14},{"months":6,"price":20},{"months":12,"price":35}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.products WHERE project_id = 'cursor' AND product_type = 'premium_term'
);

-- 3) Telegram Stars — $0.020 за звезду, слайдер 0..10000, шаг ввода от 50
UPDATE public.products
SET
  price = 0.020,
  subtitle = '$0.020 за звезду',
  min_qty = 50,
  max_qty = 10000,
  is_active = true
WHERE project_id = 'cursor' AND product_type = 'stars';

INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, stock, sort_order, min_qty, max_qty, is_active)
SELECT
  'cursor', 'stars', 'Telegram Stars', '$0.020 за звезду',
  'Покупка звёзд Telegram по выгодному курсу.', 0.020, 999999, 2, 50, 10000, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.products WHERE project_id = 'cursor' AND product_type = 'stars'
);

-- Примечание: карточка "NFT подарки" со ссылкой на
-- https://t.me/CursorRobot?start=ref_7912202824
-- зашита прямо в код (src/pages/Project.tsx, компонент CursorNftGiftsCard)
-- и рендерится автоматически для любого проекта с id = 'cursor'.
-- Отдельная запись в products для неё не нужна.
