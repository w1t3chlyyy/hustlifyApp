-- ============================================
-- Give every case a real product to add to the cart.
-- Mirrors each case's current title/price/image as a normal
-- "flux" (design) product with manual delivery (a person fulfils
-- it, same as it always was — just now paid through the cart
-- instead of a manual Telegram chat).
--
-- "Бизнес под ключ" additionally gets a second, higher-priced
-- product for the MiniApp add-on (+$15, converted at today's
-- rate ≈ 77 ₽/$ → +1155 ₽, rounded to +1150 ₽). Adjust the price
-- of either product any time from Admin → Товары — the case just
-- points at whichever product id you put in Admin → Кейсы.
-- ============================================
DO $$
DECLARE
  v_standard_id uuid;
  v_extended_id uuid;
  v_premium_id uuid;
  v_business_id uuid;
  v_business_miniapp_id uuid;
BEGIN
  INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, old_price, stock, delivery_type, image, sort_order)
  VALUES ('flux', 'simple', 'Кейс «Стандарт»', 'Базовая упаковка и стартовое продвижение',
    'При покупке кейса студия дизайна делает вам фирменный логотип (3D и 2D), 3 статичных баннера. Накручиваем до 1000 реакций / просмотров / подписчиков.',
    2589, 3100, 999, 'manual', '/cases/standard.jpg', 50)
  RETURNING id INTO v_standard_id;

  INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, old_price, stock, delivery_type, image, sort_order)
  VALUES ('flux', 'simple', 'Кейс «Расширенный»', 'Полное оформление и помощь в продвижении',
    'При покупке кейса студия дизайна делает вам фирменный логотип, 3 статичных баннера, мини-лендинг. Накручиваем до 5000 реакций / просмотров / подписчиков. Выдаём план продвижения с выходом на доход в конце месяца.',
    3289, 4000, 999, 'manual', '/cases/extended.jpg', 51)
  RETURNING id INTO v_extended_id;

  INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, old_price, stock, delivery_type, image, sort_order)
  VALUES ('flux', 'simple', 'Кейс «Премиум»', 'Полностью выстраиваем систему',
    'При покупке кейса студия дизайна делает вам фирменный логотип, 4 статичных баннера, лендинг, 5 уникальных постов. Накручиваем до 10000 реакций / просмотров / подписчиков.',
    4289, 5500, 999, 'manual', '/cases/premium.jpg', 52)
  RETURNING id INTO v_premium_id;

  INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, old_price, stock, delivery_type, image, sort_order)
  VALUES ('flux', 'simple', 'Кейс «Бизнес под ключ»', 'Антикризисный пакет для предпринимателей',
    E'Антикризисный пакет для предпринимателей, чей бизнес не приносит денег или встал на месте.\n\nЧто вы получаете:\n· Готовый бот-магазин с Mini App на 2 месяца — 0 ₽\n· Личного куратора по трафику, продажам и ведению\n· Полное оформление проекта (аватарка, логотип, баннеры)\n· Контент-план для канала и витрины\n· Бесплатные товары на реализацию + база поставщиков',
    3490, 14900, 999, 'manual', '/cases/business.png', 53)
  RETURNING id INTO v_business_id;

  INSERT INTO public.products (project_id, product_type, title, subtitle, description, price, old_price, stock, delivery_type, image, sort_order)
  VALUES ('flux', 'simple', 'Кейс «Бизнес под ключ» + MiniApp', 'То же самое + готовое MiniApp-приложение',
    E'Всё содержимое кейса «Бизнес под ключ» плюс собственное Telegram MiniApp для вашего магазина.\n\nНаценка +15$ (по текущему курсу) за MiniApp-версию.',
    4640, NULL, 999, 'manual', '/cases/business.png', 54)
  RETURNING id INTO v_business_miniapp_id;

  UPDATE public.cases SET product_id = v_standard_id WHERE slug = 'standard';
  UPDATE public.cases SET product_id = v_extended_id WHERE slug = 'extended';
  UPDATE public.cases SET product_id = v_premium_id WHERE slug = 'premium';
  UPDATE public.cases SET product_id = v_business_id, miniapp_product_id = v_business_miniapp_id WHERE slug = 'business';
END $$;
