'use client';

import { useState } from 'react';
import { PlanExercise, Exercise, ExerciseSet } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import ExerciseSearch from './ExerciseSearch';

import { WorkoutPlan } from '@/lib/types';

interface PlanCreatorProps {
    traineeId: string;
    trainerId: string;
    onSave: () => void;
    onCancel: () => void;
    plan?: WorkoutPlan;
}

export default function PlanCreator({ traineeId, trainerId, onSave, onCancel, plan }: PlanCreatorProps) {
    const [planName, setPlanName] = useState(plan?.name || '');
    const [exercises, setExercises] = useState<PlanExercise[]>(plan?.exercises || []);
    const [loading, setLoading] = useState(false);
    const [showingManualEntry, setShowingManualEntry] = useState<number | null>(null);
    const [showingNotes, setShowingNotes] = useState<number | null>(null);

    const addExercise = () => {
        setExercises([
            ...exercises,
            {
                id: uuidv4(),
                name: '',
                sets: [{ targetReps: '10', targetWeight: '' }]
            }
        ]);
    };

    const updateExercise = (index: number, field: keyof PlanExercise, value: any) => {
        const newExercises = [...exercises];
        newExercises[index] = { ...newExercises[index], [field]: value };
        setExercises(newExercises);
    };

    const addSet = (exerciseIndex: number) => {
        const newExercises = [...exercises];
        newExercises[exerciseIndex].sets.push({ targetReps: '10', targetWeight: '' });
        setExercises(newExercises);
    };

    const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
        const newExercises = [...exercises];
        newExercises[exerciseIndex].sets[setIndex] = {
            ...newExercises[exerciseIndex].sets[setIndex],
            [field]: value
        };
        setExercises(newExercises);
    };

    const removeExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const handleExerciseSelect = (exerciseIndex: number, selectedExercise: any) => {
        const newExercises = [...exercises];
        newExercises[exerciseIndex] = {
            ...newExercises[exerciseIndex],
            name: selectedExercise.name,
            exercise_id: selectedExercise.exercise_id, // Store the database reference
            gif_url: selectedExercise.gif_url || undefined // Store GIF URL internally
        };
        setExercises(newExercises);
        setShowingManualEntry(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = plan ? '/api/plans' : '/api/plans';
            const method = plan ? 'PUT' : 'POST';
            
            // Clean exercises data - remove any undefined or circular references
            const cleanedExercises = exercises.map(exercise => ({
                id: exercise.id,
                name: exercise.name || '',
                exercise_id: exercise.exercise_id || undefined,
                gif_url: exercise.gif_url || undefined,
                notes: exercise.notes || undefined,
                sets: exercise.sets.map(set => ({
                    targetReps: set.targetReps || '10',
                    targetWeight: set.targetWeight || '',
                    actualReps: set.actualReps || undefined,
                    actualWeight: set.actualWeight || undefined,
                    pr: set.pr || false
                }))
            })).map(exercise => {
                // Remove undefined values from exercise object
                const cleaned: any = {};
                Object.entries(exercise).forEach(([key, value]) => {
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                });
                return cleaned;
            });

            const body: any = {
                name: planName,
                trainee_id: traineeId,
                trainer_id: trainerId,
                exercises: cleanedExercises,
                description: ''
            };

            // Only add these fields if they exist (for PUT requests)
            if (plan?.id) {
                body.id = plan.id;
            }
            if (plan?.created_at) {
                body.created_at = plan.created_at;
            }

            console.log('Sending plan data:', {
                ...body,
                traineeId_type: typeof traineeId,
                trainerId_type: typeof trainerId,
                traineeId_value: traineeId,
                trainerId_value: trainerId
            });

            // Debug exercises structure
            console.log('Exercises details:', JSON.stringify(exercises, null, 2));

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
                
                // Wait briefly before retrying
                await new Promise(resolve => setTimeout(resolve, 200));
                retryCount++;
            }
            
            if (!session) {
                console.error('No valid session found after retries');
                setLoading(false);
                return;
            }
            
            console.log('Session status:', session ? 'Active' : 'No session');
            
            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
                console.log('Added auth header to request');
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
                <input
                    type="text"
                    placeholder="Plan Name (e.g., Chest & Triceps)"
                    className="input-field"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    required
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {exercises.map((exercise, i) => (
                        <div key={exercise.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
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
                    style={{ width: '100%', padding: '0.75rem', border: '1px dashed var(--glass-border)', background: 'transparent', color: 'var(--foreground)', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.5rem' }}
                >
                    + Add Exercise
                </button>

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
