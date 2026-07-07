# UGround

Watch-and-alert site for artists.

This repo is now set up as:

- `apps/web`: Next.js dashboard + API routes
- `apps/worker`: polling worker (calls `POST /api/poll` on an interval)
- `supabase/migrations`: versioned production schema and scheduler changes
- `database/schema.sql`: bootstrap-only legacy schema

## MVP flow

1. Add artists to your watchlist (manual or Spotify artist ID import).
2. Poll Ticketmaster + Eventbrite for each followed artist.
3. Normalize to one `events` table and snapshot raw source payloads.
4. Detect changes (`new_event`, `status_changed`, `ticket_url_changed`, `on_sale_moved_earlier`).
5. Send alerts to Discord/email/SMS when configured.

## Database setup (Supabase Postgres)

1. Create a Supabase project.
2. Link the Supabase CLI and apply `supabase/migrations` in timestamp order.
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
- Canonical links: `APP_URL=https://www.uground.app`
- Detailed health checks: `INTERNAL_HEALTH_SECRET`
- Partner feeds: `SONGKICK_API_KEY`, `BANDSINTOWN_APP_ID`

Optional poll protection:

- Set `POLL_SECRET` in web and worker.
- Set `CRON_SECRET` in Vercel if you use the built-in scheduled poll.

Supabase Auth redirect URLs:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://<your-vercel-domain>/auth/callback`
- Google Cloud OAuth should use Supabase's callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

## Run

From `concert-presale-watcher`:

```bash
npm ci
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
- `GET/POST /api/watch-rules`
- `DELETE /api/watch-rules/:id`
- `POST /api/watchlist/import-spotify`
- `POST /api/integrations/spotify/import-preview`
- `POST /api/integrations/spotify/import`
- `GET /api/events`
- `GET /api/alerts`
- `GET /api/source-status`
- `GET/PUT /api/notification-settings`
- `POST /api/notification-settings/test-discord`
- `POST /api/notification-settings/send-email-confirmation`
- `GET /api/notification-settings/confirm-email`
- `POST /api/notification-settings/send-sms-confirmation`
- `POST /api/notification-settings/confirm-sms`
- `POST /api/poll` (authenticated refresh queue)
- `POST /api/internal/dispatch` (secret-protected worker)
- `GET /api/cron/poll` (compatibility dispatcher)
- `GET /api/health`
- `GET /api/account/export`
- `DELETE /api/account`

## Deploy To Vercel

1. Import this repo into Vercel.
2. Set the Vercel project **Root Directory** to `concert-presale-watcher/apps/web`.
3. Add environment variables in Vercel Project Settings:
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Optional integrations: Ticketmaster/Songkick/Bandsintown/Spotify/Resend/Twilio/CRON_SECRET
   - Required canonical origin: `APP_URL`
   - Required for user alert destinations: `ALERT_SETTINGS_ENCRYPTION_KEY`
4. Deploy.

Notes:

- Supabase Auth protects the site and API with a `/login` page.
- Apply the scheduler migration after setting `app.settings.dispatch_url` and `app.settings.cron_secret` in Supabase. It invokes `/api/internal/dispatch` every minute and the database queue applies adaptive per-target cadence.
- GitHub Actions `poll.yml` is a manual fallback, not the primary scheduler.
- A separately deployed worker can consume the same queue with `WORKER_POLL_URL=https://<your-domain>/api/internal/dispatch`, `POLL_SECRET`, and `POLL_INTERVAL_MINUTES`.

## Notes

- User refreshes enqueue bounded work and never receive infrastructure secrets.
- If alert provider keys or user destinations are missing, alerts are still stored in DB.
- Eventbrite, AXS, and DICE remain disabled until approved partner access or a documented public-page terms review is complete.
