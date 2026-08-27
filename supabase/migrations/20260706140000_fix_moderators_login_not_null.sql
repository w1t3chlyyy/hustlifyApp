-- В боевой базе таблица moderators содержит унаследованную колонку "login"
-- с ограничением NOT NULL, которую код бота никогда не заполняет
-- (текущая логика опознаёт модераторов по telegram_id, а не по login/паролю
-- в отдельном текстовом поле). Снимаем обязательность, чтобы вставка
-- новых модераторов через бота не падала с ошибкой
-- "null value in column login violates not-null constraint".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'moderators' AND column_name = 'login'
  ) THEN
    ALTER TABLE public.moderators ALTER COLUMN login DROP NOT NULL;
  END IF;
END $$;
