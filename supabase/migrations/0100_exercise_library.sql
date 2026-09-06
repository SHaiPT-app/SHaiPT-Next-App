-- Exercise library columns for the free-exercise-db seed (scripts/seed-exercises.ts) and the
-- link to 4Dcoach.
--
--   slug      URL-safe id derived from the name ("barbell-bench-press-medium-grip")
--   source    where the row came from ("free-exercise-db", "shaipt")
--   fourd_id  the 4Dcoach exercise this maps onto (bench, squat, deadlift, lateral-raise, curl,
--             bw-squat, pushup, crunch, plank, pullup, hip-thrust); NULL when 4Dcoach has no
--             model for it. A plan shows "Form check in 4D" only for rows with a fourd_id.
--   is_fourd_primary  the one row per fourd_id the plan generator prefers (the canonical
--             barbell bench press, not the incline dumbbell variant)

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source text DEFAULT 'shaipt';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS fourd_id text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_fourd_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_slug ON exercises (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_fourd ON exercises (fourd_id) WHERE fourd_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_level ON exercises (level);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercises_fourd_id_check') THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_fourd_id_check CHECK (
            fourd_id IS NULL OR fourd_id IN ('bench', 'squat', 'deadlift', 'lateral-raise', 'curl',
                                             'bw-squat', 'pushup', 'crunch', 'plank', 'pullup', 'hip-thrust'));
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
