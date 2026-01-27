import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanExercisesData(exercises: any[]): any[] {
  return exercises.map((exercise) => {
    const cleaned: any = {
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set: any) => {
        const cleanedSet: any = {
          targetReps: set.targetReps,
          targetWeight: set.targetWeight || '',
        };
        if (set.actualReps) cleanedSet.actualReps = set.actualReps;
        if (set.actualWeight) cleanedSet.actualWeight = set.actualWeight;
        if (set.pr !== undefined) cleanedSet.pr = set.pr;
        return cleanedSet;
      }),
    };

    // Only include optionals if they exist and are not empty
    if (exercise.exercise_id) cleaned.exercise_id = exercise.exercise_id;
    if (exercise.gif_url) cleaned.gif_url = exercise.gif_url;
    if (exercise.notes) cleaned.notes = exercise.notes;

    return cleaned;
  });
}
