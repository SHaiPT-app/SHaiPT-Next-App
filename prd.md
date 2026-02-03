# SHaiPT MVP — Implementation Tasks

> Reference: See PRD.md in the repo for full product requirements.
> Stack: Next.js (App Router), TypeScript, Chakra UI, Framer Motion, Supabase, Google Gemini, MediaPipe
> Branch: alis-branch

---

## Phase 1 — Landing Page + Auth + Onboarding

- [x] Install and configure Chakra UI (replace shadcn/ui), set up dark theme with neon accent colors (electric blue, vivid green, hot pink), configure global theme provider in app/layout.tsx
- [x] Install and configure Framer Motion, create shared animation variants for scroll-triggered reveals, page transitions, and micro-interactions
- [x] Build the futuristic landing page at app/page.tsx: hero section with animated headline and CTA, feature showcase sections with scroll-triggered animations and parallax, competitor comparison table, pricing tiers section ($9.99/$19.99/$29.99), footer with links. Reference fitbod.me for style. Dark background, neon glows, glassmorphism cards, gradient borders
- [x] Build the auth flow: sign-up and login pages using Supabase Auth with Email/Password, Google OAuth, and Apple Sign-In. Redirect to onboarding for new users, dashboard for returning users
- [x] Build the AI onboarding interview at app/onboarding/page.tsx: after signup, the AI Coach (Google Gemini) conducts a conversational chat interview collecting fitness goals, experience level, available equipment, training frequency, injuries/limitations, and dietary preferences. Display as a chat UI with streaming responses
- [x] After onboarding interview completes, AI generates the user's first personalized training plan (periodized, multi-week) and nutrition plan (meal plan with macros). Save both to Supabase and redirect to dashboard

## Fix — Landing Page UI Polish

- [x] Fix the landing page (app/page.tsx and all related components): replace ALL blue accent colors (#3B82F6, blue.500, etc.) with neon green (#39FF14 or similar neon). This applies to fonts, buttons, borders, glows, gradients — everything that is currently blue must become neon. Also remove ALL emojis from every UI component in the entire codebase — no emoji in headings, buttons, labels, cards, descriptions, or any user-facing text. Commit changes to alis-branch after completing this fix.

## Phase 2 — Core AI Coach + Workout Execution

- [x] Build the AI Coach chat interface as a persistent component accessible from the dashboard: full conversational UI with streaming Gemini responses, chat history stored in Supabase ai_chats table, context-aware (knows user's plan, recent workouts, goals)
- [x] Build the workout execution flow at app/workout/[sessionId]/page.tsx: step-by-step guided session showing current exercise name/demo/target sets/reps/weight, rest timer between sets, log actual weight/reps/RPE per set, progress through exercises sequentially
- [x] Integrate MediaPipe client-side pose detection: camera overlay component that can be toggled on/off per exercise during workout execution, real-time skeleton overlay on video feed, works in mobile Safari and Chrome
- [x] Add AI form analysis: MediaPipe detects pose landmarks, generate form feedback cues (e.g. "keep your back straight", "go deeper") displayed as overlay text during the exercise. Add automatic rep counting based on pose movement patterns
- [x] Build post-workout summary screen: total volume, duration, PRs hit during session, AI-generated feedback and recommendations. Auto-create activity_post if user has auto_post_workouts enabled

## Phase 3 — Training Plans + Nutrition Suite

- [x] Build the training plan viewer at app/plans/page.tsx: display user's active plan with periodized blocks (hypertrophy/strength/endurance/deload), weekly split view, per-exercise details (sets/reps/weight/intensifiers). All AI recommendations are editable by the user — exercises can be swapped, weights/sets/reps adjusted
- [x] Build the plan creator/editor: users can manually create or AI-generate training plans. Support multi-week periodized blocks with phase_type and phase_duration_weeks. Plans save as templates and can be shared
- [x] Add AI plan adaptation: after each logged workout, AI reviews performance and adjusts upcoming plan recommendations (weight progression, exercise substitutions if user reports pain, volume adjustments based on recovery)
- [x] Build the nutrition plan viewer at app/nutrition/page.tsx: display AI-generated meal plans organized by day, show macros per meal and daily totals, dietary preference tags (vegan, keto, halal, etc.)
- [x] Build macro tracking and food logging: searchable food database, log daily food intake with calories/protein/carbs/fat, AI sets macro targets aligned with current training phase. Create new Supabase tables: nutrition_plans, food_logs, food_database, grocery_lists
- [x] Build auto-generated grocery lists from active meal plans

## Phase 4 — Analytics Dashboard

- [x] Build the analytics dashboard at app/dashboard/analytics/page.tsx: workout history list with expandable details, personal records board showing max weight/reps/volume per exercise with PR celebration badges
- [x] Add interactive charts using a charting library (Recharts or Chart.js): volume over time, strength progression per exercise, body weight trend, workout frequency heatmap, muscle group volume distribution
- [x] Add body composition tracking: log weight, body measurements, progress photos/videos timeline. Store media in Supabase Storage via progress_media table
- [x] Add AI weekly insights: every week, AI generates a progress report analyzing workout adherence, strength trends, plateaus, and actionable recommendations. Display on dashboard as a card with Framer Motion reveal animation

## Phase 5 — Trainer-Lite Tools

- [x] Build the trainer dashboard at app/trainer/page.tsx: client roster using coaching_relationships table, list of active clients with quick-view stats (last workout date, current plan, streak)
- [x] Add trainer plan assignment: trainers can create plans and assign to clients via training_plan_assignments table. Clients see assigned plans in their dashboard
- [x] Add trainer client progress view: trainers can view any client's workout logs, analytics charts, and progress photos (respecting coaching permission flags)
- [x] Add AI client alerts: AI flags issues for trainers — missed workouts (3+ days), performance plateaus (no weight/rep increase over 2 weeks), form problems detected during sessions. Display as notification badges on trainer dashboard
- [x] Add trainer-client direct messaging using Supabase Realtime and direct_messages table

## Phase 6 — Social, Subscriptions + Polish

- [x] Build basic social feed at app/feed/page.tsx: activity posts (workout completions, PRs), follow/unfollow users, like and comment on posts, visibility controls (public/followers/private)
- [x] Integrate subscription/paywall: create subscriptions table in Supabase, implement Stripe checkout for three tiers (Starter $9.99, Pro $19.99, Elite $29.99), gate AI features behind tier checks, 14-day free trial for new users
- [x] Build the investor demo flow: ensure the complete 5-minute walkthrough works end-to-end without dead ends — landing page scroll → quick signup → AI interview (abbreviated) → generated plan + nutrition → start workout with form analysis → analytics dashboard → trainer view → pricing page. No loading spinners > 2 seconds
- [x] Final polish: responsive testing on mobile Safari/Chrome, animation performance optimization, error states and empty states for all pages, SEO meta tags on landing page

## Phase 7 — AI Coach Personas + Revised User Flow

- [x] Create an AI Coach selection page at app/coach/page.tsx: after login, users can go to the "AI Coach" tab and see a grid/carousel of AI coach personas. Each coach card has: avatar image, full name with nickname (e.g. "John 'The Sculptor'"), coaching style description, specialty tags. Coach personas to include: (1) Bodybuilding coach, (2) Booty Builder (women-focused glute/lower body), (3) CrossFit coach, (4) Old School (classic golden era training), (5) Science-Based (evidence-driven programming), (6) Beach Body (six pack / aesthetics focus), (7) Everyday Fitness (general health and wellness), (8) Athletic Functionality (functional movement), (9) Sport-Specific: Basketball, (10) Sport-Specific: Climbing. Use placeholder avatar images for now (user will provide real ones later). Store coach personas in a coaches config/table. Dark neon UI with glassmorphism cards, no emojis.

- [x] Build the coach interview chat flow at app/coach/[coachId]/page.tsx: when user selects a coach, a split-screen layout opens — AI chat on the LEFT, a paper-style intake form on the RIGHT. On MOBILE: chat is full-width, a "View Form" button opens the auto-filling form as a slide-up modal. The AI coach conducts a conversational interview asking about: (1) name, age, height, weight, (2) general and specific athletic history — sport, duration, training style, (3) current fitness goals, (4) available training days per week, session duration, preferred time of day, (5) available equipment and training location (home gym, commercial gym, outdoor, etc.), (6) illness and injury history, medical considerations, (7) current fitness level self-assessment. As the user answers in chat (e.g. "I am 27 years old"), the corresponding field in the right-side form fills in automatically in real-time. The form is also directly editable by the user. Each coach persona has a unique personality and language: John 'The Sculptor' (bodybuilding) talks like an intense gym bro about symmetry and mind-muscle connection. Maya 'Peach Queen' (booty builder) is energetic and empowering about glute activation. Rex 'The Machine' (CrossFit) is competitive and high-energy about WODs. Frank 'Iron Era' (old school) is gruff, no-nonsense, trains like Arnold's era. Dr. Alex 'The Professor' (science-based) is calm and methodical, cites studies. Kai 'Six Pack' (beach body) is fun and motivational about aesthetics. Sam 'The Balance' (everyday fitness) is warm and encouraging about sustainable health. Zara 'The Athlete' (athletic functionality) is sharp and movement-focused. Marcus 'Court King' (basketball) is competitive and basketball-obsessed. Luna 'The Climber' (climbing) is calm and patient about grip strength and body-weight mastery. Save all interview data to the user's profile in Supabase.

- [x] Add body photo upload to the coach interview flow: during the interview, the AI coach asks the user to upload physique photos — front, back, and side views, preferably with minimal clothing and arms out in T-shape. Add a photo upload component within the chat flow that accepts multiple images, shows previews, and stores them in Supabase Storage linked to the user's profile (progress_media table with a type field like 'intake_photo'). The AI coach gives a basic general assessment of the photos (e.g. "I can see you have a solid base, let's focus on building your shoulders and lats for that V-taper") without detailed vision analysis — keep it simple for MVP.

- [x] After the coach interview completes, generate and display the workout plan: the AI coach presents split options (e.g. PPL, Upper/Lower, Full Body, Bro Split) with a recommendation based on the user's answers. Once the user confirms a split, generate a full periodized workout plan with exercises, sets, reps, weights, rest periods, and intensifiers. Display the plan in a structured view below the chat. The plan is a recommendation — the user can edit any exercise, swap exercises, adjust sets/reps/weights. Auto-save the plan to the user's library in Supabase (training_plans table). Commit to alis-branch.

- [x] After workout plan is saved, transition to the dietitian interview within the same coach session: the coach introduces Dr. Nadia 'The Fuel' — a registered dietitian/sports nutritionist persona who joins the same chat thread with her own avatar. She is professional but approachable, explains the science behind nutrition choices, and adapts to any dietary restriction. The dietitian interviews the user about: (1) food allergies and intolerances, (2) dietary preferences — show a list of diet styles (keto, vegan, vegetarian, Mediterranean, paleo, flexible dieting, halal, kosher, etc.) and let the user pick, (3) foods they love, (4) foods they hate, (5) any medical/dietary considerations, (6) meal count per day and cooking preferences. Same split-screen format — chat on left, diet intake form on right filling in as they talk. After interview, generate a full nutrition/meal plan with macros, meals, and recipes. Auto-save to the user's library (nutrition_plans table). Both workout and diet plans are editable by the user at any time.

- [x] Update the workout tab start flow: when the user goes to the Workout tab to start a session, show their saved workout plan for today. Before starting, prompt: "Would you like to enable the real-time form checker? This uses your camera to analyze your form and give feedback during exercises." Toggle on/off. If toggled on, MediaPipe camera overlay activates during exercises. If toggled off, normal guided session without camera. Save the preference for future sessions.

- [x] CRITICAL UI FIX — Color scheme overhaul across the ENTIRE app: the primary accent color must be NEON ORANGE (matching the SHaiPT logo color theme), NOT blue and NOT neon green. Replace ALL blue accent colors (#3B82F6, blue.500, #00d4ff, neon-blue, etc.) and any green accents (#39FF14, neon-green, etc.) with neon orange (#FF6600 or similar vibrant orange from the logo). This applies to: buttons, links, CTAs, borders, glows, gradients, hover states, focus rings, active states, icons, chart accent colors, and any highlighted text. Body text should be WHITE (#FFFFFF or #E5E5E7). Background stays DARK (#15151F). Secondary/muted text can be gray. Update globals.css CSS variables, Chakra UI theme config, and all component files. NO emojis anywhere. Commit to alis-branch.

- [x] Update navigation and user flow consistency: after login/signup, the main dashboard should show two primary paths — "Start Workout" (goes to workout tab with saved plans or empty state prompting to create one via AI Coach) and "AI Coach" (goes to coach selection). The AI Coach tab should be the primary CTA for new users who have no saved plans. Ensure all documents (interview data, photos, workout plans, diet plans) are saved to the database and accessible from the user's profile. Add a "My Library" section in the profile/dashboard showing saved workout plans and diet plans with edit/delete options.

## Phase 8 — Safety & Liability Guardrails (MVP Beta)

- [x] Add mandatory safety protocols to all AI system prompts: AI Coach (chat + interview) must refuse medical diagnoses, detect injury/symptom keywords ("sharp pain," "dizziness," "chest pain," "numbness," "injury," "torn," "fracture," "concussion," "fainted"), stop workout advice for that situation, and advise consulting a healthcare professional. AI Coach must append disclaimer: "I'm an AI coach, not a medical professional. Always consult your doctor for health concerns."

- [x] Add safety protocols to Dr. Nadia dietitian prompts: must identify as AI not licensed medical professional, must never diagnose medical conditions (diabetes, PCOS, IBS, etc.), must warn about sub-1200 kcal plans requiring medical supervision, must append AI disclaimer to interview summary and all nutrition plans.

- [x] Add 1200 kcal minimum floor to nutrition plan generation: AI must never generate a plan below 1200 kcal/day. If client's goals suggest sub-1200 intake, set minimum to 1200 and include warning. Always include AI disclaimer as last nutrition tip. Include condition-specific tip when medical conditions are reported.

- [x] Add mandatory health disclaimer and liability waiver screen before AI coach interview begins: display "Health Disclaimer & Liability Waiver" with key points (not medical advice, consult doctor, exercise at own risk, AI limitations, form analysis disclaimer). Required checkbox to proceed. Store `terms_accepted_at` timestamp in user's Supabase profile. Auto-skip waiver on subsequent visits if already accepted. Supabase migration: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;` — APPLIED.

- [x] Add MediaPipe camera warning in workout UI: when "Form Check" is toggled ON, display a dismissible warning banner: "Computer Vision is for guidance only. Always prioritize safe form and physical comfort over AI feedback." Warning appears once per session, animated entry/exit, dismissible with X button.

## Phase 8 — UI Polish (2026-02-02)

- [x] Add landing page slogan "Don't Just Train. Get SHaiPT" above hero typing animation with orange accent color and Orbitron font
- [x] Update Pro pricing card description to "Start as a Pro for free, because you are a Pro, if you are consistent"
- [x] Apply glassmorphism effect to PillNav header (blur, transparency, glass borders) and mobile BottomTabBar
- [x] Update BottomTabBar accent colors from cyan/blue to orange theme (#FF6600) for consistency with app branding
