/**
 * The exercise library: free-exercise-db rows in the `exercises` table, and the link from a
 * library exercise to the 4Dcoach form check.
 *
 * Shared by scripts/seed-exercises.ts (writes) and the app (reads), so keep it dependency-free.
 */

/** free-exercise-db serves its images from the repo; paths in `exercises.images` are relative. */
export const EXERCISE_IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function exerciseImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${EXERCISE_IMAGE_BASE}${path}`;
}

/** The 4Dcoach exercises (4Dcoach/app/src/live.ts). */
export type FourDExercise =
  | 'bench' | 'squat' | 'deadlift' | 'lateral-raise' | 'curl'
  | 'bw-squat' | 'pushup' | 'crunch' | 'plank' | 'pullup' | 'hip-thrust';

export const FOURD_LABELS: Record<FourDExercise, string> = {
  bench: 'Bench press',
  squat: 'Barbell squat',
  deadlift: 'Deadlift',
  'lateral-raise': 'Lateral raise',
  curl: 'Biceps curl',
  'bw-squat': 'Bodyweight squat',
  pushup: 'Push-up',
  crunch: 'Crunch',
  plank: 'Plank',
  pullup: 'Pull-up',
  'hip-thrust': 'Hip thrust',
};

/**
 * free-exercise-db ids that map onto each 4Dcoach exercise. The first id of each list is the
 * canonical one (`is_fourd_primary`), the one a generated plan should pick when it wants the
 * exercise the 4D coach models.
 */
export const FOURD_EXERCISE_MAP: Record<FourDExercise, string[]> = {
  bench: [
    'Barbell_Bench_Press_-_Medium_Grip',
    'Bench_Press_-_Powerlifting',
    'Close-Grip_Barbell_Bench_Press',
    'Barbell_Incline_Bench_Press_-_Medium_Grip',
    'Decline_Barbell_Bench_Press',
    'Dumbbell_Bench_Press',
  ],
  squat: ['Barbell_Squat', 'Barbell_Full_Squat', 'Front_Barbell_Squat'],
  deadlift: ['Barbell_Deadlift', 'Sumo_Deadlift', 'Romanian_Deadlift', 'Deficit_Deadlift'],
  'lateral-raise': ['Side_Lateral_Raise', 'Seated_Side_Lateral_Raise'],
  curl: ['Dumbbell_Bicep_Curl', 'Barbell_Curl', 'Dumbbell_Alternate_Bicep_Curl', 'Seated_Dumbbell_Curl', 'Hammer_Curls'],
  'bw-squat': ['Bodyweight_Squat'],
  pushup: ['Pushups', 'Push-Up_Wide', 'Push-Ups_-_Close_Triceps_Position', 'Pushups_Close_and_Wide_Hand_Positions', 'Incline_Push-Up'],
  crunch: ['Crunches', 'Crunch_-_Hands_Overhead', 'Decline_Crunch'],
  plank: ['Plank'],
  pullup: ['Pullups', 'Chin-Up', 'V-Bar_Pullup', 'Wide-Grip_Rear_Pull-Up'],
  'hip-thrust': ['Barbell_Hip_Thrust', 'Barbell_Glute_Bridge'],
};

/** URL of the 4Dcoach live coach for one exercise, given the 4Dcoach base URL. */
export function fourDcoachExerciseUrl(base: string, fourdId: string): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}#live=${encodeURIComponent(fourdId)}`;
}

export function exerciseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BODY_PART_BY_MUSCLE: Record<string, string> = {
  abdominals: 'core',
  'lower back': 'back',
  'middle back': 'back',
  lats: 'back',
  traps: 'back',
  chest: 'chest',
  shoulders: 'shoulders',
  neck: 'neck',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
};

export function bodyPartsFor(primaryMuscles: string[]): string[] {
  const parts = new Set<string>();
  for (const m of primaryMuscles) parts.add(BODY_PART_BY_MUSCLE[m] ?? 'other');
  return [...parts];
}

/** Equipment strings used by free-exercise-db, grouped by where a person trains. */
export const HOME_EQUIPMENT = ['body only', 'dumbbell', 'bands', 'kettlebells', 'exercise ball', 'foam roll', 'medicine ball', 'other'];
export const GYM_EQUIPMENT = [...HOME_EQUIPMENT, 'barbell', 'cable', 'machine', 'e-z curl bar'];
