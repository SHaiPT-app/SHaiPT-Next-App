# Handing SHaiPT to testers

For Ali. Everything here runs from `~/SHaiPT/SHaiPT-Next-App` with the Supabase keys in `.env.local`.

## Create an account for a friend

```bash
pnpm db:test-users -- friend@example.com
```

Prints the password once. Send it to them yourself (never commit it). Options:

- `--trainer` makes a trainer account (`pnpm db:test-users -- --trainer coach@example.com`).
- `--password 'chosen-one'` sets the password instead of generating one, for an account you
  hand over in person. It is a real sign-in on the live project: pick accordingly.
- `--reset friend@example.com` gives an existing account a new password.
- `--revoke friend@example.com` deletes the account and every row it owns (logs, chats, plans).

What the script does: writes an `invites` row, creates the auth user with the email already
confirmed, marks `profiles.tester = true` (full feature access, no Stripe), role trainee or
trainer, and a `user_preferences` row.

**Use the script, not the sign-up form.** The Supabase project has *Confirm email* on, so a
self-service sign-up creates the account with no session and stops at "check your email" —
and free-tier Supabase mail is rate-limited, so that mail may never arrive. Worse, the
half-made account then blocks the script ("already exists"). The script confirms the address
itself, so its accounts sign in straight away. To open the sign-up form up properly, turn
*Confirm email* off in Supabase → Authentication → Sign In / Providers; the invite gate stays.

The form itself is gated either way: the email must be in `invites` (the script writes one) or
in the `ALLOW_SIGNUP_EMAILS` Vercel env variable (comma-separated). Anyone else sees
"SHaiPT is invite-only for now".

## What is switched off

Rather than leave a button that cannot work, these are hidden. Each is one env variable or one
line away from coming back, and none of them is needed for the loop above.

- **The in-app form checker** (the camera pose overlay in the workout logger) is untested;
  4Dcoach is the answer for form, and every mapped exercise in the plan and the logger has a
  "Form check in 4D" link. Set `NEXT_PUBLIC_ENABLE_FORM_CHECKER=1` to offer it again.
- **Continue with Google / Continue with Apple** bounce off Supabase, which has neither
  provider configured. Set `NEXT_PUBLIC_ENABLE_OAUTH=1` once they are set up.
- **The activity feed** (`/activity`, `/feed`) is off the nav: posts are private by default, so
  it can only ever be empty for a handful of testers. Both URLs still answer.
- **`/dashboard`** and **`/dashboard/analytics`**, the pre-overhaul screens, redirect to `/home`
  and `/progress`.
- **Plan adaptation** lives on `/workout/[sessionId]`, a second workout screen nothing links to.
  The workout a tester does is `/home/workout`.

## What to tell them

- URL: https://www.shaipt.com — log in, do the coach interview, get a plan, log a workout.
- Everything is reachable from home: Start Workout, 4Dcoach, Coach List, and the three tiles
  for Nutrition, Progress and Body. Progress, Home, Coach List and 4Dcoach are in the header
  (behind the ☰ on a phone); Profile and Messages are the two icons on the left.
- 4Dcoach (film a set, 4D replay, live rep counter): https://sh-ai-pt-simple.vercel.app on the
  phone. AR needs the Mac server to be up.
- At home or in the gym: the plan uses what they said they have.
- The AI coach is an AI, not a doctor. It will refuse medical questions and say so.
- Limits: 40 AI messages a day per person and a shared monthly budget. When either is hit the
  coach says it is taking a break; logging, plans and everything else keep working.
- Workouts are private by default. A linked trainer can see them; nobody else can.

## The AI is on canned replies until the OpenAI key sees credits

`.env.local` has `AI_MOCK=1`, and the gateway also falls back to mock replies when there is no
key outside production. Every AI step therefore works and costs nothing, but the plans and the
coach's answers are stock text rather than a real reply, and the interview extraction fills
nothing (so a mock plan says "3 days/week" whatever the answers were).

The key in `.env.local` is valid — `GET /v1/models` answers 200 — but chat completions come back
`429 credit_balance_exhausted`, which is an *organization*-level balance: the credits are on a
different org or project than the key. Check which project owns the key on platform.openai.com,
then `pnpm ai:smoke` (three tiny live calls). When it prints three results, remove `AI_MOCK=1`
from `.env.local`. Nothing sets `AI_MOCK` on Vercel, so production has always been live.

## Before a deploy

```bash
npx playwright test                                   # against the dev server
PLAYWRIGHT_BASE_URL=https://www.shaipt.com npx playwright test e2e/access.spec.ts
```

- `e2e/access.spec.ts` — twelve checks, no database: the proxy, the API's refusal of missing
  and bogus tokens, the invite gate.
- `e2e/tester-journey.spec.ts` — makes a throw-away tester, walks interview → plan → workout →
  nutrition → chat → progress → body, and deletes it. ~3 minutes.
- `e2e/trainer-loop.spec.ts` — request, accept, roster, assign a plan, message both ways, with
  a trainee it creates and deletes. ~35s.

They read `TEST_EMAIL` / `TEST_PASSWORD` (the journey's sign-in checks), `TRAINER_EMAIL` /
`TRAINER_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, and skip themselves
without them. Each makes its own throw-away account for the long walks, so nothing accumulates
and two specs never drive the same login at once.

## Reading usage and cost

- `GET https://www.shaipt.com/api/admin/usage` while signed in as an email listed in
  `ADMIN_EMAILS` (defaults to alihomaei1997@gmail.com) returns the month: spend, calls, by
  feature, by user, today. Add `?month=2026-09` for another month.
- The same numbers are in Supabase → Table editor → `ai_usage` (one row per call) and
  `ai_budget` (one row per month: `spent_usd`, `cap_usd`).
- Caps live in the Vercel env: `AI_MONTHLY_CAP_USD` (default 15), `AI_DAILY_CALLS_PER_USER`
  (40), `AI_DAILY_TOKENS_PER_USER` (200000). Change, redeploy.
- The external stops (an OpenAI monthly usage limit on platform.openai.com → Billing → Limits, Vercel Spend
  Management, Stripe in test mode) are the real ceiling; the in-app caps only keep normal use
  well under them.

## When something breaks

- The app shows "Something went wrong on our side. Tell Ali what you were doing and quote
  `abcd1234`". Search that id in Vercel → Project → Logs (`vercel logs www.shaipt.com` from the
  repo also works); every API error line starts with `[api:<route>] user=<id> req=<id>`.
- `pnpm db:rls-check` proves nobody can read anyone else's rows. Run it after any policy change.
- `pnpm db:migrate -- --status` shows which migrations are applied.

## Revoking

`pnpm db:test-users -- --revoke friend@example.com`. The auth user is deleted and every table
cascades from `profiles`. Their invite row goes too, so they cannot sign up again unless you
re-invite them.
