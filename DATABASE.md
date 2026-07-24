# SHaiPT Database Documentation

This document provides a comprehensive overview of the SHaiPT application database schema, including tables, functions, triggers, and Row Level Security (RLS) policies.

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
| exercise_id | varchar(20) | NO | | FK to exercises.exercise_id |
| step_number | integer | NO | | |
| instruction | text | NO | | |
| created_at | timestamptz | YES | now() | |

### `exercise_logs`
Logs of individual exercises performed within a workout.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| workout_log_id | uuid | NO | | FK to workout_logs.id |
| exercise_id | varchar(20) | NO | | FK to exercises.exercise_id |
| exercise_order | integer | NO | | |
| sets | jsonb | NO | '[]' | Array of set data (reps, weight, etc.) |
| total_sets | integer | YES | | |
| total_reps | integer | YES | | |
| max_weight | numeric | YES | | |
| average_rest_seconds | integer | YES | | |
| notes | text | YES | | |
| created_at | timestamptz | YES | now() | |

### `exercises`
Master catalog of available exercises.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| exercise_id | varchar(20) | NO | | Primary Key (e.g. 'squat') |
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
| gif_url | text | YES | | |
| created_at | timestamptz | YES | now() | |

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
| exercise_id | varchar(20) | NO | | FK to exercises.exercise_id |
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
| workout_privacy | varchar(20) | YES | 'public' | 'public', 'followers', 'private' |
| auto_post_workouts | boolean | YES | true | |
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
| total_duration_seconds | integer | YES | | |
| total_rest_seconds | integer | YES | | |
| total_work_seconds | integer | YES | | |
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

---

## Database Functions

| Function Name | Return Type | Description |
|---------------|-------------|-------------|
| `add_set_to_exercise_log` | void | Updates `sets`, `total_sets`, `total_reps`, `max_weight` in `exercise_logs`. |
| `create_activity_post_on_workout_complete` | trigger | Automatically creates an `activity_posts` entry when a `workout_log` is marked complete, respecting user privacy settings. |
| `handle_new_user` | trigger | Creates a `profiles` entry when a new user signs up via Auth. |
| `notify_coaching_accepted` | trigger | Sends `coaching_accepted` notification. |
| `notify_coaching_request` | trigger | Sends `coaching_request` notification. |
| `notify_new_follower` | trigger | Sends `new_follower` notification. |
| `notify_new_message` | trigger | Sends `new_message` notification. |
| `notify_plan_assigned` | trigger | Sends `plan_assigned` notification. |
| `notify_post_comment` | trigger | Sends `post_comment` notification. |
| `notify_post_like` | trigger | Sends `post_like` notification. |
| `update_last_set_rest` | void | Updates `rest_after_seconds` for the last set in an exercise log. |
| `update_personal_records` | trigger | Checks `exercise_logs` on update/insert to detect if a new PR is achieved. If so, updates `personal_records` and creates a `pr_achieved` activity post. |
| `update_updated_at_column` | trigger | Utility to automatically update `updated_at` column to `now()`. |

---

## Database Triggers

| Table | Trigger Name | Function | Timing | Event |
|-------|--------------|----------|--------|-------|
| `auth.users` | `on_auth_user_created` | `handle_new_user` | AFTER | INSERT/UPDATE |
| `ai_chats` | `update_ai_chats_updated_at` | `update_updated_at_column` | BEFORE | UPDATE |
| `coaching_relationships` | `trigger_notify_coaching_accepted` | `notify_coaching_accepted` | AFTER | UPDATE |
| `coaching_relationships` | `trigger_notify_coaching_request` | `notify_coaching_request` | AFTER | INSERT |
| `coaching_relationships` | `update_coaching_updated_at` | `update_updated_at_column` | BEFORE | UPDATE |
| `direct_messages` | `trigger_notify_new_message` | `notify_new_message` | AFTER | INSERT |
| `exercise_logs` | `trigger_update_prs` | `update_personal_records` | AFTER | INSERT/UPDATE |
| `post_comments` | `trigger_notify_post_comment` | `notify_post_comment` | AFTER | INSERT |
| `post_likes` | `trigger_notify_post_like` | `notify_post_like` | AFTER | INSERT |
| `profiles` | `update_profiles_updated_at` | `update_updated_at_column` | BEFORE | UPDATE |
| `training_plan_assignments` | `trigger_notify_plan_assigned` | `notify_plan_assigned` | AFTER | INSERT |
| `training_plans` | `update_training_plans_updated_at` | `update_updated_at_column` | BEFORE | UPDATE |
| `user_follows` | `trigger_notify_new_follower` | `notify_new_follower` | AFTER | INSERT |
| `workout_logs` | `trigger_create_activity_post` | `create_activity_post_on_workout_complete` | AFTER | UPDATE |
| `workout_sessions` | `update_workout_sessions_updated_at` | `update_updated_at_column` | BEFORE | UPDATE |

---

## Row Level Security (RLS) Policies

All tables have RLS enabled. Policies use a "Permissive" model.

### Key Policies

#### Privacy & Permissions
- **Profiles:** Public profiles are read-only for everyone. Users can edit only their own.
- **Workouts Logs:** 
    - Users can CRUD their own logs.
    - Followers can VIEW logs if user privacy is 'followers'.
    - Public can VIEW logs if user privacy is 'public'.
    - Active coaches can VIEW athlete logs.
- **Activity Posts:**
    - Users can CRUD own posts.
    - Viewable based on `visibility` column ('public', 'followers', 'private').
- **Direct Messages:** Users can only see messages sent by them or to them.

#### Social & Engagement
- **Follows:** Users can manage who they follow. Viewing follows is public.
- **Comments/Likes:** Users can comment/like on any post they are allowed to see.
- **Notifications:** Users can only see and manage their own notifications.

#### Content Management
- **Training Plans:** Users CRUD own. Public plans are viewable by all.
- **Workout Sessions:** Users CRUD own. Public sessions viewable by followed users.
- **Exercises:** (Master data management policies depending on setup, usually read-only for users if system-managed, or CRUD if user-defined).
- **AI Chats:** Strictly private to the user (`user_id = auth.uid()`).
