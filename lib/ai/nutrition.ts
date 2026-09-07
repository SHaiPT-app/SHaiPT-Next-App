/**
 * Nutrition on top of the gateway, shared by api/nutrition/macro-targets, api/nutrition/generate,
 * api/ai-coach/generate-nutrition-plan and api/onboarding/generate-plans.
 *
 *   - macro targets are arithmetic (Mifflin-St Jeor), never a model call
 *   - the meal plan: the model picks foods from the `food_database` candidates by index and
 *     gives grams; the server computes every calorie and macro. No invented numbers.
 */
import { z } from 'zod';
import { callModel } from './gateway';
import { getAdmin } from '@/lib/auth';
import type { DayMeals, Meal, MacroTargets, NutritionPlan, Profile } from '@/lib/types';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface NutritionInputs {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: string;
    goals: string[];
    trainingPhase: string;
    dietaryPreferences: string[];
    allergies: string;
    dislikes: string;
    likes: string;
    medical: string;
    mealsPerDay: number;
    cooking: string;
    notes: string;
}

const DEFAULTS: NutritionInputs = {
    weightKg: 70, heightCm: 170, age: 25, gender: 'male', goals: [], trainingPhase: 'general',
    dietaryPreferences: [], allergies: '', dislikes: '', likes: '', medical: '', mealsPerDay: 4, cooking: '', notes: '',
};

function ageFrom(dob?: string | null): number | null {
    if (!dob) return null;
    const t = new Date(dob).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

/** Parse "180 lbs", "82kg", "5'11", "178 cm" into kg / cm. */
export function parseWeightKg(s?: string | null): number | null {
    if (!s) return null;
    const m = /([\d.]+)\s*(kg|kgs|lb|lbs|pounds?)?/i.exec(s);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return null;
    return /lb|pound/i.test(m[2] ?? '') ? n * 0.4536 : n;
}

export function parseHeightCm(s?: string | null): number | null {
    if (!s) return null;
    const ft = /(\d+)\s*'\s*(\d+)?/.exec(s);
    if (ft) return Math.round(parseInt(ft[1], 10) * 30.48 + parseInt(ft[2] ?? '0', 10) * 2.54);
    const m = /([\d.]+)\s*(cm|m|in|inch|inches)?/i.exec(s);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return null;
    const unit = (m[2] ?? '').toLowerCase();
    if (unit === 'm' || (unit === '' && n < 3)) return Math.round(n * 100);
    if (unit.startsWith('in')) return Math.round(n * 2.54);
    return n;
}

export function inputsFromProfile(profile: Partial<Profile> | null, extras: Partial<NutritionInputs> = {}): NutritionInputs {
    return {
        ...DEFAULTS,
        weightKg: Number(profile?.weight_kg) || DEFAULTS.weightKg,
        heightCm: Number(profile?.height_cm) || DEFAULTS.heightCm,
        age: ageFrom(profile?.date_of_birth) ?? DEFAULTS.age,
        gender: profile?.gender || DEFAULTS.gender,
        goals: profile?.fitness_goals ?? [],
        ...extras,
    };
}

export function inputsFromIntake(
    intake: { age?: string; height?: string; weight?: string; fitness_goals?: string; training_style?: string } | null | undefined,
    diet: { allergies?: string; intolerances?: string; diet_style?: string; foods_love?: string; foods_hate?: string; medical_dietary_considerations?: string; meals_per_day?: string; cooking_preferences?: string } | null | undefined,
    profile: Partial<Profile> | null = null,
): NutritionInputs {
    const base = inputsFromProfile(profile);
    return {
        ...base,
        weightKg: parseWeightKg(intake?.weight) ?? base.weightKg,
        heightCm: parseHeightCm(intake?.height) ?? base.heightCm,
        age: parseInt(intake?.age ?? '', 10) || base.age,
        goals: intake?.fitness_goals ? intake.fitness_goals.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : base.goals,
        dietaryPreferences: diet?.diet_style ? [diet.diet_style] : base.dietaryPreferences,
        allergies: [diet?.allergies, diet?.intolerances].filter(Boolean).join('; '),
        dislikes: diet?.foods_hate ?? '',
        likes: diet?.foods_love ?? '',
        medical: diet?.medical_dietary_considerations ?? '',
        mealsPerDay: parseInt(diet?.meals_per_day ?? '', 10) || base.mealsPerDay,
        cooking: diet?.cooking_preferences ?? '',
    };
}

// ---------------------------------------------------------------------------
// Macro targets (deterministic)
// ---------------------------------------------------------------------------

export const MIN_CALORIES = 1200;

export function macroTargets(input: NutritionInputs): MacroTargets {
    const { weightKg, heightCm, age, gender } = input;
    const bmr = gender.toLowerCase().startsWith('f')
        ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
        : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const tdee = bmr * 1.55;
    const goals = input.goals.map((g) => g.toLowerCase()).join(' ');
    const phase = input.trainingPhase;
    const prefs = input.dietaryPreferences.map((p) => p.toLowerCase()).join(' ');

    let calories = tdee;
    let protein = 0.30, carbs = 0.40, fat = 0.30;
    let why = 'maintenance calories';
    if (/loss|lose|cut|lean|shred|fat/.test(goals)) { calories = tdee * 0.8; protein = 0.35; carbs = 0.35; fat = 0.30; why = 'a 20% deficit for fat loss'; }
    else if (/gain|muscle|bulk|mass|hypertrophy|strength|size/.test(goals)) { calories = tdee * 1.10; protein = 0.30; carbs = 0.45; fat = 0.25; why = 'a 10% surplus for muscle gain'; }
    if (phase === 'strength' || phase === 'power') { protein = 0.35; carbs = 0.40; fat = 0.25; }
    else if (phase === 'hypertrophy') { protein = 0.30; carbs = 0.45; fat = 0.25; }
    else if (phase === 'endurance') { protein = 0.25; carbs = 0.50; fat = 0.25; }
    else if (phase === 'deload') { calories = calories * 0.95; }
    if (/keto/.test(prefs)) { protein = 0.25; carbs = 0.05; fat = 0.70; }

    let flagged = false;
    if (calories < MIN_CALORIES) { calories = MIN_CALORIES; flagged = true; }
    const daily = Math.round(calories);
    // protein floor: 1.6 g/kg
    const proteinG = Math.max(Math.round((daily * protein) / 4), Math.round(weightKg * 1.6));
    const fatG = Math.round((daily * fat) / 9);
    const carbsG = Math.max(0, Math.round((daily - proteinG * 4 - fatG * 9) / 4));
    return {
        daily_calories: daily,
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
        training_phase: phase,
        rationale: `Mifflin-St Jeor estimate for ${Math.round(weightKg)} kg, ${Math.round(heightCm)} cm, age ${age}: about ${Math.round(tdee)} kcal a day to maintain; set to ${why}${phase !== 'general' ? ` in a ${phase} phase` : ''}. Protein at least 1.6 g per kg.${flagged ? ' Raised to the 1200 kcal safety floor: talk to a healthcare provider before restricting further.' : ''} This is general fitness guidance, not medical advice.`,
    };
}

// ---------------------------------------------------------------------------
// Meal plan
// ---------------------------------------------------------------------------

export interface FoodRow {
    id: string;
    name: string;
    category: string | null;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size: number;
    serving_unit: string;
}

let foodCache: { at: number; rows: FoodRow[] } | null = null;

export async function foodLibrary(): Promise<FoodRow[]> {
    if (foodCache && Date.now() - foodCache.at < 10 * 60_000) return foodCache.rows;
    const { data, error } = await getAdmin()
        .from('food_database')
        .select('id, name, category, calories, protein_g, carbs_g, fat_g, serving_size, serving_unit')
        .eq('is_verified', true)
        .limit(1000);
    if (error) throw new Error(`food library: ${error.message}`);
    foodCache = { at: Date.now(), rows: (data ?? []) as FoodRow[] };
    return foodCache.rows;
}

const EXCLUDE: Array<[RegExp, RegExp]> = [
    // preference → food name pattern to drop
    [/vegan/, /chicken|beef|pork|turkey|lamb|fish|salmon|tuna|shrimp|egg|milk|cheese|yogurt|butter|whey|honey|cottage|cream/i],
    [/vegetarian|veggie/, /chicken|beef|pork|turkey|lamb|fish|salmon|tuna|shrimp|cod|sardine|meat|bacon|ham/i],
    [/pescatarian/, /chicken|beef|pork|turkey|lamb|bacon|ham/i],
    [/dairy.?free|lactose/, /milk|cheese|yogurt|butter|cream|whey|cottage/i],
    [/gluten.?free|celiac|coeliac/, /wheat|bread|pasta|barley|rye|couscous|flour|cracker|bagel|noodle/i],
    [/nut.?free|nut allergy/, /almond|walnut|cashew|pecan|peanut|pistachio|hazelnut|macadamia|nuts?\b/i],
    [/keto/, /rice|pasta|bread|oat|potato|sugar|honey|banana|cereal|beans|lentil/i],
];

/** Per-100 g rows the model may use; preferences and allergies remove whole groups. */
export async function candidateFoods(input: NutritionInputs, limit = 160): Promise<FoodRow[]> {
    const rows = await foodLibrary();
    const prefText = [...input.dietaryPreferences, input.allergies, input.dislikes].join(' ').toLowerCase();
    const drop: RegExp[] = EXCLUDE.filter(([pref]) => pref.test(prefText)).map(([, pattern]) => pattern);
    const dislikeWords = input.dislikes.toLowerCase().split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 2);
    const allergyWords = input.allergies.toLowerCase().split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 2);
    const eligible = rows.filter((r) => {
        const n = r.name.toLowerCase();
        if (drop.some((re) => re.test(n))) return false;
        if (dislikeWords.some((w) => n.includes(w))) return false;
        if (allergyWords.some((w) => n.includes(w))) return false;
        return r.calories > 0 || r.protein_g > 0;
    });
    // spread over categories
    const byCat = new Map<string, FoodRow[]>();
    for (const r of eligible) {
        const c = r.category ?? 'other';
        const list = byCat.get(c) ?? [];
        list.push(r);
        byCat.set(c, list);
    }
    const perCat = Math.max(8, Math.ceil(limit / Math.max(1, byCat.size)));
    return [...byCat.values()].flatMap((list) => list.slice(0, perCat)).slice(0, limit);
}

const ItemSchema = z.object({ i: z.number().int().min(0).describe('candidate index'), g: z.number().min(5).max(1000).describe('grams') });
const MealSchema = z.object({
    name: z.string(),
    items: z.array(ItemSchema).min(1).max(7),
    instructions: z.string().default(''),
    prep_time_minutes: z.number().int().min(0).max(120).default(10),
});
const DaySchema = z.object({
    day_number: z.number().int().min(1).max(7),
    breakfast: MealSchema,
    lunch: MealSchema,
    dinner: MealSchema,
    snacks: z.array(MealSchema).max(3).default([]),
});
export const MealPlanSchema = z.object({
    name: z.string(),
    key_principles: z.array(z.string()).min(2).max(5),
    days: z.array(DaySchema).min(3).max(7),
    nutrition_tips: z.array(z.string()).min(3).max(6),
});
type MealPlanRaw = z.infer<typeof MealPlanSchema>;

export const DISCLAIMER = 'Disclaimer: This meal plan was generated by an AI nutrition assistant and is for general informational purposes only. It is not medical advice. Consult a healthcare provider or licensed registered dietitian for personalized medical dietary guidance.';

function round1(n: number): number { return Math.round(n * 10) / 10; }

function buildMeal(raw: z.infer<typeof MealSchema>, foods: FoodRow[]): Meal {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    const ingredients: string[] = [];
    for (const item of raw.items) {
        const f = foods[item.i];
        if (!f) continue;
        const factor = item.g / 100;
        calories += f.calories * factor;
        protein += f.protein_g * factor;
        carbs += f.carbs_g * factor;
        fat += f.fat_g * factor;
        ingredients.push(`${Math.round(item.g)} g ${f.name}`);
    }
    return {
        name: raw.name,
        ingredients,
        instructions: raw.instructions,
        prep_time_minutes: raw.prep_time_minutes,
        nutrition: { calories: Math.round(calories), protein_g: round1(protein), carbs_g: round1(carbs), fat_g: round1(fat) },
    };
}

function shoppingList(days: DayMeals[], foods: FoodRow[], raw: MealPlanRaw): Record<string, string[]> {
    const grams = new Map<number, number>();
    for (const d of raw.days) {
        for (const m of [d.breakfast, d.lunch, d.dinner, ...d.snacks]) {
            for (const it of m.items) grams.set(it.i, (grams.get(it.i) ?? 0) + it.g);
        }
    }
    const out: Record<string, string[]> = {};
    for (const [i, g] of grams) {
        const f = foods[i];
        if (!f) continue;
        const cat = f.category ?? 'other';
        (out[cat] ??= []).push(`${f.name} (${Math.round(g)} g for the week)`);
    }
    return out;
}

export interface MealPlanResult {
    plan: Omit<NutritionPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
    targets: MacroTargets;
    cached: boolean;
    mocked: boolean;
}

export async function generateMealPlan(opts: { userId: string; tester?: boolean; input: NutritionInputs; days?: number }): Promise<MealPlanResult> {
    const targets = macroTargets(opts.input);
    const foods = await candidateFoods(opts.input);
    const dayCount = Math.min(7, Math.max(3, opts.days ?? 7));
    const snacks = Math.max(0, Math.min(3, opts.input.mealsPerDay - 3));
    const input = opts.input;
    const prompt = `You are a sports dietitian. Build a ${dayCount}-day meal plan that hits these daily targets as closely as the candidate foods allow:
calories ${targets.daily_calories} kcal, protein ${targets.protein_g} g, carbs ${targets.carbs_g} g, fat ${targets.fat_g} g.

CLIENT: ${input.gender}, ${input.age} y, ${Math.round(input.weightKg)} kg, ${Math.round(input.heightCm)} cm. Goals: ${input.goals.join(', ') || 'general fitness'}. Training phase: ${input.trainingPhase}.
Diet style: ${input.dietaryPreferences.join(', ') || 'flexible'}. Allergies/intolerances: ${input.allergies || 'none'}. Dislikes: ${input.dislikes || 'none'}. Likes: ${input.likes || 'none'}. Medical notes: ${input.medical || 'none'}. Cooking: ${input.cooking || 'no preference'}.${input.notes ? ` Notes: ${input.notes}` : ''}

RULES:
- Every meal lists items as {i, g}: i is the candidate index below, g is grams. Use ONLY these indices; the server computes the calories and macros from them, so choose quantities that add up to the targets (a typical breakfast 25%, lunch 35%, dinner 30%, snacks the rest).
- Each day: breakfast, lunch, dinner and exactly ${snacks} snack(s). Vary the days.
- Respect allergies and dislikes absolutely. Use liked foods where they fit.
- name: short dish name; instructions: one or two sentences; prep_time_minutes realistic.
- key_principles: 3-5 short lines. nutrition_tips: 3-5 practical tips${input.medical ? ', one of them telling the client to see a registered dietitian for their medical condition' : ''}. Never give medical advice. No emojis.

CANDIDATES (index | name | kcal/100g | P/C/F g per 100g):
${foods.map((f, i) => `${i} | ${f.name} | ${Math.round(f.calories)} | ${round1(f.protein_g)}/${round1(f.carbs_g)}/${round1(f.fat_g)}`).join('\n')}`;

    const res = await callModel<MealPlanRaw>({
        userId: opts.userId, tester: opts.tester, feature: 'nutrition', prompt, schema: MealPlanSchema, maxOutputTokens: 3500,
        mock: () => mockMealPlan(foods, dayCount, snacks),
    });
    const raw = res.json ?? mockMealPlan(foods, dayCount, snacks);

    const schedule: Record<string, DayMeals> = {};
    const built: DayMeals[] = [];
    raw.days.sort((a, b) => a.day_number - b.day_number).forEach((d, idx) => {
        const day: DayMeals = {
            breakfast: buildMeal(d.breakfast, foods),
            lunch: buildMeal(d.lunch, foods),
            dinner: buildMeal(d.dinner, foods),
            snacks: d.snacks.map((s) => buildMeal(s, foods)),
        };
        schedule[`day_${idx + 1}`] = day;
        built.push(day);
    });
    // repeat days if the model returned fewer than asked
    for (let i = built.length; i < dayCount; i++) schedule[`day_${i + 1}`] = built[i % built.length];

    const dayTotals = built.map((d) => [d.breakfast, d.lunch, d.dinner, ...(d.snacks ?? [])].reduce((acc, m) => ({
        calories: acc.calories + m.nutrition.calories, protein_g: acc.protein_g + m.nutrition.protein_g,
        carbs_g: acc.carbs_g + m.nutrition.carbs_g, fat_g: acc.fat_g + m.nutrition.fat_g,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }));
    const avg = dayTotals.reduce((a, t) => ({ calories: a.calories + t.calories / dayTotals.length, protein_g: a.protein_g + t.protein_g / dayTotals.length, carbs_g: a.carbs_g + t.carbs_g / dayTotals.length, fat_g: a.fat_g + t.fat_g / dayTotals.length }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const tips = [...raw.nutrition_tips.filter((t) => !t.startsWith('Disclaimer')), DISCLAIMER];
    return {
        plan: {
            name: raw.name,
            dietary_preferences: input.dietaryPreferences,
            plan_overview: {
                duration_days: dayCount,
                daily_calories: targets.daily_calories,
                macros: { calories: Math.round(avg.calories), protein_g: Math.round(avg.protein_g), carbs_g: Math.round(avg.carbs_g), fat_g: Math.round(avg.fat_g) },
                key_principles: raw.key_principles,
            },
            daily_schedule: schedule,
            shopping_list: shoppingList(built, foods, raw),
            nutrition_tips: tips,
        },
        targets,
        cached: res.cached,
        mocked: res.mocked,
    };
}

/** Mock: picks the first sensible foods per category so the numbers are still real. */
export function mockMealPlan(foods: FoodRow[], days: number, snacks: number): MealPlanRaw {
    const idx = (re: RegExp, fallback = 0) => { const i = foods.findIndex((f) => re.test(f.name)); return i >= 0 ? i : fallback; };
    const oats = idx(/oat/i), egg = idx(/egg/i), milk = idx(/milk/i), banana = idx(/banana/i), chicken = idx(/chicken/i), rice = idx(/rice/i),
        broccoli = idx(/broccoli/i), salmon = idx(/salmon|fish/i), potato = idx(/potato/i), yogurt = idx(/yogurt/i), apple = idx(/apple/i), nuts = idx(/almond|nut/i);
    const snack = { name: 'Yogurt and fruit', items: [{ i: yogurt, g: 170 }, { i: apple, g: 150 }], instructions: 'Slice the fruit into the yogurt.', prep_time_minutes: 3 };
    const day = (n: number) => ({
        day_number: n,
        breakfast: n % 2 ? { name: 'Oats with banana and milk', items: [{ i: oats, g: 80 }, { i: milk, g: 250 }, { i: banana, g: 120 }], instructions: 'Cook the oats in the milk, slice the banana on top.', prep_time_minutes: 10 }
            : { name: 'Eggs with toast-style oats', items: [{ i: egg, g: 150 }, { i: oats, g: 60 }, { i: milk, g: 200 }], instructions: 'Scramble the eggs; oats on the side.', prep_time_minutes: 12 },
        lunch: { name: 'Chicken, rice and broccoli', items: [{ i: chicken, g: 180 }, { i: rice, g: 200 }, { i: broccoli, g: 150 }], instructions: 'Grill the chicken, steam the broccoli, serve on rice.', prep_time_minutes: 25 },
        dinner: { name: 'Salmon with potato', items: [{ i: salmon, g: 170 }, { i: potato, g: 250 }, { i: broccoli, g: 120 }], instructions: 'Bake the salmon and potato for 20 minutes.', prep_time_minutes: 30 },
        snacks: Array.from({ length: snacks }, (_, k) => (k % 2 ? { name: 'Nuts', items: [{ i: nuts, g: 30 }], instructions: 'A handful.', prep_time_minutes: 1 } : snack)),
    });
    return {
        name: 'Simple Fuel Plan',
        key_principles: ['Protein at every meal', 'Carbs around training', 'Vegetables at lunch and dinner', 'Water first'],
        days: Array.from({ length: days }, (_, i) => day(i + 1)),
        nutrition_tips: ['Prep the chicken and rice in one batch on Sunday.', 'Eat the biggest carb meal around your workout.', 'Drink half a litre of water before breakfast.'],
    };
}
