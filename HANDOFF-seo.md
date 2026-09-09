# Handoff: SHaiPT search visibility

Paste everything below this line into a fresh session started in `~/SHaiPT/SHaiPT-Next-App`.

---

You are working for Ali (they/them) on **SHaiPT**, an AI personal training web app at
**https://www.shaipt.com** (Next.js 16, App Router, TypeScript, Tailwind, Supabase, deployed on
Vercel). This session is about **search**: Ali wants shaipt.com to come up when someone searches
*"AI personal trainer"*, *"shaipt"* and similar. Read this whole prompt before changing anything.

House rules: commit in small steps with descriptive messages, end every commit message with
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` (keep that trailer as-is), write commit
messages to a file and use `git commit -F` (quotes inside `-m` break it), push after each step.
Ali watches from a phone and interjects mid-turn: lead with the outcome, keep answers short, put
anything Ali must do themselves in a numbered list.

The platform itself is in `HANDOFF-platform.md` — the app works end to end and is covered by 18
Playwright tests. Read that only if you need to touch product code; this prompt is about the
public, crawlable surface.

## Set expectations honestly, in your first reply

Do not promise a ranking. Two different games are being played here:

- **"shaipt"** — the brand term. Winnable, and half won already: the site is indexed and shows up
  today, but it competes with **shaip.com** (an established AI training-data company, similar
  name, far more authority) and with Albanian-language pages for "shqiptare/shaiptare". The work
  is disambiguation: consistent naming, structured data, and entity signals so Google learns
  SHaiPT is a distinct fitness product.
- **"AI personal trainer"** — a head commercial term contested by funded apps (Dr. Muscle,
  Gymfitty, Trainerize, Shape AI, and the App Store itself). A new domain with one page will not
  rank for it in weeks or months on technical SEO alone. What *is* winnable is the long tail —
  "AI form check app", "4D lift replay", "AI personal trainer no wearable", "phone camera squat
  form analysis" — which is also where SHaiPT is genuinely differentiated. Say this to Ali plainly
  once, recommend the long-tail-first plan, and then do the work.

Everything in workstream A below is worth doing regardless: it is the difference between a site
Google can read properly and one it cannot.

## What was measured on 2026-09-09 (facts, not guesses)

Verified against the live deployment with `curl` and a search:

| Check | State |
|---|---|
| `https://www.shaipt.com/` | 200, **server-rendered**, ~6,000 characters of real text in the HTML. Crawlers see the copy. |
| `https://shaipt.com` | 307 → `https://www.shaipt.com/`. **www is the canonical host.** |
| `/robots.txt` | **404** (serves the Next 404 page). There is no robots file. |
| `/sitemap.xml` | **404**. There is no sitemap. |
| `<link rel="canonical">` | **absent on every page.** |
| JSON-LD structured data | **none.** Zero `application/ld+json` blocks. |
| `<h1>` | **three of them** on the landing page: "Real-time", "smart 4D", "form check." — `components/landing/TitleSequence.tsx:69` renders one `<h1>` per line of `LINES`. |
| `<title>` | "SHaiPT - AI Personal Training" (from `app/layout.tsx`). Google currently displays "SHaiPT — AI Personal Trainer", so it is rewriting it. |
| Meta description, keywords, OG, Twitter | present in `app/layout.tsx`. |
| `metadataBase` | `https://shaipt.com` — the **apex**, which redirects. Every absolute URL Next builds points at a redirect. |
| OG image | `/logo_transparent.png`, 512×512, declared with `twitter:card = summary_large_image`. A square logo in a 1.91:1 slot. |
| Google Search Console verification | no meta tag in the HTML. Ask Ali whether the property exists. |
| Indexed today | yes — `shaipt.com` appears for both "SHaiPT" and "shaipt.com AI personal trainer". |
| Other public routes | `/login` 200, `/demo` 200 plus `/demo/{analytics,interview,plan,pricing,trainer,workout}`. All indexable, all thin or duplicate. |
| Landing copy | almost entirely about **4D form checking**. The phrase the title promises — AI personal trainer — barely appears in the body. |
| `components/landing/Hero.tsx` | dead code: `app/page.tsx` imports `TitleSequence`, not `Hero`. Do not "fix" the H1 there by mistake. |

Content already on the page that is worth marking up: **six real FAQ entries**
(`components/landing/Faq.tsx`, `ITEMS`) and **three pricing tiers** with prices
(`components/landing/Pricing.tsx`: Starter $9.99, Pro $19.99, Elite $29.99).

## Workstream A — the technical floor (do this first, it is all verifiable)

1. **`app/robots.ts`** — allow crawling, point at the sitemap, and disallow what should never be
   indexed: `/api/`, `/home`, `/progress`, `/nutrition`, `/body`, `/plans`, `/workout`, `/coach`,
   `/trainer`, `/dms`, `/profile`, `/settings`, `/onboarding`, `/activity`, `/feed`, `/dashboard`.
   Those are all behind the proxy anyway (see `proxy.ts` for the list), but crawlers should not
   waste budget being redirected.
2. **`app/sitemap.ts`** — the pages worth indexing: `/`, `/login`, and whatever you decide about
   `/demo`. Absolute URLs on `https://www.shaipt.com`.
3. **Fix the host mismatch.** `metadataBase` should be `https://www.shaipt.com` (the apex
   redirects there). Add `alternates: { canonical: '/' }` in the root layout so every page emits a
   self-referencing canonical, and confirm in the HTML afterwards.
4. **One `<h1>` per page.** In `TitleSequence.tsx`, make the three lines one `<h1>` with `<span>`s
   (or `<br>`), keeping the animation — the per-line `animationDelay` can move to the spans. The
   H1 should read as a sentence a person and a crawler both understand, and should contain the
   words the title promises. Something like *"Real-time smart 4D form check — your AI personal
   trainer"*, subject to Ali's taste; the brand is A24-editorial and they care about the wording,
   so **propose the copy and let them pick** rather than shipping your own.
5. **A real OG image**: 1200×630, not the 512×512 logo. Either add a static
   `public/og.png` or generate it with Next's `ImageResponse` (`app/opengraph-image.tsx`), and set
   `twitter.images` to the same. Check it with a fetch of the deployed page afterwards.
6. **Decide on `/demo`.** Six thin pages that duplicate product screens. Either give each real,
   distinct copy that targets a long-tail phrase, or add `robots: { index: false }` to their
   layout's metadata. Do not leave them as they are.
7. **Structured data** (`application/ld+json`, one script per block, in the landing page):
   - `SoftwareApplication` (or `Product`) with `name: "SHaiPT"`, `applicationCategory:
     "HealthApplication"`, the three price tiers as `offers`, and `url`/`logo`.
   - `Organization` with the brand name, logo and `sameAs` links to whatever social profiles Ali
     has (ask — do not invent them).
   - `FAQPage` built **from the same `ITEMS` array** `Faq.tsx` renders, so the markup can never
     drift from the visible answers. Marking up FAQs that are not on the page is a violation.
   - `WebSite` with `potentialAction: SearchAction` only if there is a real site search. There
     isn't — skip it.
8. Extend `__tests__/seo-metadata.test.ts` to cover what you add (canonical, metadataBase host,
   OG image dimensions), and add an `e2e` check that `/robots.txt` and `/sitemap.xml` return 200
   with the right content type. Then run `npx playwright test` and `npx jest` — the e2e suite is
   green (18 tests) and Jest has 17 pre-existing red suites; do not add to either.

## Workstream B — the content that can actually rank

Technical fixes make the site legible. They do not create anything to rank *for*. The site is one
page about 4D form checking; the terms Ali named need pages that answer them.

1. **Rewrite the landing copy's framing** so "AI personal trainer" is the promise and "4D form
   check" is the proof, rather than the other way round. Keep the editorial voice — read
   `TitleSequence`, `Statement` and `SpecSheet` first, and look at `app/design/` mockups in the
   sibling 4Dcoach repo for the visual language. Propose, do not impose.
2. **Add real pages**, each with one job and a self-referencing canonical. Candidates, best first:
   - `/ai-personal-trainer` — what the product does, who it is for, how it compares to a human PT.
   - `/form-check` — the 4D replay and technique score, with the spec sheet content.
   - `/pricing` as its own indexable page (it is only a section today).
   - A few "how to" pages that match how people actually search: *how to check squat form with
     your phone*, *AI workout plan from a photo*, *bench press form check app*.
   Each needs genuinely useful text, an image with real alt text, and internal links to and from
   the landing page. Thin doorway pages will do more harm than good — if there is nothing true to
   say on one, do not make it.
3. **Titles and descriptions per page** through the `metadata` export, not a global default. The
   template `"%s | SHaiPT"` already exists in `app/layout.tsx`.

## What only Ali can do (put this in your first reply as a numbered list)

1. **Google Search Console** — add and verify `https://www.shaipt.com` (a DNS TXT record in Google
   Cloud DNS for shaipt.com, or ask you for a `google-site-verification` meta tag you can put in
   the layout). Then submit the sitemap. **Nothing here is measurable until this exists** — you
   cannot see impressions, queries or indexing errors without it.
2. **Bing Webmaster Tools** — same, and it feeds ChatGPT's and Copilot's search.
3. **Decide the positioning** — is SHaiPT an "AI personal trainer" that happens to do 4D form
   checking, or a "4D form check" tool? The copy currently says the second and the title says the
   first. Search cannot fix a split identity.
4. **Links, which are the actual ranking lever.** A Product Hunt launch, a Reddit or YouTube demo
   of the 4D replay, an App Store presence, a LinkedIn company page — anything real that points at
   the domain. Ten minutes of Ali's time on this is worth more than a week of metadata.
5. Confirm whether the old repo `Alihomaei/SHaiPT` still has anything deployed that could compete
   for the same terms.

## Verification recipe (never guess at SEO)

Everything above is checkable from the shell. Prove each change on the deployed site, not just
locally — Ali runs the deploy (`vercel deploy --prod --yes --scope alis-projects-e60465e8`; the
permission classifier blocks it for you).

```bash
curl -s https://www.shaipt.com/robots.txt | head
curl -s -o /dev/null -w '%{http_code}\n' https://www.shaipt.com/sitemap.xml
curl -s https://www.shaipt.com/ | grep -o '<link[^>]*rel="canonical"[^>]*>'
curl -s https://www.shaipt.com/ | grep -c 'application/ld+json'
curl -s https://www.shaipt.com/ | grep -o '<h1[^>]*>' | wc -l      # must be 1
curl -sI https://shaipt.com | grep -i location                      # apex → www
```

For the rendered text a crawler sees, fetch the page and strip tags rather than trusting a
screenshot — the landing page is a client component that still server-renders, and a stale build
looks identical in a browser. Google's Rich Results Test and Search Console's URL Inspection are
the authorities on structured data; validate there before claiming it works.

`pnpm dev` is usually running on port 3000 from this checkout. The Browser pane in the desktop app
cannot reach it; drive it with Playwright from the repo
(`require('/Users/ali/SHaiPT/SHaiPT-Next-App/node_modules/@playwright/test')`) if you need to see
a page. `PLAYWRIGHT_BASE_URL=https://www.shaipt.com npx playwright test e2e/access.spec.ts` runs
the access checks against production.

## Gotchas

- **Never add `noindex` to the landing page, `/login`, or anything under `app/` by accident.** The
  404 page carries `noindex` and that is correct; nothing else public should.
- The app's own screens (`/home`, `/progress`, …) are behind `proxy.ts` and redirect signed-out
  visitors to `/login?next=…`. They are not indexable and must not be made so.
- `keywords` in metadata does nothing for Google. Leave it, but do not spend time on it.
- Do not stuff "AI personal trainer" into copy where it does not belong. The landing page is the
  brand's showpiece and Ali is particular about it: black, white, red `#da0023`, no gradients,
  A24 × Apple × HUD × editorial. Changing what it *says* is a bigger deal than changing what it
  emits in `<head>`; propose copy, ship markup.
- `components/landing/Hero.tsx` is dead code. `app/page.tsx` renders `TitleSequence` inside
  `PhoneReveal`.
- The permission classifier blocks `vercel deploy` and `vercel env add/rm` here, plus long
  heredocs and foreground `sleep`. Write files with the Write tool. `cd` inside a Bash call resets
  the working directory afterwards — use absolute paths.
- Jest baseline: 17 red suites, all pre-existing component tests. Playwright: 18 green. Compare
  against a `git worktree` at the previous commit before assuming you caused a failure.

## Deliverables

1. robots, sitemap, canonicals, one H1, a real OG image, and structured data that matches what is
   on the page — each verified on the deployed site with the commands above.
2. A decision, with Ali, on `/demo`: real content or `noindex`.
3. Whatever content pages Ali agrees to, written properly rather than spun.
4. A short note in this file recording what was submitted to Search Console and when, so the next
   session can tell the difference between "not indexed yet" and "not working".
