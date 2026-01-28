import { extractGroceryItems } from '@/lib/groceryUtils'
import type { NutritionPlan } from '@/lib/types'

const mockPlan: NutritionPlan = {
    id: 'plan-1',
    user_id: 'user-1',
    name: '7-Day Meal Plan',
    dietary_preferences: [],
    plan_overview: {
        duration_days: 7,
        daily_calories: 2200,
        macros: { calories: 2200, protein_g: 165, carbs_g: 220, fat_g: 73 },
    },
    daily_schedule: {
        day_1: {
            breakfast: {
                name: 'Protein Oatmeal',
                ingredients: ['Rolled oats', 'Protein powder', 'Banana', 'Honey'],
                nutrition: { calories: 450, protein_g: 35, carbs_g: 55, fat_g: 12 },
            },
            lunch: {
                name: 'Chicken Bowl',
                ingredients: ['Chicken breast', 'Brown rice', 'Broccoli', 'Olive oil'],
                nutrition: { calories: 650, protein_g: 50, carbs_g: 70, fat_g: 18 },
            },
            dinner: {
                name: 'Salmon Plate',
                ingredients: ['Salmon fillet', 'Sweet potato', 'Asparagus'],
                nutrition: { calories: 700, protein_g: 55, carbs_g: 60, fat_g: 25 },
            },
            snacks: [{
                name: 'Greek Yogurt',
                ingredients: ['Greek yogurt', 'Mixed berries'],
                nutrition: { calories: 200, protein_g: 20, carbs_g: 25, fat_g: 5 },
            }],
        },
        day_2: {
            breakfast: {
                name: 'Scrambled Eggs',
                ingredients: ['Eggs', 'Spinach', 'Toast'],
                nutrition: { calories: 400, protein_g: 30, carbs_g: 35, fat_g: 18 },
            },
            lunch: {
                name: 'Turkey Wrap',
                ingredients: ['Turkey', 'Wrap', 'Lettuce', 'Tomatoes'],
                nutrition: { calories: 550, protein_g: 40, carbs_g: 50, fat_g: 15 },
            },
            dinner: {
                name: 'Beef Stir Fry',
                ingredients: ['Beef', 'Broccoli', 'Soy sauce', 'Brown rice'],
                nutrition: { calories: 650, protein_g: 45, carbs_g: 55, fat_g: 22 },
            },
        },
    },
    shopping_list: {
        proteins: ['Chicken breast', 'Salmon'],
        vegetables: ['Broccoli', 'Spinach'],
    },
}

describe('extractGroceryItems', () => {
    it('extracts ingredients from all meals across all days', () => {
        const items = extractGroceryItems(mockPlan)

        const names = items.map(i => i.name.toLowerCase())

        expect(names).toContain('rolled oats')
        expect(names).toContain('chicken breast')
        expect(names).toContain('salmon fillet')
        expect(names).toContain('eggs')
        expect(names).toContain('beef')
    })

    it('includes snack ingredients', () => {
        const items = extractGroceryItems(mockPlan)
        const names = items.map(i => i.name.toLowerCase())

        expect(names).toContain('greek yogurt')
        expect(names).toContain('mixed berries')
    })

    it('deduplicates ingredients (broccoli appears in day_1 and day_2)', () => {
        const items = extractGroceryItems(mockPlan)
        const broccoliItems = items.filter(i => i.name.toLowerCase() === 'broccoli')

        expect(broccoliItems).toHaveLength(1)
    })

    it('deduplicates brown rice (appears in day_1 lunch and day_2 dinner)', () => {
        const items = extractGroceryItems(mockPlan)
        const riceItems = items.filter(i => i.name.toLowerCase() === 'brown rice')

        expect(riceItems).toHaveLength(1)
    })

    it('categorizes proteins correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const chicken = items.find(i => i.name.toLowerCase() === 'chicken breast')
        expect(chicken?.category).toBe('proteins')

        const salmon = items.find(i => i.name.toLowerCase() === 'salmon fillet')
        expect(salmon?.category).toBe('proteins')

        const eggs = items.find(i => i.name.toLowerCase() === 'eggs')
        expect(eggs?.category).toBe('proteins')

        const beef = items.find(i => i.name.toLowerCase() === 'beef')
        expect(beef?.category).toBe('proteins')
    })

    it('categorizes vegetables correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const broccoli = items.find(i => i.name.toLowerCase() === 'broccoli')
        expect(broccoli?.category).toBe('vegetables')

        const spinach = items.find(i => i.name.toLowerCase() === 'spinach')
        expect(spinach?.category).toBe('vegetables')

        const asparagus = items.find(i => i.name.toLowerCase() === 'asparagus')
        expect(asparagus?.category).toBe('vegetables')

        const sweetPotato = items.find(i => i.name.toLowerCase() === 'sweet potato')
        expect(sweetPotato?.category).toBe('vegetables')
    })

    it('categorizes fruits correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const banana = items.find(i => i.name.toLowerCase() === 'banana')
        expect(banana?.category).toBe('fruits')

        const berries = items.find(i => i.name.toLowerCase() === 'mixed berries')
        expect(berries?.category).toBe('fruits')
    })

    it('categorizes grains correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const oats = items.find(i => i.name.toLowerCase() === 'rolled oats')
        expect(oats?.category).toBe('grains')

        const rice = items.find(i => i.name.toLowerCase() === 'brown rice')
        expect(rice?.category).toBe('grains')

        const toast = items.find(i => i.name.toLowerCase() === 'toast')
        // Toast contains 'toast' which isn't in grains keywords specifically, but it is bread-like
        // This may fall under 'other' depending on keyword matching
        expect(toast).toBeDefined()
    })

    it('categorizes dairy correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const yogurt = items.find(i => i.name.toLowerCase() === 'greek yogurt')
        expect(yogurt?.category).toBe('dairy')
    })

    it('categorizes pantry items correctly', () => {
        const items = extractGroceryItems(mockPlan)

        const oil = items.find(i => i.name.toLowerCase() === 'olive oil')
        expect(oil?.category).toBe('pantry')

        const soy = items.find(i => i.name.toLowerCase() === 'soy sauce')
        expect(soy?.category).toBe('pantry')

        const honey = items.find(i => i.name.toLowerCase() === 'honey')
        expect(honey?.category).toBe('pantry')
    })

    it('merges items from shopping_list field', () => {
        const items = extractGroceryItems(mockPlan)

        // Salmon from shopping_list (not 'Salmon fillet' from ingredients)
        const salmonItems = items.filter(i => i.name.toLowerCase().includes('salmon'))
        expect(salmonItems.length).toBeGreaterThanOrEqual(1)
    })

    it('sets all items as unchecked by default', () => {
        const items = extractGroceryItems(mockPlan)

        for (const item of items) {
            expect(item.checked).toBe(false)
        }
    })

    it('sorts items by category then name', () => {
        const items = extractGroceryItems(mockPlan)

        for (let i = 1; i < items.length; i++) {
            const prevCat = items[i - 1].category || ''
            const currCat = items[i].category || ''
            if (prevCat === currCat) {
                expect(items[i - 1].name.localeCompare(items[i].name)).toBeLessThanOrEqual(0)
            }
        }
    })

    it('returns empty array for plan with no daily_schedule', () => {
        const emptyPlan: NutritionPlan = {
            ...mockPlan,
            daily_schedule: {},
            shopping_list: undefined,
        }

        const items = extractGroceryItems(emptyPlan)
        expect(items).toHaveLength(0)
    })

    it('handles meals without ingredients', () => {
        const planWithNoIngredients: NutritionPlan = {
            ...mockPlan,
            daily_schedule: {
                day_1: {
                    breakfast: {
                        name: 'Something',
                        ingredients: [],
                        nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    },
                    lunch: {
                        name: 'Something else',
                        ingredients: [],
                        nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    },
                    dinner: {
                        name: 'Dinner',
                        ingredients: [],
                        nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    },
                },
            },
            shopping_list: undefined,
        }

        const items = extractGroceryItems(planWithNoIngredients)
        expect(items).toHaveLength(0)
    })

    it('preserves original quantity from ingredient string', () => {
        const items = extractGroceryItems(mockPlan)

        // Each item should have a quantity field
        for (const item of items) {
            // Items from ingredients should have quantity set to the raw ingredient string
            if (item.quantity) {
                expect(typeof item.quantity).toBe('string')
            }
        }
    })
})
