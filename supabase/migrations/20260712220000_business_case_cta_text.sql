-- Кейс «Бизнес под ключ»: вместо стандартной кнопки "Подробнее"
-- показываем "MiniApp +15$", подсвечивая доступный апгрейд кейса.
UPDATE public.cases
SET cta_text = 'MiniApp +15$'
WHERE slug = 'business';
