-- ============================================
-- CASES table — powers the "Наши кейсы" section
-- Fully editable from the new web admin panel:
-- image, badges, highlight/glow, background color,
-- price, description, CTA link, etc.
-- ============================================
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  old_price numeric(10,2),
  image_url text,

  -- badge shown on the card, e.g. "Хит продаж" / "Коллаборация" / custom text
  badge_type text NOT NULL DEFAULT 'none' CHECK (badge_type IN ('none', 'hit', 'custom')),
  badge_text text NOT NULL DEFAULT '',

  -- "Осталось N мест" urgency badge; NULL = hidden
  spots_left integer,

  -- neon highlight / glow toggle + color
  highlight_enabled boolean NOT NULL DEFAULT false,
  highlight_color text NOT NULL DEFAULT '#ffffff',

  -- card background color override; NULL = default theme card background
  background_color text,

  cta_text text NOT NULL DEFAULT 'Подробнее',
  -- if set, purchase messages for this case go to this Telegram username instead of the global support one
  support_username text,
  -- if set, the CTA opens this URL directly instead of a prefilled Telegram message
  external_link text,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cases are publicly readable" ON public.cases FOR SELECT USING (is_active = true);
CREATE POLICY "Service role manages cases" ON public.cases FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_cases_sort ON public.cases(sort_order);

-- Seed with the 4 cases currently hardcoded in the frontend
INSERT INTO public.cases (slug, title, short_description, full_description, price, old_price, image_url, badge_type, badge_text, spots_left, highlight_enabled, sort_order) VALUES
('business', 'Бизнес под ключ',
  'Антикризисный пакет для предпринимателей, чей бизнес встал на месте',
  E'Антикризисный пакет для предпринимателей, чей бизнес не приносит денег или встал на месте.\n\nЧто вы получаете:\n· Готовый бот-магазин с Mini App на 2 месяца — 0 ₽\n· Личного куратора по трафику, продажам и ведению\n· Полное оформление проекта (аватарка, логотип, баннеры)\n· Контент-план для канала и витрины\n· Бесплатные товары на реализацию + база поставщиков\n\nКак это работает:\nВами занимаются профессионалы. Вы просто наблюдаете за ростом бизнеса и перестаёте тратить нервы на вопрос «почему нет продаж?».',
  3490, 14900, '/cases/business.png', 'none', '', NULL, false, 1),
('standard', 'Стандарт',
  'В кейс входит базовая упаковка и стартовое продвижение',
  'При покупке кейса студия дизайна делает вам Фирменный логотип (3D и 2D), 3 статичных баннера. Накручиваем до 1000 реакций / просмотров / подписчиков.',
  2589, 3100, '/cases/standard.jpg', 'none', '', NULL, false, 2),
('extended', 'Расширенный',
  'В кейс входит полное оформление и помощь в продвижении',
  'При покупке кейса студия дизайна делает вам Фирменный логотип, 3 статичных баннера, мини-лендинг. Накручиваем до 5000 реакций / просмотров / подписчиков. Выдаём план продвижения с выходом на доход в конце месяца.',
  3289, 4000, '/cases/extended.jpg', 'hit', 'Хит продаж', NULL, false, 3),
('premium', 'Премиум',
  'Полностью выстраиваем систему. Выходим на крупные платформы. Полное оформление',
  'При покупке кейса студия дизайна делает вам Фирменный логотип, 4 статичных баннера, лендинг, 5 уникальных постов. Накручиваем до 10000 реакций / просмотров / подписчиков.',
  4289, 5500, '/cases/premium.jpg', 'none', '', NULL, false, 4);
