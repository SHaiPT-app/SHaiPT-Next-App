import {
    detectMissedWorkouts,
    detectPerformancePlateaus,
    detectFormIssues,
    getClientAlerts,
    type FormIssueEntry,
} from '@/lib/aiClientAlerts';
import type { WorkoutLog, ExerciseLog } from '@/lib/types';

const CLIENT_ID = 'client-123';

function makeWorkoutLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
    return {
        id: 'wl-1',
        user_id: CLIENT_ID,
        date: '2025-01-20',
        ...overrides,
    };
}

interface ExerciseLogWithDate extends ExerciseLog {
    workout_date: string;
}

function makeExerciseLog(overrides: Partial<ExerciseLogWithDate> = {}): ExerciseLogWithDate {
    return {
        id: 'el-1',
        workout_log_id: 'wl-1',
        exercise_id: 'bench-press',
        exercise_order: 1,
        sets: [],
        total_sets: 3,
        total_reps: 24,
        max_weight: 100,
        workout_date: '2025-01-20',
        ...overrides,
    };
}

describe('detectMissedWorkouts', () => {
    const now = new Date('2025-01-27T12:00:00Z');

    it('returns alert when no workout logs exist', () => {
        const result = detectMissedWorkouts(CLIENT_ID, [], now);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('missed_workouts');
        expect(result!.severity).toBe('warning');
        expect(result!.message).toBe('This client has no workout history.');
    });

    it('returns null when last workout was recent (within 3 days)', () => {
        const logs = [makeWorkoutLog({ date: '2025-01-25' })];
        const result = detectMissedWorkouts(CLIENT_ID, logs, now);
        expect(result).toBeNull();
    });

    it('returns warning when last workout was 3-6 days ago', () => {
        const logs = [makeWorkoutLog({ date: '2025-01-23' })];
        const result = detectMissedWorkouts(CLIENT_ID, logs, now);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('missed_workouts');
        expect(result!.severity).toBe('warning');
        expect(result!.message).toContain('4 days');
    });

    it('returns critical when last workout was 7+ days ago', () => {
        const logs = [makeWorkoutLog({ date: '2025-01-18' })];
        const result = detectMissedWorkouts(CLIENT_ID, logs, now);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe('critical');
        expect(result!.message).toContain('9 days');
    });

    it('uses the most recent workout date when multiple logs exist', () => {
        const logs = [
            makeWorkoutLog({ id: 'wl-1', date: '2025-01-10' }),
            makeWorkoutLog({ id: 'wl-2', date: '2025-01-26' }),
            makeWorkoutLog({ id: 'wl-3', date: '2025-01-15' }),
        ];
        const result = detectMissedWorkouts(CLIENT_ID, logs, now);
        expect(result).toBeNull();
    });
});

describe('detectPerformancePlateaus', () => {
    const now = new Date('2025-01-27T12:00:00Z');

    it('returns null when no exercise logs exist', () => {
        const result = detectPerformancePlateaus(CLIENT_ID, [], now);
        expect(result).toBeNull();
    });

    it('returns null when exercise has only one log', () => {
        const logs = [makeExerciseLog()];
        const result = detectPerformancePlateaus(CLIENT_ID, logs, now);
        expect(result).toBeNull();
    });

    it('detects plateau when no weight/rep increase over 2 weeks', () => {
        const logs: ExerciseLogWithDate[] = [
            makeExerciseLog({
                id: 'el-1',
                workout_date: '2025-01-05',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-2',
                workout_date: '2025-01-10',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-3',
                workout_date: '2025-01-18',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-4',
                workout_date: '2025-01-25',
                max_weight: 100,
                total_reps: 24,
            }),
        ];
        const result = detectPerformancePlateaus(CLIENT_ID, logs, now);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('performance_plateau');
        expect(result!.message).toContain('1 exercise');
    });

    it('returns null when weight increased within the window', () => {
        const logs: ExerciseLogWithDate[] = [
            makeExerciseLog({
                id: 'el-1',
                workout_date: '2025-01-05',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-2',
                workout_date: '2025-01-20',
                max_weight: 110,
                total_reps: 24,
            }),
        ];
        const result = detectPerformancePlateaus(CLIENT_ID, logs, now);
        expect(result).toBeNull();
    });

    it('returns null when reps increased within the window', () => {
        const logs: ExerciseLogWithDate[] = [
            makeExerciseLog({
                id: 'el-1',
                workout_date: '2025-01-05',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-2',
                workout_date: '2025-01-20',
                max_weight: 100,
                total_reps: 30,
            }),
        ];
        const result = detectPerformancePlateaus(CLIENT_ID, logs, now);
        expect(result).toBeNull();
    });

    it('returns critical when 3+ exercises are plateauing', () => {
        const logs: ExerciseLogWithDate[] = [];
        const exercises = ['bench-press', 'squat', 'deadlift'];
        for (const exerciseId of exercises) {
            logs.push(
                makeExerciseLog({
                    id: `el-old-${exerciseId}`,
                    exercise_id: exerciseId,
                    workout_date: '2025-01-05',
                    max_weight: 100,
                    total_reps: 24,
                }),
                makeExerciseLog({
                    id: `el-new-${exerciseId}`,
                    exercise_id: exerciseId,
                    workout_date: '2025-01-20',
                    max_weight: 100,
                    total_reps: 24,
                }),
            );
        }
        const result = detectPerformancePlateaus(CLIENT_ID, logs, now);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe('critical');
        expect(result!.message).toContain('3 exercises');
    });
});

describe('detectFormIssues', () => {
    const now = new Date('2025-01-27T12:00:00Z');

    it('returns null when no form issues exist', () => {
        const result = detectFormIssues(CLIENT_ID, [], now);
        expect(result).toBeNull();
    });

    it('returns null when form issues are older than 7 days', () => {
        const issues: FormIssueEntry[] = [{
            exercise_id: 'squat',
            exercise_name: 'Barbell Squat',
            issue: 'Knees caving in',
            detected_at: '2025-01-15T10:00:00Z',
        }];
        const result = detectFormIssues(CLIENT_ID, issues, now);
        expect(result).toBeNull();
    });

    it('returns warning for recent form issues', () => {
        const issues: FormIssueEntry[] = [{
            exercise_id: 'squat',
            exercise_name: 'Barbell Squat',
            issue: 'Knees caving in',
            detected_at: '2025-01-25T10:00:00Z',
        }];
        const result = detectFormIssues(CLIENT_ID, issues, now);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('form_issues');
        expect(result!.severity).toBe('warning');
        expect(result!.message).toContain('Barbell Squat');
    });

    it('returns critical when 3+ form issues are detected', () => {
        const issues: FormIssueEntry[] = [
            {
                exercise_id: 'squat',
                exercise_name: 'Barbell Squat',
                issue: 'Knees caving in',
                detected_at: '2025-01-25T10:00:00Z',
            },
            {
                exercise_id: 'bench',
                exercise_name: 'Bench Press',
                issue: 'Elbows flaring',
                detected_at: '2025-01-25T11:00:00Z',
            },
            {
                exercise_id: 'deadlift',
                exercise_name: 'Deadlift',
                issue: 'Rounded back',
                detected_at: '2025-01-26T10:00:00Z',
            },
        ];
        const result = detectFormIssues(CLIENT_ID, issues, now);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe('critical');
    });
});

describe('getClientAlerts', () => {
    const now = new Date('2025-01-27T12:00:00Z');

    it('returns empty array when no issues are detected', () => {
        const workoutLogs = [makeWorkoutLog({ date: '2025-01-26' })];
        const result = getClientAlerts(CLIENT_ID, workoutLogs, [], [], now);
        expect(result).toEqual([]);
    });

    it('aggregates multiple alert types', () => {
        const workoutLogs: WorkoutLog[] = []; // no workouts = missed workout alert
        const formIssues: FormIssueEntry[] = [{
            exercise_id: 'squat',
            exercise_name: 'Barbell Squat',
            issue: 'Knees caving in',
            detected_at: '2025-01-25T10:00:00Z',
        }];

        const result = getClientAlerts(CLIENT_ID, workoutLogs, [], formIssues, now);
        expect(result.length).toBe(2);

        const types = result.map(a => a.type);
        expect(types).toContain('missed_workouts');
        expect(types).toContain('form_issues');
    });

    it('includes all three alert types when all conditions are met', () => {
        // No workouts -> missed workouts alert
        const workoutLogs: WorkoutLog[] = [];

        // Plateau exercise logs - need logs both before and within window
        const exerciseLogs: ExerciseLogWithDate[] = [
            makeExerciseLog({
                id: 'el-1',
                workout_date: '2025-01-05',
                max_weight: 100,
                total_reps: 24,
            }),
            makeExerciseLog({
                id: 'el-2',
                workout_date: '2025-01-20',
                max_weight: 100,
                total_reps: 24,
            }),
        ];

        const formIssues: FormIssueEntry[] = [{
            exercise_id: 'squat',
            exercise_name: 'Barbell Squat',
            issue: 'Knees caving in',
            detected_at: '2025-01-25T10:00:00Z',
        }];

        const result = getClientAlerts(CLIENT_ID, workoutLogs, exerciseLogs, formIssues, now);
        expect(result.length).toBe(3);

        const types = result.map(a => a.type);
        expect(types).toContain('missed_workouts');
        expect(types).toContain('performance_plateau');
        expect(types).toContain('form_issues');
    });

    it('sets clientId on all alerts', () => {
        const result = getClientAlerts(CLIENT_ID, [], [], [], now);
        for (const alert of result) {
            expect(alert.clientId).toBe(CLIENT_ID);
        }
    });
});
