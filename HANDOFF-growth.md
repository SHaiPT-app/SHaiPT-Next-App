# Handoff: SHaiPT growth — content, ads, and the funnel behind them

Paste everything below this line into a fresh session started in `~/SHaiPT/SHaiPT-Next-App`.

---

You are working for **Ali (they/them)** on **SHaiPT**, an AI personal-training web app at
**https://www.shaipt.com** (Next.js 16 App Router, TypeScript, Tailwind, Supabase, Vercel).
This session continues the growth work: getting an Instagram and YouTube audience, a paid-ads
funnel, and the product plumbing behind them.

**House rules.** Commit in small steps with descriptive messages. Write commit messages to a file
and use `git commit -F` (quotes inside `-m` break it). End every commit message with
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, kept as-is. Ali watches from a phone and
interjects mid-turn: lead with the outcome, keep answers short, and put anything Ali must do
themselves in a numbered list. Current branch is `v2-overhaul`; **10 commits are unpushed** and
Ali has not asked for a push — ask before pushing.

**The one thing to internalise.** Ali's previous channel, medAI Times, published 5–7 times a week
from March to July 2026 — roughly 100 videos — and finished **under 500 subscribers**. The
machine worked; publishing on a schedule was not a strategy. Every proposal here is judged against
that. Do not propose raising cadence.

---

## The business context — settled, do not relitigate

| | |
|---|---|
| Goal | **1,000 active members, then sell the app.** Ali is a solo founder. |
| Budget | **$400/month all-in** — tools *and* ad spend together. Roughly $50 Higgsfield, $150 Google Search, $200 Meta. |
| Funnel | **Waitlist first.** Sign-up stays invite-only; ads convert to an email, not an account. |
| Ad geography | **US and Canada only.** No EU/UK, so no GDPR. |
| Creative | Photoreal, never cartoonish. Ali will **not** appear on camera and is building **their own recurring AI characters** (Higgsfield) rather than hiring creators. |
| Channel name / handle | `SHaiPT \| Your AI Personal Trainer`, `@ShaiPTofficial` — Ali chose to keep both when offered alternatives. |

**The honest arithmetic, already agreed:** at $20–45 per activated member, $350/month of ads buys
8–18 members a month, so 1,000 via paid alone is ~83 months. **Paid is a hook-testing lab; organic
has to carry the goal.** Meta also needs ~50 conversions per ad set per week to exit the learning
phase, which this budget will never reach — so optimise for a cheap upper-funnel event.

**Three creative rules that are not negotiable** (they appear in `growth/ads/policy-limits.md` and
`growth/prompts/content-rules.md`, which is upstream on conflicts):

1. **AI characters present and demo; they never pose as customers reporting results.** That is a
   fabricated endorsement under the FTC's 2024 rule, is rejected by Meta, and breaks Higgsfield's
   own terms, which forbid representing output as human-generated.
2. **Videos analysing famous lifters' public footage are organic-channel-only.** Never in a paid
   ad, never boosted — right of publicity and implied endorsement.
3. **No before/after body imagery in ads**, even with real people. Meta restricts it regardless of
   authenticity.

---

## What exists now

### The funnel
- **`/waitlist`** (`components/waitlist/WaitlistPage.tsx`, `app/api/waitlist/route.ts`) — a
  single-promise ad landing page: one field, no nav, no way out except the form. Captures
  `utm_source/medium/campaign/content/term`, referrer and landing path; maps a bare `gclid` to
  `google` and `fbclid` to `meta`. **First touch wins**, persisted in `localStorage`, so an
  ad-click-then-return-later signup still credits the campaign that paid for it. Fires a
  `waitlist_signup` event to `window.dataLayer` **only when a row is actually created** — a repeat
  submission shows a friendly message and reports no conversion.
- **`waitlist` table** (migration `0150`) — service-role only under RLS; the anon key can neither
  read it nor probe whether an address is on it. Currently **0 rows**.
- **`pnpm waitlist:invite`** (`scripts/invite-waitlist.ts`) — turns waitlist rows into `invites`
  rows and emails them. Dry-run by default; `--send` to act; `--stats` for signups by campaign.
  Oldest first. Writes the invite row, sends the mail, and only then stamps `invited_at`, so a
  failure anywhere leaves that person genuinely still in the queue. With no `RESEND_API_KEY` it
  still writes the invites and prints the addresses to mail by hand.

### The content pipeline — `growth/`
Ported from `~/KK/ai-ml-briefings` (medAI Times) and retargeted at **4Dcoach**: film one set on a
phone, get a 4D replay you can walk around, with reps, tempo and a technique score.

- `./growth/run-short.sh` — **half 1**: generate + score, then stop at a human gate.
  `./growth/run-short.sh --build [DATE]` — half 2: voiceover, beats, render, thumbnail, metadata.
  They are separate commands on purpose; the approval between them is the point.
- **It deliberately cannot upload.** Auto-publishing is what let four months of unreviewed video
  ship to nobody, and dropping it removed the whole OAuth-expiry failure class.
- `growth/prompts/hook-rubric.md` gates every Short. Dimension 1 is "visual proof in the first
  second" and a **0 there is NO-GO regardless of total**.
- `./growth/preflight.sh` fails loudly and in under a second. `notify.sh` sends off-machine and
  says so when the webhook is unset. `watchdog.sh` catches "nothing shipped at all".
- **It has been run once, and correctly refused:** NO-GO at 12/20, because no footage is
  registered. Its own explanation of what would unlock it is in `growth/out/short-<date>.md`.

### The channel — `growth/channel/`
Live at **youtube.com/@ShaiPTofficial**, channel ID `UCVzEqsZ_JNa9kBazYXSXwfw`. Banner,
description (916/1000), two UTM-tagged links, 25 keywords and the "not made for kids" declaration
are **applied and published**. Art sources are SVG; `./growth/channel/render.sh` rebuilds
`out/` (gitignored). The two brand fonts are installed, so renders match the site exactly.

`about.md` is the source of truth for every Studio field. `first-10-videos.md` has ten concepts in
priority order, each cited to a real feature.

### The ads playbook — `growth/ads/`
`README.md` (budget split and the honest arithmetic), `google-ads.md` (Search only — PMax and
Display are explicitly rejected with reasons; every RSA string machine-counted against the real
character limits; negative keywords cover **Shaip the AI-data company** and the Albanian
"shqiptare" queries), `meta-ads.md`, `tracking.md`, `policy-limits.md`.

### The legal drafts — `growth/legal/`
`privacy-policy.md` and `terms-of-service.md`, drafted from a ten-agent audit of what the code
actually does, then revised for the US/Canada decision. **`growth/legal/README.md` is a 69-item
checklist in four groups**: A. before you can publish these pages (16), B. before you run ads (10),
C. before you scale (33), D. decisions for a lawyer (10). **Unreviewed drafts — a lawyer must see
them before publication.** GDPR is out of scope; **PIPEDA applies from the first Canadian user with
no revenue threshold**; California's CPRA stays on the books with SHaiPT below all three thresholds.

---

## Security and privacy fixes shipped this session

All verified empirically against the live project, not just read off the schema.

- **`0170` — the profiles read-everything hole.** `profiles_select` was `USING (true)`: any
  signed-in user could read every profile's email, date of birth, gender, height and weight. Proved
  with a throwaway account and the public anon key — it returned all 8 rows. Migration `0080` had
  added a narrower-looking policy, which changed nothing, because **Postgres OR's permissive
  policies**. Now `id = auth.uid() OR is_coach_of(id)`, plus a **`public_profiles` view** carrying
  only safe columns for search and trainer cards. Five routes read the view. After: 1 row instead
  of 8, and `public_profiles.email` does not exist. `scripts/rls-check.ts` had been asserting the
  hole as the requirement and now asserts the real contract.
- **`858ad72` + `121d87f` — workouts published without consent.** The schema says
  `workout_privacy DEFAULT 'private'`, but four call sites read `|| 'public'` and
  `!== false` from a cached profile where those fields are often absent. Worst of them: the
  personal-record loop in `WorkoutLogger` sat **outside** the consent gate entirely. All four fixed.
- **`0180` — an age gate.** There was none anywhere. Sign-up now collects a date of birth, and
  `handle_new_user` enforces it inside the `auth.users` insert, so there is no bypass — refused
  even through the service-role admin API. **Minimum is 18**, set in `lib/age.ts`, which explains
  the choice; lowering it is one line there plus one in the migration.
- **`0160` / `121d87f` — deletion.** `food_database.created_by` had no `ON DELETE` rule, so anyone
  who saved a custom food could never be deleted; now `SET NULL`. Progress photos survived account
  deletion; `--revoke` now empties the storage folder through the API first and **refuses to delete
  the account if that fails**.

**A trap worth knowing:** `0180` first tried to purge storage from a `BEFORE DELETE` trigger.
Supabase refuses direct deletes on `storage.objects` — *"Use the Storage API instead"* — and the
raise aborted the transaction, so **every account deletion failed**. `0190` drops it. There is no
database-level safety net for storage; the self-serve delete-account route, when built, must call
the same purge.

---

## Tests

`pnpm test` is **16 suites / 68 tests red** (was 18/92). **`TEST-DEBT.md` is the working list** —
per-suite counts that sum to 68, each with its cause. Keep it updated; delete a row when a suite
goes green.

Almost none of it is broken product. The suite asserts a version of SHaiPT that no longer exists.
The clean proof is `animations.test.ts`: it expects `rgba(255, 102, 0)`, the retired neon orange,
and receives `rgba(218, 0, 35)`, which is `--brand`.

**The highest-leverage item left:** twenty suites still carry their own inline framer-motion mock.
Two of them defined `motion.create` but not `motion.div`, which killed 24 tests with an error that
said *"you might have mixed up default and named imports"* and had nothing to do with imports.
`test-utils/framerMotion.ts` is now a shared Proxy-based mock that answers for any tag. The other
twenty pass only because their components happen to use the tags their copies list — the same
latent bug, not yet triggered. Moving them over is cheap insurance.

Next largest: `LoginForm.test.tsx` (14) and `CoachSelectionPage.test.tsx` (11). Note `LoginForm`
was **already 12/12 red before** the age-gate field was added, but now also needs re-pointing at a
form with an extra required input.

---

## Blocked on Ali — check these before planning work that depends on them

**Status 2026-09-11 (later session):** items 1, 2, 3 and 5 are done and verified: Resend is
installed with `send.shaipt.com` verified, Supabase confirm-email is off, Higgsfield Plus is
active. Item 4 (the bench press set) is still open. The cast decision is in
`growth/characters/`. **2026-09-12 later:** `v2-overhaul` is pushed to origin. Production was
not redeployed: the session's permission classifier blocks `vercel --prod`, so Ali runs it.
All four identity sheets are generated and favourited in Higgsfield; Maya's is on disk
(`growth/characters/maya/sheet/`), the other three wait on Chrome's automatic-downloads
setting (`growth/characters/README.md` §10). The 30-second pitch is scripted in
`growth/pitch/30s-pitch.md` and blocked on the same bench set.

1. **Accept the Resend marketplace terms** —
   https://vercel.com/alis-projects-e60465e8/~/integrations/accept-terms/resend?source=cli
   Then run `vercel integration add resend --plan free -m domain=send.shaipt.com -m region=us-east-1 --no-claim`
   and `vercel env pull`. Until then no invite mail can send. (Do **not** accept terms on Ali's
   behalf.)
2. **Turn off "Confirm email"** in Supabase → Authentication → Sign In / Providers. With it on,
   invited people stall at "check your email" and free-tier Supabase mail may never arrive. The
   invite gate still protects sign-up.
3. **Add the SPF/DKIM DNS records for `send.shaipt.com`** once Resend is installed.
4. **Shoot one bench press set**, run it through 4Dcoach, register it with `./growth/assets.sh add`,
   and screen-capture the replay orbiting to an overhead angle. **This is the single thing blocking
   the first video** — the pipeline said so itself.
5. **Higgsfield subscription** — Plus, $59/month monthly (not the $47 annual; $564 upfront is the
   wrong risk before a single Short exists). Commercial use is explicitly permitted by their terms.

---

## The work queue

**Do not start anything here without checking with Ali first** — they steer this closely and the
order below is a recommendation, not an instruction.

1. **A privacy policy and terms that can actually be published.** Group A of
   `growth/legal/README.md` is 16 items. There are **no `/privacy` or `/terms` routes on the site
   at all**, and both Google and Meta require an accessible privacy policy from an advertiser
   collecting emails — this blocks ad-account approval, not just review.
2. **Group B — before you run ads** (10 items), including the `waitlist_signup` dataLayer event,
   which currently **goes nowhere**: there is no GTM container, no `gtag.js` and no Meta pixel in
   the repo. `growth/ads/tracking.md` has the code.
3. **Remaining privacy gaps.** `ai_cache` is never purged and has no `user_id`, so erasure cannot
   reach cached plans. There is still no self-serve delete-account or data-export path.
4. **4Dcoach's security** — reported by the audit and **not independently verified**: an
   unauthenticated API with `allow_origins=['*']`, an unauthenticated `DELETE /jobs/{id}`, and no
   automatic clip deletion. It lives in `~/SHaiPT/SHaiPT_simple/4Dcoach`. Verify before acting.
5. **Test debt** — `TEST-DEBT.md`, starting with the twenty inline framer-motion mocks.
6. **Instagram** — the account has not been set up at all. Nothing exists for it yet.

---

## Gotchas discovered the hard way

- **`coach-api.shaipt.com` 502s whenever Ali's Mac server on port 8787 is not running.** Live pose
  tracking is on-device and fine; *importing a video* is not. Relevant to what an ad may promise.
- **"Nothing is uploaded" is false as an absolute.** The lift analysis really is in-browser
  (`4Dcoach/README.md:26`), but `SPEC.md:36-38` uploads the environment and set clips for the splat
  scene, and the server exposes `/uploads`, `/body3d` and `/bodyscan`. The channel description was
  corrected to promise only the analysis. Keep this in step with the privacy policy.
- **`UID` is a reserved variable in zsh.** Using it in a shell snippet fails cryptically.
- **Homebrew `ffmpeg` has neither libass nor libfreetype**, and Homebrew ImageMagick has no
  fontconfig (fonts resolve by absolute path only, and a font *name* silently fails, taking all
  on-screen text with it). The pipeline works around both.
- **YouTube allows only two name changes and two handle changes per 14 days.** `@shaipt` and
  `@shaipt4d` were verified free on 2026-09-11; `@4dcoach` is taken.
- **Verify agent findings before acting on them.** Of the audit's flags this session, several were
  right and serious, but "876 exercises is wrong" was not (the live DB has exactly 876 — the agent
  read a stale seed comment), and one claim about `/jobs` deletion needed rewording rather than
  acceptance.
