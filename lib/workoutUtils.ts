import type {
    EnhancedLoggedSet,
    WorkoutSession,
    SessionExercise,
    SessionSet,
    WorkoutSummaryData,
    TrainingPlanAssignment,
    TrainingPlanSession,
} from './types';

// Calculate total workout duration from timestamps
export function calculateDuration(startedAt: string, finishedAt: string): number {
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    return Math.floor((end - start) / 1000);
}

// Format duration as human-readable string
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

// Format duration as MM:SS for timer display
export function formatTimerDisplay(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Calculate total volume from logged sets
export function calculateTotalVolume(sets: EnhancedLoggedSet[]): number {
    return sets.reduce((total, set) => {
        if (set.set_type === 'warmup') return total;
        let volume = set.weight * set.reps;

        // Add drop set volume
        if (set.drops) {
            volume += set.drops.reduce((dropTotal, drop) => dropTotal + drop.weight * drop.reps, 0);
        }

        return total + volume;
    }, 0);
}

// Calculate total reps from logged sets
export function calculateTotalReps(sets: EnhancedLoggedSet[]): number {
    return sets.reduce((total, set) => {
        if (set.set_type === 'warmup') return total;
        let reps = set.reps;

        // Add drop set reps
        if (set.drops) {
            reps += set.drops.reduce((dropTotal, drop) => dropTotal + drop.reps, 0);
        }

        return total + reps;
    }, 0);
}

// Calculate total working sets (excluding warmups)
export function calculateWorkingSets(sets: EnhancedLoggedSet[]): number {
    return sets.filter(set => set.set_type !== 'warmup').length;
}

// Calculate average RPE from sets
export function calculateAverageRPE(sets: EnhancedLoggedSet[]): number | undefined {
    const setsWithRPE = sets.filter(set => set.rpe !== undefined && set.rpe > 0);
    if (setsWithRPE.length === 0) return undefined;

    const totalRPE = setsWithRPE.reduce((total, set) => total + (set.rpe || 0), 0);
    return Math.round((totalRPE / setsWithRPE.length) * 10) / 10;
}

// Calculate total rest time from sets
export function calculateTotalRestTime(sets: EnhancedLoggedSet[]): number {
    return sets.reduce((total, set) => total + (set.actual_rest_seconds || 0), 0);
}

// Get today's workout from active assignment
export function getTodaysWorkout(
    assignment: TrainingPlanAssignment,
    planSessions: TrainingPlanSession[],
): TrainingPlanSession | null {
    const today = new Date();
    const startDate = new Date(assignment.start_date);
    const diffTime = today.getTime() - startDate.getTime();
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return planSessions.find(ps => ps.day_number === dayNumber) || null;
}

// Calculate which day of the plan we're on
export function getPlanDayNumber(assignmentStartDate: string): number {
    const today = new Date();
    const startDate = new Date(assignmentStartDate);
    const diffTime = today.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Check if a date is within the plan period
export function isDateInPlanPeriod(
    date: Date,
    startDate: string,
    endDate: string,
): boolean {
    const checkDate = date.getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return checkDate >= start && checkDate <= end;
}

// Generate workout summary from logged data
export function generateWorkoutSummary(
    workoutLogId: string,
    sessionName: string,
    startedAt: string,
    finishedAt: string,
    exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        loggedSets: EnhancedLoggedSet[];
    }>,
    prsAchieved: any[],
    volumeUnit: 'lbs' | 'kg',
): WorkoutSummaryData {
    const totalDurationSeconds = calculateDuration(startedAt, finishedAt);
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let totalRestSeconds = 0;
    let totalRpeSum = 0;
    let rpeCount = 0;

    for (const exercise of exercises) {
        const workingSets = calculateWorkingSets(exercise.loggedSets);
        totalSets += workingSets;
        totalReps += calculateTotalReps(exercise.loggedSets);
        totalVolume += calculateTotalVolume(exercise.loggedSets);
        totalRestSeconds += calculateTotalRestTime(exercise.loggedSets);

        for (const set of exercise.loggedSets) {
            if (set.rpe) {
                totalRpeSum += set.rpe;
                rpeCount++;
            }
        }
    }

    return {
        workoutLogId,
        sessionName,
        totalDurationSeconds,
        totalRestSeconds,
        totalWorkSeconds: totalDurationSeconds - totalRestSeconds,
        totalSets,
        totalReps,
        totalVolume: Math.round(totalVolume),
        volumeUnit,
        exerciseCount: exercises.length,
        prsAchieved,
        averageRpe: rpeCount > 0 ? Math.round((totalRpeSum / rpeCount) * 10) / 10 : undefined,
        completedAt: finishedAt,
    };
}

// Parse target sets from session exercise
export function parseTargetSets(sessionExercise: SessionExercise): SessionSet[] {
    return sessionExercise.sets || [];
}

// Get suggested weight for next set based on history
export function getSuggestedWeight(
    previousSets: EnhancedLoggedSet[],
    targetSet: SessionSet | undefined,
): number {
    // If we have previous sets in this workout, use the last one
    if (previousSets.length > 0) {
        return previousSets[previousSets.length - 1].weight;
    }

    // Otherwise, try to parse from target
    if (targetSet?.weight) {
        const parsed = parseFloat(targetSet.weight);
        if (!isNaN(parsed)) return parsed;
    }

    return 0;
}

// Get suggested reps for next set based on history
export function getSuggestedReps(
    previousSets: EnhancedLoggedSet[],
    targetSet: SessionSet | undefined,
): number {
    // If we have previous sets, use the last one
    if (previousSets.length > 0) {
        return previousSets[previousSets.length - 1].reps;
    }

    // Otherwise, try to parse from target
    if (targetSet?.reps) {
        // Handle ranges like "8-12" by taking the middle
        if (targetSet.reps.includes('-')) {
            const [min, max] = targetSet.reps.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(min) && !isNaN(max)) {
                return Math.floor((min + max) / 2);
            }
        }

        const parsed = parseInt(targetSet.reps);
        if (!isNaN(parsed)) return parsed;
    }

    return 10; // Default
}

// Validate set data before logging
export function validateSetData(
    weight: number,
    reps: number,
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (weight < 0) {
        errors.push('Weight cannot be negative');
    }

    if (reps <= 0) {
        errors.push('Reps must be at least 1');
    }

    if (reps > 100) {
        errors.push('Reps seems unrealistic (max 100)');
    }

    if (weight > 1000) {
        errors.push('Weight seems unrealistic');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export default {
    calculateDuration,
    formatDuration,
    formatTimerDisplay,
    calculateTotalVolume,
    calculateTotalReps,
    calculateWorkingSets,
    calculateAverageRPE,
    calculateTotalRestTime,
    getTodaysWorkout,
    getPlanDayNumber,
    isDateInPlanPeriod,
    generateWorkoutSummary,
    parseTargetSets,
    getSuggestedWeight,
    getSuggestedReps,
    validateSetData,
};
