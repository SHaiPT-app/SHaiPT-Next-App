'use client';

import { useState } from 'react';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

interface AIDietitianProps {
    user: User;
}

export default function AIDietitian({ user }: AIDietitianProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [showForm, setShowForm] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        age: user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : '',
        gender: '',
        height: user.height || '',
        weight: user.weight || '',
        activity_level: 'moderately_active',
        fitness_goals: [] as string[],
        dietary_preferences: [] as string[],
        allergies: [] as string[],
        food_dislikes: [] as string[],
        meals_per_day: 3,
        cooking_skill: 'intermediate',
        meal_prep_time_minutes: 30,
        budget_level: 'medium'
    });

    const handleGeneratePlan = async () => {
        setLoading(true);
        try {
            const userProfile = {
                id: user.id,
                name: user.display_name || user.username,
                ...formData
            };

            const res = await fetch('/api/ai-coach/diet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: userProfile, // API expects 'profile' key
                    durationDays: 7
                }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setPlan(data.meal_schedule);
            setShowForm(false);

            setMessages([
                {
                    id: 'system-init',
                    role: 'assistant',
                    content: `I've created a ${data.duration_days}-day meal plan tailored to your goals! Let me know if you'd like any substitutions or have nutrition questions.`
                }
            ]);

        } catch (error) {
            console.error(error);
            alert('Failed to generate meal plan. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            // Placeholder for chat interaction
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: "I'm focused on your meal plan right now. If you need major changes, you can regenerate the plan!"
                }]);
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <FeatureGate user={user} feature="dietitian">
            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: plan ? '1fr 1fr' : '1fr' }}>

                {/* Left Column: Form or Plan View */}
                <div>
                    {showForm ? (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Create Your Meal Plan</h2>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {/* Demographics */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Age</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || '' })}
                                            placeholder="e.g. 25"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Gender</label>
                                        <select
                                            className="input-field"
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Height (cm)</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={formData.height}
                                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                                            placeholder="e.g. 180"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Weight (kg)</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                            placeholder="e.g. 75"
                                        />
                                    </div>
                                </div>

                                {/* Lifestyle */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Activity Level</label>
                                        <select
                                            className="input-field"
                                            value={formData.activity_level}
                                            onChange={e => setFormData({ ...formData, activity_level: e.target.value })}
                                        >
                                            <option value="sedentary">Sedentary</option>
                                            <option value="lightly_active">Lightly Active</option>
                                            <option value="moderately_active">Moderately Active</option>
                                            <option value="very_active">Very Active</option>
                                            <option value="extremely_active">Extremely Active</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Meals Per Day</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={formData.meals_per_day}
                                            onChange={e => setFormData({ ...formData, meals_per_day: parseInt(e.target.value) })}
                                            min={1} max={6}
                                        />
                                    </div>
                                </div>

                                {/* Goals */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Fitness Goals</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['Weight Loss', 'Muscle Gain', 'Maintenance', 'Fat Loss', 'Bulking', 'Healthy Eating'].map(goal => {
                                            const goalKey = goal.toLowerCase().replace(' ', '_');
                                            return (
                                                <button
                                                    key={goalKey}
                                                    onClick={() => {
                                                        const newGoals = formData.fitness_goals.includes(goalKey)
                                                            ? formData.fitness_goals.filter(g => g !== goalKey)
                                                            : [...formData.fitness_goals, goalKey];
                                                        setFormData({ ...formData, fitness_goals: newGoals });
                                                    }}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: formData.fitness_goals.includes(goalKey) ? 'var(--primary)' : 'transparent',
                                                        color: formData.fitness_goals.includes(goalKey) ? 'white' : '#888',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {goal}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Preferences */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Dietary Preferences</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher'].map(pref => {
                                            const prefKey = pref.toLowerCase().replace('-', '_');
                                            return (
                                                <button
                                                    key={prefKey}
                                                    onClick={() => {
                                                        const newPrefs = formData.dietary_preferences.includes(prefKey)
                                                            ? formData.dietary_preferences.filter(p => p !== prefKey)
                                                            : [...formData.dietary_preferences, prefKey];
                                                        setFormData({ ...formData, dietary_preferences: newPrefs });
                                                    }}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: formData.dietary_preferences.includes(prefKey) ? 'var(--primary)' : 'transparent',
                                                        color: formData.dietary_preferences.includes(prefKey) ? 'white' : '#888',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {pref}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Allergies & Dislikes */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Allergies</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={formData.allergies.join(', ')}
                                            onChange={e => setFormData({ ...formData, allergies: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="e.g. Peanuts, Shellfish"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Food Dislikes</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={formData.food_dislikes.join(', ')}
                                            onChange={e => setFormData({ ...formData, food_dislikes: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="e.g. Mushrooms, Olives"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Cooking Skill</label>
                                        <select
                                            className="input-field"
                                            value={formData.cooking_skill}
                                            onChange={e => setFormData({ ...formData, cooking_skill: e.target.value })}
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Prep Time (mins)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={formData.meal_prep_time_minutes}
                                            onChange={e => setFormData({ ...formData, meal_prep_time_minutes: parseInt(e.target.value) })}
                                            step={5}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Budget</label>
                                        <select
                                            className="input-field"
                                            value={formData.budget_level}
                                            onChange={e => setFormData({ ...formData, budget_level: e.target.value })}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    className="btn-primary"
                                    onClick={handleGeneratePlan}
                                    disabled={loading}
                                    style={{ marginTop: '1rem', padding: '1rem' }}
                                >
                                    {loading ? 'Generating Plan...' : 'Generate Meal Plan 🥗'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ color: 'var(--accent)' }}>Your Meal Plan</h3>
                                <button
                                    onClick={() => setShowForm(true)}
                                    style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: '#888', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Edit Preferences
                                </button>
                            </div>

                            {/* Plan Overview */}
                            {plan?.plan_overview && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Calories</div>
                                        <div style={{ fontWeight: 'bold' }}>{plan.plan_overview.daily_calories}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Protein</div>
                                        <div style={{ fontWeight: 'bold' }}>{plan.plan_overview.macros?.protein_g}g</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Carbs</div>
                                        <div style={{ fontWeight: 'bold' }}>{plan.plan_overview.macros?.carbs_g}g</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Fats</div>
                                        <div style={{ fontWeight: 'bold' }}>{plan.plan_overview.macros?.fat_g}g</div>
                                    </div>
                                </div>
                            )}

                            {plan?.daily_schedule ? (
                                Object.entries(plan.daily_schedule).map(([day, meals]: [string, any]) => (
                                    <div key={day} style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                                        <h4 style={{ textTransform: 'capitalize', color: 'var(--primary)', marginBottom: '1rem' }}>{day.replace('_', ' ')}</h4>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => {
                                                const meal = meals[mealType];
                                                if (!meal || (Array.isArray(meal) && meal.length === 0)) return null;

                                                return (
                                                    <div key={mealType} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px' }}>
                                                        <h5 style={{ textTransform: 'capitalize', marginBottom: '0.5rem', color: '#ddd' }}>{mealType}</h5>
                                                        {Array.isArray(meal) ? (
                                                            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                                                                {meal.map((snack: any, i: number) => (
                                                                    <li key={i} style={{ color: '#aaa' }}>{snack.name || snack}</li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{meal.name}</div>
                                                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '0.25rem' }}>
                                                                    {meal.nutrition?.calories} kcal | P: {meal.nutrition?.protein_g}g | C: {meal.nutrition?.carbs_g}g | F: {meal.nutrition?.fat_g}g
                                                                </div>
                                                                {meal.instructions && (
                                                                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#666', marginTop: '0.25rem' }}>
                                                                        Prep: {meal.instructions}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                    No meal plan data available.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Chat Interface (Only visible after plan generation) */}
                {!showForm && (
                    <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '2rem' }}>
                        <h3 style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>AI Dietitian Chat</h3>
                        <ChatInterface
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            loading={loading}
                            placeholder="Ask about substitutions, recipes, or nutrition..."
                        />
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}
