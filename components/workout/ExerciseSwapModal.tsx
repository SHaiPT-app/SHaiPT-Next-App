'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Sparkles,
    ChevronRight,
    Dumbbell,
    Filter,
} from 'lucide-react';
import type { Exercise, SessionSet } from '@/lib/types';

interface ExerciseSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (exercise: Exercise, targetSets: SessionSet[]) => void;
    currentExercise: Exercise;
    currentTargetSets: SessionSet[];
    allExercises: Exercise[];
    suggestedExercises?: Exercise[];
}

export function ExerciseSwapModal({
    isOpen,
    onClose,
    onSelect,
    currentExercise,
    currentTargetSets,
    allExercises,
    suggestedExercises = [],
}: ExerciseSwapModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'suggested' | 'browse'>('suggested');

    // Get unique muscle groups and equipment from current exercise
    const relevantFilters = useMemo(() => {
        const muscles = new Set<string>();
        const equipment = new Set<string>();

        allExercises.forEach(ex => {
            ex.target_muscles.forEach(m => muscles.add(m));
            ex.equipments.forEach(e => equipment.add(e));
        });

        return {
            muscles: Array.from(muscles).sort(),
            equipment: Array.from(equipment).sort(),
        };
    }, [allExercises]);

    // Filter exercises
    const filteredExercises = useMemo(() => {
        let exercises = activeTab === 'suggested' ? suggestedExercises : allExercises;

        // Exclude current exercise
        exercises = exercises.filter(ex => ex.exercise_id !== currentExercise.exercise_id);

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            exercises = exercises.filter(ex =>
                ex.name.toLowerCase().includes(query) ||
                ex.target_muscles.some(m => m.toLowerCase().includes(query)) ||
                ex.equipments.some(e => e.toLowerCase().includes(query))
            );
        }

        // Apply muscle filter
        if (selectedMuscle) {
            exercises = exercises.filter(ex =>
                ex.target_muscles.includes(selectedMuscle) ||
                ex.secondary_muscles?.includes(selectedMuscle)
            );
        }

        // Apply equipment filter
        if (selectedEquipment) {
            exercises = exercises.filter(ex =>
                ex.equipments.includes(selectedEquipment)
            );
        }

        return exercises.slice(0, 50); // Limit results
    }, [activeTab, suggestedExercises, allExercises, currentExercise, searchQuery, selectedMuscle, selectedEquipment]);

    const handleSelect = (exercise: Exercise) => {
        // Use the same target sets as the current exercise
        onSelect(exercise, currentTargetSets);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="w-full max-w-2xl h-[90vh] sm:h-[80vh] bg-[var(--surface-1)] backdrop-blur-xl rounded-t-2xl sm:rounded-2xl border border-line-soft overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 p-4 border-b border-line-soft">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-ink-hi">Swap Exercise</h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-ink-mid hover:text-ink-hi hover:bg-[var(--surface-2)]"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Current Exercise */}
                            <div className="p-3 bg-[var(--surface-2)] border border-line-soft rounded-xl mb-4">
                                <p className="text-xs text-ink-low mb-1">Current Exercise</p>
                                <p className="font-medium text-ink-hi">{currentExercise.name}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {currentExercise.target_muscles.map(muscle => (
                                        <span
                                            key={muscle}
                                            className="px-2 py-0.5 rounded-full bg-[var(--brand-glow-soft)] text-brand text-xs"
                                        >
                                            {muscle}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setActiveTab('suggested')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                                        activeTab === 'suggested'
                                            ? 'bg-[var(--brand-glow-soft)] text-brand border border-brand/30'
                                            : 'bg-[var(--surface-2)] text-ink-mid'
                                    }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    AI Suggestions
                                </button>
                                <button
                                    onClick={() => setActiveTab('browse')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                                        activeTab === 'browse'
                                            ? 'bg-[var(--brand-glow-soft)] text-brand border border-brand/30'
                                            : 'bg-[var(--surface-2)] text-ink-mid'
                                    }`}
                                >
                                    <Dumbbell className="w-4 h-4" />
                                    Browse All
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-low" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search exercises..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-2)] border border-line-strong rounded-lg text-ink-hi placeholder:text-ink-low focus:outline-none focus:border-brand"
                                />
                            </div>

                            {/* Filters */}
                            {activeTab === 'browse' && (
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                    <select
                                        value={selectedMuscle || ''}
                                        onChange={(e) => setSelectedMuscle(e.target.value || null)}
                                        className="px-3 py-1.5 bg-[var(--surface-2)] border border-line-strong rounded-lg text-sm text-ink-mid focus:outline-none focus:border-brand"
                                    >
                                        <option value="">All Muscles</option>
                                        {relevantFilters.muscles.map(muscle => (
                                            <option key={muscle} value={muscle}>{muscle}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={selectedEquipment || ''}
                                        onChange={(e) => setSelectedEquipment(e.target.value || null)}
                                        className="px-3 py-1.5 bg-[var(--surface-2)] border border-line-strong rounded-lg text-sm text-ink-mid focus:outline-none focus:border-brand"
                                    >
                                        <option value="">All Equipment</option>
                                        {relevantFilters.equipment.map(eq => (
                                            <option key={eq} value={eq}>{eq}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Exercise List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {filteredExercises.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredExercises.map((exercise) => (
                                        <button
                                            key={exercise.exercise_id}
                                            onClick={() => handleSelect(exercise)}
                                            className="w-full p-3 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl border border-line-soft hover:border-brand/40 transition-colors flex items-center gap-3 text-left group"
                                        >
                                            {exercise.gif_url ? (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
                                                    <img
                                                        src={exercise.gif_url}
                                                        alt={exercise.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                                                    <Dumbbell className="w-6 h-6 text-ink-low" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-ink-hi group-hover:text-brand transition-colors truncate">
                                                    {exercise.name}
                                                </p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {exercise.target_muscles.slice(0, 2).map(muscle => (
                                                        <span
                                                            key={muscle}
                                                            className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-ink-mid text-xs"
                                                        >
                                                            {muscle}
                                                        </span>
                                                    ))}
                                                    {exercise.equipments[0] && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-ink-mid text-xs">
                                                            {exercise.equipments[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-ink-low group-hover:text-brand transition-colors flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <Dumbbell className="w-12 h-12 text-ink-low mb-3" />
                                    <p className="text-ink-mid">No exercises found</p>
                                    <p className="text-sm text-ink-low mt-1">
                                        Try adjusting your search or filters
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ExerciseSwapModal;
