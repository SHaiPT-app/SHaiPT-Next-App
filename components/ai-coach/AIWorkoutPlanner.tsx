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

const workoutQuestions: Question[] = [
    {
        id: 'fitness_level',
        prompt: "What's your current fitness level?",
        type: 'select',
        options: ['beginner', 'intermediate', 'advanced']
    },
    {
        id: 'goals',
        prompt: "What's your primary goal?",
        type: 'select',
        options: ['muscle_gain', 'weight_loss', 'strength', 'endurance']
    },
    {
        id: 'workout_days_per_week',
        prompt: "How many days per week can you dedicate to working out?",
        type: 'number',
        placeholder: 'e.g., 4',
        validation: (val) => val >= 1 && val <= 7
    },
    {
        id: 'session_duration_minutes',
        prompt: "How many minutes per session? (15-180)",
        type: 'number',
        placeholder: 'e.g., 60',
        validation: (val) => val >= 15 && val <= 180
    },
    {
        id: 'available_equipment',
        prompt: "What equipment do you have access to?",
        type: 'text',
        placeholder: 'e.g., dumbbells, barbell, bench, gym membership'
    },
    {
        id: 'injuries_or_limitations',
        prompt: "Do you have any injuries or limitations? (Type 'none' if not)",
        type: 'text',
        placeholder: 'e.g., lower back pain, knee issues, or none'
    }
];

export default function AIWorkoutPlanner({ user }: { user: any }) {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);

    const handleChatComplete = async (answers: Record<string, any>) => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai-coach/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userProfile: {
                        name: user.username,
                        age: 25,
                        fitness_level: answers.fitness_level,
                        goals: [answers.goals],
                        available_equipment: answers.available_equipment.split(',').map((s: string) => s.trim()),
                        workout_days_per_week: answers.workout_days_per_week,
                        session_duration_minutes: answers.session_duration_minutes,
                        injuries_or_limitations: answers.injuries_or_limitations !== 'none'
                            ? answers.injuries_or_limitations.split(',').map((s: string) => s.trim())
                            : [],
                        preferred_workout_types: []
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
                <ChatInterface
                    questions={workoutQuestions}
                    onComplete={handleChatComplete}
                    title="Workout Planner"
                    loading={loading}
                />
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
