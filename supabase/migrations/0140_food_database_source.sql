-- Provenance for seeded foods so scripts/seed-foods.ts can upsert (PostgREST needs a plain
-- unique column as the conflict target; the expression index from 0060 stays for humans).
ALTER TABLE food_database ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE food_database ADD COLUMN IF NOT EXISTS source_id text;
-- a plain constraint (not a partial index): PostgREST upserts name the column as the conflict target
DROP INDEX IF EXISTS uq_food_database_source_id;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_food_database_source_id') THEN
        ALTER TABLE food_database ADD CONSTRAINT uq_food_database_source_id UNIQUE (source_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_food_database_name_trgm ON food_database (lower(name) text_pattern_ops);

UPDATE food_database SET source = 'shaipt', source_id = 'shaipt:' || lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE source_id IS NULL AND created_by IS NULL;
