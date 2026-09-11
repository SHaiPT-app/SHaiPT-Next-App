# Meta / Instagram — the creative laboratory

Budget: **$4.50/day**, ~$137/month. One campaign. One ad set. Two ads live at a time.

The job of this channel is **not** to acquire members. It is to find out, cheaply and in a few
weeks, which first three seconds make a stranger stop scrolling — so that hook can then run for
free on @shaiptofficial, where distribution costs nothing and the ceiling is the algorithm rather
than the budget. Read the learning-phase section of `README.md` before changing any setting here;
most of the choices below are forced by that arithmetic.

---

## Prerequisites

1. **Business portfolio (Business Manager)**, an **ad account**, and the Instagram professional
   account **@shaiptofficial** connected to it. Historically Ads Manager also required a linked
   Facebook Page; Meta has been loosening that for Instagram-only advertisers and I am not certain
   what the current flow requires — if Ads Manager asks for a Page, create a bare one for SHaiPT
   rather than fighting it.
2. **Meta Pixel** created and firing, with a `Lead` event on the waitlist submit. `tracking.md`.
3. **Billing**, and an **account spending limit of $140** (Billing → Payment settings → Account
   spending limit). New ad accounts also carry their own low initial spend cap that rises with
   payment history; it will not bite at $4.50/day.
4. Expect **24 hours in review** on the first ads, and occasionally on a re-edit.

---

## Campaign settings

| Setting | Value | Why |
|---|---|---|
| Objective | **Traffic** | See below — this is the single most important choice on the page |
| Special ad category | **None** | Special ad categories are credit, employment, housing and social issues / elections. Fitness is not one. (Weight-loss *content rules* still apply — `policy-limits.md`.) |
| Buying type | Auction | |
| Campaign budget optimisation | **Off** | One ad set; CBO adds nothing but opacity |
| Campaign name | `ig-hooks` | No spaces — it goes into a UTM (`tracking.md`) |

### Ad set

| Setting | Value | Why |
|---|---|---|
| Ad set name | `broad-us-18-45` | |
| Conversion location | **Website** | |
| Performance goal | **Maximise number of landing page views** | The whole argument, below |
| Budget | **$4.50/day**, daily (not lifetime) | |
| Schedule | Run continuously | |
| Location | United States | Match Google so the two channels are comparable |
| Age | **18–45** | 18 is a floor, not a preference: Meta requires 18+ targeting for weight-loss and some health/appearance products, and this is adjacent enough that starting at 18 avoids the argument |
| Gender | All | |
| Detailed targeting | **None. Broad.** | Below |
| Advantage+ audience | Fine to leave on with **no** audience suggestions | |
| Placements | **Manual** — see the list below | |
| Attribution setting | 7-day click, 1-day view (default) | Do not read Meta's conversion numbers anyway; the `waitlist` table is the truth |

### Why "landing page views" and not conversions

Meta's delivery system wants roughly **50 optimisation events per ad set per 7 days** to exit the
learning phase. At $4.50/day an ad set spends about **$31.50 a week**.

- Optimising for the waitlist signup would require 50 signups from $31.50 — **$0.63 each**. The
  estimate in `README.md` is $15–$45. It will never leave learning, delivery will be erratic and
  expensive, and Meta will be trying to optimise on two or three events, which is worse than not
  optimising.
- Optimising for **landing page views** requires 50 LPVs from $31.50 — **$0.63 each**. That is at
  the aggressive end of plausible (LPVs typically run maybe $0.30–$1.50 in this kind of market —
  an estimate) but it is the same order of magnitude, which is the difference between "tight" and
  "impossible". Some weeks it will clear the threshold, some weeks it will not. That is the best
  available option, not a good one.
- **Link clicks** is the fallback if LPV cost comes back above ~$1.00 after two weeks. Cheaper
  event, more events, but it counts clicks that bounce before the page loads — so the numbers
  flatter and mean less.
- **ThruPlay** (Engagement objective) would clear 50/week trivially at a few cents an event, but
  it sends nobody to the site. Use it only if the goal for a given round is *purely* creative
  measurement with no traffic — which it should not be, because the `waitlist` table is how
  conversions get counted.

**Read conversions out of Postgres, not out of Ads Manager.** At this volume Meta's conversion
column is noise. The pixel exists so Meta's *delivery* has a signal and so the numbers can be
sanity-checked, not so it can be reported from.

### Why broad, with no interest targeting

The instinct at a small budget is to narrow — "powerlifters", "gym-goers", "Strong app". Resist
it. Narrow audiences at tiny budgets are the worst of both worlds: you compete against much larger
advertisers for a small pool, which raises CPM; you get fewer impressions per dollar, which is
exactly the resource this test is short of; and you pre-decide the answer to a question the
creative is supposed to answer. Broad plus a strong hook is both cheaper per impression and a
fairer test — the hook *is* the targeting.

### Placements — manual, Instagram only

Select:

- Instagram **Reels**
- Instagram **Stories**
- Instagram **Feed**
- Instagram **Explore** and **Explore home**

Exclude everything else: Audience Network (junk clicks and accidental taps), Messenger, Facebook
Feed, Facebook right column, in-stream video, Search results, Business Explore.

The honest trade-off: restricting placements raises CPM, plausibly 10–40% versus Advantage+
placements (an estimate). You pay it on purpose. The point of the test is to predict how a hook
will perform **on Instagram organically**, and a hook validated on Facebook Feed or Audience
Network predicts nothing about Reels. Same surface, same format, same read.

If after two rounds the impression volume is too thin to judge anything (under ~1,000 impressions
per ad in a week), add **Facebook Reels** as a cheap volume supplement and read it as a separate
line rather than blending it in.

---

## The creative format

Every ad, without exception:

- **9:16 vertical**, 1080×1920.
- **15–25 seconds.** Longer does not get watched at this budget; shorter cannot land a proof.
- **The first 3 seconds is the hook and is the only thing being tested.** Body and end card stay
  identical across a round so the comparison is clean.
- **Burned-in captions.** Sound is off by default. An ad that needs audio is an ad that is not
  being watched.
- **End card, 2 seconds**: brand red `#DA0023` on coal black `#08080C`, "Early access —
  shaipt.com/waitlist". Matches the waitlist page so the ad and the destination read as one
  company.
- **The strongest asset SHaiPT owns is a screen recording of the 4D replay.** It is unfakeable,
  it is 100% owned, it needs no licence and no model release, and it shows the product rather
  than claiming things about it. Use it in most hooks.
- **Higgsfield's AI character** ($50/month line) hosts and demonstrates. It never claims to be a
  customer and never reports a result. `policy-limits.md` §(b) — this one is a legal line, not a
  style preference.
- **Ali can appear.** Ali consents to their own likeness. Ali's own lifts, filmed by Ali, are the
  cheapest clean footage available and side-step the entire §(a) problem.

### Ad copy

Primary text (the caption). Mobile truncates at roughly 125 characters before "… more", so the
whole promise must land before that — all four below are under 100:

| Primary text | Chars |
|---|---|
| Film one set. Get reps, tempo and a technique score in plain words. No wearables, no gym sensors. | 97 |
| Your phone already has the only sensor you need. Early access to SHaiPT is open — join the list. | 96 |
| A 4D replay of your own rep, from any angle. Invite-only early access, one email when it opens. | 95 |
| Nobody is watching your third rep. Your camera can. SHaiPT early access is open. | 80 |

Headline (shown on some placements, roughly 40 characters visible):

| Headline | Chars |
|---|---|
| Your lift, scored by your phone | 31 |
| Early access to SHaiPT | 22 |
| Film one set. See everything. | 29 |
| AI form check, no wearables | 27 |

Description (Feed only, keep under ~30): `Invite-only early access` (24) · `Join the waitlist`
(17) · `One phone camera` (16)

**Call to action button: "Sign Up".** "Learn More" gets more clicks; "Sign Up" gets better ones.
At $4.50/day, pre-qualification is worth more than click volume, because the scarce resource is
signups, not traffic.

**Destination:** `https://www.shaipt.com/waitlist` with the URL parameters from `tracking.md`.

---

## The hook backlog

Eight to twelve hooks, screened two at a time. These are concepts, not scripts — the first three
seconds only.

**Every ad must be built from `ad-safe` assets only.** The organic pipeline tags each asset
`ad-safe` or `organic-only` in `growth/assets/registry.json` and a video inherits the most
restrictive tag in it (`growth/prompts/content-rules.md`). A technique breakdown of a famous
lifter is `organic-only` and can never go behind spend — not as a new ad, and not by pressing
Boost on the organic post. Every hook below is `ad-safe` by construction: no third-party people,
no AI character claiming to be a customer, no body before/after. See `policy-limits.md`.

The organic pipeline also has a 0–20 hook rubric (`growth/prompts/hook-rubric.md`) that gates what
gets *made*. It and this section are complementary, not competing: the rubric is a judgement made
before filming, this is a measurement made afterwards with $31.50 of strangers' attention. A hook
that scores well and then posts a 12% hook rate here is the rubric being wrong, and that is
precisely the feedback this channel exists to produce.

| # | Hook (first 3 seconds) | Asset | Angle |
|---|---|---|---|
| 1 | Bar-path line draws itself over a squat, no words | Screen recording | Curiosity / mechanism |
| 2 | "Your third rep breaks down before you feel it" over rep 3 of a set | Screen recording | Problem |
| 3 | Technique score counts up and stops at a mediocre number | Screen recording | Tension |
| 4 | Phone propped against a water bottle, set starts | Ali's own footage | "That's the whole setup" |
| 5 | "You don't need a $400 watch. You need a camera." | AI character | Cost / objection |
| 6 | The 4D replay rotating around a single rep | Screen recording | Spectacle |
| 7 | "Three things a trainer would have said about that rep" | Screen recording of the coach text | Value |
| 8 | Same lift twice, one cue applied, technique score 62 → 84 | Screen recording | Proof — **technique**, never body |
| 9 | "No wearables. No gym sensors. No trainer." — the page's own line | AI character | Positioning |
| 10 | Empty gym, phone set down, "nobody's watching your form" | Ali's own footage | Problem, capability-framed |
| 11 | "876 exercises. One camera." | Type-only motion | Scale — **verify the number first** |
| 12 | Rep counter ticking over a set, then tempo, then the score | Screen recording | Mechanism |

---

## The testing loop

### Round shape

- **7 days per round. Two ads live.** Same ad set, same body, same end card, different first 3s.
- Do the arithmetic so the expectations are right: $4.50 × 7 = **$31.50 a round**. At an estimated
  Instagram Reels CPM of $10–$20 in the US that is **1,600–3,200 impressions a round**, split
  unevenly between the two ads because Meta will favour one early. Call it 600–2,000 impressions
  per ad.
- **That is enough to read hook rate. It is not enough to read conversion rate.** A 3-second-play
  rate computed over several hundred plays is stable to within a few points. A signup rate
  computed over one or two signups is meaningless. So: judge creative on attention metrics weekly;
  judge conversions monthly, in aggregate, out of the database.
- Two ads per round, twelve hooks → **six rounds, six weeks**, then a seventh round running the
  two best head to head. Do not run four ads at once to go faster: Meta will concentrate delivery
  on one or two anyway, and the rest get 200 impressions and no verdict.

### Naming, so the data is readable

Ad name **is** the `utm_content` value (`tracking.md` maps it), so name ads the way you want to
read the SQL. No spaces:

```
campaign:  ig-hooks
ad set:    broad-us-18-45
ads:       h01-bar-path-draws
           h02-third-rep-breaks
           h03-score-counts-up
           ...
```

Then `select utm_content, count(*) from waitlist group by 1` is a hook leaderboard.

### The four metrics

Build these as a saved column set in Ads Manager (Columns → Customise):

| Metric | How | What it answers |
|---|---|---|
| **Hook rate** | 3-second video plays ÷ impressions | Did the first frame stop the scroll? |
| **Hold rate** | ThruPlays ÷ impressions | Did the middle keep them? |
| **Outbound CTR** | Outbound clicks ÷ impressions — *not* "CTR (all)", which counts likes and caption expands | Did curiosity become intent? |
| **Cost per landing page view** | Meta reports it directly | What the traffic actually costs |

Meta has renamed the video metrics more than once ("3-second video plays", "Video plays at 3
seconds"); take whichever exists in the column picker. ThruPlay means played to completion for
videos under 15 seconds, or at least 15 seconds for longer ones — which is why the 15–25 second
format above matters: it keeps ThruPlay meaning the same thing across every ad.

### Kill rules

Apply only after an ad has **≥1,000 impressions**. Below that, the numbers move too much to act
on, and acting on them is how a good hook gets killed by noise.

| Symptom | Verdict | Action |
|---|---|---|
| Hook rate < 15% | Dead | Kill. The opening frame is invisible. |
| Hook rate 15–25% | Weak | Kill at end of round, do not extend. |
| Hook rate > 25% | Alive | Keep for the head-to-head round. |
| Hook rate good, hold rate < 8% | Hook works, body does not | Keep the hook. Recut the body shorter and re-test as a new ad. |
| Hook and hold fine, outbound CTR < 0.4% | Attention without intent | Keep the video. Change the end card and CTA, not the hook. |
| Cost per LPV more than 2× the round's best | Dead | Kill regardless of everything above. |

**These thresholds are rules of thumb from short-form video generally, not measurements of
SHaiPT.** Use them for round 1 and then throw them away: from round 2 onwards judge **relatively**
— best versus worst inside the same round, same week, same auction conditions. Relative
comparisons within a round are the only thing this budget measures reliably.

### What not to worry about

- **Frequency.** The audience is enormous and the budget is tiny; frequency will sit near 1.
  Creative fatigue is not the constraint. Rotate creative to learn, not to refresh.
- **"Learning limited".** The ad set will show it much of the time. It is expected and already
  priced into the plan. Do not respond by raising the budget or widening the event.
- **Meta's reported cost per result versus the database.** They will disagree. The database wins.

### Winning

The point of all of it is one sentence: **the hook that wins goes on @shaiptofficial.** A proven
opening three seconds, posted organically, costs nothing and has no budget ceiling. That is the
return on this $137/month — not the dozen signups it buys, but the removal of guesswork from every
organic post that follows.

Where those organic posts go and how often is `growth/README.md` and `growth/channel/`, which are
owned elsewhere. Hand the winning hook over; do not re-plan the organic calendar here.
