# SHaiPT paid acquisition — the playbook

Everything in this folder is about **money spent to buy attention**. The organic side — the Shorts
pipeline, the channel assets, the content rules, the posting cadence, SEO content, Product Hunt —
lives in `growth/README.md`, `growth/channel/` and `growth/prompts/` and is owned by other work.
This folder deliberately does not duplicate it, and the two touch in exactly two places:

- **Assets.** `growth/prompts/content-rules.md` tags every asset `ad-safe` or `organic-only`.
  **Only `ad-safe` material may go behind spend** — see `policy-limits.md`.
- **Hooks.** Paid screens hooks against strangers; the winner goes back to organic to run for free.
  That handoff is the whole point of the Meta budget — see `meta-ads.md`.

Read this file first. Then:

| File | What it is |
|---|---|
| `google-ads.md` | The exact Search campaign: structure, keywords, negatives, ad copy at the character limits |
| `meta-ads.md` | The Instagram campaign: objective, audience, creative testing loop, kill rules |
| `tracking.md` | What to build in Google Ads, Meta Events Manager and GTM so the `waitlist` table fills in, plus the SQL |
| `policy-limits.md` | The three things that will get an ad rejected or Ali sued, and what to do instead |

---

## The situation in one paragraph

Sign-up is invite-only, so an ad cannot sell an account. It sells a place on a list. The
destination is **https://www.shaipt.com/waitlist** — a single-promise, single-field page with no
nav and no second call to action (`components/waitlist/WaitlistPage.tsx`), which writes one row
per email into the `waitlist` table with `utm_source/medium/campaign/content/term`, `referrer` and
`landing_path` (`supabase/migrations/0150_waitlist.sql`). That table is the scoreboard. Nothing in
this playbook is worth running until the UTM columns in it are actually filling in — see
`tracking.md`, and note the finding at the top of it: **there is no tag container on the site
today**, so the `waitlist_signup` dataLayer event the page already pushes currently goes nowhere.

## The budget

$400/month, all in. Tools and media together. There is no separate tools line beyond Higgsfield.

| Line | Monthly | Daily | Job |
|---|---|---|---|
| Higgsfield (AI character video) | $50 | — | Creative supply for both paid and organic |
| Google Search | **$213** | $7.00/day | Harvest the demand that already exists |
| Meta / Instagram | **$137** | $4.50/day | Find the hook, then run it free on organic |
| **Total** | **$400** | | |

Google Ads enforces a monthly cap of `daily budget × 30.4`, so $7.00/day cannot bill more than
$212.80 in a month even though it can overspend on any single day. Meta has no monthly cap — set
an **account spending limit of $140** in Billing so a runaway ad set cannot eat the month.

Everything else stays at $0 and must: Google Ads, Meta Ads Manager, Google Tag Manager, GA4,
Search Console and the Supabase SQL editor are all free. **Do not buy a keyword tool.** Google
Keyword Planner is free with an active Ads account; it returns bucketed ranges ("10–100 searches
a month") rather than exact numbers until the account has meaningful spend, and bucketed ranges
are enough to make every decision in `google-ads.md`.

### Month 1 is different

Google needs no creative — it can go live the day the account is verified. Meta needs video that
does not exist yet. So month 1: **Google $250, Meta $80, Higgsfield $50**. From month 2, the split
above. Do not start Meta until there are at least four finished hooks to test; a Meta campaign
with one video is not a test, it is a donation.

## What each channel is for

**Google Search harvests. It does not create.** Nobody searches for a product category that has
not occurred to them. What Search buys is the small number of people per month who have already
had the thought — "is there an app that checks my squat from a video?" — and are typing it. That
number is small, and it is the ceiling. Google cannot be made to produce more of those people by
spending more; it can only be made to produce worse ones, which is what Performance Max and
Display do at this budget and why `google-ads.md` warns off both.

**Meta/Instagram is a creative laboratory that happens to also send traffic.** $4.50/day will
never build a business. What it does buy, reliably and fast, is an answer to *which first three
seconds make a stranger stop scrolling*. That answer is worth far more than the clicks, because
once a hook is proven it runs **free** on @shaiptofficial forever. Paid is where hooks are
screened; organic is where the winner is exploited.

## The honest arithmetic

Every number below is an **estimate** with a range. None of it is measured for SHaiPT yet —
after 30 days of real spend, replace these with the numbers out of `tracking.md`'s SQL.

**Step 1 — cost per waitlist signup.**

| Channel | CPC (est.) | Landing-page conversion (est.) | Cost per signup (est.) |
|---|---|---|---|
| Google Search, long-tail | $0.60–$2.50 | 8–18% (high intent, one-field page) | **$8–$25** |
| Meta / Instagram, cold | $0.80–$3.00 | 3–8% (cold social) | **$15–$45** |

The Google range assumes the long-tail terms in `google-ads.md`. The head term "AI personal
trainer" is a different market — estimate $3–$8 a click, contested by funded apps — and this
playbook does not bid on it.

**Step 2 — signup to activated member.** Not everyone on the list takes the invite. Assume
**40–70%** convert to an activated account once invited. There is no SHaiPT data for this yet;
it is the single number most worth measuring early, because it moves everything downstream.

**Step 3 — cost per activated member: $20–$45.** Roughly the signup cost divided by that rate,
blended across both channels.

**Step 4 — what $350/month actually buys.**

| If cost per activated member is… | Members per month |
|---|---|
| $20 (good) | 17–18 |
| $30 (likely) | ~12 |
| $45 (bad) | ~8 |

**Plan around 12 a month. Eight on a bad month, eighteen on a good one.** Anyone quoting 20 is
quoting the best case as if it were the forecast.

**Step 5 — the part that matters.** 1,000 members at 12 a month is **83 months**. At the
optimistic 18 it is 55 months. Paid acquisition on $350/month does not reach 1,000 members. It is
not close, and no amount of optimisation closes a gap that size — halving the cost per member
still leaves three years.

So the strategy is not "spend until 1,000". It is:

1. **Paid finds the hook.** 6–8 weeks of $4.50/day on Instagram screens 8–12 hooks against
   strangers. The winner goes on @shaiptofficial where distribution is free and the ceiling is
   the algorithm, not the budget.
2. **Paid harvests the existing demand.** The dozen or so people a month already searching for
   exactly this are worth having, they are the highest-intent users SHaiPT will ever get, and
   Search is the only way to reach them.
3. **Paid produces a number.** A documented, defensible cost-per-signup and cost-per-member is an
   asset when the app is sold. "We acquire members at $28, here are 400 rows with campaign
   attribution" is a sentence a buyer can underwrite. "We have 1,000 members from somewhere" is
   not.
4. **Organic carries the 1,000.** Reels using the proven hook, the long-tail SEO pages identified
   in `HANDOFF-seo.md`, a Product Hunt launch, and a referral loop out of the invite mechanic.
   Those are in `growth/README.md` and `growth/channel/` — not here.

## The Meta learning-phase problem, stated plainly

Meta's delivery system needs roughly **50 optimisation events per ad set per 7 days** to leave the
learning phase and deliver stably. At $4.50/day an ad set spends about **$31.50 a week**. Fifty
waitlist signups out of $31.50 would mean **$0.63 per signup**. That will not happen — the
estimate above is $15–$45.

This is not a tuning problem. It is arithmetic, and it does not resolve at any budget SHaiPT can
afford. The consequences are non-negotiable:

- **Do not** run the Sales or Leads objective optimising for the waitlist conversion. Every ad set
  will sit in "Learning limited" permanently, delivery will be erratic and expensive, and Meta
  will be optimising on a handful of events, which is worse than not optimising at all.
- **Do** optimise for a cheap upper-funnel event — **landing page views** — where 50 a week at
  about $0.63 each is at least plausible. Details and the exact objective in `meta-ads.md`.
- **Read conversions out of the `waitlist` table, not out of Ads Manager.** At this volume Meta's
  in-platform conversion reporting will be noise. The database is the truth.

Google has the same disease in a milder form: Maximize Conversions and Target CPA want roughly
15–30 conversions in 30 days before they bid sensibly. SHaiPT will have single digits. So Google
starts on **Maximize Clicks with a max-CPC cap**, and only moves to a conversion-based strategy if
the conversion count ever justifies it. It probably will not, and that is fine.

## The weekly ritual — 20 minutes, Mondays

1. Run the three queries at the bottom of `tracking.md`. Signups by source, by campaign, by ad.
2. Google: open the **Search terms report**, add anything irrelevant to the negative list. This is
   the single highest-value 5 minutes in the whole playbook at this budget — one bad search term
   matching repeatedly can eat a fifth of the month.
3. Meta: check hook rate and hold rate on the live ads against the kill rules in `meta-ads.md`.
   Kill what is dead. Ship the next hook.
4. Write the month's spend into the spend CTE in `tracking.md` so the cost-per-signup query stays
   honest.

## When to stop

Set these now, while it is still cheap to be objective about them.

- **After 30 days**, if Google has spent under $50 because the keywords have no volume: that is
  the ceiling on existing demand, it is information, and it is not a failure. Keep the campaign
  running at $3/day as a permanent cheap harvester and move the rest to Meta.
- **After 60 days**, if blended cost per waitlist signup is over **$40**: pause Meta, keep Google
  brand + the two best ad groups at $3–4/day, and put the effort into organic. Paid is not going
  to work at this budget and more months will not change that.
- **After 90 days**, if a hook has been found that beats the others by 2x on hook rate: that is
  the win condition. The paid job is done. Cut paid to the $3/day harvester and spend the saved
  $250/month on whatever makes more of that hook.
