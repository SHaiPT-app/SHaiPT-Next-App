# Google Ads — Search only

Budget: **$7.00/day**, monthly cap ~$213. One campaign. Five ad groups. Destination is
`https://www.shaipt.com/waitlist` for every ad.

---

## Before anything: Search only. Not Performance Max. Not Display.

Google's campaign-creation flow will push both at you, twice. Refuse both, and know why.

**Performance Max.** PMax is a bidding system wearing a campaign's clothes: it spreads one budget
across Search, Display, YouTube, Discover, Gmail and Maps, and decides the split by learning from
your conversion data. SHaiPT will produce single-digit conversions a month. There is nothing to
learn from, so PMax falls back to the cheapest inventory it can find — Display and Discover
placements where a waitlist ad converts at a small fraction of a Search click. It also gives you
almost no steering: no keyword-level control, heavily summarised search-term reporting, and
targeting expressed as "audience signals" that the system is free to ignore. Google has been
adding negative-keyword support to PMax over the last couple of years and I am not certain of
exactly what is available in the interface today — **check before relying on it** — but even at
its best, PMax is the worst possible container for SHaiPT's specific problem, which is a brand
name that collides with two unrelated high-volume things (see the negatives below). At $7/day the
whole month can disappear into "shqiptare" traffic before anyone notices.

**Display.** The Display Network is opted *in by default* inside the standard Search campaign
creation flow. Untick it. Display clicks on a fitness offer are dominated by accidental taps in
mobile apps and games; expect conversion rates one to two orders of magnitude below Search. At
$7/day a single day of Display can consume a week of useful Search budget.

**Search partners.** Leave off initially — not because partner traffic is bad, but because at this
volume you want one clean signal, and partner performance is reported separately and can only be
turned on or off, never tuned. Revisit after 60 days if Search alone is under-spending.

**Video / Demand Gen.** No. Those are creative-led channels and Instagram is the cheaper place to
test creative.

---

## Campaign settings

| Setting | Value | Why |
|---|---|---|
| Campaign name | `SHaiPT \| Search \| Waitlist \| US` | Pipes read well in reports; no spaces in the UTM value (see `tracking.md`) |
| Goal | Create without a goal's guidance | The goal-led flows enable PMax-ish defaults |
| Type | **Search** | |
| Networks | Google Search **only**. Display **off**. Search partners **off**. | Above |
| Budget | **$7.00/day** | Monthly cap $212.80 |
| Bidding | **Maximize clicks**, max CPC bid limit **$1.80** | Conversion-based bidding needs ~15–30 conv/30 days; SHaiPT will have single digits. The cap is what stops Maximize Clicks buying junk at $6 a click. |
| Locations | **United States** | Start here. If US CPCs come back above ~$2.50, add or switch to UK / Canada / Australia — same language, usually cheaper. |
| Location option | **Presence: people in your targeted locations** | The default ("presence or interest") serves your ad to people *reading about* the US. Change it. |
| Languages | English | |
| Ad rotation | Optimize | RSAs handle rotation internally |
| Ad schedule | All days | Volume is far too low to justify dayparting |
| Devices | All, no bid adjustment | The product *is* a phone camera; mobile is the point |
| Dynamic Search Ads | **Off** | It would crawl the whole site and write its own headlines |
| Auto-applied recommendations | **Turn all of them off** | Settings → Recommendations → Auto-apply. Google will otherwise add broad-match keywords and "optimised" ad variants without asking. At $7/day this is the difference between a controlled test and a mess. |

Two account-level chores Google will nag about, both genuinely required:

1. **Advertiser identity verification.** Google requires it; ads can be suspended if it is not
   completed inside the window Google gives you. Do it in the first week.
2. **Billing.** Set it up before building the campaign, or the campaign sits unable to serve.

---

## Ad group structure

Five ad groups, one theme each, so the ad copy can actually match the query. Every keyword is
**phrase** or **exact** — no broad match. Broad match without smart bidding is a licence to spend,
and broad match *with* smart bidding needs conversion volume SHaiPT does not have.

Notation: `[exact match]`, `"phrase match"`.

### AG1 — Form check app
The core of `HANDOFF-seo.md`'s winnable tail. Highest intent in the account.

```
[ai form check app]
[form check app]
[lifting form check app]
[squat form check app]
[bench press form check app]
[deadlift form check app]
"ai form check"
"lifting form check app"
"weightlifting form check app"
"gym form check app"
"workout form checker"
"app to check my lifting form"
```

### AG2 — Phone camera form analysis
The "no special hardware" angle, expressed as the query people actually type.

```
[phone camera squat form analysis]
[squat form analysis app]
[barbell form analysis app]
"check my squat form with my phone"
"app that analyses lifting form from video"
"analyze lifting form from video"
"video analysis app for lifting"
"record my lift and check form"
"form analysis from phone video"
```

Note both spellings — `analyse` and `analyze`. Phrase match does not reliably bridge
British/American spelling; include both rather than assume.

### AG3 — AI personal trainer, no wearable
The differentiator `HANDOFF-seo.md` named. Lower volume, very high intent when it fires.

```
[ai personal trainer no wearable]
"ai personal trainer without a watch"
"ai personal trainer no smartwatch"
"ai fitness coach no wearable"
"personal trainer app without a smartwatch"
"ai gym coach without wearable"
"train without a wearable"
```

Note what is **not** here: `[ai personal trainer]` and `"ai personal trainer app"`. Those are the
head terms `HANDOFF-seo.md` identified as contested by Dr. Muscle, Gymfitty, Trainerize and Shape
AI. Estimated $3–$8 a click against funded competitors bidding for accounts, not waitlist rows.
At $7/day that is one click a day. Do not bid on them.

### AG4 — 4D replay and bar path
The most differentiated language SHaiPT owns and the lowest volume in the account. Keep it —
these clicks are cheap and the people typing them are exactly the audience.

```
[4d lift replay]
[bar path tracker app]
"4d form check"
"3d replay of my lift"
"3d lifting analysis app"
"markerless motion capture lifting"
"motion capture gym app"
"barbell path tracking app"
"bar path analysis app"
```

### AG5 — Brand
Cheap, defensive, and the cleanup crew for everything organic drives.

```
[shaipt]
[shaipt app]
[shaipt ai]
[shaipt waitlist]
[shaipt ai trainer]
"shaipt"
```

Brand clicks should come in well under $0.50. This ad group exists for three reasons: it catches
people who saw a Reel and half-remembered the name; it keeps a competitor from buying the term
later; and — the SHaiPT-specific one — it is the only place in the account where you *want* to
show up against a query containing "shaip", so it needs its own tighter negative list (below).

**A separate competitor ad group ("Dr. Muscle alternative" and so on) is not worth it at $7/day.**
It fragments a tiny budget, competitor terms are usually more expensive than the long tail, and
you cannot use a competitor's trademark in the ad text, so the ad that *does* show is weak. Skip
it; revisit only if the long-tail ad groups are consistently unable to spend.

---

## Negative keywords

Create **one shared negative keyword list** ("SHaiPT — global") applied to the whole campaign, and
a **second, smaller list applied only to AG5** (because AG5 legitimately wants "shaipt" queries
and must not be starved by the brand-confusion negatives).

### List A — "SHaiPT global" (apply to the campaign)

**Brand collision — Shaip, the AI training-data company.** This is the expensive one. The
misspelling traffic is real, it is commercially valuable to *them* so CPCs are high, and none of
it will ever join a fitness waitlist.

```
"shaip"
"shaip ai"
"shaip data"
"shaip com"
"training data"
"data annotation"
"data labeling"
"data labelling"
"data collection services"
"speech data"
"transcription services"
"annotation services"
```

**Albanian-language collision — "shqiptare" / "shaiptare".** `HANDOFF-seo.md` flagged this on the
organic side; it is worse on paid, because you pay per impression-click rather than just losing a
ranking.

```
"shqip"
"shqiptare"
"shaiptare"
"shqipe"
"shqiperia"
"shqiperi"
"kosove"
"kosova"
"albanian"
"albania"
"muzika"
"tv shqip"
```

**Wrong sense of "form".** "Form check" collides with paperwork and with sports form tables.

```
"google form"
"google forms"
"order form"
"claim form"
"consent form"
"tax form"
"irs"
"w2"
"w9"
"1099"
"horse racing"
"betting"
"team form"
"premier league"
```

**Adjacent movement-analysis markets SHaiPT does not serve.** These will match "form analysis app"
and they are not the customer.

```
"golf swing"
"golf"
"tennis"
"swimming"
"running gait"
"gait analysis"
"pitching"
"baseball"
"dance"
"yoga"
"pilates"
"physical therapy"
"physiotherapy"
"rehab"
```

**Careers, courses and certification.** Very high volume on "personal trainer"; zero intent.

```
"job"
"jobs"
"salary"
"hiring"
"career"
"certification"
"certified"
"course"
"courses"
"how to become"
"become a personal trainer"
"nasm"
"issa"
"ace certification"
"cpt exam"
"diploma"
"apprenticeship"
```

**Free / pirated / research intent.**

```
"free download"
"for free"
"apk"
"mod apk"
"crack"
"cracked"
"torrent"
"full version"
"chatgpt prompt"
"prompt for"
"reddit"
"is it worth it"
```

A judgement call worth stating rather than hiding: **"reviews" is not on this list.** Someone
searching "ai form check app reviews" is comparison-shopping and is a genuinely good click. Leave
it in and watch the search terms report; negative it only if it proves otherwise.

**"near me" is on the list in spirit** — add `"near me"` and `"personal trainer near me"` as phrase
negatives. SHaiPT is a web app, not a local service, and local-intent clicks never convert.

### List B — "Brand group only" (apply to AG5 only)

AG5 must be allowed to serve on "shaipt" queries, so List A's `"shaip"` negative would kill it.
Instead, in AG5 use only the tight disambiguators:

```
"shaip ai"
"shaip data"
"training data"
"annotation"
"shqiptare"
"shaiptare"
"shqip"
```

and set AG5's keywords to exact/phrase on `shaipt` spellings only, as listed above.

### The maintenance job that actually matters

**Open the Search terms report every Monday.** Every negative list written in advance is a guess;
the search terms report is evidence. At $7/day, a single unnoticed junk term matching four times a
week is 20% of the month. Five minutes, weekly, non-negotiable.

---

## The volume warning — read this before judging the campaign

These are long-tail terms. That is the point — `HANDOFF-seo.md` chose them precisely because they
are winnable and undefended — but the same property that makes them winnable makes them low
volume. Expect all of the following, and none of them is a failure:

- **Many keywords will show status "Low search volume" and will not serve at all.** Google
  suppresses keywords with very little search history; it re-checks periodically and they start
  serving if volume appears. Do not delete them, do not replace them with broader terms. A
  suppressed keyword costs nothing.
- **Daily spend will likely land at $2–$5, not $7.** The budget is a ceiling, not a target.
  Google literally cannot spend money on searches nobody is performing.
- **Under-spending is the honest answer to "how much demand exists right now".** It is the most
  useful thing this campaign will tell you, and it is the single strongest argument for the
  organic-first plan in `README.md`. The correct response is *not* to loosen match types or add
  head terms to force the spend out. That converts a cheap accurate answer into an expensive
  wrong one.
- **Impression share will look terrible, and it does not matter.** Ignore "lost IS (budget)" at
  this scale; what matters is cost per signup in the `waitlist` table.

If after 30 days total spend is under $50, follow the "when to stop" rule in `README.md`: drop
Google to $3/day as a permanent harvester and move the money to Meta.

---

## Responsive search ads

One RSA per ad group. Character counts below were **measured, not estimated** — every string was
checked against the limits (headline ≤30, description ≤90, path ≤15).

Settings for all five:
- **Final URL**: `https://www.shaipt.com/waitlist`
- **Display path**: `early-access` / `form-check` (12 and 10 characters)
- **Pinning**: pin at most **one** headline, to position 1, and only in AG5 (brand). Pinning more
  collapses the number of combinations Google can test, which at low volume means it never learns
  anything. Everywhere else, leave all headlines unpinned.

> One note on the copy: it claims only what `components/waitlist/WaitlistPage.tsx` already claims
> on the page — reps, tempo, a technique score, a 4D replay, no wearables. Ad copy that promises
> more than the landing page delivers is both a policy problem and a conversion problem. See
> `policy-limits.md` for the two claims that need checking before they go live.

### AG1 — Form check app

Headlines (15):

| # | Headline | Chars |
|---|---|---|
| 1 | AI Form Check From One Video | 28 |
| 2 | Lifting Form Check App | 22 |
| 3 | Film One Set. Get A Score. | 26 |
| 4 | Your Phone Is The Form Check | 28 |
| 5 | Reps, Tempo, Technique Score | 28 |
| 6 | Squat, Bench And Deadlift | 25 |
| 7 | No Wearables. No Sensors. | 25 |
| 8 | Form Check In 4D | 16 |
| 9 | Technique Score In Plain Words | 30 |
| 10 | 870+ Exercises Covered | 22 |
| 11 | Early Access Waitlist | 21 |
| 12 | See What Your Reps Miss | 23 |
| 13 | Built For People Who Lift | 25 |
| 14 | SHaiPT Form Check | 17 |
| 15 | Join The Early Access List | 26 |

Headline 9 is exactly at the 30-character limit. If the editor complains about a trailing space
or you want headroom, use **"Technique Score In Words"** (24) instead.

Descriptions (4):

| # | Description | Chars |
|---|---|---|
| 1 | Film one set on your phone. Get reps, tempo and a technique score you can read. | 79 |
| 2 | No wearables, no gym sensors, no trainer. One phone camera and a 4D replay of your lift. | 88 |
| 3 | Invite-only early access. Join the waitlist and we email you when a place opens. | 80 |
| 4 | Walk around your own rep in 4D and see exactly where the bar path drifts. | 73 |

### AG2 — Phone camera form analysis

| # | Headline | Chars |
|---|---|---|
| 1 | Check Your Form With A Phone | 28 |
| 2 | Squat Form Analysis App | 23 |
| 3 | Film It. SHaiPT Scores It. | 26 |
| 4 | Phone Camera Form Analysis | 26 |
| 5 | Video Form Check, No Kit | 24 |
| 6 | One Camera. The Whole Lift. | 27 |
| 7 | Analyse Your Lift On Video | 26 |
| 8 | No Sensors, No Smartwatch | 25 |
| 9 | Bar Path You Can Actually See | 29 |
| 10 | Reps And Tempo, Counted | 23 |
| 11 | Early Access Waitlist | 21 |
| 12 | SHaiPT Form Analysis | 20 |

| # | Description | Chars |
|---|---|---|
| 1 | Point a phone at your set. SHaiPT returns reps, tempo and a technique score. | 76 |
| 2 | Works with the camera you already own. No wearable, no gym sensor, no tripod rig. | 81 |
| 3 | A 4D replay you can walk around, so you can see the rep from any angle. | 71 |
| 4 | Invite-only while we scale. Join the waitlist and we email you when a place opens. | 82 |

### AG3 — AI personal trainer, no wearable

| # | Headline | Chars |
|---|---|---|
| 1 | AI Trainer, No Wearable | 23 |
| 2 | No Watch. No Strap. No Ring. | 28 |
| 3 | AI Personal Trainer By Video | 28 |
| 4 | Your Camera Is The Sensor | 25 |
| 5 | Train Without A Wearable | 24 |
| 6 | AI Coaching From One Set | 24 |
| 7 | Plans, Macros And Form | 22 |
| 8 | An AI Trainer That Watches | 26 |
| 9 | Early Access Waitlist | 21 |
| 10 | SHaiPT AI Personal Trainer | 26 |
| 11 | No Hardware To Buy | 18 |
| 12 | Coaching From Your Camera | 25 |

| # | Description | Chars |
|---|---|---|
| 1 | An AI personal trainer that watches the lift instead of reading a wrist sensor. | 79 |
| 2 | No smartwatch, no chest strap, no ring. One phone camera is the whole setup. | 76 |
| 3 | Plans, macro targets and a technique score on every set you film. | 65 |
| 4 | Invite-only early access. Join the waitlist and we email you when a place opens. | 80 |

### AG4 — 4D replay and bar path

| # | Headline | Chars |
|---|---|---|
| 1 | 4D Replay Of Your Lift | 22 |
| 2 | Walk Around Your Own Rep | 24 |
| 3 | Markerless Motion Capture | 25 |
| 4 | Bar Path From A Phone | 21 |
| 5 | 3D Lift Replay, No Suit | 23 |
| 6 | Film One Set. See It In 4D. | 27 |
| 7 | Motion Capture, No Markers | 26 |
| 8 | Every Angle Of Every Rep | 24 |
| 9 | Early Access Waitlist | 21 |
| 10 | SHaiPT 4D Form Check | 20 |
| 11 | Tempo, Depth, Bar Path | 22 |
| 12 | No Mocap Suit Required | 22 |

| # | Description | Chars |
|---|---|---|
| 1 | Film one set and get a 4D replay you can rotate, scrub and watch from any angle. | 80 |
| 2 | Markerless capture from a single phone camera. No suit, no markers, no lab. | 75 |
| 3 | Bar path, depth and tempo measured from ordinary video of your own set. | 71 |
| 4 | Invite-only early access. Join the waitlist and we email you when a place opens. | 80 |

### AG5 — Brand

Pin headline 1 to position 1 here (and only here), so a brand search always sees the brand name
first and the "am I in the right place" question is answered instantly.

| # | Headline | Chars |
|---|---|---|
| 1 | SHaiPT - Official Site **(pin to position 1)** | 22 |
| 2 | SHaiPT AI Personal Trainer | 26 |
| 3 | SHaiPT Early Access | 19 |
| 4 | Join The SHaiPT Waitlist | 24 |
| 5 | SHaiPT Form Check App | 21 |
| 6 | SHaiPT: Film One Set | 20 |
| 7 | SHaiPT 4D Form Check | 20 |
| 8 | Request Access To SHaiPT | 24 |
| 9 | shaipt.com Early Access | 23 |
| 10 | Your Lift, Scored | 17 |

| # | Description | Chars |
|---|---|---|
| 1 | SHaiPT scores your lift from one phone video. Join the invite-only waitlist. | 76 |
| 2 | The official SHaiPT waitlist. Reps, tempo and a technique score from one set. | 77 |
| 3 | Early access to SHaiPT: 4D form check, AI plans, no wearables required. | 71 |
| 4 | One email when your place opens. No newsletter, no digest. | 58 |

---

## Assets (extensions)

Add these at campaign level. They are free real estate — they raise click-through rate without
raising cost per click, and at this budget every free improvement matters.

**Callouts** (≤25 chars each, add all eight):

| Callout | Chars |
|---|---|
| No Wearables Needed | 19 |
| 870+ Exercises | 14 |
| One Phone Camera | 16 |
| Invite-Only Access | 18 |
| 4D Lift Replay | 14 |
| Reps And Tempo Counted | 22 |
| No Gym Sensors | 14 |
| Works On Any Phone | 18 |

**Structured snippet**, header "Features" (≤25 chars each):
`4D lift replay` (14) · `Technique score` (15) · `Rep and tempo count` (19) ·
`AI training plans` (17) · `Macro targets` (13) · `876-exercise library` (20)

**Sitelinks: skip them, at least at first.** Sitelinks require *distinct* landing pages, and the
only other public pages are `/` and `/login`. The waitlist page was deliberately built with no way
out except the form (`components/waitlist/WaitlistPage.tsx`) precisely so a paid click cannot
wander off to the landing page and vanish. A sitelink to `/` reintroduces exactly that leak. If
and when the SEO content pages in `HANDOFF-seo.md` workstream B exist (`/form-check`,
`/ai-personal-trainer`), revisit — they would make good sitelinks.

**Do not add** a call asset (there is no phone line), a location asset (there is no location), a
price asset (the waitlist is free and the app's tiers are not what the ad is selling), or an
image asset (images in Search ads pull toward the Display-ish inventory you are trying to avoid).

---

## Build order

1. Billing, then advertiser identity verification.
2. Conversion action `Waitlist Signup` — build it **before** the campaign, so the campaign can be
   attached to it from day one. Full instructions in `tracking.md`.
3. Turn off auto-applied recommendations (Recommendations → Auto-apply → untick everything).
4. Build the two shared negative lists first, then the campaign, then attach them.
5. Campaign with settings above, Display and Search partners off.
6. Five ad groups, keywords in exact/phrase only.
7. One RSA per ad group. Callouts and the structured snippet at campaign level.
8. Ad-group-level **Final URL suffix** for UTM tagging — `tracking.md` explains why that field
   and not the tracking template.
9. Launch. Check the search terms report on day 3, then every Monday.
