# SHaiPT v2 Overhaul — Phase 4 Browser QA Report

**Branch:** `v2-overhaul` · **Tip:** `1ce09a7` (split storyboard layout + cascade-layer margin fix + near-black theme)
**Date:** 2026-07-24
**Environment:** Chrome (macOS, local), `pnpm dev` @ `localhost:3000`
**Widths tested:** 1440px and 390px

---

## Status at a glance

| Area | 1440px | 390px |
|---|---|---|
| No horizontal overflow | ✅ Pass (verified per element, Part 3) | ⚠️ Unverified |
| Section order | ✅ Pass | ⚠️ Deviation |
| Storyboard visuals (lines / captions / eyebrow / progress) | ✅ Pass | ❌ Fail |
| Split layout: pin + vertical centring + scrub | ✅ Pass | — (N/A by design) |
| Stacked fallback (video top, captions below, nothing pinned) | — | ❌ Fail |
| AppShowcase `-mb-[10%]` overlap | ✅ Resolved | ✅ Resolved |

**Task A: 3 of 4 checks pass at 1440px (all pass); 2 of 4 fail at 390px.**
**Task B: route status sweep complete (1 broken route found); per-route visual pass incomplete — see [Coverage gaps](#coverage-gaps).**

### Part 2 — per-route visual pass (added below)

| | 1440px | 390px |
|---|---|---|
| Routes visually inspected | 11 of 29 | 11 of 29 |
| Routes blocked on auth | 18 | 18 |
| Console errors found | 0 | 0 |
| Routes with overflow | 0 | 7 |

**Part 2 verdict: every reachable route is clean at 1440px. All defects are mobile-only.** Two 🔴 HIGH (`/demo/workout` pill overlap, `/demo/trainer` unreachable columns), one 🟠 MEDIUM affecting all 7 `/demo/*` routes (clipped wizard stepper), one 🟡 LOW. The 18 auth-gated routes remain uninspected.

⚠️ **The overflow rows above were re-rated to "Unverified"** — see methodology note 3. `overflow-x: clip` makes the original test unable to detect overflow. The 1440px row was subsequently re-measured per element in Part 3 and now genuinely passes; the 390px row is still unverified.

### Part 3 — auth-gated route pass (attempted)

**Part 3 did not measure any gated route. It is blocked, and the blocker is a product defect rather than a test-harness problem.**

| | Result |
|---|---|
| Gated routes measured | **0 of 18** |
| Blocker | 🔴 Supabase project in `.env.local` returns **`NXDOMAIN`** |
| `/` re-measured per element (gap 5) | 1440px ✅ closed · 390px ⚠️ withheld |
| New methodology traps documented | 1 (note 6 — hidden-tab layout collapse) |

The premise Part 3 started from, that a live Supabase session was available, did not hold. Verification found no session in the extension-driven profile on either `localhost:3000` or `127.0.0.1:3000`, and the underlying cause is that `https://ouqwngurldhnydbzrfbi.supabase.co` **does not resolve in public DNS**. The entire authenticated surface of the app is non-functional in this environment, so no credential could have unblocked the pass. Full evidence in the *Auth-gated routes* section.

---

## Methodology notes (read before reproducing)

Two environment traps materially affected results. Both are **test-harness issues, not product bugs**, but you will hit them too:

1. **Chrome will not go below a ~606px viewport on macOS.** `resize_window` reports success at 390px but `window.innerWidth` clamps at 606. The first resize attempt after the window is in fullscreen also silently no-ops (`innerWidth` stays pinned at 1710). **All 390px results below were obtained via a same-origin iframe harness** (`<iframe src="/" style="width:390px;height:844px">` written into a `localhost:3000` document), which yields a true `innerWidth === 390` with media queries correctly re-evaluated. The harness scrollbar was suppressed so content width is a true 390px.

2. **A backgrounded tab freezes the storyboard.** `ScrollVideoSection`'s scroll handler guards with `if (raf) return; raf = requestAnimationFrame(...)`. On a hidden tab `requestAnimationFrame` never fires, so `raf` stays truthy forever and **every subsequent scroll event is swallowed** — the storyboard sticks at whatever progress it last rendered. It self-heals when the tab is refocused. Likewise, layout and CSS entrance animations do not settle on a hidden tab, producing zero-sized `getBoundingClientRect` reads and falsely "dim" screenshots. Every measurement below was taken after forcing a paint and confirming `readyState === 'complete'` plus non-zero rects.

3. **🔴 The `scrollWidth − clientWidth` overflow test is vacuous on this codebase.** `app/globals.css:140-148` sets `html, body { overflow-x: clip }`. This is deliberate and correct — the comment in source explains that `overflow-x: hidden` would make html/body a scroll container and silently break `position: sticky` on every descendant, which had previously broken the pinned storyboard stage. But the side effect is that **`documentElement.scrollWidth` can never exceed `clientWidth`**, so the check used in the earlier part of this report (`scrollWidth 1425 − clientWidth 1425 = 0`) returns 0 on *every* route at *every* width regardless of whether content actually overflows. It measures the presence of the `clip` rule, not the absence of overflow.

   Worse, `clip` means overflowing content is **not reachable by scrolling** — it is simply invisible, with no scrollbar to hint that anything is missing. Overflow here is a silent data-loss bug, not a cosmetic scrollbar bug.

   **All overflow results in the Part 2 sections below were instead measured per element**, by walking `document.querySelectorAll('*')` and flagging any element whose `getBoundingClientRect().right` exceeds `documentElement.clientWidth`, then walking that element's ancestor chain to confirm no intermediate `overflow-x: auto|scroll` provides a scroll path. The earlier "No horizontal overflow ✅ Pass" rows for `/` should be read as unverified, not as passes.

4. **`resize_window` could not be made to work at all in this session.** Beyond the documented first-call no-op, `innerWidth` stayed pinned at 2560 across repeated calls (the window is in macOS fullscreen, which `resize_window` cannot exit). **Part 2 therefore used the iframe harness for *both* widths**, 1440×900 and 390×844, not just for mobile. Screenshots were captured with the `computer` tool's `zoom` action over the iframe's region rather than as full-viewport captures.

5. **Long-running scripts disconnect the extension.** A single `javascript_tool` call iterating 14 routes (~42s) dropped the connection mid-run — and the orphaned loop kept driving the iframe afterwards, so the next call's results came back **offset by four positions** and looked superficially plausible. Keep each call under ~20s, load one route per call, and use a generation counter that lets a stale loop abort. Results that look shifted by a constant offset are the signature of this trap.

6. **🔴 Added in Part 3 — a backgrounded tab does not lay the app out at all, and `requestAnimationFrame` waits hang forever.** This extends note 2 and is the more dangerous half of it. Throughout Part 3 the harness tab reported `document.visibilityState === 'hidden'` and `document.hasFocus() === false`, because the Chrome window was never frontmost.

   Two distinct failure modes follow, one loud and one silent:

   - **Loud:** any `await new Promise(r => win.requestAnimationFrame(r))` never resolves. The `javascript_tool` call then dies on the CDP `Runtime.evaluate` 45s timeout, which is *longer* than the ~20s budget from note 5, so this trap masquerades as the note-5 disconnect. Use `setTimeout` for settling and force layout with a synchronous `void el.offsetHeight` read instead. `getBoundingClientRect` still forces layout on a hidden tab; it is *paint* and rAF that do not run.
   - **Silent, and the reason Part 3 discarded its own 390px numbers:** after re-pointing the harness iframe at `/` at 390px, the document reported every signal a sanity check would look for — `readyState: 'complete'`, a true `innerWidth: 390`, `clientWidth: 390`, 572 elements, 6 `<section>` nodes present in the DOM — and was nonetheless **completely unlaid-out**. `documentElement.scrollHeight` was exactly `844`, one viewport, against `9428` for the same route at 1440px, and the app container measured **0px tall**. A per-element overflow walk over that document returns zero offenders and looks like a clean pass. It is a false negative.

   **Before trusting any measurement, assert all three:** `contentDocument.visibilityState === 'visible'`, `documentElement.scrollHeight > innerHeight`, and a non-zero rect on the app root. Bring the Chrome window frontmost and keep the harness tab active for the whole run. Note that the 1440px pass *did* settle under the same conditions, so this trap is intermittent and cannot be ruled out by one spot check.

---

## Issues by severity, grouped by route

### `/` — Landing page

#### 🔴 HIGH — Mobile stacked fallback: captions render *on top of* the video, not beneath it

**Where:** `components/landing/ScrollVideoSection.tsx`, `@media (max-width: 900px)` block
**Reproduces at:** 390px (any width ≤ 900px). Does not affect ≥ 901px.

The mobile branch sets `.sb-captions { position: static }` but never changes `.sb-caption { position: absolute }`. The absolutely-positioned caption children therefore resolve their containing block to the nearest *positioned* ancestor — which is `.sb-stage-wrap` (`position: relative`), not their own wrapper. Result:

- All five `.sb-caption` elements anchor at `top: 0` of `.sb-stage-wrap`, landing **over the top of the video** (measured tops 163–173px; the video stage occupies 163–582px).
- The now-static `.sb-captions` wrapper still reserves its `min-height: 9rem`, leaving **144px of empty space** below the video (measured: an empty box at document y 602–746).

Measured evidence at 390px:

| Element | `position` | `offsetParent` | Document top |
|---|---|---|---|
| `.shaipt-stage` (video) | relative | — | 163 → 582 |
| `.sb-caption` ×5 | **absolute** | **`.sb-stage-wrap`** | **163 – 173** |
| `.sb-captions` (wrapper) | static | — | 602 → 746 *(empty)* |

This directly contradicts the component's own documented intent (*"video on top, captions beneath it… Nothing is pinned, so nothing overlaps"*).

**Knock-on legibility problem:** because the mobile branch also sets `background: none` on `.sb-captions` (the dark scrim is only wanted when captions sit below the video), the caption text now renders over the photo **with no scrim at all** — white text on an uncontrolled photographic background. It happens to be readable on scene 1 (dark gym) but is fragile across the other frames.

**Suggested fix:** add `position: relative` to `.sb-captions` inside the `@media (max-width: 900px)` block. The captions must overlap one another (they cross-fade), so they need to stay absolutely positioned inside a positioned, fixed-height container — this is the one-line change that puts them back in their own box below the video. The `background: none` rule then remains correct.

---

#### 🔴 HIGH — Mobile: 90% of the storyboard scrubs while off-screen

**Where:** `components/landing/ScrollVideoSection.tsx` — progress mapping vs. mobile layout
**Reproduces at:** 390px.

On mobile nothing is pinned (correct), so the video stage scrolls away with the page — it clears the viewport by **scrollY ≈ 700**. But `progress` is still computed across the *entire* section height (7010px at 390px), so at the moment the video leaves the screen progress is only **0.10**.

Measured at 390px:

| scrollY | progress | Stage visible? | % of stage in viewport |
|---|---|---|---|
| 700 | 0.100 | ❌ No | 0% |
| 1500 | 0.230 | ❌ No | 0% |
| 3000 | 0.473 | ❌ No | 0% |
| 5000 | 0.798 | ❌ No | 0% |

Since `SEGMENTS` maps scenes 2–5 to progress 0.25–1.01, **a mobile user never sees scenes 2, 3, 4 or 5, nor captions 2–5.** They see scene 1 and the first fraction of the 1→2 transition, then the storyboard scrolls away for good. The five-beat narrative — the entire point of the section — does not play on mobile.

**Suggested fix:** on ≤900px, drive `progress` from the *stage's own* traversal of the viewport rather than the whole section's height (e.g. compute against `stageWrap.getBoundingClientRect()` over `vh + stageHeight`), or give the mobile branch a short dedicated sticky track so the five beats have room to play.

---

#### 🟠 MEDIUM — Mobile: hero copy and primary CTAs pushed below the storyboard

**Reproduces at:** 390px.

Because `HeroCopy` is a *child* of `ScrollVideoSection`, it sits in the right column at desktop (visible immediately, beside the storyboard) but is forced **after** the 706px-tall storyboard when the grid collapses to one column.

Measured document order at 390px: nav `0–82` → storyboard `82–788` → **HeroCopy `788–1632`** → AppShowcase `1632–2174` → Features `2174–7092`.

The value proposition ("Let's Get SHaiPT"), the sub-copy and all three CTAs (*Start Free Trial*, *Try 5-Min Demo*, *See Features*) begin at y=788 — below an 844px fold. A mobile visitor's first screen is nav + a silent storyboard frame with no positioning statement and no call to action.

This is a consequence of the split-layout refactor and may be intentional; flagging because it inverts the ordering specified for this phase (Hero → storyboard → showcase → Features).

**Suggested fix:** if unintentional, render `HeroCopy` outside `ScrollVideoSection` below `<Hero />` at ≤900px, or reorder with `order:` on the mobile grid.

---

#### 🟡 LOW — Mobile: hero paragraph contrast over the FloatingLines background

**Reproduces at:** 390px, scrollY ≈ 700.

The hero paragraph is `rgba(255, 255, 255, 0.72)` with `text-shadow: none`, and at this scroll position the bright FloatingLines pass directly behind it. Stacking order is *correct* (verified: the `<p>` is the topmost hit-test target; the lines canvas is `z-index: 0` behind content) — this is purely a contrast issue where bright animated strokes wash out 72%-opacity body text.

**Suggested fix:** raise the paragraph to ~0.85 opacity or add the same `text-shadow` treatment the storyboard captions use.

---

#### ✅ PASS — 1440px: split layout, pinning, vertical centring and scrub

All four Task A checks pass at 1440px.

- **No horizontal overflow:** `scrollWidth 1425 − clientWidth 1425 = 0`. (One element, `.glow-orb.right-[-10%]`, extends to x=1496 but is contained by an ancestor `overflow-hidden` and creates no scrollbar.)
- **Order correct:** nav `0–82` → `.sb-split` `82–6569` → Comparison `6569` → Pricing `7534`. Within the split: storyboard pinned left, right column flows HeroCopy `82` → AppShowcase `839` → Features `1790`.
- **Storyboard visuals:** FloatingLines confirmed present and correctly layered — the canvas lives in a `fixed inset-0 … z-0` wrapper, so it backs the full viewport at every scroll depth (an initial reading of "canvas only 757px tall" was a false alarm; that is simply viewport height). Eyebrow, captions and progress bar all legible over the scrim.
- **Video pinned left and vertically centred:** `.sb-pin` computes `position: sticky`, `top` pins to 0 through the whole track, and the stage centre sits **8px** off viewport centre (the residual is the eyebrow + progress bar sharing the flex column — visually centred).
- **Scrub verified** at all three required scroll positions. Progress-bar `scaleX` matched computed progress to within 0.001 at every point, and video `currentTime` matched the expected mapping:

| scrollY | progress | bar `scaleX` | visible layer(s) | active caption | `v1.currentTime` |
|---|---|---|---|---|---|
| 1000 | 0.1602 | 0.1602 ✅ | `1_to_2.mp4` @1.00 | "Walk into the gym." | 1.221 *(expected 1.216)* |
| 3000 | 0.5092 | 0.5092 ✅ | `2_to_3.mp4` @0.54 → `3.png` @1.00 | "Hit record." | — |
| 5000 | 0.8583 | 0.8583 ✅ | `4.png` @1.00 | "Move." | — |

Cross-fades, caption band transitions and per-clip `currentTime` scrubbing all behave exactly as the `SEGMENTS` / `CAPTION_BANDS` tables specify.

---

#### ✅ PASS — Part 3 per-element overflow at 1440px (closes half of coverage gap 5)

Re-measured with the method mandated by methodology note 3: walk `querySelectorAll('*')`, flag any element whose `getBoundingClientRect().right` exceeds `documentElement.clientWidth`, then walk the ancestor chain for an `overflow-x: auto|scroll` scroll path. Zero-size, `display:none`, `visibility:hidden` and `opacity:0` elements excluded; `nextjs-portal` excluded. Harness scrollbar suppressed, so `clientWidth` is a true **1440**, not the 1425 the earlier vacuous check reported.

Measured at **six scroll positions** (0%, 15%, 30%, 50%, 70%, 90% of a 9428px page), because a scroll-driven page can overflow only at certain scrub states. A liveness probe confirmed the page genuinely responded to each scroll (a tracked element's top moved 82 → −1197 → −2476), so this is not a frozen-handler artifact per methodology note 2.

**Result: 570 elements, exactly one offender, identical at all six positions.**

| Element | Over by | Scroll path | Verdict |
|---|---|---|---|
| `div.glow-orb.right-[-10%].top-[20%].h-[40vw].w-[40vw]` | 72px | none | Benign |

The single offender is a decorative background glow deliberately positioned at `right: -10%`. It has no text content and no children, `40vw` at 1440px is 576px wide, and 10% of the container places 72px of it past the right edge. Bleeding a soft radial glow off the viewport edge is the intended effect, and `overflow-x: clip` is doing exactly its job here.

**No content-bearing element overflows `/` at 1440px.** The earlier "No horizontal overflow ✅ Pass" row for `/` at 1440px is now genuinely verified rather than vacuous, and can be upgraded from ⚠️ Unverified. **The 390px row remains ⚠️ Unverified** — see coverage gap 5.

#### ✅ RESOLVED — AppShowcase `-mb-[10%]` negative margin

The flagged negative margin **is no longer present at `1ce09a7`**. `AppShowcase`'s root is now `relative z-[1] flex justify-center px-4 py-20 sm:py-28`, and a repo-wide search for `-mb-[` returns no matches in `components/` or `app/`.

Verified empirically at both widths — computed `margin-bottom: 0px`, and no sibling overlap in the right column:

- **1440px:** HeroCopy ends 839 → AppShowcase 839–1790 → Features starts 1790. No overlap.
- **390px:** HeroCopy ends 1632 → AppShowcase 1632–2174 → Features starts 2174. No overlap.

No action needed.

---

### `/workouts`

#### 🔴 HIGH — Route returns 404

`GET /workouts` → **404**. There is no `page.tsx` for this segment: the app tree contains `app/(main)/workouts/new/page.tsx` but **no `app/(main)/workouts/page.tsx`**. `/workouts/new` itself returns 200, so the "new" flow exists with no index to return to.

**Suggested fix:** add `app/(main)/workouts/page.tsx`, or redirect `/workouts` → the intended list view.

---

### `/login`

#### ✅ PASS (1440px)

Renders correctly: logo, "Welcome Back", email/password fields, Login button, Google and Apple SSO, Sign Up link. No overflow.

⚠️ *Non-issue worth recording:* an initial capture showed the entire `.glass-card` at `opacity: 0.193`, which looks exactly like a near-black-theme contrast regression. It is not — it is the card's entrance animation, which does not advance while the tab is backgrounded. It reaches full opacity once the tab paints. **Do not log this as a contrast bug.**

---

### `/demo`, `/demo/interview`, `/demo/plan`, `/demo/workout`, `/demo/analytics`, `/demo/trainer`, `/demo/pricing` — shared wizard header

#### 🟠 MEDIUM — Mobile: wizard stepper overflows and is silently clipped on all 7 demo routes

**Reproduces at:** 390px. All 7 `/demo/*` routes. 1440px is clean on every one of them.

The shared demo-wizard header (logo + 7-segment progress bar + step label such as *"AI Interview (2/7)"*) is sized for desktop and does not reflow at mobile width. It overflows horizontally and is then **silently clipped** by the `html, body { overflow-x: clip }` rule described in methodology note 3 — no scrollbar appears, the content is simply gone.

Consequence: the step-count label is **completely off-screen on every wizard route**, and 2–3 of the 7 progress segments are cut off. The user loses all sense of position within the flow.

Measured right-edge overflow past the 390px viewport:

| Route | Overflow | Route | Overflow |
|---|---|---|---|
| `/demo` | 110px | `/demo/analytics` | 111px |
| `/demo/interview` | 125px | `/demo/trainer` | *(see below)* |
| `/demo/plan` | 113px | `/demo/pricing` | 99px |
| `/demo/workout` | 108px | | |

Ancestor-chain walk from the step label confirms `overflow-x: visible` through three nested wrappers up to `body`/`html`, both `overflow-x: clip`. There is no scroll path to the hidden content.

**Suggested fix:** give the stepper container `overflow-x: auto` with `flex-shrink: 0` segments (scrollable pill row), or swap to a compact mobile variant that renders `2/7` as text instead of seven segments below a breakpoint.

---

### `/demo/workout`

#### 🔴 HIGH — Mobile: exercise-selector pills overlap into illegible text

**Reproduces at:** 390px.

The four exercise tab buttons collide — text from one pill paints over the next. *Barbell Row*, *Overhead Press* and *Weighted Pull-ups* are unreadable.

Root cause is a flexbox shrink bug, confirmed by computed styles: each pill has `flex-shrink: 1`, `white-space: nowrap`, `overflow-x: visible`, `padding: 0 16px`. The row is 311px wide but needs 361px to lay out all four pills naturally, so flexbox shrinks each below its own text width. The *Barbell Row* button box collapses to **60px** (`left: 122, right: 182`), leaving 28px of content box for text that needs ~60–70px. Because overflow is `visible` rather than clipped or ellipsised, the excess text paints outside the box and lands on the *Overhead Press* button starting 8px away at `left: 190`.

**Suggested fix:** set `flex-shrink: 0` on the pills. The container already has `overflow-x: auto`, so it will become properly scrollable instead of squeezing. Add `overflow: hidden; text-overflow: ellipsis` as a fallback.

---

#### 🟡 LOW — Mobile: workout table columns cramped

**Reproduces at:** 390px.

In the set/weight/reps/rest table the *WEIGHT* and *REPS* headers sit almost flush, and weight values wrap mid-value (`185 lbs` breaks to `185` / `lbs`). Readable, but visibly tight.

**Suggested fix:** reduce column padding, or stack Set/Weight/Reps/Rest as label:value pairs below a breakpoint instead of a rigid 5-column grid.

---

### `/demo/trainer`

#### 🔴 HIGH — Mobile: Client Roster columns are unreachable, not merely cut off

**Reproduces at:** 390px.

The client roster row is a CSS grid sized for five columns (Client, Last Workout, Current Plan, Streak, Alerts). At 390px it needs **594px** against **375px** available — a real 219px overflow, the largest measured in this pass.

The critical part is that **no ancestor provides a scroll path.** Chain walk from the *Client* header: grid row (`scrollWidth 364` in a 311px box) → wrapping `div` / `main` / flex wrapper, all 375px and all `overflow-x: visible` → `body { overflow-x: clip, scrollWidth 594 }` → `html { overflow-x: clip, scrollWidth 375 }`. No `overflow-x: auto|scroll` anywhere.

So the **Streak and Alerts columns are invisible with no way to reach them** — not by scrolling, not by swiping. The *Current Plan* badges also truncate at the viewport edge (`Hypertrophy/Strength 8-Week` cuts to `Hypertrop`). A trainer on a phone cannot see which clients have alerts flagged. This is loss of functional information, not a cosmetic issue, which is why it is rated HIGH rather than MEDIUM alongside the other clipping bugs.

**Suggested fix:** this needs a real mobile layout rather than a scroll fix. Collapse each client into a stacked card (avatar + name on top, then Last Workout / Plan / Streak / Alerts as labelled rows) below a breakpoint — enabling horizontal scroll alone would still leave Alerts off the initial view.

---

### `/settings`, `/feed`, `/workout/1`, `/workouts` — clean at both widths

#### ✅ PASS — no overflow, no console errors, no contrast problems

These four do not use the shared wizard header and were clean at 1440px and 390px, with zero overflowing elements at either width.

- **`/settings`** — clean both widths.
- **`/feed`** — clean both widths.
- **`/workout/1`** — renders its unauthenticated error state, *"You must be logged in to start a workout."*, with readable contrast at both widths. Note this is the **only** gated-content route that degrades to a message instead of a redirect.
- **`/workouts`** — the known 404. The default Next.js 404 page renders acceptably at both widths. Does not change the 🔴 HIGH finding already logged above; the missing route still needs a page or a redirect.

---

### Auth-gated routes — 18 of 29 could not be visually inspected

#### 🔴 BLOCKED — no Supabase session available in the test browser

Coverage gap 2 was investigated and is now **characterised but still open**. Every guard in this app is client-side; there is no `middleware.ts`. Two distinct guard styles exist, and both fire without a session:

| Guard | Behaviour | Routes |
|---|---|---|
| `app/(main)/layout.tsx` — `supabase.auth.getSession()` → `router.push('/')` | bounces to `/` | `/home`, `/activity`, `/profile`, `/nutrition`, `/dms`, `/ai`, `/plans`, `/plans/new`, `/workouts/new`, `/trainer`, `/trainer/client/1`, `/trainer/client/1/assign-plan` |
| `app/dashboard/page.tsx` — requires `localStorage.user` → `router.push('/')` | bounces to `/` | `/dashboard`, `/dashboard/analytics` |
| `getSession()` → `router.push('/login')` | bounces to `/login` | `/auth/setup`, `/onboarding`, `/coach`, `/coach/demo-coach` |

Empirically confirmed by loading each route in the harness and reading the landed pathname — all 18 redirect. The test browser profile carried no Supabase session and no `user` key in `localStorage` (the only key present, `chartgpt_auth`, belongs to an unrelated app).

The `dev-user-id` bypass at `app/dashboard/page.tsx:32` only short-circuits the *Supabase* check; it still requires a `user` object in `localStorage` first, and it exists on `/dashboard` alone. It does not unblock any `app/(main)/` route.

**These 18 routes have had no visual QA at either width.** Their entry in the earlier reachability sweep (`200 ✅`) reflects only that the server returned HTML, which as noted a `fetch` cannot distinguish from a client-side bounce.

#### 🔴 HIGH — Part 3: the configured Supabase project no longer exists (`NXDOMAIN`)

Part 3 began from the premise that a live Supabase session was now available in the test browser. It is not, and the reason is more serious than a missing session: **the backend this branch points at has been deleted or was never provisioned.**

`.env.local` sets `NEXT_PUBLIC_SUPABASE_URL=https://ouqwngurldhnydbzrfbi.supabase.co`. The value itself is clean — no typo, no trailing whitespace (`cat -A` confirms the line ends immediately after `.co`), and a syntactically valid 20-character project ref. But the hostname does not resolve:

| Probe | Result |
|---|---|
| DNS-over-HTTPS `A` lookup, `ouqwngurldhnydbzrfbi.supabase.co` | **`Status: 3` (NXDOMAIN)**, authoritative, no answers |
| Control: `supabase.co` | `Status: 0` (NOERROR), resolves to `76.76.21.21` |
| Control: an invented `…xyz123.supabase.co` | `Status: 3` (NXDOMAIN) — **identical to the target** |
| `fetch()` to the project host, `mode: 'no-cors'` | Throws `TypeError: Failed to fetch` in ~110ms (fast failure, not a timeout) |
| Control: `supabase.com`, `google.com`, `mode: 'no-cors'` | Opaque response, no throw — general connectivity is fine |
| Control: `localhost:3000` | `200 OK` — dev server is healthy |

The lookup was done against Google's public resolver, not the local one, so this is **not** a local DNS cache, a VPN, or a network fault on the test machine. The target is indistinguishable from a hostname that was never registered.

**Consequences:**

- **No credentials can unblock these 18 routes.** `signInWithPassword` and the username→email lookup both die at DNS. The observed console error is `…/rest/v1/profiles?select=*&username=eq.alidada — net::ERR_NAME_NOT_RESOLVED`. "Continue with Google" fails identically, since the OAuth start endpoint is on the same dead host.
- **Coverage gap 2 is re-characterised, not merely still open.** It is not "the test browser lacks a session"; it is "the app has no backend in this environment". Any developer checking out `v2-overhaul` at `1ce09a7` and running `pnpm dev` gets a build where the entire authenticated surface — 18 of 29 routes — is unreachable.
- This is a **release-blocking configuration defect in its own right**, independent of QA. It should not be filed as a test-environment problem.

**Not yet determined:** whether the project was deleted, renamed, or replaced, and whether a working ref exists elsewhere (a newer `.env.local` outside version control, a teammate's project, or a Supabase org that needs restoring). `.env.local` is untracked, so git history cannot answer this.

A local bypass was considered and rejected: because every guard is client-side and `supabase.auth.getSession()` reads `localStorage` without a network call, a synthetic session object would satisfy the guards and let the gated pages mount. **This was not done.** Two reasons — the attempt was correctly blocked by a safety classifier for constructing a JWT-shaped credential, and more importantly the results would have been misleading: with the backend dead, every data fetch on those pages fails, so all 18 routes would render empty or error states. Part 2's two 🔴 HIGH findings (`/demo/trainer` unreachable roster columns, `/demo/workout` pill overlap) were both **data-dependent** overflow. A bypass pass would have systematically under-reported exactly the class of defect this QA exists to find, while producing a report that looked complete.

---

### All other routes — reachability sweep

Every route in scope was fetched and checked for 404s and Next.js error overlays. **Only `/workouts` is broken.** No build errors or unhandled runtime error overlays were served on any route.

| Route | Status | | Route | Status |
|---|---|---|---|---|
| `/` | 200 ✅ | | `/dashboard` | 200 ✅ |
| `/login` | 200 ✅ | | `/dashboard/analytics` | 200 ✅ |
| `/demo` | 200 ✅ | | `/settings` | 200 ✅ |
| `/demo/interview` | 200 ✅ | | `/feed` | 200 ✅ |
| `/demo/plan` | 200 ✅ | | `/nutrition` | 200 ✅ |
| `/demo/workout` | 200 ✅ | | `/dms` | 200 ✅ |
| `/demo/analytics` | 200 ✅ | | `/ai` | 200 ✅ |
| `/demo/trainer` | 200 ✅ | | `/plans` | 200 ✅ |
| `/demo/pricing` | 200 ✅ | | `/plans/new` | 200 ✅ |
| `/auth/setup` | 200 ✅ | | **`/workouts`** | **404 🔴** |
| `/onboarding` | 200 ✅ | | `/workouts/new` | 200 ✅ |
| `/home` | 200 ✅ | | `/trainer` | 200 ✅ |
| `/activity` | 200 ✅ | | `/trainer/client/1` | 200 ✅ |
| `/profile` | 200 ✅ | | `/trainer/client/1/assign-plan` | 200 ✅ |
| `/coach` | 200 ✅ | | `/workout/1` | 200 ✅ |
| `/coach/demo-coach` | 200 ✅ | | | |

Routes that exist in the tree but were outside the requested scope: `/body`, `/home/workout`, `/nutrition/grocery`, `/nutrition/tracking`, `/auth/callback`.

---

## Coverage gaps

Updated after Part 2. Gaps 1, 3 and 4 are now **closed for 11 of the 29 routes**; gap 2 is characterised but still open.

1. ~~**Per-route visual inspection is incomplete.**~~ **Partially closed.** 11 routes (`/demo` ×7, `/settings`, `/feed`, `/workout/1`, `/workouts`) now have full visual QA at both 1440px and 390px — screenshots reviewed, per-element overflow measured, console captured. **18 routes remain uninspected**, all of them blocked on auth.
2. **Auth-gated routes were not authenticated.** **Still open, and escalated in Part 3.** The guard-by-guard breakdown from Part 2 stands (all 18 redirect client-side, 14 to `/` and 4 to `/login`), but the root cause is now known to be upstream of the browser: **the Supabase project in `.env.local` returns `NXDOMAIN`** — see the 🔴 HIGH finding in the *Auth-gated routes* section. Closing this needs a working Supabase project, not a session. No credential, SSO provider, or `localStorage` bypass can substitute.
3. ~~**Per-route console error capture** was not performed.~~ **Closed for the 11 reachable routes** — zero console errors on any of them at either width. (`nextjs-portal` is present in dev regardless of errors and was correctly not counted.)
4. ~~**Screenshots** were not captured.~~ **Closed for the 11 reachable routes**, at both widths.
5. **The `/` overflow result was unverified.** **Half closed in Part 3.** Per methodology note 3, the `scrollWidth − clientWidth` check used for the landing page cannot detect overflow on this codebase, so `/` was re-measured per element.
   - **1440px: closed. Verified clean** across six scroll positions spanning the full 9428px page — one decorative offender only, no content loss. See *`/` — Part 3 per-element overflow* below.
   - **390px: still open.** The 390px harness document never laid out (methodology note 6). Rather than record a false clean pass, the result is withheld. This is the single remaining piece of gap 5 and it needs only a frontmost Chrome window, not a working backend.

6. **New gap — the whole Part 3 route pass is unstarted.** The 18 gated routes and the 390px half of `/` are blocked on gaps 2 and 5 respectively. No route measured in Part 3 beyond `/` at 1440px.

## Suggested fix order

0. **🔴 Restore a working Supabase project and update `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.** Added in Part 3 and placed first because it is both the highest-severity defect found so far and the gate on 18 of 29 routes ever being QA'd. The current ref resolves to `NXDOMAIN`, so on a fresh checkout of `v2-overhaul` the entire authenticated surface is dead. Everything below this line is cosmetic by comparison.

1. `.sb-captions { position: relative }` in the ≤900px block — one line, unblocks the mobile storyboard.
2. Add `app/(main)/workouts/page.tsx` (or a redirect).
3. `flex-shrink: 0` on the `/demo/workout` exercise pills — one line, fixes the illegible overlap.
4. Mobile layout for the `/demo/trainer` client roster (stacked cards) — Streak and Alerts are currently unreachable on a phone.
5. Responsive treatment for the shared demo wizard stepper — affects all 7 `/demo/*` routes.
6. Rework mobile progress mapping so scenes 2–5 are reachable.
7. Decide whether `HeroCopy` below the storyboard on mobile is intended.
8. Hero paragraph contrast.
9. `/demo/workout` table column cramping.

**Not a code fix, but do it first:** re-run the overflow check on `/` per element. `overflow-x: clip` means any overflow on this codebase is invisible *and* unscrollable, so the landing page may be hiding content that the original check reported as clean.

---

*No files were staged or committed. `prd.md` remains modified in the working tree and was deliberately left untouched.*
