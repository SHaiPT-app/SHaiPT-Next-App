# Agent Communication Log

> Communication between **Debugger Agent** and **Tester Agent**.

---

## Tester Agent Report (Phase 7)

### Status: BLOCKED / PARTIALLY VERIFIED

### Bugs Found
- **[HIGH] Unprotected Route: `/coach`** — accessible without auth. Needs `middleware.ts` or in-page auth guard.

---

## Debugger Agent Report (2026-01-30)

### Bug #1: Mobile crash — "Application error: client-side exception" (FIXED)
**Root Cause:** WebGL shader in `FloatingLines.tsx` used non-constant array indexing violating GLSL ES 1.00. Mobile Safari/Chrome enforce this strictly. No error boundaries existed.

**Commits:**
- `ceb3811` — Fix WebGL shader, add error boundaries, add CSS fallback, lazy-load Three.js

### Bug #2: Content invisible on load — "dark bg then content pops in" (FIXED)
**Root Cause:** Hero component started at `opacity: 0` via Framer Motion `initial="hidden"`. Content was invisible until the ~500K JS bundle downloaded and hydrated.

**Commits:**
- `486d593` — Changed Hero to `initial={false}` so SSR renders content at full opacity. Added `loading.tsx` spinner.

### Bug #3: Safari ITP blocking page — "reduce protection" prompt (FIXED)
**Root Cause:** Safari's Intelligent Tracking Prevention blocks cross-origin requests to `*.supabase.co`. The `supabase.auth.getSession()` call on the landing page triggered ITP, causing Safari to delay page load and show a protection warning.

**Commits:**
- `9deed33` — Wrapped session check in try-catch, deferred 100ms so it never blocks initial paint. Landing page has zero cross-origin dependencies for rendering.

### All Files Changed (3 commits total)
| File | Change |
|------|--------|
| `app/global-error.tsx` | NEW — global error boundary |
| `app/error.tsx` | NEW — page error boundary |
| `app/loading.tsx` | NEW — route transition spinner |
| `app/page.tsx` | MODIFIED — deferred + try-caught session check |
| `components/FloatingLines.tsx` | MODIFIED — shader fix, WebGL check, render safety |
| `components/StaticBackground.tsx` | REWRITTEN — dynamic import, error boundary, CSS fallback |
| `components/landing/Hero.tsx` | MODIFIED — `initial={false}` for SSR visibility |

### Build Status: PASSING — All 3 commits deployed to Vercel

### For Tester Agent — VERIFICATION CHECKLIST
- [ ] iPhone Safari: landing page loads without "reduce protection" prompt
- [ ] iPhone Safari: hero content visible immediately (no dark screen delay)
- [ ] iPhone Chrome: landing page loads correctly
- [ ] Both browsers: scroll down to Features/Comparison/Pricing — sections animate in
- [ ] Both browsers: click "Get Started" → login page loads
- [ ] Test `/coach` page on mobile (unprotected route issue still open)
- [ ] Test authenticated pages (dashboard, workout) on mobile after login

---

## Debugger Agent Report (2026-02-02)

### Bug #4: Quick reply chip text invisible in coach interview (FIXED)
**Root Cause:** `.quick-reply-chip` CSS used `color: var(--foreground)` (#E5E5E7 light gray) and `background: rgba(255, 255, 255, 0.06)`, but chips render inside a nearly-white card (`rgba(255, 255, 255, 0.88)`). Light-on-light = unreadable.

**Fix:** Changed chip colors to dark-on-light: text `#1a1a1a`, background `rgba(0, 0, 0, 0.06)`, border `rgba(0, 0, 0, 0.15)`, font-weight 600. Hover/selected states use `#CC5200` dark orange.

### Bug #5: Quick reply chips appear out of sync with coach question (FIXED)
**Root Cause:** Chips were set during response streaming via `processResponse()`, but text was re-displayed by TypewriterText afterwards. Step markers (`[STEP:xxx]`) arrive at the end of the AI response, so chips appeared before typewriter finished.

**Fix:** Added `!isTypewriting && !isLoading` guard to chip render condition. Chips now appear exactly when typewriter completes, with a smooth `chipsFadeIn` slide-up animation (300ms).

### Bug #6: AI coach thinking indicator too subtle — looks stuck (FIXED)
**Root Cause:** Thinking state only showed tiny 5-6px pulsing dots and "Typing..." in 0.65rem gray text. Users couldn't tell if the app was working.

**Fix:** Added `thinkingBounce` CSS animation with bouncing dots. GamifiedChat shows "Coach is thinking" + animated dots. AICoachChat shows "AI Coach is thinking" + animated dots. Header status changed to "Thinking..." in bold orange.

### Bug #7: Google OAuth shows Supabase domain instead of shaipt.com (CONFIG REQUIRED)
**Root Cause:** OAuth flow goes through `dviexcbvujjxylfeiyna.supabase.co` auth endpoint. Google consent screen shows this domain.

**Fix Required (not code):** Set up custom auth domain in Supabase Dashboard (Pro plan required). Steps: (1) Supabase Dashboard > Settings > Custom Domains > add `auth.shaipt.com`, (2) Add DNS CNAME `auth.shaipt.com` > `dviexcbvujjxylfeiyna.supabase.co`, (3) Update Google Cloud Console OAuth redirect URIs to use custom domain, (4) Update `.env.local` `NEXT_PUBLIC_SUPABASE_URL`.

### Feature: Landing page slogan + pricing text + glassmorphism nav (DONE)
**Changes:**
- Added "Don't Just Train. Get SHaiPT" tagline above hero typing animation
- Updated Pro tier description to "Start as a Pro for free, because you are a Pro, if you are consistent"
- Applied glassmorphism (blur, transparency, glass borders) to PillNav header and mobile BottomTabBar
- Updated tab bar accent colors from cyan/blue to orange theme for consistency

### All Files Changed (2 commits)
| File | Change |
|------|--------|
| `app/globals.css` | MODIFIED — fixed chip colors for light bg, added chipsFadeIn + thinkingBounce animations |
| `components/ai-coach/AICoachChat.tsx` | MODIFIED — prominent thinking indicator with animated dots |
| `components/ai-coach/GamifiedChat.tsx` | MODIFIED — synced chips with typewriter, prominent thinking indicator |
| `components/landing/Hero.tsx` | MODIFIED — added "Don't Just Train. Get SHaiPT" slogan |
| `components/landing/Pricing.tsx` | MODIFIED — Pro tier motivational description |
| `app/(main)/layout.tsx` | MODIFIED — glassmorphism header styling |
| `components/PillNav.tsx` | MODIFIED — glassmorphism pill nav with glass borders |
| `components/navigation/BottomTabBar.tsx` | MODIFIED — glassmorphism + orange accent colors |

### Build Status: PASSING

### For Tester Agent — VERIFICATION CHECKLIST
- [ ] Coach interview: quick reply chips have readable dark text on white card
- [ ] Coach interview: chips appear right when typewriter finishes (not before or long after)
- [ ] Coach interview: "Coach is thinking" + bouncing dots visible while AI responds
- [ ] AI Coach chat panel: "AI Coach is thinking" + bouncing dots visible while AI responds
- [ ] Header shows "Thinking..." in orange while loading
- [ ] Landing page: "Don't Just Train. Get SHaiPT" slogan visible above typing text
- [ ] Landing page pricing: Pro card says "Start as a Pro for free..."
- [ ] App header: PillNav has glass effect (translucent, blurred background)
- [ ] Mobile: bottom tab bar has glass effect, orange accents (not cyan/blue)

### Outstanding Issues (not yet fixed)
1. **Unprotected `/coach` route** — needs auth middleware or guard (from Tester Agent)
2. **3.9MB total JS bundle** — largest chunks: 513K (Chakra), 475K (Three.js, lazy), 370K (Recharts). Consider code-splitting Recharts to analytics-only pages.
3. **Google OAuth domain** — requires Supabase Pro plan custom domain setup (see Bug #7 above)
4. **Next.js middleware deprecation warning** — "middleware" file convention is deprecated, should use "proxy" instead (Next.js 16+ change)

---

## Debugger Agent Report (2026-02-02) — Safety & Liability

### Feature: Safety & Liability Guardrails for MVP Beta (DONE)

#### 1. AI System Prompt Safety Protocols
**Changes:** Added mandatory safety protocols to all 4 AI system prompt builders:
- **AI Coach (chat):** Must refuse medical diagnoses, detect injury keywords ("sharp pain," "dizziness," "chest pain," "numbness," "injury," "torn," etc.), stop workout advice for that situation, and advise consulting a healthcare professional. Must append AI disclaimer on health-related responses.
- **AI Coach (interview):** Same injury keyword detection and medical refusal rules added to interview IMPORTANT RULES section. Interview acknowledges medical info but does not diagnose.
- **Dr. Nadia (dietitian interview):** Must identify as AI not licensed medical professional. Must never diagnose medical conditions. Must warn about sub-1200 kcal plans requiring medical supervision. Must append AI disclaimer to interview summary.
- **Nutrition plan generation:** Enforces 1200 kcal daily minimum floor. Includes condition-specific tip when medical conditions reported. Always appends AI disclaimer as last nutrition tip.

#### 2. Mandatory Liability Waiver (Coach Interview Flow)
**Changes:** Added a `'waiver'` stage to the `FlowStage` state machine, before `'interview'`. On first visit to coach interview:
- Displays "Health Disclaimer & Liability Waiver" screen with 5 key points (not medical advice, consult doctor, exercise at own risk, AI limitations, form analysis disclaimer).
- Required checkbox: user must accept before proceeding.
- On acceptance, saves `terms_accepted_at` timestamp to user's Supabase profile.
- On subsequent visits, checks `terms_accepted_at` and auto-skips to interview if already accepted.
- Added `terms_accepted_at?: string` to `Profile` type in `lib/types.ts`.

**Supabase migration COMPLETE:** `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;` — ran successfully on 2026-02-02.

#### 3. MediaPipe Camera Warning (Workout UI)
**Changes:** When user toggles "Form Check" ON for the first time in a workout session:
- Displays a dismissible warning banner: "Computer Vision is for guidance only. Always prioritize safe form and physical comfort over AI feedback."
- Warning appears once per session (uses a ref to track if already shown).
- Animated entry/exit with Framer Motion.
- User can dismiss with X button, and it won't reappear for the rest of that session.

### All Files Changed
| File | Change |
|------|--------|
| `app/api/ai-coach/chat/route.ts` | MODIFIED — added safety protocols to system prompt |
| `app/api/ai-coach/interview/route.ts` | MODIFIED — added safety protocols to interview rules |
| `app/api/ai-coach/dietitian-interview/route.ts` | MODIFIED — added safety protocols + AI disclaimer to Dr. Nadia |
| `app/api/ai-coach/generate-nutrition-plan/route.ts` | MODIFIED — added 1200 kcal floor, medical tip, AI disclaimer |
| `lib/types.ts` | MODIFIED — added `terms_accepted_at` to Profile interface |
| `app/coach/[coachId]/page.tsx` | MODIFIED — added waiver flow stage with full disclaimer UI |
| `app/workout/[sessionId]/page.tsx` | MODIFIED — added camera warning banner on Form Check toggle |

### Build Status: PASSING

### For Tester Agent — VERIFICATION CHECKLIST
- [ ] Coach interview: waiver screen appears before interview on first visit
- [ ] Coach interview: waiver checkbox must be checked to proceed
- [ ] Coach interview: after accepting, waiver does not appear on subsequent visits
- [ ] AI Coach chat: ask about "sharp pain in my knee" — coach should stop workout advice and recommend seeing a doctor
- [ ] AI Coach chat: ask about nutrition — response should include AI disclaimer
- [ ] Dr. Nadia interview: responses should identify as AI, not licensed professional
- [ ] Nutrition plan: generated plan should have AI disclaimer as last nutrition tip
- [ ] Workout: toggle Form Check ON — camera warning banner appears
- [ ] Workout: dismiss warning — it does not reappear when toggling Form Check OFF then ON again
- [ ] Workout: warning appears only once per session
