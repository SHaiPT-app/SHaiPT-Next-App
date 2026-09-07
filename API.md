# SHaiPT API

Next.js route handlers under `app/api`. Everything below is what exists after the September 2026
rebuild; DATABASE.md describes the tables, TESTERS.md the operations.

## Authentication

Every route takes the Supabase session as `Authorization: Bearer <access token>` and derives the
caller from it with `getUser(request)` in `lib/auth.ts`. No route reads a user id from the query
string or the body to decide *who* is calling; ids in the request name *other* people (a
recipient, a client a trainer looks at) and are checked against the caller's relationships.

- Missing or invalid token → `401 { error: 'Unauthorized' }`.
- Wrong role or not linked → `403 { error }`.
- `auth.supabase` is a client acting as the caller: RLS applies. `getAdmin()` (service role) is
  used only where a route must write for someone else or read the AI bookkeeping tables.
- Browser code uses `apiFetch` / `apiFetchRaw` from `lib/apiClient.ts`, which attaches the token
  and turns errors into `ApiError` with the server's message. A 401 in the browser redirects to
  `/login?next=…`.
- Pages under `/home /ai /plans /workouts /nutrition /body /activity /dms /profile /trainer
  /coach /dashboard /settings /onboarding /workout /feed` are protected by `proxy.ts`, which
  reads the session cookie written by `lib/supabase.ts` (`@supabase/ssr`).

Feature gating: `requireFeatureAccess(request, feature)` in `lib/requireSubscription.ts` returns
`{ userId, subscription, tester }`; `profiles.tester = true` passes every gate (test accounts
never touch Stripe).

## AI routes

All model calls go through `lib/ai/gateway.ts` (`callModel`, `streamModel`). The gateway picks the
model per feature (flash-lite for chat, interviews and summaries; flash for plan and nutrition
generation), caps `maxOutputTokens`, trims chat history to 12 turns, refuses with
`429 { error, reason }` when the caller has used the day's calls or tokens
(`AI_DAILY_CALLS_PER_USER`, `AI_DAILY_TOKENS_PER_USER`) or the month's budget
(`AI_MONTHLY_CAP_USD`) is spent, logs every call to `ai_usage`, and serves identical plan or
nutrition prompts from `ai_cache` for 24 h. Without `GEMINI_API_KEY` outside production (or with
`AI_MOCK=1`) it returns canned responses so tests and the e2e smoke run cost nothing.

| Route | Body | Returns |
|---|---|---|
| `POST /api/ai-coach/chat` | `{ messages: [{role, content}], chatId? }` | streamed `text/plain`; header `X-Chat-Id`; history saved in `ai_chats` |
| `POST /api/ai-coach/interview` | `{ messages, coachId, prefilledFields? }` | `text/plain` reply; header `X-Interview-Complete: true` when done |
| `POST /api/ai-coach/interview` | `{ action: 'extract_form_data', messages }` | `IntakeFormData` JSON |
| `POST /api/ai-coach/dietitian-interview` | `{ messages, previousContext? }` / `{ action: 'extract_form_data', messages }` | as above, `DietIntakeFormData` |
| `POST /api/ai-coach/generate-plan` | `{ action: 'recommend_splits', intakeData?, messages? }` | `{ splits: [{ id, name, description, days_per_week, recommended }] }` |
| `POST /api/ai-coach/generate-plan` | `{ splitType, intakeData?, messages? }` | `{ plan }` (see plan shape) |
| `POST /api/plans/generate` | `{ goals, experience_level, available_equipment, training_days_per_week, injuries_limitations?, duration_weeks?, phase_type?, preferences?, split_type? }` | `{ success, data: { plan } }` |
| `POST /api/onboarding` | `{ messages }` | `{ message, isComplete }` |
| `POST /api/onboarding/generate-plans` | `{ messages }` | `{ success, data: { extracted_profile, training_plan, nutrition_plan: { daily_calories, macros, rationale } } }`; writes `onboarding`, sets `profiles.onboarding_completed` |
| `POST /api/ai-coach/workout-summary` | `{ sessionName, durationMinutes, totalVolume, totalSets, totalReps, weightUnit, exercises, prsAchieved, userGoals? }` | `{ feedback, recommendations[3] }` |
| `POST /api/ai-coach/weekly-insights` | `{ workoutLogs, plannedWorkouts?, previousWeekData?, userGoals? }` | `WeeklyInsight` (cached for the week) |
| `POST /api/ai-coach/plan-adaptation` | `{ workoutLogId, sessionName, exercises, recentWorkouts?, … }` | `{ summary, recommendations, overall_assessment }` |
| `POST /api/nutrition/macro-targets` | `{}` | `{ targets: { daily_calories, protein_g, carbs_g, fat_g, training_phase, rationale } }` (arithmetic, no model) |
| `POST /api/nutrition/generate` | `{ days?, notes? }` | `{ plan }` saved `nutrition_plans` row |
| `POST /api/ai-coach/generate-nutrition-plan` | `{ dietIntakeData, intakeData, messages? }` | `{ plan }` (not saved) |
| `POST /api/grocery-lists/generate` | `{ planId? }` | `{ list }` (no model) |
| `GET /api/admin/usage?month=YYYY-MM` | admin email only (`ADMIN_EMAILS`) | `{ month, spentUsd, capUsd, calls, byFeature, byUser, today }` |

Plan shape (`lib/ai/plans.ts`): `{ name, description, duration_weeks, split_type,
periodization_blocks: [{ phase_type, phase_duration_weeks, label }], sessions: [{ name,
description, day_number, exercises: [{ exercise_id | null, exercise_name, fourd_id | null,
primary_muscles, equipment, sets: [{ reps, weight, rest_seconds }], notes }] }] }`. The model
chooses from ~120 candidates out of the `exercises` table (filtered by the user's equipment and
level); `exercise_id` links to the library and `fourd_id` to the 4Dcoach live coach
(`https://sh-ai-pt-simple.vercel.app/#live=<fourd_id>`).

Meal plan shape (`lib/ai/nutrition.ts`): the stored `NutritionPlan` (`plan_overview`,
`daily_schedule.day_n.{breakfast,lunch,dinner,snacks}` with `ingredients` like `"150 g Chicken,
breast, …"` and computed `nutrition`, `shopping_list` by category, `nutrition_tips` ending with the
disclaimer). The model returns candidate indices and grams; every calorie is computed from
`food_database`.

Removed in the rebuild: `/api/chat`, `/api/ai-coach/diet`, `/api/ai-coach/workout` (duplicate
generators with unbounded output), `/api/ai-coach/photo-assessment` (it wrote assessments of
photos it never received), `/api/verify/*` (phone verification had no provider), `/api/migrate`,
`/api/seed`.

## Data routes

| Route | Methods | Notes |
|---|---|---|
| `/api/invites/check` | POST `{ email }` → `{ allowed }` | public; invite row or `ALLOW_SIGNUP_EMAILS` |
| `/api/plans` | GET, POST, PUT | legacy `workout_plans`; caller must be trainee or trainer of the plan |
| `/api/plan-assignments` | GET, POST | self-assignment or coach → client (`is_coach_of`) |
| `/api/logs` | GET, POST | canonical `workout_logs` + `exercise_logs`, denormalised for the dashboard |
| `/api/workout/start`, `/api/workout/[logId]/set`, `/draft`, `/complete` | POST/PATCH/GET/PUT | the workout logger; drafts by `(user_id, session_id)` |
| `/api/sync/workout` | GET, POST, DELETE | offline sync of drafts |
| `/api/body-measurements` | GET, POST, PUT, DELETE | own rows |
| `/api/progress-media` | GET, POST (multipart `file`), DELETE | bucket `progress-media`, keys `<user id>/…`, signed URLs |
| `/api/food-database` | GET `?q=`, POST | search the seeded foods; user rows carry `created_by` |
| `/api/food-logs` | GET `?date=`, POST, DELETE | daily tracking |
| `/api/grocery-lists` | GET, PATCH, DELETE | |
| `/api/nutrition` | GET | latest nutrition plan |
| `/api/notifications` | GET `?countOnly=`, PATCH `{ notificationId | markAll }` | own only |
| `/api/direct-messages` | GET `?otherUserId=`, POST `{ recipientId, content }` | trigger creates the notification |
| `/api/coaching/request` | POST `{ coachId }` | athlete → coach request (trigger notifies the coach) |
| `/api/coaching/respond` | POST `{ relationshipId, action }` | the other party accepts / declines |
| `/api/coaching/trainers` | GET | trainers listing + the caller's relationships |
| `/api/users/search` | GET `?q=` | profiles, SQL `ilike` |
| `/api/users/link` | POST `{ traineeId, trainerId, action }` | caller must be one side |
| `/api/users/trainees` | GET | the caller's linked trainees |
| `/api/users/features` | POST | trainer toggles `ai_features` for a linked trainee |
| `/api/trainer/clients`, `/alerts`, `/progress?clientId=` | GET | trainer role; `is_coach_of` |
| `/api/consistency/enroll`, `/status`, `/grace-request` | POST/GET/POST | consistency challenge (no phone verification) |
| `/api/subscriptions/status`, `/checkout`, `/webhook` | GET/POST/POST | Stripe, test mode; testers get 403 on checkout |

## Errors

Routes answer JSON `{ error: string }` with a fitting status. Unexpected failures log one line
`[api:<route>] user=<id> req=<id> …` (`lib/log.ts`) and the response carries the same id so a
tester can quote it.

## Environment

See `env.example`: Supabase URL/keys (+ `SUPABASE_DB_URL` for the migration runner),
`GEMINI_API_KEY`, the AI caps, `ALLOW_SIGNUP_EMAILS`, `ADMIN_EMAILS`, `NEXT_PUBLIC_4DCOACH_URL`,
Stripe.
