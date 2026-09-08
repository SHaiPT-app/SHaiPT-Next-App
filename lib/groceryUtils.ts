import type { NutritionPlan, GroceryListItem } from '@/lib/types';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    proteins: [
        'chicken', 'beef', 'turkey', 'salmon', 'tuna', 'shrimp', 'pork', 'lamb',
        'fish', 'tofu', 'tempeh', 'steak', 'cod', 'tilapia', 'eggs', 'egg',
        'whey', 'protein', 'sausage', 'bacon', 'ham', 'duck', 'venison',
    ],
    dairy: [
        'milk', 'cheese', 'yogurt', 'cream', 'butter', 'mozzarella', 'parmesan',
        'cheddar', 'ricotta', 'cottage', 'feta', 'sour cream', 'whipping cream',
    ],
    vegetables: [
        'broccoli', 'spinach', 'kale', 'lettuce', 'tomato', 'pepper', 'onion',
        'garlic', 'carrot', 'celery', 'cucumber', 'zucchini', 'asparagus',
        'cauliflower', 'cabbage', 'mushroom', 'peas', 'corn', 'green beans',
        'arugula', 'bok choy', 'eggplant', 'artichoke', 'beet', 'radish',
        'greens', 'mixed greens', 'salad', 'squash', 'potato', 'sweet potato',
    ],
    fruits: [
        'apple', 'banana', 'orange', 'berry', 'berries', 'strawberry', 'blueberry',
        'raspberry', 'grape', 'mango', 'pineapple', 'watermelon', 'peach', 'pear',
        'lemon', 'lime', 'avocado', 'kiwi', 'cherry', 'plum', 'pomegranate',
        'coconut', 'fig', 'date',
    ],
    grains: [
        'rice', 'oats', 'oatmeal', 'bread', 'pasta', 'quinoa', 'barley',
        'tortilla', 'wrap', 'cereal', 'granola', 'flour', 'noodle', 'couscous',
        'bulgur', 'farro', 'millet', 'pita', 'bagel', 'cracker',
    ],
    pantry: [
        'oil', 'olive oil', 'coconut oil', 'vinegar', 'soy sauce', 'salt',
        'pepper', 'spice', 'cumin', 'paprika', 'cinnamon', 'turmeric', 'oregano',
        'basil', 'thyme', 'rosemary', 'honey', 'maple syrup', 'sugar',
        'cocoa', 'chocolate', 'vanilla', 'baking', 'broth', 'stock',
        'sauce', 'mustard', 'ketchup', 'mayo', 'dressing',
        'almond', 'walnut', 'cashew', 'pecan', 'peanut', 'nut',
        'seed', 'chia', 'flax', 'pumpkin seed', 'sunflower seed',
        'chickpea', 'lentil', 'bean', 'black bean', 'kidney bean',
    ],
};

export function categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                return category;
            }
        }
    }

    return 'other';
}

export function normalizeIngredient(ingredient: string): string {
    return ingredient
        .trim()
        .replace(/^\d+[\s/]*\d*\s*(g|kg|ml|l|oz|lb|cup|cups|tbsp|tsp|tablespoon|teaspoon|bunch|head|clove|cloves|piece|pieces|slice|slices|handful|pinch)s?\b\s*/i, '')
        .replace(/^\d+[\s/]*\d*\s*/, '')
        .replace(/\s*\(.*?\)\s*/g, '')
        .trim();
}

/**
 * The amount to shop for, without the ingredient name: the trailing parenthetical when it
 * carries a number ("Broccoli (steamed) (1890 g for the week)" → "1890 g for the week"),
 * otherwise the leading measure of a recipe line ("150 g Broccoli (steamed)" → "150 g").
 */
export function ingredientQuantity(raw: string): string | undefined {
    const trailing = raw.trim().match(/\(([^()]*\d[^()]*)\)\s*$/);
    if (trailing) return trailing[1].trim();
    const leading = raw.trim().match(/^\d+(?:[\s/.]\d+)*\s*(?:g|kg|mg|ml|l|oz|lb|cup|cups|tbsp|tsp|tablespoon|teaspoon|bunch|head|clove|cloves|piece|pieces|slice|slices|handful|pinch)s?\b/i);
    return leading ? leading[0].trim() : undefined;
}

export function extractGroceryItems(plan: NutritionPlan): GroceryListItem[] {
    const ingredientMap = new Map<string, GroceryListItem>();

    /** One entry per ingredient, keyed on the normalized name so the same food never lands twice. */
    const add = (raw: string) => {
        const normalized = normalizeIngredient(raw);
        const key = normalized.toLowerCase();
        if (!key || key.length < 2) return;

        const quantity = ingredientQuantity(raw);
        const existing = ingredientMap.get(key);
        if (existing) {
            if (quantity && !existing.quantity) existing.quantity = quantity;
            return;
        }
        ingredientMap.set(key, {
            name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
            category: categorizeIngredient(normalized),
            quantity,
            checked: false,
        });
    };

    // The plan's own shopping list goes first: its amounts are the totals for the whole week,
    // where a meal's ingredient line only carries one serving. Categories come from
    // categorizeIngredient either way, so "protein" and "proteins" cannot both appear.
    if (plan.shopping_list) {
        for (const items of Object.values(plan.shopping_list)) {
            for (const item of items) add(item);
        }
    }

    const schedule = plan.daily_schedule;
    if (schedule) {
        for (const dayMeals of Object.values(schedule)) {
            const meals = [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner];
            if (dayMeals.snacks) {
                meals.push(...dayMeals.snacks);
            }

            for (const meal of meals) {
                if (!meal?.ingredients) continue;
                for (const rawIngredient of meal.ingredients) add(rawIngredient);
            }
        }
    }

    // Sort by category then name
    return Array.from(ingredientMap.values()).sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return a.name.localeCompare(b.name);
    });
}
