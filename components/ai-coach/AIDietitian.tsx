'use client';

import { useState } from 'react';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

interface AIDietitianProps {
    user: User;
}

const inputClasses = 'w-full rounded-[10px] border border-line-soft bg-[var(--surface-1)] p-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand';
const labelClasses = 'mb-2 block text-ink-mid';

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
            <div className="grid gap-8" style={{ gridTemplateColumns: plan ? '1fr 1fr' : '1fr' }}>

                {/* Left Column: Form or Plan View */}
                <div>
                    {showForm ? (
                        <div className="glass-card p-8">
                            <h2 className="font-display mb-6 text-2xl font-bold text-ink-hi">Create Your Meal Plan</h2>

                            <div className="grid gap-6">
                                {/* Demographics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Age</label>
                                        <input
                                            type="number"
                                            className={inputClasses}
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || '' })}
                                            placeholder="e.g. 25"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Gender <span className="text-[var(--error)]">*</span></label>
                                        <select
                                            className={inputClasses}
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Height (cm)</label>
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={formData.height}
                                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                                            placeholder="e.g. 180"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Weight (kg)</label>
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                            placeholder="e.g. 75"
                                        />
                                    </div>
                                </div>

                                {/* Lifestyle */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Activity Level</label>
                                        <select
                                            className={inputClasses}
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
                                        <label className={labelClasses}>Meals Per Day</label>
                                        <input
                                            type="number"
                                            className={inputClasses}
                                            value={formData.meals_per_day}
                                            onChange={e => setFormData({ ...formData, meals_per_day: parseInt(e.target.value) })}
                                            min={1} max={6}
                                        />
                                    </div>
                                </div>

                                {/* Goals */}
                                <div>
                                    <label className={labelClasses}>Fitness Goals</label>
                                    <div className="flex flex-wrap gap-2">
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
                                                    className={`cursor-pointer rounded-full border px-4 py-2 transition-colors ${
                                                        formData.fitness_goals.includes(goalKey)
                                                            ? 'border-brand bg-brand text-white'
                                                            : 'border-line-strong bg-transparent text-ink-low hover:border-brand/50 hover:text-ink-mid'
                                                    }`}
                                                >
                                                    {goal}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Preferences */}
                                <div>
                                    <label className={labelClasses}>Dietary Preferences</label>
                                    <div className="flex flex-wrap gap-2">
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
                                                    className={`cursor-pointer rounded-full border px-4 py-2 transition-colors ${
                                                        formData.dietary_preferences.includes(prefKey)
                                                            ? 'border-brand bg-brand text-white'
                                                            : 'border-line-strong bg-transparent text-ink-low hover:border-brand/50 hover:text-ink-mid'
                                                    }`}
                                                >
                                                    {pref}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Allergies & Dislikes */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Allergies</label>
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={formData.allergies.join(', ')}
                                            onChange={e => setFormData({ ...formData, allergies: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="e.g. Peanuts, Shellfish"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Food Dislikes</label>
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={formData.food_dislikes.join(', ')}
                                            onChange={e => setFormData({ ...formData, food_dislikes: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="e.g. Mushrooms, Olives"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClasses}>Cooking Skill</label>
                                        <select
                                            className={inputClasses}
                                            value={formData.cooking_skill}
                                            onChange={e => setFormData({ ...formData, cooking_skill: e.target.value })}
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Prep Time (mins)</label>
                                        <input
                                            type="number"
                                            className={inputClasses}
                                            value={formData.meal_prep_time_minutes}
                                            onChange={e => setFormData({ ...formData, meal_prep_time_minutes: parseInt(e.target.value) })}
                                            step={5}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Budget</label>
                                        <select
                                            className={inputClasses}
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
                                    className="btn-brand mt-4"
                                    onClick={handleGeneratePlan}
                                    disabled={loading}
                                >
                                    {loading ? 'Generating Plan...' : 'Generate Meal Plan'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display text-lg font-bold text-ink-hi">Your Meal Plan</h3>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="btn-outline !px-4 !py-2 !text-sm"
                                >
                                    Edit Preferences
                                </button>
                            </div>

                            {/* Plan Overview */}
                            {plan?.plan_overview && (
                                <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                                    <div className="rounded-lg border border-line-soft bg-[var(--surface-1)] p-2">
                                        <div className="text-[0.7rem] text-ink-low">Calories</div>
                                        <div className="font-bold text-ink-hi">{plan.plan_overview.daily_calories}</div>
                                    </div>
                                    <div className="rounded-lg border border-line-soft bg-[var(--surface-1)] p-2">
                                        <div className="text-[0.7rem] text-ink-low">Protein</div>
                                        <div className="font-bold text-ink-hi">{plan.plan_overview.macros?.protein_g}g</div>
                                    </div>
                                    <div className="rounded-lg border border-line-soft bg-[var(--surface-1)] p-2">
                                        <div className="text-[0.7rem] text-ink-low">Carbs</div>
                                        <div className="font-bold text-ink-hi">{plan.plan_overview.macros?.carbs_g}g</div>
                                    </div>
                                    <div className="rounded-lg border border-line-soft bg-[var(--surface-1)] p-2">
                                        <div className="text-[0.7rem] text-ink-low">Fats</div>
                                        <div className="font-bold text-ink-hi">{plan.plan_overview.macros?.fat_g}g</div>
                                    </div>
                                </div>
                            )}

                            {plan?.daily_schedule ? (
                                Object.entries(plan.daily_schedule).map(([day, meals]: [string, any]) => (
                                    <div key={day} className="glass-card p-4">
                                        <h4 className="font-display mb-4 capitalize text-brand">{day.replace('_', ' ')}</h4>
                                        <div className="grid gap-4">
                                            {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => {
                                                const meal = meals[mealType];
                                                if (!meal || (Array.isArray(meal) && meal.length === 0)) return null;

                                                return (
                                                    <div key={mealType} className="rounded-lg bg-[var(--surface-2)] p-4">
                                                        <h5 className="mb-2 capitalize text-ink-hi">{mealType}</h5>
                                                        {Array.isArray(meal) ? (
                                                            <ul className="m-0 pl-6">
                                                                {meal.map((snack: any, i: number) => (
                                                                    <li key={i} className="text-ink-mid">{snack.name || snack}</li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div>
                                                                <div className="font-bold text-ink-hi">{meal.name}</div>
                                                                <div className="mt-1 text-[0.9rem] text-ink-mid">
                                                                    {meal.nutrition?.calories} kcal | P: {meal.nutrition?.protein_g}g | C: {meal.nutrition?.carbs_g}g | F: {meal.nutrition?.fat_g}g
                                                                </div>
                                                                {meal.instructions && (
                                                                    <div className="mt-1 text-[0.8rem] italic text-ink-low">
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
                                <div className="p-8 text-center text-ink-low">
                                    No meal plan data available.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Chat Interface (Only visible after plan generation) */}
                {!showForm && (
                    <div className="glass-card sticky top-8 flex h-[600px] flex-col overflow-hidden">
                        <h3 className="border-b border-line-soft p-4 font-display font-bold text-ink-hi">AI Dietitian Chat</h3>
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
