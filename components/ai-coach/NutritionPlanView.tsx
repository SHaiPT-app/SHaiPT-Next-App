'use client';

import { useState } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
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

const MotionBox = motion.create(Box);

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
            <Box
                key={`${dayKey}-${mealType}-${snackIndex ?? ''}`}
                p="0.75rem"
                borderRadius="8px"
                bg="rgba(255, 255, 255, 0.02)"
                border="1px solid rgba(255, 255, 255, 0.06)"
                mb="0.5rem"
            >
                <Flex justifyContent="space-between" alignItems="flex-start" mb="0.5rem">
                    <Box flex={1}>
                        <Text fontSize="0.65rem" color="var(--neon-orange)" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">
                            {mealLabel}
                        </Text>
                        {isEditing ? (
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                data-testid="edit-meal-name"
                                style={{
                                    width: '100%',
                                    padding: '0.3rem 0.5rem',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--neon-orange)',
                                    borderRadius: '6px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    marginTop: '0.25rem',
                                }}
                            />
                        ) : (
                            <Text fontSize="0.9rem" fontWeight="600" color="var(--foreground)">
                                {meal.name}
                            </Text>
                        )}
                    </Box>
                    <Flex gap="0.25rem" alignItems="center" ml="0.5rem">
                        {meal.prep_time_minutes && (
                            <Flex alignItems="center" gap="0.2rem" mr="0.5rem">
                                <Clock size={10} color="#888" />
                                <Text fontSize="0.65rem" color="#888">{meal.prep_time_minutes}m</Text>
                            </Flex>
                        )}
                        {isEditing ? (
                            <>
                                <button
                                    onClick={saveEdit}
                                    data-testid="save-meal-edit"
                                    style={{
                                        padding: '0.25rem',
                                        background: 'rgba(0, 200, 100, 0.2)',
                                        border: '1px solid rgba(0, 200, 100, 0.4)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Check size={12} color="#00C864" />
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    style={{
                                        padding: '0.25rem',
                                        background: 'rgba(255, 60, 60, 0.2)',
                                        border: '1px solid rgba(255, 60, 60, 0.4)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <X size={12} color="#FF3C3C" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => startEditing(dayKey, mealType, snackIndex)}
                                data-testid={`edit-meal-${dayKey}-${mealType}`}
                                style={{
                                    padding: '0.25rem',
                                    background: 'rgba(255, 102, 0, 0.1)',
                                    border: '1px solid rgba(255, 102, 0, 0.2)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Edit3 size={12} color="#FF6600" />
                            </button>
                        )}
                    </Flex>
                </Flex>

                {isEditing ? (
                    <VStack gap="0.5rem" align="stretch" mt="0.5rem">
                        <Box>
                            <Text fontSize="0.65rem" color="#888" mb="0.2rem">Ingredients (one per line)</Text>
                            <textarea
                                value={editIngredients}
                                onChange={e => setEditIngredients(e.target.value)}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.5rem',
                                    fontSize: '0.8rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </Box>
                        <Box>
                            <Text fontSize="0.65rem" color="#888" mb="0.2rem">Instructions</Text>
                            <textarea
                                value={editInstructions}
                                onChange={e => setEditInstructions(e.target.value)}
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.5rem',
                                    fontSize: '0.8rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </Box>
                    </VStack>
                ) : (
                    <>
                        <Box mb="0.5rem">
                            <Text fontSize="0.75rem" color="#aaa" lineHeight="1.5">
                                {meal.ingredients.join(' / ')}
                            </Text>
                        </Box>
                        {meal.instructions && (
                            <Text fontSize="0.75rem" color="#888" fontStyle="italic" mb="0.5rem">
                                {meal.instructions}
                            </Text>
                        )}
                    </>
                )}

                {/* Macro bar */}
                <Flex gap="0.5rem" flexWrap="wrap" mt="0.25rem">
                    <Text fontSize="0.65rem" color="#FF6600" fontWeight="600">{meal.nutrition.calories} cal</Text>
                    <Text fontSize="0.65rem" color="#888">P: {meal.nutrition.protein_g}g</Text>
                    <Text fontSize="0.65rem" color="#888">C: {meal.nutrition.carbs_g}g</Text>
                    <Text fontSize="0.65rem" color="#888">F: {meal.nutrition.fat_g}g</Text>
                </Flex>
            </Box>
        );
    };

    return (
        <MotionBox
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            data-testid="nutrition-plan-view"
        >
            {/* Plan Header */}
            <Flex
                justifyContent="space-between"
                alignItems="flex-start"
                mb="1rem"
                pb="0.75rem"
                borderBottom="1px solid rgba(255, 102, 0, 0.2)"
            >
                <Box>
                    <Text
                        fontFamily="var(--font-orbitron)"
                        fontSize="1rem"
                        fontWeight="700"
                        color="var(--neon-orange)"
                        mb="0.25rem"
                    >
                        {plan.name}
                    </Text>
                    <Flex gap="0.5rem" flexWrap="wrap" alignItems="center">
                        <Text fontSize="0.75rem" color="#888">
                            {plan.plan_overview.daily_calories} cal/day
                        </Text>
                        <Text fontSize="0.65rem" color="#666">|</Text>
                        <Text fontSize="0.75rem" color="#888">
                            P: {plan.plan_overview.macros.protein_g}g
                        </Text>
                        <Text fontSize="0.75rem" color="#888">
                            C: {plan.plan_overview.macros.carbs_g}g
                        </Text>
                        <Text fontSize="0.75rem" color="#888">
                            F: {plan.plan_overview.macros.fat_g}g
                        </Text>
                    </Flex>
                    {plan.dietary_preferences.length > 0 && (
                        <Flex gap="0.3rem" mt="0.5rem" flexWrap="wrap">
                            {plan.dietary_preferences.map(pref => (
                                <Box
                                    key={pref}
                                    px="0.4rem"
                                    py="0.1rem"
                                    borderRadius="4px"
                                    bg="rgba(255, 102, 0, 0.15)"
                                    border="1px solid rgba(255, 102, 0, 0.25)"
                                >
                                    <Text fontSize="0.65rem" color="#FF6600" fontWeight="600">{pref}</Text>
                                </Box>
                            ))}
                        </Flex>
                    )}
                </Box>
                <Box textAlign="right">
                    <Text fontSize="0.7rem" color={
                        saveStatus === 'saved' ? '#00C864' :
                        saveStatus === 'error' ? '#FF3C3C' :
                        saveStatus === 'saving' ? '#FF6600' : '#888'
                    }>
                        {isSaving ? 'Saving...' :
                         saveStatus === 'saved' ? 'Saved to library' :
                         saveStatus === 'error' ? 'Save failed' : ''}
                    </Text>
                </Box>
            </Flex>

            {/* Key Principles */}
            {plan.plan_overview.key_principles && plan.plan_overview.key_principles.length > 0 && (
                <Box mb="1rem" p="0.75rem" borderRadius="8px" bg="rgba(255, 102, 0, 0.04)" border="1px solid rgba(255, 102, 0, 0.12)">
                    <Text fontSize="0.7rem" fontWeight="700" color="var(--neon-orange)" textTransform="uppercase" letterSpacing="0.05em" mb="0.5rem">
                        Key Principles
                    </Text>
                    <VStack gap="0.3rem" align="stretch">
                        {plan.plan_overview.key_principles.map((principle, i) => (
                            <Text key={i} fontSize="0.8rem" color="#ccc" lineHeight="1.4">
                                {principle}
                            </Text>
                        ))}
                    </VStack>
                </Box>
            )}

            {/* Daily Schedule */}
            <VStack gap="0.5rem" align="stretch" mb="1rem">
                {dayKeys.map((dayKey) => {
                    const day = plan.daily_schedule[dayKey];
                    const isExpanded = expandedDay === dayKey;
                    const dayNum = dayKey.replace('day_', '');
                    const dayLabel = `Day ${dayNum}`;

                    return (
                        <Box
                            key={dayKey}
                            borderRadius="10px"
                            bg="rgba(255, 255, 255, 0.02)"
                            border="1px solid rgba(255, 255, 255, 0.06)"
                            overflow="hidden"
                        >
                            <button
                                onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                                data-testid={`day-toggle-${dayKey}`}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--foreground)',
                                }}
                            >
                                <Flex alignItems="center" gap="0.5rem">
                                    <UtensilsCrossed size={14} color="#FF6600" />
                                    <Text fontWeight="600" fontSize="0.85rem">{dayLabel}</Text>
                                </Flex>
                                {isExpanded ? <ChevronDown size={16} color="#888" /> : <ChevronRight size={16} color="#888" />}
                            </button>

                            {isExpanded && (
                                <Box px="0.75rem" pb="0.75rem">
                                    {renderMeal(dayKey, 'breakfast', day.breakfast)}
                                    {renderMeal(dayKey, 'lunch', day.lunch)}
                                    {renderMeal(dayKey, 'dinner', day.dinner)}
                                    {day.snacks?.map((snack, idx) =>
                                        renderMeal(dayKey, 'snack', snack, idx)
                                    )}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </VStack>

            {/* Shopping List */}
            {plan.shopping_list && (
                <Box mb="0.75rem">
                    <button
                        onClick={() => setShowShoppingList(!showShoppingList)}
                        data-testid="toggle-shopping-list"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255, 102, 0, 0.05)',
                            border: '1px solid rgba(255, 102, 0, 0.15)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                        }}
                    >
                        <ShoppingCart size={14} color="#FF6600" />
                        <Text fontWeight="600" fontSize="0.85rem" flex={1} textAlign="left">
                            Shopping List
                        </Text>
                        {showShoppingList ? <ChevronDown size={16} color="#888" /> : <ChevronRight size={16} color="#888" />}
                    </button>
                    {showShoppingList && (
                        <Box mt="0.5rem" p="0.75rem" borderRadius="8px" bg="rgba(255, 255, 255, 0.02)" border="1px solid rgba(255, 255, 255, 0.06)">
                            <VStack gap="0.75rem" align="stretch">
                                {Object.entries(plan.shopping_list).map(([category, items]) => (
                                    <Box key={category}>
                                        <Text fontSize="0.7rem" fontWeight="700" color="var(--neon-orange)" textTransform="uppercase" letterSpacing="0.05em" mb="0.3rem">
                                            {category.replace(/_/g, ' ')}
                                        </Text>
                                        {items.map((item, i) => (
                                            <Text key={i} fontSize="0.8rem" color="#ccc" lineHeight="1.6">
                                                {item}
                                            </Text>
                                        ))}
                                    </Box>
                                ))}
                            </VStack>
                        </Box>
                    )}
                </Box>
            )}

            {/* Nutrition Tips */}
            {plan.nutrition_tips && plan.nutrition_tips.length > 0 && (
                <Box mb="0.75rem">
                    <button
                        onClick={() => setShowTips(!showTips)}
                        data-testid="toggle-nutrition-tips"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255, 102, 0, 0.05)',
                            border: '1px solid rgba(255, 102, 0, 0.15)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                        }}
                    >
                        <Lightbulb size={14} color="#FF6600" />
                        <Text fontWeight="600" fontSize="0.85rem" flex={1} textAlign="left">
                            Nutrition Tips
                        </Text>
                        {showTips ? <ChevronDown size={16} color="#888" /> : <ChevronRight size={16} color="#888" />}
                    </button>
                    {showTips && (
                        <Box mt="0.5rem" p="0.75rem" borderRadius="8px" bg="rgba(255, 255, 255, 0.02)" border="1px solid rgba(255, 255, 255, 0.06)">
                            <VStack gap="0.4rem" align="stretch">
                                {plan.nutrition_tips.map((tip, i) => (
                                    <Text key={i} fontSize="0.8rem" color="#ccc" lineHeight="1.5">
                                        {tip}
                                    </Text>
                                ))}
                            </VStack>
                        </Box>
                    )}
                </Box>
            )}
        </MotionBox>
    );
}
