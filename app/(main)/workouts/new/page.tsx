'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import { ArrowLeft, Plus, Trash2, Search, Save, Dumbbell } from 'lucide-react';
import type { Profile, Exercise, SessionExercise, SessionSet } from '@/lib/types';

// Extend SessionExercise for local UI state to include the display name
interface LocalSessionExercise extends SessionExercise {
    _name?: string;
    _gifUrl?: string;
}

export default function NewWorkoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editSessionId = searchParams.get('edit');

    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);

    // Workout Info
    const [workoutName, setWorkoutName] = useState('');
    const [description, setDescription] = useState('');

    // Exercises State
    const [selectedExercises, setSelectedExercises] = useState<LocalSessionExercise[]>([]);

    // Exercise Search State
    const [showExerciseSearch, setShowExerciseSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [searching, setSearching] = useState(false);

    // Insertion & Scroll State
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const [addedExerciseIndex, setAddedExerciseIndex] = useState<number | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    // Auto-scroll to added exercise
    useEffect(() => {
        if (addedExerciseIndex !== null) {
            const element = document.getElementById(`exercise-card-${addedExerciseIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Clear the index after a short delay to allow animation
            const timer = setTimeout(() => setAddedExerciseIndex(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [addedExerciseIndex]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Load existing session if editing
    useEffect(() => {
        const loadSessionForEdit = async () => {
            if (!editSessionId) return;

            setLoading(true);
            try {
                const session = await db.workoutSessions.getById(editSessionId);
                if (session) {
                    setWorkoutName(session.name);
                    setDescription(session.description || '');

                    // Enrich exercises with details for UI
                    const exercisesWithDetails = await Promise.all(
                        session.exercises.map(async (ex) => {
                            const exerciseDetails = await db.exercises.getById(ex.exercise_id);
                            return {
                                ...ex,
                                _name: exerciseDetails?.name || 'Unknown Exercise',
                                _gifUrl: exerciseDetails?.gif_url
                            } as LocalSessionExercise;
                        })
                    );
                    setSelectedExercises(exercisesWithDetails);
                }
            } catch (error) {
                console.error('Error loading session for edit:', error);
                alert('Failed to load workout for editing');
            } finally {
                setLoading(false);
            }
        };

        loadSessionForEdit();
    }, [editSessionId]);

    // Search Exercises
    useEffect(() => {
        const searchExercises = async () => {
            // Only search if 2+ chars
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setSearching(true);
            try {
                const results = await db.exercises.search(searchQuery);
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching exercises:', error);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchExercises, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleAddExercise = (exercise: Exercise) => {
        const newExercise: SessionExercise = {
            exercise_id: exercise.exercise_id,
            sets: [
                { reps: '10', weight: '', rest_seconds: 60 },
                { reps: '10', weight: '', rest_seconds: 60 },
                { reps: '10', weight: '', rest_seconds: 60 }
            ],
            notes: ''
        };
        // Add additional metadata for display if needed (but type is strict)
        // We might need to store the name separately for display, or fetch it. 
        // For this UI, let's just append it to a local state wrapper if we needed display names,
        // but for now relying on just the ID might make the UI hard to read.
        // ACTUALLY: The `SessionExercise` type only has the ID. The UI needs the name. 
        // Let's cheat a bit and extend the state type locally to include the name for display.

        if (insertIndex !== null) {
            // Insert at specific index
            const updated = [...selectedExercises];
            updated.splice(insertIndex, 0, { ...newExercise, _name: exercise.name, _gifUrl: exercise.gif_url } as any);
            setSelectedExercises(updated);
            setAddedExerciseIndex(insertIndex);
        } else {
            // Append to end
            setSelectedExercises(prev => [...prev, { ...newExercise, _name: exercise.name, _gifUrl: exercise.gif_url } as any]);
            setAddedExerciseIndex(selectedExercises.length); // Index of new item
        }

        setShowExerciseSearch(false);
        setSearchQuery('');
        setInsertIndex(null);
    };

    const handleUpdateExercise = (index: number, field: keyof SessionExercise, value: any) => {
        const updated = [...selectedExercises];
        updated[index] = { ...updated[index], [field]: value };
        setSelectedExercises(updated);
    };

    const handleRemoveExercise = (index: number) => {
        const updated = [...selectedExercises];
        updated.splice(index, 1);
        setSelectedExercises(updated);
        showNotification('Exercise deleted');
    };

    const handleSaveWorkout = async () => {
        if (!user || !workoutName.trim()) return;
        setLoading(true);

        try {
            // Clean up exercises to remove UI-only props
            const cleanedExercises = selectedExercises.map(({ _name, _gifUrl, ...rest }) => rest);

            const sessionData = {
                creator_id: user.id,
                name: workoutName,
                description,
                exercises: cleanedExercises,
                is_template: true,
                is_public: true, // Defaulting to true for now
                tags: [] // TODO: add tags UI
            };

            if (editSessionId) {
                await db.workoutSessions.update(editSessionId, sessionData);
            } else {
                await db.workoutSessions.create(sessionData);
            }

            router.push('/home');
        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Failed to save workout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.5rem', margin: 0 }}>
                    {editSessionId ? 'Edit Workout' : 'Create New Workout'}
                </h1>
            </div>

            {/* Workout Basics */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Workout Name</label>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            placeholder="e.g., Upper Body Power"
                            className="input-field"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Focus of this session..."
                            className="input-field"
                            style={{ width: '100%', minHeight: '80px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Exercises Section */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: 'var(--primary)', margin: 0 }}>Exercises</h3>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setInsertIndex(null); // Explicitly reset to null to append
                            setShowExerciseSearch(true);
                        }}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={16} /> Add Exercise
                    </button>
                </div>

                {selectedExercises.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #444', borderRadius: '12px', color: '#888' }}>
                        No exercises added yet.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {selectedExercises.map((ex: LocalSessionExercise, exerciseIndex) => (
                            <div key={exerciseIndex}>
                                <div
                                    id={`exercise-card-${exerciseIndex}`}
                                    className="glass-panel"
                                    style={{ padding: '1rem' }}
                                >
                                    {/* Exercise Header: Title and Delete */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0, fontWeight: '600', color: 'var(--primary)', textTransform: 'capitalize', fontSize: '1.2rem' }}>
                                            {ex._name || ex.exercise_id}
                                        </h4>
                                        <button
                                            onClick={() => handleRemoveExercise(exerciseIndex)}
                                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.25rem' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Exercise GIF: Centered and Large */}
                                    {ex._gifUrl && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                            <div style={{
                                                width: '240px',
                                                height: '240px',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                background: '#000',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                            }}>
                                                <img
                                                    src={ex._gifUrl}
                                                    alt={ex._name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '1rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.1' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Set</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reps</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Weight</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Rest (s)</th>
                                                    <th style={{ width: '30px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ex.sets.map((set: SessionSet, setIndex: number) => (
                                                    <tr key={setIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '0.5rem', color: '#888' }}>{setIndex + 1}</td>
                                                        <td style={{ padding: '0.5rem' }}>
                                                            <input
                                                                type="text"
                                                                value={set.reps}
                                                                onChange={(e) => {
                                                                    const updatedSets = [...ex.sets];
                                                                    updatedSets[setIndex] = { ...set, reps: e.target.value };
                                                                    handleUpdateExercise(exerciseIndex, 'sets', updatedSets);
                                                                }}
                                                                className="input-field"
                                                                style={{ width: '60px', padding: '0.25rem' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '0.5rem' }}>
                                                            <input
                                                                type="text"
                                                                value={set.weight || ''}
                                                                onChange={(e) => {
                                                                    const updatedSets = [...ex.sets];
                                                                    updatedSets[setIndex] = { ...set, weight: e.target.value };
                                                                    handleUpdateExercise(exerciseIndex, 'sets', updatedSets);
                                                                }}
                                                                placeholder={user?.preferred_weight_unit || 'lbs'}
                                                                className="input-field"
                                                                style={{ width: '80px', padding: '0.25rem' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '0.5rem' }}>
                                                            <input
                                                                type="number"
                                                                value={Number.isNaN(set.rest_seconds) ? '' : set.rest_seconds}
                                                                onChange={(e) => {
                                                                    const updatedSets = [...ex.sets];
                                                                    updatedSets[setIndex] = { ...set, rest_seconds: parseInt(e.target.value) || 0 }; // Ensure it's a number
                                                                    handleUpdateExercise(exerciseIndex, 'sets', updatedSets);
                                                                }}
                                                                className="input-field"
                                                                style={{ width: '60px', padding: '0.25rem' }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => {
                                                                    const updatedSets = ex.sets.filter((_: SessionSet, i: number) => i !== setIndex);
                                                                    handleUpdateExercise(exerciseIndex, 'sets', updatedSets);
                                                                }}
                                                                style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}
                                                            >
                                                                &times;
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        onClick={() => {
                                            // Duplicate the last set, or add a default one
                                            const lastSet = ex.sets[ex.sets.length - 1] || { reps: '10', weight: '', rest_seconds: 60 };
                                            const updatedSets = [...ex.sets, { ...lastSet }];
                                            handleUpdateExercise(exerciseIndex, 'sets', updatedSets);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px dashed rgba(255,255,255,0.2)',
                                            color: '#bbb',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        + Add Set
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                                    <button
                                        onClick={() => {
                                            setInsertIndex(exerciseIndex + 1);
                                            setShowExerciseSearch(true);
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#888',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.color = 'var(--primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.color = '#888';
                                        }}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Add Button at Bottom */}
                <button
                    className="btn-primary"
                    onClick={() => {
                        setInsertIndex(null); // Explicitly reset to null to append
                        setShowExerciseSearch(true);
                    }}
                    style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> Add Exercise
                </button>
            </div>

            {/* Exercise Search Modal */}
            {showExerciseSearch && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', height: '80vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Select Exercise</h3>
                            <button onClick={() => setShowExerciseSearch(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={20} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
                                <input
                                    type="text"
                                    placeholder="Search exercises..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.length >= 2) {
                                            setSearching(true);
                                        }
                                    }}
                                    className="input-field"
                                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
                            {searching ? (
                                <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Searching...</div>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {searchQuery.length < 2 ? (
                                        <div style={{ textAlign: 'center', color: '#666', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <Search size={32} style={{ opacity: 0.5 }} />
                                            <p>Start typing to find exercises...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {searchResults.map(ex => (
                                                <button
                                                    key={ex.exercise_id}
                                                    onClick={() => handleAddExercise(ex)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: 'none',
                                                        padding: '1rem',
                                                        textAlign: 'left',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem'
                                                    }}
                                                >
                                                    <Dumbbell size={16} color="var(--primary)" />
                                                    <span style={{ textTransform: 'capitalize' }}>{ex.name}</span>
                                                </button>
                                            ))}
                                            {searchResults.length === 0 && (
                                                <div style={{ textAlign: 'center', color: '#666', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    <Dumbbell size={32} style={{ opacity: 0.2 }} />
                                                    <p>No exercises found for "{searchQuery}"</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 100
            }}>
                <button
                    onClick={handleSaveWorkout}
                    disabled={loading || !workoutName}
                    className="btn-primary"
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '1.1rem'
                    }}
                >
                    {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : <Save size={20} />}
                    {loading ? 'Saving...' : (editSessionId ? 'Update Workout' : 'Create Workout')}
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '6rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid var(--glass-border)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(76, 175, 80, 0.2)',
                        color: '#4caf50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'white' }}>{notification}</span>
                </div>
            )}
        </div>
    );
}
