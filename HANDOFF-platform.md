# Handoff: make SHaiPT tenable — database, auth, AI coach, trainer/trainee, workouts, diet, cost limits

Paste everything below this line into a fresh session started in `~/SHaiPT/SHaiPT-Next-App`.

---

You are continuing work for Ali (they/them) on **SHaiPT**, a training app: a Next.js web app
(landing, login, onboarding interview, AI coach chat, AI training plans, workout logging,
nutrition, trainer-lite tools) plus **4Dcoach** (a separate Vite PWA: film a set on a phone → 4D
replay, reps, tempo, technique score, AR, and a live rep counter from the selfie camera). Read this
whole prompt, then the files it names, before changing anything. Commit in small steps with
descriptive messages, end every commit message with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, push, and deploy when a step is done.
Ali watches from a phone and interjects mid-turn: lead with the outcome, keep answers short, put
anything Ali must do themselves (dashboard clicks, keys, money) in a numbered list.

## The goal of this session

Ali wants to hand **a couple of test accounts to friends**. That means the app must work end to
end for a stranger: sign up (invite only), do the onboarding interview, get a training plan and a
nutrition plan, log a workout, talk to the AI coach, see analytics, optionally be linked to a
trainer account, and open 4Dcoach; with **no way to run up a bill**. Ali's words: "I want to have
limits and do not end up with a $100 bill." Target: **under $20 a month all in** for a handful of
testers, with hard caps, not hopes.

Six workstreams, in this order (each is a deliverable on its own; finish one before the next):

1. **Database** rebuilt (the Supabase project was deleted) with an exercise library.
2. **Authentication** that works for invited testers, with roles.
3. **AI gateway with cost limits** (every Gemini call goes through one module with caps and a log).
4. **AI coach, workouts, diet** made to work on the new database.
5. **Trainer / trainee** loop made to work.
6. **Tenable**: invite flow, test accounts, a scripted end-to-end smoke test, monitoring, docs.

## Repositories, branches, what is live

| What | Where | Branch | Live |
|---|---|---|---|
| SHaiPT Next app | `~/SHaiPT/SHaiPT-Next-App`, GitHub `SHaiPT-app/SHaiPT-Next-App` | `v2-overhaul` (work here; `main` is stale) | www.shaipt.com via Vercel project `s-hai-pt-de3g` (team `alis-projects-e60465e8`). The Vercel project is Git-linked to the **old** repo `Alihomaei/SHaiPT`, so production deploys come from the local checkout: `cd ~/SHaiPT/SHaiPT-Next-App && vercel deploy --prod --yes --scope alis-projects-e60465e8` (this worked from the assistant's shell in the last session; if the permission classifier blocks it, ask Ali to run it). |
| 4Dcoach app + Mac server | `~/SHaiPT/SHaiPT_simple/4Dcoach/app` and `/server`, GitHub `Alihomaei/shaipt-simple` | `4dcoach-spec`, merged into `main` with `git merge --no-ff` (use a temporary worktree so the running dev servers are not disturbed) | https://sh-ai-pt-simple.vercel.app builds from `main` on push. Read `~/SHaiPT/SHaiPT_simple/4Dcoach/HANDOFF.md` for its state; do not change it in this session unless a workstream needs it. |

Both repos commit as `alihomaei1997@gmail.com`. `prd.md` (lower case) in the Next repo has an
uncommitted edit by Ali: leave it alone. `app/design/` in 4Dcoach is untracked: leave it out of git.

Dev server: `cd ~/SHaiPT/SHaiPT-Next-App && pnpm dev` (port 3000). **Never run `pnpm build`
while `pnpm dev` runs**: it corrupts `.next` (fix: `rm -rf .next`, restart). Type-check with
`npx tsc --noEmit -p tsconfig.json` (the `__tests__/api/*.test.ts` errors are pre-existing; do
not let new ones in), lint with `npx eslint <paths>`, unit tests with `pnpm test` (Jest, 29 suites
under `__tests__/`; several will be red until the database exists again), e2e with Playwright
(`playwright.config.ts`, `e2e/`).

## Read first

`PRD.md` (the product: features, tiers, flows; section 11 has the hard constraints), `API.md`,
`DATABASE.md`, `TESTING.md`, `README.md`, `agent_communication.md`, `PHASE4-QA-REPORT.md`,
`HANDOFF-scrollcraft-ar.md` (the previous handoff, for the landing and AR context), and
`git log --oneline | head -40`. Then the code map below.

## Code map (what exists today)

- **Pages** (`app/(main)/…`, all client components on Supabase): `home` (dashboard, `home/workout`),
  `ai` (coach chat), `plans` (+ `plans/new`), `workouts` (+ `workouts/new`), `nutrition`
  (+ `tracking`, `grocery`), `body`, `activity`, `dms`, `profile`, `trainer` (+ `trainer/client/[id]`).
  `app/demo/*` is a no-login investor demo on `data/*.json` (keep it working). `app/login`,
  `app/auth/callback` (OAuth return). Landing is `app/page.tsx` with `components/landing/*`
  (done last session; do not redesign it).
- **API routes** (`app/api/…/route.ts`, Bearer token from Supabase Auth checked per route, often
  with `lib/requireSubscription.ts` → `requireFeatureAccess(request, feature)`): `ai-coach/{chat,
  chat/history, interview, dietitian-interview, generate-plan, generate-nutrition-plan, diet,
  workout, workout-summary, weekly-insights, plan-adaptation, photo-assessment}`, `plans`,
  `plans/generate`, `onboarding`, `onboarding/generate-plans`, `workout/{start,[logId]/set,
  [logId]/draft,[logId]/complete}`, `logs`, `sync/workout`, `nutrition`, `nutrition/generate`,
  `nutrition/macro-targets`, `food-database`, `food-logs`, `grocery-lists(+/generate)`,
  `body-measurements`, `progress-media`, `coaching/{request,respond,trainers}`,
  `trainer/clients(+/alerts,/progress)`, `users/{search,link,trainees,features}`,
  `plan-assignments`, `direct-messages`, `notifications`, `consistency/*`, `subscriptions/{status,
  checkout,webhook}` (Stripe), `verify/{send,confirm}` (phone, no SMS provider wired: it only
  validates the number), `migrate` and `seed` (dangerous helpers: lock or delete them).
- **AI**: `@google/generative-ai` with `gemini-2.5-flash` in about 20 places, each route creating
  its own client and prompt (`genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })`); no shared
  gateway, no token caps, no usage log, no caching, no budget check. `@ai-sdk/google` and `ai` are
  installed but barely used. `OPENAI_API_KEY` and the Firebase keys in `.env.local` are not
  referenced by any code: remove them from the file and from Vercel.
- **Data**: `lib/supabase.ts` (lazy client), `lib/supabaseDb.ts` (helpers), `lib/types.ts`,
  `lib/subscriptions.ts` (tiers and feature keys), `lib/offlineDb.ts` + `lib/syncManager.ts` +
  `stores/offlineStore.ts` (offline workout logging), `hooks/*` (workout, rest timer, wake, sync).
- **Schema** (SQL in the repo root, 838 lines, run in this order on a fresh project):
  `migration.sql` (profiles, exercises, workout_plans, workout_logs, personal_records, social,
  coaching_relationships, direct_messages, notifications, training_plans/sessions/assignments,
  progress_media, RLS, triggers) → `migration_fix_trigger_security.sql` →
  `migration_workout_tracking.sql` (workout_sessions, exercise_logs, workout_drafts) →
  `migration_ai_features.sql` (ai_chats, coach_interviews, onboarding, user_preferences) →
  `migration_nutrition_plans.sql` → `migration_food_tracking.sql` (food_database, food_logs,
  grocery_lists) → `migration_subscriptions.sql` (subscriptions, consistency_challenges/logs,
  phone_verifications) → `migration_human_trainer.sql` + `seed_human_trainer.sql`. Tables the
  code reads (by count): profiles, workout_logs, coaching_relationships, exercise_logs,
  training_plans, consistency_challenges, workout_drafts, workout_sessions,
  training_plan_assignments, phone_verifications, notifications, training_plan_sessions,
  direct_messages, workout_plans, nutrition_plans, body_measurements, user_follows,
  user_favorites, progress_media, consistency_logs, subscriptions, personal_records,
  grocery_lists, food_logs, coach_interviews, ai_chats, activity_posts, post_likes,
  food_database, exercises, user_preferences, post_comments, onboarding, user_stats(_history),
  exercise_instructions, body_weight_logs. **There is no exercise seed**: `exercises` is empty
  after the migrations, which is why plan generation and exercise search have nothing to stand on.
- **Auth**: `components/LoginForm.tsx` does email + password (`signInWithPassword`, `signUp`) and
  OAuth (`google`, `apple`) through Supabase Auth; `app/auth/callback` completes OAuth. There is no
  middleware protecting `(main)` routes: pages check the session client-side. Roles live in
  `profiles.role` (`trainee` | `trainer`).
- **Tests**: Jest suites in `__tests__/` (component and API), Playwright `e2e/`.

## Brand and product rules (Ali's standing decisions)

- Colours black, white, red `#da0023` only (hot `#ff3352`, deep `#b8001e`); no other accent, **no
  gradients**. The landing direction is "A24 title sequence × Apple product reveal × sci-fi HUD ×
  editorial"; the app screens are dark, Fitbod/Strava-like. Reuse the existing tokens in
  `app/globals.css` (`--brand`, `--ink-*`, `--line-soft`, fonts `--font-editorial`,
  `--font-geist-mono`).
- The AI coach must never give medical advice; keep the safety guardrails that exist
  (`c5741be` "safety & liability guardrails").
- Tiers from `PRD.md` section 7 stay in the data model, but **testers must not touch Stripe**:
  give test accounts full access through a flag, not a checkout.

## Workstream 1: database

Ali must create the project (needs their account and card on file, free tier is fine):

1. https://supabase.com → New project (region close to Ali, EU or US East), Postgres password
   saved in a password manager.
2. Project Settings → API: copy the URL, the anon key and the service role key into
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) and into the Vercel project's environment variables
   (`vercel env add … production` from the repo, or the dashboard).
3. Authentication → Providers: Email on; **Confirm email off** for the test phase (or on with
   Supabase's built-in mailer, 3 emails/hour on free) — Ali decides; Google/Apple off unless Ali
   configures OAuth clients (then `app/auth/callback` needs the redirect URL registered).
4. Authentication → URL configuration: site URL `https://www.shaipt.com`, redirect URLs
   `https://www.shaipt.com/auth/callback` and `http://localhost:3000/auth/callback`.

You do the rest with the SQL editor or `psql` (connection string in Settings → Database):

- Run the migrations in the order above; fix whatever fails (they were written against an older
  Postgres and each other; expect a few `already exists` and missing-column errors; make the
  files idempotent as you go). Record the exact working order in `DATABASE.md`.
- Check RLS on every table with a test user token: a user must not read another user's logs,
  chats, plans, nutrition or measurements; trainers only see linked trainees. Write this as a
  script (`scripts/rls-check.ts`) that creates two users with the service role, inserts one row
  each, and asserts with the anon client.
- **Exercise library**: seed `exercises` (and `exercise_instructions`) with a real dataset.
  Use the public-domain **free-exercise-db** (github.com/yuhonas/free-exercise-db, ~870
  exercises with name, force, level, mechanic, equipment, primary/secondary muscles,
  instructions, category, image paths). Write `scripts/seed-exercises.ts` that downloads its
  `dist/exercises.json`, maps it onto the `exercises` columns in `DATABASE.md` (add columns if
  needed by a new `migration_exercises.sql`), inserts with the service role, and is safe to
  re-run (upsert on a slug). Add a `fourd_id` column that maps the ten 4Dcoach exercises (`bench`,
  `squat`, `deadlift`, `lateral-raise`, `curl`, `bw-squat`, `pushup`, `crunch`, `plank`,
  `pullup`, `hip-thrust`) so a plan can link an exercise to the 4D form check
  (`useFourDcoachUrl()` in `lib/fourDcoach.ts` gives the base URL).
- `food_database`: seed a small, licence-clean set (a few hundred common foods with macros per
  100 g; USDA FoodData Central "Foundation Foods" CSV is public domain) with
  `scripts/seed-foods.ts`.
- Storage: bucket `progress-media` (private, per-user folder policy) for `api/progress-media`.
- Delete or lock `app/api/migrate` and `app/api/seed` (require `SUPABASE_SERVICE_ROLE_KEY` in an
  `Authorization` header and `NODE_ENV !== 'production'`).

## Workstream 2: authentication

- Server-side protection: add `middleware.ts` (Next 16 also calls it `proxy.ts`; check the
  installed version's convention) that redirects unauthenticated requests for `/(main)/*` pages
  to `/login`, using `@supabase/ssr` cookies (add the package; the current client-only session
  with `localStorage` cannot be read by middleware). Keep the API routes on Bearer tokens but
  factor the token check into one helper (`lib/auth.ts`: `getUser(request)` → user or 401) and
  use it everywhere instead of the copy-pasted `createClient` blocks.
- **Invite-only sign-up**: an `invites` table (email, role, invited_by, used_at) plus an
  `ALLOW_SIGNUP_EMAILS` env fallback; `LoginForm.signUp` checks `/api/invites/check` first and
  shows "SHaiPT is invite-only for now" otherwise; a Postgres trigger on `auth.users` creates the
  `profiles` row with the invite's role and sets `profiles.tester = true`.
- Test accounts: `scripts/create-test-users.ts` (service role) creates N users with emails Ali
  gives, strong generated passwords printed once, role trainee (and one trainer), `tester = true`,
  a completed `onboarding` row optional. Feature gating: `lib/requireSubscription.ts` and
  `components/FeatureGate.tsx` treat `profiles.tester` as the top tier. Stripe stays wired but
  unreachable for testers (hide the checkout entry points when `tester`).
- Phone verification: either wire a provider or remove the UI that asks for it; do not leave a
  dead end in onboarding.
- Roles: `profiles.role` drives the home screen (`TraineeDashboard` vs `TrainerDashboard`).
  Verify the switch works after sign-up for both roles.

## Workstream 3: the AI gateway and the cost limits

Build `lib/ai/gateway.ts` and route **every** model call through it (grep
`getGenerativeModel` and `@ai-sdk/google`; there should be none left outside the gateway):

- `callModel({ userId, feature, messages | prompt, schema?, maxOutputTokens, temperature,
  model? })` returns text or schema-validated JSON (Gemini `responseMimeType: 'application/json'` +
  `responseSchema`, validated again with `zod`).
- Model policy by feature: `gemini-2.5-flash-lite` for chat, interviews and summaries;
  `gemini-2.5-flash` for plan and nutrition generation; photo assessment only for testers/pro.
  Check current prices and quotas at ai.google.dev/pricing before hard-coding a cost table;
  put per-million-token prices in `lib/ai/prices.ts` with the date they were read.
- Hard caps: `maxOutputTokens` on every call (chat 600, summaries 400, plans 4000, nutrition
  3000); prompt length trimmed (chat history to the last 12 turns; plan prompts must not embed
  the whole exercise library — pass the filtered candidates only).
- **Usage log**: table `ai_usage` (user_id, feature, model, input_tokens, output_tokens,
  cost_usd, created_at) filled from `usageMetadata` on every call, plus a `ai_budget` row
  (month, spent_usd, cap_usd). Before each call: reject with 429 and a friendly message when
  the user's daily count (default 40 calls, 200 k tokens) or the global monthly `AI_MONTHLY_CAP_USD`
  (default 15) is reached. `/api/admin/usage` (service role) shows the month by feature and user;
  a small page on the trainer dashboard for Ali.
- Caching: identical plan/nutrition requests within 24 h return the stored result
  (`ai_cache` keyed by a hash of the prompt).
- Outside the code, Ali must set the external stops (put these in a numbered list for them):
  Google AI Studio → the API key's project → **quota** (requests per day) and a **Cloud Billing
  budget alert** at $10 with email; Vercel → Settings → Billing → **Spend Management** cap
  (Hobby has none to pay; if the team is Pro set a $5 limit); Supabase free tier has no card
  charges; Stripe stays in test mode.
- Tests: unit tests for the gateway (caps, budget refusal, schema validation, usage rows) with
  the model mocked (`__mocks__` already exists).

## Workstream 4: AI coach, workouts, diet

Make the loop work for a new user on the new database, in this order, each verified in the
browser at 375 px and 1400 px:

1. **Onboarding interview** (`api/ai-coach/interview`, `app/(main)/…` interview page,
   `components/…IntakeForm`, `DietIntakeForm`): questions → `onboarding` row → `generate-plans`
   produces a training plan **and** macro targets in one gated call; the user lands on `home` with
   both.
2. **Training plan** (`api/plans/generate`, `api/ai-coach/generate-plan`, `PlanCreator`,
   `PlanViewer`): exercises must come from the `exercises` table (the model picks from
   candidates filtered by equipment and goal, returns ids, the server joins names,
   instructions and `fourd_id`); sessions saved as `training_plan_sessions`; a "Form check in
   4D" link per exercise that has a `fourd_id`.
3. **Workout execution** (`app/(main)/home/workout`, `WorkoutLogger`, `api/workout/*`,
   offline sync): start a session from the plan, log sets (`exercise_logs`), rest timer, complete
   → `workout-summary` (one gated call, 400 tokens) → `personal_records`.
4. **AI coach chat** (`api/ai-coach/chat`, `AICoachChat`): streamed replies through the gateway,
   history in `ai_chats`, the system prompt includes the user's plan, last three workouts and
   macro targets (trimmed), the safety guardrails kept, 40 messages/day per user.
5. **Nutrition** (`api/nutrition/*`, `api/ai-coach/generate-nutrition-plan`, `food-logs`,
   `grocery-lists/generate`, the `nutrition` pages): macro targets from the intake; a plan with
   meals built from `food_database` rows (the model chooses from candidates, the server computes
   the macros, no invented numbers); daily tracking; grocery list from the plan.
6. **Analytics** (`AnalyticsDashboard`, `WeeklyInsightsCard`, `api/ai-coach/weekly-insights`):
   charts from `exercise_logs`/`body_measurements`; weekly insights as one cached weekly call.
7. **Plan adaptation** (`api/ai-coach/plan-adaptation`, `PlanAdaptationReview`): keep if it
   works within an hour; otherwise hide the entry point and note it.

Delete or hide anything that cannot be made to work in this session rather than leaving a broken
button (photo assessment, consistency challenges, activity feed, phone verification are the
likely candidates); list what was hidden in the final report.

## Workstream 5: trainer / trainee

The minimal loop: a trainer account searches a trainee (`api/users/search`), sends a coaching
request (`api/coaching/request`), the trainee accepts (`api/coaching/respond`), the trainer sees
the trainee on `app/(main)/trainer` (`TrainerDashboard`, `api/trainer/clients`), opens
`trainer/client/[id]` (progress, alerts, the trainee's plan), assigns or edits a plan
(`api/plan-assignments`, `PlanCreator`), and they can message (`api/direct-messages`,
`DirectMessageThread`), with notifications (`api/notifications`, `NotificationBell`). Make each
step work with two test accounts in two browser contexts (Playwright), fix RLS as needed, and
write it up as `e2e/trainer-loop.spec.ts`.

## Workstream 6: tenable for testers

- A **smoke test** in Playwright (`e2e/tester-journey.spec.ts`) that signs up with an invite,
  completes the interview (model mocked in CI, real once locally), sees a plan, logs a workout,
  chats once, opens nutrition, opens 4Dcoach. Run it against `pnpm dev` before every deploy.
- Empty and error states on every page (`EmptyState`, `ErrorState` exist): no blank screens, no
  raw error JSON; a "something went wrong, tell Ali" fallback with the request id.
- Monitoring: Vercel logs are enough; add `lib/log.ts` that prefixes API errors with the route
  and user id so `vercel logs` is searchable; optionally Vercel's built-in Web Analytics.
- A `TESTERS.md` for Ali: how to create an account for a friend (the script), what to tell
  them (URL, the 4Dcoach link, "at home or in the gym"), what to expect (limits: N AI messages
  a day), how to read usage (`/api/admin/usage`), how to revoke an account.
- Update `README.md`, `API.md`, `DATABASE.md`, `env.example` to what is true at the end.

## The Vultr server

Ali has a Vultr Linux VM (ask for the IP, the OS and the SSH user; assume Ubuntu with root over
SSH; you may install packages with `apt`, but ask before opening any port other than 80/443/22).
It is **not** for the model calls (Gemini stays the model provider; the VM has no GPU, so do not
try to self-host an LLM there unless Ali asks) and not for the database (Supabase is the
database). Use it for the things Vercel and Supabase free tiers cannot do:

1. **A permanent https address for the 4Dcoach server.** Today the phone reaches the Mac's
   FastAPI server (port 8787) only through a Cloudflare quick tunnel whose URL changes every
   run. Install **Tailscale** on the Mac and the VM, and **Caddy** on the VM with a subdomain
   Ali points at it (e.g. `coach-api.shaipt.com`, an A record in the domain's DNS); Caddy
   reverse-proxies `https://coach-api.shaipt.com` → the Mac's Tailscale IP, port 8787, with the
   USDZ content type passed through. Then set that URL as the 4Dcoach server URL default when
   the app runs on Vercel (`DEFAULT_SERVER` in `4Dcoach/app/src/server.ts`) and document it in
   `4Dcoach/app/README.md`. AR from the phone then works without a tunnel whenever the Mac is on.
2. Optionally run the **USDZ export** itself on the VM (`server/usdz.py` needs only `usd-core`
   and numpy, no GPU) so AR works even when the Mac sleeps: a slimmed `server/main.py` mode
   (`AR_ONLY=1`) that serves `/health`, `/ar`, `/ar/{id}.usdz` and returns 503 for the GPU
   jobs; Caddy routes `/ar*` to the VM and everything else to the Mac. Only if time allows.
3. Cron jobs that Vercel Hobby cannot run: the weekly insights batch and the monthly `ai_budget`
   reset, as a small Node script called from the VM's crontab with the service role key.

Cost: the VM is a fixed monthly price already paid; nothing here adds usage-based cost.

## Verification recipe

`preview_start` with `shaipt-next-dev`, `resize_window` 1400×900 and 375×812. **The browser pane
runs no requestAnimationFrame while hidden and cannot save screenshots**: for anything scroll- or
animation-driven, and for screenshots, use Playwright from the repo
(`node_modules/@playwright/test`, Chromium in `~/Library/Caches/ms-playwright`; write the script
in the scratchpad, `require` the package by absolute path, run `node` from the repo). For camera
features stub `getUserMedia` with a hidden `<video>` and `captureStream()` (Playwright's fake
device flags do not work in this setup). Type-check and lint before each commit; run the affected
Jest suites; run the e2e smoke test before each deploy. Deploy with the `vercel deploy` line and
check `https://www.shaipt.com` with `curl` for a string from the change.

## Gotchas already learned (do not rediscover)

- styled-jsx scopes only intrinsic elements: classes on `next/link` or `motion.*` need
  `:global(.class)`.
- `react-hooks/set-state-in-effect` is an error in this repo's ESLint: use refs or
  `useSyncExternalStore` in scroll and animation paths.
- `pnpm build` while `pnpm dev` runs corrupts `.next`.
- Commit messages with double quotes inside a double-quoted `-m` break `git commit`; write the
  message to a file and use `-F`.
- A conditional like `test -f x || git checkout -- .` reverts the working tree when the file is
  missing; never chain a destructive git command behind a test.
- The 4Dcoach dev server (port 5174) and its Mac server (`uv run uvicorn main:app --host
  0.0.0.0 --port 8787` in `4Dcoach/server`) are usually running; check `GET /jobs` before
  restarting the server. The Mac's LAN address changes between networks (`ipconfig getifaddr
  en0`), which is why the VM route above matters.
- Gemini 2.5 Flash is what the code uses; `gemini-2.5-flash-lite` is the cheap tier. Never
  hard-code prices without the date; never leave a route that calls the model without a cap.

## Deliverables (in order, each committed, pushed and deployed)

1. Supabase rebuilt: migrations run and made idempotent, RLS script green, exercises and foods
   seeded, buckets, dangerous routes locked; `DATABASE.md` updated.
2. Auth: middleware, `lib/auth.ts`, invites, test-user script, tester flag gating, phone
   verification resolved.
3. `lib/ai/gateway.ts` with caps, usage log, budget refusal, cache, admin usage view; every
   model call migrated; unit tests; Ali's external stops listed for them.
4. The trainee loop (interview → plan → workout → chat → nutrition → analytics) working on
   the new database, verified in the browser at both widths, broken features hidden and listed.
5. The trainer loop working with two accounts, `e2e/trainer-loop.spec.ts`.
6. `e2e/tester-journey.spec.ts`, empty/error states, logging, `TESTERS.md`, docs updated,
   the Vultr https route for 4Dcoach, and two test accounts created for Ali's friends with the
   credentials handed to Ali in the chat (never committed).
7. At the end, rewrite this file's "state" into a fresh `HANDOFF-platform.md` for the next
   session: what works, what was hidden, the month's AI spend so far, and the next three things.
