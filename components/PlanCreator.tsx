'use client';

import { useState, useEffect } from 'react';
import { PlanExercise, Exercise, ExerciseSet, WorkoutSession, WorkoutPlan } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import ExerciseSearch from './ExerciseSearch';
import { cleanExercisesData } from '@/lib/utils';

interface PlanCreatorProps {
    traineeId: string;
    trainerId: string;
    onSave: () => void;
    onCancel: () => void;
    plan?: WorkoutPlan;
}

export default function PlanCreator({ traineeId, trainerId, onSave, onCancel, plan }: PlanCreatorProps) {
    const [planName, setPlanName] = useState(plan?.name || '');
    // Initialize sessions: use plan.exercises (which maps to sessions) or create a default one
    const [sessions, setSessions] = useState<WorkoutSession[]>(() => {
        if (plan?.exercises && plan.exercises.length > 0) {
            // Check if the data is actually sessions (has 'exercises' array) or old flat exercises
            // The type definition says exercises: WorkoutSession[], so we assume it's correct if migrated.
            // However, for robustness, we might want to check.
            // For now, assume it's correct as per the migration.
            return plan.exercises;
        }
        return [{ id: uuidv4(), name: 'Session 1', exercises: [] }];
    });

    const [activeSessionIndex, setActiveSessionIndex] = useState(0);
    const [assignedAt, setAssignedAt] = useState(plan?.assigned_at ? new Date(plan.assigned_at).toISOString().split('T')[0] : '');
    const [expiresAt, setExpiresAt] = useState(plan?.expires_at ? new Date(plan.expires_at).toISOString().split('T')[0] : '');

    const [loading, setLoading] = useState(false);
    const [showingManualEntry, setShowingManualEntry] = useState<number | null>(null);
    const [showingNotes, setShowingNotes] = useState<number | null>(null);

    const activeSession = sessions[activeSessionIndex];

    const addSession = () => {
        const newSession: WorkoutSession = {
            id: uuidv4(),
            name: `Session ${sessions.length + 1}`,
            exercises: []
        };
        setSessions([...sessions, newSession]);
        setActiveSessionIndex(sessions.length); // Switch to new session
    };

    const removeSession = (index: number) => {
        if (sessions.length <= 1) {
            alert('You must have at least one session.');
            return;
        }
        const newSessions = sessions.filter((_, i) => i !== index);
        setSessions(newSessions);
        if (activeSessionIndex >= index && activeSessionIndex > 0) {
            setActiveSessionIndex(activeSessionIndex - 1);
        }
    };

    const updateSessionName = (index: number, name: string) => {
        const newSessions = [...sessions];
        newSessions[index].name = name;
        setSessions(newSessions);
    };

    const addExercise = () => {
        const newSessions = [...sessions];
        newSessions[activeSessionIndex].exercises.push({
            id: uuidv4(),
            name: '',
            sets: [{ targetReps: '10', targetWeight: '' }]
        });
        setSessions(newSessions);
    };

    const updateExercise = (exerciseIndex: number, field: keyof PlanExercise, value: any) => {
        const newSessions = [...sessions];
        const exercise = newSessions[activeSessionIndex].exercises[exerciseIndex];
        newSessions[activeSessionIndex].exercises[exerciseIndex] = { ...exercise, [field]: value };
        setSessions(newSessions);
    };

    const addSet = (exerciseIndex: number) => {
        const newSessions = [...sessions];
        newSessions[activeSessionIndex].exercises[exerciseIndex].sets.push({ targetReps: '10', targetWeight: '' });
        setSessions(newSessions);
    };

    const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
        const newSessions = [...sessions];
        const set = newSessions[activeSessionIndex].exercises[exerciseIndex].sets[setIndex];
        newSessions[activeSessionIndex].exercises[exerciseIndex].sets[setIndex] = { ...set, [field]: value };
        setSessions(newSessions);
    };

    const removeExercise = (exerciseIndex: number) => {
        const newSessions = [...sessions];
        newSessions[activeSessionIndex].exercises = newSessions[activeSessionIndex].exercises.filter((_, i) => i !== exerciseIndex);
        setSessions(newSessions);
    };

    const handleExerciseSelect = (exerciseIndex: number, selectedExercise: any) => {
        const newSessions = [...sessions];
        newSessions[activeSessionIndex].exercises[exerciseIndex] = {
            ...newSessions[activeSessionIndex].exercises[exerciseIndex],
            name: selectedExercise.name,
            exercise_id: selectedExercise.exercise_id,
            gif_url: selectedExercise.gif_url || undefined
        };
        setSessions(newSessions);
        setShowingManualEntry(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = plan ? '/api/plans' : '/api/plans';
            const method = plan ? 'PUT' : 'POST';

            // Clean exercises data for each session
            const cleanedSessions = sessions.map(session => ({
                ...session,
                exercises: cleanExercisesData(session.exercises)
            }));

            const body: any = {
                name: planName,
                trainee_id: traineeId,
                trainer_id: trainerId,
                exercises: cleanedSessions, // Map sessions to exercises key
                description: '',
                assigned_at: assignedAt || null,
                expires_at: expiresAt || null
            };

            if (plan?.id) {
                body.id = plan.id;
            }
            if (plan?.created_at) {
                body.created_at = plan.created_at;
            }

            // Wait for auth state to be ready and retry if session is not available
            let session = null;
            let retryCount = 0;
            const maxRetries = 5;

            while (!session && retryCount < maxRetries) {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    session = currentSession;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
                retryCount++;
            }

            if (!session) {
                console.error('No valid session found after retries');
                setLoading(false);
                return;
            }

            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(body),
            });

            if (res.ok) {
                onSave();
            } else {
                alert('Failed to save plan');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{plan ? 'Edit Workout Plan' : 'Create New Workout Plan'}</h3>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Plan Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Hypertrophy Phase 1"
                            className="input-field"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Assigned Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={assignedAt}
                            onChange={(e) => setAssignedAt(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Expiration Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>
                </div>

                {/* Session Management */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        {sessions.map((session, index) => (
                            <div key={session.id} style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveSessionIndex(index)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        paddingRight: '2rem',
                                        borderRadius: '8px 8px 0 0',
                                        border: '1px solid var(--glass-border)',
                                        borderBottom: activeSessionIndex === index ? 'none' : '1px solid var(--glass-border)',
                                        background: activeSessionIndex === index ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: activeSessionIndex === index ? 'var(--primary)' : '#888',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {session.name}
                                </button>
                                {sessions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeSession(index); }}
                                        style={{
                                            position: 'absolute',
                                            right: '4px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--error)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            padding: '4px'
                                        }}
                                        title="Remove Session"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addSession}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px dashed var(--glass-border)',
                                background: 'transparent',
                                color: 'var(--accent)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            + Add Session
                        </button>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0 8px 8px 8px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Session Name</label>
                            <input
                                type="text"
                                value={activeSession.name}
                                onChange={(e) => updateSessionName(activeSessionIndex, e.target.value)}
                                className="input-field"
                                placeholder="e.g., Monday - Chest"
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {activeSession.exercises.map((exercise, i) => (
                                <div key={exercise.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <h4 style={{ color: 'var(--primary)' }}>
                                            Exercise {i + 1}
                                            {exercise.exercise_id && (
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    marginLeft: '8px'
                                                }}>
                                                    DB
                                                </span>
                                            )}
                                        </h4>
                                        <button type="button" onClick={() => removeExercise(i)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    </div>

                                    {showingManualEntry === i ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                placeholder="Exercise Name"
                                                className="input-field"
                                                value={exercise.name}
                                                onChange={(e) => updateExercise(i, 'name', e.target.value)}
                                                required
                                                style={{ marginBottom: 0, flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowingManualEntry(null)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'var(--secondary)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: 'var(--foreground)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                Use Search
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <ExerciseSearch
                                                onSelectExercise={(selectedExercise) => handleExerciseSelect(i, selectedExercise)}
                                                placeholder={exercise.name || "Search for an exercise..."}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowingManualEntry(i)}
                                                style={{
                                                    marginTop: '0.25rem',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#888',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Enter manually instead
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowingNotes(showingNotes === i ? null : i)}
                                            style={{
                                                background: 'none',
                                                border: '1px dashed var(--glass-border)',
                                                color: 'var(--foreground)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                width: '100%'
                                            }}
                                        >
                                            {exercise.notes ? '📝 Edit Notes' : '+ Add Notes'}
                                        </button>
                                        {showingNotes === i && (
                                            <textarea
                                                placeholder="Add notes for this exercise..."
                                                className="input-field"
                                                value={exercise.notes || ''}
                                                onChange={(e) => updateExercise(i, 'notes', e.target.value)}
                                                style={{
                                                    marginTop: '0.5rem',
                                                    minHeight: '80px',
                                                    resize: 'vertical',
                                                    marginBottom: 0
                                                }}
                                            />
                                        )}
                                    </div>

                                    <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)' }}>
                                        <h5 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#888' }}>Sets</h5>
                                        {exercise.sets.map((set, j) => (
                                            <div key={j} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{ alignSelf: 'center', width: '20px', color: '#666' }}>{j + 1}</span>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Reps</label>
                                                    <input
                                                        type="text"
                                                        placeholder="10"
                                                        className="input-field"
                                                        value={set.targetReps}
                                                        onChange={(e) => updateSet(i, j, 'targetReps', e.target.value)}
                                                        style={{ marginBottom: 0 }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Weight (opt)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="lbs/kg"
                                                        className="input-field"
                                                        value={set.targetWeight}
                                                        onChange={(e) => updateSet(i, j, 'targetWeight', e.target.value)}
                                                        style={{ marginBottom: 0 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addSet(i)}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.25rem' }}
                                        >
                                            + Add Set
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addExercise}
                            style={{ width: '100%', padding: '0.75rem', border: '1px dashed var(--glass-border)', background: 'transparent', color: 'var(--foreground)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            + Add Exercise to {activeSession.name}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Saving...' : 'Save Plan'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
