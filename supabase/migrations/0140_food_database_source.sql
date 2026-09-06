-- Provenance for seeded foods so scripts/seed-foods.ts can upsert (PostgREST needs a plain
-- unique column as the conflict target; the expression index from 0060 stays for humans).
ALTER TABLE food_database ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE food_database ADD COLUMN IF NOT EXISTS source_id text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_food_database_source_id ON food_database (source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_database_name_trgm ON food_database (lower(name) text_pattern_ops);

UPDATE food_database SET source = 'shaipt', source_id = 'shaipt:' || lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE source_id IS NULL AND created_by IS NULL;
