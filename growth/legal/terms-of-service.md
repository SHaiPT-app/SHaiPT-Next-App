<!--
  UNREVIEWED DRAFT. Prepared from a code audit of the SHaiPT repository. Everything factual
  below — what the service does, how invites work, what the AI touches, what the camera does,
  the subscription tiers and trial length — was traced to application code and deployment
  notes. The legal machinery (disclaimers, liability cap, indemnity, governing law) is
  ordinary drafting that has NOT been reviewed by anyone qualified.

  This is NOT legal advice. It must be read and revised by a qualified lawyer in the
  relevant jurisdiction before it is published at https://www.shaipt.com/terms. The health
  and liability sections in particular are the ones that matter if something goes wrong, and
  they are the ones a lawyer should rewrite rather than approve.

  Every "> TODO(ali):" block marks a decision only Ali can make, or a code change that must
  ship BEFORE this document is published. See README.md in this folder for all of them in
  one place, and for the review findings that were rejected.
-->

# Terms of Service

**Last updated:** _[date of publication]_

These terms are an agreement between you and SHaiPT. By creating an account or using the app, you agree to them. If you do not agree, do not use SHaiPT.

> TODO(ali): **BLOCKER — nothing in the app presents, links to, or records acceptance of these terms.** The sign-up form has no terms checkbox, no privacy link, and the words "terms", "privacy" and "agree" do not appear in it at all. So the sentence above describes neither a clickwrap nor a browsewrap: there is nothing. For an app whose central defence is an assumption-of-risk clause, unenforceable formation is the whole ballgame — and the sign-up form is also the second place an ad reviewer looks for the privacy policy after the landing page.
>
> The only thing any user ever accepts is the health waiver on the coach screen. It is recorded from the browser, **the app carries on even if that record fails to save**, and it writes to a column named `terms_accepted_at` — so the one timestamp in the database conflates "read the health waiver" with "agreed to the Terms of Service", and neither meaning is reliable.
>
> Minimum fix, before publication: a checkbox at sign-up linking to `/terms` and `/privacy`, recorded server-side in its own column, blocking on failure. Rename the existing column to something that says what it is.

---

## 1. Who we are

> TODO(ali): Fill in the same identity details as the privacy policy: legal entity name (your own name if you are a sole trader, or the registered company name and number), a publishable address, and a contact email. These terms are unenforceable in practice if the other party cannot tell who they contracted with.

SHaiPT is operated by _[legal entity]_ of _[address]_. Contact: _[support email]_.

---

## 2. What SHaiPT is

SHaiPT is an AI personal-training web app. It:

- interviews you about your goals, training history, equipment, schedule and any injuries, and generates a **training plan**;
- interviews you about your diet, allergies and preferences, and generates **macro targets, a meal plan and a grocery list**;
- lets you **log workouts** — sets, reps, weights, RPE and notes — and tracks your progress, personal records and streaks;
- lets you record **body measurements** and upload **progress photos and videos**;
- gives you an **AI coach** and an **AI dietitian** you can chat with;
- offers a **camera-based form checker** that counts reps and gives form cues while you lift, for a limited set of movements (section 3);
- can connect you with a **human trainer**, who then sees your training data;
- has social features — a feed, follows, likes and comments, and posts the app makes on your behalf when you finish a workout.

SHaiPT is early software under active development. Features may change, break or be removed. We do not promise it will be available at any particular time.

> TODO(ali): Decide whether to label the service explicitly as "beta" or "early access" while it is invite-only. It is honest, it lowers expectations sensibly, and it costs nothing.

> TODO(ali): **BLOCKER — this list does not describe the product the ads sell.** The live landing page and the waitlist page advertise a 4D replay you can walk around, a 0–100 technique score, bar path in centimetres, reps-in-reserve from velocity loss and AR placement on your real bench. Section 18 of these terms then says those terms do not cover 4Dcoach, and the privacy policy's camera section says nothing leaves your device while the same site's FAQ says two of the advertised options upload the clip to a server. An ad reviewer compares the ad, the landing page and the legal pages; here the legal pages disclaim the headline feature. `growth/ads/policy-limits.md` flags this as an FTC Act section 5 problem independently of platform policy. Resolve it the same way as privacy policy section 2 — bring 4Dcoach in, or make every link out an unmistakable exit and stop selling it as SHaiPT.

---

## 3. Health and fitness — read this part

**SHaiPT is not a medical service and gives no medical advice.**

- **Everything SHaiPT produces is general fitness information.** Training plans, meal plans, macro targets, AI coach replies, AI dietitian replies, form cues and progress commentary are generated by software from what you tell it. They are not a diagnosis, not a treatment, not a prescription, and not a substitute for professional medical, nutritional or physiotherapeutic advice.
- **Talk to a doctor before you start.** Especially if you have, or think you might have, a heart condition, high blood pressure, diabetes, an eating disorder, an injury, a chronic illness, are pregnant or postpartum, are taking medication, or have been told by a health professional to be careful with exercise.
- **Lifting weights can injure you.** Strength training, and physical exercise generally, carries a real risk of strain, sprain, tear, fracture, fainting, cardiac events and, in rare cases, death. That risk exists however good the programming is. **You accept that risk and you take full responsibility for your own safety.**
- **You decide what you do.** SHaiPT suggests; you choose. If a weight feels wrong, if a movement hurts, if you feel dizzy, faint, short of breath, or feel pain in your chest, arm, jaw or head — **stop, and get medical help.** Do not wait for the app to tell you to.
- **The AI does not know things you have not told it, and can be wrong about things you have.** It is a language model. It can produce plans that are unsuitable for you, miscalculate, or give confident advice that is simply incorrect. It has no ability to examine you, and it cannot notice that something is wrong.
- **The AI is not a licensed professional.** Not a doctor, not a physiotherapist, not a registered dietitian, not a certified coach. Nothing it writes should be read as coming from one.
- **The AI's caution is an instruction to it, not a control on it.** The models are told, in their instructions, to stop and send you to a doctor if you mention things like chest pain, dizziness, numbness or fainting. That instruction is written in the prompt. There is no keyword filter, no emergency screen and no check that the model actually complied — a language model can paraphrase an instruction away or lose it in a long conversation. **Do not rely on the app noticing.**
- **The form checker is a guide, not a supervisor, and it is narrower than it looks.** It estimates your joints from a camera, in two dimensions, with depth discarded. It has purpose-built checks for **four movement families only** — squat, bench press (also matched for chest press and push-up), deadlift (also RDL) and overhead press. For every other exercise in the library it falls back to checking whether your shoulders and hips are level, and nothing else — while still counting reps and still showing the same "Form Check" badge and cues. Two of its cues, "Keep your back straight" and "Keep your chest up", are shown at its highest severity and are exactly the kind of judgement a flat camera image cannot properly support. It can be wrong, it can miss dangerous form entirely, and it does not know whether you are hurt. Prioritise how your body feels over what the overlay says.
- **We do not screen your health information.** If you tell the intake interview about an injury or a medical condition, that information is used to shape a generated plan. **No human at SHaiPT reads it and decides whether it is safe for you to train.** If you have a condition that needs supervision, you need a human professional, not this app.
- **One thing the app does do.** Generated calorie targets are held to a floor of **1,200 kcal per day**. If the arithmetic would go below that, the number is raised to the floor and the explanation you are shown says to talk to a healthcare provider before restricting further. That is a deterministic check in the code that no model reply can route around. It is not medical supervision, and it is the only hard safety rule of its kind in the product.
- **If this is an emergency, call your local emergency number.** SHaiPT is not monitored and cannot help you.

> TODO(ali): **BLOCKER — this section gates one screen and nothing else.** The only place in the shipped app that shows a health disclaimer before letting you in is the AI-coach interview, and even there the acceptance record is written from the browser and fails open. A user can reach the AI coach chat, the AI dietitian and macro targets, generated training plans, post-workout plan adaptation after reporting pain, and the camera form checker **without ever being shown any of it**. A disclaimer nobody was shown is a disclaimer that will not hold. Decide where the gate goes (sign-up is the obvious answer), and make it a real record.

> TODO(ali): The in-app camera warning is one dismissible line, shown once per page load and held behind a flag so it never reappears, and it sits above the overlay rather than on it. It says "Computer Vision is for guidance only. Always prioritize safe form and physical comfort over AI feedback" — the right sentence in the wrong place, since it vanishes on dismissal while the overlay keeps giving cues for the rest of the session. The practical warnings in section 10 below (do not use while driving; do not let the screen distract you from a heavy lift) appear nowhere in the product at all.

> TODO(ali): The `/demo` walkthrough is publicly reachable without an account — it is excluded from the route protection — and it prescribes concrete loads (185 lb bench for 5×5, 155 lb rows) with no disclaimer, no waiver and no account. It is noindexed but not blocked, and it is one URL an ad, a share or a reviewer can land on. Either put a short version of this section on it or take the numbers out.

> TODO(ali): Have counsel rewrite this section. Three specific things to raise with them: (1) whether a separate, explicit assumption-of-risk acknowledgement at sign-up is worth having on top of the terms, and whether it should be recorded per-user with a timestamp; (2) whether anything in the app — the AI dietitian asking about diabetes, PCOS and medication, the AI coach's prompt that watches for "chest pain" and "blacked out", the prompt's own "safety-first — always prioritize proper form and injury prevention" framing — edges the product toward a regulated wellness or medical-device characterisation in any market you advertise in; (3) that the site's own structured data declares SHaiPT a **HealthApplication** in machine-readable markup while this section insists it is general fitness information. Google's healthcare and health-claims policies key off how a product presents itself. Decide which it is and make the markup, the ads and these terms say the same thing.

---

## 4. Who can use SHaiPT

> TODO(ali): **BLOCKER — set the minimum age and build the check.** The sentence below is currently a sentence with nothing behind it. Sign-up validates the email format, the password rules, the username length and the invite, and nothing else: no date of birth, no age confirmation, no under-13 block, no parental-consent path. The same flow then asks for front/back/side physique photos "wearing minimal clothing", asks about injuries and medical conditions, and offers camera access. "By creating an account you confirm that you are at least X" is worth nothing against a regulator when the form never asks. Meta also requires weight-loss and health-and-fitness advertising to be targeted 18+, and both platforms treat minors plus health data as high-risk. 18+ is the simplest number to operate here, and in the two markets SHaiPT is actually advertising in it is close to the only sensible one: below 13 the US COPPA rules bite with verifiable parental consent, a growing number of US states add minor-consent and design-code requirements above that, and in Canada the Privacy Commissioner takes the position that a child cannot give meaningful consent for information as sensitive as this. Going lower means building a parental-consent path, for a product whose first act is to ask for physique photos. See privacy policy section 12.

You must be at least _[minimum age]_ years old to use SHaiPT. By creating an account you confirm that you are.

You must also be legally able to enter into this agreement, and not barred from using the service under the laws that apply to you.

---

## 5. Accounts, invites and the waitlist

**Invite only.** SHaiPT is currently closed. The sign-up form will refuse to create an account unless your email address is on the invite list.

> TODO(ali): The sentence above is deliberately narrower than the previous draft's "sign-up will be refused otherwise", because the check runs **only in the browser**. The form asks the server whether an address is invited and then, if it likes the answer, calls the sign-up API directly from the page with the public key. Nothing server-side and nothing in the database refuses an uninvited sign-up: the account trigger creates the profile either way and merely leaves the tester flag off. Worse, with no invite row the new profile's **role is taken from client-supplied sign-up metadata**, so an account created outside the form can be created as a trainer — which matters because of the trainer capabilities described in section 11 and privacy policy section 7.3. Enforce the invite check server-side, then this clause can go back to the stronger wording.

**The waitlist.** You can join the waitlist with your email address. That does not create an account and does not guarantee you will get one. We may invite you, or we may not. You can ask us to remove you at any time — email _[support email]_.

**Your account is yours.** Keep your password to yourself. You are responsible for what happens under your account. Tell us straight away if you think someone else has got into it.

**One account per person.** Do not share an account, and do not create an account for someone else.

**Test accounts.** Accounts created from an invite are marked as tester accounts and are given full feature access without paying. Tester accounts exist for testing, may be revoked at any time, and may be deleted along with everything in them.

> TODO(ali): Read that clause and notice what it actually says today. The sign-up trigger marks an account as a tester whenever an invite row matched, and sign-up in practice requires an invite — so **every account that exists is a tester account**, and this clause therefore tells 100% of SHaiPT's users that their account and all their data may be deleted at any time. Tester accounts are also hard-blocked from checkout, which makes all of section 6 unreachable for every user who exists. Decide whether that is what you mean. If the invite-only period is meant to be a free beta rather than a disposable test, say so in those words, and stop conflating "was invited" with "is disposable" in the database.

---

## 6. Subscriptions and payment

> TODO(ali): **BLOCKER — this whole section is written for a state that does not exist, and the reason is worse than the previous draft said.** Stripe is not in test mode; it is **not configured at all**. There is no `STRIPE_*` variable in the local environment file, and the deployment notes' full inventory of the hosting environment lists Supabase, OpenAI, the AI spend cap and the admin list — no Stripe keys in any environment. The Stripe client throws before any call, so the checkout route returns a 500. Meanwhile every pricing call to action on the live landing page — "Start Free Trial" in the footer, "Get Started" and "Start Pro Trial" in the pricing block — sends the visitor to `/login`, where anyone not on the invite list is told "SHaiPT is invite-only for now."
>
> Google Ads' destination requirements bite when the advertised transaction cannot be completed. Publishing terms that describe a paid service nobody can buy makes the mismatch documentary. Pick one: (a) delete this section and replace it with one line saying SHaiPT is free during the invite-only period and that paid plans will come with notice — and change the landing page's buttons to match; or (b) configure Stripe with live keys and switch it on at the same time these terms publish.

When paid plans are live:

- SHaiPT offers three tiers — **Starter ($9.99/month)**, **Pro ($19.99/month)** and **Elite ($29.99/month)** — each with a different set of features.
- New subscriptions start with a **14-day free trial**.
- Payment is taken by **Stripe** on its own hosted checkout page. We never see or hold your card details.
- Subscriptions renew automatically at the end of each billing period until you cancel.

> TODO(ali): **The previous draft promised "you can cancel at any time" and there is no way to cancel.** The only subscription routes are checkout, webhook and status: no Stripe billing-portal route, no cancel endpoint, and no cancel control in any screen. The `cancel_at_period_end` field exists but is only ever written by the inbound Stripe webhook — it records a cancellation made somewhere else rather than offering one. The landing page says "Cancel anytime" in the hero. This is the one promise in this section that consumer law in SHaiPT's own markets actually enforces — California's Automatic Renewal Law and its equivalents in other states require an easy, online cancellation path for anything that auto-renews, and Canadian provincial consumer-protection legislation takes a similar line — so it cannot go back in until the control exists. Build a billing-portal link — it is a few lines — and then restore the sentence, along with "cancelling stops the next renewal; you keep access until the end of the period you have already paid for."

> TODO(ali): Decide and state (a) the prices in each currency you sell in and whether tax is included, (b) your refund policy — and check what consumer law requires where your customers actually are, which is now the US and Canada: US state auto-renewal statutes govern the renewal notice and the cancellation path more than the refund itself, while several Canadian provinces give consumers cancellation rights for distance contracts that a terms page cannot sign away, (c) how you will give notice of a price change, and (d) what happens to a user's data and access when a subscription lapses. None of these are in the code; all of them are decisions.

---

## 6A. Promotions and offers

> TODO(ali): **This section is a placeholder for an offer that is advertised in three places, described differently in each, and implemented nowhere.** The landing page hero says "Free Pro month for consistency". The pricing lede says "Stay consistent and your Pro month is free". The in-app card says "Complete the 12-week consistency challenge and get free Pro access". The configuration in the code says the reward is **three months**, not one. And nothing implements any of it: the flag that would mark a subscription as earned through consistency is read in one place and written nowhere, and no code path ever marks a challenge as passed.
>
> So an advertised offer has inconsistent terms across three surfaces, no stated conditions, duration or withdrawal right anywhere, and no mechanism to honour it. Either write the real terms here — what you have to do, what you get, for how long, when it can be withdrawn, what happens if the challenge system changes — and build the award path; or take the claim off all three surfaces before the ads run. An offer you cannot honour is a consumer-protection problem, not a marketing one.

---

## 7. How you may and may not use SHaiPT

Use it to train. Do not:

- break the law, or use SHaiPT to help anyone else do so;
- try to get into other people's accounts or data, or work around the access rules in the app;
- upload sexual content, content involving children, hateful or harassing content, or anything you do not have the right to upload;
- upload photos of anyone but yourself, unless they have agreed;
- send unsolicited messages, spam or advertising to other users;
- scrape, bulk-download or systematically collect other users' information;
- put SHaiPT's AI to work on something it is not for, try to make it produce harmful output, or attempt to extract its instructions;
- overload, probe or attack the service, or automate access to it beyond normal use;
- resell SHaiPT, or present its output as advice from a qualified professional;
- impersonate anyone.

If you break these rules we may suspend or delete your account.

> TODO(ali): One of these reads as enforced and is not. **Unsolicited messages:** the database rule on direct messages checks only that you are the sender, so any signed-in user can message any other user with no relationship between them — and the "allow unsolicited messages" setting shown in Settings is written to the database and read by no query anywhere. A rule you rely on the honour system for is fine, as long as you know that is what it is. Fixing it is a small change; see privacy policy section 7.4.
>
> The **bulk-collection** line is now in better shape than it was. The profiles table used to be readable in full by every signed-in user, and two API routes returned whole profile rows; both have been fixed, and a member scraping the app now gets usernames, avatars, bios and trainer storefronts rather than email addresses and body stats. It is still worth a rule against systematic collection, but the rule is no longer the only thing standing between a scraper and everyone's date of birth.

---

## 8. Your content

**You own what you create.** Your workouts, notes, measurements, photos, videos, messages and posts remain yours. We do not claim ownership.

**You give us permission to run the service.** To make SHaiPT work, you allow us to store your content, display it back to you, show it to the people you have chosen to show it to (a human trainer you have accepted, or other users if you make a post public), and send the relevant parts to the providers listed in the [Privacy Policy](/privacy) — including sending your training and health inputs to OpenAI so the AI features can respond. This permission is limited to operating and improving SHaiPT and it ends when you delete the content, except where a copy has already gone somewhere we cannot reach it (see the Privacy Policy's retention section — it is honest about exactly which copies those are).

**We do not sell your content.**

> TODO(ali): The previous draft also said "and we do not use it to train AI models", as settled fact. **Nothing in the code establishes it.** The AI gateway sets no zero-retention option and passes no end-user identifier; the answer depends entirely on your OpenAI account settings and any agreement you have with them, neither of which the repository can see — and the privacy policy's own section 7.2 asks you to go and look it up. Two documents published on the same day must not have one asserting what the other admits is unknown. Find the answer, then either restore the sentence or write the accurate one. This is one of the few claims a regulator or an ad reviewer may ask you to substantiate.

**You are responsible for what you upload.** Do not upload anything you do not have the right to, and remember that photos of your body are exactly as sensitive as they sound.

**Public by default, in some places.** Workout **templates and training plans you create** are visible to other signed-in users by default. **Custom foods you add** are readable by anyone at all, including people who are not signed in, and carry your account identifier. Your workout **logs** are private by default, in the database and now in most of the app — but read the Privacy Policy's section 7.4 for the two paths that still do not respect that default, and for the posts the app makes on your behalf when you finish a session, including the personal-record posts that publish regardless of your auto-post setting.

---

## 9. AI output

Everything the AI produces — plans, meals, macros, chat replies, weekly summaries, form cues — is generated automatically and comes with no guarantee that it is correct, suitable for you, or safe.

- We do not review AI output before you see it.
- Some of it is produced without you asking: a summary of your session is generated when you finish a workout, and a weekly report is generated when you open the progress screen.
- The same question can produce different answers.
- The AI may be confidently wrong.
- As between you and us, the plans and text generated for you are yours to use for your own training. We make no claim to them, and we cannot promise they are original — a model can produce similar output for different people.
- Section 3 applies to every word of it.

---

## 10. The camera and video

**The form checker keeps video on your device.** When you use the in-app form checker, the camera feed is analysed in your browser, nothing is recorded, and no image or video frame is sent to us or to anyone else. The [Privacy Policy](/privacy) explains this in detail, including the one thing that does leave your device (a model file download from Google and jsDelivr) and how narrow the analysis actually is.

**That is a statement about the form checker, not about video generally.** SHaiPT also lets you **upload video** — progress videos of up to 25 MB, in MP4, QuickTime or WebM, stored in a private area of our file storage the same way as your progress photos. Those you are sending to us on purpose, and the Privacy Policy covers what happens to them. And **4Dcoach**, which is linked from inside SHaiPT and is not covered by these terms (section 18), uploads video to a separate server — the site's own FAQ says so.

You have to grant camera permission, and you can withdraw it in your browser at any time.

Use it somewhere safe. Do not use it while driving, and do not let watching a screen distract you from a heavy lift.

---

## 11. Human trainers

If you connect with a human trainer through SHaiPT:

- **They will see your training data** — your profile, your workouts and sets, your body measurements and weight history, your progress photos and videos (including ones marked private — see the Privacy Policy's section 3.4), and the plans assigned to you. They cannot see your AI conversations.
- **The trainer is not us.** Trainers are independent. SHaiPT does not employ them, does not vet or certify them, does not supervise their advice, and is not responsible for it. Any arrangement between you and a trainer — including anything you pay them — is between the two of you.
- **Trainers must keep client information confidential** and use it only for coaching that client.
- **You can end the relationship.** Email _[support email]_ and we will disconnect you.

> TODO(ali): That last line is the honest version, because there is no in-app way to end a coaching relationship today — "ended" is a legal status in the data model and nothing ever writes it, and the respond route accepts only accept, decline and waitlist. Build the button, then change the line to describe it.
>
> Two further things must be fixed before this section can claim that consent governs access. **First**, the database rule lets either party set a relationship to active, including the trainer who sent the request — so a trainer can grant themselves access to the person they invited. The guard against that lives only in the API route. **Second**, there is a separate path that skips the relationship entirely: an API route writes `trainer_id` onto any user's profile with the administrative key whenever the caller names themself as the trainer, with no acceptance step and no role check, and a second route then treats that field alone as proof of a client relationship. These are live authorization defects, not wording problems.
>
> Also decide whether trainers need separate trainer terms; the obligations above are the minimum, and a marketplace with money in it usually needs more.

---

## 12. Ending it

**You can leave whenever you want.** There is no delete button in the app yet, so email _[support email]_ and we will delete your account by hand. The [Privacy Policy](/privacy) sets out exactly what that removes and what currently survives it.

> TODO(ali): This promise used to fail outright for one group of users — anyone who had ever added a custom food, because that foreign key had no delete rule and the database refused the deletion. **That is fixed** (migration `0160`, `ON DELETE SET NULL`), so account deletion now completes for everyone. What it does **not** yet do is remove your uploaded photo and video files from storage, or the cached AI output generated about you. Both are listed in privacy policy section 9, and the sentence above deliberately points the reader at that section rather than implying the deletion is complete.

> TODO(ali): Replace the sentence above with "use the Delete Account button in Settings" as soon as that exists. Until then this is the truthful version and should stay.

**We can end it too.** We may suspend or close your account if you break these terms, if we have to for legal or security reasons, or if we stop running SHaiPT. Where we reasonably can, we will give you notice and a chance to get your data out first. If we close a paid account without cause, we will refund the unused part of the period you paid for.

**What survives.** Sections 3, 8, 9, 13, 14, 15 and 17 continue to apply after your account ends.

---

## 13. No warranty

SHaiPT is provided **as is** and **as available**. To the maximum extent the law allows, we make no warranties of any kind — express or implied — including any implied warranty of merchantability, fitness for a particular purpose, or non-infringement.

In particular, we do not promise that:

- the service will be available, uninterrupted, or error-free;
- your data will never be lost — SHaiPT runs on a free database tier with no backup or recovery guarantee that we can pass on to you;
- AI output will be accurate, complete or suitable for you;
- the form checker will correctly assess your technique;
- the service will produce any particular result for your fitness, weight, strength or health.

Some places do not allow these exclusions. If you live in one, you keep whatever rights that law gives you and nothing here takes them away.

> TODO(ali): The previous draft added "so **keep your own copy of anything you cannot afford to lose**" to the data-loss bullet. **The product makes that impossible** — there is no export feature and no download button, which the privacy policy says itself, and the only way to get a copy of your data is to email you and wait for it to be assembled by hand. Telling users to self-insure against data loss while withholding the means is a clause that will not survive being read aloud, three lines below a warranty disclaimer conceding there is no recoverable backup. Build the export (privacy policy section 10 asks for it anyway), then the sentence can come back.

---

## 14. Limits on what we owe you

> TODO(ali): This is the clause a lawyer must rewrite rather than tidy. The cap below is a placeholder. Ask specifically about: whether a personal-injury carve-out is required or advisable in the markets you sell in (US states vary on whether a pre-injury waiver of negligence liability is enforceable at all — some void them outright for consumer services, and several Canadian provinces limit them by statute, which matters a great deal for an app that tells people how to lift), whether consumer law in those markets limits what you can cap at all, and whether you should be carrying insurance instead of relying on a cap. A cap that a court declines to enforce is worth nothing on the day it is needed.

To the maximum extent the law allows:

- We are not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, lost data or lost opportunity.
- Our total liability to you for any claim connected to SHaiPT is limited to the greater of **the amount you paid us in the twelve months before the claim** or **$100**.
- Nothing in these terms excludes liability that cannot lawfully be excluded — including, where applicable, liability for death or personal injury caused by negligence, or for fraud.

---

## 15. You cover us

If someone brings a claim against us because of how you used SHaiPT, what you uploaded, or because you broke these terms or the law, you agree to cover our reasonable losses and legal costs in dealing with it.

---

## 16. Changes to these terms

We may update these terms. If a change matters, we will tell you — by email or in the app — before it takes effect, and update the date at the top. If you keep using SHaiPT after that, you are agreeing to the new version. If you do not agree, close your account.

> TODO(ali): **You have neither channel.** There is no product email capability in the app — the only mail path in the codebase is a command-line script you run by hand to send waitlist invitations — and there is no in-app announcement mechanism. This clause conditions continued use on notice being given, which makes it exactly the kind of clause that gets quoted back at you. Either build a way to reach users or change the sentence to what you can actually do. Then decide how much notice you will give for material changes (30 days is the usual answer).

---

## 17. Law and disputes

> TODO(ali): **Decide the governing law and where disputes are heard, and write them in.** This follows from where you are actually established, which is also one of the identity questions in section 1. Points to raise with counsel: consumer-protection law in the place the **user** lives often overrides a choice-of-law clause, so a clause naming your jurisdiction does not necessarily get you there — and with customers in the US and Canada that means fifty-odd states and thirteen provinces and territories, several of which will not let a consumer contract move the venue at all; and whether you want arbitration or a class-action waiver is a real decision with real trade-offs, not a default. Do not copy a clause out of another app's terms — the wrong one is worse than none.

These terms are governed by the laws of _[jurisdiction]_, and disputes will be dealt with by the courts of _[venue]_, except where the law where you live says otherwise.

---

## 18. The rest

- **Whole agreement.** These terms and the [Privacy Policy](/privacy) are the whole agreement between us about SHaiPT.
- **If part fails.** If a court decides part of these terms cannot be enforced, the rest still stands.
- **Not enforcing something isn't giving it up.** If we do not enforce a term straight away, we can still enforce it later.
- **Transfer.** You cannot transfer your account or these terms to anyone else. We may transfer them if SHaiPT is sold, and we will tell you if that happens.
- **4Dcoach.** SHaiPT links to 4Dcoach, a separate application. These terms do not cover it.

> TODO(ali): Same decision as in the privacy policy, and it is a blocker in both — either bring 4Dcoach inside these terms and describe what happens when a user uploads a video of themselves to it, or give it its own terms and privacy policy and make the links out of SHaiPT say plainly that the user is leaving. Leaving it undefined is the one option that does not work, and it is the option the advertising currently depends on.

---

## 19. Contact

_[support email]_

---

<!--
  Cross-check before publishing — see README.md in this folder for the full list.
  - /terms and /privacy return 200 in production; the footer's three legal links are wired or
    removed; the sign-up form links to both and records acceptance.
  - The in-app AI waiver on the coach screen overlaps with section 3 here. Keep them
    consistent, and consider having the waiver point at /terms rather than restating it.
  - Marketing copy that these terms cannot support has been removed: "Join thousands of
    athletes" on an invite-only app with a handful of accounts (live, in the footer), and the
    orphaned Features component's "prevent injury", "Injury prevention alerts", "98% Form
    Accuracy", "10K+ Workouts Generated" and "4.9 User Rating" — which is one import away from
    being live and which growth/ads/policy-limits.md already forbids.
-->
