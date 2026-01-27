'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/supabaseDb';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import type {
    WorkoutSession,
    Exercise,
    ExerciseLog,
    LoggedSet,
    Profile,
} from '@/lib/types';

const PoseDetectionOverlay = lazy(() => import('@/components/PoseDetectionOverlay'));

// ============================================
// REST TIMER COMPONENT
// ============================================

interface RestTimerProps {
    seconds: number;
    totalSeconds: number;
    onSkip: () => void;
}

function RestTimer({ seconds, totalSeconds, onSkip }: RestTimerProps) {
    const progress = totalSeconds > 0 ? (totalSeconds - seconds) / totalSeconds : 0;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const circumference = 2 * Math.PI * 54;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
                padding: '2rem 1.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(57, 255, 20, 0.05)',
                border: '1px solid rgba(57, 255, 20, 0.3)',
                borderRadius: '16px',
                textAlign: 'center',
            }}
        >
            <div style={{ marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Rest
            </div>

            {/* Circular timer */}
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1rem' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke="#39ff14"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontFamily: 'var(--font-orbitron)',
                    color: '#39ff14',
                }}>
                    {minutes}:{secs.toString().padStart(2, '0')}
                </div>
            </div>

            <button
                onClick={onSkip}
                style={{
                    background: 'none',
                    border: '1px solid rgba(57, 255, 20, 0.4)',
                    color: '#39ff14',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                }}
            >
                Skip Rest
            </button>
        </motion.div>
    );
}

// ============================================
// SET ENTRY FORM WITH RPE
// ============================================

interface SetEntryFormProps {
    onLogSet: (weight: number, reps: number, rpe: number | undefined) => void;
    disabled?: boolean;
    setNumber: number;
    totalSets: number;
    targetWeight?: string;
    targetReps?: string;
    weightUnit: 'lbs' | 'kg';
}

function SetEntryForm({
    onLogSet,
    disabled,
    setNumber,
    totalSets,
    targetWeight,
    targetReps,
    weightUnit,
}: SetEntryFormProps) {
    const deriveWeight = (tw?: string) => tw ? tw.replace(/[^0-9.]/g, '') : '';
    const deriveReps = (tr?: string) => tr ? tr.replace(/[^0-9]/g, '') : '';

    const [weight, setWeight] = useState(() => deriveWeight(targetWeight));
    const [reps, setReps] = useState(() => deriveReps(targetReps));
    const [rpe, setRpe] = useState('');
    const [prevSetNumber, setPrevSetNumber] = useState(setNumber);

    // Reset when set changes (using state-based comparison instead of useEffect)
    if (prevSetNumber !== setNumber) {
        setPrevSetNumber(setNumber);
        setWeight(deriveWeight(targetWeight));
        setReps(deriveReps(targetReps));
        setRpe('');
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const w = parseFloat(weight);
        const r = parseInt(reps, 10);
        const rpeVal = rpe ? parseFloat(rpe) : undefined;

        if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
        if (rpeVal !== undefined && (rpeVal < 1 || rpeVal > 10)) return;

        onLogSet(w, r, rpeVal);
    };

    if (setNumber > totalSets) return null;

    return (
        <motion.form
            onSubmit={handleSubmit}
            className="glass-panel"
            style={{ padding: '1.5rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
            }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Set {setNumber} of {totalSets}
                </h3>
                {targetWeight && targetReps && (
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>
                        Target: {targetWeight} {weightUnit} x {targetReps}
                    </span>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem',
            }}>
                <div>
                    <label htmlFor="set-weight" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#888' }}>
                        Weight ({weightUnit})
                    </label>
                    <input
                        id="set-weight"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field"
                        style={{ marginBottom: 0 }}
                        placeholder="0"
                        disabled={disabled}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="set-reps" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#888' }}>
                        Reps
                    </label>
                    <input
                        id="set-reps"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="input-field"
                        style={{ marginBottom: 0 }}
                        placeholder="0"
                        disabled={disabled}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="set-rpe" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#888' }}>
                        RPE (1-10)
                    </label>
                    <input
                        id="set-rpe"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="1"
                        max="10"
                        value={rpe}
                        onChange={(e) => setRpe(e.target.value)}
                        className="input-field"
                        style={{ marginBottom: 0 }}
                        placeholder="--"
                        disabled={disabled}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={disabled || !weight || !reps}
                style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: disabled ? '#333' : '#39ff14',
                    color: disabled ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                }}
            >
                {disabled ? 'Resting...' : 'Log Set'}
            </button>
        </motion.form>
    );
}

// ============================================
// EXERCISE PROGRESS BAR
// ============================================

interface ExerciseProgressProps {
    currentIndex: number;
    total: number;
}

function ExerciseProgress({ currentIndex, total }: ExerciseProgressProps) {
    return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem' }}>
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: i < currentIndex
                            ? '#39ff14'
                            : i === currentIndex
                                ? 'rgba(57, 255, 20, 0.5)'
                                : 'rgba(255, 255, 255, 0.1)',
                        transition: 'background 0.3s',
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// WORKOUT SUMMARY
// ============================================

interface AIFeedback {
    feedback: string;
    recommendations: string[];
}

interface WorkoutSummaryProps {
    session: WorkoutSession;
    exerciseLogs: Map<number, { log: ExerciseLog; exercise: Exercise | null }>;
    startedAt: string;
    prsAchieved: Array<{ exerciseName: string; weight: number; reps: number; unit: string }>;
    weightUnit: 'lbs' | 'kg';
    userGoals?: string[];
    onFinish: () => void;
}

function WorkoutSummary({ session, exerciseLogs, startedAt, prsAchieved, weightUnit, userGoals, onFinish }: WorkoutSummaryProps) {
    const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
    const [aiFeedbackLoading, setAiFeedbackLoading] = useState(true);
    const [aiFeedbackError, setAiFeedbackError] = useState(false);

    const durationMs = Date.now() - new Date(startedAt).getTime();
    const totalMinutes = Math.floor(durationMs / 60000);
    const totalSeconds = Math.floor((durationMs % 60000) / 1000);

    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;

    exerciseLogs.forEach(({ log }) => {
        log.sets.forEach((set) => {
            totalSets++;
            totalReps += set.reps;
            totalVolume += set.weight * set.reps;
        });
    });

    // Fetch AI feedback on mount
    useEffect(() => {
        const fetchAIFeedback = async () => {
            try {
                const exercises = Array.from(exerciseLogs.entries()).map(([, { log, exercise }]) => ({
                    name: exercise?.name || 'Unknown Exercise',
                    sets: log.sets.map((s) => ({
                        set_number: s.set_number,
                        weight: s.weight,
                        reps: s.reps,
                        weight_unit: s.weight_unit,
                        rpe: s.rpe,
                    })),
                }));

                const response = await fetch('/api/ai-coach/workout-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionName: session.name,
                        durationMinutes: totalMinutes,
                        totalVolume,
                        totalSets,
                        totalReps,
                        weightUnit,
                        exercises,
                        prsAchieved,
                        userGoals,
                    }),
                });

                if (!response.ok) {
                    setAiFeedbackError(true);
                    return;
                }

                const data = await response.json();
                if (data.feedback) {
                    setAiFeedback(data);
                } else {
                    setAiFeedbackError(true);
                }
            } catch {
                setAiFeedbackError(true);
            } finally {
                setAiFeedbackLoading(false);
            }
        };

        fetchAIFeedback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ padding: '1.5rem' }}
        >
            <motion.div variants={fadeInUp} style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.75rem',
                    color: '#39ff14',
                    marginBottom: '0.5rem',
                }}>
                    Workout Complete
                </h1>
                <p style={{ color: '#888' }}>{session.name}</p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={fadeInUp}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '2rem',
                }}
            >
                {[
                    { label: 'Duration', value: `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}` },
                    { label: 'Total Volume', value: `${totalVolume.toLocaleString()} ${weightUnit}` },
                    { label: 'Total Sets', value: totalSets.toString() },
                    { label: 'Total Reps', value: totalReps.toString() },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-panel"
                        style={{ padding: '1.25rem', textAlign: 'center' }}
                    >
                        <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-orbitron)', color: '#39ff14', marginBottom: '0.25rem' }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* PRs */}
            {prsAchieved.length > 0 && (
                <motion.div variants={fadeInUp} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#39ff14', fontFamily: 'var(--font-orbitron)', fontSize: '1rem' }}>
                        Personal Records
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {prsAchieved.map((pr, i) => (
                            <div
                                key={i}
                                className="glass-panel"
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid rgba(57, 255, 20, 0.3)',
                                }}
                            >
                                <span>{pr.exerciseName}</span>
                                <span style={{ color: '#39ff14', fontWeight: 600 }}>
                                    {pr.weight} {pr.unit} x {pr.reps}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* AI Feedback */}
            <motion.div variants={fadeInUp} style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-orbitron)', fontSize: '1rem', color: '#39ff14' }}>
                    AI Coach Feedback
                </h3>
                <div
                    className="glass-panel"
                    style={{
                        padding: '1.25rem',
                        border: '1px solid rgba(57, 255, 20, 0.15)',
                    }}
                >
                    {aiFeedbackLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#888' }}>
                            <div className="spinner" style={{ width: '16px', height: '16px' }} />
                            <span style={{ fontSize: '0.9rem' }}>Analyzing your workout...</span>
                        </div>
                    )}
                    {aiFeedbackError && !aiFeedbackLoading && (
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>
                            Could not load AI feedback. Your workout data has been saved.
                        </p>
                    )}
                    {aiFeedback && !aiFeedbackLoading && (
                        <>
                            <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                                {aiFeedback.feedback}
                            </p>
                            {aiFeedback.recommendations.length > 0 && (
                                <>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: '#39ff14',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '0.5rem',
                                        fontWeight: 600,
                                    }}>
                                        Recommendations
                                    </div>
                                    <ul style={{
                                        listStyle: 'none',
                                        padding: 0,
                                        margin: 0,
                                        display: 'grid',
                                        gap: '0.5rem',
                                    }}>
                                        {aiFeedback.recommendations.map((rec, i) => (
                                            <li
                                                key={i}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    color: '#aaa',
                                                    paddingLeft: '1rem',
                                                    position: 'relative',
                                                }}
                                            >
                                                <span style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    color: '#39ff14',
                                                }}>
                                                    &bull;
                                                </span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </>
                    )}
                </div>
            </motion.div>

            {/* Exercise Breakdown */}
            <motion.div variants={fadeInUp} style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Exercise Breakdown</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {Array.from(exerciseLogs.entries()).map(([index, { log, exercise }]) => (
                        <div key={index} className="glass-panel" style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                {exercise?.name || `Exercise ${index + 1}`}
                            </div>
                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                {log.sets.map((set, si) => (
                                    <div key={si} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa' }}>
                                        <span>Set {set.set_number}</span>
                                        <span>
                                            {set.weight} {set.weight_unit} x {set.reps}
                                            {set.rpe ? ` @ RPE ${set.rpe}` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={fadeInUp}>
                <button
                    onClick={onFinish}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: '#39ff14',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                    }}
                >
                    Done
                </button>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MAIN WORKOUT EXECUTION PAGE
// ============================================

type PageState = 'loading' | 'error' | 'active' | 'summary';

export default function WorkoutExecutionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;

    const [pageState, setPageState] = useState<PageState>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [session, setSession] = useState<WorkoutSession | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    // Workout state
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
    const [exerciseLogs, setExerciseLogs] = useState<Map<number, { log: ExerciseLog; exercise: Exercise | null }>>(new Map());
    const [currentSets, setCurrentSets] = useState<LoggedSet[]>([]);
    const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);

    // Rest timer
    const [restTimer, setRestTimer] = useState(0);
    const [restTotalSeconds, setRestTotalSeconds] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const restIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Summary
    const [startedAt, setStartedAt] = useState('');
    const [prsAchieved, setPrsAchieved] = useState<Array<{ exerciseName: string; weight: number; reps: number; unit: string }>>([]);

    // Pose detection
    const [showPoseDetection, setShowPoseDetection] = useState(false);

    const weightUnit = profile?.preferred_weight_unit || 'lbs';

    // Declare functions before useEffects to satisfy react-hooks/immutability
    const loadSessionAndInit = useCallback(async () => {
        try {
            // Load user profile
            const storedUser = localStorage.getItem('user');
            let userId: string | null = null;
            if (storedUser) {
                const parsed = JSON.parse(storedUser) as Profile;
                setProfile(parsed);
                userId = parsed.id;
            }

            if (!userId) {
                setErrorMessage('You must be logged in to start a workout.');
                setPageState('error');
                return;
            }

            // Load workout session
            const workoutSession = await db.workoutSessions.getById(sessionId);
            if (!workoutSession) {
                setErrorMessage('Workout session not found.');
                setPageState('error');
                return;
            }

            if (!workoutSession.exercises || workoutSession.exercises.length === 0) {
                setErrorMessage('This workout has no exercises.');
                setPageState('error');
                return;
            }

            setSession(workoutSession);

            // Create workout log
            const now = new Date().toISOString();
            const log = await db.workoutLogs.create({
                user_id: userId,
                session_id: sessionId,
                date: now.split('T')[0],
                started_at: now,
            });
            setWorkoutLogId(log.id);
            setStartedAt(now);

            // Load first exercise
            const firstExercise = workoutSession.exercises[0];
            if (firstExercise) {
                const exerciseDetails = await db.exercises.getById(firstExercise.exercise_id);
                setCurrentExercise(exerciseDetails);
            }

            setPageState('active');
        } catch (err) {
            console.error('Error initializing workout:', err);
            setErrorMessage('Failed to load workout session.');
            setPageState('error');
        }
    }, [sessionId]);

    const loadExerciseDetails = useCallback(async (exerciseId: string) => {
        try {
            const exercise = await db.exercises.getById(exerciseId);
            setCurrentExercise(exercise);
        } catch (err) {
            console.error('Error loading exercise details:', err);
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    // Load session and initialize workout
    useEffect(() => {
        loadSessionAndInit();
    }, [loadSessionAndInit]);

    // Load exercise details when index changes
    useEffect(() => {
        if (session && pageState === 'active') {
            const exercise = session.exercises[currentExerciseIndex];
            if (exercise) {
                loadExerciseDetails(exercise.exercise_id);
            }
        }
    }, [currentExerciseIndex, session, pageState, loadExerciseDetails]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Rest timer countdown
    useEffect(() => {
        if (isResting && restTimer > 0) {
            restIntervalRef.current = setInterval(() => {
                setRestTimer((prev) => {
                    if (prev <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (!isResting || restTimer <= 0) {
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
                restIntervalRef.current = null;
            }
        }
        return () => {
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
            }
        };
    }, [isResting, restTimer]);

    const handleLogSet = useCallback(async (weight: number, reps: number, rpe: number | undefined) => {
        if (!workoutLogId || !session) return;
        const sessionExercise = session.exercises[currentExerciseIndex];
        if (!sessionExercise) return;

        const setNumber = currentSets.length + 1;
        const now = new Date().toISOString();

        const newSet: LoggedSet = {
            set_number: setNumber,
            weight,
            reps,
            weight_unit: weightUnit,
            started_at: now,
            completed_at: now,
            rpe,
        };

        const updatedSets = [...currentSets, newSet];
        setCurrentSets(updatedSets);

        try {
            // Create or update exercise log in database
            const existingEntry = exerciseLogs.get(currentExerciseIndex);

            if (!existingEntry) {
                const exerciseLog = await db.exerciseLogs.create({
                    workout_log_id: workoutLogId,
                    exercise_id: sessionExercise.exercise_id,
                    exercise_order: currentExerciseIndex + 1,
                    sets: updatedSets,
                });
                const newLogs = new Map(exerciseLogs);
                newLogs.set(currentExerciseIndex, { log: exerciseLog, exercise: currentExercise });
                setExerciseLogs(newLogs);
            } else {
                await db.exerciseLogs.update(existingEntry.log.id, { sets: updatedSets });
                const newLogs = new Map(exerciseLogs);
                newLogs.set(currentExerciseIndex, {
                    log: { ...existingEntry.log, sets: updatedSets },
                    exercise: existingEntry.exercise,
                });
                setExerciseLogs(newLogs);
            }

            // Start rest timer if more sets remain
            const targetSetCount = sessionExercise.sets.length;
            if (updatedSets.length < targetSetCount) {
                const currentTargetSet = sessionExercise.sets[updatedSets.length - 1];
                const restSeconds = currentTargetSet?.rest_seconds || 60;
                setRestTotalSeconds(restSeconds);
                setRestTimer(restSeconds);
                setIsResting(true);
            }
        } catch (err) {
            console.error('Error logging set:', err);
        }
    }, [workoutLogId, session, currentExerciseIndex, currentSets, exerciseLogs, currentExercise, weightUnit]);

    const skipRest = useCallback(() => {
        setIsResting(false);
        setRestTimer(0);
    }, []);

    const handleFinishWorkout = useCallback(async () => {
        if (!workoutLogId || !session || !profile) return;

        try {
            const now = new Date().toISOString();

            // Mark workout as complete
            await db.workoutLogs.update(workoutLogId, {
                finished_at: now,
                completed_at: now,
            });

            // Check for PRs
            const detectedPRs: Array<{ exerciseName: string; weight: number; reps: number; unit: string }> = [];

            for (const [index, { log, exercise }] of exerciseLogs.entries()) {
                const exerciseId = session.exercises[index]?.exercise_id;
                if (!exerciseId || !log || log.sets.length === 0) continue;

                const maxWeightSet = log.sets.reduce((max, set) =>
                    set.weight > max.weight ? set : max,
                    log.sets[0]
                );

                if (!maxWeightSet) continue;

                const existingPRs = await db.personalRecords.getByExercise(profile.id, exerciseId);
                const isPR = existingPRs.length === 0 ||
                    existingPRs.every((pr) => !pr.max_weight || maxWeightSet.weight > pr.max_weight);

                if (isPR) {
                    await db.personalRecords.create({
                        user_id: profile.id,
                        exercise_id: exerciseId,
                        max_weight: maxWeightSet.weight,
                        max_reps: maxWeightSet.reps,
                        max_reps_weight: maxWeightSet.weight,
                        achieved_at: now,
                        workout_log_id: workoutLogId,
                        exercise_log_id: log.id,
                        is_current: true,
                    });

                    detectedPRs.push({
                        exerciseName: exercise?.name || 'Unknown Exercise',
                        weight: maxWeightSet.weight,
                        reps: maxWeightSet.reps,
                        unit: maxWeightSet.weight_unit || 'lbs',
                    });

                    for (const oldPR of existingPRs) {
                        await db.personalRecords.update(oldPR.id, { is_current: false });
                    }
                }
            }

            // Create activity post
            if (profile.auto_post_workouts !== false) {
                const visibility = profile.workout_privacy || 'public';
                await db.activityPosts.create({
                    user_id: profile.id,
                    workout_log_id: workoutLogId,
                    post_type: 'workout_completed',
                    content: `Completed ${session.name}`,
                    visibility,
                });

                for (const pr of detectedPRs) {
                    await db.activityPosts.create({
                        user_id: profile.id,
                        workout_log_id: workoutLogId,
                        post_type: 'pr_achieved',
                        content: `${pr.exerciseName}! ${pr.reps} reps for ${pr.weight} ${pr.unit}`,
                        visibility,
                    });
                }
            }

            setPrsAchieved(detectedPRs);
            setPageState('summary');
        } catch (err) {
            console.error('Error finishing workout:', err);
        }
    }, [workoutLogId, session, profile, exerciseLogs]);

    const handleNextExercise = useCallback(() => {
        if (!session) return;

        if (currentExerciseIndex < session.exercises.length - 1) {
            setCurrentExerciseIndex((prev) => prev + 1);
            setCurrentSets([]);
            setIsResting(false);
            setRestTimer(0);
            setShowPoseDetection(false);
        } else {
            handleFinishWorkout();
        }
    }, [session, currentExerciseIndex, handleFinishWorkout]);

    // ─── RENDER: Loading ─────────────────────────────────────────────
    if (pageState === 'loading') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                gap: '1rem',
            }}>
                <div className="spinner" />
                <p style={{ color: '#888' }}>Loading workout...</p>
            </div>
        );
    }

    // ─── RENDER: Error ───────────────────────────────────────────────
    if (pageState === 'error') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '2rem',
                textAlign: 'center',
                gap: '1rem',
            }}>
                <h2 style={{ color: '#ef4444', fontFamily: 'var(--font-orbitron)' }}>Error</h2>
                <p style={{ color: '#888' }}>{errorMessage}</p>
                <button
                    onClick={() => router.push('/home')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#39ff14',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // ─── RENDER: Summary ─────────────────────────────────────────────
    if (pageState === 'summary' && session) {
        return (
            <div style={{ maxWidth: '500px', margin: '0 auto', minHeight: '100vh' }}>
                <WorkoutSummary
                    session={session}
                    exerciseLogs={exerciseLogs}
                    startedAt={startedAt}
                    prsAchieved={prsAchieved}
                    weightUnit={weightUnit}
                    userGoals={profile?.fitness_goals}
                    onFinish={() => router.push('/home')}
                />
            </div>
        );
    }

    // ─── RENDER: Active Workout ──────────────────────────────────────
    if (pageState !== 'active' || !session) return null;

    const sessionExercise = session.exercises[currentExerciseIndex];
    const currentSetIndex = currentSets.length;
    const targetSet = sessionExercise?.sets[currentSetIndex] || sessionExercise?.sets[sessionExercise.sets.length - 1];
    const allSetsComplete = currentSets.length >= (sessionExercise?.sets.length || 0);
    const isLastExercise = currentExerciseIndex >= session.exercises.length - 1;

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1rem', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingTop: '0.5rem',
            }}>
                <button
                    onClick={() => router.push('/home')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#39ff14',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.5rem 0',
                    }}
                >
                    &larr; Exit
                </button>
                <span style={{ color: '#888', fontSize: '0.85rem', fontFamily: 'var(--font-orbitron)' }}>
                    {currentExerciseIndex + 1} / {session.exercises.length}
                </span>
            </div>

            {/* Exercise progress bar */}
            <ExerciseProgress currentIndex={currentExerciseIndex} total={session.exercises.length} />

            {/* Session name */}
            <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.85rem', color: '#888', marginBottom: '0.25rem' }}>
                    {session.name}
                </h2>
            </div>

            {/* Current Exercise Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentExerciseIndex}
                    className="glass-panel"
                    style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.15rem',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        color: '#39ff14',
                    }}>
                        {currentExercise?.name || 'Loading...'}
                    </h2>

                    {/* Exercise GIF */}
                    <div style={{
                        width: '100%',
                        maxWidth: '300px',
                        margin: '0 auto 1rem auto',
                        aspectRatio: '1 / 1',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {currentExercise?.gif_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={currentExercise.gif_url}
                                alt={currentExercise.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        ) : (
                            <span style={{ color: '#555', fontSize: '0.85rem' }}>No demo available</span>
                        )}
                    </div>

                    {/* Pose Detection Toggle */}
                    <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                        <button
                            data-testid="pose-toggle-btn"
                            onClick={() => setShowPoseDetection(prev => !prev)}
                            style={{
                                background: showPoseDetection
                                    ? 'rgba(57, 255, 20, 0.15)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${showPoseDetection ? 'rgba(57, 255, 20, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
                                color: showPoseDetection ? '#39ff14' : '#aaa',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            {showPoseDetection ? 'Hide Form Check' : 'Form Check'}
                        </button>
                    </div>

                    {/* Pose Detection Overlay */}
                    {showPoseDetection && (
                        <Suspense fallback={
                            <div style={{
                                width: '100%',
                                aspectRatio: '4/3',
                                background: '#000',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.75rem',
                            }}>
                                <div className="spinner" />
                            </div>
                        }>
                            <PoseDetectionOverlay
                                visible={showPoseDetection}
                                onClose={() => setShowPoseDetection(false)}
                                exerciseName={currentExercise?.name}
                            />
                        </Suspense>
                    )}

                    {/* Target info */}
                    <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        color: '#aaa',
                        fontSize: '0.9rem',
                    }}>
                        <span>
                            <strong style={{ color: '#fff' }}>{sessionExercise.sets.length}</strong> sets
                        </span>
                        {sessionExercise.sets[0]?.reps && (
                            <span>
                                <strong style={{ color: '#fff' }}>{sessionExercise.sets[0].reps}</strong> reps
                            </span>
                        )}
                        {sessionExercise.sets[0]?.weight && (
                            <span>
                                <strong style={{ color: '#fff' }}>{sessionExercise.sets[0].weight}</strong> {weightUnit}
                            </span>
                        )}
                    </div>

                    {sessionExercise.notes && (
                        <p style={{ marginTop: '0.75rem', color: '#888', fontSize: '0.85rem', textAlign: 'center', fontStyle: 'italic' }}>
                            {sessionExercise.notes}
                        </p>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Rest Timer */}
            <AnimatePresence>
                {isResting && (
                    <RestTimer
                        seconds={restTimer}
                        totalSeconds={restTotalSeconds}
                        onSkip={skipRest}
                    />
                )}
            </AnimatePresence>

            {/* Completed Sets List */}
            {currentSets.length > 0 && (
                <motion.div
                    style={{ marginBottom: '1.5rem' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#888' }}>Completed Sets</h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {currentSets.map((set, i) => (
                            <motion.div
                                key={i}
                                className="glass-panel"
                                style={{
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                            >
                                <span style={{ color: '#888' }}>Set {set.set_number}</span>
                                <span style={{ color: '#39ff14', fontWeight: 600 }}>
                                    {set.weight} {set.weight_unit} x {set.reps}
                                    {set.rpe ? ` @ RPE ${set.rpe}` : ''}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Set Entry Form */}
            {!allSetsComplete && sessionExercise && (
                <SetEntryForm
                    onLogSet={handleLogSet}
                    disabled={isResting}
                    setNumber={currentSets.length + 1}
                    totalSets={sessionExercise.sets.length}
                    targetWeight={targetSet?.weight}
                    targetReps={targetSet?.reps}
                    weightUnit={weightUnit}
                />
            )}

            {/* Next Exercise / Finish Workout */}
            {allSetsComplete && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '1.5rem' }}
                >
                    <button
                        onClick={handleNextExercise}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: '#39ff14',
                            color: '#000',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-orbitron)',
                        }}
                    >
                        {isLastExercise ? 'Finish Workout' : 'Next Exercise'}
                    </button>
                </motion.div>
            )}
        </div>
    );
}
