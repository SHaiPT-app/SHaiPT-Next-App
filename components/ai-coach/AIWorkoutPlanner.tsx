'use client';

import { useState } from 'react';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

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

interface AIWorkoutPlannerProps {
    user: User;
}

export default function AIWorkoutPlanner({ user }: AIWorkoutPlannerProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your AI Workout Planner. I can create a personalized workout plan for you. To get started, tell me about your fitness goals, current fitness level, and how many days a week you can train."
        }
    ]);
    const [loading, setLoading] = useState(false);
    // Assuming 'plan' state will be managed here or passed as a prop
    // For now, let's define a placeholder for 'plan' to avoid compilation errors
    const [plan, setPlan] = useState<any>({}); // You'll likely want a more specific type for 'plan'

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
                    userProfile: {
                        // Pass relevant user profile data if available
                        age: 30, // Placeholder
                        gender: 'Male', // Placeholder
                        experience: 'Intermediate' // Placeholder
                    }
                }),
            });
            const data = await res.json();
            const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply };
            setMessages(prev => [...prev, aiMessage]);
            // If the AI returns a plan, you might update the 'plan' state here
            if (data.plan) {
                setPlan(data.plan);
            }
        } catch (error) {
            console.error(error);
            // Optionally, add an error message to the chat
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Oops! Something went wrong. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureGate user={user} feature="workout_planner">
            <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>AI Workout Planner</h3>
                <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    loading={loading}
                    placeholder="e.g., I want to build muscle, I can train 4 days a week..."
                />
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
        </FeatureGate>
    );
}
