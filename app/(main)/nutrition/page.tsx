'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronRight,
    Utensils,
    Flame,
    Beef,
    Wheat,
    Droplets,
    RefreshCw,
    Clock,
    ShoppingCart,
    Lightbulb,
    Loader2,
} from 'lucide-react';
import ErrorState from '@/components/ErrorState';
import type { Profile, NutritionPlan, Meal, DayMeals, MealNutrition } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

const DIETARY_TAG_COLORS: Record<string, string> = {
    vegan: '#FF6600',
    vegetarian: '#10b981',
    keto: '#FF8A00',
    paleo: '#f59e0b',
    'gluten_free': '#FF6600',
    'dairy_free': '#FF8A00',
    halal: '#10b981',
    kosher: '#E04E00',
};

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

const MEAL_TYPE_LABELS: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDayLabel(dayKey: string): string {
    return dayKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function computeDayTotals(dayMeals: DayMeals): MealNutrition {
    const totals: MealNutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

    const meals = [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner];
    for (const meal of meals) {
        if (meal?.nutrition) {
            totals.calories += meal.nutrition.calories || 0;
            totals.protein_g += meal.nutrition.protein_g || 0;
            totals.carbs_g += meal.nutrition.carbs_g || 0;
            totals.fat_g += meal.nutrition.fat_g || 0;
        }
    }

    if (dayMeals.snacks) {
        for (const snack of dayMeals.snacks) {
            if (snack?.nutrition) {
                totals.calories += snack.nutrition.calories || 0;
                totals.protein_g += snack.nutrition.protein_g || 0;
                totals.carbs_g += snack.nutrition.carbs_g || 0;
                totals.fat_g += snack.nutrition.fat_g || 0;
            }
        }
    }

    return totals;
}

function formatDietaryTag(tag: string): string {
    return tag
        .replace(/_/g, '-')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MacroBar({ label, value, unit, color, icon: Icon }: {
    label: string;
    value: number;
    unit: string;
    color: string;
    icon: typeof Flame;
}) {
    return (
        <div
            className="flex items-center gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2"
            style={{ borderColor: `${color}22` }}
        >
            <Icon size={14} className="shrink-0" style={{ color }} />
            <div className="flex-1">
                <div className="text-[0.7rem] uppercase tracking-[0.05em] text-ink-low">{label}</div>
                <div className="font-display font-semibold" style={{ color }}>{Math.round(value)}{unit}</div>
            </div>
        </div>
    );
}

function MacroSummaryRow({ nutrition, compact }: { nutrition: MealNutrition; compact?: boolean }) {
    return (
        <div className={`grid grid-cols-4 ${compact ? 'gap-1 text-[0.75rem]' : 'gap-2 text-[0.85rem]'}`}>
            <MacroBar label="Calories" value={nutrition.calories} unit=" kcal" color="#f59e0b" icon={Flame} />
            <MacroBar label="Protein" value={nutrition.protein_g} unit="g" color="#FF6600" icon={Beef} />
            <MacroBar label="Carbs" value={nutrition.carbs_g} unit="g" color="#FF8A00" icon={Wheat} />
            <MacroBar label="Fats" value={nutrition.fat_g} unit="g" color="#E04E00" icon={Droplets} />
        </div>
    );
}

function MealCard({ meal, mealType }: { meal: Meal; mealType: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)]">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent px-4 py-3 text-left transition-colors hover:bg-[var(--brand-glow-soft)]"
            >
                <div className="flex items-center gap-3">
                    <Utensils size={14} className="shrink-0 text-brand" />
                    <div>
                        <div className="text-[0.7rem] uppercase tracking-[0.05em] text-ink-low">
                            {MEAL_TYPE_LABELS[mealType] || mealType}
                        </div>
                        <div className="font-semibold text-ink-hi">{meal.name}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {meal.nutrition && (
                        <span className="font-display text-[0.8rem] text-[var(--warning)]">
                            {meal.nutrition.calories} kcal
                        </span>
                    )}
                    {expanded ? <ChevronDown size={16} className="text-ink-low" /> : <ChevronRight size={16} className="text-ink-low" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid gap-3 px-4 pb-4">
                            {meal.nutrition && <MacroSummaryRow nutrition={meal.nutrition} compact />}

                            {meal.prep_time_minutes && (
                                <div className="flex items-center gap-2 text-[0.8rem] text-ink-low">
                                    <Clock size={12} />
                                    <span>{meal.prep_time_minutes} min prep</span>
                                </div>
                            )}

                            {meal.ingredients && meal.ingredients.length > 0 && (
                                <div>
                                    <div className="mb-1 text-[0.7rem] uppercase text-ink-low">
                                        Ingredients
                                    </div>
                                    <ul className="m-0 list-disc pl-5 text-[0.85rem] text-ink-mid">
                                        {meal.ingredients.map((ing, i) => (
                                            <li key={i} className="mb-0.5">{ing}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {meal.instructions && (
                                <div>
                                    <div className="mb-1 text-[0.7rem] uppercase text-ink-low">
                                        Instructions
                                    </div>
                                    <p className="m-0 text-[0.85rem] leading-normal text-ink-mid">
                                        {meal.instructions}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DayCard({ dayKey, dayMeals }: { dayKey: string; dayMeals: DayMeals }) {
    const [expanded, setExpanded] = useState(false);
    const totals = computeDayTotals(dayMeals);

    return (
        <motion.div layout className="glass-card overflow-hidden">
            {/* Day header */}
            <button
                onClick={() => setExpanded(!expanded)}
                data-testid={`day-header-${dayKey}`}
                className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--brand-glow-soft)] ${
                    expanded ? 'bg-[var(--brand-glow-soft)]' : 'bg-transparent'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-glow-soft)] font-display text-[0.85rem] font-bold text-brand">
                        {dayKey.replace(/\D/g, '') || dayKey.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-base font-semibold text-ink-hi">{formatDayLabel(dayKey)}</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-4 font-display text-[0.8rem]">
                        <span className="text-[var(--warning)]">{Math.round(totals.calories)} kcal</span>
                        <span className="text-brand">P: {Math.round(totals.protein_g)}g</span>
                        <span className="text-[var(--brand-hot)]">C: {Math.round(totals.carbs_g)}g</span>
                        <span className="text-[var(--brand-deep)]">F: {Math.round(totals.fat_g)}g</span>
                    </div>
                    {expanded ? <ChevronDown size={18} className="text-ink-low" /> : <ChevronRight size={18} className="text-ink-low" />}
                </div>
            </button>

            {/* Day meals */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="grid gap-2 px-5 pb-5">
                            {/* Daily totals bar */}
                            <div className="mb-1 rounded-xl border border-brand/30 bg-[var(--brand-glow-soft)] p-3">
                                <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-brand">
                                    Daily Totals
                                </div>
                                <MacroSummaryRow nutrition={totals} />
                            </div>

                            {/* Main meals */}
                            {MEAL_TYPE_ORDER.map(mealType => {
                                if (mealType === 'snacks') {
                                    if (!dayMeals.snacks || dayMeals.snacks.length === 0) return null;
                                    return dayMeals.snacks.map((snack, i) => (
                                        <MealCard key={`snack-${i}`} meal={snack} mealType={`snack ${i + 1}`} />
                                    ));
                                }
                                const meal = dayMeals[mealType];
                                if (!meal) return null;
                                return <MealCard key={mealType} meal={meal} mealType={mealType} />;
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function NutritionPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [plan, setPlan] = useState<NutritionPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [showTips, setShowTips] = useState(false);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                router.push('/');
                return;
            }
        } else {
            router.push('/');
            return;
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch existing nutrition plan
    const fetchPlan = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/nutrition?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.plan) {
                    setPlan(data.plan);
                }
            }
        } catch (err) {
            console.error('Failed to fetch nutrition plan:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchPlan();
        }
    }, [user, fetchPlan]);

    // Generate new plan
    const handleGeneratePlan = async () => {
        if (!user) return;
        setGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/nutrition/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate plan');
            }

            const data = await res.json();
            setPlan(data.plan);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate meal plan');
        } finally {
            setGenerating(false);
        }
    };

    // Sorted day keys
    const dayKeys = plan?.daily_schedule ? Object.keys(plan.daily_schedule) : [];

    if (loading && !user) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[900px] p-6 pb-8">
            {/* Page Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="display text-gradient-brand mb-2 text-[2rem]">
                        Nutrition Plan
                    </h1>
                    <p className="text-sm text-ink-mid">
                        AI-generated meal plans tailored to your goals and preferences
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        onClick={() => router.push('/nutrition/grocery')}
                        className="btn-soft !px-4 !py-2 !text-[0.85rem] !font-medium"
                    >
                        <ShoppingCart size={14} />
                        Grocery List
                    </button>
                    <button
                        onClick={() => router.push('/nutrition/tracking')}
                        className="btn-soft !px-4 !py-2 !text-[0.85rem] !font-medium"
                    >
                        <Flame size={14} />
                        Track Macros
                    </button>
                </div>
            </div>

            {/* Loading state */}
            {loading && user && (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="spinner" />
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="mb-6">
                    <ErrorState message={error} onRetry={fetchPlan} />
                </div>
            )}

            {/* No plan state */}
            {!loading && !plan && (
                <div className="glass-card px-8 py-16 text-center">
                    <Utensils size={48} className="mx-auto mb-6 text-brand opacity-70" />
                    <h2 className="mb-3 text-xl font-semibold text-ink-hi">
                        No nutrition plan yet
                    </h2>
                    <p className="mx-auto mb-8 max-w-[400px] text-ink-mid">
                        Generate a personalized meal plan based on your profile, fitness goals, and dietary preferences.
                    </p>
                    <button
                        onClick={handleGeneratePlan}
                        disabled={generating}
                        className="btn-brand"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Meal Plan'
                        )}
                    </button>
                </div>
            )}

            {/* Plan content */}
            {!loading && plan && (
                <div className="grid gap-6">
                    {/* Plan overview header */}
                    <div className="glass-card p-5">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="font-display mb-1 text-[1.1rem] font-semibold text-ink-hi">
                                    {plan.name || `${plan.plan_overview.duration_days}-Day Meal Plan`}
                                </h2>
                                <span className="text-[0.8rem] text-ink-low">
                                    {plan.plan_overview.duration_days} days
                                </span>
                            </div>
                            <button
                                onClick={handleGeneratePlan}
                                disabled={generating}
                                className="btn-soft !px-4 !py-2 !text-[0.85rem] !font-medium disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {generating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={14} />
                                )}
                                Regenerate
                            </button>
                        </div>

                        {/* Dietary preference tags */}
                        {plan.dietary_preferences && plan.dietary_preferences.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {plan.dietary_preferences.map(tag => (
                                    <span
                                        key={tag}
                                        className="rounded-full border px-3 py-1 text-xs font-semibold"
                                        style={{
                                            background: `${DIETARY_TAG_COLORS[tag] || '#FF6600'}15`,
                                            color: DIETARY_TAG_COLORS[tag] || '#FF6600',
                                            borderColor: `${DIETARY_TAG_COLORS[tag] || '#FF6600'}33`,
                                        }}
                                    >
                                        {formatDietaryTag(tag)}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Daily target macros */}
                        {plan.plan_overview.macros && (
                            <MacroSummaryRow nutrition={{
                                calories: plan.plan_overview.daily_calories || plan.plan_overview.macros.calories || 0,
                                protein_g: plan.plan_overview.macros.protein_g,
                                carbs_g: plan.plan_overview.macros.carbs_g,
                                fat_g: plan.plan_overview.macros.fat_g,
                            }} />
                        )}
                    </div>

                    {/* Action buttons: Shopping List & Tips */}
                    <div className="flex flex-wrap gap-3">
                        {plan.shopping_list && Object.keys(plan.shopping_list).length > 0 && (
                            <button
                                onClick={() => setShowShoppingList(!showShoppingList)}
                                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[0.85rem] transition-colors ${
                                    showShoppingList
                                        ? 'border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                                        : 'border-[var(--line-soft)] bg-[var(--surface-2)] text-ink-low hover:border-[var(--line-strong)] hover:text-ink-mid'
                                }`}
                            >
                                <ShoppingCart size={14} />
                                Shopping List
                            </button>
                        )}
                        {plan.nutrition_tips && plan.nutrition_tips.length > 0 && (
                            <button
                                onClick={() => setShowTips(!showTips)}
                                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[0.85rem] transition-colors ${
                                    showTips
                                        ? 'border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]'
                                        : 'border-[var(--line-soft)] bg-[var(--surface-2)] text-ink-low hover:border-[var(--line-strong)] hover:text-ink-mid'
                                }`}
                            >
                                <Lightbulb size={14} />
                                Nutrition Tips
                            </button>
                        )}
                    </div>

                    {/* Shopping List Panel */}
                    <AnimatePresence>
                        {showShoppingList && plan.shopping_list && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-xl border border-brand/30 bg-[var(--brand-glow-soft)] p-5">
                                    <h3 className="mb-4 text-base font-semibold text-brand">
                                        Shopping List
                                    </h3>
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                        {Object.entries(plan.shopping_list).map(([category, items]) => (
                                            <div key={category}>
                                                <div className="mb-2 text-xs font-semibold uppercase text-ink-low">
                                                    {category.replace(/_/g, ' ')}
                                                </div>
                                                <ul className="m-0 list-disc pl-4 text-[0.85rem] text-ink-mid">
                                                    {items.map((item, i) => (
                                                        <li key={i} className="mb-1">{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tips Panel */}
                    <AnimatePresence>
                        {showTips && plan.nutrition_tips && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-5">
                                    <h3 className="mb-4 text-base font-semibold text-[var(--warning)]">
                                        Nutrition Tips
                                    </h3>
                                    <ul className="m-0 list-disc pl-5 text-[0.9rem] text-ink-mid">
                                        {plan.nutrition_tips.map((tip, i) => (
                                            <li key={i} className="mb-2 leading-normal">{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Day selector pills */}
                    {dayKeys.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            <button
                                onClick={() => setSelectedDay(null)}
                                className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-[0.8rem] font-medium transition-colors ${
                                    !selectedDay
                                        ? 'border-brand bg-[var(--brand-glow-soft)] text-brand'
                                        : 'border-[var(--line-strong)] bg-transparent text-ink-low hover:border-brand/40 hover:text-ink-mid'
                                }`}
                            >
                                All Days
                            </button>
                            {dayKeys.map(dk => (
                                <button
                                    key={dk}
                                    onClick={() => setSelectedDay(dk)}
                                    className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-[0.8rem] font-medium transition-colors ${
                                        selectedDay === dk
                                            ? 'border-brand bg-[var(--brand-glow-soft)] text-brand'
                                            : 'border-[var(--line-strong)] bg-transparent text-ink-low hover:border-brand/40 hover:text-ink-mid'
                                    }`}
                                >
                                    {formatDayLabel(dk)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Day cards */}
                    <div className="grid gap-3">
                        {dayKeys
                            .filter(dk => !selectedDay || dk === selectedDay)
                            .map(dk => (
                                <DayCard
                                    key={dk}
                                    dayKey={dk}
                                    dayMeals={plan.daily_schedule[dk]}
                                />
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
