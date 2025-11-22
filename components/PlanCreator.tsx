'use client';

import { useState } from 'react';
import { Exercise, ExerciseSet } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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
    const [exercises, setExercises] = useState<Exercise[]>(plan?.exercises || []);
    const [loading, setLoading] = useState(false);

    const addExercise = () => {
        setExercises([
            ...exercises,
            {
                id: uuidv4(),
                name: '',
                link: '',
                sets: [{ targetReps: '10', targetWeight: '' }]
            }
        ]);
    };

    const updateExercise = (index: number, field: keyof Exercise, value: any) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = plan ? '/api/plans' : '/api/plans';
            const method = plan ? 'PUT' : 'POST';
            const body = {
                id: plan?.id, // Only needed for PUT
                name: planName,
                traineeId,
                trainerId,
                exercises,
                createdAt: plan?.createdAt // Preserve creation date if editing
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
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
                                <h4 style={{ color: 'var(--primary)' }}>Exercise {i + 1}</h4>
                                <button type="button" onClick={() => removeExercise(i)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                            </div>

                            <input
                                type="text"
                                placeholder="Exercise Name"
                                className="input-field"
                                value={exercise.name}
                                onChange={(e) => updateExercise(i, 'name', e.target.value)}
                                required
                                style={{ marginBottom: '0.5rem' }}
                            />

                            <input
                                type="url"
                                placeholder="Link (e.g., https://www.muscleandstrength.com/...)"
                                className="input-field"
                                value={exercise.link}
                                onChange={(e) => updateExercise(i, 'link', e.target.value)}
                                style={{ marginBottom: '1rem' }}
                            />

                            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)' }}>
                                <h5 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#888' }}>Sets</h5>
                                {exercise.sets.map((set, j) => (
                                    <div key={j} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ alignSelf: 'center', width: '20px', color: '#666' }}>{j + 1}</span>
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
