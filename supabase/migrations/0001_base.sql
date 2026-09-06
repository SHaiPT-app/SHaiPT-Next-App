-- ============================================================================
-- SHaiPT base schema.
--
-- The first Supabase project was built by hand in the dashboard and only described in
-- DATABASE.md. This file recreates those tables (plus the legacy `workout_plans` that
-- app/api/plans still uses) so a fresh project can be built from the repo alone.
-- Everything here is idempotent: run it as often as you like.
-- Order: this file → 0010 … 0130 (see DATABASE.md, "Rebuilding the database").
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Utility functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- profiles (one row per auth.users row; created by the handle_new_user trigger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    username text,
    gender varchar(20),
    date_of_birth date,
    height_cm numeric,
    weight_kg numeric,
    preferred_weight_unit varchar(10) DEFAULT 'lbs',
    timezone varchar(50) DEFAULT 'America/New_York',
    -- private by default: nobody but the user and their coach reads a log unless they opt in
    workout_privacy varchar(20) DEFAULT 'private',
    auto_post_workouts boolean DEFAULT false,
    avatar_url text,
    bio text,
    fitness_goals text[],
    pinned_plan_id uuid,
    allow_unsolicited_messages boolean DEFAULT true,
    role varchar(20) DEFAULT 'trainee',
    specialties text[] DEFAULT '{}',
    availability_status varchar(20) DEFAULT 'available',
    is_accepting_clients boolean DEFAULT true,
    rating numeric(3,2),
    trainer_bio text,
    trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    terms_accepted_at timestamptz,
    ai_features jsonb DEFAULT '{"workout_planner": false, "dietitian": false, "form_checker": false}'::jsonb,
    phone_verified boolean DEFAULT false,
    intake_photos_uploaded boolean DEFAULT false,
    account_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username ON profiles (lower(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_trainer ON profiles (trainer_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Creates the profile when a user signs up. 0110 replaces this with the invite-aware version.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'))
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- exercises + exercise_instructions (master data; seeded by scripts/seed-exercises.ts)
-- exercise_id is text, not varchar(20): the free-exercise-db ids are up to 58 characters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
    exercise_id text PRIMARY KEY,
    name text NOT NULL,
    force varchar(20),
    level varchar(20),
    mechanic varchar(20),
    equipment varchar(50),
    primary_muscles text[] DEFAULT '{}',
    secondary_muscles text[] DEFAULT '{}',
    instructions text[] DEFAULT '{}',
    category varchar(50),
    images text[] DEFAULT '{}',
    gif_url text,
    -- the ExerciseDB-style columns lib/types.ts Exercise uses
    body_parts text[] DEFAULT '{}',
    target_muscles text[] DEFAULT '{}',
    equipments text[] DEFAULT '{}',
    difficulty varchar(20),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (lower(name));
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises USING gin (primary_muscles);

CREATE TABLE IF NOT EXISTS exercise_instructions (
    id serial PRIMARY KEY,
    exercise_id text NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    step_number integer NOT NULL,
    instruction text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (exercise_id, step_number)
);

-- ----------------------------------------------------------------------------
-- Workout definitions: sessions, plans, plan sessions, assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
    tags text[] DEFAULT '{}',
    is_template boolean DEFAULT true,
    is_public boolean DEFAULT true,
    expected_duration_minutes integer,
    rest_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_creator ON workout_sessions (creator_id);
DROP TRIGGER IF EXISTS update_workout_sessions_updated_at ON workout_sessions;
CREATE TRIGGER update_workout_sessions_updated_at BEFORE UPDATE ON workout_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS training_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    duration_weeks integer,
    tags text[] DEFAULT '{}',
    is_template boolean DEFAULT true,
    is_public boolean DEFAULT true,
    is_shareable boolean DEFAULT true,
    phase_type varchar(20),
    phase_duration_weeks integer,
    periodization_blocks jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_plans_creator ON training_plans (creator_id);
DROP TRIGGER IF EXISTS update_training_plans_updated_at ON training_plans;
CREATE TRIGGER update_training_plans_updated_at BEFORE UPDATE ON training_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pinned_plan_id_fkey') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_pinned_plan_id_fkey
            FOREIGN KEY (pinned_plan_id) REFERENCES training_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_plan_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    day_number integer NOT NULL,
    week_number integer,
    is_rest_day boolean DEFAULT false,
    expected_duration_minutes integer
);
CREATE INDEX IF NOT EXISTS idx_training_plan_sessions_plan ON training_plan_sessions (plan_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_sessions_session ON training_plan_sessions (session_id);

CREATE TABLE IF NOT EXISTS training_plan_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_self_assigned boolean DEFAULT false,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_plan_assignments_user ON training_plan_assignments (user_id, is_active);

-- Legacy plan table still used by app/api/plans and components/PlanCreator: one JSON blob per plan.
CREATE TABLE IF NOT EXISTS workout_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainee ON workout_plans (trainee_id);

-- ----------------------------------------------------------------------------
-- Workout execution: logs, exercise logs, personal records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assignment_id uuid REFERENCES training_plan_assignments(id) ON DELETE SET NULL,
    session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    started_at timestamptz,
    finished_at timestamptz,
    completed_at timestamptz,
    total_rest_seconds integer,
    total_duration_seconds integer GENERATED ALWAYS AS (
        CASE WHEN started_at IS NOT NULL AND finished_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (finished_at - started_at))::integer END) STORED,
    total_work_seconds integer GENERATED ALWAYS AS (
        CASE WHEN started_at IS NOT NULL AND finished_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (finished_at - started_at))::integer - COALESCE(total_rest_seconds, 0) END) STORED,
    notes text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs (user_id, date DESC);

CREATE TABLE IF NOT EXISTS exercise_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id uuid NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id text NOT NULL,
    exercise_order integer NOT NULL DEFAULT 0,
    sets jsonb NOT NULL DEFAULT '[]'::jsonb,
    total_sets integer,
    total_reps integer,
    max_weight numeric,
    average_rest_seconds integer,
    rpe numeric CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
    exercise_notes text,
    notes text,
    created_at timestamptz DEFAULT now()
);
-- exercise_id is deliberately not a foreign key: AI plans may name an exercise that is not in
-- the library yet, and a log must never fail because of that.
CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout ON exercise_logs (workout_log_id, exercise_order);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs (exercise_id);

CREATE TABLE IF NOT EXISTS personal_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exercise_id text NOT NULL,
    max_weight numeric,
    max_volume numeric,
    max_reps integer,
    max_reps_weight numeric,
    achieved_at timestamptz NOT NULL DEFAULT now(),
    workout_log_id uuid REFERENCES workout_logs(id) ON DELETE SET NULL,
    exercise_log_id uuid REFERENCES exercise_logs(id) ON DELETE SET NULL,
    is_current boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_personal_records_user ON personal_records (user_id, exercise_id, is_current);

-- Helpers documented in DATABASE.md and used by older clients.
CREATE OR REPLACE FUNCTION add_set_to_exercise_log(p_exercise_log_id uuid, p_set jsonb)
RETURNS void AS $$
BEGIN
    UPDATE exercise_logs
    SET sets = COALESCE(sets, '[]'::jsonb) || jsonb_build_array(p_set),
        total_sets = COALESCE(total_sets, 0) + 1,
        total_reps = COALESCE(total_reps, 0) + COALESCE((p_set ->> 'reps')::integer, 0),
        max_weight = GREATEST(COALESCE(max_weight, 0), COALESCE((p_set ->> 'weight')::numeric, 0))
    WHERE id = p_exercise_log_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_last_set_rest(p_exercise_log_id uuid, p_rest_seconds integer)
RETURNS void AS $$
DECLARE
    n integer;
BEGIN
    SELECT jsonb_array_length(sets) INTO n FROM exercise_logs WHERE id = p_exercise_log_id;
    IF n IS NULL OR n = 0 THEN RETURN; END IF;
    UPDATE exercise_logs
    SET sets = jsonb_set(sets, ARRAY[(n - 1)::text, 'rest_after_seconds'], to_jsonb(p_rest_seconds), true)
    WHERE id = p_exercise_log_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Social: follows, favorites, posts, likes, comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_type varchar(20) NOT NULL,
    item_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS activity_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workout_log_id uuid REFERENCES workout_logs(id) ON DELETE CASCADE,
    post_type varchar(20) NOT NULL,
    content text,
    visibility varchar(20) DEFAULT 'public',
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_posts_user ON activity_posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id uuid NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments (post_id, created_at);

-- ----------------------------------------------------------------------------
-- Coaching, messaging, notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaching_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status varchar(20) DEFAULT 'pending',
    decline_reason text,
    intake_data jsonb,
    requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    can_assign_plans boolean DEFAULT true,
    can_view_workouts boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT coaching_relationships_status_check CHECK (status IN ('pending', 'active', 'declined', 'ended', 'waitlisted')),
    CONSTRAINT coaching_relationships_pair UNIQUE (coach_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_coaching_relationships_coach ON coaching_relationships (coach_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_relationships_athlete ON coaching_relationships (athlete_id, status);
DROP TRIGGER IF EXISTS update_coaching_updated_at ON coaching_relationships;
CREATE TRIGGER update_coaching_updated_at BEFORE UPDATE ON coaching_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS direct_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_direct_messages_pair ON direct_messages (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages (recipient_id, read_at);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type varchar(50) NOT NULL,
    actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    reference_id uuid,
    reference_type varchar(50),
    content text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- Notification triggers (SECURITY DEFINER: they insert rows for *other* users).
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (NEW.following_id, 'new_follower', NEW.follower_id, NEW.follower_id, 'user', 'You have a new follower');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON user_follows;
CREATE TRIGGER trigger_notify_new_follower AFTER INSERT ON user_follows
    FOR EACH ROW EXECUTE FUNCTION notify_new_follower();

CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS trigger AS $$
DECLARE
    owner uuid;
BEGIN
    SELECT user_id INTO owner FROM activity_posts WHERE id = NEW.post_id;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
        VALUES (owner, 'post_like', NEW.user_id, NEW.post_id, 'post', 'Someone liked your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;
CREATE TRIGGER trigger_notify_post_like AFTER INSERT ON post_likes
    FOR EACH ROW EXECUTE FUNCTION notify_post_like();

CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS trigger AS $$
DECLARE
    owner uuid;
BEGIN
    SELECT user_id INTO owner FROM activity_posts WHERE id = NEW.post_id;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
        VALUES (owner, 'post_comment', NEW.user_id, NEW.post_id, 'post', 'Someone commented on your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_comment AFTER INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION notify_post_comment();

-- notify_coaching_request / notify_coaching_accepted / notify_plan_assigned / notify_new_message
-- are defined in 0080 (they were rewritten as SECURITY DEFINER there); the triggers are created here
-- so the base schema is complete even before 0080 runs.
CREATE OR REPLACE FUNCTION notify_coaching_request()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (CASE WHEN NEW.requested_by = NEW.athlete_id THEN NEW.coach_id ELSE NEW.athlete_id END,
            'coaching_request', NEW.requested_by, NEW.id, 'coaching_relationship', 'You have a new coaching request');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_coaching_request ON coaching_relationships;
CREATE TRIGGER trigger_notify_coaching_request AFTER INSERT ON coaching_relationships
    FOR EACH ROW EXECUTE FUNCTION notify_coaching_request();

CREATE OR REPLACE FUNCTION notify_coaching_accepted()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('active', 'declined', 'waitlisted') THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
        VALUES (CASE WHEN NEW.requested_by = NEW.athlete_id THEN NEW.athlete_id ELSE NEW.coach_id END,
                'coaching_accepted',
                CASE WHEN NEW.requested_by = NEW.athlete_id THEN NEW.coach_id ELSE NEW.athlete_id END,
                NEW.id, 'coaching_relationship',
                CASE NEW.status
                    WHEN 'active' THEN 'Your coaching request was accepted!'
                    WHEN 'declined' THEN 'Your coaching request was declined'
                    ELSE 'You have been added to the waitlist' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_coaching_accepted ON coaching_relationships;
CREATE TRIGGER trigger_notify_coaching_accepted AFTER UPDATE ON coaching_relationships
    FOR EACH ROW EXECUTE FUNCTION notify_coaching_accepted();

CREATE OR REPLACE FUNCTION notify_plan_assigned()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_id <> NEW.assigned_by_id THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
        VALUES (NEW.user_id, 'plan_assigned', NEW.assigned_by_id, NEW.id, 'training_plan_assignment', 'You have been assigned a new training plan');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_plan_assigned ON training_plan_assignments;
CREATE TRIGGER trigger_notify_plan_assigned AFTER INSERT ON training_plan_assignments
    FOR EACH ROW EXECUTE FUNCTION notify_plan_assigned();

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (NEW.recipient_id, 'new_message', NEW.sender_id, NEW.id, 'direct_message', 'You have a new message');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON direct_messages;
CREATE TRIGGER trigger_notify_new_message AFTER INSERT ON direct_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- ----------------------------------------------------------------------------
-- AI chat history, progress media
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title text,
    messages jsonb NOT NULL DEFAULT '[]'::jsonb,
    context_type varchar(30) DEFAULT 'coaching',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chats_user ON ai_chats (user_id, updated_at DESC);
DROP TRIGGER IF EXISTS update_ai_chats_updated_at ON ai_chats;
CREATE TRIGGER update_ai_chats_updated_at BEFORE UPDATE ON ai_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS progress_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workout_log_id uuid REFERENCES workout_logs(id) ON DELETE SET NULL,
    media_type varchar(10) NOT NULL,
    storage_path text NOT NULL,
    caption text,
    taken_at timestamptz DEFAULT now(),
    visibility varchar(20) DEFAULT 'private',
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_progress_media_user ON progress_media (user_id, taken_at DESC);

-- ----------------------------------------------------------------------------
-- Row level security. Policies are permissive and OR together; later migrations add the
-- coach-side read policies (0080). Everything defaults to "own rows only".
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_media ENABLE ROW LEVEL SECURITY;

-- Can the current user see this user's activity (public, or followers-only and I follow them)?
CREATE OR REPLACE FUNCTION can_view_activity_of(owner uuid, item_visibility text)
RETURNS boolean AS $$
    SELECT owner = auth.uid()
        OR item_visibility = 'public'
        OR (item_visibility = 'followers' AND EXISTS (
            SELECT 1 FROM user_follows WHERE follower_id = auth.uid() AND following_id = owner));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Can the current user read this training plan? Own, public, or assigned to me.
CREATE OR REPLACE FUNCTION can_view_plan(p_plan_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM training_plans p
        WHERE p.id = p_plan_id
          AND (p.creator_id = auth.uid() OR p.is_public
               OR EXISTS (SELECT 1 FROM training_plan_assignments a WHERE a.plan_id = p.id AND a.user_id = auth.uid())));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- profiles: every signed-in user can read profiles (search, trainer cards, feed); write own.
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- exercises: read-only master data (anon too, so the demo and the landing can use it)
DROP POLICY IF EXISTS "exercises_select" ON exercises;
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (true);
DROP POLICY IF EXISTS "exercise_instructions_select" ON exercise_instructions;
CREATE POLICY "exercise_instructions_select" ON exercise_instructions FOR SELECT USING (true);

-- workout_sessions
DROP POLICY IF EXISTS "workout_sessions_select" ON workout_sessions;
CREATE POLICY "workout_sessions_select" ON workout_sessions FOR SELECT TO authenticated
    USING (creator_id = auth.uid() OR is_public
           OR EXISTS (SELECT 1 FROM training_plan_sessions tps WHERE tps.session_id = workout_sessions.id AND can_view_plan(tps.plan_id)));
DROP POLICY IF EXISTS "workout_sessions_insert_own" ON workout_sessions;
CREATE POLICY "workout_sessions_insert_own" ON workout_sessions FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "workout_sessions_update_own" ON workout_sessions;
CREATE POLICY "workout_sessions_update_own" ON workout_sessions FOR UPDATE TO authenticated USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "workout_sessions_delete_own" ON workout_sessions;
CREATE POLICY "workout_sessions_delete_own" ON workout_sessions FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- training_plans
DROP POLICY IF EXISTS "training_plans_select" ON training_plans;
CREATE POLICY "training_plans_select" ON training_plans FOR SELECT TO authenticated USING (can_view_plan(id));
DROP POLICY IF EXISTS "training_plans_insert_own" ON training_plans;
CREATE POLICY "training_plans_insert_own" ON training_plans FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "training_plans_update_own" ON training_plans;
CREATE POLICY "training_plans_update_own" ON training_plans FOR UPDATE TO authenticated USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "training_plans_delete_own" ON training_plans;
CREATE POLICY "training_plans_delete_own" ON training_plans FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- training_plan_sessions: readable with the plan, writable by the plan's creator
DROP POLICY IF EXISTS "training_plan_sessions_select" ON training_plan_sessions;
CREATE POLICY "training_plan_sessions_select" ON training_plan_sessions FOR SELECT TO authenticated USING (can_view_plan(plan_id));
DROP POLICY IF EXISTS "training_plan_sessions_write" ON training_plan_sessions;
CREATE POLICY "training_plan_sessions_write" ON training_plan_sessions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM training_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM training_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

-- training_plan_assignments: the assignee and the assigner see it; self-assignment is free,
-- coach assignment is added in 0080
DROP POLICY IF EXISTS "training_plan_assignments_select" ON training_plan_assignments;
CREATE POLICY "training_plan_assignments_select" ON training_plan_assignments FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR assigned_by_id = auth.uid());
DROP POLICY IF EXISTS "training_plan_assignments_self_insert" ON training_plan_assignments;
CREATE POLICY "training_plan_assignments_self_insert" ON training_plan_assignments FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND assigned_by_id = auth.uid());
DROP POLICY IF EXISTS "training_plan_assignments_update" ON training_plan_assignments;
CREATE POLICY "training_plan_assignments_update" ON training_plan_assignments FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR assigned_by_id = auth.uid());
DROP POLICY IF EXISTS "training_plan_assignments_delete" ON training_plan_assignments;
CREATE POLICY "training_plan_assignments_delete" ON training_plan_assignments FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR assigned_by_id = auth.uid());

-- workout_plans (legacy): trainee and trainer of the plan
DROP POLICY IF EXISTS "workout_plans_select" ON workout_plans;
CREATE POLICY "workout_plans_select" ON workout_plans FOR SELECT TO authenticated USING (trainee_id = auth.uid() OR trainer_id = auth.uid());
DROP POLICY IF EXISTS "workout_plans_insert" ON workout_plans;
CREATE POLICY "workout_plans_insert" ON workout_plans FOR INSERT TO authenticated WITH CHECK (trainee_id = auth.uid() OR trainer_id = auth.uid());
DROP POLICY IF EXISTS "workout_plans_update" ON workout_plans;
CREATE POLICY "workout_plans_update" ON workout_plans FOR UPDATE TO authenticated USING (trainee_id = auth.uid() OR trainer_id = auth.uid());
DROP POLICY IF EXISTS "workout_plans_delete" ON workout_plans;
CREATE POLICY "workout_plans_delete" ON workout_plans FOR DELETE TO authenticated USING (trainee_id = auth.uid() OR trainer_id = auth.uid());

-- workout_logs: own rows, plus other people's according to their workout_privacy
DROP POLICY IF EXISTS "workout_logs_select" ON workout_logs;
CREATE POLICY "workout_logs_select" ON workout_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid()
           OR can_view_activity_of(user_id, (SELECT workout_privacy FROM profiles WHERE id = workout_logs.user_id)));
DROP POLICY IF EXISTS "workout_logs_insert_own" ON workout_logs;
CREATE POLICY "workout_logs_insert_own" ON workout_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "workout_logs_update_own" ON workout_logs;
CREATE POLICY "workout_logs_update_own" ON workout_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "workout_logs_delete_own" ON workout_logs;
CREATE POLICY "workout_logs_delete_own" ON workout_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- exercise_logs follow their workout_log
CREATE OR REPLACE FUNCTION owns_workout_log(p_log_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM workout_logs WHERE id = p_log_id AND user_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "exercise_logs_select" ON exercise_logs;
CREATE POLICY "exercise_logs_select" ON exercise_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM workout_logs wl WHERE wl.id = workout_log_id));
DROP POLICY IF EXISTS "exercise_logs_write" ON exercise_logs;
CREATE POLICY "exercise_logs_write" ON exercise_logs FOR ALL TO authenticated
    USING (owns_workout_log(workout_log_id)) WITH CHECK (owns_workout_log(workout_log_id));

-- personal_records: own
DROP POLICY IF EXISTS "personal_records_own" ON personal_records;
CREATE POLICY "personal_records_own" ON personal_records FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- social
DROP POLICY IF EXISTS "user_follows_select" ON user_follows;
CREATE POLICY "user_follows_select" ON user_follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "user_follows_write" ON user_follows;
CREATE POLICY "user_follows_write" ON user_follows FOR ALL TO authenticated
    USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "user_favorites_own" ON user_favorites;
CREATE POLICY "user_favorites_own" ON user_favorites FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_posts_select" ON activity_posts;
CREATE POLICY "activity_posts_select" ON activity_posts FOR SELECT TO authenticated
    USING (can_view_activity_of(user_id, visibility));
DROP POLICY IF EXISTS "activity_posts_write" ON activity_posts;
CREATE POLICY "activity_posts_write" ON activity_posts FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_likes_write" ON post_likes;
CREATE POLICY "post_likes_write" ON post_likes FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_comments_select" ON post_comments;
CREATE POLICY "post_comments_select" ON post_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_comments_write" ON post_comments;
CREATE POLICY "post_comments_write" ON post_comments FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- coaching_relationships: both parties read; either party may create a request; both may update
-- (accept, decline, end). 0080 adds the coach-specific policies on top.
DROP POLICY IF EXISTS "coaching_relationships_select" ON coaching_relationships;
CREATE POLICY "coaching_relationships_select" ON coaching_relationships FOR SELECT TO authenticated
    USING (coach_id = auth.uid() OR athlete_id = auth.uid());
DROP POLICY IF EXISTS "coaching_relationships_insert" ON coaching_relationships;
CREATE POLICY "coaching_relationships_insert" ON coaching_relationships FOR INSERT TO authenticated
    WITH CHECK (requested_by = auth.uid() AND (coach_id = auth.uid() OR athlete_id = auth.uid()));
DROP POLICY IF EXISTS "coaching_relationships_update" ON coaching_relationships;
CREATE POLICY "coaching_relationships_update" ON coaching_relationships FOR UPDATE TO authenticated
    USING (coach_id = auth.uid() OR athlete_id = auth.uid());

-- direct_messages
DROP POLICY IF EXISTS "direct_messages_select" ON direct_messages;
CREATE POLICY "direct_messages_select" ON direct_messages FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());
DROP POLICY IF EXISTS "direct_messages_insert" ON direct_messages;
CREATE POLICY "direct_messages_insert" ON direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "direct_messages_update" ON direct_messages;
CREATE POLICY "direct_messages_update" ON direct_messages FOR UPDATE TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- notifications: own; inserts come from the SECURITY DEFINER triggers or the service role
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ai_chats: strictly private
DROP POLICY IF EXISTS "ai_chats_own" ON ai_chats;
CREATE POLICY "ai_chats_own" ON ai_chats FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- progress_media: own (coach read added in 0080)
DROP POLICY IF EXISTS "progress_media_own" ON progress_media;
CREATE POLICY "progress_media_own" ON progress_media FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
