'use client';

import { useState } from 'react';
import ChatInterface from './ChatInterface';

interface Question {
    id: string;
    prompt: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    validation?: (value: any) => boolean;
    placeholder?: string;
}

const dietQuestions: Question[] = [
    {
        id: 'age',
        prompt: "How old are you?",
        type: 'number',
        placeholder: 'e.g., 25',
        validation: (val) => val >= 10 && val <= 100
    },
    {
        id: 'gender',
        prompt: "What's your gender?",
        type: 'select',
        options: ['male', 'female']
    },
    {
        id: 'weight_kg',
        prompt: "What's your current weight in kg?",
        type: 'number',
        placeholder: 'e.g., 70',
        validation: (val) => val > 0 && val < 300
    },
    {
        id: 'height_cm',
        prompt: "What's your height in cm?",
        type: 'number',
        placeholder: 'e.g., 175',
        validation: (val) => val > 0 && val < 300
    },
    {
        id: 'activity_level',
        prompt: "How active are you?",
        type: 'select',
        options: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']
    },
    {
        id: 'fitness_goals',
        prompt: "What's your fitness goal?",
        type: 'select',
        options: ['weight_loss', 'muscle_gain', 'maintenance', 'aggressive_cut']
    },
    {
        id: 'meals_per_day',
        prompt: "How many meals per day do you prefer?",
        type: 'number',
        placeholder: 'e.g., 3',
        validation: (val) => val >= 2 && val <= 6
    },
    {
        id: 'allergies',
        prompt: "Do you have any food allergies? (Type 'none' if not)",
        type: 'text',
        placeholder: 'e.g., peanuts, dairy, or none'
    }
];

export default function AIDietitian({ user }: { user: any }) {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);

    const handleChatComplete = async (answers: Record<string, any>) => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai-coach/diet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        name: user.username,
                        age: answers.age,
                        gender: answers.gender,
                        weight_kg: answers.weight_kg,
                        height_cm: answers.height_cm,
                        activity_level: answers.activity_level,
                        fitness_goals: [answers.fitness_goals],
                        dietary_preferences: [],
                        meals_per_day: answers.meals_per_day,
                        budget_level: 'moderate',
                        cooking_skill: 'intermediate',
                        meal_prep_time_minutes: 30,
                        allergies: answers.allergies !== 'none'
                            ? answers.allergies.split(',').map((s: string) => s.trim())
                            : [],
                        food_dislikes: [],
                        medical_conditions: []
                    }
                })
            });
            const data = await response.json();
            setPlan(data);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate diet plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>AI Dietitian</h2>

            {!plan ? (
                <ChatInterface
                    questions={dietQuestions}
                    onComplete={handleChatComplete}
                    title="Dietitian"
                    loading={loading}
                />
            ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Your Nutrition Plan</h3>
                        <button onClick={() => setPlan(null)} style={{ background: 'transparent', border: '1px solid #666', color: '#ccc', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                            Create New
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#222', padding: '0.5rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Calories</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{plan.daily_calories}</div>
                        </div>
                        <div style={{ background: '#222', padding: '0.5rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Protein</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{plan.macros?.protein_g || 0}g</div>
                        </div>
                        <div style={{ background: '#222', padding: '0.5rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Carbs</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{plan.macros?.carbs_g || 0}g</div>
                        </div>
                        <div style={{ background: '#222', padding: '0.5rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Fats</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{plan.macros?.fat_g || 0}g</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {plan.meal_schedule?.daily_schedule ? (
                            Object.entries(plan.meal_schedule.daily_schedule).map(([day, meals]: [string, any]) => (
                                <div key={day} style={{ border: '1px solid #444', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ textTransform: 'capitalize', color: 'var(--accent)', marginBottom: '0.5rem' }}>{day.replace('_', ' ')}</h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {Object.entries(meals).map(([mealType, meal]: [string, any]) => {
                                            if (Array.isArray(meal) && meal.length === 0) return null;
                                            if (typeof meal === 'object' && Object.keys(meal).length === 0) return null;

                                            return (
                                                <div key={mealType} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                                    <h5 style={{ textTransform: 'capitalize', marginBottom: '0.5rem', color: '#ddd' }}>{mealType}</h5>
                                                    {meal.name ? (
                                                        <>
                                                            <div style={{ fontWeight: 'bold' }}>{meal.name}</div>
                                                            <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '0.25rem' }}>
                                                                {meal.nutrition?.calories} kcal | P: {meal.nutrition?.protein_g}g | C: {meal.nutrition?.carbs_g}g | F: {meal.nutrition?.fat_g}g
                                                            </div>
                                                            {meal.ingredients && (
                                                                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                                                                    {meal.ingredients.join(', ')}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>See details</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                                No meal schedule available.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
