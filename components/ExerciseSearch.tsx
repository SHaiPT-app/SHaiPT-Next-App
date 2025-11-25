'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseDb';

interface Exercise {
    exercise_id: string;
    name: string;
    category?: string;
    equipment?: string;
    body_parts?: string[];
    instructions?: string[];
}

interface ExerciseSearchProps {
    onSelectExercise: (exercise: Exercise) => void;
    placeholder?: string;
}

export default function ExerciseSearch({ onSelectExercise, placeholder = "Search exercises..." }: ExerciseSearchProps) {
    const [query, setQuery] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const searchExercises = async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setExercises([]);
            return;
        }

        setLoading(true);
        try {
            const results = await db.exercises.search(searchQuery);
            setExercises(results);
        } catch (error) {
            console.error('Exercise search error:', error);
            setExercises([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchExercises(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelectExercise = (exercise: Exercise) => {
        onSelectExercise(exercise);
        setQuery('');
        setIsOpen(false);
        setExercises([]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setIsOpen(value.length >= 2);
    };

    const handleInputBlur = () => {
        // Delay closing to allow for click events on dropdown items
        setTimeout(() => setIsOpen(false), 200);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                placeholder={placeholder}
                className="input-field"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
                onBlur={handleInputBlur}
                style={{ marginBottom: 0 }}
            />
            
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginTop: '4px'
                }}>
                    {loading && (
                        <div style={{
                            padding: '0.75rem',
                            color: '#888',
                            textAlign: 'center'
                        }}>
                            Searching...
                        </div>
                    )}
                    
                    {!loading && exercises.length === 0 && query.length >= 2 && (
                        <div style={{
                            padding: '0.75rem',
                            color: '#888',
                            textAlign: 'center'
                        }}>
                            No exercises found
                        </div>
                    )}
                    
                    {!loading && exercises.map((exercise) => (
                        <div
                            key={exercise.exercise_id}
                            onClick={() => handleSelectExercise(exercise)}
                            style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <div style={{ fontWeight: '500', color: 'var(--foreground)' }}>
                                {exercise.name}
                            </div>
                            {exercise.category && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#888',
                                    marginTop: '2px'
                                }}>
                                    {exercise.category}
                                    {exercise.equipment && ` • ${exercise.equipment}`}
                                </div>
                            )}
                            {exercise.body_parts && exercise.body_parts.length > 0 && (
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--primary)',
                                    marginTop: '4px'
                                }}>
                                    {exercise.body_parts.join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}