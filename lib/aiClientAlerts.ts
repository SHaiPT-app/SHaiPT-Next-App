import type { ClientAlert, ExerciseLog, WorkoutLog } from './types';

const MISSED_WORKOUT_THRESHOLD_DAYS = 3;
const PLATEAU_WINDOW_DAYS = 14;

/**
 * Detect missed workouts: client hasn't logged a workout in 3+ days.
 */
export function detectMissedWorkouts(
    clientId: string,
    workoutLogs: WorkoutLog[],
    now: Date = new Date()
): ClientAlert | null {
    if (workoutLogs.length === 0) {
        return {
            type: 'missed_workouts',
            severity: 'warning',
            title: 'No workouts logged',
            message: 'This client has no workout history.',
            clientId,
            detectedAt: now.toISOString(),
        };
    }

    const sortedLogs = [...workoutLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastWorkoutDate = new Date(sortedLogs[0].date + 'T00:00:00');
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const diffMs = todayStart.getTime() - lastWorkoutDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= MISSED_WORKOUT_THRESHOLD_DAYS) {
        const severity = diffDays >= 7 ? 'critical' : 'warning';
        return {
            type: 'missed_workouts',
            severity,
            title: 'Missed workouts',
            message: `No workout logged in ${diffDays} days.`,
            clientId,
            detectedAt: now.toISOString(),
        };
    }

    return null;
}

interface ExerciseLogWithDate extends ExerciseLog {
    workout_date: string;
}

/**
 * Detect performance plateaus: no weight or rep increase for any exercise
 * over the past 2 weeks.
 */
export function detectPerformancePlateaus(
    clientId: string,
    exerciseLogs: ExerciseLogWithDate[],
    now: Date = new Date()
): ClientAlert | null {
    if (exerciseLogs.length === 0) return null;

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - PLATEAU_WINDOW_DAYS);

    // Group exercise logs by exercise_id
    const exerciseMap = new Map<string, ExerciseLogWithDate[]>();
    for (const log of exerciseLogs) {
        const existing = exerciseMap.get(log.exercise_id) || [];
        existing.push(log);
        exerciseMap.set(log.exercise_id, existing);
    }

    const plateauExercises: string[] = [];

    for (const [exerciseId, logs] of exerciseMap) {
        // Need at least 2 logs to detect a plateau
        if (logs.length < 2) continue;

        const sorted = [...logs].sort(
            (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
        );

        // Check if we have logs both before and within the plateau window
        const recentLogs = sorted.filter(l => new Date(l.workout_date) >= windowStart);
        const olderLogs = sorted.filter(l => new Date(l.workout_date) < windowStart);

        if (recentLogs.length === 0 || olderLogs.length === 0) continue;

        // Compare best performance in recent period vs older period
        const getMaxWeight = (logs: ExerciseLogWithDate[]) =>
            Math.max(...logs.map(l => l.max_weight ?? 0));
        const getMaxReps = (logs: ExerciseLogWithDate[]) =>
            Math.max(...logs.map(l => l.total_reps ?? 0));

        const recentMaxWeight = getMaxWeight(recentLogs);
        const olderMaxWeight = getMaxWeight(olderLogs);
        const recentMaxReps = getMaxReps(recentLogs);
        const olderMaxReps = getMaxReps(olderLogs);

        // Plateau: no improvement in either weight or reps
        if (recentMaxWeight <= olderMaxWeight && recentMaxReps <= olderMaxReps) {
            plateauExercises.push(exerciseId);
        }
    }

    if (plateauExercises.length > 0) {
        const count = plateauExercises.length;
        return {
            type: 'performance_plateau',
            severity: count >= 3 ? 'critical' : 'warning',
            title: 'Performance plateau',
            message: `No weight or rep increase in ${count} exercise${count > 1 ? 's' : ''} over the past 2 weeks.`,
            clientId,
            detectedAt: now.toISOString(),
        };
    }

    return null;
}

export interface FormIssueEntry {
    exercise_id: string;
    exercise_name: string;
    issue: string;
    detected_at: string;
}

/**
 * Detect form issues flagged during workout sessions.
 * This processes form issue records that were detected during pose analysis.
 */
export function detectFormIssues(
    clientId: string,
    formIssues: FormIssueEntry[],
    now: Date = new Date()
): ClientAlert | null {
    if (formIssues.length === 0) return null;

    // Only look at issues from the past 7 days
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 7);

    const recentIssues = formIssues.filter(
        fi => new Date(fi.detected_at) >= windowStart
    );

    if (recentIssues.length === 0) return null;

    const uniqueExercises = [...new Set(recentIssues.map(fi => fi.exercise_name))];
    const severity = recentIssues.length >= 3 ? 'critical' : 'warning';

    return {
        type: 'form_issues',
        severity,
        title: 'Form issues detected',
        message: `Form problems detected in ${uniqueExercises.join(', ')} during recent sessions.`,
        clientId,
        detectedAt: now.toISOString(),
    };
}

/**
 * Aggregate all alerts for a single client.
 */
export function getClientAlerts(
    clientId: string,
    workoutLogs: WorkoutLog[],
    exerciseLogs: ExerciseLogWithDate[],
    formIssues: FormIssueEntry[],
    now: Date = new Date()
): ClientAlert[] {
    const alerts: ClientAlert[] = [];

    const missedAlert = detectMissedWorkouts(clientId, workoutLogs, now);
    if (missedAlert) alerts.push(missedAlert);

    const plateauAlert = detectPerformancePlateaus(clientId, exerciseLogs, now);
    if (plateauAlert) alerts.push(plateauAlert);

    const formAlert = detectFormIssues(clientId, formIssues, now);
    if (formAlert) alerts.push(formAlert);

    return alerts;
}
