# Handing SHaiPT to testers

For Ali. Everything here runs from `~/SHaiPT/SHaiPT-Next-App` with the Supabase keys in `.env.local`.

## Create an account for a friend

```bash
pnpm db:test-users -- friend@example.com
```

Prints the password once. Send it to them yourself (never commit it). Options:

- `--trainer` makes a trainer account (`pnpm db:test-users -- --trainer coach@example.com`).
- `--reset friend@example.com` gives an existing account a new password.
- `--revoke friend@example.com` deletes the account and every row it owns (logs, chats, plans).

What the script does: writes an `invites` row, creates the auth user with the email already
confirmed, marks `profiles.tester = true` (full feature access, no Stripe), role trainee or
trainer, and a `user_preferences` row.

A friend can also sign up themselves at https://www.shaipt.com/login if their email is in
`invites` (add one with `pnpm db:test-users` and then `--revoke` if you only want the invite… or
insert a row in the Supabase table editor: `email` lower-case, `role`) or in the
`ALLOW_SIGNUP_EMAILS` Vercel env variable (comma-separated). Anyone else sees
"SHaiPT is invite-only for now".

## What to tell them

- URL: https://www.shaipt.com — log in, do the coach interview, get a plan, log a workout.
- 4Dcoach (film a set, 4D replay, live rep counter): https://sh-ai-pt-simple.vercel.app on the
  phone. AR needs the Mac server to be up.
- At home or in the gym: the plan uses what they said they have.
- The AI coach is an AI, not a doctor. It will refuse medical questions and say so.
- Limits: 40 AI messages a day per person and a shared monthly budget. When either is hit the
  coach says it is taking a break; logging, plans and everything else keep working.
- Workouts are private by default. A linked trainer can see them; nobody else can.

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
