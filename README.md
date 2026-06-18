# SpotOn ⚽ — Premier League Prediction League

A friendly, Fantasy-PL-style web app where you and your mates predict Premier League
scores, get scored automatically, and climb a shared leaderboard. Create private
leagues, share an invite code, and let the app do the tedious maths after every
gameweek.

## How it works

1. Players sign in with a **magic link** (no passwords).
2. Someone creates a **league** and shares the **invite code**.
3. Before each gameweek deadline (first kick-off), everyone enters a **scoreline**
   for every match. Predictions are **hidden from other players until the deadline**.
4. Results are pulled automatically from [football-data.org](https://www.football-data.org)
   and each prediction is scored.
5. The **leaderboard** and per-gameweek **results** update automatically.

### Scoring (best single tier — points do not stack)

| Outcome | Points |
| --- | --- |
| Exact scoreline | **5** |
| Correct result + correct goal difference | **4** |
| Correct result only | **3** |
| Wrong result, but one team's goals exactly right | **1** |
| Otherwise / no prediction / submitted after kick-off | **0** |

The scoring logic lives in [`lib/scoring.ts`](lib/scoring.ts) and is covered by unit
tests in [`lib/scoring.test.ts`](lib/scoring.test.ts) (`npm test`).

> Advanced rules from the original game — Wildcard, Big Match double points, season
> winner / top scorer / relegation bonuses, mini-games — are **not in this first
> version**, but the database already reserves room for them (see
> `supabase/migrations/0001_init.sql`).

---

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** — Postgres, Auth (magic link), and Row Level Security
- **football-data.org** free tier for fixtures & results
- Deploys free on **Vercel** (with a Vercel Cron job for result syncing)

---

## Setup (local)

You'll need free accounts on **Supabase**, **football-data.org**, and (to deploy)
**Vercel**. Node.js 20+ is required.

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

1. Create a new project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** and run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then
   [`supabase/migrations/0002_push_and_reminders.sql`](supabase/migrations/0002_push_and_reminders.sql).
   These create all tables, the scoring-privacy RLS policies, the
   create/join-league functions, and the push-notification tables.

### 3. Get a football data API key

Register for a free token at
[football-data.org/client/register](https://www.football-data.org/client/register).
The free tier covers the Premier League (competition `PL`).

### 4. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (**server-only, keep secret**) |
| `FOOTBALL_DATA_API_KEY` | Your football-data.org token |
| `ADMIN_EMAILS` | Comma-separated emails allowed to sync fixtures & edit results (you + your brother) |
| `CRON_SECRET` | Any long random string |
| `NEXT_PUBLIC_DEFAULT_SEASON` | Season start year, e.g. `2025` for 2025/26 |

### 5. Allow the auth redirect

In Supabase → **Authentication → URL Configuration**, add your dev URL to
**Redirect URLs**:

```
http://localhost:3000/auth/callback
```

(and later your production URL, e.g. `https://your-app.vercel.app/auth/callback`).

### 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with a magic link, then:

- Visit **/admin** (only works if your email is in `ADMIN_EMAILS`) and click
  **Sync fixtures & results** to import the season.
- Create a league, share the code, and start predicting.

---

## Install on your phone (PWA)

SpotOn is an installable web app — no app store needed.

- **Android (Chrome):** open the site → menu → **Add to Home screen**.
- **iPhone (Safari):** open the site → Share → **Add to Home Screen**. Open SpotOn
  from the new home-screen icon (push notifications on iOS only work from the
  installed app).

Then on the dashboard tap **Enable reminders** and allow notifications. You'll get a
push 3 hours and 1 hour before each gameweek deadline — but only if you haven't
locked in all your predictions yet.

## Scheduling (sync + reminders)

Vercel's free plan only runs cron once a day, so the every-15-minutes schedule is
driven by **GitHub Actions** ([`.github/workflows/cron.yml`](.github/workflows/cron.yml)).
After deploying, add two repo secrets under **Settings → Secrets and variables →
Actions**:

| Secret | Value |
| --- | --- |
| `APP_URL` | Your deployed URL, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `CRON_SECRET` | The same `CRON_SECRET` value as in your Vercel env vars |

Web Push needs VAPID keys (already in `.env.local.example`). Generate a pair with:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

## Deploy to Vercel

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com).
2. Add **all** the environment variables from `.env.local` in the Vercel project
   settings (Production + Preview).
3. Add your production callback URL to Supabase **Redirect URLs**
   (`https://<your-app>.vercel.app/auth/callback`).
4. The result sync runs automatically every 6 hours via `vercel.json`'s cron entry,
   which calls `/api/cron/sync` with your `CRON_SECRET`. You can change the schedule
   there.

---

## Running the game each week

- **Predictions** are open until a gameweek's deadline (its first kick-off). After
  that the gameweek locks and everyone's picks become visible on the results page.
- **Scores** update automatically as the cron sync runs, or instantly when an admin
  clicks **Sync** on `/admin`.
- **Postponed / rescheduled / cancelled games:** the sync follows the API, but an
  admin can also manually set a fixture's status or correct a score under
  **/admin → Manual overrides**. Saving re-scores affected predictions.

## Loading a new season (e.g. 26/27)

When the new schedule is released:

1. Bump `NEXT_PUBLIC_DEFAULT_SEASON` to the new start year (e.g. `2026`).
2. Run a **Sync** from `/admin` to import the new fixtures.
3. Create new leagues for the season (each league is tied to one season).

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm test` | Run the scoring unit tests |
| `npm run lint` | Lint |

## Project layout

```
app/                     Routes (dashboard, login, leagues, predict, review, admin, api)
  actions.ts             Server actions (create/join league, save predictions, admin)
components/              Client components (forms, buttons)
lib/
  scoring.ts             Pure scoring engine (+ scoring.test.ts)
  sync.ts                football-data.org -> DB sync and result scoring
  football.ts            API client
  supabase/              Browser, server, service-role clients + session helper
  types.ts, format.ts    Shared types and formatting
supabase/migrations/     SQL schema + RLS
proxy.ts                 Auth session refresh / route protection (Next 16 "proxy")
```
