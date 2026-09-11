# Tracking — wiring the ads to the `waitlist` table

Do this **before** spending a dollar. An untracked campaign is a donation.

---

## Finding first: nothing is wired up yet

`components/waitlist/WaitlistPage.tsx` pushes a `waitlist_signup` event on success:

```ts
w.dataLayer = w.dataLayer ?? [];
w.dataLayer.push({ event: 'waitlist_signup', utm_campaign: ... });
```

That is correct and useful — **and it currently goes nowhere.** There is no Google Tag Manager
container, no `gtag.js`, and no Meta pixel anywhere in the repo. Verified:

```bash
grep -rn "dataLayer\|gtag\|googletagmanager\|fbq" app components lib scripts
# → four hits, all inside WaitlistPage.tsx itself
```

So `window.dataLayer` is an ordinary array that nothing reads. Step 3 below is what turns the
event into two conversions. (The comment in that file points at `HANDOFF-growth.md`, which does
not exist — this file is the one it means.)

Two other gaps found while reading the code, both worth knowing before the numbers are trusted:

1. **A repeat submission fires the conversion.** The push happens on every successful response,
   including the `already: true` path where the API upsert ignored the duplicate. Google and Meta
   will count a conversion; the `waitlist` table will not gain a row. The one-line fix is to wrap
   the push in `if (!data.already)`. Product code is not this folder's to change — flagging it so
   the gap between the platforms and the database is understood rather than debugged twice.
2. **There is no privacy policy page.** `app/` has no `privacy` or `terms` route. Both Google Ads
   and Meta require advertisers who collect personal data and run tracking pixels to disclose it,
   and both can reject ads or restrict an account over it. A short `/privacy` page saying what the
   waitlist email is used for, that Google and Meta cookies are set, and how to get removed, is a
   genuine prerequisite. See `policy-limits.md`.

---

## Step 1 — Google Ads: create the conversion action

Tools → **Goals → Conversions → Summary → + New conversion action → Website**.

Enter `shaipt.com`, then choose **"Add a conversion action manually"** (the scan will find nothing,
because nothing is installed yet).

| Field | Value | Why |
|---|---|---|
| Goal / category | **Sign-up** | It is a sign-up for a list, not a purchase |
| Conversion name | `Waitlist Signup` | |
| Value | **Don't use a value** | Any number here would be invented. A made-up value produces confident, wrong ROAS columns. |
| Count | **One** | One person joins the list once |
| Click-through window | 30 days | |
| View-through window | 1 day | |
| Attribution | Data-driven if offered, otherwise **last click** | Data-driven needs a volume floor SHaiPT will not hit; do not worry if it is unavailable |
| Include in "Conversions" | **Yes — Primary action** | So the column populates, even though bidding is Maximize Clicks (`google-ads.md`) |

Save, then open **"Use Google Tag Manager"** and write down the two values it shows:

- **Conversion ID** — looks like `AW-1234567890`
- **Conversion label** — a short opaque string like `AbC-D_efGhIj12kl`

Both are needed in step 4. Neither is a secret in the usual sense (they ship in the page), but keep
them out of git anyway by putting the container ID in an env var — see step 3.

**Keep auto-tagging ON** (Settings → Account settings → Auto-tagging). It appends `gclid`, which
the conversion system needs, and `WaitlistPage.tsx` already falls back to `utm_source = 'google'`
when a bare `gclid` arrives with no UTMs.

**Enhanced conversions** are offered on this screen. They would hash the email from the form and
send it to Google to recover conversions the cookie missed. Skip them for now: they require
accepting Google's customer-data terms and a privacy-policy disclosure that does not exist yet,
and at single-digit monthly conversions the recovery is a fraction of a conversion. Revisit if
volume ever justifies it.

---

## Step 2 — Meta: create the pixel and prepare the domain

1. **Events Manager → Connect data sources → Web → Meta Pixel.** Name it `SHaiPT Web`. Write down
   the **Pixel ID** (a 15–16 digit number).
2. **Verify the domain.** Business settings → Brand safety and suitability → **Domains** → add
   `shaipt.com`. Meta offers DNS TXT, a meta tag, or a file upload. DNS TXT is cleanest given
   `HANDOFF-seo.md` shows the domain's DNS is already in Google Cloud DNS and being edited for
   Search Console.
3. **Aggregated Event Measurement.** Once the domain is verified, Events Manager → the pixel →
   Aggregated Event Measurement → **Configure Web Events**, and put **`Lead`** in the top priority
   slot. Without this, iOS traffic with tracking prompts declined reports poorly or not at all.
   This is not optional housekeeping; it is the difference between Meta seeing conversions and not.
4. **Conversions API** is the server-side companion — it would mean a POST to Meta's graph API from
   `app/api/waitlist/route.ts`, which already has the email server-side. It genuinely improves
   signal quality. It is *not* worth building at $4.50/day: it is product code, it needs an access
   token in the environment, and it recovers events that this budget barely generates. Noted as
   future work, deliberately not in scope.

---

## Step 3 — put a tag container on the site

This is the only code change the whole playbook needs.

### Why Google Tag Manager rather than hardcoded `gtag` and `fbq`

`HANDOFF-platform.md` records that **Ali runs every production deploy by hand**
(`vercel deploy --prod --yes --scope alis-projects-e60465e8`; the permission classifier blocks it
for agents). Hardcoding the two pixels means a manual deploy for every conversion-label fix, every
new event, every pixel swap. GTM means one deploy, ever, and everything after that is changed in a
web UI from a phone. That trade is decisively worth the extra ~40–80 KB of script.

### Where to mount it — the public pages only, not the whole app

Do **not** put GTM in `app/layout.tsx`. That layout is the root for the signed-in app as well, and
mounting it there ships Google and Meta tracking into every workout, nutrition and coach screen —
weight the app does not need and data Ali has no reason to send. The paid flow is a single page
with no navigation, so two mount points cover everything an ad click can reach.

Create `components/marketing/Tags.tsx`:

```tsx
'use client';

import Script from 'next/script';

/**
 * Google Tag Manager, mounted only on the public marketing pages.
 *
 * Deliberately not in app/layout.tsx: that layout also wraps the signed-in app, and there is no
 * reason for a logged-in workout screen to talk to Google or Meta. Paid traffic lands on
 * /waitlist and never navigates, so mounting here and on / covers the whole funnel.
 *
 * The container id comes from NEXT_PUBLIC_GTM_ID so it is absent in dev and in tests, and the
 * component renders nothing when it is unset.
 */
export default function Tags() {
    const id = process.env.NEXT_PUBLIC_GTM_ID;
    if (!id) return null;

    return (
        <>
            <Script id="gtm" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');
            `}</Script>
            <noscript>
                <iframe
                    src={`https://www.googletagmanager.com/ns.html?id=${id}`}
                    height="0"
                    width="0"
                    style={{ display: 'none', visibility: 'hidden' }}
                />
            </noscript>
        </>
    );
}
```

Render it from `app/waitlist/page.tsx` and `app/page.tsx` (both are server components, and `Tags`
is a client component, so importing and rendering it is all that is needed).

Set `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` in Vercel (Project → Settings → Environment Variables,
Production + Preview) and in `.env.local`, and add it to `env.example`.

**The ordering is safe.** The GTM snippet preserves an existing `window.dataLayer` array rather
than replacing it, and the `waitlist_signup` push only happens after a human has typed an email
and clicked a button — long after `afterInteractive` has run. No race.

### Deploy

Ali, not the assistant:

```bash
cd ~/SHaiPT/SHaiPT-Next-App && vercel deploy --prod --yes --scope alis-projects-e60465e8
```

Then prove it landed, in the style of `HANDOFF-seo.md`'s verification recipe:

```bash
curl -s https://www.shaipt.com/waitlist | grep -c 'googletagmanager.com/gtm.js'   # must be ≥ 1
curl -s https://www.shaipt.com/home     | grep -c 'googletagmanager.com/gtm.js'   # should be 0
```

---

## Step 4 — configure GTM

In the container (`tagmanager.google.com`):

### Variable

**Variables → User-Defined → New → Data Layer Variable**
- Name: `dlv - utm_campaign`
- Data layer variable name: `utm_campaign`

(The page pushes `utm_campaign` alongside the event. It is not required by either tag, but it makes
GTM's Preview mode readable when debugging.)

### Trigger

**Triggers → New → Custom Event**
- Name: `Waitlist Signup`
- Event name: `waitlist_signup`
- Fires on: All Custom Events

### Tag 1 — Google tag (base)

**Tags → New → Google Tag**
- Tag ID: the **Conversion ID** from step 1 (`AW-1234567890`)
- Trigger: **All Pages** (Initialization — All Pages is also fine)

This is what sets the click-identifier cookie from `gclid`. Without it the conversion tag has
nothing to attribute to.

### Tag 2 — Google Ads Conversion Tracking

**Tags → New → Google Ads Conversion Tracking**
- Conversion ID: `AW-1234567890`
- Conversion Label: the label from step 1
- Conversion Value: leave empty
- Trigger: **Waitlist Signup**

### Tag 3 — Meta pixel base

There is a Meta pixel template in the **Community Template Gallery**; it is the tidier option if
it is available. If not, **Tags → New → Custom HTML**:

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

- Trigger: **All Pages**

### Tag 4 — Meta `Lead` event

**Tags → New → Custom HTML**

```html
<script>fbq('track', 'Lead');</script>
```

- Tag firing options: **Once per event**
- **Tag sequencing: fire Tag 3 (the base pixel) first** if it has not already fired. Advanced
  settings → Tag Sequencing → "Fire a tag before…". Without this, a fast submit on a cold page can
  call `fbq` before `fbq` exists.
- Trigger: **Waitlist Signup**

`Lead` is a **standard** Meta event. Use the standard name, not a custom one — standard events are
what Meta's delivery system understands and what Aggregated Event Measurement can prioritise.

### Publish

Preview first (below), then **Submit → Publish**.

---

## Step 5 — UTM parameters, so the `waitlist` columns actually fill in

The table has exactly five UTM columns (`supabase/migrations/0150_waitlist.sql`), and
`WaitlistPage.tsx` reads exactly those five names off the query string. Anything else you append is
harmless but invisible. Values pass through `clamp()`, which trims to 200 characters.

### Google Ads — use **Final URL suffix**, not the tracking template

Google offers both fields and the tracking-template one is the more famous. Use the suffix:

- A tracking template rewrites the destination with `{lpurl}`, which adds a redirect hop and
  pushes ads back into review on edit.
- **Final URL suffix** simply appends parameters to the final URL, is the field designed for this,
  and works correctly with parallel tracking.

Set it at **ad group level** (Ad groups → column *Final URL suffix*, or the ad group's Settings).
Ad-group level rather than campaign level because Google's ValueTrack has **no `{campaignname}` or
`{adgroupname}` parameter** — only numeric IDs — so a readable `utm_content` has to be typed in by
hand, once per ad group. Five ad groups, five paste operations, and the SQL reads in English
forever after.

Paste one of these into each ad group (no leading `?`, no `{lpurl}`):

```
utm_source=google&utm_medium=cpc&utm_campaign=search-waitlist&utm_content=ag-form-check&utm_term={keyword}&mt={matchtype}
utm_source=google&utm_medium=cpc&utm_campaign=search-waitlist&utm_content=ag-phone-camera&utm_term={keyword}&mt={matchtype}
utm_source=google&utm_medium=cpc&utm_campaign=search-waitlist&utm_content=ag-no-wearable&utm_term={keyword}&mt={matchtype}
utm_source=google&utm_medium=cpc&utm_campaign=search-waitlist&utm_content=ag-4d-replay&utm_term={keyword}&mt={matchtype}
utm_source=google&utm_medium=cpc&utm_campaign=search-waitlist&utm_content=ag-brand&utm_term={keyword}&mt={matchtype}
```

`{keyword}` resolves to the keyword that matched, so `utm_term` becomes a keyword leaderboard.
`mt` is not stored — it is there for eyeballing the URL in the browser bar while debugging.

### Meta — the ad-level **URL parameters** field

Ad level → **Tracking → URL parameters**. Meta's dynamic parameters are available here and produce
readable names automatically:

```
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

Meta URL-encodes those names, so **name campaigns, ad sets and ads with hyphens and no spaces** —
which is exactly what `meta-ads.md` prescribes (`ig-hooks`, `broad-us-18-45`, `h01-bar-path-draws`).
`utm_content` then *is* the hook name, and the hook leaderboard query below works with no mapping
table.

Meta also appends its own `fbclid`; `WaitlistPage.tsx` falls back to `utm_source = 'meta'` if the
UTMs are ever missing.

---

## Step 6 — prove it works before spending

1. **GTM Preview.** In the container, click **Preview**, enter
   `https://www.shaipt.com/waitlist?utm_source=test&utm_medium=test&utm_campaign=wiring-check&utm_content=t1&utm_term=t2`,
   submit a real address you control. Tag Assistant should show the `waitlist_signup` event and
   all four tags firing.
2. **Meta Test Events.** Events Manager → the pixel → **Test Events** → open the same URL through
   the tool and submit. A `Lead` event should appear within seconds.
3. **The database.** Run query 0 below. The row must have `utm_source = 'test'`,
   `utm_campaign = 'wiring-check'`, `utm_content = 't1'`, `utm_term = 't2'`,
   `landing_path = '/waitlist'`. If the UTM columns are NULL, the parameters are not reaching the
   page — everything else is moot until that is fixed.
4. **Google Ads.** The conversion action's status moves from "No recent conversions" to "Recording
   conversions". Google can take up to ~24 hours to show it; do not re-plumb anything on day one.
5. Delete the test row afterwards so it does not pollute the cost queries:
   `delete from waitlist where utm_campaign = 'wiring-check';`

The browser extensions **Google Tag Assistant** and **Meta Pixel Helper** are worth installing for
five minutes of debugging each.

---

## Known gaps — read before trusting any number

- **No first-touch persistence.** `WaitlistPage.tsx` reads the UTMs from `window.location.search`
  on mount. Someone who clicks an ad, leaves, and comes back later by typing the URL produces a row
  with NULL `utm_source` and is counted as organic. **This systematically under-counts paid.** The
  cheap fix is to stash the attribution in `localStorage` on first visit and prefer the stored
  value on submit. Product code, not this folder's to change — but the bias is real and always in
  the same direction, so treat paid's share as a floor.
- **The database will always report fewer conversions than… no — more.** Ad blockers and tracking
  prevention will stop some share of the GTM tags from firing, so Google and Meta will each show
  *fewer* conversions than there are rows. Expect a gap of maybe 10–30% (estimate). Pointing at the
  gap and calling it a bug wastes an afternoon. **The `waitlist` table is the authority.**
- **…except for duplicate submits**, which push the event without creating a row (finding #1 at the
  top). That pushes the platforms the other way. The two errors do not cancel; they just mean the
  platform numbers are directional and the database is exact.
- **`referrer` is unreliable for Instagram.** In-app browsers frequently strip or rewrite
  `document.referrer`. For Meta, UTMs are the only trustworthy signal — which is why step 5's Meta
  parameters are not optional.
- **First touch wins, by design.** `app/api/waitlist/route.ts` upserts with `ignoreDuplicates`, so
  a second click from a different campaign never overwrites the first. That is the right
  attribution model for this, and it means "already on the list" responses leave no trace in the
  table.
- **Consent.** Targeting the US only, as `google-ads.md` and `meta-ads.md` both do, avoids the
  GDPR/UK-GDPR banner requirement. **If Ali adds the UK or any EEA country** — `google-ads.md`
  floats UK/CA/AU as a cheaper-CPC fallback — then Google requires **Consent Mode v2** for that
  traffic, and running without it degrades or blocks measurement and personalisation. Do not add
  European geos casually; it is a consent-banner project, not a checkbox.

---

## The SQL

Run in the Supabase SQL editor (project `ayaynfcdoumhzledqoec`). `waitlist` is service-role only
under RLS, and the dashboard's SQL editor runs as a superuser, so these work there and would not
work through the anon key.

### 0. The wiring check

```sql
select email, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
       referrer, landing_path, created_at
from waitlist
order by created_at desc
limit 10;
```

### 1. Signups by channel, last 30 days

```sql
select coalesce(utm_source, '(none)')  as source,
       coalesce(utm_medium, '(none)')  as medium,
       coalesce(utm_campaign, '(none)') as campaign,
       count(*)                                            as signups,
       count(*) filter (where invited_at is not null)       as invited
from waitlist
where created_at >= now() - interval '30 days'
group by 1, 2, 3
order by signups desc;
```

`(none)` is organic **plus** the first-touch gap described above. Do not read it as pure organic.

### 2. Cost per signup

Spend is not in the database and there is no free way to get it there. Type it in — one minute a
month, and it keeps the number honest because you have to look at the invoices to write it.

```sql
with spend (utm_source, month, usd) as (
    values
        -- (source,   first day of month,   dollars actually billed)
        ('google', date '2026-10-01', 213.00),
        ('meta',   date '2026-10-01', 137.00)
),
signups as (
    select coalesce(utm_source, '(none)') as utm_source,
           date_trunc('month', created_at)::date as month,
           count(*) as signups,
           count(*) filter (where invited_at is not null) as invited
    from waitlist
    group by 1, 2
)
select s.month,
       s.utm_source,
       s.signups,
       s.invited,
       sp.usd                                            as spend,
       round(sp.usd / nullif(s.signups, 0), 2)           as cost_per_signup,
       round(sp.usd / nullif(s.invited, 0), 2)           as cost_per_invite
from signups s
join spend sp on sp.utm_source = s.utm_source and sp.month = s.month
order by s.month desc, s.signups desc;
```

### 3. Hook leaderboard (Meta) and keyword leaderboard (Google)

```sql
-- which creative hook brought people in
select utm_content as hook, count(*) as signups, min(created_at)::date as first_seen
from waitlist
where utm_source = 'meta' and utm_content is not null
group by 1
order by signups desc;

-- which search term brought people in
select utm_term as keyword, utm_content as ad_group, count(*) as signups
from waitlist
where utm_source = 'google' and utm_term is not null
group by 1, 2
order by signups desc;
```

At twelve signups a month these tables will be sparse for a long while. Read them monthly, not
weekly, and do not kill a hook on one signup — kill hooks on the attention metrics in
`meta-ads.md`.

### 4. The full funnel, signup → invited → activated

`invites.used_at` is stamped when the person actually signs up
(`supabase/migrations/0110_invites_and_testers.sql`), so the activation rate that everything in
`README.md`'s arithmetic depends on is one join away:

```sql
select coalesce(w.utm_source, '(none)') as source,
       count(*)                                       as signups,
       count(w.invited_at)                            as invited,
       count(i.used_at)                               as activated,
       round(100.0 * count(i.used_at)
             / nullif(count(w.invited_at), 0), 1)     as activation_pct
from waitlist w
left join invites i on i.email = w.email
group by 1
order by signups desc;
```

**This is the most valuable query in the file.** `README.md` assumes 40–70% of invited people
activate, with no evidence. As soon as there are twenty or thirty invites, this replaces the
assumption with a fact, and the whole cost-per-member range in `README.md` tightens.

### 5. Daily trend, for spotting the day something broke

```sql
select created_at::date as day,
       count(*) as signups,
       count(*) filter (where utm_source = 'google') as google,
       count(*) filter (where utm_source = 'meta')   as meta,
       count(*) filter (where utm_source is null)    as untagged
from waitlist
where created_at >= now() - interval '60 days'
group by 1
order by 1 desc;
```

A day where `untagged` jumps and `google`/`meta` go to zero usually means a Final URL suffix or
Meta URL-parameters field got cleared, not that the ads stopped working.
