import type { EnhancedLoggedSet, PersonalRecord, PRCheckResult, WorkoutPRSummary } from './types';

// Weight conversion constants
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

// Convert weight to kilograms for consistent comparison
export function toKilograms(weight: number, unit: 'lbs' | 'kg'): number {
    return unit === 'lbs' ? weight * LBS_TO_KG : weight;
}

// Convert weight to pounds
export function toPounds(weight: number, unit: 'lbs' | 'kg'): number {
    return unit === 'kg' ? weight * KG_TO_LBS : weight;
}

// Calculate volume (weight × reps)
export function calculateVolume(weight: number, reps: number): number {
    return weight * reps;
}

// Calculate one-rep max estimate using Epley formula
export function estimateOneRepMax(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps <= 0) return 0;
    return weight * (1 + reps / 30);
}

// Check if a set beats an existing PR
export function checkSetAgainstPR(
    set: EnhancedLoggedSet,
    currentPR: PersonalRecord | null,
): PRCheckResult {
    const volume = calculateVolume(set.weight, set.reps);

    if (!currentPR) {
        // First ever PR for this exercise
        return {
            isNewPR: true,
            prType: 'weight',
            newValue: set.weight,
        };
    }

    // Check weight PR (same weight unit assumed for existing PR)
    if (set.weight > (currentPR.max_weight || 0)) {
        return {
            isNewPR: true,
            prType: 'weight',
            previousValue: currentPR.max_weight || 0,
            newValue: set.weight,
            improvement: set.weight - (currentPR.max_weight || 0),
        };
    }

    // Check volume PR
    if (volume > (currentPR.max_volume || 0)) {
        return {
            isNewPR: true,
            prType: 'volume',
            previousValue: currentPR.max_volume || 0,
            newValue: volume,
            improvement: volume - (currentPR.max_volume || 0),
        };
    }

    // Check reps PR at same or higher weight
    if (set.reps > (currentPR.max_reps || 0) && set.weight >= (currentPR.max_reps_weight || 0)) {
        return {
            isNewPR: true,
            prType: 'reps',
            previousValue: currentPR.max_reps || 0,
            newValue: set.reps,
            improvement: set.reps - (currentPR.max_reps || 0),
        };
    }

    return {
        isNewPR: false,
        prType: null,
    };
}

// Find all PRs from a workout's sets
export function findWorkoutPRs(
    exerciseSets: Array<{
        exerciseId: string;
        exerciseName: string;
        sets: EnhancedLoggedSet[];
    }>,
    existingPRs: Map<string, PersonalRecord>,
): WorkoutPRSummary[] {
    const prs: WorkoutPRSummary[] = [];

    for (const exercise of exerciseSets) {
        const currentPR = existingPRs.get(exercise.exerciseId);

        // Track the best values seen in this workout
        let bestWeight = 0;
        let bestVolume = 0;
        let bestReps = 0;
        let bestRepsWeight = 0;

        for (const set of exercise.sets) {
            if (set.set_type === 'warmup') continue;

            const volume = calculateVolume(set.weight, set.reps);

            if (set.weight > bestWeight) {
                bestWeight = set.weight;
            }

            if (volume > bestVolume) {
                bestVolume = volume;
            }

            if (set.reps > bestReps) {
                bestReps = set.reps;
                bestRepsWeight = set.weight;
            }
        }

        // Check for weight PR
        if (bestWeight > (currentPR?.max_weight || 0)) {
            prs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                prType: 'weight',
                previousValue: currentPR?.max_weight || 0,
                newValue: bestWeight,
            });
        }

        // Check for volume PR (only if no weight PR, to avoid duplicate celebrations)
        if (bestVolume > (currentPR?.max_volume || 0) && bestWeight <= (currentPR?.max_weight || 0)) {
            prs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                prType: 'volume',
                previousValue: currentPR?.max_volume || 0,
                newValue: bestVolume,
            });
        }

        // Check for reps PR (at same or higher weight)
        if (
            bestReps > (currentPR?.max_reps || 0) &&
            bestRepsWeight >= (currentPR?.max_reps_weight || 0) &&
            bestWeight <= (currentPR?.max_weight || 0) &&
            bestVolume <= (currentPR?.max_volume || 0)
        ) {
            prs.push({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                prType: 'reps',
                previousValue: currentPR?.max_reps || 0,
                newValue: bestReps,
            });
        }
    }

    return prs;
}

// Calculate improvement percentage
export function calculateImprovement(previousValue: number, newValue: number): number {
    if (previousValue === 0) return 100;
    return ((newValue - previousValue) / previousValue) * 100;
}

// Format PR for display
export function formatPRValue(value: number, type: 'weight' | 'volume' | 'reps', unit: 'lbs' | 'kg'): string {
    if (type === 'reps') {
        return `${value} reps`;
    }

    if (type === 'weight') {
        return `${value} ${unit}`;
    }

    // Volume
    return `${value.toLocaleString()} ${unit}`;
}

// Get a motivational message for a PR
export function getPRMessage(prType: 'weight' | 'volume' | 'reps', improvement: number): string {
    const messages = {
        weight: [
            'New weight PR! You\'re getting stronger!',
            'Heavyweight champion! You crushed it!',
            'New personal best! That weight didn\'t stand a chance!',
        ],
        volume: [
            'Volume PR! More work, more gains!',
            'You moved more weight than ever before!',
            'Massive volume PR! Keep stacking those plates!',
        ],
        reps: [
            'Rep PR! Your endurance is leveling up!',
            'More reps than ever! Unstoppable!',
            'New rep record! Your muscles are adapting!',
        ],
    };

    const typeMessages = messages[prType];
    const randomIndex = Math.floor(Math.random() * typeMessages.length);
    return typeMessages[randomIndex];
}

export default {
    toKilograms,
    toPounds,
    calculateVolume,
    estimateOneRepMax,
    checkSetAgainstPR,
    findWorkoutPRs,
    calculateImprovement,
    formatPRValue,
    getPRMessage,
};
