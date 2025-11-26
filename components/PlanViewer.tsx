'use client';

import { useState } from 'react';
import { WorkoutPlan, WorkoutLog, LogExercise, LogSet } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface PlanViewerProps {
    plan: WorkoutPlan;
    traineeId: string;
    onBack: () => void;
}

export default function PlanViewer({ plan, traineeId, onBack }: PlanViewerProps) {
    // Initialize logs state based on plan structure
    const [logs, setLogs] = useState<LogExercise[]>(
        plan.exercises.map(ex => ({
            exerciseId: ex.id,
            name: ex.name,
            sets: ex.sets.map((_, i) => ({
                setNumber: i + 1,
                reps: '',
                weight: '',
                isPr: false,
                startTime: undefined,
                endTime: undefined,
                duration: 0
            })),
            comments: ''
        }))
    );
    const [saving, setSaving] = useState(false);
    const [workoutStartTime] = useState<number>(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);

    // Global timer
    useState(() => {
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    });

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleSetTimer = (exerciseIndex: number, setIndex: number) => {
        const newLogs = [...logs];
        const set = newLogs[exerciseIndex].sets[setIndex];

        if (!set.startTime) {
            // Start
            set.startTime = Date.now();
        } else if (!set.endTime) {
            // Finish
            set.endTime = Date.now();
            set.duration = Math.floor((set.endTime - set.startTime) / 1000);
        } else {
            // Reset (optional, maybe just clear?)
            set.startTime = undefined;
            set.endTime = undefined;
            set.duration = 0;
        }
        setLogs(newLogs);
    };

    const updateLog = (exerciseIndex: number, setIndex: number, field: keyof LogSet, value: any) => {
        const newLogs = [...logs];
        newLogs[exerciseIndex].sets[setIndex] = {
            ...newLogs[exerciseIndex].sets[setIndex],
            [field]: value
        };
        setLogs(newLogs);
    };

    const updateComment = (exerciseIndex: number, value: string) => {
        const newLogs = [...logs];
        newLogs[exerciseIndex].comments = value;
        setLogs(newLogs);
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            // Wait for auth state to be ready and retry if session is not available
            // Wait for auth state to be ready and retry if session is not available
            let session = null;

            // DEV BYPASS
            if (traineeId === 'dev-user-id') {
                console.log('Dev user detected, skipping Supabase session check for log submission');
                // Mock success
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('Workout logged successfully (MOCKED)!');
                onBack();
                return;
            }

            let retryCount = 0;
            const maxRetries = 5;

            while (!session && retryCount < maxRetries) {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    session = currentSession;
                    break;
                }

                // Wait briefly before retrying
                await new Promise(resolve => setTimeout(resolve, 200));
                retryCount++;
            }

            if (!session) {
                console.error('No valid session found after retries');
                setSaving(false);
                return;
            }

            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
                console.log('Added auth header for workout log submission');
            }

            console.log('Submitting workout log:', {
                planId: plan.id,
                traineeId,
                exerciseCount: logs.length
            });

            const res = await fetch('/api/logs', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    plan_id: plan.id,  // Use snake_case to match database schema
                    trainee_id: traineeId,
                    exercises: logs
                }),
            });

            if (res.ok) {
                console.log('Workout logged successfully!');
                onBack();
            } else {
                const errorText = await res.text();
                console.error('Failed to log workout:', res.status, errorText);
                alert('Failed to log workout');
            }
        } catch (error) {
            console.error('Error logging workout:', error);
            alert('Error logging workout');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                    &larr; Back
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '0.25rem' }}>{plan.name}</h2>
                    <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatTime(elapsedTime)}
                    </div>
                </div>
                <div style={{ width: '50px' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {plan.exercises.map((exercise, i) => (
                    <div key={exercise.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--primary)' }}>{exercise.name}</h3>
                        </div>

                        <div className="set-header" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 50px 80px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#888', textAlign: 'center' }}>
                            <span>Set</span>
                            <span className="hide-mobile">Target</span>
                            <span>Reps</span>
                            <span>Weight</span>
                            <span>PR</span>
                            <span>Timer</span>
                        </div>

                        {exercise.sets.map((set, j) => (
                            <div key={j} className="set-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 50px 80px', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <span style={{ textAlign: 'center', color: '#666' }}>{j + 1}</span>
                                <span className="hide-mobile" style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                                    {set.targetReps} {set.targetWeight ? `@ ${set.targetWeight}` : ''}
                                </span>
                                <input
                                    type="text"
                                    placeholder="Reps"
                                    className="input-field"
                                    style={{ marginBottom: 0, textAlign: 'center' }}
                                    value={logs[i].sets[j].reps}
                                    onChange={(e) => updateLog(i, j, 'reps', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="kg/lbs"
                                    className="input-field"
                                    style={{ marginBottom: 0, textAlign: 'center' }}
                                    value={logs[i].sets[j].weight}
                                    onChange={(e) => updateLog(i, j, 'weight', e.target.value)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={logs[i].sets[j].isPr}
                                        onChange={(e) => updateLog(i, j, 'isPr', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                </div>
                                <button
                                    onClick={() => toggleSetTimer(i, j)}
                                    style={{
                                        background: logs[i].sets[j].endTime ? 'var(--success)' : logs[i].sets[j].startTime ? 'var(--error)' : 'var(--secondary)',
                                        color: 'white',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '4px',
                                        padding: '0.25rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    {logs[i].sets[j].endTime
                                        ? `${logs[i].sets[j].duration}s`
                                        : logs[i].sets[j].startTime
                                            ? 'Stop'
                                            : 'Start'}
                                </button>
                            </div>
                        ))}

                        <div style={{ marginTop: '1rem' }}>
                            <textarea
                                placeholder="Add comments for this exercise..."
                                className="input-field"
                                style={{ minHeight: '60px', resize: 'vertical' }}
                                value={logs[i].comments || ''}
                                onChange={(e) => updateComment(i, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="btn-primary"
                onClick={handleFinish}
                disabled={saving}
                style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
            >
                {saving ? 'Saving...' : 'Finish Workout'}
            </button>
        </div>
    );
}
