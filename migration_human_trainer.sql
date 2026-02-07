-- ============================================
-- Human Trainer Feature — Database Migration
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Extend coaching_relationships status to support 'waitlisted'
ALTER TABLE coaching_relationships
  DROP CONSTRAINT IF EXISTS coaching_relationships_status_check;

ALTER TABLE coaching_relationships
  ADD CONSTRAINT coaching_relationships_status_check
  CHECK (status IN ('pending', 'active', 'declined', 'ended', 'waitlisted'));

-- 2. Add decline_reason and intake_data columns to coaching_relationships
ALTER TABLE coaching_relationships ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE coaching_relationships ADD COLUMN IF NOT EXISTS intake_data JSONB;

-- 3. Add role column to profiles (not in original schema but referenced in app code)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'trainee';

-- 4. Extend profiles for trainer cards
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_accepting_clients BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trainer_bio TEXT;
