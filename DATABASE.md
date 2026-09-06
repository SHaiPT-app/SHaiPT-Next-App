# SHaiPT Database

Supabase Postgres. The schema lives in `supabase/migrations/*.sql` and is applied by
`scripts/migrate.ts`; nothing is created by hand in the dashboard any more. Every file is
idempotent, so re-running the whole set on an existing project is safe.

## Rebuilding the database from scratch

1. Create the Supabase project (dashboard). Put the URL, anon key and service role key in
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) and the Postgres connection string in `SUPABASE_DB_URL`
   (Project Settings → Database → Connection string, "Transaction" pooler or direct).
2. `pnpm db:migrate` — applies the files below in name order and records them in
   `public.schema_migrations`. `pnpm db:migrate -- --status` lists what is applied,
   `-- --force` re-applies everything.
3. `pnpm db:seed:exercises` — ~870 exercises from free-exercise-db (public domain) with the
   4Dcoach mapping (`fourd_id`).
4. `pnpm db:seed:foods` — ~440 USDA Foundation Foods (public domain), macros per 100 g.
5. `pnpm db:rls-check` — creates three throw-away users and asserts the row-level security
   (a stranger reads nothing, a linked coach reads the trainee's logs). Must print
   `RLS check green`.
6. `pnpm db:test-users -- friend@example.com` — tester accounts (see TESTERS.md).

Local dry run without Supabase: `pnpm db:local` starts `postgres:17` in Docker on port 55432,
then `SUPABASE_DB_URL=postgres://postgres:postgres@localhost:55432/postgres pnpm db:migrate -- --auth-stub`
applies `scripts/local/auth-stub.sql` (a stand-in for the `auth` schema, the API roles and
`storage`) before the migrations. The seeders and the RLS check need the real project (they go
through the Supabase HTTP API).

### Migration files, in order

| File | What it does |
|---|---|
| `0001_base.sql` | The original dashboard-built schema, reconstructed: profiles, exercises, exercise_instructions, workout_sessions, training_plans, training_plan_sessions, training_plan_assignments, workout_plans (legacy), workout_logs, exercise_logs, personal_records, user_follows, user_favorites, activity_posts, post_likes, post_comments, coaching_relationships, direct_messages, notifications, ai_chats, progress_media; `handle_new_user`, the notification triggers, `update_updated_at_column`, RLS on all of them. |
| `0010_workout_plans_metadata.sql` | `workout_plans.assigned_at / expires_at` (was `migration.sql`). |
| `0020_subscriptions.sql` | `subscriptions` + the 14-day trial trigger on profiles. |
| `0030_workout_tracking.sql` | `phone_verifications`, `consistency_challenges`, `consistency_logs`, `user_preferences`, `workout_drafts`; columns on training_plan_sessions, workout_sessions, exercise_logs, subscriptions, profiles. |
| `0040_ai_features_flag.sql` | `profiles.ai_features`. |
| `0050_nutrition_plans.sql` | `nutrition_plans`. |
| `0060_food_tracking.sql` | `food_database`, `food_logs`, `grocery_lists`, 25 starter foods. |
| `0070_human_trainer.sql` | trainer columns on profiles, coaching status check. |
| `0080_trigger_security_and_coach_policies.sql` | `is_coach_of()`, coach read policies on profiles, workout_logs, exercise_logs, body_measurements, progress_media, plan assignments; notification policies. |
| `0090_undocumented_tables.sql` | Tables the code used but nothing created: `onboarding`, `coach_interviews`, `body_measurements`, `body_weight_logs`, `user_stats`, `user_stats_history`; `recompute_user_stats()` (trigger on completed workouts), `get_recent_stats()`, `increment_phone_verification_attempts()`. |
| `0100_exercise_library.sql` | `exercises.slug / source / fourd_id / is_fourd_primary`. |
| `0110_invites_and_testers.sql` | `invites`, `profiles.tester / onboarding_completed`, the invite-aware `handle_new_user`. |
| `0120_ai_usage.sql` | `ai_usage`, `ai_budget`, `ai_cache`, `ai_usage_today()` for the AI gateway. |
| `0130_storage_progress_media.sql` | private bucket `progress-media` with per-user folder policies. |
| `0140_food_database_source.sql` | `food_database.source / source_id` so the USDA seed can upsert. |

Dependencies: 0030 alters `subscriptions` (0020) and 0060 references `nutrition_plans` (0050);
0130 uses `is_coach_of` from 0080. The runner applies them in name order, which satisfies all of
that. When you change a file, re-run `pnpm db:migrate -- --force`.

### Conventions

- Every table has RLS enabled. Policies are permissive and OR together: "own rows" in 0001/0030/0050/0060/0090, coach access in 0080. Service-role clients (`lib/supabaseDb.ts` admin, the scripts) bypass RLS.
- `auth.uid()` is the user; API routes pass the user's Bearer token to a Supabase client, so they run under RLS as that user unless they deliberately use the service role.
- Functions that insert on behalf of another user (notifications, stats) are `SECURITY DEFINER` with `search_path = public`.
- Timestamps are `timestamptz`; ids are `uuid` with `gen_random_uuid()`; exercise ids are `text` (free-exercise-db ids, up to 58 characters).
- `exercise_logs.exercise_id` and `personal_records.exercise_id` are not foreign keys: a generated plan may name an exercise the library does not have and logging must never fail because of it.

## Tables

### `activity_posts`
Stores social feed posts (workout completions, PRs).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | FK to profiles.id |
| workout_log_id | uuid | YES | | FK to workout_logs.id |
| post_type | varchar(20) | NO | | 'workout_completed', 'pr_achieved' |
| content | text | YES | | content of the post |
| visibility | varchar(20) | YES | 'public' | 'public', 'followers', 'private' |
| created_at | timestamptz | YES | now() | |

### `ai_chats`
Stores chat history with the AI Coach.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | FK to profiles.id |
| title | text | YES | | Conversation title |
| messages | jsonb | NO | '[]' | History of messages (user & assistant) |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### `coaching_relationships`
Manages coach-athlete connections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| coach_id | uuid | NO | | FK to profiles.id (Coach) |
| athlete_id | uuid | NO | | FK to profiles.id (Athlete) |
| status | varchar(20) | YES | 'pending' | 'pending', 'active', 'declined', 'ended', 'waitlisted' |
| decline_reason | text | YES | | Reason for declining a request |
| intake_data | jsonb | YES | | Athlete's intake form data shared with coach |
| requested_by | uuid | NO | | FK to profiles.id |
| can_assign_plans | boolean | YES | true | Permissions |
| can_view_workouts | boolean | YES | true | Permissions |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### `direct_messages`
Stores private messages between users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| sender_id | uuid | NO | | FK to profiles.id |
| recipient_id | uuid | NO | | FK to profiles.id |
| content | text | NO | | |
| read_at | timestamptz | YES | | |
| created_at | timestamptz | YES | now() | |

### `exercise_instructions`
Specific step-by-step instructions for exercises.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval | Primary Key |
| exercise_id | text | NO | | FK to exercises.exercise_id (unique with step_number) |
| step_number | integer | NO | | |
| instruction | text | NO | | |
| created_at | timestamptz | YES | now() | |

### `exercise_logs`
Logs of individual exercises performed within a workout.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| workout_log_id | uuid | NO | | FK to workout_logs.id |
| exercise_id | text | NO | | exercise id (no FK: an AI plan may name an exercise the library lacks) |
| exercise_order | integer | NO | | |
| sets | jsonb | NO | '[]' | Array of set data (reps, weight, etc.) |
| total_sets | integer | YES | | |
| total_reps | integer | YES | | |
| max_weight | numeric | YES | | |
| average_rest_seconds | integer | YES | | |
| rpe | numeric | YES | | 1–10 |
| exercise_notes, notes | text | YES | | |
| created_at | timestamptz | YES | now() | |

### `exercises`
Master catalog of available exercises.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| exercise_id | text | NO | | Primary Key: the free-exercise-db id (e.g. `Barbell_Squat`) |
| name | text | NO | | Display name |
| force | varchar(20) | YES | | push, pull, static |
| level | varchar(20) | YES | | beginner, intermediate, expert |
| mechanic | varchar(20) | YES | | compound, isolation |
| equipment | varchar(50) | YES | | barbell, dumbbell, etc. |
| primary_muscles | ARRAY | YES | | |
| secondary_muscles | ARRAY | YES | | |
| instructions | ARRAY | YES | | Legacy array of instructions |
| category | varchar(50) | YES | | strength, cardio, etc. |
| images | ARRAY | YES | | |
| gif_url | text | YES | | full URL of the first image |
| body_parts, target_muscles, equipments | text[] | YES | | ExerciseDB-style mirrors of the columns above (lib/types.ts `Exercise`) |
| difficulty | varchar(20) | YES | | = level |
| slug | text | YES | | URL-safe name, unique |
| source | text | YES | 'shaipt' | 'free-exercise-db' for seeded rows |
| fourd_id | text | YES | | 4Dcoach exercise this maps to (bench, squat, deadlift, lateral-raise, curl, bw-squat, pushup, crunch, plank, pullup, hip-thrust) |
| is_fourd_primary | boolean | NO | false | the canonical row per fourd_id |
| created_at / updated_at | timestamptz | YES | now() | |

### `notifications`
User notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | Recipient |
| type | varchar(50) | NO | | 'new_follower', 'post_like', etc. |
| actor_id | uuid | YES | | Who triggered it |
| reference_id | uuid | YES | | ID of related object |
| reference_type | varchar(50) | YES | | 'post', 'comment', 'user' |
| content | text | YES | | Display text |
| is_read | boolean | YES | false | |
| created_at | timestamptz | YES | now() | |

### `personal_records`
Tracks max weight, reps, etc. for exercises.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | FK to profiles.id |
| exercise_id | text | NO | | exercise id |
| max_weight | numeric | YES | | |
| max_volume | numeric | YES | | |
| max_reps | integer | YES | | |
| max_reps_weight | numeric | YES | | Weight used for max reps |
| achieved_at | timestamptz | NO | | |
| workout_log_id | uuid | YES | | FK to workout_logs.id |
| exercise_log_id | uuid | YES | | FK to exercise_logs.id |
| is_current | boolean | YES | true | True if this is the current ALL TIME best |
| notes | text | YES | | |
| created_at | timestamptz | YES | now() | |

### `post_comments`
Comments on activity posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| post_id | uuid | NO | | FK to activity_posts.id |
| user_id | uuid | NO | | FK to profiles.id |
| content | text | NO | | |
| created_at | timestamptz | YES | now() | |

### `post_likes`
Likes on activity posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| post_id | uuid | NO | | FK to activity_posts.id (Composite PK) |
| user_id | uuid | NO | | FK to profiles.id (Composite PK) |
| created_at | timestamptz | YES | now() | |

### `profiles`
User profiles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | | Primary Key (references auth.users) |
| email | text | NO | | |
| full_name | text | YES | | |
| username | text | YES | | |
| gender | varchar(20) | YES | | |
| date_of_birth | date | YES | | |
| height_cm | numeric | YES | | |
| weight_kg | numeric | YES | | |
| preferred_weight_unit | varchar(10) | YES | 'lbs' | 'lbs' or 'kg' |
| timezone | varchar(50) | YES | 'America/New_York' | |
| workout_privacy | varchar(20) | YES | 'private' | 'public', 'followers', 'private' (private by default since the rebuild) |
| auto_post_workouts | boolean | YES | false | |
| avatar_url | text | YES | | |
| bio | text | YES | | |
| fitness_goals | ARRAY | YES | | |
| pinned_plan_id | uuid | YES | | FK to training_plans.id |
| allow_unsolicited_messages | boolean | YES | true | |
| role | varchar(20) | YES | 'trainee' | 'trainer' or 'trainee' |
| specialties | TEXT[] | YES | '{}' | Trainer specialties |
| availability_status | varchar(20) | YES | 'available' | Trainer availability |
| is_accepting_clients | boolean | YES | true | Whether trainer accepts new clients |
| rating | numeric(3,2) | YES | | Trainer rating (e.g. 4.90) |
| trainer_bio | text | YES | | Extended trainer biography |
| trainer_id | uuid | YES | | FK to profiles.id, the linked trainer (api/users/link) |
| terms_accepted_at | timestamptz | YES | | |
| ai_features | jsonb | YES | all false | per-user AI feature switches (api/users/features) |
| phone_verified, intake_photos_uploaded, account_completed | boolean | YES | false | account completion flags |
| tester | boolean | NO | false | test account: full feature access without Stripe |
| onboarding_completed | boolean | NO | false | set when the onboarding interview produced a plan |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### `progress_media`
Photos or videos tracking physical progress.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | FK to profiles.id |
| workout_log_id | uuid | YES | | Optional link to workout |
| media_type | varchar(10) | NO | | 'image', 'video' |
| storage_path | text | NO | | Path in storage bucket |
| caption | text | YES | | |
| taken_at | timestamptz | YES | now() | |
| visibility | varchar(20) | YES | 'private' | |
| created_at | timestamptz | YES | now() | |

### `training_plan_assignments`
Tracks who is assigned to which plan and status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| plan_id | uuid | NO | | FK to training_plans.id |
| user_id | uuid | NO | | FK to profiles.id (Assignee) |
| assigned_by_id | uuid | NO | | FK to profiles.id (Assigner) |
| is_self_assigned | boolean | YES | false | |
| start_date | date | NO | | |
| end_date | date | NO | | |
| is_active | boolean | YES | true | |
| created_at | timestamptz | YES | now() | |

### `training_plan_sessions`
Links Workouts to Plans (defines the schedule).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| plan_id | uuid | NO | | FK to training_plans.id |
| session_id | uuid | NO | | FK to workout_sessions.id |
| day_number | integer | NO | | Day 1-7 (Weekly cycle) |
| week_number | integer | YES | | Optional multi-week support |
| is_rest_day | boolean | YES | false | |
| expected_duration_minutes | integer | YES | | |

### `training_plans`
Top-level container for a program (e.g., "PPL Split").

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| creator_id | uuid | NO | | FK to profiles.id |
| name | text | NO | | |
| description | text | YES | | |
| duration_weeks | integer | YES | | |
| tags | ARRAY | YES | | |
| is_template | boolean | YES | true | |
| is_public | boolean | YES | true | |
| is_shareable | boolean | YES | true | |
| phase_type | varchar(20) | YES | | hypertrophy, strength, endurance, deload, power, general |
| phase_duration_weeks | integer | YES | | |
| periodization_blocks | jsonb | YES | | |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### `user_favorites`
Users bookmarking items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | NO | | FK to profiles.id |
| item_type | varchar(20) | NO | | 'exercise', 'plan', etc. |
| item_id | uuid | NO | | ID of the item |
| created_at | timestamptz | YES | now() | |

### `user_follows`
Social graph.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| follower_id | uuid | NO | | FK to profiles.id |
| following_id | uuid | NO | | FK to profiles.id |
| created_at | timestamptz | YES | now() | |

### `workout_logs`
A completed or active workout instance.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | | FK to profiles.id |
| assignment_id | uuid | YES | | FK to training_plan_assignments.id |
| session_id | uuid | YES | | FK to workout_sessions.id |
| date | date | NO | CURRENT_DATE | |
| started_at | timestamptz | YES | | |
| finished_at | timestamptz | YES | | |
| completed_at | timestamptz | YES | | Marks final completion |
| total_duration_seconds | integer | YES | | generated from started_at/finished_at |
| total_rest_seconds | integer | YES | | |
| total_work_seconds | integer | YES | | generated: duration − total_rest_seconds |
| notes | text | YES | | |
| created_at | timestamptz | YES | now() | |

### `workout_sessions`
Definition of a single workout day (e.g., "Push Day").

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| creator_id | uuid | NO | | FK to profiles.id |
| name | text | NO | | |
| description | text | YES | | |
| exercises | jsonb | NO | '[]' | List of exercises to do |
| tags | ARRAY | YES | | |
| is_template | boolean | YES | true | |
| is_public | boolean | YES | true | |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### `workout_plans` (legacy)
One JSON blob per plan, still used by `app/api/plans` and `components/PlanCreator`. New code uses `training_plans` + `training_plan_sessions`.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| trainee_id, trainer_id | uuid | FK profiles |
| name, description | text | |
| exercises | jsonb | the sessions array |
| assigned_at, expires_at | timestamptz | |
| is_active | boolean | |
| created_at, updated_at | timestamptz | |

### `subscriptions`
One row per user (unique `user_id`), created by trigger with a 14-day `trialing` starter tier. Testers bypass it through `profiles.tester`.
Columns: `stripe_customer_id`, `stripe_subscription_id`, `tier` (starter/pro/elite), `status` (trialing/active/canceled/past_due/incomplete), `trial_start`, `trial_end`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `earned_via_consistency`, `consistency_challenge_id`, `pro_lost_at`, `pro_regain_streak_start`.

### `phone_verifications`, `consistency_challenges`, `consistency_logs`, `user_preferences`, `workout_drafts`
From `0030_workout_tracking.sql`. Unique keys the upserts rely on: `phone_verifications(user_id)`, `consistency_logs(user_id, date)`, `user_preferences(user_id)` (PK), `workout_drafts(user_id, session_id)`.

### `nutrition_plans`
`user_id`, `name`, `dietary_preferences text[]`, `plan_overview jsonb`, `daily_schedule jsonb`, `shopping_list jsonb`, `nutrition_tips text[]`.

### `food_database`
Per-serving macros. Seeded rows have `serving_size = 100`, `serving_unit = 'g'`, `is_verified = true`, `source = 'usda-foundation'`, `source_id = 'usda:<fdc_id>'`. Unique on `source_id` and on `(lower(name), coalesce(brand, ''))`. Users may add their own rows (`created_by`).

### `food_logs`, `grocery_lists`
From `0060_food_tracking.sql`, own rows only.

### `onboarding`
One row per completed onboarding interview: `fitness_goals`, `experience_level`, `available_equipment`, `training_frequency`, `injuries_limitations`, `dietary_preferences`, `answers jsonb`, `completed_at`.

### `coach_interviews`
Per-coach intake (`user_id`, `coach_id text`, unique together): `intake_data jsonb`, `chat_messages jsonb`, `is_complete`.

### `body_measurements`, `body_weight_logs`
Measurements per `(user_id, date)`; a trigger mirrors `weight_kg` into `body_weight_logs(date, weight)` for the analytics page.

### `user_stats`, `user_stats_history`
Aggregates recomputed by `recompute_user_stats(user_id)` whenever a `workout_logs` row gets `completed_at`: totals, streaks, last 7/30 days, and one history row per workout day (90 days). Read-only for users.

### `invites`
`email` (lower-case, unique), `role`, `invited_by`, `note`, `used_at`, `used_by`. Service role only. `handle_new_user` marks the profile `tester = true` when the sign-up email has an unused invite.

### `ai_usage`, `ai_budget`, `ai_cache`
Written by `lib/ai/gateway.ts` with the service role. `ai_usage`: one row per model call (`user_id`, `feature`, `model`, `input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd`, `cache_hit`, `status`, `latency_ms`). A trigger adds each row to `ai_budget` (`month` 'YYYY-MM', `spent_usd`, `cap_usd`, `calls`). `ai_cache` keys a JSON response by a prompt hash with `expires_at`. `ai_usage_today(user_id)` returns today's calls and tokens for the per-user daily limit. Users can read their own `ai_usage`; the other two are service-role only.

## Functions

| Function | Kind | Notes |
|---|---|---|
| `update_updated_at_column()` | trigger | sets `updated_at` on profiles, workout_sessions, training_plans, coaching_relationships, ai_chats, nutrition_plans, coach_interviews, body_measurements, exercises |
| `handle_new_user()` | trigger on `auth.users` | creates the profile; reads `invites` (0110) |
| `create_trial_subscription()` | trigger on profiles | 14-day starter trial |
| `notify_new_follower / notify_post_like / notify_post_comment / notify_coaching_request / notify_coaching_accepted / notify_plan_assigned / notify_new_message` | triggers, SECURITY DEFINER | rows in `notifications`; the coaching ones notify whichever side did not send the request |
| `is_coach_of(uuid)` | RLS helper | active coaching relationship from `auth.uid()` to the given user |
| `can_view_activity_of(uuid, text)`, `can_view_plan(uuid)`, `owns_workout_log(uuid)` | RLS helpers | |
| `add_set_to_exercise_log(uuid, jsonb)`, `update_last_set_rest(uuid, int)` | helpers | documented in the first schema, kept |
| `sets_volume_kg(jsonb)`, `recompute_user_stats(uuid)`, `trigger_recompute_user_stats()` | stats | |
| `get_recent_stats(uuid, int)`, `increment_phone_verification_attempts(uuid)` | RPC | called with `.rpc()` |
| `ai_usage_add_to_budget()`, `ai_usage_today(uuid)` | AI gateway | |
| `sync_body_weight_log()` | trigger | body_measurements → body_weight_logs |

Not recreated from the old schema: `create_activity_post_on_workout_complete` and
`update_personal_records`. The app writes activity posts and personal records itself
(`hooks/useWorkout.ts`, the workout page); a trigger would double them.

## Row level security, in one paragraph

A signed-in user reads every profile (search, trainer cards) and every exercise, and otherwise
only their own rows: logs, exercise logs, records, chats, plans, nutrition, food logs,
measurements, drafts, preferences, notifications, messages they sent or received, media. Public
training plans and workout sessions are readable by all; a plan assigned to you is readable too.
Other users' workout logs and posts are visible only when that user's `workout_privacy` /
post `visibility` is `public`, or `followers` and you follow them — the default is `private`.
A trainer with an *active* `coaching_relationships` row reads the trainee's profile, workout
logs, exercise logs, body measurements, progress media and plan assignments, and may assign
plans; never their AI chats. `invites`, `ai_budget`, `ai_cache` and `schema_migrations` are
service-role only. `scripts/rls-check.ts` asserts all of this against the live project.
