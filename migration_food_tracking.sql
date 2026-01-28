-- Migration: Food tracking and macro logging tables
-- Tables: food_database, food_logs, grocery_lists

-- ============================================
-- FOOD DATABASE
-- Searchable food items with nutritional data
-- ============================================
CREATE TABLE IF NOT EXISTS food_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100),
    serving_size NUMERIC NOT NULL DEFAULT 100,
    serving_unit VARCHAR(50) NOT NULL DEFAULT 'g',
    calories NUMERIC NOT NULL DEFAULT 0,
    protein_g NUMERIC NOT NULL DEFAULT 0,
    carbs_g NUMERIC NOT NULL DEFAULT 0,
    fat_g NUMERIC NOT NULL DEFAULT 0,
    fiber_g NUMERIC DEFAULT 0,
    sugar_g NUMERIC DEFAULT 0,
    sodium_mg NUMERIC DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_database_name ON food_database USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_food_database_category ON food_database (category);

-- ============================================
-- FOOD LOGS
-- Daily food intake with macro breakdown
-- ============================================
CREATE TABLE IF NOT EXISTS food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    food_id UUID REFERENCES food_database(id),
    food_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    serving_size NUMERIC NOT NULL DEFAULT 1,
    serving_unit VARCHAR(50) NOT NULL DEFAULT 'serving',
    calories NUMERIC NOT NULL DEFAULT 0,
    protein_g NUMERIC NOT NULL DEFAULT 0,
    carbs_g NUMERIC NOT NULL DEFAULT 0,
    fat_g NUMERIC NOT NULL DEFAULT 0,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs (user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_food_logs_meal_type ON food_logs (user_id, meal_type);

-- ============================================
-- GROCERY LISTS
-- Auto-generated from meal plans
-- ============================================
CREATE TABLE IF NOT EXISTS grocery_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Grocery List',
    items JSONB NOT NULL DEFAULT '[]',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_lists_user ON grocery_lists (user_id);

-- ============================================
-- SEED COMMON FOODS
-- ============================================
INSERT INTO food_database (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_verified) VALUES
    ('Chicken Breast (cooked)', 'protein', 100, 'g', 165, 31, 0, 3.6, 0, true),
    ('Salmon (cooked)', 'protein', 100, 'g', 208, 20, 0, 13, 0, true),
    ('Eggs (whole, large)', 'protein', 50, 'g', 72, 6.3, 0.4, 5, 0, true),
    ('Greek Yogurt (plain, nonfat)', 'dairy', 170, 'g', 100, 17, 6, 0.7, 0, true),
    ('Brown Rice (cooked)', 'grains', 195, 'g', 216, 5, 45, 1.8, 3.5, true),
    ('Oatmeal (cooked)', 'grains', 234, 'g', 154, 6, 27, 2.6, 4, true),
    ('Sweet Potato (baked)', 'vegetables', 114, 'g', 103, 2.3, 24, 0.1, 3.8, true),
    ('Broccoli (steamed)', 'vegetables', 91, 'g', 31, 2.6, 6, 0.3, 2.4, true),
    ('Banana', 'fruits', 118, 'g', 105, 1.3, 27, 0.4, 3.1, true),
    ('Apple', 'fruits', 182, 'g', 95, 0.5, 25, 0.3, 4.4, true),
    ('Almonds', 'nuts', 28, 'g', 164, 6, 6, 14, 3.5, true),
    ('Peanut Butter', 'nuts', 32, 'g', 188, 8, 6, 16, 2, true),
    ('Olive Oil', 'fats', 14, 'ml', 119, 0, 0, 14, 0, true),
    ('Avocado', 'fruits', 150, 'g', 240, 3, 13, 22, 10, true),
    ('Whey Protein Powder', 'supplements', 30, 'g', 120, 24, 3, 1.5, 0, true),
    ('White Rice (cooked)', 'grains', 186, 'g', 242, 4.4, 53, 0.4, 0.6, true),
    ('Ground Beef (90% lean)', 'protein', 100, 'g', 176, 20, 0, 10, 0, true),
    ('Turkey Breast (cooked)', 'protein', 100, 'g', 135, 30, 0, 1, 0, true),
    ('Cottage Cheese (low fat)', 'dairy', 113, 'g', 81, 14, 3.4, 1.2, 0, true),
    ('Quinoa (cooked)', 'grains', 185, 'g', 222, 8, 39, 3.6, 5, true),
    ('Spinach (raw)', 'vegetables', 30, 'g', 7, 0.9, 1.1, 0.1, 0.7, true),
    ('Tuna (canned in water)', 'protein', 85, 'g', 73, 17, 0, 0.6, 0, true),
    ('Whole Wheat Bread', 'grains', 28, 'g', 69, 3.6, 12, 1, 1.9, true),
    ('Milk (whole)', 'dairy', 244, 'ml', 149, 8, 12, 8, 0, true),
    ('Blueberries', 'fruits', 148, 'g', 84, 1.1, 21, 0.5, 3.6, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

-- Food database: readable by all, writable by creator
CREATE POLICY "food_database_select" ON food_database FOR SELECT USING (true);
CREATE POLICY "food_database_insert" ON food_database FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Food logs: users can only access their own
CREATE POLICY "food_logs_select" ON food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "food_logs_insert" ON food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_logs_update" ON food_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "food_logs_delete" ON food_logs FOR DELETE USING (auth.uid() = user_id);

-- Grocery lists: users can only access their own
CREATE POLICY "grocery_lists_select" ON grocery_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "grocery_lists_insert" ON grocery_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grocery_lists_update" ON grocery_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "grocery_lists_delete" ON grocery_lists FOR DELETE USING (auth.uid() = user_id);
