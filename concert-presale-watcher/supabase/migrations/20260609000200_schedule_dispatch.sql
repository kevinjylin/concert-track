-- Configure these database settings before enabling the schedule:
-- alter database postgres set app.settings.dispatch_url = 'https://www.uground.app/api/internal/dispatch';
-- alter database postgres set app.settings.cron_secret = '<CRON_SECRET>';
--
-- Requires the Supabase pg_cron and pg_net extensions.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'uground-dispatch-every-minute') then
    perform cron.unschedule('uground-dispatch-every-minute');
  end if;

  if current_setting('app.settings.dispatch_url', true) is not null
     and current_setting('app.settings.cron_secret', true) is not null then
    perform cron.schedule(
      'uground-dispatch-every-minute',
      '* * * * *',
      format(
        $schedule$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := '{}'::jsonb
        );
        $schedule$,
        current_setting('app.settings.dispatch_url'),
        current_setting('app.settings.cron_secret')
      )
    );
  end if;
end;
$$;

