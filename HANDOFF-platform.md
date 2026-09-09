# Handoff: SHaiPT platform — the loops work; real AI calls and a friend's first session are next

Paste everything below this line into a fresh session started in `~/SHaiPT/SHaiPT-Next-App`.

---

You are continuing work for Ali (they/them) on **SHaiPT**: a Next.js 16 web app (landing, login,
onboarding interview, AI coach chat, AI training plans, workout logging, nutrition, trainer-lite
tools) plus **4Dcoach** (a separate Vite PWA in `~/SHaiPT/SHaiPT_simple/4Dcoach`: film a set on a
phone → 4D replay, reps, tempo, technique score, AR, live rep counter). Read this whole prompt,
then the files it names, before changing anything. Commit in small steps with descriptive
messages, end every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
(keep that trailer as-is), write commit messages to a file and use `git commit -F` (quotes inside
`-m` break it), push after each step. Ali watches from a phone and interjects mid-turn: lead with
the outcome, keep answers short, put anything Ali must do themselves in a numbered list.

This prompt is the state as of **2026-09-09**. The previous handoff is in git history
(`git show cd47b5e:HANDOFF-platform.md`); the session after it did the rest of the trainee loop,
the trainer loop and the tester-readiness pass, in thirteen commits `66d3801..HEAD`.

## The goal

Ali wants to hand **a couple of test accounts to friends**. The app must work end to end for a
stranger: sign in, do the onboarding interview, get a training plan and macro targets, log a
workout, talk to the AI coach, see analytics, optionally be linked to a trainer, open 4Dcoach;
with **no way to run up a bill**. Target under $20 a month for a handful of testers, with hard
caps. **That loop now works and is covered by tests.** What is left is real (not mocked) model
calls, and watching a friend actually use it.

## Repositories, branches, what is live

| What | Where | Branch | Live |
|---|---|---|---|
| SHaiPT Next app | `~/SHaiPT/SHaiPT-Next-App`, GitHub `SHaiPT-app/SHaiPT-Next-App` | `v2-overhaul` (work here; `main` is stale). Last commit on `v2-overhaul`. | www.shaipt.com via Vercel project `s-hai-pt-de3g` (team `alis-projects-e60465e8`). The project is Git-linked to the *old* repo `Alihomaei/SHaiPT`, so production comes from the local checkout: `vercel deploy --prod --yes --scope alis-projects-e60465e8`. **The last deploy was at `6aa4057`; everything after it is not live yet.** |
| 4Dcoach app + Mac server | `~/SHaiPT/SHaiPT_simple/4Dcoach/app` and `/server`, GitHub `Alihomaei/shaipt-simple` | `4dcoach-spec` (`7481dfb`), merged into `main` (`1d96eb9`) | https://sh-ai-pt-simple.vercel.app, deployed from `main` on push. `VITE_4DCOACH_SERVER=https://coach-api.shaipt.com` is set on the project, and the deployed Settings screen shows that address. `app/design/` is untracked: leave it out of git. |

Both repos commit as `alihomaei1997@gmail.com`.

## Accounts and secrets (never commit, never print)

- **Supabase**: org `shaiptapp@gmail.com` (free plan), project **`shaipt`**, ref
  `ayaynfcdoumhzledqoec`, West US (Oregon). URL, anon key, service role key, database password
  and `SUPABASE_DB_URL` (session pooler) are in `.env.local` (gitignored, mode 600).
  Dashboard: https://supabase.com/dashboard/project/ayaynfcdoumhzledqoec
  **Authentication → Confirm email is ON**, which is why accounts must come from
  `pnpm db:test-users` (it confirms the address itself). A self-service sign-up returns a user
  with no session and waits for mail that free-tier Supabase may never send — and the half-made
  account then blocks the script. Turning it off is a one-click change if Ali wants the sign-up
  form to work; the invite gate is separate and stays.
- **OpenAI**: `OPENAI_API_KEY` in `.env.local`. **Credits work as of 2026-09-09**: Ali moved them
  to the key's project and `pnpm ai:smoke` now passes — three calls, gpt-5-nano and gpt-5-mini,
  `$0.000078` total. `.env.local` still carries `AI_MOCK=1` so routine test runs stay free;
  nothing sets `AI_MOCK` on Vercel, so production has been making real calls since the deploy.
  Ali pasted the key into chat once; suggest they rotate it.
- **Test accounts** (all `tester = true`, full access, never Stripe):
  | Email | Role | Purpose |
  |---|---|---|
  | `alihomaei1997@gmail.com` | trainee | Ali's own |
  | `qa-auto@shaipt.com` | trainee | the e2e specs (`TEST_EMAIL`) |
  | `coach-auto@shaipt.com` | trainer | the e2e specs (`TRAINER_EMAIL`) |
  | `ali.homaei2012@gmail.com` | trainer | Ali's friend |
  | `surgpt@gmail.com` | trainee | Ali's friend |
  Passwords for the automation pair are in `.env.local`; the friends' were chosen by Ali. Both
  friend accounts were signed in on production and land on the right screen.
- **Vultr VM**: `45.77.142.86`, Ubuntu 24.04, root over SSH with the Mac's key. It also serves
  medaitimes.com with Caddy: do not replace `/etc/caddy/Caddyfile`, only the
  `coach-api.shaipt.com` block.
- **Vercel env** (`vercel env ls --scope alis-projects-e60465e8`) is clean: the ten dead Firebase
  variables are gone, and `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` (development + production),
  `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AI_MONTHLY_CAP_USD=15` and `ADMIN_EMAILS`
  (production) are set. `scripts/vercel-env-sync.sh` re-does this from `.env.local` if needed.
  Note the *preview* environment has none of them; only production and development were set.

**Month's AI spend: $0.00** — 254 calls, 251 of them mock (the other three are the failed live
smoke attempts). The `ai_budget` row for 2026-09 exists.

## What works, and how it was checked

Everything below was walked in Chromium at 375–390 px against the live project with mock AI, and
most of it is now pinned by a spec. `pnpm dev` must be running; the Browser pane in the desktop
app cannot reach it, so drive it with Playwright.

### The trainee loop — `e2e/tester-journey.spec.ts` (~3 min)
Creates a throw-away tester with the service role, walks **coach list → waiver → seven interview
answers → split → Generate My Plan → Saved → home shows the plan → today's workout, every set,
through to the summary with the coach's feedback → a meal plan, its macro targets and its grocery
list → a chat message still there after a reload → /progress with personal records → a body
measurement that saves**, asserts the "Form check in 4D" link carries a `#live=` href and that
**no request in the whole walk answered 4xx or 5xx**, then deletes the account.

### The trainer loop — `e2e/trainer-loop.spec.ts` (~35 s)
Two browser contexts: the trainee asks the trainer to coach them from the Human Coaches tab, the
trainer accepts on `/trainer`, the trainee appears on the roster, the trainer opens the client,
generates and assigns a plan, and the two message each other. The trainee is created and deleted
by the spec, so it is repeatable (a second request to the same coach is a 409) and never fights
the tester journey over an account.

All eighteen e2e tests pass together in about four minutes (`npx playwright test`).

### Access — `e2e/access.spec.ts` (12 checks, no database)
The proxy, the API's refusal of missing and bogus tokens, the invite gate. It passes against
production too: `PLAYWRIGHT_BASE_URL=https://www.shaipt.com npx playwright test e2e/access.spec.ts`.

### Navigation, which was the big find
Nothing in the app linked to analytics, the body page or nutrition, and onboarding finished by
pushing to the pre-overhaul `/dashboard`. Now: the analytics screen lives at **`/progress`**
inside the app shell (with `WeeklyInsightsCard`, which previously only mounted on `/dashboard`),
home carries three tiles (Nutrition, Progress, Body), the header nav is Progress / Home / Coach
List / 4Dcoach, and `/dashboard` and `/dashboard/analytics` redirect.

**On a phone the entire header was dead**: the full-width nav at z-1000 covered Profile,
Messages, the bell, Settings and Log Out, and the hamburger sat under Log Out. Below `md` the
header is a plain flex row now; the mobile menu is fixed to the viewport and opaque, and its
lines are visible (they were painted with `--pill-bg`, which this app sets to transparent).

### A page sweep
All eighteen pages a tester can reach, as a brand-new account: none blank, none showing raw JSON
or an error, none stuck loading, no 4xx/5xx. `scripts`-free; re-do it with a short Playwright
script if you change routing.

### What is switched off, and how to bring it back
Listed in TESTERS.md as well. The in-app MediaPipe form checker
(`NEXT_PUBLIC_ENABLE_FORM_CHECKER=1`), Google/Apple sign-in (`NEXT_PUBLIC_ENABLE_OAUTH=1`), the
activity feed (off the nav; `/activity` and `/feed` still answer), the pre-overhaul dashboard
(redirects). `ConsistencyDashboard` was already imported by nothing.

## Still on Ali (ask in your first reply)

1. **Redeploy after any change** — the permission classifier blocks `vercel deploy` and
   `vercel env add/rm` for you:
   `cd ~/SHaiPT/SHaiPT-Next-App && vercel deploy --prod --yes --scope alis-projects-e60465e8`
2. **Vercel Spend Management cap** if the team is Pro. Stripe stays in test mode.
3. Whether to turn **Confirm email** off so the sign-up form works on its own.

## Your workstreams, in order

### A. Cost the AI for real
`pnpm ai:smoke` passes, so this is unblocked. Remove `AI_MOCK=1` from `.env.local`, run each
AI step **once** for real — interview, split recommendation, plan, dietitian, nutrition plan,
chat, workout summary, weekly insight — and read `GET /api/admin/usage` for the true cost per
step. Write those numbers into TESTERS.md so Ali can predict a month. Two things will change
with real calls: the interview extraction will fill the intake (mock returns an empty one, which
is why a mock plan says "3 days/week" whatever the answers were), and plans will vary. Re-run
`e2e/tester-journey.spec.ts` with real calls once, then put `AI_MOCK=1` back for routine runs.

### B. Watch a friend use it
`surgpt@gmail.com` (trainee) and `ali.homaei2012@gmail.com` (trainer) exist and work on
production. Ask Ali to have one of them do a session on a phone and report what confused them.
That is worth more than another audit. Fix what they hit.

### C. The rough edges left, in the order they matter
1. **`/workouts` is a 404** — only `/workouts/new` exists; the history list lives on `/progress`.
   Either add a page or leave it (nothing links to it).
2. **Plan adaptation** (`/api/ai-coach/plan-adaptation`, `PlanAdaptationReview`) lives on
   `/workout/[sessionId]`, a second workout screen that only the dead `BottomTabBar` and
   `TopNavBar` ever linked to. Decide: give it an entry point, or delete both the screen and
   those two components.
3. **`pnpm db:test-users` leaves `profiles.username` null**, so the app falls back to `full_name`
   or the email prefix. `/api/users/link` and the trainer's client search look people up *by
   username*, so both are unusable for scripted accounts. Set a username in the script.
4. **`/api/users/link`** lets a trainer set `profiles.trainer_id` on any trainee with no consent
   from them. It grants no data access — `is_coach_of()` requires an *active* row in
   `coaching_relationships`, which is what `/api/trainer/clients` and the RLS policies use — so
   it is a dead limb rather than a hole. Delete it, or make it require the relationship.
5. **The 17 red Jest suites** (18 before this session) are component tests with stale mocks:
   LoginForm, Dashboard, CoachInterviewPage, landing/*, both AICoachChat files. None of them
   reflects a broken screen. Worth a pass when there is nothing better to do; compare against a
   `git worktree` at the previous commit before assuming you caused one.

## Verification recipe

Another chat's `pnpm dev` is usually on port 3000 from this same checkout, and Next 16 holds
`.next/dev/lock`, so a second `next dev` here fails. Use the running server (it hot-reloads and
re-reads `.env.local`), probe it with `curl`, and drive it with Playwright from the repo:
`require('/Users/ali/SHaiPT/SHaiPT-Next-App/node_modules/@playwright/test')` in a script in the
scratchpad, `chromium.launch()`, log in through `/login`, then act. A JSON list of steps (goto /
click by role or testid / fill / press / wait / screenshot / dump body text, buttons and every
4xx/5xx) works well. Screenshots go to files you then `Read`.

Selectors worth knowing: login placeholders "Email or Username" and "Password", button "Login" —
**wait ~2 s after `goto('/login')` before filling, or hydration clears the fields**. Coach cards
`data-testid="coach-card-<id>"`, `start-training-btn`, `accept-waiver-btn` (wait for it: the
waiver renders after the terms check), interview input placeholder "Type your answer...",
dietitian input `data-testid="dietitian-chat-input"`, logger buttons "Complete Set", "Skip Rest",
"Next Exercise", "Finish Workout", `data-testid="fourd-form-check-link"`, home tiles
`data-testid="secondary-link-<name>"`. Never run `pnpm build` while `pnpm dev` runs (it corrupts
`.next`; fix with `rm -rf .next`).

## Gotchas learned (do not rediscover)

- The permission classifier in Ali's setup blocks `vercel deploy`, `vercel env add/rm`, `kill` on
  the VM, long heredocs, and `sleep` in a foreground shell. `ssh root@45.77.142.86 '<read-only>'`
  and `git push` are fine. Write files with the Write tool, not shell heredocs.
- `cd` inside a Bash call resets the session's working directory afterwards. Use absolute paths.
- PostgREST `.single()` on zero rows is a **406**. Everywhere "no rows" is a normal answer, use
  `.maybeSingle()`. That sweep is done (22 in `lib/supabaseDb.ts` plus five in pages); the
  `.single()` calls left are all `INSERT … RETURNING`.
- A hash-only change is a same-document navigation, so 4Dcoach's `#live=` deep link only fires on
  a **fresh** load. The app's links use `target="_blank"`, so that is fine.
- `https://coach-api.shaipt.com` answers **502** whenever the Mac's server on port 8787 is not
  running (the tunnel and Caddy stay up). Start it with the `4dcoach-server` entry in
  `~/SHaiPT/SHaiPT_simple/4Dcoach/.claude/launch.json`. The live coach does not need it — pose
  tracking is on-device — but importing a video does.
- Playwright's `getByRole('button', { name: 'Messages' })` also matches the header's icon button,
  which has that `aria-label` and no text. Use `getByRole('button').filter({ hasText: /^Messages$/ })`
  for a page's own tabs.
- Text that CSS uppercases is still lower-case in the DOM: match `/protein/i`, not `/PROTEIN/`.
- `jest.mock` factories are hoisted above imports: reference helpers via
  `jest.requireActual('@/test-utils/api')` inside the factory. When you add a query builder call
  (`.not()`, `.maybeSingle()`) to a route, the hand-rolled Supabase mocks in `__tests__` need it
  too or they fail with "not a function".
- Two agents editing the same checkout must not `git stash`; use a `git worktree` for baselines.
- `on_conflict` needs a real unique constraint, not a partial index. A SECURITY DEFINER policy
  helper that reads the same table breaks `INSERT … RETURNING`.
- The `postgres` npm driver needs `ssl: 'require'` for the pooler; the direct
  `db.<ref>.supabase.co` host is IPv6-only on the free tier.
- OpenAI gpt-5 family: no `temperature`, use `max_completion_tokens` and
  `reasoning_effort: 'minimal'`; `stream_options.include_usage` puts usage in the last chunk.
- `react-hooks/set-state-in-effect` is an error in this repo's ESLint. Pre-existing lint errors
  in files you touch are fine to leave; do not add new ones. Type-check with
  `npx tsc --noEmit -p tsconfig.json` (errors under `__tests__/` are pre-existing).
- Brand: black, white, red `#da0023` (hot `#ff3352`, deep `#b8001e`) only, no gradients; the app
  screens are dark, Fitbod/Strava-like; reuse the tokens in `app/globals.css`. The AI coach must
  never give medical advice (the guardrails are in the prompts; keep them).

## Deliverables

1. Real AI calls costed and written down; `AI_MOCK` off for a full journey run, then back on.
2. Whatever a friend's first real session turns up.
3. The five rough edges in workstream C, or a decision to leave each.
4. A fresh `HANDOFF-platform.md`.
