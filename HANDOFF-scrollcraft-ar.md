# Handoff: scrollcraft landing (layered phone reveal) + AR on iPhone

Paste everything below this line into a fresh session as the first prompt.

---

You are continuing work for Ali (they/them) on two repositories that together make **SHaiPT**, a
training app whose centre is **4Dcoach**: film a set on a phone, get a 4D replay (an avatar
performing the lift in 3D over time), reps, tempo, a technique score, and an AR view. Read this
whole prompt, then the files it names, before changing anything. Commit in small steps with
descriptive messages, end every commit message with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, and push. Ali watches from a phone and
interjects mid-turn: lead with the outcome, keep answers short.

## Repositories, branches, what is live

| What | Where | Branch | Live |
|---|---|---|---|
| SHaiPT Next app (landing, login, home, coach, plans) | `~/SHaiPT/SHaiPT-Next-App`, GitHub `SHaiPT-app/SHaiPT-Next-App` | `v2-overhaul` | www.shaipt.com via Vercel project `s-hai-pt-de3g` (team `alis-projects-e60465e8`). **The Vercel project is still Git-linked to the old repo `Alihomaei/SHaiPT`**, so production is deployed from the local checkout with `cd ~/SHaiPT/SHaiPT-Next-App && vercel deploy --prod --yes --scope alis-projects-e60465e8`. The permission classifier blocks `vercel` commands for the assistant: ask Ali to run that line and paste the output. Build logs can be read with the Vercel API (`~/Library/Application Support/com.vercel.cli/auth.json` holds the token; `GET /v3/deployments/{id}/events?teamId=…&builds=1`). |
| 4Dcoach (Vite 8 + TypeScript + Three.js PWA) and its Mac server (FastAPI) | `~/SHaiPT/SHaiPT_simple/4Dcoach/app` and `/server`, GitHub `Alihomaei/shaipt-simple` (private) | work on `4dcoach-spec`, merge into `main` with `git merge --no-ff` | https://sh-ai-pt-simple.vercel.app/ builds from `main` on push (root `vercel.json` runs `scripts/vercel-build.sh`: 4Dcoach at the site root, the old simple PWA under `/simple/`). A kill-switch `service-worker.js` at the root clears the old PWA's cache-first worker on phones. |

Both repos commit as `alihomaei1997@gmail.com` (Vercel used to block Git deployments because the
author email was a local machine address; do not change it back). `prd.md` in the Next repo has an
uncommitted edit by Ali: leave it alone.

Dev servers: Next: `cd ~/SHaiPT/SHaiPT-Next-App && pnpm dev` (port 3000; `.claude/launch.json`
config `shaipt-next-dev` in the 4Dcoach folder starts it from the right cwd). 4Dcoach:
`cd ~/SHaiPT/SHaiPT_simple/4Dcoach/app && npm run dev` (port 5174; a Vite server is usually already
running: reuse it). 4Dcoach server: `cd ~/SHaiPT/SHaiPT_simple/4Dcoach/server && uv run uvicorn
main:app --host 0.0.0.0 --port 8787` (check `GET /jobs` for running jobs before restarting). The
Mac's LAN address is 192.168.3.138. Never run `pnpm build` while `pnpm dev` is running: it corrupts
`.next` (symptoms: "build-manifest.json ENOENT", Turbopack panics); fix with `rm -rf .next` and a
restart.

Read first: this file, `~/SHaiPT/SHaiPT_simple/4Dcoach/HANDOFF.md` (engineering state of 4Dcoach),
`~/SHaiPT/SHaiPT_simple/4Dcoach/SPEC.md`, `~/SHaiPT/SHaiPT_simple/4Dcoach/README.md` (product),
`app/README.md`, `server/README.md`, and `git log --oneline | head -40` in both repos.

## Brand rules (Ali's standing decisions, non-negotiable)

- Colours: **black, white and red `#da0023`** (hot `#ff3352`, deep `#b8001e`). No purple, no pink,
  no orange, **no gradients ever** (a same-colour fade to transparent is fine; `--brand-gradient`
  is deliberately flat). The WebGL "floating lines" background runs at 42% opacity in
  black/dark red/grey and must stay dim. Logo PNGs in `public/` were hue-mapped to the red.
- Landing direction: **"A24 title sequence × Apple product reveal × sci-fi HUD × high-fashion
  editorial website"**, explicitly not "purple gradient + floating dashboard + 3 feature cards +
  glowing AI orb". Editorial serif `--font-editorial` (Instrument Serif, wired in
  `app/layout.tsx`), Geist Mono for HUD labels, thin white rules, corner brackets, no cards.
- Hero copy: **"Real-time smart 4D form check."** with the tagline **"All you want from a personal
  trainer."**
- 4Dcoach UI: dark, Fitbod/Strava-like, red accent only.

## Part A: the scrollcraft landing (main task)

### The reference

Ali recorded `/Users/ali/Desktop/463.mp4` (31 s, a screen capture of a site called Fora) as the
model. What it does, section by section (watch it yourself: `ffmpeg -i /Users/ali/Desktop/463.mp4
-vf "fps=1/2,scale=360:-2,tile=4x3" -frames:v 1 sheet.png` then Read the PNG):

1. **Hero**: a full-bleed cinematic scene (a landscape) behind a headline and one button. A
   **device frame** (their app window) sits low in the viewport, partly below the fold.
2. **Scroll**: the background stays, the device **rises** into the centre and pins; as the page
   keeps scrolling the copy beside/above it changes per section, and the **screen inside the
   device swaps** (crossfade/slide) between app views. A row of tabs/dots names the views
   (Community, Courses, Events, Members) and highlights the active one; the copy on the side
   describes what is on screen.
3. **Feature sections**: the device shows a specific screen while a headline and a paragraph sit
   next to it; the layout alternates sides; small mono labels number the sections.
4. **Pricing**, **FAQ** (accordion), then a **closing hero** that repeats the opening scene with the
   device and a final CTA, then a footer.

The feel is layered ("scrollcraft"): a scene layer, a veil, a device layer, a type layer, each
moving at its own pace with the scroll, everything pinned and deliberate. No cards floating on
gradients.

### What to build (4Dcoach version)

Replace the current reel (`components/landing/ScrollVideoSection.tsx` + `Chapters.tsx`, which pin
a 720×898 storyboard stage on the left and scroll editorial chapters on the right) with a
**full-bleed layered reveal**:

- **Layer 0, the scene**: the bench press footage. `public/hero/bench.mp4` (6 s, 1280 px, muted,
  from 4Dcoach's `app/public/bench-short.mov`) is the placeholder; Ali intends to record the actual
  4D reconstruction (the avatar in the real gym) and drop it in with the same name. Play it
  monochrome-and-dark under the titles (the current `TitleSequence.tsx` does that: `.ts-film` with
  `filter: grayscale(1) contrast(1.12) brightness(0.5)`, a veil, grain). As the user scrolls, either
  scrub it with the scroll (the current reel scrubs three clips via `video.currentTime`, see the
  mechanics below) or keep it looping and darken it further; test both, keep the one that reads
  cleaner.
- **Layer 1, the veil**: same-colour fades only (`rgba(5,5,7,…)` to transparent).
- **Layer 2, the phone**: an iPhone frame that starts below the fold (only its top edge visible
  under the hero) and **rises to the centre and pins** over the first ~60 vh of scroll, then stays
  while its **screen cycles** through 4Dcoach views, one per chapter: (1) setup/trim, (2) processing
  with the step list, (3) the session view (avatar on the bench, stat tiles), (4) the form check
  (score ring, per-rep table, the plain-language warning), (5) the AR sheet / AR view. Use CSS
  transforms driven by scroll progress (no scroll-jacking), `position: sticky` for the pin,
  `will-change: transform`, and crossfades for the screens. Corner brackets, a REC dot and a
  `01 / 05` chapter index in Geist Mono are the HUD framing already used on the stage; keep them.
  **Ali removed the rep/tempo/score chip** from the stage as unnecessary: do not bring it back.
- **Layer 3, the type**: one chapter at a time beside the phone on desktop (alternate sides), above
  it on mobile: mono index, serif headline, one paragraph, the three-cell readout that
  `Chapters.tsx` already has. Chapter copy exists in `Chapters.tsx` (`CHAPTERS`), adjust to the
  five screens above.
- A **tab row / beat rail** naming the five screens, clickable, mirrors the active chapter (the
  current `.sb-rail` dots and `HOLDS` scroll-stop logic do this; keep scroll stops: when scrolling
  settles inside a chapter, ease to its centre; keep ← → keys and the sideways drag-to-scrub).
- Then the existing `SpecSheet.tsx` (editorial table), `Statement.tsx` (monochrome still),
  `Pricing.tsx` (three-column ledger, no cards), `Footer.tsx`. Add an FAQ as an editorial accordion
  (mono question labels, thin rules) if time allows, and a **closing beat** that repeats the scene
  with the phone and the "Get started" / "Open 4Dcoach" links (`useFourDcoachUrl()` from
  `lib/fourDcoach.ts` gives the 4Dcoach URL: env `NEXT_PUBLIC_4DCOACH_URL`, else port 5174 on a LAN
  host, else https://sh-ai-pt-simple.vercel.app/).

### Phone screens: how to get real ones

There are no 4Dcoach screenshots in the Next repo yet (`public/mockups/*.png` are older SHaiPT
mockups, `public/storyboard/*` are the AI storyboard stills and transition clips). Make real ones
from the 4Dcoach dev app with the browser tool: `resize_window` to `mobile` (375×812), analyse
`app/public/bench-short.mov` (setup form: `.chips` groups are [exercise, sex, 3D body, room];
`input[type=text]` is the name; "Next: trim" then "Analyse"; ~1 min without the server options),
open the session card, `screenshot` each state, and save the PNGs under
`public/screens/` (setup, processing, session, formcheck, ar). Sessions and the scanned body live
in IndexedDB (`await import('/src/store/db.ts')` → `listSessions()`, `loadSession(id)`,
`loadBody()`). The session subtitle says "SAM 3D Body" when the 3D body ran. Mask the frame with a
phone bezel drawn in CSS (rounded 44 px, 1 px white line, a notch) rather than a PNG bezel.

### Mechanics worth reusing (read `ScrollVideoSection.tsx` before rewriting it)

- Scroll progress = `-section.getBoundingClientRect().top / (section.offsetHeight - innerHeight)`,
  updated in one `requestAnimationFrame` per scroll event; all DOM writes through refs, no React
  state in the scroll path (`react-hooks/set-state-in-effect` is an error in this repo's ESLint;
  `useSyncExternalStore` or refs instead).
- Scroll stops: after 180 ms without scroll events, if progress is inside a chapter's band, ease
  to its centre with `window.scrollTo({behavior:'smooth'})`; suppress re-snapping for ~900 ms after
  a programmatic scroll; reset that guard when a drag ends.
- styled-jsx scopes only intrinsic elements: classes on `next/link` or `motion.*` components need
  `:global(.class)` selectors (this cost an hour last time). Prefer CSS keyframes over
  framer-motion for the title reveal.
- Reduced motion: show the final state, no scrub, no snapping.
- Mobile (< 900 px): nothing pinned today; the phone can still rise and pin at the top of the
  viewport with the copy stacked beneath it. Test at 375 px and 1400 px.

### Verification recipe

`preview_start` with `shaipt-next-dev`; `resize_window` 1400×900; drive the scroll with
`javascript_tool` (`window.scrollTo`, then read the DOM: active chapter, phone transform, screen
opacity) and `computer` screenshots. **When the browser pane is hidden, screenshots below the hero
come back black** (the WebGL background stops painting) while the DOM is correct: verify with DOM
reads and take screenshots at the top of the page, or ask Ali to look. Run
`npx tsc --noEmit -p tsconfig.json` (ignore the pre-existing `__tests__/api/coach-interview.test.ts`
errors) and `npx eslint components/landing`. Then commit, push `v2-overhaul`, and ask Ali to run the
production deploy line above.

## Part B: AR on iPhone (it did not work for Ali)

### What exists

In 4Dcoach, the session view's cube button opens `showArSheet` (`app/src/main.ts` around line
1283): it explains what to tap (the bench for a bench press, the athlete's spot otherwise), exports
the avatar rig (`Avatar.exportRig`: positions, indices, skin weights, joints, per-frame root and
rotations, the bar matrices; the bench as triangle soup), `POST /ar` on the Mac server builds an
animated USDZ with `usd-core` (`server/usdz.py`: UsdSkel skeleton + animation, materials bound,
props), served by `GET /ar/{id}.usdz` as `model/vnd.usdz+zip` from `server/ar/`, and the sheet
shows an `<a rel="ar">` link. AR Quick Look was never confirmed on a real iPhone; the USDZ structure
was only checked with the USD toolchain.

### Likely causes, in the order to test

1. **Mixed content.** On the phone the app was probably opened as https://sh-ai-pt-simple.vercel.app
   while the server is `http://192.168.3.138:8787`: Safari blocks the http fetch from an https page,
   so `createArScene` fails before any USDZ exists (the sheet should show "AR export failed" or a
   network error; check what Ali saw). Fixes, pick one: open the app over plain http from the Mac
   (`http://192.168.3.138:5174`, both phone and Mac on the same Wi-Fi) for AR sessions; or expose
   the server over https (Tailscale `tailscale serve`, or a Cloudflare tunnel, or mkcert with the
   cert installed on the phone) and set the server URL in 4Dcoach Settings; or proxy `/ar` through
   Vercel (not possible without a public server). Document the chosen path in `app/README.md`.
2. **The Quick Look link markup.** Safari only opens AR Quick Look for `<a rel="ar">` whose **only
   child is an `<img>`** (or a `<picture>`); the current link is
   `h('a', { class: 'btn primary big hidden', rel: 'ar' }, [img, icon('cube'), 'Open in AR'])`, three
   children, so Safari treats it as an ordinary download link. Make the anchor contain just the
   image (style the image as the button, put the label outside the anchor), keep the `.usdz`
   extension and the `model/vnd.usdz+zip` content type, and serve it from the same scheme as the
   page. Also add `#allowsContentScaling=0` to the href if the model scales oddly.
3. **The file itself.** Validate with the USD toolchain in `server/.venv`:
   `uv run python -c "from pxr import UsdUtils; print(UsdUtils.ComplianceChecker(arkit=True))"`
   style checks (`usdchecker --arkit file.usdz` if the CLI is on the path), and open the USDZ on the
   Mac in Preview/Quick Look (space bar in Finder) which reports errors. Then test the link with
   Apple's sample USDZ (e.g. the toy biplane from developer.apple.com/augmented-reality/quick-look)
   to separate link problems from file problems. Things known to break AR Quick Look: skinning
   primvars without `elementSize`/`interpolation="vertex"`, joint order not parent-first, missing
   `skel:bindTransforms`/`restTransforms`, an animation not referenced by the `skel:animationSource`
   relationship, unbound materials, non-triangulated meshes, more than 65k vertices per mesh, and
   Y-up/metersPerUnit not set (`UsdGeom.SetStageUpAxis(stage, 'Y')`,
   `UsdGeom.SetStageMetersPerUnit(stage, 1)`). Try a **static** USDZ (no animation) first; if that
   places, add the animation back.
4. **Session state.** The AR sheet needs an analysed session with an avatar mesh ready
   (`avatar.ready`); the scanned body mesh (18 439 vertices, `Settings → Your body`) also goes into
   the export via `exportRig`: test with the generic humanoid first (remove the body in Settings),
   then with the scan.

### How to test

You cannot drive a physical iPhone from the session. Prepare the fix, verify the USDZ on the Mac
(Finder Quick Look, `usdchecker`), verify the link markup in the browser tool (the anchor's single
`<img>` child, the href, the response headers with `curl -I`), then give Ali exact steps: which URL
to open on the phone, which session, what to tap, and what to report back (a screenshot of the
sheet, whether Quick Look opened, whether the model appeared). Iterate on their report. Record the
outcome in `4Dcoach/HANDOFF.md` and `app/README.md`.

## Deliverables

1. The layered landing on `v2-overhaul`, type-clean and lint-clean, verified at 1400 px and 375 px,
   with real 4Dcoach phone screens, pushed; a note in the commit message on what changed; Ali
   deploys.
2. AR: the link markup fixed and the mixed-content path documented, the USDZ validated on the Mac,
   a tested-on-iPhone result (from Ali's report), all committed on `4dcoach-spec` and merged into
   `main` so https://sh-ai-pt-simple.vercel.app/ has it.
3. Update `~/SHaiPT/SHaiPT_simple/4Dcoach/HANDOFF.md` with the state at the end of your session.
