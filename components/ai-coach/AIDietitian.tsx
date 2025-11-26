
'use client';

import { useState } from 'react';

export default function AIDietitian({ user }: { user: any }) {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [formData, setFormData] = useState({
        age: 25,
        gender: 'male',
        weight_kg: 70,
        height_cm: 175,
        activity_level: 'moderately_active',
        fitness_goals: ['maintenance'],
        dietary_preferences: [],
        meals_per_day: 3,
        budget_level: 'moderate',
        cooking_skill: 'intermediate',
        meal_prep_time_minutes: 30,
        allergies: '',
        food_dislikes: '',
        medical_conditions: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/ai-coach/diet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        name: user.username,
                        ...formData,
                        fitness_goals: Array.isArray(formData.fitness_goals) ? formData.fitness_goals : [formData.fitness_goals],
                        dietary_preferences: Array.isArray(formData.dietary_preferences) ? formData.dietary_preferences : [],
                        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
                        food_dislikes: formData.food_dislikes ? formData.food_dislikes.split(',').map(s => s.trim()) : [],
                        medical_conditions: formData.medical_conditions ? formData.medical_conditions.split(',').map(s => s.trim()) : []
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
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Age</label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Gender</label>
                        <select
                            value={formData.gender}
                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Weight (kg)</label>
                        <input
                            type="number"
                            value={formData.weight_kg}
                            onChange={e => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Height (cm)</label>
                        <input
                            type="number"
                            value={formData.height_cm}
                            onChange={e => setFormData({ ...formData, height_cm: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Activity Level</label>
                        <select
                            value={formData.activity_level}
                            onChange={e => setFormData({ ...formData, activity_level: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="sedentary">Sedentary</option>
                            <option value="lightly_active">Lightly Active</option>
                            <option value="moderately_active">Moderately Active</option>
                            <option value="very_active">Very Active</option>
                            <option value="extremely_active">Extremely Active</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Goal</label>
                        <select
                            value={formData.fitness_goals[0]}
                            onChange={e => setFormData({ ...formData, fitness_goals: [e.target.value] })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="weight_loss">Weight Loss</option>
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="aggressive_cut">Aggressive Cut</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            gridColumn: '1 / -1',
                            background: 'var(--accent)',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Generating Plan...' : 'Generate Diet Plan'}
                    </button>
                </form>
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
