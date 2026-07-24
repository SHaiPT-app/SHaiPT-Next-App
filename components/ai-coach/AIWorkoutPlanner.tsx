'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

interface AIWorkoutPlannerProps {
    user: User;
}

const inputClasses = 'w-full rounded-[10px] border border-line-soft bg-[var(--surface-1)] p-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand';
const labelClasses = 'mb-2 block text-ink-mid';

export default function AIWorkoutPlanner({ user }: AIWorkoutPlannerProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [showForm, setShowForm] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        age: user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : '',
        gender: '',
        height: user.height || '',
        weight: user.weight || '',
        fitness_level: user.experience || 'beginner',
        goals: [] as string[],
        workout_days_per_week: 4,
        session_duration_minutes: 60,
        available_equipment: [] as string[],
        injuries_or_limitations: [] as string[],
        preferred_workout_types: [] as string[]
    });

    const handleGeneratePlan = async () => {
        setLoading(true);
        try {
            // Construct the initial prompt based on form data
            const userProfile = {
                name: user.display_name || user.username,
                ...formData
            };

            const res = await fetch('/api/ai-coach/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userProfile,
                    durationWeeks: 4
                }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setPlan(data.workout_schedule);
            setShowForm(false);

            // Initialize chat with context
            setMessages([
                {
                    id: 'system-init',
                    role: 'assistant',
                    content: `I've generated a ${data.duration_weeks}-week workout plan for you based on your profile! Feel free to ask me any questions about exercises, form, or modifications.`
                }
            ]);

        } catch (error) {
            console.error(error);
            alert('Failed to generate plan. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async () => {
        if (!plan || !plan.weekly_schedule) return;
        setSaving(true);

        try {
            // Transform AI plan to DB format
            // The AI returns a weekly schedule. We'll take "Week 1" as the template for the sessions.
            // Or if it varies, we might need a different strategy.
            // For now, let's assume Week 1 represents the split.

            const week1 = plan.weekly_schedule.week_1 || Object.values(plan.weekly_schedule)[0];
            if (!week1) throw new Error("Invalid plan structure");

            const sessions = Object.entries(week1).map(([dayKey, dayData]: [string, any]) => ({
                id: dayKey,
                name: dayData.focus || dayKey.replace('_', ' '),
                exercises: dayData.main_workout.map((ex: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: ex.exercise,
                    sets: Array(parseInt(ex.sets) || 3).fill({
                        targetReps: ex.reps?.toString() || "10",
                        targetWeight: "",
                    }),
                    notes: ex.notes
                }))
            }));

            const payload = {
                name: `AI Plan - ${formData.goals.join(', ') || 'Custom'}`,
                trainee_id: user.id,
                // trainer_id is omitted (needs DB migration to be nullable)
                exercises: sessions, // This maps to the 'exercises' jsonb column which holds sessions
                assigned_at: new Date().toISOString(),
            };

            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save plan');
            }

            alert('Plan saved successfully!');
            router.push('/dashboard'); // Redirect to dashboard to see the plan

        } catch (error) {
            console.error(error);
            alert('Failed to save plan. Make sure you have run the database migration.');
        } finally {
            setSaving(false);
        }
    };

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai-coach/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                }),
            });
            // Simulate response for now as discussed
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: "I'm focused on your workout plan right now. If you need modifications, you can regenerate the plan!"
                }]);
                setLoading(false);
            }, 1000);

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <FeatureGate user={user} feature="workout_planner">
            <div className="grid gap-8" style={{ gridTemplateColumns: plan ? '1fr 1fr' : '1fr' }}>

                {/* Left Column: Form or Plan View */}
                <div>
                    {showForm ? (
                        <div className="glass-card p-8">
                            <h2 className="font-display mb-6 text-2xl font-bold text-ink-hi">Create Your Workout Plan</h2>

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

                                {/* Fitness Profile */}
                                <div>
                                    <label className={labelClasses}>Experience Level</label>
                                    <select
                                        className={inputClasses}
                                        value={formData.fitness_level}
                                        onChange={e => setFormData({ ...formData, fitness_level: e.target.value })}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClasses}>Primary Goal</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Muscle Gain', 'Weight Loss', 'Strength', 'Endurance', 'Flexibility'].map(goal => (
                                            <button
                                                key={goal}
                                                onClick={() => {
                                                    const newGoals = formData.goals.includes(goal)
                                                        ? formData.goals.filter(g => g !== goal)
                                                        : [...formData.goals, goal];
                                                    setFormData({ ...formData, goals: newGoals });
                                                }}
                                                className={`cursor-pointer rounded-full border px-4 py-2 transition-colors ${
                                                    formData.goals.includes(goal)
                                                        ? 'border-brand bg-brand text-white'
                                                        : 'border-line-strong bg-transparent text-ink-low hover:border-brand/50 hover:text-ink-mid'
                                                }`}
                                            >
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Days/Week</label>
                                        <input
                                            type="number"
                                            className={inputClasses}
                                            value={formData.workout_days_per_week}
                                            onChange={e => setFormData({ ...formData, workout_days_per_week: parseInt(e.target.value) })}
                                            min={1} max={7}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Minutes/Session</label>
                                        <input
                                            type="number"
                                            className={inputClasses}
                                            value={formData.session_duration_minutes}
                                            onChange={e => setFormData({ ...formData, session_duration_minutes: parseInt(e.target.value) })}
                                            step={5}
                                        />
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div>
                                    <label className={labelClasses}>Available Equipment</label>
                                    <input
                                        type="text"
                                        className={inputClasses}
                                        value={formData.available_equipment.join(', ')}
                                        onChange={e => setFormData({ ...formData, available_equipment: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="e.g. Dumbbells, Barbell, Bench (comma separated)"
                                    />
                                </div>

                                {/* Injuries */}
                                <div>
                                    <label className={labelClasses}>Injuries / Limitations</label>
                                    <input
                                        type="text"
                                        className={inputClasses}
                                        value={formData.injuries_or_limitations.join(', ')}
                                        onChange={e => setFormData({ ...formData, injuries_or_limitations: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="e.g. Lower back pain, knee issues (comma separated)"
                                    />
                                </div>

                                <button
                                    className="btn-brand mt-4"
                                    onClick={handleGeneratePlan}
                                    disabled={loading}
                                >
                                    {loading ? 'Generating Plan...' : 'Generate Workout Plan'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display text-lg font-bold text-ink-hi">Your Workout Plan</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSavePlan}
                                        disabled={saving}
                                        className="btn-brand !px-4 !py-2 !text-sm"
                                    >
                                        {saving ? 'Saving...' : 'Save to My Plans'}
                                    </button>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="btn-outline !px-4 !py-2 !text-sm"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {plan?.weekly_schedule ? (
                                Object.entries(plan.weekly_schedule).map(([week, days]: [string, any]) => (
                                    <div key={week} className="glass-card p-4">
                                        <h4 className="font-display mb-4 capitalize text-brand">{week.replace('_', ' ')}</h4>
                                        <div className="grid gap-4">
                                            {Object.entries(days).map(([day, routine]: [string, any]) => (
                                                <div key={day} className="rounded-lg bg-[var(--surface-2)] p-4">
                                                    <h5 className="mb-2 flex justify-between capitalize text-ink-hi">
                                                        <span>{day.replace('_', ' ')}</span>
                                                        <span className="text-[0.8rem] text-brand">{routine.focus}</span>
                                                    </h5>

                                                    {/* Warmup */}
                                                    {routine.warm_up && (
                                                        <div className="mb-2 text-[0.9rem] text-ink-mid">
                                                            <strong>Warm-up:</strong> {routine.warm_up.join(', ')}
                                                        </div>
                                                    )}

                                                    <ul className="my-2 list-none p-0">
                                                        {routine.main_workout.map((exercise: any, i: number) => (
                                                            <li key={i} className="mb-2 border-b border-line-soft pb-2">
                                                                <div className="font-bold text-ink-hi">{exercise.exercise}</div>
                                                                <div className="text-[0.9rem] text-ink-mid">
                                                                    {exercise.sets} sets x {exercise.reps} | Rest: {exercise.rest_seconds}s
                                                                </div>
                                                                {exercise.notes && <div className="text-[0.8rem] italic text-ink-low">Note: {exercise.notes}</div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-ink-low">
                                    No plan data available.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Chat Interface (Only visible after plan generation) */}
                {!showForm && (
                    <div className="glass-card sticky top-8 flex h-[600px] flex-col overflow-hidden">
                        <h3 className="border-b border-line-soft p-4 font-display font-bold text-ink-hi">AI Coach Chat</h3>
                        <ChatInterface
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            loading={loading}
                            placeholder="Ask about exercises, form, or modifications..."
                        />
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}
