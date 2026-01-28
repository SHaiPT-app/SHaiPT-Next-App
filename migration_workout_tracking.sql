-- ============================================
-- SHaiPT Workout Tracking Migration
-- Adds: phone_verifications, consistency_challenges,
--       consistency_logs, user_preferences, workout_drafts
-- Plus modifications to existing tables
-- ============================================

-- ============================================
-- NEW TABLES
-- ============================================

-- Phone Verifications for consistency challenge enrollment
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for quick lookups by phone number
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);

-- Consistency Challenges - gamified subscription tracker
CREATE TABLE IF NOT EXISTS consistency_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'passed', 'failed', 'grace_period')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_week_start DATE NOT NULL,
    weeks_completed INTEGER DEFAULT 0,
    missed_days_this_week INTEGER DEFAULT 0,
    grace_period_requested_at TIMESTAMPTZ,
    grace_period_approved_at TIMESTAMPTZ,
    grace_period_expires_at TIMESTAMPTZ,
    grace_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Consistency Logs - daily workout tracking for challenges
CREATE TABLE IF NOT EXISTS consistency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES consistency_challenges(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    scheduled BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    workout_log_id UUID REFERENCES workout_logs(id),
    completion_percentage NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_consistency_logs_date ON consistency_logs(user_id, date);

-- User Preferences - workout and app settings
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    form_checker_enabled BOOLEAN DEFAULT FALSE,
    rest_timer_auto_start BOOLEAN DEFAULT TRUE,
    rest_timer_alert_type TEXT CHECK (rest_timer_alert_type IN ('audio', 'vibration', 'both', 'none')) DEFAULT 'both',
    default_rest_seconds INTEGER DEFAULT 90,
    screen_awake_during_workout BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Drafts - offline/auto-save support
CREATE TABLE IF NOT EXISTS workout_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workout_log_id UUID REFERENCES workout_logs(id),
    session_id UUID REFERENCES workout_sessions(id),
    draft_data JSONB NOT NULL,
    device_id TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- Index for device-based lookups
CREATE INDEX IF NOT EXISTS idx_workout_drafts_device ON workout_drafts(user_id, device_id);

-- ============================================
-- SCHEMA MODIFICATIONS TO EXISTING TABLES
-- ============================================

-- training_plan_sessions - rest day support
ALTER TABLE training_plan_sessions
ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expected_duration_minutes INTEGER;

-- workout_sessions - duration metadata
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS expected_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS rest_metadata JSONB DEFAULT '{}';

-- exercise_logs - RPE at exercise level and notes
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS rpe NUMERIC CHECK (rpe >= 1 AND rpe <= 10),
ADD COLUMN IF NOT EXISTS exercise_notes TEXT;

-- subscriptions - consistency challenge fields
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS earned_via_consistency BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consistency_challenge_id UUID REFERENCES consistency_challenges(id),
ADD COLUMN IF NOT EXISTS pro_lost_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pro_regain_streak_start DATE;

-- profiles - account completion tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intake_photos_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_completed BOOLEAN DEFAULT FALSE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_drafts ENABLE ROW LEVEL SECURITY;

-- phone_verifications policies
CREATE POLICY "Users can view their own phone verifications"
    ON phone_verifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone verifications"
    ON phone_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone verifications"
    ON phone_verifications FOR UPDATE
    USING (auth.uid() = user_id);

-- consistency_challenges policies
CREATE POLICY "Users can view their own consistency challenges"
    ON consistency_challenges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consistency challenges"
    ON consistency_challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consistency challenges"
    ON consistency_challenges FOR UPDATE
    USING (auth.uid() = user_id);

-- consistency_logs policies
CREATE POLICY "Users can view their own consistency logs"
    ON consistency_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consistency logs"
    ON consistency_logs FOR ALL
    USING (auth.uid() = user_id);

-- user_preferences policies
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
    ON user_preferences FOR ALL
    USING (auth.uid() = user_id);

-- workout_drafts policies
CREATE POLICY "Users can view their own workout drafts"
    ON workout_drafts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout drafts"
    ON workout_drafts FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update consistency challenge status
CREATE OR REPLACE FUNCTION update_consistency_challenge_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for consistency_challenges updated_at
DROP TRIGGER IF EXISTS trg_consistency_challenges_updated ON consistency_challenges;
CREATE TRIGGER trg_consistency_challenges_updated
    BEFORE UPDATE ON consistency_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_consistency_challenge_status();

-- Function to update user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_preferences updated_at
DROP TRIGGER IF EXISTS trg_user_preferences_updated ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_timestamp();

-- Function to update workout_drafts updated_at
CREATE OR REPLACE FUNCTION update_workout_drafts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workout_drafts updated_at
DROP TRIGGER IF EXISTS trg_workout_drafts_updated ON workout_drafts;
CREATE TRIGGER trg_workout_drafts_updated
    BEFORE UPDATE ON workout_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_drafts_timestamp();
