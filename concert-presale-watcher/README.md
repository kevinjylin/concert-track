# Concert Presale Watcher (MVP)

Watch-and-alert site for artists.

This repo is now set up as:

- `apps/web`: Next.js dashboard + API routes
- `apps/worker`: polling worker (calls `POST /api/poll` on an interval)
- `database/schema.sql`: Postgres schema for artists/events/snapshots/alerts

## MVP flow

1. Add artists to your watchlist (manual or Spotify artist ID import).
2. Poll Ticketmaster + Eventbrite for each followed artist.
3. Normalize to one `events` table and snapshot raw source payloads.
4. Detect changes (`new_event`, `status_changed`, `ticket_url_changed`, `on_sale_moved_earlier`).
5. Send alerts to Discord/email/SMS when configured.

## Database setup (Supabase Postgres)

1. Create a Supabase project.
2. Run [`database/schema.sql`](./database/schema.sql) in SQL editor.
3. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into `apps/web/.env.local`.
4. Run [`database/supabase-auth-cutover.sql`](./database/supabase-auth-cutover.sql) only when migrating an existing custom-auth database with no users to preserve.

## Environment

Copy examples:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
```

Set whichever integrations you want:

- Ticketmaster: `TICKETMASTER_API_KEY`
- Eventbrite: `EVENTBRITE_PRIVATE_TOKEN`
- Spotify import: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Email alerts: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`
- SMS alerts: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`
- Per-user alert destinations: users enter Discord webhooks, email addresses, and phone numbers in the dashboard.
- Alert settings encryption: `ALERT_SETTINGS_ENCRYPTION_KEY` (generate with `openssl rand -base64 32`)
- Supabase Auth: enable Email and Google in the Supabase dashboard. Google client id/secret live in Supabase, not this app.

Optional poll protection:

- Set `POLL_SECRET` in web and worker.
- Set `CRON_SECRET` in Vercel if you use the built-in scheduled poll.

Supabase Auth redirect URLs:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://<your-vercel-domain>/auth/callback`
- Google Cloud OAuth should use Supabase's callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

## Run

From repo root:

```bash
npm install
npm run dev
```

Then run worker in another shell:

```bash
npm run dev --workspace=@apps/worker
```

Open `http://localhost:3000`.

## API routes

- `GET/POST /api/watchlist`
- `DELETE /api/watchlist/:id`
- `POST /api/watchlist/import-spotify`
- `GET /api/events`
- `GET /api/alerts`
- `GET/PUT /api/notification-settings`
- `POST /api/notification-settings/test-discord`
- `POST /api/notification-settings/send-email-confirmation`
- `GET /api/notification-settings/confirm-email`
- `POST /api/notification-settings/send-sms-confirmation`
- `POST /api/notification-settings/confirm-sms`
- `POST /api/poll`
- `GET /api/cron/poll`
- `GET /api/health`

## Deploy To Vercel

1. Import this repo into Vercel.
2. Set the Vercel project **Root Directory** to `concert-presale-watcher/apps/web`.
3. Add environment variables in Vercel Project Settings:
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Optional integrations: Ticketmaster/Eventbrite/Spotify/Resend/Twilio/POLL_SECRET/CRON_SECRET
   - Required for user alert destinations: `ALERT_SETTINGS_ENCRYPTION_KEY`
4. Deploy.

Notes:

- Supabase Auth protects the site and API with a `/login` page.
- `/api/poll` still works for your worker/cron when it sends `x-poll-secret` matching `POLL_SECRET`.
- Scheduled polling runs from GitHub Actions ([`.github/workflows/poll.yml`](../.github/workflows/poll.yml)), which hits `GET /api/cron/poll` daily with `Authorization: Bearer $CRON_SECRET`. Add `CRON_SECRET` under repo Settings → Secrets and variables → Actions; it can be the same value as `POLL_SECRET`. Optionally set repo variable `POLL_URL` to override the default `https://www.uground.app/api/cron/poll` (useful for staging).
- The cron schedule is `0 4 * * *` UTC, targeting 9 PM Los Angeles time during daylight saving time. It shifts to 8 PM LA during standard time; adjust to `0 5 * * *` then, or move polling to a timezone-aware scheduler.
- For more frequent checks, deploy `apps/worker` separately with `WORKER_POLL_URL=https://<your-vercel-domain>/api/poll`, `POLL_SECRET`, and `POLL_INTERVAL_MINUTES`.

## Notes

- Poll endpoint is admin-style for now (no user auth in MVP).
- If alert provider keys or user destinations are missing, alerts are still stored in DB.
- Start with one city + a constrained artist list before widening coverage.
