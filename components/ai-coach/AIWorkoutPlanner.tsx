
'use client';

import { useState } from 'react';

export default function AIWorkoutPlanner({ user }: { user: any }) {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [formData, setFormData] = useState({
        fitness_level: 'intermediate',
        goals: ['muscle_gain'],
        available_equipment: ['gym'],
        workout_days_per_week: 4,
        session_duration_minutes: 60,
        injuries_or_limitations: '',
        preferred_workout_types: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/ai-coach/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userProfile: {
                        name: user.username,
                        age: 25, // Default or fetch from profile if available
                        ...formData,
                        goals: Array.isArray(formData.goals) ? formData.goals : [formData.goals],
                        available_equipment: Array.isArray(formData.available_equipment) ? formData.available_equipment : [formData.available_equipment],
                        injuries_or_limitations: formData.injuries_or_limitations ? formData.injuries_or_limitations.split(',').map(s => s.trim()) : [],
                        preferred_workout_types: formData.preferred_workout_types ? formData.preferred_workout_types.split(',').map(s => s.trim()) : []
                    }
                })
            });
            const data = await response.json();
            setPlan(data);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate workout plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>AI Workout Planner</h2>

            {!plan ? (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fitness Level</label>
                        <select
                            value={formData.fitness_level}
                            onChange={e => setFormData({ ...formData, fitness_level: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Primary Goal</label>
                        <select
                            value={formData.goals[0]}
                            onChange={e => setFormData({ ...formData, goals: [e.target.value] })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="weight_loss">Weight Loss</option>
                            <option value="endurance">Endurance</option>
                            <option value="strength">Strength</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Days per Week</label>
                        <input
                            type="number"
                            min="1"
                            max="7"
                            value={formData.workout_days_per_week}
                            onChange={e => setFormData({ ...formData, workout_days_per_week: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Session Duration (minutes)</label>
                        <input
                            type="number"
                            min="15"
                            max="180"
                            value={formData.session_duration_minutes}
                            onChange={e => setFormData({ ...formData, session_duration_minutes: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Equipment (comma separated)</label>
                        <input
                            type="text"
                            value={formData.available_equipment}
                            onChange={e => setFormData({ ...formData, available_equipment: [e.target.value] })}
                            placeholder="e.g. dumbbells, bench, pull-up bar"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #444' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
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
                        {loading ? 'Generating Plan...' : 'Generate Workout Plan'}
                    </button>
                </form>
            ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Your Personalized Plan</h3>
                        <button onClick={() => setPlan(null)} style={{ background: 'transparent', border: '1px solid #666', color: '#ccc', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                            Create New
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {plan.workout_schedule?.weekly_schedule ? (
                            Object.entries(plan.workout_schedule.weekly_schedule).map(([week, days]: [string, any]) => (
                                <div key={week} style={{ border: '1px solid #444', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ textTransform: 'capitalize', color: 'var(--accent)', marginBottom: '0.5rem' }}>{week.replace('_', ' ')}</h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {Object.entries(days).map(([day, routine]: [string, any]) => (
                                            <div key={day} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                                <h5 style={{ textTransform: 'capitalize', marginBottom: '0.5rem', color: '#ddd' }}>{day.replace('_', ' ')}: {routine.focus}</h5>
                                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                                    {routine.main_workout.map((exercise: any, i: number) => (
                                                        <li key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #333' }}>
                                                            <div style={{ fontWeight: 'bold' }}>{exercise.exercise}</div>
                                                            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                                                {exercise.sets} sets x {exercise.reps} | Rest: {exercise.rest_seconds}s
                                                            </div>
                                                            {exercise.notes && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#888' }}>Note: {exercise.notes}</div>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                                No workout schedule available.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
