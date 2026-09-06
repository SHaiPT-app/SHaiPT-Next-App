# SHaiPT — Product Requirements Document (PRD)

> **Version:** 1.0 — MVP / Fundraiser & Pitch-Ready Build
> **Last Updated:** 2026-01-27

---

## 1. Executive Summary

SHaiPT is an AI-powered personal training platform that combines real-time conversational coaching, live camera-based form analysis (MediaPipe), AI-generated periodized workout plans, and a full nutrition suite — all in one app. The MVP targets individual trainees first, with a lite trainer toolkit, and positions against Fitbod, Dr. Muscle, and Future/Caliber by offering **live AI form correction** as the core differentiator — a real personal trainer's eye, at a fraction of the cost.

**Business Model:** Freemium SaaS with three-tier pricing.

---

## 2. Target Users

### Primary: Trainees (Fitness Enthusiasts)
- Beginners to intermediate lifters who can't afford or access a personal trainer.
- Self-directed athletes who want intelligent programming and real-time feedback.
- Users who value data-driven training (analytics, PRs, progress tracking).

### Secondary: Trainers (Lite)
- Personal trainers managing a small client roster.
- Need to assign plans, view client progress, message clients, and get AI-flagged alerts (missed workouts, plateaus, form issues).

---

## 3. Core Features

### 3.1 AI Coach (Chat + Vision)

| Aspect | Detail |
|---|---|
| **Engine** | Google Gemini (Generative AI) — multimodal |
| **Chat** | Conversational AI coach that adapts workouts, answers questions, motivates, and manages sessions |
| **Form Analysis** | Client-side MediaPipe pose detection in-browser. Real-time skeleton overlay with form cues |
| **Workout Flow** | Hybrid: AI guides session structure (exercise order, sets, rest timers), camera/form analysis is toggleable per exercise |
| **Rep Counting** | MediaPipe-based automatic rep detection during active sets |
| **Real-time** | Supabase Realtime for streaming AI responses and live session state |

### 3.2 Onboarding — AI Interview

- After signup, the AI Coach conducts a conversational onboarding interview.
- Collects: fitness goals, experience level, available equipment, training frequency, injuries/limitations, dietary preferences.
- Generates the user's first personalized training plan and nutrition plan.
- This is the **"aha moment"** — the user sees a tailored plan within minutes.

### 3.3 Training Plans (AI-Driven Periodization)

- **Structure:** Multi-week periodized blocks (e.g., 4-week hypertrophy phase → strength phase).
- **AI Decides:** Weekly split, exercise selection, sets, reps, weight recommendations, intensifiers (dropsets, supersets, etc.) based on goals, recovery, and physical limitations.
- **User Override:** All AI recommendations are editable. Users can swap exercises, adjust weights/sets/reps, and modify the schedule.
- **Adaptive:** AI adjusts the plan based on logged performance, missed workouts, and feedback.
- **Templates:** Plans can be saved as templates and shared (trainer → client, community).

### 3.4 Workout Execution & Logging

- **Guided Session:** Step-by-step workout walkthrough with current exercise, target sets/reps/weight, rest timer.
- **Logging:** Users log actual weight, reps, and RPE per set. AI uses this for future recommendations.
- **Form Analysis Toggle:** Camera overlay available per exercise for real-time form feedback.
- **Session Summary:** Post-workout summary with total volume, PRs hit, AI feedback.

### 3.5 Full Nutrition Suite

| Feature | Detail |
|---|---|
| **AI Meal Plans** | AI generates meal plans based on training goals, dietary preferences (vegan, keto, halal, etc.), and target macros |
| **Macro Tracking** | Users log food intake; AI sets calorie/macro targets aligned with their training phase |
| **Food Database** | Searchable food/ingredient database with nutritional data |
| **Grocery Lists** | Auto-generated grocery lists from meal plans |
| **AI Recommendations** | Contextual nutrition advice in AI Coach chat |

### 3.6 Analytics Dashboard

- **Workout History:** Full log of completed workouts with details.
- **Personal Records:** Track max weight, max reps, max volume per exercise. PR celebrations.
- **Charts & Trends:** Visual graphs for volume, strength progression, body measurements, weight over time.
- **Body Composition:** Weight, measurements, progress photos/videos timeline.
- **AI Insights:** Weekly AI-generated progress reports with actionable recommendations.

### 3.7 Social & Community (Nice-to-Have)

- Activity feed (workout completions, PRs).
- Follow other users.
- Like and comment on posts.
- Visibility controls (public/private/followers-only).
- **Priority:** Low for MVP. Include basic feed + follows. Polish post-funding.

### 3.8 Trainer-Lite Tools

- **Plan Assignment:** Create and assign training plans to clients.
- **Client Progress View:** View client workout logs, analytics, and progress.
- **Direct Messaging:** In-app messaging with clients.
- **AI Assist:** AI flags client issues — missed workouts, plateaus, form problems detected during sessions.
- **Coaching Relationships:** Manage active client roster with permission-based access.

---

## 4. Authentication

| Method | Detail |
|---|---|
| **Email/Password** | Standard signup/login |
| **Google OAuth** | One-tap Google sign-in |
| **Apple Sign-In** | For iOS/Safari users (required for App Store) |
| **Provider** | Supabase Auth |

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS |
| **UI Library** | Chakra UI (replacing shadcn/ui) — accessible, themeable |
| **Animations** | Framer Motion — scroll-triggered animations, page transitions, micro-interactions |
| **Design Ref** | [fitbod.me](https://fitbod.me) — futuristic, dark + neon, kinetic scroll elements |
| **Backend** | Supabase (Postgres, Auth, Storage, Realtime) |
| **AI** | Google Gemini (Generative AI) — chat, plan generation, nutrition, coaching |
| **Form Analysis** | MediaPipe (client-side pose detection in-browser) |
| **Deployment** | Vercel |
| **Testing** | Jest, React Testing Library, Playwright |
| **Mobile** | Deferred — web-first, mobile browser must work. RN/Expo decision post-MVP |

---

## 6. Visual Design Direction

- **Theme:** Dark mode default with neon accent colors (electric blue, vivid green, hot pink).
- **Style:** Futuristic, high-contrast, bold typography.
- **Motion:** Scroll-triggered animations, parallax sections, animated data visualizations, smooth page transitions.
- **Reference:** [fitbod.me](https://fitbod.me) aesthetic — premium fitness tech feel.
- **Components:** Rounded but not soft. Glass-morphism cards, gradient borders, subtle glow effects.
- **Mobile-First:** All layouts must be responsive and touch-friendly. Camera UI must work on mobile browsers.

---

## 7. Monetization — Three-Tier Freemium

### Free Tier
- 14-day full access trial.
- After trial:
  - Unlimited workout logging, history, and workout tracker.
  - Unlimited community/social features.
  - Limited AI: 1 plan generation, limited AI chat messages/day, limited form checks/day.
  - Limited nutrition: basic macro targets only.

### Tier 1 — $9.99/mo ("Starter")
- Unlimited AI chat.
- AI plan generation (1 active plan at a time).
- Basic nutrition tracking + AI macro targets.
- Full analytics dashboard.

### Tier 2 — $19.99/mo ("Pro")
- Everything in Starter.
- Unlimited AI plan generation.
- Full nutrition suite (meal plans, grocery lists).
- AI form analysis (unlimited).
- AI weekly progress insights.

### Tier 3 — $29.99/mo ("Elite")
- Everything in Pro.
- Trainer-lite tools (manage up to 5 clients).
- Priority AI (faster responses, advanced model).
- Early access to new features.

---

## 8. Database Schema

The existing Supabase schema (21 tables) covers most needs. Additions/modifications required:

### New Tables
- `nutrition_plans` — AI-generated meal plans linked to training phases.
- `food_logs` — Daily food intake entries with macro breakdown.
- `food_database` — Searchable food items with nutritional data (or integrate external API).
- `grocery_lists` — Auto-generated lists from meal plans.
- `subscriptions` — User subscription tier, billing status, trial expiry.
- `ai_form_sessions` — Logs of form analysis sessions (exercise, score, issues detected).

### Modified Tables
- `profiles` — Add `subscription_tier`, `trial_expires_at`, `onboarding_completed`.
- `training_plans` — Add `phase_type` (hypertrophy/strength/endurance/deload), `phase_duration_weeks`.
- `ai_chats` — Add `context_type` (coaching/nutrition/onboarding/form_review).

---

## 9. Key User Flows

### Flow 1: New User Onboarding
```
Landing Page → Sign Up (Email/Google/Apple)
→ AI Interview (conversational, 2-3 min)
→ AI generates Training Plan + Nutrition Plan
→ Dashboard (plan overview, first workout ready)
```

### Flow 2: Workout Execution
```
Dashboard → Start Workout → Guided Session
→ Exercise displayed (name, demo, target sets/reps/weight)
→ [Optional] Toggle camera → MediaPipe form overlay + AI cues
→ Log actual sets/reps/weight per exercise
→ Rest timer between sets
→ Session Complete → Summary + PRs + AI feedback
```

### Flow 3: Investor Demo (5 minutes)
```
1. Landing page (scroll through futuristic marketing site)     [30s]
2. Quick sign-up → AI interview (abbreviated)                  [60s]
3. Show generated plan + nutrition plan                        [30s]
4. Start a workout → show guided session with form analysis    [90s]
5. Show analytics dashboard with charts, PRs, AI insights      [30s]
6. Show trainer view: client list, AI alerts                   [30s]
7. Show pricing page                                           [30s]
```

### Flow 4: Trainer-Lite
```
Trainer Dashboard → Client List → Select Client
→ View progress, logs, analytics
→ AI flags: "Client X missed 3 workouts", "Client Y plateauing on bench"
→ Assign new plan or message client
```

---

## 10. Competitive Positioning

| Feature | SHaiPT | Fitbod | Dr. Muscle | Future/Caliber |
|---|---|---|---|---|
| AI Workout Generation | Yes | Yes | Yes | Human + App |
| Live Form Analysis | **Yes (Camera)** | No | No | No |
| AI Coach Chat | **Yes** | No | Limited | Human coach |
| Nutrition Suite | **Yes** | No | No | Some |
| Periodized Programming | **AI-driven** | Algorithm | Algorithm | Human-designed |
| Price | $9.99-$29.99 | $12.99 | $9.99 | $150+ |
| Differentiator | **Real-time AI vision coaching** | Exercise auto-selection | Auto-progression | Human touch |

---

## 11. Hard Constraints & Non-Negotiables

1. **Mobile Browser Support:** Camera features (MediaPipe) must work in mobile Safari and Chrome. This is critical for form analysis adoption.
2. **5-Minute Demo:** The full investor demo flow must be completable in 5 minutes with no dead ends, loading spinners > 2s, or broken states.
3. **Full AI Pipeline:** The end-to-end AI flow must work: onboarding interview → plan generation → diet generation → workout execution with form checking → post-workout analysis.
4. **Data Privacy:** Health data handling follows privacy best practices. Clear data retention policies. User data export/deletion support.

---

## 12. MVP Priorities (Ordered)

### Phase 1 — Landing Page + Demo Shell
1. Futuristic landing page with scroll animations (Framer Motion).
2. Auth flow (Email + Google + Apple via Supabase).
3. AI onboarding interview flow.
4. Plan generation UI + display.

### Phase 2 — Core AI Pipeline
5. AI Coach chat (Gemini integration).
6. Workout execution + guided session UI.
7. MediaPipe form analysis integration (client-side).
8. Workout logging.

### Phase 3 — Nutrition + Analytics
9. Nutrition plan generation.
10. Macro tracking + food logging.
11. Analytics dashboard (charts, PRs, history).
12. AI weekly insights.

### Phase 4 — Trainer-Lite + Polish
13. Trainer dashboard + client management.
14. AI client alerts.
15. Direct messaging.
16. Subscription/paywall integration.
17. Social feed (basic).

---

## 13. Success Metrics (Pitch KPIs)

- **Activation:** % of signups completing AI onboarding interview.
- **Engagement:** Workouts logged per user per week.
- **Retention:** 7-day and 30-day retention rates.
- **Conversion:** Free trial → paid subscription rate.
- **AI Usage:** AI chat messages per session, form checks per workout.
- **NPS:** Net Promoter Score from beta users.

---

## 14. Open Questions / Future Considerations

- **Mobile App:** React Native vs Expo vs Capacitor decision post-MVP validation.
- **Food Database:** Build vs integrate (Nutritionix API, USDA FoodData Central, etc.).
- **Video Storage:** Progress media storage costs at scale (Supabase Storage vs S3).
- **AI Cost Management:** Gemini API cost per user per month at scale. May need caching/batching strategies.
- **Wearable Integration:** Apple Watch, Fitbit, Garmin data import for recovery/HR-based recommendations.
- **Offline Support:** PWA capabilities for logging workouts without connectivity.
