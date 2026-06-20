# SpotOn — Premium Redesign (design spec)

## Context

SpotOn (Next.js 16 + Tailwind v4, live at spoton.fun) works well but looks bland:
flat cards, a plain top header, and a generated football icon. The owner wants it to
feel like a real, premium app with a best-in-class mobile experience. This spec covers a
**visual + UX redesign only — no changes to game logic, scoring, auth, sync, or data
model.**

## Goals

- Premium "real app" feel: depth, refined dark palette, sharp typography, tasteful motion.
- Best-in-class mobile experience, led by an app-style bottom tab bar.
- A proper brand: logo + app icon.

## Non-goals

- No changes to predictions, scoring, leagues, reminders, sync, or DB schema.
- Not building the multi-competition feature (separate, deferred work).

## Locked decisions

- **Aesthetic:** sleek premium dark.
- **Accent:** green = points/positive/success; pink = highlights + live/urgent (deadlines,
  "● Ongoing"); gold/silver/bronze for top-3 ranks.
- **Navigation:** bottom tab bar on mobile (Leagues · Predict · Results · Profile); top bar
  on desktop.
- **Logo:** a football inside a crosshair/target ("spot on" = precision + football) + a
  "SpotOn" wordmark. Created in Canva, exported to PNG/SVG.

## Visual system

- **Palette (CSS variables in `app/globals.css`):** deepen the base to a near-black purple
  (`--background ~#0e0a16`) with layered surfaces (`--surface`, `--surface-2`, `--elevated`)
  and a hairline border token. Replace the current flat green/pink with tuned tokens:
  `--accent` (green) for positive, `--live` (pink) for urgent, plus `--gold/--silver/--bronze`.
- **Depth:** cards get a subtle top-light gradient + soft shadow + 1px translucent border;
  active/hover gets a faint accent ring. (Gradients in real CSS — the mockup tool can't show
  them, but the build will.)
- **Typography:** larger, bolder headings; body unchanged; **tabular numbers**
  (`font-variant-numeric: tabular-nums`) for all scores/points/leaderboard figures.
- **Motion:** keep existing tap feedback; add smooth route transitions, a **confetti burst on
  an exact-score (5 pt) result**, and subtle list fade-ins. Respect `prefers-reduced-motion`.

## Navigation

- New `components/BottomNav.tsx` (client): fixed bottom bar, frosted (backdrop-blur),
  4 tabs with Tabler-style icons + labels, active tab in accent. Hidden on `/login`.
  Safe-area padding for iPhone home indicator (`env(safe-area-inset-bottom)`).
- Desktop (`sm+`): hide bottom bar, keep a slim top bar with the logo.
- **Tab routes:** Leagues → `/`; Predict → a new `/predict` index (lists the user's
  leagues' open gameweeks, or deep-links to the active one); Results → `/results` index
  (recent locked gameweeks); Profile → new `/profile` (display name edit, notifications
  toggle, sign out). Profile absorbs the current header actions.
- Add bottom padding to `main` so content clears the bar.

## Screen upgrades

- **Login (`/login`):** centered logo + tagline, branded card, the existing OTP flow.
- **Leagues / home (`/`):** logo header, league switcher chip, **leaderboard with medals**
  for top 3 and the current user's row highlighted, and a **next-gameweek card** with a live
  countdown + progress bar + primary CTA. Keep create/join + notifications entry.
- **Predict (`/predict/[gw]`):** keep per-team rows; bigger flags, nicer numeric steppers,
  sticky save bar.
- **Results (`/leagues/[id]/gw/[gw]`):** keep the matrix + live Ongoing/HT/FT; apply new
  surfaces, tabular numbers, medal accents on GW totals.
- **Profile (`/profile`):** edit display name (writes `profiles.display_name`), reminders
  toggle (reuse `EnableNotifications`), sign out.

## New / changed components

- `components/Logo.tsx` — renders the wordmark + mark (uses the Canva asset in `public/`).
- `components/BottomNav.tsx` — mobile tab bar.
- `components/Countdown.tsx` (client) — live "locks in 3h 12m" timer.
- `components/Confetti.tsx` (client) — lightweight canvas burst, triggered on the review
  page when the viewer has any exact-score result.
- `components/Podium.tsx` or inline — medal styling for the leaderboard.
- Reuse: `TeamBadge`, `LocalTime`, `Skeleton`, `EnableNotifications`, `PredictionForm`.

## Brand assets (Canva)

- Generate logo (crosshair + football + "SpotOn" wordmark) and an app icon.
- Export and place in `public/` (logo SVG/PNG; regenerate `icon-192/512/maskable`,
  `apple-touch-icon`). Update `app/manifest.ts` + `app/layout.tsx` references.

## Accessibility

- Maintain contrast on the darker palette; visible focus rings; tab bar items have
  `aria-label`/`aria-current`; honor `prefers-reduced-motion` for confetti/transitions;
  tap targets ≥ 44px.

## Verification

- `npm run build` + `npm test` green.
- Manual mobile check (responsive preview / phone): bottom nav works and routes correctly,
  safe-area spacing correct, leaderboard medals + countdown render, predict rows handle long
  names, confetti fires on an exact-score result, login/profile look right.
- Deploy to spoton.fun; confirm installed PWA still launches and the new icon shows.

## Rollout

- Single redesign branch, incremental commits (tokens → nav → screens → brand), build-verify
  before deploy.
