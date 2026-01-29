'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    ArrowsUpFromLine,
    Info,
    MoreVertical,
    Repeat,
    CheckCircle2,
} from 'lucide-react';
import { SetLogger } from './SetLogger';
import { SetCard } from './SetCard';
import { RestTimer } from './RestTimer';
import { ExerciseNotes } from './ExerciseNotes';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import type { EnhancedLoggedSet, IntensifierType, SessionSet, Exercise } from '@/lib/types';

interface ExerciseScreenProps {
    exercise: Exercise;
    exerciseIndex: number;
    totalExercises: number;
    targetSets: SessionSet[];
    loggedSets: EnhancedLoggedSet[];
    exerciseNotes?: string;
    onLogSet: (set: Omit<EnhancedLoggedSet, 'set_number' | 'started_at' | 'completed_at'>) => void;
    onUpdateSet: (setIndex: number, updates: Partial<EnhancedLoggedSet>) => void;
    onRemoveSet: (setIndex: number) => void;
    onNavigate: (direction: 'prev' | 'next') => void;
    onSaveNotes: (notes: string) => void;
    onSwapExercise: () => void;
    onShowIntensifier: (type: IntensifierType) => void;
    onFinishWorkout?: () => void;
    prsForExercise?: string[];
    weightUnit: 'lbs' | 'kg';
}

export function ExerciseScreen({
    exercise,
    exerciseIndex,
    totalExercises,
    targetSets,
    loggedSets,
    exerciseNotes,
    onLogSet,
    onUpdateSet,
    onRemoveSet,
    onNavigate,
    onSaveNotes,
    onSwapExercise,
    onShowIntensifier,
    onFinishWorkout,
    prsForExercise = [],
    weightUnit,
}: ExerciseScreenProps) {
    const { timer, startRestTimer } = useWorkoutStore();
    const { preferences } = useUserPreferencesStore();
    const [showExerciseInfo, setShowExerciseInfo] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown menu on outside click (Bug 16)
    useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    // Calculate next set number
    const nextSetNumber = loggedSets.length + 1;

    // Get previous set for reference
    const previousSet = loggedSets.length > 0 ? loggedSets[loggedSets.length - 1] : undefined;

    // Get target for current set
    const currentTargetSet = targetSets[loggedSets.length] || targetSets[targetSets.length - 1];

    // Check if all target sets are completed
    const isExerciseComplete = loggedSets.length >= targetSets.length;

    // Handle set logged
    const handleLogSet = useCallback((setData: Omit<EnhancedLoggedSet, 'set_number' | 'started_at' | 'completed_at'>) => {
        const fullSet: EnhancedLoggedSet = {
            ...setData,
            set_number: nextSetNumber,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        };

        onLogSet(fullSet);

        // Auto-start rest timer if enabled
        if (preferences?.rest_timer_auto_start) {
            const restSeconds = currentTargetSet?.rest_seconds || preferences?.default_rest_seconds || 90;
            startRestTimer(restSeconds);
        }
    }, [nextSetNumber, onLogSet, preferences, currentTargetSet, startRestTimer]);

    // Calculate progress
    const progress = useMemo(() => {
        return targetSets.length > 0
            ? Math.round((loggedSets.length / targetSets.length) * 100)
            : 0;
    }, [loggedSets.length, targetSets.length]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
                {/* Navigation */}
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => onNavigate('prev')}
                        disabled={exerciseIndex === 0}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="text-center">
                        <span className="text-sm text-gray-400">
                            Exercise {exerciseIndex + 1} of {totalExercises}
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-1">
                            {Array.from({ length: totalExercises }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i < exerciseIndex ? 'bg-green-400' :
                                        i === exerciseIndex ? 'bg-cyan-400' :
                                        'bg-gray-700'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate('next')}
                        disabled={exerciseIndex === totalExercises - 1}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Exercise Info */}
                <div className="px-4 pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">
                                {exercise.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-400">
                                    {loggedSets.length}/{targetSets.length} sets
                                </span>
                                <div className="flex-1 max-w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                                {isExerciseComplete && (
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowExerciseInfo(true)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-20"
                                    >
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onSwapExercise();
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-lg flex items-center gap-2"
                                        >
                                            <Repeat className="w-4 h-4" />
                                            Swap Exercise
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Exercise GIF */}
                {exercise.gif_url && (
                    <div className="flex justify-center">
                        <div className="w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-gray-800">
                            <img
                                src={exercise.gif_url}
                                alt={exercise.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}

                {/* Rest Timer (if resting) */}
                <AnimatePresence>
                    {timer.isResting && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <RestTimer />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Set Logger — visible even during rest so user can prepare next set */}
                {!isExerciseComplete && (
                    <SetLogger
                        setNumber={nextSetNumber}
                        targetSet={currentTargetSet}
                        previousSet={previousSet}
                        weightUnit={weightUnit}
                        onLogSet={handleLogSet}
                        onShowIntensifier={onShowIntensifier}
                    />
                )}

                {/* Complete Exercise Button (when all sets done) */}
                {isExerciseComplete && !timer.isResting && exerciseIndex < totalExercises - 1 && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onNavigate('next')}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500
                                 text-white font-medium flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Exercise Complete - Next Exercise
                    </motion.button>
                )}

                {/* Finish Workout Button (last exercise, all sets done) */}
                {isExerciseComplete && !timer.isResting && exerciseIndex === totalExercises - 1 && onFinishWorkout && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={onFinishWorkout}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500
                                 text-white font-bold flex items-center justify-center gap-2
                                 shadow-lg shadow-cyan-500/20"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Finish Workout
                    </motion.button>
                )}

                {/* Logged Sets History */}
                {loggedSets.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-400">Completed Sets</h3>
                        {loggedSets.map((set, index) => (
                            <SetCard
                                key={index}
                                setNumber={set.set_number}
                                loggedSet={set}
                                targetSet={targetSets[index]}
                                isCompleted={true}
                                isPR={prsForExercise.includes(`set-${index}`)}
                                onEdit={() => {/* TODO: Edit modal */}}
                                onDelete={() => onRemoveSet(index)}
                                compact
                            />
                        ))}
                    </div>
                )}

                {/* Notes Section */}
                <div className="pt-4 border-t border-gray-800">
                    <ExerciseNotes
                        notes={exerciseNotes}
                        onSave={onSaveNotes}
                    />
                </div>
            </div>

            {/* Exercise Info Modal */}
            <AnimatePresence>
                {showExerciseInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowExerciseInfo(false)}
                    >
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg max-h-[80vh] bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
                            </div>

                            <div className="p-4 overflow-y-auto">
                                {exercise.gif_url && (
                                    <div className="mb-4 rounded-xl overflow-hidden">
                                        <img
                                            src={exercise.gif_url}
                                            alt={exercise.name}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-400 mb-1">Target Muscles</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {exercise.target_muscles.map((muscle) => (
                                                <span
                                                    key={muscle}
                                                    className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-sm"
                                                >
                                                    {muscle}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-400 mb-1">Secondary Muscles</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {exercise.secondary_muscles.map((muscle) => (
                                                    <span
                                                        key={muscle}
                                                        className="px-2 py-1 rounded bg-gray-800 text-gray-400 text-sm"
                                                    >
                                                        {muscle}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-400 mb-1">Equipment</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {exercise.equipments.map((equipment) => (
                                                <span
                                                    key={equipment}
                                                    className="px-2 py-1 rounded bg-gray-800 text-gray-400 text-sm"
                                                >
                                                    {equipment}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-800">
                                <button
                                    onClick={() => setShowExerciseInfo(false)}
                                    className="w-full py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ExerciseScreen;
