# Handoff: SHaiPT platform, continued — trainee loop verified, trainer loop and tester smoke test next

Paste everything below this line into a fresh session started in `~/SHaiPT/SHaiPT-Next-App`.

---

You are continuing work for Ali (they/them) on **SHaiPT**: a Next.js 16 web app (landing, login,
onboarding interview, AI coach chat, AI training plans, workout logging, nutrition, trainer-lite
tools) plus **4Dcoach** (a separate Vite PWA in `~/SHaiPT/SHaiPT_simple/4Dcoach`: film a set on a
phone → 4D replay, reps, tempo, technique score, AR, live rep counter). Read this whole prompt,
then the files it names, before changing anything. Commit in small steps with descriptive
messages, end every commit message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
(keep that trailer as-is), write commit messages to a file and use `git commit -F` (quotes inside
`-m` break it), push after each step. Ali watches from a phone and interjects mid-turn: lead with
the outcome, keep answers short, put anything Ali must do themselves in a numbered list.

The previous session (Fable) did the first four of six workstreams from the original handoff and
verified the trainee loop in a real browser against the real database. This prompt is the state
as of **2026-09-07 evening**. The old handoff text is in git history (`git show cb1532c:HANDOFF-platform.md`)
if you need the original wording of a workstream.

## The goal (unchanged)

Ali wants to hand **a couple of test accounts to friends**. The app must work end to end for a
stranger: sign up (invite only), do the onboarding interview, get a training plan and macro
targets, log a workout, talk to the AI coach, see analytics, optionally be linked to a trainer,
open 4Dcoach; with **no way to run up a bill**. Target under $20 a month for a handful of testers,
with hard caps.

## Repositories, branches, what is live

| What | Where | Branch | Live |
|---|---|---|---|
| SHaiPT Next app | `~/SHaiPT/SHaiPT-Next-App`, GitHub `SHaiPT-app/SHaiPT-Next-App` | `v2-overhaul` (work here; `main` is stale). Last commit `033d088`. | www.shaipt.com via Vercel project `s-hai-pt-de3g` (team `alis-projects-e60465e8`). **Nothing from this rebuild is deployed yet** (see "Deploy"). The Vercel project is Git-linked to the old repo `Alihomaei/SHaiPT`, so production deploys come from the local checkout: `cd ~/SHaiPT/SHaiPT-Next-App && vercel deploy --prod --yes --scope alis-projects-e60465e8`. The permission classifier blocked this and `vercel env add/rm` in the last session; if it blocks you too, give Ali the exact command. |
| 4Dcoach app + Mac server | `~/SHaiPT/SHaiPT_simple/4Dcoach/app` and `/server`, GitHub `Alihomaei/shaipt-simple` | `4dcoach-spec` (last commit `7481dfb`), merged into `main` with `git merge --no-ff` in a temporary worktree when you want to deploy (https://sh-ai-pt-simple.vercel.app builds from `main`). Two unmerged commits: the build-time server URL (`VITE_4DCOACH_SERVER`) and the Vultr deploy notes. `app/design/` is untracked: leave it out of git. |

Both repos commit as `alihomaei1997@gmail.com`.

## Accounts and secrets (never commit, never print)

- **Supabase**: org `shaiptapp@gmail.com` (free plan), project **`shaipt`**, ref
  `ayaynfcdoumhzledqoec`, region West US (Oregon), created 2026-09-07. URL, anon key, service
  role key, the database password and `SUPABASE_DB_URL` (session pooler
  `aws-0-us-west-2.pooler.supabase.com:5432`, user `postgres.ayaynfcdoumhzledqoec`) are all in
  `.env.local` (gitignored, mode 600). Dashboard: https://supabase.com/dashboard/project/ayaynfcdoumhzledqoec
- **OpenAI**: `OPENAI_API_KEY` in `.env.local` (valid; the account had **no credits** at the end
  of the session, so real calls returned a billing 429). Ali pasted the key into chat; suggest
  they rotate it once things run.
- **Tester account** (Ali's own): `alihomaei1997@gmail.com`, password given to Ali in chat,
  role trainee, `tester = true`, id `ab455050-e410-499c-ba87-0cd9c3f5b280`. It already has one
  saved plan, ~12 workout logs (test runs; 3 completed) and 5 personal records.
- **Vultr VM**: `45.77.142.86`, Ubuntu 24.04, root over SSH with the Mac's key (`ssh root@45.77.142.86`
  works without a password). It also serves other sites with Caddy (medaitimes.com): do not
  replace `/etc/caddy/Caddyfile`, only edit the `coach-api.shaipt.com` block.
- **Vercel env** (`vercel env ls --scope alis-projects-e60465e8`): still the OLD Supabase keys
  (dead project) plus dead `OPENAI_API_KEY` (112 days old, unknown validity) and ten Firebase
  vars. None of the new variables are set. See "Deploy".
- `.env.local` has `AI_MOCK=1` (canned AI replies in dev, added because OpenAI has no credits).
  Remove it when the account has credits.

## What is done and verified

### Database (workstream 1) — done, verified on the live project
`supabase/migrations/0001…0140` applied by `pnpm db:migrate` (`scripts/migrate.ts`, records in
`public.schema_migrations`, `--status`, `--force` re-applies all, `--auth-stub` for a local
`postgres:17` in Docker via `pnpm db:local`). All files idempotent; `--force` was run several
times against the live project without incident. Seeded: **876 exercises** (free-exercise-db,
36 mapped to 4Dcoach `fourd_id`, 11 primary) and **384 foods** (USDA Foundation Foods, per 100 g).
`pnpm db:rls-check` is **green** on the live project (three throw-away users; stranger reads
nothing; linked coach reads logs, exercise logs, measurements, never chats). `DATABASE.md` is
the rebuild guide. `pnpm db:sql "select …"` runs ad-hoc SQL. `pnpm db:test-users -- email…`
creates testers (`--trainer`, `--reset`, `--revoke`).

Fixes made after the first live walk (all committed): `training_plans` SELECT policy is inlined
(a SECURITY DEFINER helper reading the same table cannot see a row inside `INSERT … RETURNING`,
so every plan save failed); `food_database.source_id` is a real unique constraint (PostgREST
cannot target a partial index); the coach policy on `body_measurements` moved to 0090 (0080 ran
before the table existed); `ai_usage_today()` ignores `status = 'mock'`; `recompute_user_stats()`
derives set/rep counts from the sets JSON.

Not done from the Supabase checklist: **Authentication → URL configuration** (site URL
`https://www.shaipt.com`, redirect URLs `https://www.shaipt.com/auth/callback` and
`http://localhost:3000/auth/callback`) and **Confirm email** (currently the project default,
which is ON; `create-test-users` confirms the email itself, so scripted accounts work either
way, but self-service sign-up with an invite will need the confirm mail or the setting off).
Google/Apple OAuth are not configured (the login page shows the buttons; hide them or configure).

### Auth (workstream 2) — done, verified
`lib/auth.ts` (`getUser`, `getAdmin`, `requireTrainer`, `isActiveCoachOf`) is used by every API
route; nothing trusts a client-sent user id. `proxy.ts` (Next 16 middleware) sends signed-out
visitors of `/home /ai /plans /workouts /nutrition /body /activity /dms /profile /trainer /coach
/dashboard /settings /onboarding /workout /feed` to `/login?next=…` using the `@supabase/ssr`
cookie session written by `lib/supabase.ts`. `/api/invites/check` + `invites` table +
`ALLOW_SIGNUP_EMAILS`; LoginForm says "SHaiPT is invite-only for now". `profiles.tester = true`
is the top tier in `lib/requireSubscription.ts` and `FeatureGate`; checkout returns 403 for
testers. Phone verification routes deleted. `e2e/access.spec.ts` (12 checks, no DB) passes.
`lib/apiClient.ts` (`apiFetch`/`apiFetchRaw`, `ApiError`, `errorMessage`) is what every page and
component uses; the only raw `fetch('/api…')` left is the public invite check in LoginForm.

### AI gateway (workstream 3) — done, unit-tested, live calls blocked only by credits
`lib/ai/gateway.ts` is the one door to the model, now **OpenAI** (Ali asked to switch from
Gemini): `gpt-5-nano` for chat/interviews/summaries, `gpt-5-mini` for plan and nutrition
generation (`AI_MODEL_CHEAP` / `AI_MODEL_STRONG` override), `reasoning_effort: 'minimal'` on the
gpt-5 family, `max_completion_tokens` per feature (chat 600, summaries 400, plans 4000,
nutrition 3000), 12 turns of history, per-user daily limit (40 calls / 200k tokens, 429 with a
friendly message), global monthly budget (`AI_MONTHLY_CAP_USD`, 15), `ai_usage` row per call
priced from `lib/ai/prices.ts` (read 2026-09-07), 24 h `ai_cache` for plan/nutrition prompts,
`json_schema` response format validated with zod (one repair attempt), streaming for chat,
mock mode (`AI_MOCK=1` or no key outside production). `pnpm ai:smoke` makes three tiny live
calls (it reached OpenAI and got "no credits remaining"). `/api/admin/usage?month=` for
`ADMIN_EMAILS` (default Ali). `lib/ai/plans.ts`: plans are built from `exercises` (≈120
candidates by equipment and level; the model returns ids; the server joins names, muscles,
`fourd_id`). `lib/ai/nutrition.ts`: macro targets are arithmetic; meals from `food_database`
rows with server-computed macros. Deleted: `/api/chat`, `ai-coach/diet`, `ai-coach/workout`,
`ai-coach/photo-assessment`, `/api/verify/*`, `/api/migrate`, `/api/seed`, and the components
`AIDietitian`, `AIWorkoutPlanner`. `API.md` describes every route as it is now.

Month's AI spend so far: **$0.00** (76 calls, all mock). `ai_budget` row for 2026-09 exists.

### Trainee loop (workstream 4) — verified through the workout; nutrition, chat, analytics not yet
Verified in Chromium at 375 px against the live project with mock AI (screenshots in the last
session's scratchpad are gone; re-take yours): login → `/home` (dashboard, no errors) → Coach
List → `Sam 'The Guide'` → Start Training → waiver checkbox + Accept → interview chat (6 answers)
→ split choice → Generate My Plan (candidates from the live library) → **Saved** (training_plans,
workout_sessions with `exercise_id` + `fourd_id`, training_plan_sessions, assignment) → `/home`
shows "1 saved plan" → Start Workout → today's session → Start → form-checker prompt → Start
Workout → log 3 sets × 5 exercises (Skip Rest between sets) → Finish Workout → **summary screen**
(new: numbers, PRs with previous best, coach feedback from one gated call) → Done. `user_stats`
recomputed by trigger (15 sets, 120 reps, 5443 kg, streak 1). `personal_records` written.

Known rough edges seen on the way (not fixed):
- `app/coach/[coachId]/page.tsx` uses `.single()` on `coach_interviews` reads → two harmless
  406s in the console per visit; the interview state is not persisted until the plan is
  generated (a reload restarts the interview). Change those to `.maybeSingle()` and save the
  interview on completion.
- The mocked interview extraction returns an empty intake, so mock plans say "3 days/week"
  regardless of answers; real calls will fill it. Not a bug in the pipeline.
- Every "Start" creates a `workout_logs` row; abandoned starts stay as incomplete rows (harmless,
  but the "today's workout" logic could reuse an open log).
- The "Real-Time Form Checker" prompt (in-app MediaPipe pose overlay, `PoseDetectionOverlay`)
  is untested; 4Dcoach covers form. Consider defaulting it off/hiding it.
- Home shows "New Plan Assigned!" for a self-assigned plan (cosmetic).
- Pre-existing lint errors (`any`, `set-state-in-effect`) in files you touch are fine to leave;
  do not add new ones. Type-check: `npx tsc --noEmit -p tsconfig.json` (errors under
  `__tests__/api/*.test.ts` about Request vs NextRequest are pre-existing).

### Tests
Jest: `npx jest` → 17 suites red, **all red before this rebuild started** (baseline was 19; the
red ones are component tests such as LoginForm, CoachInterviewPage, Dashboard, landing/*, with
stale mocks). Do not chase them unless a change of yours is the cause; compare against
`git stash` or a worktree at the previous commit. Gateway and route suites are green
(`__tests__/ai/gateway.test.ts`, `__tests__/api/*`, helper in `test-utils/api.ts`; mock
factories must be called inside `jest.mock` via `jest.requireActual('@/test-utils/api')`
because `jest.mock` is hoisted). Playwright: `e2e/access.spec.ts` (no DB) and
`e2e/tester-journey.spec.ts` (needs `TEST_EMAIL` / `TEST_PASSWORD`; currently sign-in + token
check only; extend it with the loop above).

### Vultr route (the "permanent https address" section) — built, waiting on DNS
On the VM: Caddy site block `coach-api.shaipt.com → 127.0.0.1:8787` appended to
`/etc/caddy/Caddyfile` (backup next to it), reloaded, other sites unaffected; ufw already allows
22/443 (Caddy gets the certificate over TLS-ALPN, port 80 stays closed). On the Mac: launchd
agent `~/Library/LaunchAgents/com.shaipt.4dcoach-tunnel.plist` keeps `ssh -N -R
127.0.0.1:8787:127.0.0.1:8787 root@45.77.142.86` open (KeepAlive; log
`~/Library/Logs/4dcoach-tunnel.log`); verified `curl http://127.0.0.1:8787/health` on the VM
answers with the Mac server's name. No Tailscale (the tunnel needed nothing installed); notes in
`4Dcoach/server/deploy/vultr.md`. Missing: the DNS `A` record `coach-api` → `45.77.142.86` in
Google Cloud DNS for shaipt.com (Ali), then `curl -s https://coach-api.shaipt.com/health`; and
`VITE_4DCOACH_SERVER=https://coach-api.shaipt.com` on the Vercel project `sh-ai-pt-simple` plus
a deploy of 4Dcoach `main`.

## What Ali must do (put this list in your first reply, numbered, and tick off what they confirm)

1. Add credits to the OpenAI account (https://platform.openai.com/settings/organization/billing/)
   and set a monthly usage limit there (Billing → Limits, e.g. $10). Then remove `AI_MOCK=1`
   from `.env.local` and run `pnpm ai:smoke`.
2. Supabase dashboard → Authentication → URL configuration (site URL and the two redirect URLs
   above) and decide on Confirm email (off for the test phase is simplest).
3. Vercel env for `s-hai-pt-de3g`: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AI_MONTHLY_CAP_USD=15`,
   `ALLOW_SIGNUP_EMAILS` (optional), `ADMIN_EMAILS=alihomaei1997@gmail.com`; remove the ten
   `FIREBASE_*` / `NEXT_PUBLIC_FIREBASE_*` vars. Values are in `.env.local`; `vercel env add NAME production`
   reads the value from stdin. Then `vercel deploy --prod --yes --scope alis-projects-e60465e8`.
4. DNS: `A` record `coach-api.shaipt.com` → `45.77.142.86`. Then `VITE_4DCOACH_SERVER` on the
   `sh-ai-pt-simple` Vercel project and a 4Dcoach deploy.
5. Vercel Spend Management cap if the team is Pro; Stripe stays in test mode.
6. Give you the friends' email addresses for `pnpm db:test-users`.

## Your workstreams, in order

### A. Finish the trainee loop (rest of old workstream 4)
Each step verified in the browser at 375 px and 1400 px (Playwright from the repo; see
"Verification recipe"). With `AI_MOCK=1` the steps cost nothing; once credits exist, run each
AI step once for real and read `/api/admin/usage`.
1. **Nutrition**: `/home` → Diet Plans / `/nutrition` → generate (`POST /api/nutrition/generate`,
   meals from `food_database`, server-computed macros) → `/nutrition/tracking` (macro targets
   arithmetic, food search, log a food) → `/nutrition/grocery` (list from the plan). The coach
   page also has "Continue to Nutrition Plan" after the plan (dietitian interview →
   `generate-nutrition-plan`, returned to the client to save into `nutrition_plans`): make sure
   both paths save and that the nutrition page shows the saved plan.
2. **AI coach chat** (`/ai`, `AICoachChat`): streamed reply, history in `ai_chats`, the system
   prompt includes the plan, last three workouts and macro targets, the 40/day limit message
   shows when hit (it does: seen during the walk).
3. **Analytics** (`AnalyticsDashboard`, `WeeklyInsightsCard`, `/api/ai-coach/weekly-insights`):
   charts from `exercise_logs` / `body_measurements` / `user_stats_history`; weekly insight is
   one cached call per week. The body page (`/body`) writes `body_measurements`; a trigger
   mirrors weight into `body_weight_logs`.
4. **Plan adaptation** (`/api/ai-coach/plan-adaptation`, `PlanAdaptationReview`, reached from
   `app/workout/[sessionId]`): keep if it works within an hour, else hide the entry point.
5. **Hide what cannot work** rather than leaving a broken button: consistency challenge
   (`ConsistencyDashboard` on home, `/api/consistency/*`; phone verification is gone), activity
   feed (`/activity`, `/feed`: posts are private by default now), the human-coach tab, Google/Apple
   sign-in buttons unless configured, the in-app form checker if untested. List what you hid in
   the final report and in TESTERS.md.
6. **4Dcoach link per exercise**: plan sessions carry `fourd_id`; add a "Form check in 4D" link
   (`fourDcoachExerciseUrl(base, fourdId)` in `lib/exerciseLibrary.ts`, base from
   `useFourDcoachUrl()` in `lib/fourDcoach.ts`) in the plan viewer and the workout logger.
   4Dcoach already handles `#live=<exercise>` (its `main.ts`).

### B. Trainer / trainee loop (old workstream 5)
`pnpm db:test-users -- --trainer coach@example.com` for a trainer account. Two browser contexts
(Playwright): trainer searches the trainee (`/api/users/search`), sends a coaching request
(`/api/coaching/request` `{ coachId }` is athlete→coach; check the route for the trainer→athlete
direction, the DB trigger handles both), trainee accepts (`/api/coaching/respond`), trainer sees
the client on `/trainer` (`TrainerDashboard`, `/api/trainer/clients`), opens `trainer/client/[id]`
(progress, alerts, plan), assigns a plan (`trainer/client/[id]/assign-plan`, rewritten last
session to the real generate → save → assign flow, untested in a browser), they message
(`/api/direct-messages`, `DirectMessageThread`) and see notifications (`NotificationBell`).
Write it as `e2e/trainer-loop.spec.ts`. RLS already lets an active coach read the trainee's
logs, measurements, media and assignments; `is_coach_of()` is the helper.

### C. Tenable for testers (old workstream 6)
- `e2e/tester-journey.spec.ts`: extend to sign-up with an invite (insert an `invites` row with
  the service role first), interview, plan, workout, chat, nutrition, open 4Dcoach. Run it
  against `pnpm dev` before every deploy; `AI_MOCK=1` in CI.
- Empty and error states on every page (`EmptyState`, `ErrorState` exist): no blank screens, no
  raw JSON; `lib/log.ts` gives the request id for the "tell Ali" fallback.
- `TESTERS.md` exists (how to create accounts, what to tell friends, limits, reading usage,
  revoking); update it with what you hid and the OpenAI wording (it says the external stop is an
  OpenAI usage limit).
- Update `README.md`, `env.example` (already current), `API.md` (current), `DATABASE.md`
  (current) to what is true at the end.
- Deploy (see Ali's list), then check `https://www.shaipt.com` with `curl` for a string from
  the change and run `e2e/access.spec.ts` with `PLAYWRIGHT_BASE_URL`… (the config hardcodes
  `http://localhost:3000`; add a `baseURL` override from env).
- Create the two test accounts for Ali's friends and hand the passwords to Ali in chat only.
- At the end, rewrite this file for the next session: what works, what was hidden, the month's
  AI spend, the next three things.

## Verification recipe

The other chat's `pnpm dev` is usually running on port 3000 from this same checkout, and Next 16
holds `.next/dev/lock`, so a second `next dev` in this folder fails. Use the running server
(it hot-reloads your edits and re-reads `.env.local`), probe it with `curl`, and drive it with
Playwright from the repo: `require('/Users/ali/SHaiPT/SHaiPT-Next-App/node_modules/@playwright/test')`
in a script in the scratchpad, `chromium.launch()`, log in through `/login` (placeholders "Email
or Username", "Password", button "Login"), then act. The Browser pane in the desktop app cannot
reach that server and runs no requestAnimationFrame while hidden; Playwright can take
screenshots to files that you then `Read`. A step-runner pattern that worked: a JSON list of
steps (goto / click by role or testid / fill nth input / clickIf / wait / screenshot / dump body
text, inputs, buttons, and every 4xx/5xx response). Useful selectors: coach cards
`data-testid="coach-card-<id>"`, waiver `data-testid="accept-waiver-btn"` (enabled after the
checkbox), interview input placeholder "Type your answer...", logger buttons "Complete Set",
"Skip Rest", "Next Exercise", "Finish Workout". Never run `pnpm build` while `pnpm dev` runs
(it corrupts `.next`; fix `rm -rf .next` and restart the other chat's server).

## Gotchas learned (do not rediscover)

- The permission classifier in Ali's setup blocks `vercel deploy`, `vercel env add/rm` and
  sometimes long heredocs; `ssh root@45.77.142.86 '…'` and `git push` are fine. Write SQL
  with `$$` bodies through the Write/Edit tools, not through shell-quoted node one-liners
  (`$$` gets eaten).
- `jest.mock` factories are hoisted above imports: reference helpers via
  `jest.requireActual('@/test-utils/api')` inside the factory.
- Session usage limits can cut off background agents mid-task; commit early, and check
  `git status` for their partial work before assuming anything landed.
- Two agents editing the same checkout must not `git stash` (it stashes the other agent's
  work); use a `git worktree` for baselines.
- PostgREST `.single()` on zero rows is a 406; use `.maybeSingle()`. `on_conflict` needs a real
  unique constraint, not a partial index. A SECURITY DEFINER policy helper that reads the same
  table breaks `INSERT … RETURNING`.
- The `postgres` npm driver needs `ssl: 'require'` for the pooler; the direct `db.<ref>.supabase.co`
  host is IPv6-only on the free tier.
- OpenAI gpt-5 family: no `temperature`, use `max_completion_tokens` and `reasoning_effort:
  'minimal'` (the gateway does this by model name); `stream_options.include_usage` puts usage
  in the last chunk; `prompt_tokens_details.cached_tokens` is the cached share.
- styled-jsx scopes only intrinsic elements; `react-hooks/set-state-in-effect` is an error in
  this repo's ESLint (use refs or `useSyncExternalStore` in scroll/animation paths).
- The 4Dcoach dev server (port 5174) and its Mac server (`uv run uvicorn main:app --host 0.0.0.0
  --port 8787` in `4Dcoach/server`) are usually running; check `GET /jobs` before restarting.
- Brand: black, white, red `#da0023` (hot `#ff3352`, deep `#b8001e`) only, no gradients; the
  app screens are dark, Fitbod/Strava-like; reuse the tokens in `app/globals.css`. The AI coach
  must never give medical advice (guardrails are in the prompts; keep them).

## Deliverables (in order, each committed, pushed, and deployed once Ali has set the Vercel env)

1. Nutrition, chat, analytics, plan adaptation working (or hidden) for the tester account,
   verified at both widths; the 4D link per exercise; the hidden features listed.
2. The trainer loop with two accounts, `e2e/trainer-loop.spec.ts`.
3. `e2e/tester-journey.spec.ts` covering the whole loop, empty/error states, TESTERS.md and
   docs updated, the deploy checked on www.shaipt.com, the Vultr DNS confirmed, 4Dcoach `main`
   merged and deployed with `VITE_4DCOACH_SERVER`, two friend accounts created.
4. A fresh `HANDOFF-platform.md`.
