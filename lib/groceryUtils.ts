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

export function extractGroceryItems(plan: NutritionPlan): GroceryListItem[] {
    const ingredientMap = new Map<string, GroceryListItem>();

    const schedule = plan.daily_schedule;
    if (!schedule) return [];

    for (const dayMeals of Object.values(schedule)) {
        const meals = [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner];
        if (dayMeals.snacks) {
            meals.push(...dayMeals.snacks);
        }

        for (const meal of meals) {
            if (!meal?.ingredients) continue;

            for (const rawIngredient of meal.ingredients) {
                const normalized = normalizeIngredient(rawIngredient);
                const key = normalized.toLowerCase();

                if (!key || key.length < 2) continue;

                if (!ingredientMap.has(key)) {
                    ingredientMap.set(key, {
                        name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
                        category: categorizeIngredient(normalized),
                        quantity: rawIngredient,
                        checked: false,
                    });
                }
            }
        }
    }

    // Also merge items from the plan's existing shopping_list if present
    if (plan.shopping_list) {
        for (const [category, items] of Object.entries(plan.shopping_list)) {
            for (const item of items) {
                const key = item.toLowerCase().trim();
                if (!key || key.length < 2) continue;

                if (!ingredientMap.has(key)) {
                    ingredientMap.set(key, {
                        name: item.charAt(0).toUpperCase() + item.slice(1),
                        category: category,
                        checked: false,
                    });
                }
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
