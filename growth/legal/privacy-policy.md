<!--
  UNREVIEWED DRAFT. Prepared from a code audit of the SHaiPT repository, not from a legal
  template and not from instructions given by counsel. Every factual statement below was
  traced to application code, database migrations, or deployment notes at the time of the
  audit; nothing here is boilerplate and nothing describes data the app does not handle.

  This is NOT legal advice. It must be read and revised by a qualified lawyer in the
  relevant jurisdiction before it is published at https://www.shaipt.com/privacy.

  Every "> TODO(ali):" block marks a decision only Ali can make, or a code change that must
  ship BEFORE this document is published — because publishing the sentence next to it would
  otherwise make the policy untrue.

  See README.md in this folder for the full list of those decisions in one place, for how
  these documents were produced, and for the review findings that were rejected.
-->

# Privacy Policy

**Last updated:** _[date of publication]_

> TODO(ali): Set the publication date, and keep a dated changelog at the bottom of the page from day one. Both Google Ads and Meta reviewers look for a visible last-updated date.

This policy explains what SHaiPT does with your information: what we collect, why, who else can see it, how long we keep it, and what you can ask us to do about it.

It is written to be accurate rather than reassuring. Where something works differently from what you might expect, this policy says so.

---

## 0. Before anything else: this document has to be reachable

> TODO(ali): **BLOCKER — nothing else in this policy matters until this ships.** There is no `/privacy` route, no `/terms` route and no `/cookies` route in the app. The site footer links "Privacy Policy", "Terms of Service" and "Cookie Policy" to `#` — three dead anchors. Both files exist only as markdown in `growth/legal/`.
>
> Three things must land in the **same deploy**:
>
> 1. `/privacy` and `/terms` routes that render these documents, with the footer links pointing at them.
> 2. The Cookie Policy link either pointed at `/privacy#cookies` (section 8 is written so it can serve that purpose) or **removed from the footer**. Advertising a document that does not exist is worse than not linking one.
> 3. The deploy itself. `HANDOFF-platform.md` records that production is at commit `6aa4057` and that the Vercel project is Git-linked to a stale repository, so production only moves on a manual `vercel deploy --prod`. Everything since that commit — including the waitlist page the ads point at — is not live.
>
> Then verify by hand that `https://www.shaipt.com/privacy` and `/terms` return 200 **before** submitting anything to Google Ads or Meta review. Google Ads and Meta both require a reachable, working policy URL from an advertiser that collects personal data, and Meta requires it linked from the page doing the collecting.

> TODO(ali): **BLOCKER — the page paid traffic lands on has no link to this policy.** `/waitlist` is the ad destination. It is built deliberately with "no nav, no pricing and no second call to action", it collects an email address, and its only fine print is "Invite-only while we scale. One email when your place opens." There is no privacy link, no consent sentence and no footer. That is the exact configuration both ad platforms reject. Add a link to `/privacy` under the form before the campaigns run. The page also writes a marketing attribution key to `localStorage` on page load, before the visitor has done anything — see section 8.4.

---

## 1. Who we are

SHaiPT is an AI personal-training web app at [https://www.shaipt.com](https://www.shaipt.com). It is run by a single person.

> TODO(ali): Fill in the controller's identity before publishing. You need: (a) the legal entity name — your own name if you are a sole trader, or the registered company name and number; (b) a postal address that you are willing to have published (a registered office or a service address, not necessarily your home); (c) a contact email address for privacy questions and data requests. Google Ads and Meta both check that an advertiser is identifiable. Canada's PIPEDA also expects a named individual accountable for personal information and reachable by anyone who asks — with one person running SHaiPT that is you, but the name and the address still have to be on the page. No EU or UK representative is needed while SHaiPT does not target those markets; see section 6.3.

**Contact for anything in this policy:** _[privacy contact email]_

---

## 2. What this policy covers

This policy covers the SHaiPT web app and marketing site at `www.shaipt.com`, including the waitlist page.

**It does not cover 4Dcoach.** 4Dcoach is a separate application, running on a different address, that is linked from several places inside SHaiPT (the header, the home screen, the landing page, and individual exercises). If you import a video into 4Dcoach, that video is uploaded to a server that is not part of the SHaiPT app.

> TODO(ali): **BLOCKER, and the single worst thing an ad reviewer can find, because it is one click away.** The paragraph above disclaims the product the ads sell.
>
> The waitlist page — the destination for all paid traffic — is entirely about 4Dcoach: "Film one set on your phone and get a 4D replay you can walk around", and the page's own `<title>` and Open Graph description say the same thing. The invite email repeats it. The landing page's spec sheet advertises a technique score of 0–100, bar path in centimetres, reps-in-reserve from velocity loss and AR placement on your real bench. Then this policy says 4Dcoach is not covered — and the feature it disclaims is the one that uploads video of the user's body.
>
> There are only two versions that survive review:
>
> - **Bring 4Dcoach inside this policy.** Then it must describe video-of-your-body uploads, name `coach-api.shaipt.com` and the Vultr VM in the path, and say plainly that the processing host is a personal Mac on port 8787 rather than managed infrastructure.
> - **Keep it separate.** Then it needs its own policy and terms, and every link out of SHaiPT has to be an unmistakable exit ("you are leaving SHaiPT"), and the ads and the waitlist page must stop selling it as SHaiPT.
>
> Either way, fix the server first. As it stands today: **there is no authentication on any endpoint** (`allow_origins=['*']` on the CORS middleware, and not a single auth dependency in the file); `GET /jobs` returns a listing of every job on the server to any caller; artefacts are fetchable at `/jobs/{id}/scene.ply` and `/ar/{name}.usdz`; and there is **no retention policy** — a `/jobs` working directory, including the uploaded clips, persists until someone calls `DELETE /jobs/{job_id}`, which is itself unauthenticated, so anyone can delete anyone's job. (A `DELETE` endpoint does exist. The earlier note in this draft that clips are "never deleted" was wrong; the accurate statement is that nothing deletes them automatically and anyone can delete anyone's.) The `/bodyscan` and `/body3d` paths do clean up their own temporary directories; the main `/jobs` pipeline does not.
>
> The 4Dcoach README's blanket "no upload" claim also needs correcting, because its own server accepts video uploads.

---

## 3. What we collect, and why

### 3.1 Your account

When you sign up we collect your **email address** and a **password**. The password is handled and stored by our authentication provider (Supabase) — we never see it when you choose it yourself (but see section 11 for tester accounts, where we do). We also take a **username**.

There is no separate "full name" field at sign-up. The app stores your username as your full name, and a real full name only exists if you later change it in Settings.

**Two records, not one.** Your identity is stored twice. Supabase Auth holds an authentication record — your email address, the password hash, your username and full name as sign-up metadata, and sign-in timestamps. Your SHaiPT **profile** is a separate row that is created from that record. This matters for deletion; see section 10.

> TODO(ali): There are **Google and Apple sign-in buttons in the shipped code**, hidden behind an environment flag (`NEXT_PUBLIC_ENABLE_OAUTH`) that is unset by default. The Google path requests offline access with a forced consent prompt. If you ever set that flag, a new identity-provider relationship exists and this section, and the processor table in section 7.1, become incomplete the same day. Either delete the code, or add the conditional sentence now and keep it accurate.

### 3.2 Your profile

Your profile holds: username, full name, avatar, bio, **gender**, **date of birth**, **height**, **body weight**, preferred weight unit, timezone, fitness goals, and your privacy settings. If you are listed as a trainer it also holds your specialties, trainer bio and rating.

We use this to personalise your training plan, to calculate your calorie and macro targets (the calculation uses your weight, height, age and gender), and to show your profile in the app.

**Other members see only part of it.** Your username, full name, avatar, bio, role, the trainer you are linked to and the date you joined are readable by other signed-in members; if you are listed as a trainer, so are your specialties, trainer bio, rating and whether you are accepting clients. Your email address, date of birth, gender, height and body weight are **not** — the database does not hand them to anyone but you and a coach you are actively working with. Section 7.4 sets out the whole list.

### 3.3 Training data

- **Workouts:** the date, start and finish times, rest time, and any free-text notes you write.
- **Exercises:** every set you log — reps, weight, rest, your RPE (how hard it felt, 1–10), and any notes on the exercise.
- **Personal records** and derived statistics: total volume, streaks, volume by muscle group, and a dated history of those numbers.

There is a **workout drafts** table in the database, designed to hold an in-progress session against a device identifier as well as your account. Nothing in the app writes to it today: the code that would do so is not connected to either workout screen. It is listed here because the table exists, not because it fills up.

> TODO(ali): Either wire the draft-saving code up or delete the table and its API routes. While it sits in between, this policy has to carry the paragraph above, and section 10 cannot offer a right to delete drafts (it previously did — that has been removed).

### 3.4 Body measurements and photos

- **Measurements:** body weight by date, **body-fat percentage**, and eleven circumference measurements — neck, shoulders, chest, both biceps, waist, hips, both thighs and both calves — plus free-text notes.
- **Progress photos and videos:** any image or video you upload (JPEG, PNG, WebP, HEIC, MP4, QuickTime or WebM, up to 25 MB each).
- **Metadata on each of those files:** a caption, a visibility setting, and the date the photo was taken.

You should know what the app actually asks for here. During the AI intake interview, the coach asks for **front, back and side photos** and asks you to **wear minimal clothing** so it can assess your build. Those photos are stored the same way as any other progress photo — and they are **captioned `intake_photo` automatically**, so the database records exactly which of your stored images are the minimal-clothing set.

> TODO(ali): The intake photo upload screen currently tells users "Photos are private and only used for your training assessment." Both halves of that sentence are wrong in the code as it stands: (1) an **active human coach can read every one of your photos, including the ones marked private** — the row-level rule on `progress_media` and the storage-object rule both grant a coach your whole folder with no visibility test; exactly one API route filters on visibility, and a coach signed in with their own credentials bypasses that route entirely; (2) no AI ever looks at the photos today, so "used for your training assessment" overstates it. Fix the access rules to respect `visibility`, and rewrite that on-screen sentence, **in the same release as this policy** — otherwise the policy either contradicts the app or has to document that the app misled people at the moment they handed over near-nude images.

> TODO(ali): Decide whether the automatic `intake_photo` caption is worth keeping. A durable label marking which images are the physique set raises the sensitivity of the record for no user-visible benefit. If it stays, it stays disclosed as above.

### 3.5 Health information you tell us

The AI intake interview asks directly about **injuries, illnesses and medical considerations**, and the onboarding chat asks about **injuries and physical limitations**. Whatever you type is saved, both as extracted fields and as the full transcript of the conversation.

The AI dietitian asks about **food allergies and intolerances**, and its script prompts it to ask about conditions like diabetes, PCOS, IBS, cholesterol and blood pressure. It also asks you to pick a diet style from a list that includes **Halal** and **Kosher**.

We use this to build a training plan and meal plan around your limitations.

This is sensitive information. Section 5 explains how it is treated.

### 3.6 Food and nutrition

Every food you log: name, meal, serving size, calories, protein, carbs, fat, the date, and any notes. Your generated meal plans, grocery lists, and any custom foods you add to the food database.

**Custom foods you add are not private.** The food database is a single shared table, and its read rule is open to everyone — including visitors who are not signed in at all. A food you add carries its name, brand, macros and **your account identifier**. If you add "Mum's Ramadan dates" or a branded medical supplement, that entry is world-readable and linked to your account.

> TODO(ali): Either narrow that read rule to signed-in users and strip `created_by` from what is returned, or keep the paragraph above. Right now the anon key reads the whole table. Note the inconsistency worth fixing on principle: the waitlist table was deliberately locked to the service role precisely so "the anon key cannot probe whether a given address is on it", and the food table went the other way with no equivalent thought.

A dated, itemised record of everything you eat says a lot about you. We treat it as sensitive (section 5).

### 3.7 Conversations

- **AI coach and AI dietitian chats:** the full conversation, plus a title taken from the first 100 characters of your first message.
- **Direct messages** between you and a human trainer: the full message text and whether it has been read.

**Nobody can delete a direct message.** There is no delete control and no database rule permitting one, for either the sender or the recipient. And because a message row is tied to both accounts, deleting **your** account also destroys the other person's copy of the conversation. Section 10 says more.

### 3.8 Consistency challenge

If you enrol, we store your weekly progress, missed days, and — if you request a grace period — the **free-text reason you give**. People type real things in that box (an operation, a bereavement, a flare-up). Whatever you write is stored.

### 3.9 Social features

Who you follow and who follows you, your favourites, any posts you make to the activity feed, likes and comments, and notifications.

**The app also posts on your behalf.** See section 7.4 — on finishing a workout, the app can publish a "completed" post and one post per personal record naming the exercise, the reps and the weight you lifted.

### 3.10 Payments

If you subscribe, Stripe handles the payment. **We never see or store your card number.** We store your Stripe customer and subscription IDs, your plan tier, the status, and the dates of your trial and billing period. We would send Stripe your email address and your SHaiPT user ID.

A trial subscription record is created automatically for every new account, whether or not you ever pay.

> TODO(ali): **Nothing in this paragraph can currently happen, and the reason is not the one written in the Terms.** Stripe is not in test mode — it is **not configured at all**. There is no `STRIPE_*` variable in `.env.local`, and the Vercel environment inventory in `HANDOFF-platform.md` lists Supabase, OpenAI, the AI cap and the admin list and no Stripe keys in any environment. The Stripe client throws before any call is made, so `/api/subscriptions/checkout` returns a 500. A reviewer falsifies this by clicking a pricing button. Either configure Stripe, or rewrite this section in the conditional ("if and when paid plans go live, we will send Stripe…") and match Terms section 6.

### 3.11 The waitlist

If you join the waitlist we store your **email address** and where you came from: the campaign tags in the link you clicked (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), the page you landed on, and the site that referred you. If an ad link carries a Google or Meta click ID instead of campaign tags, we record the source as "google" or "meta".

We use your IP address to rate-limit the form so it cannot be spammed. **The IP address is never written to the database.** It is held in the server's memory as the key of a rate-limit table, and that table lives for as long as the server instance does — which can be hours. Entries are only cleared once the table grows past five thousand addresses.

### 3.12 Invites

While SHaiPT is invite-only, we hold a list of invited email addresses, who invited them, a free-text note, and whether the invite has been used. Some of those addresses belong to people who have not signed up and may never do so.

**Membership of that list is publicly testable.** The endpoint the sign-up form uses to check an invite (`/api/invites/check`) accepts any email address from anyone, with no sign-in and no rate limit, and answers whether that address is allowed to sign up. Any address you submit to it is processed on our server.

> TODO(ali): Put a real rate limit on that endpoint. Its own comment claims it is "rate-limited by shape: it answers only allowed/not, never lists anything" — that is not a rate limit and it does not stop anyone from enumerating a guessed or purchased address list one request at a time. Better still, fold the check into the sign-up submission so there is no standalone oracle. Until then this section has to keep the paragraph above.

### 3.13 AI usage metering

Every call to an AI feature writes a bookkeeping row. That row holds your **user ID**, **which feature you used** (for example `chat`, `interview`, `dietitian_interview`, `plan`, `workout_summary`), the model, token counts, the cost in US dollars, whether the answer came from a cache, whether the call succeeded, how long it took, and a timestamp. A monthly total is kept alongside it.

We use this to keep the AI bill under a cap and to see which features are expensive.

Be clear about what that is: it is a per-user log of **when you talked to the AI coach, ran an intake interview, or generated a plan**. The feature names are themselves revealing. It is written on every call — including cache hits, mocked calls, failures, and calls you made with the chat's "private" toggle switched on.

### 3.14 Your in-app preferences

Your form-checker setting, rest-timer settings, default rest length and screen-awake preference are stored **on the server against your account**, not only in your browser. Section 8.2 describes the browser copy.

### 3.15 Technical logs

Our hosting provider (Vercel) handles every request to the site, which means it processes your **IP address, browser user-agent and request details**.

Our own error logging is less structured than we would like. When a database operation fails, the route writes the database's error object to the hosting provider's log stream — which can include the error message, its detail and hint text, and in some cases a stack trace. Those diagnostics are derived from the row being written, so they can contain fragments of your data. Several routes also return the raw database error message to your browser.

> TODO(ali): There is a tidy logging helper in `lib/log.ts` that emits `[api:<route>] user=<id> req=<short id>` and nothing else. **Nothing imports it.** Every route logs with a bare `console.error` instead, and no request ID is ever generated or shown to a user. An earlier draft of this policy described the helper as if it were in use — that sentence has been removed. Either wire the helper into the routes (and then this section can go back to "a user ID and a request ID"), or delete it. Also check what log retention your Vercel plan actually gives you and state the number here.

### 3.16 What we do **not** collect

To be clear, because generic privacy policies usually claim these:

- **No phone number.** There is unused database scaffolding for phone verification, but nothing in the app asks for a number and no SMS provider is connected.
- **No session storage, no service worker, no web beacons, no tracking pixels.** None of these exist in the app.
- **No third-party fonts loaded from your browser.** Fonts are served from our own site.
- **No card details.** Ever. Those go straight to Stripe.

What we do **not** claim, because it is no longer true: that there is no advertising tracking of any kind. The conversion-tracking call is already in the waitlist page. See section 8.3.

---

## 4. The camera and the form checker

This is the part of the app most likely to be described wrongly, so here is exactly what happens.

When you open **Form Check** during a workout, the app asks for permission to use your camera. If you allow it:

- The video plays inside the page and is analysed **frame by frame in your own browser**.
- The analysis produces **33 skeleton points** — shoulders, elbows, hips, knees, ankles and so on. From those, the app calculates joint angles, counts reps, and shows short cues like "go deeper into the squat".
- **No video frame, image or skeleton point is ever uploaded to us or to anyone else.** There is no upload code in that part of the app. The numbers are used to paint the overlay and to do arithmetic, then discarded when the next frame arrives.
- **Nothing is recorded and nothing is saved.** Not to our servers, not to your device.
- **We do not use this to identify you.** No face template, face measurement or biometric signature is built, stored or compared. The face points exist only so the stick figure has a head.
- When you close the form checker, the camera stops.

**The one thing that does leave your device:** to run the analysis, your browser downloads the pose-detection software from **jsDelivr** (`cdn.jsdelivr.net`) and the model file from **Google** (`storage.googleapis.com`). Those two companies therefore see your IP address, your browser user-agent, and the fact that you opened a pose-tracking feature. They do not see any video.

**What the form checker is actually checking.** This matters more than the privacy question:

- There are purpose-built analysers for **four movement families only** — squat, bench press (also matched for chest press and push-up), deadlift (also RDL), and overhead press. The exercise library holds 876 exercises. **Everything else falls through to a generic analyser that checks two things: whether your shoulders are level and whether your hips are level.** It still counts reps and it still shows the same red "Form Check" badge, so a barbell row looks exactly as supervised as a squat and is not.
- All angles are computed from the **two-dimensional projection** of the camera image. The depth axis is discarded.
- Two of the cues are emitted at the highest severity the system has — "Keep your back straight" and "Keep your chest up". Those are the two cues a lifter is most likely to trust, and they are inferred from 2D landmarks, which is the kind of judgement 2D cannot properly support.
- **There is no technique score in the app.** The landing page advertises a 0–100 technique score. The live overlay produces a rep count and text cues and no number at all. The only scoring code in the repository is a bench-press-only heuristic comparing two elbow angles against a hardcoded 45–60 degree ideal, and it lives in a component that nothing in the app renders.

> TODO(ali): Three decisions here. (1) If you self-host the WASM runtime and the model file, you can delete the jsDelivr/Google paragraph and make the stronger, simpler claim that nothing at all leaves the device during a form check. It is a build-config change, not a rewrite, and it also permanently fixes the timing claim below. (2) The "Form Check" button on `/workout/[sessionId]` is **not** behind the `NEXT_PUBLIC_ENABLE_FORM_CHECKER` flag that gates the other workout screen, so the camera is reachable today by anyone who lands on that route. Gate it consistently or leave it live — but do not let anyone tell you the camera feature is switched off, because on that screen it is not. (3) Delete the orphaned `AIFormChecker`/`TraineeDashboard` pair, or move its model fetch out of its mount effect. Today it downloads the Google and jsDelivr files when the component mounts, before any camera prompt; it is harmless only because nothing renders it. If that dashboard is ever wired up, the "only at the moment you open the form checker" claim in section 7.1 silently becomes false.

> TODO(ali): If the advertised **0–100 technique score** is ever wired into the app, this section and Terms section 3 both have to be rewritten before it ships, and nobody will remember. Decide now whether to build it or to take the claim off the landing page and the waitlist page.

> TODO(ali): If you ever advertise to, or accept users from, **Illinois or Texas**, get advice on BIPA and CUBI before you ship anything that changes the four facts above. Today's design — on-device, no template, no storage, no identification — is the defensible position. There is also an unfinished video-recording component in the codebase whose "save or upload the video" step is still a TODO; the day someone finishes it, this section becomes false and the notice-and-consent requirements change.

---

## 5. Sensitive information

Some of what SHaiPT collects is more sensitive than the rest, and the law treats it that way. Under Canada's PIPEDA, sensitivity is what raises the standard of consent required to collect something (section 6.2); several US state laws define a category of "sensitive personal information" and attach extra duties to it. Either way, this is the list:

- **Health information:** injuries, illnesses, medical considerations, allergies, intolerances, medical dietary conditions, body-fat percentage, body measurements, pain you report during a workout, and the free-text reason you give for a grace period.
- **Religious or philosophical belief, by inference:** choosing **Halal** or **Kosher** as a diet style, or a vegan diet, can reveal belief. We ask for it as a food preference; the law may treat it as more than that.
- **Photographs of your body**, including the near-nude intake photos described in section 3.4.

We collect these only because the app cannot do its job without them — you cannot program around a torn ACL you have not mentioned, or write a meal plan around a nut allergy you have not declared.

> TODO(ali): **There is no consent step for any of this.** The only thing any user ever accepts is the waiver on the coach screen, and it is a medical-disclaimer and assumption-of-risk notice: it never mentions storage, never mentions OpenAI, and grants no permission to process health data. Three separate problems with it:
> 1. Its write is **best-effort** — the failure branch sets the accepted state and advances the flow anyway, so a user can pass through having had nothing recorded.
> 2. It writes to a column named `terms_accepted_at`, so the one timestamp in the database conflates "accepted the health waiver" with "accepted the Terms of Service" — and sign-up has no terms step at all, so the Terms' opening line has no record behind it whatsoever.
> 3. It gates exactly one screen. Nothing else reads that column.
>
> GDPR's explicit Article 9 consent is not the reason to fix this — SHaiPT does not target the EU or the UK (section 6.3). The reason is Canada's PIPEDA, which applies from the first Canadian sign-up and requires **meaningful consent**, at a standard that rises with sensitivity: health data and photographs of someone's body sit at the top of that scale, and consent there has to be express rather than inferred from the fact that somebody kept typing. A screen that never mentions storage cannot carry it.
>
> Build a consent step at the point the interview asks about injuries and allergies — server-side, recorded, **blocking on failure**. Terms acceptance needs its own checkbox at sign-up and its own column. Two separate things, two separate records.

> TODO(ali): Under California's CPRA, processing sensitive personal information triggers a "Limit the Use of My Sensitive Personal Information" right and a link in the site footer — **but only for businesses that meet the thresholds in section 6.1**, which SHaiPT does not today. Neither the link nor the mechanism exists. Do not build them now; do put this on the list that gets re-read when the user count starts climbing, because SHaiPT collects an unusually high proportion of sensitive data per user and this is the obligation that lands hardest when the threshold is crossed.

---

## 6. Which privacy laws apply

SHaiPT advertises and offers the service in the **United States and Canada**. That is a deliberate choice and it decides which rules below are live and which are not.

### 6.1 The United States, and California in particular

There is no general federal privacy law covering a service like this. The one that gets asked about is **California's CCPA, as amended by the CPRA**, and it is worth being precise about it rather than either ignoring it or pretending to comply with it.

The CCPA applies to a business that meets at least one of three thresholds: annual gross revenue **over $25 million**; buying, selling or sharing the personal information of **100,000 or more** California consumers or households in a year; or deriving **50% or more** of annual revenue from selling or sharing personal information.

**SHaiPT meets none of them.** It is invite-only, pre-revenue, has a handful of accounts, and does not sell or share personal information for money. So the CCPA's specific machinery — the "Do Not Sell or Share My Personal Information" link, the "Limit the Use of My Sensitive Personal Information" link, the 45-day response clock, the annual metrics disclosure — is not owed today, and this policy does not pretend to offer it.

Two things follow from that, and both matter:

- **The threshold that will trip first is the 100,000-consumer one.** Not revenue. A free product that advertises for sign-ups reaches a hundred thousand Californians long before it reaches $25 million in revenue, and "buying, selling or sharing" is counted broadly enough that running conversion tags on ad traffic can count as sharing. Section 8.3 describes the tags that are about to go live.
- **Not being in scope is not the same as being allowed to lie.** Everything this policy says about what is collected and who sees it has to be true regardless, because a false statement in a privacy policy is an unfair or deceptive practice under **FTC Act section 5** and under state consumer-protection law, at any size.

We answer requests to see, correct or delete data from anyone who asks, wherever they live (section 10). That is a commitment made here, not an obligation being met.

> TODO(ali): Put a number in your own notes for when to revisit this — a count of California users, checked at whatever interval is realistic. Also note that Colorado, Connecticut, Virginia, Texas and others now have their own laws with their own thresholds, mostly in the 100,000-resident region and some counting sensitive data separately. SHaiPT collects health data on nearly every user, which is the category those laws single out. This section is written to be re-read, not filed.

### 6.2 Canada

**PIPEDA applies to SHaiPT from the first Canadian user.** It covers the collection, use and disclosure of personal information in the course of commercial activity, and — unlike the US state laws above — it has **no revenue or headcount threshold**. A solo founder with ten Canadian users is in scope on the same terms as a large company. This is the privacy law that actually binds SHaiPT on day one.

What that means in practice:

- **Meaningful consent.** People must understand what is collected and why, in terms they can follow. The more sensitive the information, the more express the consent has to be — and health information and photographs of someone's body are about as sensitive as it gets. Section 5 lists what falls into that bracket.
- **Limits.** Collect only what is needed for a purpose you have identified, use it only for that purpose, and keep it only as long as you need it. Section 9 is honest that retention is currently "indefinitely", which is the part of this that is furthest from where it should be.
- **Access and correction.** A Canadian user can ask for what is held about them and have errors corrected, generally within 30 days. Section 10 describes what that looks like today: by hand, by email.
- **Accountability.** A named individual is responsible for the organisation's compliance (section 1).
- **Safeguards, and breaches.** Security appropriate to the sensitivity of the information (section 11). A breach creating a "real risk of significant harm" must be reported to the Office of the Privacy Commissioner of Canada and to the people affected, and **a record of every breach must be kept whether or not it is reportable** — including the ones judged not to meet the bar.
- **Complaints.** Canadians can complain to the Office of the Privacy Commissioner of Canada. Section 15.

> TODO(ali): Two Canadian obligations have nothing behind them yet and both are on the list below: a real consent step for health data (section 5), and a breach log you actually keep (section 11). A third is a judgement call — **CASL**, Canada's anti-spam law, is stricter than the US CAN-SPAM Act and governs the waitlist invitation email: it requires consent (joining the waitlist is a reasonable basis for implied consent, for a limited period), clear identification of the sender with a postal address, and a working unsubscribe mechanism honoured within 10 days. The invitation email currently has none of the three. See section 7.1.
>
> Quebec's Law 25 adds its own requirements for Quebec residents on top of PIPEDA, and Alberta, British Columbia and Quebec each have their own provincial private-sector laws. Worth one conversation with counsel before spending money on Canadian traffic, not before reading this sentence.

### 6.3 Europe and the United Kingdom — out of scope today

**SHaiPT does not target the EU or the UK.** We do not advertise there, the service is not offered in any EU or UK currency or language, and we do not monitor the behaviour of people in those territories. On that basis the GDPR and the UK GDPR do not apply to SHaiPT, and this policy does not claim compliance with them.

The site is reachable from anywhere, and someone in Europe could find it. That is not the same as offering the service to them, which is what the law turns on.

> TODO(ali): **Adding an EU or UK geo to a campaign is a project, not a checkbox.** Everything below has to exist *before* the first impression is served, not afterwards:
>
> - a **cookie-consent banner** that blocks the ad tags until the visitor agrees, plus **Google Consent Mode v2** — neither exists in the codebase, and the waitlist attribution key would have to stop being written on page load (section 8.4);
> - an **Article 27 representative** established in the EU and, separately, in the UK — a named third party with a published address;
> - a **lawful-basis mapping** for every processing purpose in this policy, written down and defensible;
> - **explicit Article 9 consent** for health data and body photos, captured at the point the interview asks, recorded server-side, blocking on failure (section 5) — and Article 8 parental consent if the minimum age lands below 16 (section 12);
> - **transfer mechanisms** with all five processors: Supabase, Vercel, OpenAI, Resend and Stripe (section 13);
> - data-subject rights on a 30-day clock, and a 72-hour regulator notification path for breaches.
>
> Budget it as a piece of work with a cost, and decide whether the market is worth it. Do not let a geo get ticked in an ad dashboard and the rest follow later; the order matters, and the tags firing before the banner exists is the version that gets noticed.

---

## 7. Who else sees your data

### 7.1 Companies that process data for us

| Who | What they get | Where |
|---|---|---|
| **Supabase** | Everything stored: your account and password, profile, workouts, measurements, body photos and videos, AI chats, direct messages, food logs. Your browser also talks to Supabase directly, so it receives your IP address and user-agent. | United States — West US (Oregon) |
| **Vercel** | Every request to the site: IP address, user-agent, request details, and our error logs (section 3.15). | United States (hosting); function region not fixed |
| **OpenAI** | The contents of your AI conversations and the context described in section 7.2. | United States |
| **Resend** | Your **email address**, when we send you a waitlist invitation. Mail is sent from `hello@send.shaipt.com`. | United States |
| **Stripe** | Your email address and your SHaiPT user ID, and your payment details entered on Stripe's own page — if and when payments go live (section 3.10). | United States |
| **GitHub** | Your **IP address, browser user-agent, referring page and the exercise you are looking at** — every time a workout screen shows an exercise demonstration image. See below. | Global |
| **Google and jsDelivr** | Your IP address and user-agent, at the moment you open the form checker, in order to download the pose model (section 4). | Global CDN |

**Two of those need explaining.**

*Email.* The "confirm your address" message at sign-up is sent through Supabase's own mail service. **Waitlist invitations are different** — they are sent through Resend, which therefore receives the email address of every person we invite off the waitlist, including people who are invited and never sign up. That is the mail the advertising funnel depends on.

*Exercise images.* The demonstration images in the exercise library are not hosted by us. They are loaded directly from `raw.githubusercontent.com` by your browser, as ordinary image tags, on the exercise screen, the workout logger and the exercise-swap dialog. That means GitHub receives your IP address, your browser user-agent, the page you came from, and — because the image filename names the movement — which exercise you are doing, throughout a normal signed-in workout. This is a much broader flow than the form-checker model download, and it happens whether or not you ever open the camera.

> TODO(ali): Fix the exercise images rather than disclosing them. Proxying them through our own domain, or copying the image set into our own storage, removes GitHub from the picture entirely and takes the row out of this table. Until then the row stays and the "only at the moment you open the form checker" framing in section 4 must not be read as covering the whole app.

> TODO(ali): The waitlist invitation email is promotional in character and carries **no unsubscribe mechanism** — the only opt-out it offers is "if that was not you, ignore this and nothing happens". For US traffic that is a CAN-SPAM exposure on exactly the mail the ads generate. For Canadian traffic it is a **CASL** exposure, which is the stricter of the two: CASL wants identification of the sender with a postal address, and an unsubscribe mechanism that works and is honoured within 10 days, on top of consent (section 6.2). Add a working unsubscribe link and a postal address to the template before the campaigns run — one fix covers both countries.

> TODO(ali): Check **Supabase → Authentication → Emails**. If you have configured a custom SMTP provider in the dashboard, that provider is a processor and must be named in the table above. The code cannot tell you; only the dashboard can. Likewise check **Vercel → Project Settings** for Observability, Web Analytics, Speed Insights and Log Drains. None of them are installed as packages, and a live check of the site found no analytics script, but any of them can be switched on from the dashboard — and if one is on, section 8's description of analytics is incomplete.

### 7.2 What we send to OpenAI

Every AI feature in SHaiPT runs on OpenAI's models. There is no other model provider, and this is live in production — it is not a mock.

Depending on which feature you use, we send:

- **AI coach chat:** your name or username, your fitness goals, your height and weight, your calculated macro targets, your current plan, and your **last three workouts** including exercises, sets, reps, weights and the first 80 characters of your own workout notes — plus the last twelve turns of the conversation.
- **The intake interview:** everything you type, including your free-text answers about **injuries, illnesses and medical conditions**, sent both as conversation and again in a second call that extracts those answers into fields.
- **The dietitian interview:** everything you type, including **allergies, intolerances and medical dietary conditions** — **and the first 500 characters of everything you said in the training intake**, pasted verbatim into the dietitian's instructions as background. So health text you gave for training purposes is sent again as part of a nutrition request.
- **Meal-plan generation, macro targets and grocery lists:** your gender, age, weight, height, goals, diet style, allergies, dislikes and medical notes.
- **Training-plan generation:** your goals, experience, equipment, schedule, injuries and limitations, age, height, weight, athletic history, and the last five things you typed in the interview.
- **Plan adaptation after a workout:** your sets, reps and RPE; if you ticked "pain", the pain note you wrote; your goals; your current training phase and week number; and a summary of up to **eight recent sessions** (name, date, total volume, average RPE).
- **The post-workout summary**, which runs **automatically** when you finish a session: the session name, duration, total volume, sets and reps, **every set with its weight, reps and RPE**, any personal records you hit, and your goals.
- **Weekly insights**, which run **automatically** when you open the progress screen: a week of per-exercise maximum weight and total volume, the week-over-week change for each, and your goals.

The last two are worth calling out separately because you do not press a button to start them.

**We do not send your photos to OpenAI.** No part of the app does that today.

> TODO(ali): That sentence is one route away from being false and there is nothing in the code to stop it. The AI gateway already defines a `photo_assessment` feature with its own model policy and premium gating, already accepts inline base64 images with a MIME type, and already forwards them to the model as image content parts — and there is a passing test for it. No route calls it. Either delete the capability until it is disclosed, or add a line here saying it exists and is not in use, so whoever finishes the feature is told by the policy itself that this section has to change with it. The intake upload screen makes this worse by already telling users their photos are "used for your training assessment" when no AI reads them.

**About the "private" toggle in the AI chat.** Turning it on means the conversation is **not saved to our database**. Two things it does not mean:

- The message is still **sent to OpenAI**, so the model can answer it.
- A **metering row is still written** recording that you used the chat at that moment, with your user ID, token counts, cost and a timestamp (section 3.13). The content is not kept; the fact of the conversation is.

> TODO(ali): The chat UI already labels the control "Private Mode (not saved)" and shows "Private mode: This conversation won't be saved". Good — an earlier draft asked for a rename that is largely already done. The narrower thing that is still missing is the other half: the UI never says the message still goes to OpenAI, and never says a metered record of the call is kept. Add one line under the toggle. Better: make the toggle also suppress the usage row, and then this section gets shorter.

> TODO(ali): Confirm what your OpenAI account's data-controls setting actually is, and put the answer here. The code sets no zero-retention option and passes no end-user identifier, so whether OpenAI retains prompts for abuse monitoring depends entirely on your account configuration and any agreement you have with them. This is one of the few statements a reviewer may ask you to back up — and Terms section 8 currently asserts as settled fact that content is not used for model training, which nothing in the code establishes. Resolve it in one place and make both documents say the same thing.

### 7.3 Human trainers

If you request a coach and they accept — or you accept theirs — that person can see:

- your profile,
- every workout and every set you have logged, including your notes,
- your body measurements and body-weight history,
- your progress photos and videos, **including the ones you marked private** (section 3.4),
- the training plans assigned to you,

and you can message each other.

A coaching relationship row can also hold a free-text **reason for declining**, written by whichever party refused, and an **intake data** record attached to the relationship. Text one person writes about another is that person's data too.

**A coach cannot read your AI coach conversations.** Those are yours alone, and the database enforces it.

> TODO(ali): **The consent model described above is not what the code enforces, in three separate ways, and this section cannot publish as written until at least the first two are fixed.**
>
> 1. **There is a consent-free path to reading your profile and writing to it.** `/api/users/link` accepts a caller who names themself as the trainer and any other user as the trainee, and writes `profiles.trainer_id` on that target **with the administrative key, with no acceptance step of any kind**. It does not even check that the caller holds the trainer role — any signed-in account can do it. `/api/users/features` then treats `trainer_id` alone as proof of a client relationship and writes that user's AI feature flags, again with the administrative key. (A separate review described this as a trainer-role capability; it is broader than that.)
> 2. **Either side can activate a relationship.** The rule that "the side that sent the request cannot respond to it" lives only in the API route. The database policy is simply "you are the coach or the athlete", so a trainer using the anon client directly can set to active a relationship they themselves requested — granting themselves access to the person they invited. Add a database-level check.
> 3. **There is no way to end one.** "Ended" is a legal value in the schema and nothing ever writes it; the respond route accepts only accept, decline and waitlist. Build the control, or section 10's "email us" stays as the only revocation route.
>
> Also: the `can_view_workouts` and `can_assign_plans` permission flags exist but are honoured by one API route and are not exposed to the person being coached. Wire them up or remove them — a permission flag that does nothing is worse than none.

### 7.4 Other people using SHaiPT

**What another member can see about you.** Signed-in members do not read your profile row. They read a restricted view of it, which carries exactly these columns and no others:

| Visible to other members | Not visible to other members |
|---|---|
| Username, full name, avatar, bio | **Email address** |
| Your role (trainee or trainer) and the trainer you are linked to | **Date of birth**, **gender**, **height**, **body weight** |
| The date you joined | Weight unit, timezone, fitness goals |
| If you are a trainer: specialties, trainer bio, rating, availability, whether you are accepting clients | Your privacy and messaging settings, your pinned plan, your AI feature flags, and every other internal flag on the account |

The sensitive columns are not filtered out on the way to your browser — they are **not in the view at all**, so a route that asks for everything still gets only the left-hand column. Your own full profile is readable by you, and by a human trainer you are actively working with (section 7.3).

Also visible by design: who you follow, your likes, anything you post to the activity feed, and **comments** on posts. Workout **templates and plans you create** are public by default and readable by any signed-in user. **Custom foods you add** are readable by anyone at all, signed in or not (section 3.6).

Your workout **logs** are private by default in the database.

**The app posts for you.** When you finish a workout with auto-posting on, the app publishes a "Completed *(session name)*" post. Separately, and **whether or not you have turned auto-posting on**, finishing a workout on the main logger publishes one post per personal record, whose text names **the exercise, the number of reps and the weight you lifted**. Those are not things you typed — the app writes them on your behalf. That the personal-record posts ignore the setting is a defect, and it is listed below.

> TODO(ali): Comments are readable by every signed-in member regardless of the parent post's visibility — the comment rule is `USING (true)` while the post rule correctly checks visibility. So a comment on a followers-only or private post is readable by anyone. Narrow the comment rule to match the parent post. This is now the last read rule in the app that is wider than it should be.

> TODO(ali): **The workout-privacy default is half fixed.** The Settings screen, and the workout logger's session-completed post, now treat a missing value as the database treats it — private, auto-post off — so opening Settings to change your weight unit no longer flips your account public. Two places the fix did not reach are still live, and the second of them is worse than the bug that was fixed:
>
> 1. **`app/workout/[sessionId]/page.tsx` still reads the browser's cached profile and still falls back the old way** — `auto_post_workouts !== false` and `workout_privacy || 'public'`. On that screen, a profile whose cached copy is stale or missing those fields auto-posts the session publicly.
> 2. **In `components/WorkoutLogger.tsx` the per-PR posts are created outside the auto-post check.** The "Completed *(session name)*" post is correctly gated on `auto_post_workouts === true`; the loop directly below it that publishes one post per personal record — **naming the exercise, the reps and the weight** — is not gated at all, and falls back to `'public'` for visibility. So a member who has never turned auto-posting on still has their personal records published.
>
> Until both are fixed, the paragraph above understates what the app publishes on your behalf, and this section's "private by default" has a hole in it. Neither is more than a few lines.

> TODO(ali): The "allow unsolicited messages" setting is shown to users, written to the database, and **read by no query anywhere in the codebase** — it is a control that does nothing. The database rule on direct messages checks only that you are the sender, so any signed-in user can message any other user with no coaching relationship. Either enforce the setting or remove it from Settings. Note that Terms section 7 lists "send unsolicited messages" among the prohibited uses, which reads as enforced and is not.

### 7.5 The operator

SHaiPT is run by one person, and that person holds an administrative key to the database that bypasses every per-user rule described in section 11. It is used by the server for ordinary work — creating your profile at sign-up, checking invites, writing the AI metering rows — and it can read anything.

There is also an **admin screen** that reports AI spend per user, joining the metering rows in section 3.13 to **email addresses**. Access is restricted to a list of administrator email addresses, which today contains one address: the founder's.

We are telling you this because a policy that describes the database as locked down per user, without saying that the operator holds a key that opens all of it, would be misleading.

> TODO(ali): Decide and state a norm for yourself, then keep to it: when you will and will not look at a user's data (debugging a reported problem, responding to a legal request, investigating abuse) and whether you will tell the user afterwards. Also consider whether the admin usage report needs email addresses on it at all — a user ID is enough to find a heavy user, and the join is the only reason that screen identifies people by name.

### 7.6 Legal disclosure

We may disclose information if we are legally required to, or to protect the safety of users or the public.

### 7.7 Business transfer

If SHaiPT is ever sold or transferred, user data would form part of it. You would be told beforehand.

---

## 8. Cookies and what is stored in your browser

### 8.1 Strictly necessary

These are required for the app to work at all, and cannot be switched off:

| What | Where | What it is | How long |
|---|---|---|---|
| Sign-in session | Cookie (`sb-…-auth-token`, sometimes split across two cookies) | Your access and refresh tokens and your basic user details | Up to **400 days**, or until you sign out |
| Sign-in flow security | Cookies (`…-code-verifier`) | Short-lived values that protect the sign-in exchange | Minutes |
| Offline workout data | Browser database (`shaipt-offline`) | Your in-progress workout draft, any logged sets waiting to be sent, and a 24-hour cache of the exercise library | Until your browser's site data is cleared |
| Active workout | Local storage (`shaipt-workout-store`) | The workout you are in the middle of, including every set, weight, RPE and note | Until your browser's site data is cleared |
| Unsent actions | Local storage (`shaipt-offline-store`) | Sets and workouts that could not be sent because you were offline | Until sent, or until site data is cleared |

The 400 days is the default of the library we use, not a deliberate choice, and the sign-in cookie is readable by scripts running on the page rather than being locked away from them.

> TODO(ali): Decide whether to keep the 400-day session or shorten it, and whether to set the session cookie to `httpOnly`. If you shorten it, change the number in the table. The access-token lifetime and refresh-token rotation live in the Supabase dashboard, not in the code, so check them there before this table asserts anything more specific.

### 8.2 Functional

| What | Where | What it is |
|---|---|---|
| Your profile, cached | Local storage (`user`) | A full copy of your profile — **including your email, date of birth, gender, height, weight, goals and bio** — so pages load without fetching it again |
| Preferences | Local storage (`shaipt_form_checker_enabled`, `shaipt-user-preferences`) | Whether the camera form checker is on for this device, rest-timer settings, and your user ID. **A copy of these preferences is also kept on the server against your account** (section 3.14) |
| Demo | Local storage (`demo_mode`, `demo_user`) | If you try the demo without an account and type a name, that name is kept so the demo can greet you |

The profile copy is removed when you press **Log Out** on the main app screen. It is **not** removed if you simply close the tab, and the workout and offline stores in the table above are **not cleared on sign-out at all**. On a shared or borrowed device, that data stays until the browser's site data is cleared.

> TODO(ali): Clear `shaipt-workout-store`, `shaipt-offline-store`, the IndexedDB stores and the preference keys on sign-out. Right now only the `user` key is cleared, and only from one of several sign-out paths. Until that is fixed, this section has to keep the paragraph above, and any statement that "logging out removes your local data" would be false.

### 8.3 Advertising and analytics

**SHaiPT sets no advertising cookies and no analytics cookies today.** There is no Google Tag Manager container loaded, no Google Analytics, no Meta pixel, and no product-analytics package in the app.

**But the conversion-tracking call already ships.** When you successfully join the waitlist, the page creates a `dataLayer` array in your browser if one does not exist and pushes an event recording that a waitlist sign-up happened and which campaign brought you. Nothing consumes that event today, because no tag container is loaded. The moment a container ID is configured — which is a single environment variable set in a hosting dashboard, with no code change and no deploy review — that signal starts flowing to Google and Meta.

That is expected to happen. SHaiPT is about to advertise on **Google Ads** and **Meta**, and the tag manager is planned for the public marketing pages — the landing page and the waitlist page — to count sign-ups. It is **not** planned to run on the signed-in app screens.

When it does, this policy will be updated **before or at the same time**, with:

- the names of the cookies Google and Meta set, and how long they last,
- a statement that we share a conversion signal (that a waitlist sign-up happened, and which campaign it came from) with Google and Meta,
- a disclosure that this may count as "sharing for cross-context behavioural advertising" under California law, and an opt-out — see section 6.1 for why that is a commitment rather than an obligation today, and why this is the disclosure most likely to become an obligation first.

> TODO(ali): **Put that commitment in code, not in memory.** Today the promise above rests on you remembering, at the moment you paste a container ID into a hosting settings page, that a legal document depends on it. Make the tag component refuse to render unless a policy-version environment variable is also set, so the two cannot drift apart. Advertising tags in the US and Canada need disclosure, which this section is; they do **not** need a consent banner. Adding an EU or UK geo changes that and several other things at once — section 6.3 lists what.

### 8.4 The waitlist attribution key

The waitlist page stores one extra item in your browser (`shaipt.waitlist.firstTouch`): the campaign details of the **first** ad or link that brought you, so that if you come back later by typing the address, the right campaign gets the credit. **It is written when the page loads**, before you have typed anything or pressed anything.

This one is **not** strictly necessary — it is marketing attribution. It is submitted to us along with your email address when you join the waitlist.

> TODO(ali): For US and Canadian traffic, disclosure is generally enough and this section is it. For UK or EEA traffic the key would need consent **before** it is written, which means it could not be written on page load at all — one more item on the section 6.3 list. Note also that the waitlist page is not live in production yet (section 0), so it goes live with your next deploy. Publish this policy before or with that deploy, not after.

---

## 9. How long we keep things

Honest answer: **at the moment, indefinitely.** There is no automatic deletion anywhere in SHaiPT. Nothing expires, nothing is pruned, and no scheduled job removes old data.

> TODO(ali): Decide an actual retention period for each of the following, then either implement it or state it here as a commitment you will honour by hand. A policy that says "we keep it as long as necessary" satisfies nobody and is not really true when the answer is "forever". This is also a live obligation rather than good practice: PIPEDA's limiting principle requires personal information to be kept only as long as it is needed for the purpose it was collected for (section 6.2), and "indefinitely, because nothing was built to remove it" is not a purpose.
>
> - **Account data** while the account is open, and for how long after it is closed (usually zero, apart from anything you must keep for tax).
> - **Progress photos and videos** — the most sensitive thing you hold.
> - **AI chat transcripts** and intake transcripts.
> - **Direct messages** — plain text, with no way for anyone to delete them.
> - **Waitlist rows** — an email plus campaign attribution, kept forever today, including for people who were invited and never joined and people who asked to be left alone.
> - **Invite rows** for people who never signed up.
> - **AI metering rows** (section 3.13) — these currently survive account deletion with the user ID blanked, which is why section 3.13 says what it says.
> - **Billing records** — usually a legal minimum applies; ask your accountant.
> - **Vercel request and error logs** — check what retention your plan actually gives you and state that number.

**Two things survive account deletion that should not, and they are the reason this policy cannot yet describe erasure as complete.** The database records that belong to you go; these do not. (Waitlist rows, invite rows and the blanked metering rows also survive, but those are retention decisions from the list above rather than gaps in the deletion itself — see section 10.) Both of the following are the whole distance between "we delete your account" and that sentence being true.

> TODO(ali): **BLOCKER for honest erasure — progress photos and videos survive account deletion.** Deleting the account removes the database rows that point at your images, but the actual files stay in storage, because storage objects carry no foreign key back to the account and nothing in the deletion path touches the bucket. These are the most sensitive files SHaiPT holds — the intake set is deliberately near-nude (section 3.4) — and they are the ones that outlive the account. Deletion has to enumerate and remove the user's storage folder as well as their rows. This is the single most important unfixed item in this document.

> TODO(ali): **BLOCKER for honest erasure — cached AI output is never deleted and cannot be found.** Generated training plans and meal plans — documents written around your age, weight, goals and injuries — are cached in `ai_cache`, keyed only by a SHA-256 hash of the prompt. **There is no user ID on those rows**, so a deletion request has no way to reach them. The schema sets a 24-hour `expires_at`, but expiry is only ever checked at the moment a row is read: an expired row is ignored and left in place, and no job ever removes it. So the rows accumulate indefinitely and erasure cannot touch them. Either add a purge that actually deletes past `expires_at`, or put a user ID on the row so deletion can find it — ideally both. Until one of them exists, this policy cannot claim AI-generated content is deleted with your account, and section 10 has to keep listing it as a survivor.
>
> Worth being clear about why this is worse than it looks: the cache is keyed by prompt hash, and the prompt is built from *your* age, weight, goals and injuries. The key is derived from your data, the row contains a plan written about you, and there is no column linking either back to you. That is the shape of a record that cannot be deleted on request.

---

## 10. Your rights, and how to actually use them

> TODO(ali): **Set a response deadline you can actually meet, and write it in below.** Under PIPEDA (section 6.2) a Canadian user's access request generally has to be answered within **30 days**, and that one is owed today, not conditionally. The US state laws mostly use 45 days and none of them apply at SHaiPT's size (section 6.1). So 30 days is the number to write down and the number to be able to hit — as a solo founder, assembling a user's data by hand, from a laptop, possibly while travelling. If 30 days is not realistic without an export feature, that is an argument for building the export, not for writing a longer number.

Wherever you live, you can ask us for a copy of your data, ask us to correct it, ask us to delete it, or withdraw consent. Canadian users have those rights under PIPEDA. Everyone else has them because we offer them (section 6.1).

Here is what SHaiPT can do today, stated plainly:

**You can do yourself, in the app:**

- Edit your profile, goals, gender, weight unit and intake answers in **Settings**.
- Delete individual **body measurements**, **food logs**, **grocery lists**, and **progress photos and videos**.
- Change who can see your workout logs, and turn off auto-posting to the feed.

**You have to ask us for, and we do by hand:**

- **Deleting your account.** There is no delete button. Email _[privacy contact email]_ and we will delete it manually. Deletion removes the **Supabase Auth record** — the email address, the password hash, the sign-up metadata and the sign-in history — and everything that hangs off it: your profile, workouts, sets, personal records, AI chats, plans, nutrition and food logs, body measurements, weight history, statistics, onboarding and intake answers, direct messages, notifications, follows, posts, likes, comments, coaching relationships and subscription record. Any **custom foods** you added to the shared food database stay, because other people's meals and grocery lists point at them — but your account identifier is removed from them, so they no longer say who added them. Read section 9 for what currently survives deletion intact: **the photo and video files in storage**, **cached AI output**, waitlist rows, invite rows, and the AI metering rows (which remain, with your user ID blanked).
- **A copy of your data.** There is no download button and no export feature. If you ask, we will put your data together by hand and send it to you.
- **Ending a coach's access.** There is no in-app control for this yet. Email us.
- **Coming off the waitlist, or off the invite list.** Email us and we will delete the row.

**One thing deletion does that you may not expect.** Direct messages belong to both people in the conversation. Deleting your account deletes the messages — which means the other person's copy of that conversation disappears too. Nobody can delete an individual message, before or after.

> TODO(ali): Build a self-serve **delete account** button and a **download my data** export before you advertise at scale. Doing this by hand works for a private test with a handful of users; it does not work once ads bring in volume, and "email the founder" as the only erasure route is a weak position in front of a regulator — including the Office of the Privacy Commissioner of Canada, which is the one with jurisdiction from day one (section 6.2). Note that the only deletion tool today is a command-line script run from a laptop with an administrative key, and that it does not touch storage files, the AI cache or the waitlist (section 9). The deletion it performs no longer fails for users who have added a custom food — that foreign key was fixed — so what is left is the storage and cache gap, not a hard failure. The product requirements doc already lists export and deletion as a requirement; it is simply unbuilt.

> TODO(ali): You also need a route for people who are **not** users — someone on the invite list or the waitlist who wants their email removed. That is the same contact address, but it has to be reachable without signing in, which means it must be on the public policy page and not behind a login.

We do not charge for any of this, and we will not treat you differently for asking.

---

## 11. Security

What is actually true:

- **Most database tables are locked down per user.** The database enforces, table by table, that you read only your own rows — for workouts, exercise logs, AI chats, training plans, nutrition plans, food logs, body measurements, personal records, onboarding records, direct messages and AI metering rows. Section 7 describes the deliberate exceptions (posts, follows, likes, templates, coaching).
- **Your profile is one of those locked-down tables.** It reads to you, and to a trainer actively coaching you, and to nobody else. The parts of it other members need — the username, the avatar, the trainer storefront — live in a separate restricted view that contains no sensitive column at all (section 7.4). This was not always true: until recently every signed-in member could read every column of every profile, including email addresses and body stats. That rule has been replaced, and the check described below now verifies it.
- **One exception is still not deliberate**, and it is listed as a fix in section 7.4: **comments** are readable regardless of the parent post's visibility.
- **We never see your card number.** Payments happen on Stripe's own pages.
- **We do not see the password you choose.** Authentication is handled by Supabase. The exception is tester accounts created by the operator: for those, a password is generated by a script and printed to the operator's terminal, and the same is true when a tester password is reset. If you were given an account with a password rather than choosing your own, change it.
- **Your AI conversations are yours.** No coach and no other user can read them. The operator's administrative key can (section 7.5).
- **Progress photos are in a private storage area**, served to your browser through links that expire after an hour — but an active coach can read your whole folder, including photos marked private (section 3.4).
- Data is encrypted in transit, and our providers encrypt data at rest. That is their doing, not ours — SHaiPT itself adds no additional encryption layer.
- **There is a row-level-security check script** in the codebase that creates two throw-away accounts, writes rows as one and asserts the other reads none of them across eleven tables. It now also asserts that a signed-in stranger reads exactly **one** profile row — their own — and that the shared view has no email column to leak. It is run **by hand** against the live project; it is not part of continuous integration.

> TODO(ali): That script used to assert that any user *could* read the whole profiles table, which made it the thing guaranteeing the leak stayed. That assertion has been corrected and the script now fails if the leak comes back. What is still true is that it is not automated: continuous integration runs the unit tests only, and only on the `main` branch while all work happens on `v2-overhaul`. Put the check in CI against a disposable project — it is now worth running automatically, which it was not before.

What we are not going to claim: SHaiPT is run by one person on standard cloud infrastructure. There is no security team, no penetration test, and no certification. No service can promise perfect security, and this one especially should not.

> TODO(ali): Before publishing, fix (or disclose) the specific weaknesses the audit found, which are listed as TODOs elsewhere in this document: comments readable across visibility (7.4), private photos readable by coaches (3.4), the consent-free trainer link (7.3), the coaching relationship either side can activate (7.3), the direct-message rule enforced only in the API (7.4), the two remaining workout-privacy fallbacks (7.4), the unauthenticated invite oracle (3.12), and the whole of the 4Dcoach server (section 2). The profiles read rule is no longer on this list; it has been fixed. Also: the sign-up flow's redirect to `/auth/setup` puts the user's **email address in a URL query string**, which lands it in server logs and in referrer headers. That is worth fixing rather than disclosing — put it in the session or post it, do not spend it in a URL.

> TODO(ali): Write down, for yourself, what you would do in a breach — who you would tell, how fast, and how. This is a PIPEDA obligation, not a nice-to-have (section 6.2): a breach creating a real risk of significant harm has to be reported to the Office of the Privacy Commissioner of Canada and to the people affected **as soon as feasible**, and you must keep a **record of every breach for 24 months** — including the ones you decide are not reportable, which means the log has to exist before you need it. Given what SHaiPT holds — body photos, injuries, medical conditions — the "significant harm" bar is easier to clear here than for most products. Start the log now, empty.

---

## 12. Children

> TODO(ali): **BLOCKER — pick a minimum age, say it here, and build the check.** There is no age gate of any kind. Sign-up validates the email format, the password rules, the username length and the invite, and nothing else: no date of birth, no age confirmation, no under-13 block, no parental-consent path. That matters more than usual for this app, because it asks every user for near-nude physique photos, injuries and medical conditions, and offers camera access. Meta additionally requires weight-loss and health-and-fitness advertising to be targeted 18+.
>
> The minimum viable fix is a stated minimum age here and in the Terms, **and** a confirmation step at sign-up whose answer is stored. That is a product change, not a wording change, and it should ship before the ads run. A checkbox plus a stored value is a small piece of work; the exposure without it is not.
>
> In the markets SHaiPT actually advertises in: **COPPA** in the US puts a hard floor under 13 with verifiable parental consent, several US states now add their own minor-consent and design-code rules on top, and in Canada the Privacy Commissioner's position is that a child cannot give meaningful consent for sensitive information — which is all of this app. **18+ is much the simplest number to operate**, it is what Meta requires for weight-loss and fitness advertising anyway, and it avoids every parental-consent path at once. Going lower means building one. (If EU or UK geos are ever added, GDPR Article 8 brings its own parental-consent requirement for under-16s — section 6.3.)

SHaiPT is not intended for children. If we learn that we hold data about a child below our minimum age, we will delete it. If you believe a child has signed up, email _[privacy contact email]_.

---

## 13. Where your data goes

SHaiPT's database and all uploaded files are stored in the **United States** (Oregon). Our hosting, AI, email and payment providers are also in the United States.

**If you are in Canada, your data is processed and stored in the United States.** That is allowed under PIPEDA — there is no data-residency requirement — but it has a consequence worth stating plainly rather than burying: while your information is in the United States it is subject to US law, which includes lawful access by US courts and government agencies, and PIPEDA cannot prevent that. We are telling you because PIPEDA expects a transfer like this to be disclosed, and because you should be able to take it into account before you upload a photograph of your body.

We remain accountable for your information while a provider is handling it on our behalf. The providers are named in section 7.1.

> TODO(ali): This is the accurate version for a US-hosted service with Canadian users, and it needs no mechanism to be put in place — only the disclosure above. If EU or UK geos are ever added, that changes: Standard Contractual Clauses or the UK Addendum with each of Supabase, Vercel, OpenAI, Resend and Stripe, or documented reliance on the EU–US Data Privacy Framework where the provider is certified. That is part of the section 6.3 project. Do not assert a mechanism you have not checked.

---

## 14. Changes to this policy

If this policy changes in a way that matters — new categories of data, a new processor, advertising cookies going live — we will update the date at the top and note what changed. For significant changes we will tell you by email or in the app before they take effect.

> TODO(ali): **You do not currently have either channel.** There is no product email capability — the only mail path in the codebase is a command-line script you run by hand to send waitlist invitations — and there is no in-app announcement mechanism. The waitlist page separately promises "We'll email you when your place opens", which is the same hand-run script. Either build a way to reach users, or change this sentence and section 8.3's commitment to something you can actually perform. Then decide how much notice you will give and keep to it.

---

## 15. Contact and complaints

Email _[privacy contact email]_ for anything in this policy, including data requests. Write to us first — we would rather fix something than have you find out from a regulator that we would not.

If we do not resolve it:

- **In Canada**, you can complain to the **Office of the Privacy Commissioner of Canada**, which oversees PIPEDA (section 6.2). If you live in Quebec, Alberta or British Columbia, your province has its own commissioner as well.
- **In the United States**, privacy complaints are generally handled by your **state Attorney General**, and by the **Federal Trade Commission** where a company's own privacy statements turn out to be untrue.

> TODO(ali): Both routes above are statutory and exist whether or not SHaiPT builds anything, so they can be stated as fact. What you have to supply is the contact address at the top of this section — and the willingness to answer it within the deadline in section 10.

---

<!--
  Cross-check before publishing — see section 0, and README.md in this folder for the full list.
  - /privacy, /terms return 200 in production, footer links wired, Cookie Policy link resolved.
  - /waitlist links to /privacy.
  - The age confirmation exists at sign-up.
  - Section 7.4's table still matches the columns in the public_profiles view. If a column is
    ever added to that view, it is added to the left-hand column of that table in the same
    change, or this policy becomes false without anybody editing it.
  - Sections 6.1 and 6.2 still describe the geos being advertised to. Adding one is section 6.3.
  Already confirmed shipped, and the reason three TODOs came out of this draft:
  - migration 0160 (food_database.created_by ON DELETE SET NULL) — deletion no longer fails.
  - migration 0170 (profiles read rule narrowed, public_profiles view) — section 7.4 rewritten.
  - the workout-privacy fallbacks in Settings and WorkoutLogger's completion post. Two related
    fallbacks are NOT fixed and are still flagged in section 7.4.
-->
