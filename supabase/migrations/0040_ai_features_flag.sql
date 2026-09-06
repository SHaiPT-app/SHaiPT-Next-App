-- Add ai_features column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_features JSONB DEFAULT '{"workout_planner": false, "dietitian": false, "form_checker": false}'::jsonb;
