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
    const [activeSessionIndex, setActiveSessionIndex] = useState(0);
    // plan.exercises now contains the sessions
    const activeSession = plan.exercises[activeSessionIndex];

    // Initialize logs state based on plan structure
    // We need to track logs for ALL sessions, but maybe just initialize for the current one?
    // Or better, structure logs by session ID.
    // For simplicity in this refactor, let's map logs to the flattened structure of the current session
    // But wait, if we switch sessions, we lose state if we don't store it.
    // Let's store logs as a map of sessionId -> LogExercise[]

    const [sessionLogs, setSessionLogs] = useState<Record<string, LogExercise[]>>(() => {
        const initialLogs: Record<string, LogExercise[]> = {};
        plan.exercises.forEach(session => {
            initialLogs[session.id] = session.exercises.map(ex => ({
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
            }));
        });
        return initialLogs;
    });

    const currentLogs = sessionLogs[activeSession?.id] || [];

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
        if (!activeSession) return;

        const newSessionLogs = { ...sessionLogs };
        const currentSessionLogs = [...newSessionLogs[activeSession.id]];
        const set = currentSessionLogs[exerciseIndex].sets[setIndex];

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

        newSessionLogs[activeSession.id] = currentSessionLogs;
        setSessionLogs(newSessionLogs);
    };

    const updateLog = (exerciseIndex: number, setIndex: number, field: keyof LogSet, value: any) => {
        if (!activeSession) return;

        const newSessionLogs = { ...sessionLogs };
        const currentSessionLogs = [...newSessionLogs[activeSession.id]];

        currentSessionLogs[exerciseIndex].sets[setIndex] = {
            ...currentSessionLogs[exerciseIndex].sets[setIndex],
            [field]: value
        };

        newSessionLogs[activeSession.id] = currentSessionLogs;
        setSessionLogs(newSessionLogs);
    };

    const updateComment = (exerciseIndex: number, value: string) => {
        if (!activeSession) return;

        const newSessionLogs = { ...sessionLogs };
        const currentSessionLogs = [...newSessionLogs[activeSession.id]];

        currentSessionLogs[exerciseIndex].comments = value;

        newSessionLogs[activeSession.id] = currentSessionLogs;
        setSessionLogs(newSessionLogs);
    };

    const handleFinish = async () => {
        if (!activeSession) return;

        setSaving(true);
        try {
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
                sessionId: activeSession.id,
                exerciseCount: currentLogs.length
            });

            const res = await fetch('/api/logs', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    plan_id: plan.id,  // Use snake_case to match database schema
                    trainee_id: traineeId,
                    exercises: currentLogs,
                    session_id: activeSession.id, // We might need to add this to the log schema later
                    notes: `Session: ${activeSession.name}`
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

    if (!plan.exercises || plan.exercises.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1rem' }}>
                    &larr; Back
                </button>
                <div style={{ textAlign: 'center', color: '#888' }}>
                    This plan has no sessions configured.
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

            {/* Metadata Display */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem', color: '#888' }}>
                {plan.assigned_at && (
                    <div>Assigned: {new Date(plan.assigned_at).toLocaleDateString()}</div>
                )}
                {plan.expires_at && (
                    <div>Expires: {new Date(plan.expires_at).toLocaleDateString()}</div>
                )}
            </div>

            {/* Session Selector */}
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem' }}>
                {plan.exercises.map((session, index) => (
                    <button
                        key={session.id}
                        onClick={() => setActiveSessionIndex(index)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: '1px solid var(--glass-border)',
                            background: activeSessionIndex === index ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: activeSessionIndex === index ? 'black' : 'white',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {session.name}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {activeSession && activeSession.exercises.map((exercise, i) => (
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
                                    value={currentLogs[i]?.sets[j]?.reps || ''}
                                    onChange={(e) => updateLog(i, j, 'reps', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="kg/lbs"
                                    className="input-field"
                                    style={{ marginBottom: 0, textAlign: 'center' }}
                                    value={currentLogs[i]?.sets[j]?.weight || ''}
                                    onChange={(e) => updateLog(i, j, 'weight', e.target.value)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={currentLogs[i]?.sets[j]?.isPr || false}
                                        onChange={(e) => updateLog(i, j, 'isPr', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                </div>
                                <button
                                    onClick={() => toggleSetTimer(i, j)}
                                    style={{
                                        background: currentLogs[i]?.sets[j]?.endTime ? 'var(--success)' : currentLogs[i]?.sets[j]?.startTime ? 'var(--error)' : 'var(--secondary)',
                                        color: 'white',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '4px',
                                        padding: '0.25rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    {currentLogs[i]?.sets[j]?.endTime
                                        ? `${currentLogs[i]?.sets[j]?.duration}s`
                                        : currentLogs[i]?.sets[j]?.startTime
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
                                value={currentLogs[i]?.comments || ''}
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
