-- ============================================================================
-- BUGFIX: "не приходят уведомления о заказах" (order fulfillment notifications
-- never arrive).
--
-- Root cause: pg_cron and pg_net were enabled back in migration
-- 20260412154635_..., clearly meant to schedule the notify-pending-fulfillments
-- edge function, but the actual cron.schedule(...) call was never added. The
-- function itself works fine (writes to pending_notifications, delivers via
-- Telegram) — it was simply never being invoked automatically.
--
-- This job calls the edge function once a minute and passes the same
-- ENFORCE_JOB_SECRET the function already checks for (see
-- supabase/functions/notify-pending-fulfillments/index.ts).
--
-- ⚠️ ONE-TIME MANUAL STEP AFTER RUNNING THIS MIGRATION:
-- The secret value can't live in a git-committed migration file, so store it
-- in Supabase Vault once, via the SQL editor on the deployed project
-- (must match whatever you set with `supabase secrets set ENFORCE_JOB_SECRET=...`):
--
--   select vault.create_secret(
--     'ВАШ_ENFORCE_JOB_SECRET_ЗНАЧЕНИЕ',
--     'notify_fulfillments_job_secret'
--   );
--
-- If you ever rotate ENFORCE_JOB_SECRET, update the vault secret too:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'notify_fulfillments_job_secret'),
--     'НОВОЕ_ЗНАЧЕНИЕ'
--   );
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'notify-pending-fulfillments';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notify-pending-fulfillments',
  '* * * * *', -- every minute
  $cron$
  SELECT net.http_post(
    url := 'https://unjcwqmgthsvoyoeaxdd.supabase.co/functions/v1/notify-pending-fulfillments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-job-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_fulfillments_job_secret'),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
