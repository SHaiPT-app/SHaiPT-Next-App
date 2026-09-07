-- Tables the code reads that were never in DATABASE.md or a migration file:
-- onboarding, coach_interviews, body_measurements, body_weight_logs, user_stats,
-- user_stats_history, and the two RPCs (increment_phone_verification_attempts, get_recent_stats).

-- Onboarding answers (api/onboarding/generate-plans writes one row per completed interview)
CREATE TABLE IF NOT EXISTS onboarding (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fitness_goals text[] DEFAULT '{}',
    experience_level text,
    available_equipment text[] DEFAULT '{}',
    training_frequency integer,
    injuries_limitations text[] DEFAULT '{}',
    dietary_preferences text[] DEFAULT '{}',
    answers jsonb DEFAULT '{}'::jsonb,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding (user_id, created_at DESC);

-- Per-coach intake interviews (app/coach/[coachId])
CREATE TABLE IF NOT EXISTS coach_interviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id text NOT NULL,
    intake_data jsonb DEFAULT '{}'::jsonb,
    chat_messages jsonb DEFAULT '[]'::jsonb,
    is_complete boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, coach_id)
);
DROP TRIGGER IF EXISTS update_coach_interviews_updated_at ON coach_interviews;
CREATE TRIGGER update_coach_interviews_updated_at BEFORE UPDATE ON coach_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Body measurements (api/body-measurements)
CREATE TABLE IF NOT EXISTS body_measurements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    weight_kg numeric,
    body_fat_percentage numeric,
    neck_cm numeric,
    shoulders_cm numeric,
    chest_cm numeric,
    left_bicep_cm numeric,
    right_bicep_cm numeric,
    waist_cm numeric,
    hips_cm numeric,
    left_thigh_cm numeric,
    right_thigh_cm numeric,
    left_calf_cm numeric,
    right_calf_cm numeric,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, date)
);
DROP TRIGGER IF EXISTS update_body_measurements_updated_at ON body_measurements;
CREATE TRIGGER update_body_measurements_updated_at BEFORE UPDATE ON body_measurements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Simple weight log read by the analytics page (kept in step with body_measurements by trigger)
CREATE TABLE IF NOT EXISTS body_weight_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    weight numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, date)
);

CREATE OR REPLACE FUNCTION sync_body_weight_log()
RETURNS trigger AS $$
BEGIN
    IF NEW.weight_kg IS NOT NULL THEN
        INSERT INTO body_weight_logs (user_id, date, weight)
        VALUES (NEW.user_id, NEW.date, NEW.weight_kg)
        ON CONFLICT (user_id, date) DO UPDATE SET weight = EXCLUDED.weight;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_sync_body_weight_log ON body_measurements;
CREATE TRIGGER trigger_sync_body_weight_log AFTER INSERT OR UPDATE ON body_measurements
    FOR EACH ROW EXECUTE FUNCTION sync_body_weight_log();

-- Aggregated stats (components/AnalyticsDashboard). Recomputed by recompute_user_stats().
CREATE TABLE IF NOT EXISTS user_stats (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_workouts integer DEFAULT 0,
    total_sets integer DEFAULT 0,
    total_reps integer DEFAULT 0,
    total_volume_kg numeric DEFAULT 0,
    total_workout_minutes integer DEFAULT 0,
    current_streak_days integer DEFAULT 0,
    longest_streak_days integer DEFAULT 0,
    last_workout_date date,
    muscle_group_volumes jsonb DEFAULT '{}'::jsonb,
    muscle_group_sets jsonb DEFAULT '{}'::jsonb,
    last_30_days_volume numeric DEFAULT 0,
    last_7_days_workouts integer DEFAULT 0,
    last_calculated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_stats_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    total_volume_kg numeric DEFAULT 0,
    total_sets integer DEFAULT 0,
    total_reps integer DEFAULT 0,
    total_workouts integer DEFAULT 0,
    workout_minutes integer DEFAULT 0,
    muscle_group_volumes jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Volume in kg of one exercise_logs.sets array (weights in lbs are converted).
CREATE OR REPLACE FUNCTION sets_volume_kg(p_sets jsonb)
RETURNS numeric AS $$
    SELECT COALESCE(SUM(
        COALESCE((s ->> 'reps')::numeric, 0) *
        COALESCE((s ->> 'weight')::numeric, 0) *
        CASE WHEN s ->> 'weight_unit' = 'lbs' THEN 0.45359237 ELSE 1 END), 0)
    FROM jsonb_array_elements(COALESCE(p_sets, '[]'::jsonb)) s
    WHERE COALESCE((s ->> 'is_warmup')::boolean, false) = false;
$$ LANGUAGE sql IMMUTABLE;

-- Recompute user_stats and today's user_stats_history row for one user.
CREATE OR REPLACE FUNCTION recompute_user_stats(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_total_workouts integer;
    v_total_sets integer;
    v_total_reps integer;
    v_total_volume numeric;
    v_total_minutes integer;
    v_last_date date;
    v_last30 numeric;
    v_last7 integer;
    v_streak integer := 0;
    v_longest integer := 0;
    v_prev date := NULL;
    r record;
    run integer := 0;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(total_duration_seconds) / 60, 0)::integer, MAX(date)
      INTO v_total_workouts, v_total_minutes, v_last_date
      FROM workout_logs WHERE user_id = p_user_id AND completed_at IS NOT NULL;

    SELECT COALESCE(SUM(el.total_sets), 0), COALESCE(SUM(el.total_reps), 0), COALESCE(SUM(sets_volume_kg(el.sets)), 0)
      INTO v_total_sets, v_total_reps, v_total_volume
      FROM exercise_logs el JOIN workout_logs wl ON wl.id = el.workout_log_id
     WHERE wl.user_id = p_user_id AND wl.completed_at IS NOT NULL;

    SELECT COALESCE(SUM(sets_volume_kg(el.sets)), 0) INTO v_last30
      FROM exercise_logs el JOIN workout_logs wl ON wl.id = el.workout_log_id
     WHERE wl.user_id = p_user_id AND wl.completed_at IS NOT NULL AND wl.date >= CURRENT_DATE - 30;

    SELECT COUNT(*) INTO v_last7 FROM workout_logs
     WHERE user_id = p_user_id AND completed_at IS NOT NULL AND date >= CURRENT_DATE - 7;

    -- streaks: consecutive calendar days with a completed workout
    FOR r IN SELECT DISTINCT date FROM workout_logs WHERE user_id = p_user_id AND completed_at IS NOT NULL ORDER BY date LOOP
        IF v_prev IS NOT NULL AND r.date = v_prev + 1 THEN run := run + 1; ELSE run := 1; END IF;
        v_longest := GREATEST(v_longest, run);
        v_prev := r.date;
    END LOOP;
    IF v_prev IS NOT NULL AND v_prev >= CURRENT_DATE - 1 THEN v_streak := run; END IF;

    INSERT INTO user_stats (user_id, total_workouts, total_sets, total_reps, total_volume_kg, total_workout_minutes,
                            current_streak_days, longest_streak_days, last_workout_date, last_30_days_volume,
                            last_7_days_workouts, last_calculated_at, updated_at)
    VALUES (p_user_id, v_total_workouts, v_total_sets, v_total_reps, v_total_volume, v_total_minutes,
            v_streak, v_longest, v_last_date, v_last30, v_last7, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET
        total_workouts = EXCLUDED.total_workouts, total_sets = EXCLUDED.total_sets, total_reps = EXCLUDED.total_reps,
        total_volume_kg = EXCLUDED.total_volume_kg, total_workout_minutes = EXCLUDED.total_workout_minutes,
        current_streak_days = EXCLUDED.current_streak_days, longest_streak_days = EXCLUDED.longest_streak_days,
        last_workout_date = EXCLUDED.last_workout_date, last_30_days_volume = EXCLUDED.last_30_days_volume,
        last_7_days_workouts = EXCLUDED.last_7_days_workouts, last_calculated_at = now(), updated_at = now();

    INSERT INTO user_stats_history (user_id, date, total_volume_kg, total_sets, total_reps, total_workouts, workout_minutes)
    SELECT p_user_id, wl.date, COALESCE(SUM(sets_volume_kg(el.sets)), 0), COALESCE(SUM(el.total_sets), 0),
           COALESCE(SUM(el.total_reps), 0), COUNT(DISTINCT wl.id), COALESCE(SUM(wl.total_duration_seconds) / 60, 0)::integer
      FROM workout_logs wl LEFT JOIN exercise_logs el ON el.workout_log_id = wl.id
     WHERE wl.user_id = p_user_id AND wl.completed_at IS NOT NULL AND wl.date >= CURRENT_DATE - 90
     GROUP BY wl.date
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_volume_kg = EXCLUDED.total_volume_kg, total_sets = EXCLUDED.total_sets, total_reps = EXCLUDED.total_reps,
        total_workouts = EXCLUDED.total_workouts, workout_minutes = EXCLUDED.workout_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Keep the stats fresh: whenever a workout is completed, recompute for that user.
CREATE OR REPLACE FUNCTION trigger_recompute_user_stats()
RETURNS trigger AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
        PERFORM recompute_user_stats(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_workout_logs_user_stats ON workout_logs;
CREATE TRIGGER trigger_workout_logs_user_stats AFTER INSERT OR UPDATE ON workout_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_recompute_user_stats();

-- RPC used by AnalyticsDashboard (falls back to user_stats_history when missing)
CREATE OR REPLACE FUNCTION get_recent_stats(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS SETOF user_stats_history AS $$
    SELECT * FROM user_stats_history
    WHERE user_id = p_user_id AND user_id = auth.uid() AND date >= CURRENT_DATE - p_days
    ORDER BY date DESC;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- RPC used by lib/supabaseDb phoneVerifications
CREATE OR REPLACE FUNCTION increment_phone_verification_attempts(p_user_id uuid)
RETURNS void AS $$
    UPDATE phone_verifications SET attempts = COALESCE(attempts, 0) + 1
    WHERE user_id = p_user_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY INVOKER;

-- RLS
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_own" ON onboarding;
CREATE POLICY "onboarding_own" ON onboarding FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "coach_interviews_own" ON coach_interviews;
CREATE POLICY "coach_interviews_own" ON coach_interviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "body_measurements_own" ON body_measurements;
CREATE POLICY "body_measurements_own" ON body_measurements FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "body_weight_logs_own" ON body_weight_logs;
CREATE POLICY "body_weight_logs_own" ON body_weight_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_stats_own" ON user_stats;
CREATE POLICY "user_stats_own" ON user_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user_stats_history_own" ON user_stats_history;
CREATE POLICY "user_stats_history_own" ON user_stats_history FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Coach access (0080 runs before this table exists, so its guarded block is a no-op on a fresh
-- project): an active coach reads the trainee's measurements and weight log.
DROP POLICY IF EXISTS "Coaches can view client body measurements" ON body_measurements;
CREATE POLICY "Coaches can view client body measurements" ON body_measurements FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR is_coach_of(user_id));
DROP POLICY IF EXISTS "Coaches can view client body weight logs" ON body_weight_logs;
CREATE POLICY "Coaches can view client body weight logs" ON body_weight_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR is_coach_of(user_id));
