import { PlanExercise } from './types';

export const cleanExercisesData = (exercises: PlanExercise[]) => {
    return exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name || '',
        exercise_id: exercise.exercise_id || undefined,
        gif_url: exercise.gif_url || undefined,
        notes: exercise.notes || undefined,
        sets: exercise.sets.map(set => {
            const cleanedSet: any = {
                targetReps: set.targetReps || '10',
                targetWeight: set.targetWeight || '',
                actualReps: set.actualReps || undefined,
                actualWeight: set.actualWeight || undefined,
                pr: set.pr || false
            };
            // Remove undefined values from set object
            Object.keys(cleanedSet).forEach(key => {
                if (cleanedSet[key] === undefined) {
                    delete cleanedSet[key];
                }
            });
            return cleanedSet;
        })
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
};
