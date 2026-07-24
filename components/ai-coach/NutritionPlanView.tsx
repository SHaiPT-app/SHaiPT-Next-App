'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import {
    ChevronDown,
    ChevronRight,
    ShoppingCart,
    Lightbulb,
    UtensilsCrossed,
    Clock,
    Edit3,
    Check,
    X,
} from 'lucide-react';
import type { GeneratedNutritionPlanData } from '@/app/api/ai-coach/generate-nutrition-plan/route';

interface NutritionPlanViewProps {
    plan: GeneratedNutritionPlanData;
    onPlanUpdate: (plan: GeneratedNutritionPlanData) => void;
    isSaving: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

interface EditingMeal {
    dayKey: string;
    mealType: string;
    snackIndex?: number;
}

const editTextareaClass =
    'w-full resize-y rounded-md border border-line-soft bg-[var(--surface-1)] px-2 py-[0.4rem] text-[0.8rem] text-ink-hi outline-none focus:border-brand focus:ring-1 focus:ring-brand';

export default function NutritionPlanView({
    plan,
    onPlanUpdate,
    isSaving,
    saveStatus,
}: NutritionPlanViewProps) {
    const [expandedDay, setExpandedDay] = useState<string | null>('day_1');
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [showTips, setShowTips] = useState(false);
    const [editingMeal, setEditingMeal] = useState<EditingMeal | null>(null);
    const [editName, setEditName] = useState('');
    const [editIngredients, setEditIngredients] = useState('');
    const [editInstructions, setEditInstructions] = useState('');

    const dayKeys = Object.keys(plan.daily_schedule).sort();

    const startEditing = (dayKey: string, mealType: string, snackIndex?: number) => {
        const day = plan.daily_schedule[dayKey];
        const meal = snackIndex !== undefined
            ? day.snacks?.[snackIndex]
            : day[mealType as 'breakfast' | 'lunch' | 'dinner'];
        if (!meal) return;

        setEditingMeal({ dayKey, mealType, snackIndex });
        setEditName(meal.name);
        setEditIngredients(meal.ingredients.join('\n'));
        setEditInstructions(meal.instructions || '');
    };

    const saveEdit = () => {
        if (!editingMeal) return;
        const { dayKey, mealType, snackIndex } = editingMeal;

        const updatedPlan = { ...plan, daily_schedule: { ...plan.daily_schedule } };
        const day = { ...updatedPlan.daily_schedule[dayKey] };

        const updatedMeal = {
            name: editName,
            ingredients: editIngredients.split('\n').filter(i => i.trim()),
            instructions: editInstructions,
        };

        if (snackIndex !== undefined && day.snacks) {
            day.snacks = [...day.snacks];
            day.snacks[snackIndex] = { ...day.snacks[snackIndex], ...updatedMeal };
        } else {
            const key = mealType as 'breakfast' | 'lunch' | 'dinner';
            (day as Record<string, unknown>)[key] = { ...day[key], ...updatedMeal };
        }

        updatedPlan.daily_schedule[dayKey] = day;
        onPlanUpdate(updatedPlan);
        setEditingMeal(null);
    };

    const cancelEdit = () => {
        setEditingMeal(null);
    };

    const renderMeal = (
        dayKey: string,
        mealType: string,
        meal: { name: string; ingredients: string[]; instructions?: string; prep_time_minutes?: number; nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number } },
        snackIndex?: number,
    ) => {
        const isEditing = editingMeal?.dayKey === dayKey &&
            editingMeal?.mealType === mealType &&
            editingMeal?.snackIndex === snackIndex;

        const mealLabel = snackIndex !== undefined ? `Snack ${snackIndex + 1}` : mealType.charAt(0).toUpperCase() + mealType.slice(1);

        return (
            <div
                key={`${dayKey}-${mealType}-${snackIndex ?? ''}`}
                className="mb-2 rounded-lg border border-line-soft bg-[var(--surface-2)] p-3"
            >
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand">
                            {mealLabel}
                        </span>
                        {isEditing ? (
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                data-testid="edit-meal-name"
                                className="mt-1 w-full rounded-md border border-brand bg-[var(--surface-1)] px-2 py-[0.3rem] text-[0.85rem] text-ink-hi outline-none focus:ring-1 focus:ring-brand"
                            />
                        ) : (
                            <p className="text-[0.9rem] font-semibold text-ink-hi">
                                {meal.name}
                            </p>
                        )}
                    </div>
                    <div className="ml-2 flex items-center gap-1">
                        {meal.prep_time_minutes != null && meal.prep_time_minutes > 0 && (
                            <span className="mr-2 flex items-center gap-[0.2rem]">
                                <Clock size={10} className="text-ink-low" />
                                <span className="text-[0.65rem] text-ink-low">{meal.prep_time_minutes}m</span>
                            </span>
                        )}
                        {isEditing ? (
                            <>
                                <button
                                    onClick={saveEdit}
                                    data-testid="save-meal-edit"
                                    className="flex cursor-pointer items-center rounded border border-[var(--success)] bg-[var(--surface-1)] p-1"
                                >
                                    <Check size={12} className="text-[var(--success)]" />
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="flex cursor-pointer items-center rounded border border-destructive bg-[var(--surface-1)] p-1"
                                >
                                    <X size={12} className="text-destructive" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => startEditing(dayKey, mealType, snackIndex)}
                                data-testid={`edit-meal-${dayKey}-${mealType}`}
                                className="flex cursor-pointer items-center rounded border border-brand/20 bg-[var(--brand-glow-soft)] p-1"
                            >
                                <Edit3 size={12} className="text-brand" />
                            </button>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="mt-2 flex flex-col items-stretch gap-2">
                        <div>
                            <p className="mb-[0.2rem] text-[0.65rem] text-ink-mid">Ingredients (one per line)</p>
                            <textarea
                                value={editIngredients}
                                onChange={e => setEditIngredients(e.target.value)}
                                rows={4}
                                className={editTextareaClass}
                            />
                        </div>
                        <div>
                            <p className="mb-[0.2rem] text-[0.65rem] text-ink-mid">Instructions</p>
                            <textarea
                                value={editInstructions}
                                onChange={e => setEditInstructions(e.target.value)}
                                rows={2}
                                className={editTextareaClass}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-2">
                            <p className="text-xs leading-normal text-ink-mid">
                                {meal.ingredients.join(' / ')}
                            </p>
                        </div>
                        {meal.instructions && (
                            <p className="mb-2 text-xs italic text-ink-low">
                                {meal.instructions}
                            </p>
                        )}
                    </>
                )}

                {/* Macro bar */}
                <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-[0.65rem] font-semibold text-brand">{meal.nutrition.calories} cal</span>
                    <span className="text-[0.65rem] text-ink-low">P: {meal.nutrition.protein_g}g</span>
                    <span className="text-[0.65rem] text-ink-low">C: {meal.nutrition.carbs_g}g</span>
                    <span className="text-[0.65rem] text-ink-low">F: {meal.nutrition.fat_g}g</span>
                </div>
            </div>
        );
    };

    return (
        <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            data-testid="nutrition-plan-view"
        >
            {/* Plan Header */}
            <div className="mb-4 flex items-start justify-between border-b border-brand/20 pb-3">
                <div>
                    <h3 className="font-display mb-1 text-base font-bold text-ink-hi">
                        {plan.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-ink-mid">
                            {plan.plan_overview.daily_calories} cal/day
                        </span>
                        <span className="text-[0.65rem] text-ink-low">|</span>
                        <span className="text-xs text-ink-mid">
                            P: {plan.plan_overview.macros?.protein_g ?? 0}g
                        </span>
                        <span className="text-xs text-ink-mid">
                            C: {plan.plan_overview.macros?.carbs_g ?? 0}g
                        </span>
                        <span className="text-xs text-ink-mid">
                            F: {plan.plan_overview.macros?.fat_g ?? 0}g
                        </span>
                    </div>
                    {plan.dietary_preferences.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-[0.3rem]">
                            {plan.dietary_preferences.map(pref => (
                                <span
                                    key={pref}
                                    className="rounded border border-brand/25 bg-[var(--brand-glow-soft)] px-[0.4rem] py-[0.1rem] text-[0.65rem] font-semibold text-brand"
                                >
                                    {pref}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <p className={`text-[0.7rem] ${
                        saveStatus === 'saved' ? 'text-[var(--success)]' :
                        saveStatus === 'error' ? 'text-destructive' :
                        saveStatus === 'saving' ? 'text-brand' : 'text-ink-low'
                    }`}>
                        {isSaving ? 'Saving...' :
                         saveStatus === 'saved' ? 'Saved to library' :
                         saveStatus === 'error' ? 'Save failed' : ''}
                    </p>
                </div>
            </div>

            {/* Key Principles */}
            {plan.plan_overview.key_principles && plan.plan_overview.key_principles.length > 0 && (
                <div className="mb-4 rounded-lg border border-brand/15 bg-brand/5 p-3">
                    <p className="eyebrow mb-2">
                        Key Principles
                    </p>
                    <div className="flex flex-col items-stretch gap-[0.3rem]">
                        {plan.plan_overview.key_principles.map((principle, i) => (
                            <p key={i} className="text-[0.8rem] leading-snug text-ink-mid">
                                {principle}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Daily Schedule */}
            <div className="mb-4 flex flex-col items-stretch gap-2">
                {dayKeys.map((dayKey) => {
                    const day = plan.daily_schedule[dayKey];
                    const isExpanded = expandedDay === dayKey;
                    const dayNum = dayKey.replace('day_', '');
                    const dayLabel = `Day ${dayNum}`;

                    return (
                        <div
                            key={dayKey}
                            className="overflow-hidden rounded-[10px] border border-line-soft bg-[var(--surface-1)]"
                        >
                            <button
                                onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                                data-testid={`day-toggle-${dayKey}`}
                                className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent px-4 py-3 text-foreground"
                            >
                                <span className="flex items-center gap-2">
                                    <UtensilsCrossed size={14} className="text-brand" />
                                    <span className="text-[0.85rem] font-semibold">{dayLabel}</span>
                                </span>
                                {isExpanded ? <ChevronDown size={16} className="text-ink-low" /> : <ChevronRight size={16} className="text-ink-low" />}
                            </button>

                            {isExpanded && (
                                <div className="px-3 pb-3">
                                    {renderMeal(dayKey, 'breakfast', day.breakfast)}
                                    {renderMeal(dayKey, 'lunch', day.lunch)}
                                    {renderMeal(dayKey, 'dinner', day.dinner)}
                                    {day.snacks?.map((snack, idx) =>
                                        renderMeal(dayKey, 'snack', snack, idx)
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Shopping List */}
            {plan.shopping_list && (
                <div className="mb-3">
                    <button
                        onClick={() => setShowShoppingList(!showShoppingList)}
                        data-testid="toggle-shopping-list"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-brand/15 bg-brand/5 px-4 py-3 text-foreground"
                    >
                        <ShoppingCart size={14} className="text-brand" />
                        <span className="flex-1 text-left text-[0.85rem] font-semibold">
                            Shopping List
                        </span>
                        {showShoppingList ? <ChevronDown size={16} className="text-ink-low" /> : <ChevronRight size={16} className="text-ink-low" />}
                    </button>
                    {showShoppingList && (
                        <div className="mt-2 rounded-lg border border-line-soft bg-[var(--surface-1)] p-3">
                            <div className="flex flex-col items-stretch gap-3">
                                {Object.entries(plan.shopping_list).map(([category, items]) => (
                                    <div key={category}>
                                        <p className="mb-[0.3rem] text-[0.7rem] font-bold uppercase tracking-wider text-brand">
                                            {category.replace(/_/g, ' ')}
                                        </p>
                                        {items.map((item, i) => (
                                            <p key={i} className="text-[0.8rem] leading-relaxed text-ink-mid">
                                                {item}
                                            </p>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Nutrition Tips */}
            {plan.nutrition_tips && plan.nutrition_tips.length > 0 && (
                <div className="mb-3">
                    <button
                        onClick={() => setShowTips(!showTips)}
                        data-testid="toggle-nutrition-tips"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-brand/15 bg-brand/5 px-4 py-3 text-foreground"
                    >
                        <Lightbulb size={14} className="text-brand" />
                        <span className="flex-1 text-left text-[0.85rem] font-semibold">
                            Nutrition Tips
                        </span>
                        {showTips ? <ChevronDown size={16} className="text-ink-low" /> : <ChevronRight size={16} className="text-ink-low" />}
                    </button>
                    {showTips && (
                        <div className="mt-2 rounded-lg border border-line-soft bg-[var(--surface-1)] p-3">
                            <div className="flex flex-col items-stretch gap-[0.4rem]">
                                {plan.nutrition_tips.map((tip, i) => (
                                    <p key={i} className="text-[0.8rem] leading-normal text-ink-mid">
                                        {tip}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
