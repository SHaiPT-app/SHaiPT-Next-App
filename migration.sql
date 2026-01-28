-- Migration to add metadata columns to workout_plans table

ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
