-- ============================================
-- Human Trainer Feature — Seed Data
-- Run in Supabase SQL Editor AFTER migration_human_trainer.sql
-- ============================================

-- 1. Set up Ali DaDa (surgptapp@gmail.com) as a trainer
-- Find the profile by email and update it
UPDATE profiles
SET
  role = 'trainer',
  full_name = 'Ali DaDa',
  specialties = ARRAY['Hypertrophy', 'Strength Training', 'Body Recomposition'],
  trainer_bio = 'Certified personal trainer with 8+ years of experience specializing in hypertrophy and strength training. I help clients build muscle, get stronger, and transform their physique through science-based programming.',
  is_accepting_clients = true,
  availability_status = 'available',
  rating = 4.9
WHERE email = 'surgptapp@gmail.com';

-- 2. John Smith "Coming Soon" trainer
-- NOTE: Cannot insert into profiles without a matching auth.users row (FK constraint).
-- John Smith is handled as a static placeholder in the app code instead.
-- If you want John in the DB, first create an auth user via Supabase dashboard or
-- supabase.auth.admin.createUser(), then UPDATE that profile here.

-- 3. Ensure trainee profile (ali.homaei2012@gmail.com) has intake data for testing
-- The trainee should already exist via normal signup. If they have an interview,
-- we can reference it. This is a no-op if the profile already has data.
-- Uncomment and adjust if you need to seed a test trainee:
--
-- UPDATE profiles
-- SET
--   role = 'trainee',
--   full_name = 'Test Trainee',
--   fitness_goals = ARRAY['Build Muscle', 'Get Stronger']
-- WHERE email = 'ali.homaei2012@gmail.com';
