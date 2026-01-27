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
import type { Profile, NutritionPlan, Meal, DayMeals, MealNutrition } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

const DIETARY_TAG_COLORS: Record<string, string> = {
    vegan: '#39ff14',
    vegetarian: '#6ee7b7',
    keto: '#ff007f',
    paleo: '#f59e0b',
    'gluten_free': '#00d4ff',
    'dairy_free': '#c084fc',
    halal: '#10b981',
    kosher: '#818cf8',
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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: `1px solid ${color}22`,
        }}>
            <Icon size={14} style={{ color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontWeight: 600, color }}>{Math.round(value)}{unit}</div>
            </div>
        </div>
    );
}

function MacroSummaryRow({ nutrition, compact }: { nutrition: MealNutrition; compact?: boolean }) {
    const size = compact ? '0.75rem' : '0.85rem';
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: compact ? '0.25rem' : '0.5rem',
            fontSize: size,
        }}>
            <MacroBar label="Calories" value={nutrition.calories} unit=" kcal" color="#f59e0b" icon={Flame} />
            <MacroBar label="Protein" value={nutrition.protein_g} unit="g" color="#39ff14" icon={Beef} />
            <MacroBar label="Carbs" value={nutrition.carbs_g} unit="g" color="#00d4ff" icon={Wheat} />
            <MacroBar label="Fats" value={nutrition.fat_g} unit="g" color="#ff007f" icon={Droplets} />
        </div>
    );
}

function MealCard({ meal, mealType }: { meal: Meal; mealType: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Utensils size={14} style={{ color: '#39ff14' }} />
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {MEAL_TYPE_LABELS[mealType] || mealType}
                        </div>
                        <div style={{ fontWeight: 600, color: '#e5e5e7' }}>{meal.name}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {meal.nutrition && (
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                            {meal.nutrition.calories} kcal
                        </span>
                    )}
                    {expanded ? <ChevronDown size={16} color="#888" /> : <ChevronRight size={16} color="#888" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '0.75rem' }}>
                            {meal.nutrition && <MacroSummaryRow nutrition={meal.nutrition} compact />}

                            {meal.prep_time_minutes && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                                    <Clock size={12} />
                                    <span>{meal.prep_time_minutes} min prep</span>
                                </div>
                            )}

                            {meal.ingredients && meal.ingredients.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                        Ingredients
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#aaa', fontSize: '0.85rem' }}>
                                        {meal.ingredients.map((ing, i) => (
                                            <li key={i} style={{ marginBottom: '0.15rem' }}>{ing}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {meal.instructions && (
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                        Instructions
                                    </div>
                                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem', lineHeight: 1.5 }}>
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
        <motion.div
            layout
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
            }}
        >
            {/* Day header */}
            <button
                onClick={() => setExpanded(!expanded)}
                data-testid={`day-header-${dayKey}`}
                style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: expanded ? 'rgba(57, 255, 20, 0.03)' : 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(57, 255, 20, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#39ff14',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                    }}>
                        {dayKey.replace(/\D/g, '') || dayKey.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{formatDayLabel(dayKey)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#f59e0b' }}>{Math.round(totals.calories)} kcal</span>
                        <span style={{ color: '#39ff14' }}>P: {Math.round(totals.protein_g)}g</span>
                        <span style={{ color: '#00d4ff' }}>C: {Math.round(totals.carbs_g)}g</span>
                        <span style={{ color: '#ff007f' }}>F: {Math.round(totals.fat_g)}g</span>
                    </div>
                    {expanded ? <ChevronDown size={18} color="#888" /> : <ChevronRight size={18} color="#888" />}
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
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gap: '0.5rem' }}>
                            {/* Daily totals bar */}
                            <div style={{
                                padding: '0.75rem',
                                background: 'rgba(57, 255, 20, 0.04)',
                                borderRadius: '8px',
                                border: '1px solid rgba(57, 255, 20, 0.1)',
                                marginBottom: '0.25rem',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: '#39ff14', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
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
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '2rem 1rem',
        }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#39ff14',
                        marginBottom: '0.5rem',
                    }}>
                        Nutrition Plan
                    </h1>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                        AI-generated meal plans tailored to your goals and preferences
                    </p>
                </div>
                <button
                    onClick={() => router.push('/nutrition/tracking')}
                    style={{
                        padding: '0.5rem 1.25rem',
                        background: 'rgba(57, 255, 20, 0.1)',
                        color: '#39ff14',
                        border: '1px solid rgba(57, 255, 20, 0.2)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                    }}
                >
                    <Flame size={14} />
                    Track Macros
                </button>
            </div>

            {/* Loading state */}
            {loading && user && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '40vh',
                }}>
                    <div className="spinner" />
                </div>
            )}

            {/* Error state */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            {/* No plan state */}
            {!loading && !plan && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <Utensils size={48} style={{ color: '#39ff14', marginBottom: '1.5rem', opacity: 0.7 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        No nutrition plan yet
                    </h2>
                    <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                        Generate a personalized meal plan based on your profile, fitness goals, and dietary preferences.
                    </p>
                    <button
                        onClick={handleGeneratePlan}
                        disabled={generating}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#39ff14',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            opacity: generating ? 0.6 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {generating ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
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
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Plan overview header */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '1rem',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {plan.name || `${plan.plan_overview.duration_days}-Day Meal Plan`}
                                </h2>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                    {plan.plan_overview.duration_days} days
                                </span>
                            </div>
                            <button
                                onClick={handleGeneratePlan}
                                disabled={generating}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(57, 255, 20, 0.1)',
                                    color: '#39ff14',
                                    border: '1px solid rgba(57, 255, 20, 0.2)',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    cursor: generating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: generating ? 0.6 : 1,
                                }}
                            >
                                {generating ? (
                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <RefreshCw size={14} />
                                )}
                                Regenerate
                            </button>
                        </div>

                        {/* Dietary preference tags */}
                        {plan.dietary_preferences && plan.dietary_preferences.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {plan.dietary_preferences.map(tag => (
                                    <span
                                        key={tag}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: `${DIETARY_TAG_COLORS[tag] || '#888'}15`,
                                            color: DIETARY_TAG_COLORS[tag] || '#888',
                                            border: `1px solid ${DIETARY_TAG_COLORS[tag] || '#888'}33`,
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
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {plan.shopping_list && Object.keys(plan.shopping_list).length > 0 && (
                            <button
                                onClick={() => setShowShoppingList(!showShoppingList)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: showShoppingList ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                                    color: showShoppingList ? '#00d4ff' : '#888',
                                    border: `1px solid ${showShoppingList ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <ShoppingCart size={14} />
                                Shopping List
                            </button>
                        )}
                        {plan.nutrition_tips && plan.nutrition_tips.length > 0 && (
                            <button
                                onClick={() => setShowTips(!showTips)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: showTips ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                                    color: showTips ? '#f59e0b' : '#888',
                                    border: `1px solid ${showTips ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
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
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    background: 'rgba(0, 212, 255, 0.03)',
                                    border: '1px solid rgba(0, 212, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#00d4ff', marginBottom: '1rem' }}>
                                        Shopping List
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {Object.entries(plan.shopping_list).map(([category, items]) => (
                                            <div key={category}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    color: '#888',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {category.replace(/_/g, ' ')}
                                                </div>
                                                <ul style={{ margin: 0, paddingLeft: '1rem', color: '#aaa', fontSize: '0.85rem' }}>
                                                    {items.map((item, i) => (
                                                        <li key={i} style={{ marginBottom: '0.2rem' }}>{item}</li>
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
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.03)',
                                    border: '1px solid rgba(245, 158, 11, 0.1)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b', marginBottom: '1rem' }}>
                                        Nutrition Tips
                                    </h3>
                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#aaa', fontSize: '0.9rem' }}>
                                        {plan.nutrition_tips.map((tip, i) => (
                                            <li key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.5 }}>{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Day selector pills */}
                    {dayKeys.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            overflowX: 'auto',
                            paddingBottom: '0.5rem',
                        }}>
                            <button
                                onClick={() => setSelectedDay(null)}
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '20px',
                                    border: `1px solid ${!selectedDay ? '#39ff14' : 'rgba(255,255,255,0.1)'}`,
                                    background: !selectedDay ? 'rgba(57, 255, 20, 0.15)' : 'transparent',
                                    color: !selectedDay ? '#39ff14' : '#888',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                All Days
                            </button>
                            {dayKeys.map(dk => (
                                <button
                                    key={dk}
                                    onClick={() => setSelectedDay(dk)}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: '20px',
                                        border: `1px solid ${selectedDay === dk ? '#39ff14' : 'rgba(255,255,255,0.1)'}`,
                                        background: selectedDay === dk ? 'rgba(57, 255, 20, 0.15)' : 'transparent',
                                        color: selectedDay === dk ? '#39ff14' : '#888',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    {formatDayLabel(dk)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Day cards */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
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

            {/* Spin animation keyframes */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
