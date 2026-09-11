# Policy limits — the lines that are not creative choices

Three rules, one page. Each one is a hard stop with a workable alternative next to it. Breaking any
of them costs an ad account or a lawsuit, and an ad account is not easy to get back.

Nothing here is legal advice. Where a figure or a current platform rule is uncertain, it says so —
check rather than trusting the number in this file.

> **This file and `growth/prompts/content-rules.md` are the same policy, enforced at two different
> points.** That file gates *production* — every asset is tagged `ad-safe` or `organic-only` in
> `growth/assets/registry.json`, and a video inherits the most restrictive tag in it. This file
> gates *spending*. The single rule connecting them: **only an `ad-safe` video may ever go behind
> ad spend.** If the two documents ever disagree, `content-rules.md` is upstream and wins; fix this
> one.

---

## (a) No real person's name, likeness or footage in a paid ad. Ever.

**The rule.** Videos analysing a famous lifter's technique — the obvious, cheap, high-performing
SHaiPT content idea — may **never** run as an ad. Three separate problems stack:

- **Right of publicity.** Using someone's identity for commercial advantage without permission is
  actionable under state law: California Civil Code §3344 provides statutory damages plus the
  profits attributable to the use; New York Civil Rights Law §§50–51 makes it both a tort and a
  misdemeanour. An ad is the textbook commercial use. Athletes and their agencies pursue this.
- **Platform policy, automatic.** Meta's Advertising Standards prohibit unauthorised use of
  someone's likeness or personal attributes; Google's Misrepresentation policy covers
  impersonation and implying an endorsement that does not exist. These trip ad review, and repeated
  rejections escalate to account-level restrictions.
- **Copyright, on top.** The Instagram or YouTube clip of that lifter belongs to whoever filmed it.
  Using it in an ad is infringement independent of the publicity question, and Meta's rights
  matching will often catch it before a human does.

**The trap to know about: never press "Boost".** Boosting an organic post converts it into a paid
ad — full ad review, full publicity exposure. The famous-lifter breakdown that is fine on
@shaiptofficial becomes a policy violation the instant it is promoted. If a real-person video takes
off organically, the correct response is to make a *clean* version for paid, not to boost the one
that worked.

**What to use instead** — in rough order of value:

1. **Screen recordings of the 4D replay and the coach output.** 100% owned, no licence, no release,
   and they show the product instead of claiming things about it. This is the strongest asset
   SHaiPT has; `meta-ads.md`'s hook backlog leans on it for a reason.
2. **Ali's own lifts.** Ali consents to Ali's likeness. Free, clean, and on-brand.
3. **A friend or tester, with a short written release** — an email saying "you may use this footage
   of me in SHaiPT advertising" is sufficient and takes thirty seconds. Get it *before* filming.
4. **Licensed stock footage** with an explicit commercial/advertising licence, and keep the licence
   receipt.
5. **The Higgsfield AI character** for anything that needs a human presence — subject to (b).

Famous-lifter analysis stays **organic-only**, on @shaiptofficial. That is not risk-free either —
it is commentary using someone else's footage — but it is a different risk profile, it is how that
corner of fitness Instagram operates, and it is not a paid placement. Just never boost it.

---

## (b) The AI character hosts and demonstrates. It never claims to be a customer.

**The rule.** The Higgsfield character can present, narrate, explain, point at the screen and
demonstrate filming a set. It must never say or imply *"I used SHaiPT and here is my result."*

The FTC's **Rule on the Use of Consumer Reviews and Testimonials** (16 CFR Part 465, effective
21 October 2024) directly prohibits testimonials from people who do not exist, including
AI-generated ones, and misrepresenting a reviewer as a genuine customer. It carries civil penalties
per violation — the statutory maximum is inflation-adjusted annually and was in the region of
$50,000 per violation in 2024; **look up the current figure rather than quoting this one.** The
older **Endorsement Guides** (16 CFR Part 255) already required endorsements to reflect the honest
opinions of a real user and material connections to be disclosed. A synthetic person reporting
results fails both, and does so in writing, on a platform, with a timestamp.

Meta and Google add their own misleading-claims enforcement on top, and both have been expanding
disclosure requirements for synthetic media.

**What works instead:**

- **Frame the character as what it is.** It is SHaiPT's presenter, not a user. Give it a
  presenter's script — second person, about the product: *"Film one set. That's the whole setup."*
  Never first person about outcomes: *"I added 20kg to my squat."*
- **Label it.** A small persistent on-screen credit such as `AI-generated presenter` costs nothing,
  removes the ambiguity, and increasingly matches where both platforms are heading anyway.
- **Let the product be the testimonial.** A screen recording of a technique score rising, or the
  coach's plain-English feedback on a real set, is *evidence*. It proves more than a claim would
  and it is unfalsifiable in the right direction. Show the output; do not have a synthetic person
  describe it.
- **Real testimonials, later, properly.** Once there are real invited members, a real quote from a
  real person with written permission is both legal and far more persuasive. Disclose any material
  connection (free access counts as one). Until then, SHaiPT has no testimonials and its ads must
  not contain anything shaped like one.

---

## (c) No before/after bodies. No negative-body-image framing.

**The rule.** Meta's Advertising Standards restrict health-and-fitness advertising specifically:
ads must not show **before-and-after images**, must not depict unexpected or unlikely results, and
must not imply or attempt to generate **negative self-perception** in order to promote a
health, weight-loss or appearance-related product. This applies **even when the people are real and
consenting** — consent is irrelevant to this one. Ads for weight-loss products and services must
also be targeted **18+**, which is why `meta-ads.md` sets the floor at 18.

Google is stricter about *targeting* than about creative here: its personalized-advertising policy
treats health topics including weight loss as a sensitive category and restricts building audiences
around them. For Search ads with no audience layer this mostly does not bite, but do not build
remarketing lists around fitness intent and assume it will run.

**What works instead — move the before/after from the body to the technique:**

- **Technique score 62 → 84** on the same lift after one cue. That is a genuine before/after, it is
  about capability rather than appearance, and it is the single most persuasive thing SHaiPT can
  show. It is hook #8 in `meta-ads.md` for exactly this reason.
- **Bar path before and after.** Two overlaid lines. No body, no scale, no shirt off.
- **Frame outcomes as capability, not appearance.** *"Your third rep breaks down before you feel
  it"* is a statement about a lift. *"Stop looking like this"* is a statement about a person, and
  it is the thing the policy exists to stop.
- **Avoid health and medical claims entirely.** Do not say SHaiPT prevents injury, fixes back pain,
  corrects a condition, or is safe for anyone in particular. Injury prevention is a health claim,
  it requires substantiation SHaiPT does not have, and it can pull the ads into Google's healthcare
  policy where the bar is much higher. "See where the bar path drifts" is a description of a
  feature. "Avoid injury" is a medical promise.
- **No numbers about bodies.** No weights lost, no body-fat percentages, no timelines. Numbers
  about *the product* — reps counted, exercises in the library, angles in the replay — are fine and
  are what the ad copy in `google-ads.md` uses.

---

## Check these four before the first ad goes live

1. **"876 exercises."** The waitlist page and several ad headlines use it, but
   `scripts/seed-exercises.ts` describes the source dataset as "~870 rows" and the real count
   depends on what the last seed actually wrote. Both platforms can require substantiation for a
   specific claim. Run `select count(*) from exercises;` and either use the true number or write
   **"870+ exercises"**, which is safe either way.
2. **The 4D replay promise.** The ads promise "a 4D replay you can walk around" because the
   waitlist page does. `HANDOFF-platform.md` records that the 4D replay lives in **4Dcoach**, a
   separate PWA, and that the in-app MediaPipe form checker is behind a feature flag that is
   currently off. If an invited member cannot reach the thing the ad promised, that is a
   bait-and-switch under FTC Act §5 and under both platforms' misleading-content policies — quite
   apart from being the fastest way to lose an early member. Confirm the invite flow actually
   delivers it, or soften the claim.
3. **A privacy policy.** `app/` has no `privacy` or `terms` route. Both platforms expect an
   advertiser who collects emails and runs tracking pixels to disclose it, and `tracking.md` is
   about to add Google and Meta cookies to the site. A short `/privacy` page — what the email is
   for, that Google and Meta cookies are set, how to be removed, an address to write to — is a
   prerequisite, not a nicety.
4. **Advertiser identity verification** in Google Ads, and domain verification in Meta Business
   settings. Both are required, both take days rather than minutes, and both will stop ads serving
   if left until they are urgent. Start them in week one.
