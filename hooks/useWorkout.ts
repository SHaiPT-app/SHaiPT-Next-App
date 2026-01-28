'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { syncManager } from '@/lib/syncManager';
import { db } from '@/lib/supabaseDb';
import type {
    EnhancedLoggedSet,
    WorkoutSession,
    SessionSet,
    WorkoutLog,
    ExerciseLog,
    Exercise,
} from '@/lib/types';

interface UseWorkoutOptions {
    userId: string;
    onPRDetected?: (exerciseId: string, prType: 'weight' | 'volume' | 'reps', value: number) => void;
}

export function useWorkout({ userId, onPRDetected }: UseWorkoutOptions) {
    const router = useRouter();
    const {
        workout,
        timer,
        startWorkout: storeStartWorkout,
        endWorkout: storeEndWorkout,
        logSet: storeLogSet,
        setExerciseRpe,
        setExerciseNotes,
        swapExercise: storeSwapExercise,
        nextExercise,
        previousExercise,
        setCurrentExercise,
        startRestTimer,
    } = useWorkoutStore();

    const { preferences } = useUserPreferencesStore();
    const { queueAction } = useOfflineStore();

    // Start a workout session
    const startWorkout = useCallback(async (
        session: WorkoutSession,
        exercises: Exercise[],
        assignmentId?: string,
    ) => {
        try {
            // Create workout log in database
            const workoutLog = await db.workoutLogs.create({
                user_id: userId,
                session_id: session.id,
                assignment_id: assignmentId,
                date: new Date().toISOString().split('T')[0],
                started_at: new Date().toISOString(),
            });

            // Create exercise logs for each exercise
            const exerciseLogs: ExerciseLog[] = [];
            for (let i = 0; i < session.exercises.length; i++) {
                const sessionExercise = session.exercises[i];
                const exerciseLog = await db.exerciseLogs.create({
                    workout_log_id: workoutLog.id,
                    exercise_id: sessionExercise.exercise_id,
                    exercise_order: i,
                    sets: [],
                });
                exerciseLogs.push(exerciseLog);
            }

            // Map exercises with their data
            const exercisesWithData = session.exercises.map((se, index) => {
                const exercise = exercises.find(e => e.exercise_id === se.exercise_id);
                return {
                    exerciseLogId: exerciseLogs[index].id,
                    exerciseId: se.exercise_id,
                    exerciseName: exercise?.name || 'Unknown Exercise',
                    gifUrl: exercise?.gif_url,
                    targetSets: se.sets,
                };
            });

            // Update store
            storeStartWorkout({
                workoutLogId: workoutLog.id,
                sessionId: session.id,
                sessionName: session.name,
                exercises: exercisesWithData,
            });

            // Navigate to workout page
            router.push(`/workout/${session.id}`);

            return workoutLog.id;
        } catch (error) {
            console.error('Failed to start workout:', error);
            throw error;
        }
    }, [userId, storeStartWorkout, router]);

    // Log a set
    const logSet = useCallback(async (
        exerciseIndex: number,
        setData: Omit<EnhancedLoggedSet, 'set_number' | 'started_at' | 'completed_at'>,
    ) => {
        const exercise = workout.exercises[exerciseIndex];
        if (!exercise || !workout.workoutLogId) return;

        const fullSet: EnhancedLoggedSet = {
            ...setData,
            set_number: exercise.loggedSets.length + 1,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        };

        // Update local store
        storeLogSet(exerciseIndex, fullSet);

        // Queue for sync
        queueAction('log_set', {
            logId: workout.workoutLogId,
            exerciseLogId: exercise.exerciseLogId,
            setData: fullSet,
        });

        // Also update database directly if online
        try {
            await db.exerciseLogs.addSet(exercise.exerciseLogId, fullSet);

            // Check for PR
            await checkForPR(exercise.exerciseId, fullSet.weight, fullSet.reps, setData.weight_unit);
        } catch (error) {
            console.log('Set will be synced later:', error);
        }

        // Auto-start rest timer if enabled
        if (preferences?.rest_timer_auto_start) {
            const targetSet = exercise.targetSets[exercise.loggedSets.length - 1];
            const restSeconds = targetSet?.rest_seconds || preferences.default_rest_seconds || 90;
            startRestTimer(restSeconds);
        }
    }, [workout, storeLogSet, queueAction, preferences, startRestTimer]);

    // Check for PR
    const checkForPR = useCallback(async (
        exerciseId: string,
        weight: number,
        reps: number,
        weightUnit: 'lbs' | 'kg',
    ) => {
        try {
            const existingPRs = await db.personalRecords.getByExercise(userId, exerciseId);
            const currentPR = existingPRs.find(pr => pr.is_current);

            // Convert to consistent unit (kg) for comparison if needed
            const weightInKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;
            const volume = weight * reps;

            let newPR = false;
            let prType: 'weight' | 'volume' | 'reps' | null = null;

            if (!currentPR) {
                // First PR for this exercise
                await db.personalRecords.create({
                    user_id: userId,
                    exercise_id: exerciseId,
                    max_weight: weight,
                    max_volume: volume,
                    max_reps: reps,
                    max_reps_weight: weight,
                    achieved_at: new Date().toISOString(),
                    workout_log_id: workout.workoutLogId || undefined,
                    is_current: true,
                });
                newPR = true;
                prType = 'weight';
            } else {
                // Check if this beats existing PRs
                if (weight > (currentPR.max_weight || 0)) {
                    // Mark old as not current
                    await db.personalRecords.update(currentPR.id, { is_current: false });
                    // Create new PR
                    await db.personalRecords.create({
                        user_id: userId,
                        exercise_id: exerciseId,
                        max_weight: weight,
                        max_volume: Math.max(volume, currentPR.max_volume || 0),
                        max_reps: Math.max(reps, currentPR.max_reps || 0),
                        max_reps_weight: weight,
                        achieved_at: new Date().toISOString(),
                        workout_log_id: workout.workoutLogId || undefined,
                        is_current: true,
                    });
                    newPR = true;
                    prType = 'weight';
                } else if (volume > (currentPR.max_volume || 0)) {
                    await db.personalRecords.update(currentPR.id, {
                        max_volume: volume,
                        achieved_at: new Date().toISOString(),
                    });
                    newPR = true;
                    prType = 'volume';
                }
            }

            if (newPR && prType && onPRDetected) {
                onPRDetected(exerciseId, prType, prType === 'weight' ? weight : volume);
            }
        } catch (error) {
            console.error('Failed to check PR:', error);
        }
    }, [userId, workout.workoutLogId, onPRDetected]);

    // Swap exercise
    const swapExercise = useCallback(async (
        exerciseIndex: number,
        newExercise: Exercise,
        newTargetSets: SessionSet[],
    ) => {
        const currentExercise = workout.exercises[exerciseIndex];
        if (!currentExercise || !workout.workoutLogId) return;

        try {
            // Update database
            await db.exerciseLogs.update(currentExercise.exerciseLogId, {
                exercise_id: newExercise.exercise_id,
                sets: [], // Reset sets for new exercise
            });

            // Update store
            storeSwapExercise(exerciseIndex, {
                exerciseLogId: currentExercise.exerciseLogId,
                exerciseId: newExercise.exercise_id,
                exerciseName: newExercise.name,
                gifUrl: newExercise.gif_url,
                targetSets: newTargetSets,
            });

            // Queue for sync
            queueAction('swap_exercise', {
                logId: workout.workoutLogId,
                exerciseLogId: currentExercise.exerciseLogId,
                newExerciseId: newExercise.exercise_id,
            });
        } catch (error) {
            console.error('Failed to swap exercise:', error);
            throw error;
        }
    }, [workout, storeSwapExercise, queueAction]);

    // Complete workout
    const completeWorkout = useCallback(async () => {
        if (!workout.workoutLogId) return null;

        try {
            const finishedAt = new Date().toISOString();

            // Calculate totals
            let totalSets = 0;
            let totalReps = 0;
            let totalVolume = 0;
            let totalRpe = 0;
            let rpeCount = 0;

            for (const exercise of workout.exercises) {
                totalSets += exercise.loggedSets.length;
                for (const set of exercise.loggedSets) {
                    totalReps += set.reps;
                    totalVolume += set.weight * set.reps;
                    if (set.rpe) {
                        totalRpe += set.rpe;
                        rpeCount++;
                    }
                }
                if (exercise.rpe) {
                    totalRpe += exercise.rpe;
                    rpeCount++;
                }
            }

            const averageRpe = rpeCount > 0 ? totalRpe / rpeCount : undefined;

            // Update workout log
            const updatedLog = await db.workoutLogs.update(workout.workoutLogId, {
                finished_at: finishedAt,
                completed_at: finishedAt,
            });

            // Queue for sync
            queueAction('complete_workout', {
                logId: workout.workoutLogId,
                finishedAt,
            });

            // Clear draft
            await syncManager.deleteDraft(userId, workout.sessionId!);

            // End workout in store
            storeEndWorkout();

            return {
                workoutLogId: workout.workoutLogId,
                sessionName: workout.sessionName || 'Workout',
                totalDurationSeconds: updatedLog.total_duration_seconds || 0,
                totalRestSeconds: 0, // TODO: Calculate from sets
                totalWorkSeconds: 0,
                totalSets,
                totalReps,
                totalVolume,
                volumeUnit: 'lbs', // TODO: Get from user profile preferences
                exerciseCount: workout.exercises.length,
                prsAchieved: [], // TODO: Collect PRs from session
                averageRpe,
                completedAt: finishedAt,
            };
        } catch (error) {
            console.error('Failed to complete workout:', error);
            throw error;
        }
    }, [workout, storeEndWorkout, queueAction, userId, preferences]);

    // Auto-save draft periodically
    useEffect(() => {
        if (!workout.isActive || !workout.sessionId) return;

        const saveInterval = setInterval(async () => {
            try {
                await syncManager.saveDraft(userId, workout.sessionId!, {
                    session_id: workout.sessionId!,
                    session_name: workout.sessionName || '',
                    started_at: workout.startedAt!,
                    current_exercise_index: workout.currentExerciseIndex,
                    exercises: workout.exercises.map(e => ({
                        exercise_id: e.exerciseId,
                        exercise_name: e.exerciseName,
                        logged_sets: e.loggedSets,
                        target_sets: e.targetSets,
                        rpe: e.rpe,
                        notes: e.notes,
                    })),
                });
            } catch (error) {
                console.log('Auto-save failed:', error);
            }
        }, 30000); // Save every 30 seconds

        return () => clearInterval(saveInterval);
    }, [workout, userId]);

    return {
        workout,
        timer,
        isActive: workout.isActive,
        currentExercise: workout.exercises[workout.currentExerciseIndex],
        startWorkout,
        logSet,
        swapExercise,
        completeWorkout,
        nextExercise,
        previousExercise,
        setCurrentExercise,
        setExerciseRpe,
        setExerciseNotes,
    };
}

export default useWorkout;
