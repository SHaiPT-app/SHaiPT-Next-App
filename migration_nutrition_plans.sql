-- Migration: Create nutrition_plans table
-- This table was referenced by grocery_lists FK but never created.

CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT,
    dietary_preferences TEXT[] DEFAULT '{}',
    plan_overview JSONB DEFAULT '{}',
    daily_schedule JSONB DEFAULT '{}',
    shopping_list JSONB DEFAULT '{}',
    nutrition_tips TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user ON nutrition_plans (user_id);

-- RLS
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_plans_select" ON nutrition_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "nutrition_plans_insert" ON nutrition_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nutrition_plans_update" ON nutrition_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "nutrition_plans_delete" ON nutrition_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_nutrition_plans_updated_at
    BEFORE UPDATE ON nutrition_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
