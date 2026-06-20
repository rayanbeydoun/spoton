# SpotOn Premium Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle SpotOn into a premium dark, app-like experience (bottom tab nav, refined visual system, brand logo) and fix the broken push reminders — without changing game logic.

**Architecture:** Pure presentation + navigation layer on top of the existing Next.js App Router app. New design tokens in `app/globals.css`; a mobile bottom tab bar plus index routes for Predict/Results and a new Profile page; visual polish on existing screens; a confirmation push added to the existing push API. No DB schema or scoring changes (the missing push table was already applied to the live DB).

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, Supabase (`@supabase/ssr`), web-push, Vercel.

## Global Constraints

- Work on the existing `redesign` git branch; never commit secrets (`.env.local` is gitignored).
- Do NOT change predictions/scoring/leagues/sync/auth/DB schema or `lib/scoring.ts`.
- Verify each task with `npm run build` (must pass) and `npm test` (14 scoring tests stay green).
- Visual changes are verified by build + manual mobile check (no unit tests for CSS).
- Keep `prefers-reduced-motion` honored for any animation.
- Tap targets ≥ 44px; respect iPhone safe area (`env(safe-area-inset-bottom)`).
- Two font weights only (400/500-ish already in use); use `tabular-nums` for score/point numbers.
- Deploy = push branch → Vercel preview URL (production `main` untouched until merge).

---

### Task 1: Design tokens + global visual system

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: CSS variables `--background, --surface, --surface-2, --elevated, --border, --foreground, --muted, --accent (green), --accent-fg, --live (pink), --gold, --silver, --bronze`; utility classes `.card`, `.btn-*`, `.input`, `.badge` (restyled); `.tnum` (tabular numbers).

- [ ] **Step 1: Deepen palette + add tokens.** In `:root`, set `--background:#0e0a16`, `--surface:#181125`, `--surface-2:#211733`, `--elevated:#2a1f40`, `--border:#3a2c55`, `--foreground:#f4eefb`, `--muted:#a99dc2`, `--accent:#2fe38a`, `--accent-fg:#06301f`, `--live:#ff3d83`, `--gold:#f3c44d`, `--silver:#c9d2e0`, `--bronze:#d8956a`. Mirror new tokens into the `@theme inline` block (`--color-surface-2`, `--color-elevated`, `--color-live`, `--color-gold`, etc.).
- [ ] **Step 2: Richer background.** Update `body` background to a layered radial + base using the new vars (keep it subtle, flat-ish).
- [ ] **Step 3: Card depth.** Restyle `.card` to `bg-surface/80` + 1px `border-border/70` + `shadow-lg shadow-black/30` + `rounded-2xl`; add a `.card-elevated` variant using `--elevated`.
- [ ] **Step 4: Tabular numbers.** Add `.tnum { font-variant-numeric: tabular-nums; }`.
- [ ] **Step 5: Motion + safe area base.** Add `@media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }` and a `.pb-safe { padding-bottom: env(safe-area-inset-bottom); }` helper.
- [ ] **Step 6: Verify.** Run `npm run build` → passes. Commit: `style: premium dark design tokens + card depth`.

---

### Task 2: Brand logo + app icon (Canva)

**Files:**
- Create: `public/logo.svg` (or `.png`), regenerate `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Create: `components/Logo.tsx`
- Modify: `app/layout.tsx` (header logo), `app/manifest.ts` (unchanged paths, confirm)

**Interfaces:**
- Produces: `<Logo size? variant?="full"|"mark" />` rendering the mark (+ wordmark).

- [ ] **Step 1: Generate via Canva MCP.** Use `mcp__canva__generate-design` (or `generate-design-structured`) with a prompt: "App logo for 'SpotOn', a football inside a thin crosshair/target, modern flat, deep purple background, green + white accents; also a horizontal wordmark version." Generate an icon (1:1) and a wordmark.
- [ ] **Step 2: Export + download.** Use `export-design` → download the PNG/SVG; save the icon to a temp path.
- [ ] **Step 3: Rasterize icons.** Update `scripts/generate-icons.mjs` to source the Canva mark, then run `node scripts/generate-icons.mjs` to (re)produce 192/512/maskable/apple-touch PNGs. (If Canva gives clean SVG, embed it in the script in place of the hand-drawn one.)
- [ ] **Step 4: Logo component.** Create `components/Logo.tsx`: a server component rendering `<img src="/logo.svg" ... />` for `variant="full"`, or the mark for `variant="mark"`, with a text fallback.
- [ ] **Step 5: Use in header.** Replace the emoji+text brand in `app/layout.tsx` with `<Logo />`.
- [ ] **Step 6: Verify.** `npm run build` passes; icon renders. Commit: `feat: SpotOn brand logo + refreshed app icons`.

---

### Task 3: Mobile bottom tab navigation

**Files:**
- Create: `components/BottomNav.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: current pathname (via `usePathname`).
- Produces: a fixed bottom nav (mobile only) with tabs Leagues `/`, Predict `/predict`, Results `/results`, Profile `/profile`.

- [ ] **Step 1: Component.** Create client `components/BottomNav.tsx`: `usePathname()`, an array of `{href,label,icon}` (inline SVG icons), render a `fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/80 backdrop-blur pb-safe sm:hidden` flex row; active tab (pathname match) in `text-accent`, else `text-muted`; each link `min-h-[44px]`.
- [ ] **Step 2: Hide on login.** In the component, return `null` when `pathname === "/login"`.
- [ ] **Step 3: Mount + spacing.** In `app/layout.tsx`, render `<BottomNav />` before `</body>`; add `pb-24 sm:pb-8` to `<main>` so content clears the bar; keep the top header but add `sm:` so it stays for desktop (or simplify to logo-only on mobile).
- [ ] **Step 4: Verify.** `npm run build` passes; on a narrow viewport the bar shows and routes; hidden on desktop. Commit: `feat: app-style bottom tab navigation`.

---

### Task 4: Profile tab

**Files:**
- Create: `app/profile/page.tsx`
- Modify: `app/actions.ts` (add `updateDisplayNameAction`)
- Modify: `app/layout.tsx` (remove sign-out/admin from header on mobile; keep on desktop)

**Interfaces:**
- Consumes: `createClient` (server), `EnableNotifications`.
- Produces: `updateDisplayNameAction(prev: FormState, formData): Promise<FormState>` updating `profiles.display_name` for `auth.uid()`.

- [ ] **Step 1: Server action.** In `app/actions.ts`, add `updateDisplayNameAction` (pattern of existing actions): read `name`, validate non-empty, `supabase.from("profiles").update({display_name}).eq("id", user.id)`, `revalidatePath("/profile")`, return `{ok:"Saved"}` / `{error}`.
- [ ] **Step 2: Profile page.** Create `app/profile/page.tsx` (server): load user + profile; render a display-name form (small client form using `useActionState`, like `CreateLeagueForm`), the `<EnableNotifications />` card, an Admin link if `isAdminEmail`, and a sign-out form (`/auth/signout`).
- [ ] **Step 3: Trim header.** In `app/layout.tsx`, hide the sign-out / admin / my-leagues header links on mobile (`hidden sm:flex`) since the bottom bar + Profile cover them.
- [ ] **Step 4: Verify.** `npm run build` + `npm test` pass; can edit name + see it persist. Commit: `feat: profile tab (name, reminders, sign out)`.

---

### Task 5: Predict + Results index pages (for the tabs)

**Files:**
- Create: `app/predict/page.tsx`, `app/results/page.tsx`

**Interfaces:**
- Consumes: `createClient`, existing tables; `isLocked`, `seasonLabel`, `LocalTime`.

- [ ] **Step 1: Predict index.** `app/predict/page.tsx` (server): find the user's leagues → their season+competition gameweeks that are NOT locked, list them as cards linking to `/predict/[gw]?league=[id]` with deadline (`LocalTime`) + predicted count. Empty state if none.
- [ ] **Step 2: Results index.** `app/results/page.tsx` (server): list the user's leagues' locked gameweeks, newest first, linking to `/leagues/[id]/gw/[gw]`. Empty state if none.
- [ ] **Step 3: Verify.** `npm run build` passes; both tabs load and link correctly. Commit: `feat: predict and results index pages`.

---

### Task 6: Countdown component

**Files:**
- Create: `components/Countdown.tsx`

**Interfaces:**
- Produces: `<Countdown iso={string} />` → live "locks in 3h 12m" / "Locked" text, updating each minute (client).

- [ ] **Step 1: Component.** Client component: `useState`/`useEffect` with a 30s interval computing the diff between `now` and `iso`; format `Xd Yh`, `Xh Ym`, `Xm`, or "Locked" when past. Use `--live` color when < 3h. `suppressHydrationWarning`.
- [ ] **Step 2: Verify.** `npm run build` passes. Commit: `feat: live countdown component`.

---

### Task 7: Home / Leagues screen upgrade

**Files:**
- Modify: `app/leagues/[id]/page.tsx`

**Interfaces:**
- Consumes: `Countdown`, `Logo`, `CopyInvite`, existing queries.

- [ ] **Step 1: Leaderboard medals.** Restyle the leaderboard: top-3 get gold/silver/bronze accents (trophy/medal mark + colored rank), current user's row highlighted (`bg-surface-2`), points use `.tnum text-accent`.
- [ ] **Step 2: Next-gameweek card.** Find the next non-locked gameweek; render a prominent card with `<Countdown>`, a progress bar (`mine/total predicted`), and a primary CTA → predict. Keep the full gameweek list below, restyled.
- [ ] **Step 3: Header.** Add league switcher chip styling; keep invite copy.
- [ ] **Step 4: Verify.** `npm run build` passes; leaderboard + next-GW card render. Commit: `feat: premium home/leaderboard with medals + next-gameweek card`.

---

### Task 8: Confetti on exact-score result

**Files:**
- Create: `components/Confetti.tsx`
- Modify: `app/leagues/[id]/gw/[gw]/page.tsx`

**Interfaces:**
- Produces: `<Confetti trigger={boolean} />` — a one-shot lightweight canvas burst (no dependency; ~40 particles) that runs once on mount when `trigger` is true and `prefers-reduced-motion` is not set.

- [ ] **Step 1: Component.** Client canvas component drawing a short confetti burst with `requestAnimationFrame`, auto-cleanup after ~1.5s.
- [ ] **Step 2: Wire in.** On the review page (server), compute `viewerGotExact = preds.some(p => p.user_id===user.id && p.points===5)`; render `<Confetti trigger={viewerGotExact} />`.
- [ ] **Step 3: Verify.** `npm run build` passes. Commit: `feat: confetti on exact-score results`.

---

### Task 9: Fix push reminders — confirmation push on enable

**Files:**
- Modify: `app/api/push/route.ts`
- Modify: `components/EnableNotifications.tsx`

**Interfaces:**
- Consumes: `sendPush` from `lib/push.ts`.

- [ ] **Step 1: Send test push.** In `app/api/push/route.ts` POST, after a successful upsert, call `sendPush({endpoint,p256dh,auth}, {title:"🔔 Reminders on", body:"We'll nudge you 3h & 1h before each deadline.", url:"/"})`; wrap in try/catch so a send failure never fails the save.
- [ ] **Step 2: Status UX.** In `EnableNotifications.tsx`, show "Sending test…" while enabling and "✓ Reminders on — check for a test notification" when subscribed.
- [ ] **Step 3: Verify build.** `npm run build` passes.
- [ ] **Step 4: Manual verify (post-deploy).** On phone (installed PWA): tap Enable reminders → grant → receive the test notification within seconds. Confirm a row appears: check `push_subscriptions` count > 0 (via Supabase).
- [ ] **Step 5: Commit:** `fix: save push subscriptions reliably + instant confirmation notification`.

---

### Task 10: Visual polish pass on Predict + Results

**Files:**
- Modify: `components/PredictionForm.tsx`, `app/predict/[gw]/page.tsx`, `app/leagues/[id]/gw/[gw]/page.tsx`

- [ ] **Step 1: Predict.** Bigger flags (size 26), `.tnum` score inputs, a sticky bottom save bar (`sticky bottom-20 sm:bottom-4`) so Save is always reachable above the tab bar.
- [ ] **Step 2: Results.** Apply new surfaces/borders, `.tnum` for predictions + GW totals, medal color on the top total.
- [ ] **Step 3: Verify.** `npm run build` + `npm test` pass. Commit: `style: polish predict + results screens`.

---

### Task 11: Deploy preview + full verification

- [ ] **Step 1: Push branch.** `git push -u origin redesign` → Vercel builds a preview deployment.
- [ ] **Step 2: Get preview URL** (Vercel dashboard or MCP) and open on a phone.
- [ ] **Step 3: Manual QA checklist:** bottom nav routes + active states; safe-area spacing; logo + icon; leaderboard medals + countdown + progress; predict long names + sticky save; results live statuses + confetti on an exact score; profile name edit + sign out; **enable reminders → receive test push**.
- [ ] **Step 4: Report preview URL to the user for sign-off before merging to `main`.**

---

## Self-review notes

- **Spec coverage:** visual system (T1), logo/icon (T2), bottom nav (T3), profile (T4), predict/results tabs (T5), countdown (T6), home/medals (T7), confetti (T8), notifications fix (T9), predict/results polish (T10), verification/preview (T11). All spec sections mapped.
- **No schema tasks** — push table/columns already applied to live DB (noted in spec).
- **Merge to main** is intentionally deferred to a user decision after preview sign-off (not a task here).
