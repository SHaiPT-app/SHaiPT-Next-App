# growth/legal — what these documents are, and what still has to happen to them

Two documents live here:

- `privacy-policy.md` — intended for `https://www.shaipt.com/privacy`
- `terms-of-service.md` — intended for `https://www.shaipt.com/terms`

**Neither is publishable as it stands.** Both carry `> TODO(ali):` blocks. Some are decisions only Ali can make; others are code changes that must ship *before* the sentence next to them goes live, because publishing that sentence would otherwise make the document untrue.

---

## The checklist: 69 items

| Group | What it means | Count |
|---|---|---|
| **A. Before you can publish these pages** | The page does not exist, a blank is unfilled, or a published sentence would be false on the day it published. | 16 |
| **B. Before you run ads** | Ad review rejects it, the ad funnel breaks on it, or it is a claim the advertising cannot substantiate. | 10 |
| **C. Before you scale** | Works by hand for a handful of invited testers. Does not survive volume. | 33 |
| **D. Decisions for a lawyer** | The answer is legal judgement, not code. Start these early; they have lead times. | 10 |

Work A top to bottom. B before submitting anything to Google Ads or Meta. C is the backlog that decides whether the honest version of these documents gets shorter or longer over the next six months.

Neither document should be published with `> TODO(ali):` blocks still in it. When they are stripped, what remains must be true — so resolve them, do not delete them.

---

## Scope decision: the United States and Canada

Ali has decided to advertise in the **US and Canada only**. Three consequences, because this is more specific than "we skipped Europe":

- **GDPR / UK GDPR do not apply.** SHaiPT does not target those markets, so the legal-bases table, the Article 9 consent framing, the Article 27 representative, the transfer mechanisms and the supervisory-authority complaint line have all come out. Privacy §6.3 states the position honestly and lists what would have to be *built first* if an EU or UK geo were ever added to a campaign. That is item D10 and it is a project with a cost, not a checkbox.
- **California's CCPA/CPRA is US law and did not go away** — but it has applicability thresholds, and a pre-launch solo product meets none of them: $25M revenue, 100,000+ California consumers or households, or 50%+ of revenue from selling/sharing personal information. Privacy §6.1 says that plainly rather than either ignoring the law or performing compliance with it, and flags that **the 100,000-consumer threshold is the one that trips first** — a free product buying traffic reaches that number long before it reaches $25M in revenue.
- **Canada's PIPEDA binds SHaiPT on day one.** It applies to commercial activity involving Canadians with **no revenue or headcount threshold**, so a solo founder with ten Canadian users is in scope on the same terms as a large company. The drafts did not mention it at all. New Privacy §6.2 covers it, and it is the reason several items below changed from "if GDPR applies" to "owed now": meaningful consent for health data, a 30-day access-request deadline, retention limits, a breach log kept for 24 months, and CASL on the waitlist invitation email.

---

## A. Before you can publish these pages — 16

1. **Ship `/privacy` and `/terms`**, wire the footer's three legal links (all three point at `#` today), resolve the Cookie Policy link (point it at `/privacy#cookies` or remove it), and **deploy** — production is several commits behind. Verify 200 in production. *(Privacy §0)* — **BLOCKER**
2. **Set the publication date** on both documents and keep a dated changelog from day one. *(Privacy header, Terms header)*
3. **Fill in the identity block on both documents** — legal entity name, publishable postal address, contact email — and name the individual accountable for personal information under PIPEDA. *(Privacy §1, Terms §1)*
4. **Rewrite the intake photo screen's "Photos are private and only used for your training assessment"**, and make the `progress_media` row rule *and* the storage-object rule respect `visibility`, so a coach cannot read photos marked private. Both halves of that on-screen sentence are false today. Ships in the same release as the policy. *(Privacy §3.4)*
5. **Fix the two remaining workout-privacy fallbacks.** `app/workout/[sessionId]/page.tsx` still reads the cached profile and still falls back to `auto_post_workouts !== false` / `workout_privacy || 'public'`. And in `components/WorkoutLogger.tsx` the per-PR post loop sits **outside** the auto-post check and falls back to `'public'`, so personal records are published for members who never opted in. *(Privacy §7.4, Terms §8)*
6. **Pick a minimum age, write it into both documents, and build the confirmation step at sign-up.** Sign-up validates email format, password rules, username length and the invite, and nothing else. *(Privacy §12, Terms §4)* — **BLOCKER**
7. **Add a terms + privacy checkbox at sign-up**, recorded server-side in its own column, blocking on failure. Rename `terms_accepted_at`, which today conflates "read the health waiver" with "agreed to the Terms". *(Terms §1, Privacy §5)* — **BLOCKER**
8. **Build the health-data consent step** where the intake interview asks about injuries and allergies — server-side, recorded, blocking on failure. This is a PIPEDA meaningful-consent requirement now, not a conditional GDPR one. *(Privacy §5, §6.2)*
9. **Decide where the health disclaimer gates the product.** Today it gates one screen, is written from the browser, and fails open. *(Terms §3)* — **BLOCKER**
10. **Decide whether 4Dcoach is inside or outside "the service"** — and make the ads, the waitlist page, the links and both legal pages all say the same thing. Today both documents disclaim the headline feature the ads sell. *(Privacy §2, Terms §2, §18)* — **BLOCKER**
11. **Configure Stripe, or rewrite Terms §6 and Privacy §3.10 in the conditional** and change the landing page's pricing buttons to match. Stripe is not in test mode; it is not configured in any environment, so checkout returns a 500. *(Terms §6, Privacy §3.10)* — **BLOCKER**
12. **Build a way to reach users** (product email or in-app announcement) or rewrite the change-notification clauses in both documents — neither channel exists. Then set the notice period for material changes. *(Privacy §14, Terms §16)*
13. **Write the data-request response deadline into Privacy §10.** 30 days is the PIPEDA number for a Canadian access request and is owed today. *(Privacy §10)*
14. **Decide governing law and venue** and write them in. Take D8's advice first. *(Terms §17)*
15. **Confirm the OpenAI account's data-controls setting** and put the same answer in both documents. Terms §8 cannot assert that content is not used for training while Privacy §7.2 admits nobody has checked. *(Privacy §7.2, Terms §8)*
16. **Check Supabase → Authentication → Emails** for a custom SMTP provider, and **Vercel → Project Settings** for Observability, Web Analytics, Speed Insights and Log Drains. If any is on, the processor table in Privacy §7.1 and the analytics claim in §8.3 are incomplete. The code cannot see these; only the dashboard can. *(Privacy §7.1)*

---

## B. Before you run ads — 10

1. **Add a privacy link to `/waitlist`** under the form. The ad destination collects an email with no policy link, no consent line and no footer. *(Privacy §0)* — **BLOCKER**
2. **Fix the 4Dcoach server**, regardless of how A10 is decided: no authentication on any endpoint, `allow_origins=['*']`, an unauthenticated `GET /jobs` listing every job on the server, an unauthenticated `DELETE /jobs/{id}` so anyone can delete anyone's, and no retention policy — nothing removes uploaded clips automatically. Correct the 4Dcoach README's "no upload" claim. *(Privacy §2)* — **BLOCKER**
3. **Add a working unsubscribe link and a postal address** to the waitlist invitation email. It is promotional and its only opt-out is "ignore it" — CAN-SPAM exposure in the US, **CASL** exposure in Canada (which also wants sender identification and unsubscribe honoured within 10 days), on exactly the mail the ads generate. *(Privacy §7.1, §6.2)*
4. **Remove the marketing claims neither document can support.** Live today: "Join thousands of athletes training smarter with AI" in the footer, on an invite-only app with a handful of accounts. One import away, in an orphaned `Features` component: "prevent injury", "Injury prevention alerts", "98% Form Accuracy", "10K+ Workouts Generated", "4.9 User Rating". `growth/ads/policy-limits.md` sections (b) and (c) forbid every one of these. *(Terms §19 comment)*
5. **Resolve the "free Pro month" offer** — advertised in three places with three different terms, configured in code as three months, implemented nowhere. Write real promotional terms and build the award path, or take the claim down from all three surfaces. *(Terms §6A)*
6. **Decide about the advertised 0–100 technique score** — build it (and rewrite Privacy §4 and Terms §3 *before* it ships) or take it off the landing and waitlist pages. There is no technique score in the app. *(Privacy §4)*
7. **Put the tag/policy interlock in code** — make the GTM component refuse to render unless a policy-version env var is also set, so pasting a container ID into a dashboard cannot silently make Privacy §8.3 false. *(Privacy §8.3)*
8. **Enforce the invite check server-side.** It runs only in the browser, and role is taken from client-supplied sign-up metadata when no invite row matches — so an account created outside the form can be created as a trainer. *(Terms §5)*
9. **Decide what to do about `/demo`** — publicly reachable, no account, prescribes 185 lb bench and 155 lb rows with no disclaimer. One URL an ad, a share or a reviewer can land on. *(Terms §3)*
10. **Decide what "tester account" means.** Every account that exists is one, so Terms §5 currently tells 100% of users their data may be deleted at any time, and §6 is unreachable for all of them. *(Terms §5)*

---

## C. Before you scale — 33

### Erasure — the two remaining blockers to an honest deletion promise

1. **Make deletion remove storage objects.** Progress photos and videos survive account deletion: the database rows go, the files stay, because storage objects carry no foreign key to the account. These are the most sensitive files SHaiPT holds, including the deliberately near-nude intake set. *(Privacy §9)*
2. **Purge or key the AI response cache.** `ai_cache` holds generated plans written around a user's age, weight, goals and injuries, keyed only by a prompt hash, with **no `user_id`** — so erasure cannot find them. The 24-hour `expires_at` is checked only when a row is read; an expired row is ignored and left in place, and nothing ever deletes it. Add a purge, add a user ID, or both. *(Privacy §9)*
3. **Build a self-serve delete-account button and a data export.** Also unblocks Terms §13's "keep your own copy". *(Privacy §10, Terms §12, §13)*
4. **Provide a non-user route** for invite-list and waitlist removal, reachable without signing in. *(Privacy §10)*
5. **Decide a retention period for each category** listed in Privacy §9 and either implement it or commit to it by hand. PIPEDA's limiting principle makes this an obligation, not good practice. *(Privacy §9)*

### Access rules and authorization defects

6. **Narrow the `post_comments` read rule** to match the parent post's visibility. It is `USING (true)` while the post rule correctly checks visibility — the last read rule in the app that is wider than it should be. *(Privacy §7.4)*
7. **Close the consent-free trainer path.** `/api/users/link` writes `trainer_id` on any target with the admin key, no acceptance step, **no role check** — any signed-in account can do it — and `/api/users/features` then treats that field as proof of a client relationship. *(Privacy §7.3, Terms §11)*
8. **Add a database-level check** so the party who sent a coaching request cannot activate it. The guard lives only in the API route. *(Privacy §7.3, Terms §11)*
9. **Build a way to end a coaching relationship.** `ended` is a legal status in the schema and nothing writes it. *(Privacy §7.3, Terms §11)*
10. **Wire up or remove `can_view_workouts` / `can_assign_plans`** — honoured by one route, invisible to the person being coached. *(Privacy §7.3)*
11. **Enforce or remove "allow unsolicited messages"** — written to the database, read by no query; the DM insert rule checks only the sender. *(Privacy §7.4, Terms §7)*
12. **Narrow or accept the `food_database` read rule** (`USING (true)`, no `TO authenticated`, so the anon key reads the whole table) and stop returning `created_by`. *(Privacy §3.6)*
13. **Rate-limit `/api/invites/check`**, or fold it into the sign-up submission — it is a public, unauthenticated oracle answering whether any given address is on the invite list. *(Privacy §3.12)*
14. **Fix the sign-up redirect** that puts the user's email address in a URL query string (`/auth/setup?userId=…&email=…`), where it lands in server logs and referrer headers. *(Privacy §11)*
15. **Put the RLS check in CI** against a disposable project. Its profiles assertion is now correct — it asserts a stranger reads exactly one profile row and that the shared view has no email column — so it is finally worth running automatically. CI runs unit tests only, and only on `main` while all work happens on `v2-overhaul`. *(Privacy §11)*
16. **Write a breach plan and start the breach log.** PIPEDA requires reporting a breach with a real risk of significant harm to the OPC and to those affected as soon as feasible, and **a record of every breach kept for 24 months** — including the ones judged not reportable. Given what SHaiPT holds, that bar is easy to clear. Start the log empty, now. *(Privacy §11, §6.2)*
17. **Decide a norm for operator access** — when you will and will not look at user data — and consider dropping the email join from the admin usage report. *(Privacy §7.5)*

### Data flow, processors and the browser

18. **Fix the exercise images** — every workout screen loads them from `raw.githubusercontent.com`, so GitHub gets each user's IP, user-agent, referrer and which exercise they are on, throughout a normal signed-in session. Proxy or self-host and the table row disappears. *(Privacy §7.1)*
19. **Delete the `photo_assessment` capability or disclose it.** The gateway already accepts inline base64 images and forwards them as image content parts, with a priced policy row, premium gating and a passing test. One route away from making "we do not send your photos to OpenAI" false. *(Privacy §7.2)*
20. **Add a line under the private-mode toggle** saying the message still goes to OpenAI and a metered record of the call is kept — or make the toggle suppress the usage row too. *(Privacy §7.2)*
21. **Self-host the pose WASM runtime and model** — removes Google and jsDelivr from the table and makes the "nothing leaves your device" claim unconditional. *(Privacy §4)*
22. **Gate the Form Check button consistently** — it is not behind `NEXT_PUBLIC_ENABLE_FORM_CHECKER` on `/workout/[sessionId]`, so the camera is reachable there today. *(Privacy §4)*
23. **Delete the orphaned `AIFormChecker` / `TraineeDashboard` pair**, or move its model fetch out of the mount effect — it fetches Google and jsDelivr on mount, before any camera prompt, and is harmless only because nothing renders it. *(Privacy §4)*
24. **Move or persist the in-app camera warning** so it does not vanish on dismissal while the overlay keeps giving cues — and put the practical warnings (not while driving; do not let the screen distract you from a heavy lift) somewhere in the product, where today they appear nowhere. *(Terms §3)*
25. **Wire `lib/log.ts` into the routes or delete it** — nothing imports it; every route uses a bare `console.error`, several log raw database error objects and several return the raw error message to the client. Also find out Vercel's log retention and state the number. *(Privacy §3.15)*
26. **Clear the local stores on sign-out** — only the `user` key is cleared, and only from one of several sign-out paths. *(Privacy §8.2)*
27. **Decide on the session cookie**: 400-day lifetime, and readable by page scripts. *(Privacy §8.1)*
28. **Decide about Google/Apple sign-in** — shipped code behind an unset flag; setting it creates an undisclosed identity-provider relationship the same day. *(Privacy §3.1)*

### Product hygiene the documents depend on

29. **Build a cancellation path** (billing-portal route) before restoring "you can cancel at any time" — and before the landing page keeps saying "Cancel anytime". *(Terms §6)*
30. **Wire up or delete the workout drafts table** — nothing writes it today, so the deletion right for drafts has been removed from Privacy §10 and §3.3 has to carry a paragraph explaining a table that never fills. *(Privacy §3.3)*
31. **Decide whether to keep the automatic `intake_photo` caption** on physique photos — a durable label marking which images are the minimal-clothing set, for no user-visible benefit. *(Privacy §3.4)*
32. **Decide whether to label the service "beta" / "early access"** while invite-only. *(Terms §2)*
33. **Watch the CCPA 100,000-California-consumer threshold.** Pick a user count and an interval at which you re-read Privacy §6.1. When it trips, the "Limit the Use of My Sensitive Personal Information" link and mechanism have to exist, and SHaiPT collects an unusually high proportion of sensitive data per user. *(Privacy §6.1, §5)*

---

## D. Decisions for a lawyer — 10

A qualified lawyer must review both documents before publication. This is not a formality and it is not covered by the care taken over the facts. The **factual** content was traced to application code, database migrations and deployment notes; that part is checkable and it was checked. The **legal machinery** — disclaimers, assumption of risk, the liability cap, the indemnity, governing law, what counts as sensitive under which law — is ordinary drafting by a non-lawyer working from general knowledge, reviewed by nobody.

1. **Terms §3 (health and fitness) and §14 (liability).** This is a product that tells people how to lift heavy weights. These two sections are the entire defensive position, and they should be **rewritten by counsel rather than approved by counsel**.
2. **Whether a separate assumption-of-risk acknowledgement at sign-up** is worth having on top of the terms, and whether it should be recorded per user with a timestamp. *(Terms §3)*
3. **Whether the product edges toward a regulated wellness or medical-device characterisation** in the US or Canada — the dietitian asking about diabetes, PCOS and medication; the coach prompt watching for "chest pain" and "blacked out"; the prompt's own "injury prevention" framing. And that the site's structured data declares SHaiPT a `HealthApplication` while Terms §3 insists it is general fitness information. Google's health policies key off how a product presents itself. *(Terms §3)*
4. **Personal-injury carve-out and enforceability.** US states vary on whether a pre-injury waiver of negligence liability is enforceable for a consumer service, and several Canadian provinces limit them by statute. A cap a court declines to enforce is worth nothing on the day it is needed. Also whether to carry insurance instead of relying on a cap. *(Terms §14)*
5. **Prices, tax, refunds, price-change notice, and what happens when a subscription lapses** — checked against US state auto-renewal statutes and Canadian provincial distance-contract rules. *(Terms §6)*
6. **Whether trainers need separate trainer terms.** The obligations in Terms §11 are the minimum, and a marketplace with money in it usually needs more. *(Terms §11)*
7. **BIPA / CUBI advice** before advertising into, or accepting users from, Illinois or Texas. Today's form-checker design — on-device, no template, no storage, no identification — is the defensible position; confirm it. *(Privacy §4)*
8. **Governing law, venue, arbitration and a class-action waiver.** Consumer-protection law where the *user* lives often overrides a choice-of-law clause, and with customers across the US and Canada that is fifty-odd states and thirteen provinces and territories. Feeds item A14. *(Terms §17)*
9. **Confirm the CCPA threshold reading in Privacy §6.1**, and confirm which other US state privacy laws (Colorado, Connecticut, Virginia, Texas and the rest) SHaiPT is under or approaching — several count sensitive data separately, and SHaiPT collects health data on nearly every user. *(Privacy §6.1, §5)*
10. **Canada and Europe.** Quebec's **Law 25**, and the Alberta / BC / Quebec provincial private-sector laws, before spending money on Canadian traffic *(Privacy §6.2)*. And, separately, whether the **EU/UK market is ever worth the project** in Privacy §6.3 — a consent banner with Consent Mode v2, an Article 27 representative in each of the EU and UK, a lawful-basis mapping, explicit Article 9 consent for health data, Article 8 parental consent below 16, transfer mechanisms with five processors, a 30-day rights clock and a 72-hour breach path. **All of it before the first impression is served, not after.** *(Privacy §6.3)*

---

## Fixed since the last revision

Three things the drafts flagged have shipped, and the documents have been rewritten around them rather than annotated.

| What was fixed | Where it lands in the documents |
|---|---|
| **Migration `0170` — the profiles read-everything hole.** `profiles_select USING (true)` is replaced by `USING (id = auth.uid() OR is_coach_of(id))`, and `0080`'s second permissive coach policy is dropped so nothing can widen it again. A `public_profiles` view carries only id, username, full_name, avatar_url, bio, role, trainer_id, created_at and the trainer storefront columns; five routes read it instead of `profiles`. Verified: a signed-in stranger now reads **1** profile row instead of 8, and `public_profiles.email` does not exist. | Privacy §7.4 rewritten around a two-column table of what other members can and cannot see — the old text disclosing that every member could read everyone's email, date of birth, gender, height and weight was **false** and had to go. §3.2 and §11 rewritten. Terms §7's bulk-collection note narrowed. |
| **Migration `0160` — `food_database.created_by` is now `ON DELETE SET NULL`.** Account deletion no longer fails at the database for anyone who added a custom food. | The Privacy §9 and Terms §12 blockers are gone. Privacy §10 now says the custom food survives with the account identifier removed, which is what `SET NULL` actually does. |
| **The workout-privacy default flip**, in two of the three places it existed. `app/settings/page.tsx` now reads `workout_privacy \|\| 'private'` and `auto_post_workouts === true`; `components/WorkoutLogger.tsx`'s completion post is gated on `=== true` with a `'private'` fallback. Both match the column defaults in `0001_base`. | Privacy §7.4's TODO **narrowed, not removed** — see A5. Two related fallbacks were not covered by that fix and are still live. |

**Nothing else has been marked resolved.** Every other TODO in both documents was re-verified against the code during this revision before being kept. What was re-checked and still stands: no age check anywhere at sign-up; the 4Dcoach server's `allow_origins=['*']`, zero auth dependencies, unauthenticated `GET /jobs` and `DELETE /jobs/{id}`, and no automatic clip deletion; `components/ai-coach/IntakePhotoUpload.tsx` still saying "Photos are private and only used for your training assessment"; the Form Check button on `/workout/[sessionId]` still outside `NEXT_PUBLIC_ENABLE_FORM_CHECKER`; and `components/LoginForm.tsx` still redirecting to `/auth/setup?userId=…&email=…`.

---

## Where the audit was wrong

Recorded so nobody re-litigates these from the original review notes.

**1. "The per-PR posts only fire when auto-posting is genuinely on in the database."** — *Wrong, and the correction matters.* In `components/WorkoutLogger.tsx` the `if (profile?.auto_post_workouts === true)` block wraps only the "Completed *(session name)*" post. The loop directly below it, which publishes one post per personal record **naming the exercise, the reps and the weight**, sits outside that block and falls back to `'public'` visibility. So personal records are published for members who never turned auto-posting on. Privacy §7.4 now says this, and it is item A5.

**2. "The cache written at sign-up contains only id, username, email and full name."** — *No longer true as a general claim.* `db.profiles.create` is an `upsert(...).select().single()`, so the object cached in `localStorage` comes back with every column, including the privacy fields. The defect on `/workout/[sessionId]` is therefore not "the cache is always missing these fields" but the narrower and still-real "that screen treats a missing or stale value as opted-in and public". The documents state the narrower version.

**3. "Uploaded clips from the main `/jobs` pipeline are never deleted."** — *Rejected as worded, and this remains the correct reading.* `DELETE /jobs/{job_id}` exists at `main.py:369`. It is unauthenticated like every other endpoint, so the accurate statement — in Privacy §2 — is that nothing deletes clips automatically, there is no retention policy, and anyone can delete anyone's job. `/bodyscan` and `/body3d` do clean up their own temporary directories; `/jobs` does not.

**4. "A *trainer-role* account can attach itself to any user."** — *Corrected: the defect is broader.* `/api/users/link` computes `callerIsTrainer = auth.user.id === trainerId`. There is no role check at all, so **any** signed-in account can name itself as the trainer and write `profiles.trainer_id` on any target with the service role. (The follow-on write to `ai_features` does require the trainer role.) Re-verified this revision; unchanged.

**5. "The §7.2 TODO asking to rename the private toggle sends Ali to fix something already done."** — *Accepted; the TODO was narrowed.* The UI already renders "Private Mode (not saved)". The genuinely missing disclosures are that the message still goes to OpenAI and that a metered usage row is written.

**6. "The Google sign-in path yields a refresh token stored by Supabase."** — *Narrowed.* The code shows `access_type: 'offline'` with `prompt: 'consent'`. What Supabase then stores is not visible from this repository, so the policy states the code fact and not the storage consequence.

**7. Two reviewers filed `/api/invites/check` separately, as "minor" and as "important."** — Merged into one disclosure (Privacy §3.12) and one item (C13).

**8. "The RLS check script asserts that any user *can* read the profiles table."** — *Was true; now fixed.* `scripts/rls-check.ts` asserts `A reads only their own profile row`, that `public_profiles` is still readable for search and trainer cards, and that selecting `email` from it errors. The remaining item is getting it into CI (C15), which is now worth doing.

**9. Line-number drift.** Several original findings cited line numbers that had moved. The substance was verified from file contents in every case; the citations were not relied on.

**10. Judgement calls, not defects.** The `HealthApplication` structured-data inconsistency is a positioning decision (D3). The "narrowness of the form checker" finding was about emphasis rather than falsehood, and was rewritten anyway because "for most exercises it is not looking for anything" is materially different from a general caveat. The marketing-copy findings do not belong *in* the Terms, which is why they are item B4 here rather than a clause there.

---

## How these documents were produced

1. A code audit of `SHaiPT-Next-App` — routes, components, migrations, RLS policies, scripts and deployment notes — plus the 4Dcoach server at `~/SHaiPT/SHaiPT_simple/4Dcoach/server/main.py`. Every factual claim in both documents comes from that reading.
2. Three independent reviews of the drafts against the same codebase, producing a list of undisclosed behaviour and a list of unsupported claims.
3. **Independent re-verification of every finding against the code before acting on it.** Several findings were wrong; those are above. A correction based on a false report makes the document worse.
4. This revision: the US/Canada scope decision folded in, the profiles fix folded in, three TODOs resolved, and **every surviving TODO re-checked against the code** rather than carried forward on trust.

Nothing here is boilerplate, and nothing describes data the app does not handle. Where the app behaves worse than a reader would expect, both documents say so rather than smoothing it over — that is a deliberate choice, and it is the reason so many items above are code changes rather than wording changes.

---

## If you read only one thing

Do A1–A11 before submitting anything to Google Ads or Meta, and B1–B3 with them. Then get a lawyer to read Terms §3 and §14 before a single user who found SHaiPT through an ad logs a workout.
