import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    ActiveWorkoutState,
    RestTimerState,
    WorkoutUIState,
    EnhancedLoggedSet,
    IntensifierType,
    SessionSet,
} from '@/lib/types';

interface WorkoutStore {
    // Active workout state
    workout: ActiveWorkoutState;

    // Rest timer state
    timer: RestTimerState;

    // UI state
    ui: WorkoutUIState;

    // Workout actions
    startWorkout: (params: {
        workoutLogId: string;
        sessionId: string;
        sessionName: string;
        exercises: Array<{
            exerciseLogId: string;
            exerciseId: string;
            exerciseName: string;
            gifUrl?: string;
            targetSets: SessionSet[];
        }>;
    }) => void;

    endWorkout: () => void;

    setCurrentExercise: (index: number) => void;
    nextExercise: () => void;
    previousExercise: () => void;

    logSet: (exerciseIndex: number, set: EnhancedLoggedSet) => void;
    updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<EnhancedLoggedSet>) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;

    addExtraSet: (exerciseIndex: number) => void;

    setExerciseRpe: (exerciseIndex: number, rpe: number) => void;
    setExerciseNotes: (exerciseIndex: number, notes: string) => void;

    swapExercise: (exerciseIndex: number, newExercise: {
        exerciseLogId: string;
        exerciseId: string;
        exerciseName: string;
        gifUrl?: string;
        targetSets: SessionSet[];
    }) => void;

    // Timer actions
    startRestTimer: (seconds: number) => void;
    pauseRestTimer: () => void;
    resumeRestTimer: () => void;
    skipRestTimer: () => void;
    tickRestTimer: () => void;
    setAutoStartTimer: (autoStart: boolean) => void;

    // UI actions
    toggleFormChecker: () => void;
    setFormCheckerVisible: (visible: boolean) => void;
    setIsRecording: (recording: boolean) => void;
    showIntensifierModal: (intensifier: IntensifierType) => void;
    hideIntensifierModal: () => void;

    // Utility
    resetStore: () => void;
}

const initialWorkoutState: ActiveWorkoutState = {
    workoutLogId: null,
    sessionId: null,
    sessionName: null,
    startedAt: null,
    currentExerciseIndex: 0,
    exercises: [],
    isActive: false,
};

const initialTimerState: RestTimerState = {
    isResting: false,
    totalRestSeconds: 90,
    restSecondsRemaining: 0,
    restStartedAt: null,
    autoStart: true,
};

const initialUIState: WorkoutUIState = {
    formCheckerVisible: false,
    isRecording: false,
    showIntensifierModal: false,
    selectedIntensifier: 'none',
};

export const useWorkoutStore = create<WorkoutStore>()(
    persist(
        (set, get) => ({
            workout: initialWorkoutState,
            timer: initialTimerState,
            ui: initialUIState,

            // Workout actions
            startWorkout: (params) => {
                set({
                    workout: {
                        workoutLogId: params.workoutLogId,
                        sessionId: params.sessionId,
                        sessionName: params.sessionName,
                        startedAt: new Date().toISOString(),
                        currentExerciseIndex: 0,
                        exercises: params.exercises.map(ex => ({
                            ...ex,
                            loggedSets: [],
                            rpe: undefined,
                            notes: undefined,
                        })),
                        isActive: true,
                    },
                });
            },

            endWorkout: () => {
                set({
                    workout: initialWorkoutState,
                    timer: initialTimerState,
                });
            },

            setCurrentExercise: (index) => {
                const { workout } = get();
                if (index >= 0 && index < workout.exercises.length) {
                    set({
                        workout: { ...workout, currentExerciseIndex: index },
                    });
                }
            },

            nextExercise: () => {
                const { workout } = get();
                if (workout.currentExerciseIndex < workout.exercises.length - 1) {
                    set({
                        workout: {
                            ...workout,
                            currentExerciseIndex: workout.currentExerciseIndex + 1,
                        },
                    });
                }
            },

            previousExercise: () => {
                const { workout } = get();
                if (workout.currentExerciseIndex > 0) {
                    set({
                        workout: {
                            ...workout,
                            currentExerciseIndex: workout.currentExerciseIndex - 1,
                        },
                    });
                }
            },

            logSet: (exerciseIndex, setData) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex]) {
                    exercises[exerciseIndex] = {
                        ...exercises[exerciseIndex],
                        loggedSets: [...exercises[exerciseIndex].loggedSets, setData],
                    };
                    set({ workout: { ...workout, exercises } });
                }
            },

            updateSet: (exerciseIndex, setIndex, updates) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex] && exercises[exerciseIndex].loggedSets[setIndex]) {
                    const loggedSets = [...exercises[exerciseIndex].loggedSets];
                    loggedSets[setIndex] = { ...loggedSets[setIndex], ...updates };
                    exercises[exerciseIndex] = { ...exercises[exerciseIndex], loggedSets };
                    set({ workout: { ...workout, exercises } });
                }
            },

            removeSet: (exerciseIndex, setIndex) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex]) {
                    const loggedSets = exercises[exerciseIndex].loggedSets.filter((_, i) => i !== setIndex);
                    // Re-number sets
                    loggedSets.forEach((s, i) => { s.set_number = i + 1; });
                    exercises[exerciseIndex] = { ...exercises[exerciseIndex], loggedSets };
                    set({ workout: { ...workout, exercises } });
                }
            },

            addExtraSet: (exerciseIndex) => {
                // This is a placeholder - actual set will be logged via logSet
                // This can be used to increment target count if needed
            },

            setExerciseRpe: (exerciseIndex, rpe) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex]) {
                    exercises[exerciseIndex] = { ...exercises[exerciseIndex], rpe };
                    set({ workout: { ...workout, exercises } });
                }
            },

            setExerciseNotes: (exerciseIndex, notes) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex]) {
                    exercises[exerciseIndex] = { ...exercises[exerciseIndex], notes };
                    set({ workout: { ...workout, exercises } });
                }
            },

            swapExercise: (exerciseIndex, newExercise) => {
                const { workout } = get();
                const exercises = [...workout.exercises];
                if (exercises[exerciseIndex]) {
                    exercises[exerciseIndex] = {
                        ...newExercise,
                        loggedSets: [], // Start fresh with new exercise
                        rpe: undefined,
                        notes: undefined,
                    };
                    set({ workout: { ...workout, exercises } });
                }
            },

            // Timer actions
            startRestTimer: (seconds) => {
                set({
                    timer: {
                        isResting: true,
                        totalRestSeconds: seconds,
                        restSecondsRemaining: seconds,
                        restStartedAt: new Date().toISOString(),
                        autoStart: get().timer.autoStart,
                    },
                });
            },

            pauseRestTimer: () => {
                set({
                    timer: { ...get().timer, isResting: false },
                });
            },

            resumeRestTimer: () => {
                set({
                    timer: { ...get().timer, isResting: true },
                });
            },

            skipRestTimer: () => {
                set({
                    timer: {
                        ...get().timer,
                        isResting: false,
                        restSecondsRemaining: 0,
                    },
                });
            },

            tickRestTimer: () => {
                const { timer } = get();
                if (timer.isResting && timer.restSecondsRemaining > 0) {
                    set({
                        timer: {
                            ...timer,
                            restSecondsRemaining: timer.restSecondsRemaining - 1,
                        },
                    });
                } else if (timer.isResting && timer.restSecondsRemaining <= 0) {
                    set({
                        timer: { ...timer, isResting: false },
                    });
                }
            },

            setAutoStartTimer: (autoStart) => {
                set({
                    timer: { ...get().timer, autoStart },
                });
            },

            // UI actions
            toggleFormChecker: () => {
                set({
                    ui: { ...get().ui, formCheckerVisible: !get().ui.formCheckerVisible },
                });
            },

            setFormCheckerVisible: (visible) => {
                set({
                    ui: { ...get().ui, formCheckerVisible: visible },
                });
            },

            setIsRecording: (recording) => {
                set({
                    ui: { ...get().ui, isRecording: recording },
                });
            },

            showIntensifierModal: (intensifier) => {
                set({
                    ui: { ...get().ui, showIntensifierModal: true, selectedIntensifier: intensifier },
                });
            },

            hideIntensifierModal: () => {
                set({
                    ui: { ...get().ui, showIntensifierModal: false },
                });
            },

            // Utility
            resetStore: () => {
                set({
                    workout: initialWorkoutState,
                    timer: initialTimerState,
                    ui: initialUIState,
                });
            },
        }),
        {
            name: 'shaipt-workout-store',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined') {
                    return localStorage;
                }
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                };
            }),
            partialize: (state) => ({
                workout: state.workout,
                timer: {
                    autoStart: state.timer.autoStart,
                    totalRestSeconds: state.timer.totalRestSeconds,
                },
            }),
        }
    )
);
