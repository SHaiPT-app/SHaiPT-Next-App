'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

interface AIWorkoutPlannerProps {
    user: User;
}

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
            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: plan ? '1fr 1fr' : '1fr' }}>

                {/* Left Column: Form or Plan View */}
                <div>
                    {showForm ? (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Create Your Workout Plan</h2>

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

                                {/* Fitness Profile */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Experience Level</label>
                                    <select
                                        className="input-field"
                                        value={formData.fitness_level}
                                        onChange={e => setFormData({ ...formData, fitness_level: e.target.value })}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Primary Goal</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['Muscle Gain', 'Weight Loss', 'Strength', 'Endurance', 'Flexibility'].map(goal => (
                                            <button
                                                key={goal}
                                                onClick={() => {
                                                    const newGoals = formData.goals.includes(goal)
                                                        ? formData.goals.filter(g => g !== goal)
                                                        : [...formData.goals, goal];
                                                    setFormData({ ...formData, goals: newGoals });
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '20px',
                                                    border: '1px solid var(--glass-border)',
                                                    background: formData.goals.includes(goal) ? 'var(--primary)' : 'transparent',
                                                    color: formData.goals.includes(goal) ? 'white' : '#888',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Days/Week</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={formData.workout_days_per_week}
                                            onChange={e => setFormData({ ...formData, workout_days_per_week: parseInt(e.target.value) })}
                                            min={1} max={7}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Minutes/Session</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={formData.session_duration_minutes}
                                            onChange={e => setFormData({ ...formData, session_duration_minutes: parseInt(e.target.value) })}
                                            step={5}
                                        />
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Available Equipment</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.available_equipment.join(', ')}
                                        onChange={e => setFormData({ ...formData, available_equipment: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="e.g. Dumbbells, Barbell, Bench (comma separated)"
                                    />
                                </div>

                                {/* Injuries */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Injuries / Limitations</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.injuries_or_limitations.join(', ')}
                                        onChange={e => setFormData({ ...formData, injuries_or_limitations: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="e.g. Lower back pain, knee issues (comma separated)"
                                    />
                                </div>

                                <button
                                    className="btn-primary"
                                    onClick={handleGeneratePlan}
                                    disabled={loading}
                                    style={{ marginTop: '1rem', padding: '1rem' }}
                                >
                                    {loading ? 'Generating Plan...' : 'Generate Workout Plan 🚀'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ color: 'var(--accent)' }}>Your Workout Plan</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={handleSavePlan}
                                        disabled={saving}
                                        className="btn-primary"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                    >
                                        {saving ? 'Saving...' : 'Save to My Plans'}
                                    </button>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: '#888', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {plan?.weekly_schedule ? (
                                Object.entries(plan.weekly_schedule).map(([week, days]: [string, any]) => (
                                    <div key={week} style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                                        <h4 style={{ textTransform: 'capitalize', color: 'var(--primary)', marginBottom: '1rem' }}>{week.replace('_', ' ')}</h4>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {Object.entries(days).map(([day, routine]: [string, any]) => (
                                                <div key={day} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px' }}>
                                                    <h5 style={{ textTransform: 'capitalize', marginBottom: '0.5rem', color: '#ddd', display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{day.replace('_', ' ')}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{routine.focus}</span>
                                                    </h5>

                                                    {/* Warmup */}
                                                    {routine.warm_up && (
                                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
                                                            <strong>Warm-up:</strong> {routine.warm_up.join(', ')}
                                                        </div>
                                                    )}

                                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>
                                                        {routine.main_workout.map((exercise: any, i: number) => (
                                                            <li key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{exercise.exercise}</div>
                                                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                                                    {exercise.sets} sets x {exercise.reps} | Rest: {exercise.rest_seconds}s
                                                                </div>
                                                                {exercise.notes && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#666' }}>Note: {exercise.notes}</div>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                    No plan data available.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Chat Interface (Only visible after plan generation) */}
                {!showForm && (
                    <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '2rem' }}>
                        <h3 style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>AI Coach Chat</h3>
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
