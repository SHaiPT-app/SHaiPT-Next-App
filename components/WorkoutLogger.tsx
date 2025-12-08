'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseDb';
import type { WorkoutSession, Exercise, ExerciseLog, WorkoutLog, LoggedSet, TrainingPlan, TrainingPlanSession, Profile } from '@/lib/types';

interface WorkoutLoggerProps {
    userId: string;
    onComplete?: () => void;
}

export default function WorkoutLogger({ userId, onComplete }: WorkoutLoggerProps) {
    const [viewMode, setViewMode] = useState<'plans' | 'workouts'>('plans');
    const [step, setStep] = useState<'selectPlan' | 'selectSession' | 'active'>('selectPlan');
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
    const [planSessions, setPlanSessions] = useState<(TrainingPlanSession & { session?: WorkoutSession })[]>([]);
    const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
    const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (viewMode === 'plans') {
            loadTrainingPlans();
        } else {
            loadWorkoutSessions();
        }
    }, [userId, viewMode]);

    const loadTrainingPlans = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await db.trainingPlans.getByCreator(userId);
            setPlans(data);
        } catch (error) {
            console.error('Error loading training plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadWorkoutSessions = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await db.workoutSessions.getByCreator(userId);
            setWorkoutSessions(data);
        } catch (error) {
            console.error('Error loading workout sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = async (plan: TrainingPlan) => {
        setSelectedPlan(plan);
        setLoading(true);

        try {
            // Load sessions for this plan
            const sessions = await db.trainingPlanSessions.getByPlan(plan.id);

            // Load full session details for each
            const sessionsWithDetails = await Promise.all(
                sessions.map(async (ps) => {
                    const session = await db.workoutSessions.getById(ps.session_id);
                    return { ...ps, session };
                })
            );

            // Filter out any with null sessions
            setPlanSessions(sessionsWithDetails.filter(ps => ps.session !== null) as (TrainingPlanSession & { session: WorkoutSession })[]);
            setStep('selectSession');
        } catch (error) {
            console.error('Error loading plan sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = (planSession: TrainingPlanSession & { session?: WorkoutSession }) => {
        if (planSession.session) {
            setSelectedSession(planSession.session);
            setStep('active');
        }
    };

    const handleSelectDirectSession = (session: WorkoutSession) => {
        setSelectedSession(session);
        setStep('active');
    };

    const handleBack = () => {
        if (step === 'selectSession') {
            setStep('selectPlan'); // Go back to main selection view
            setSelectedPlan(null);
            setPlanSessions([]);
        } else if (step === 'active') {
            if (selectedPlan) {
                setStep('selectSession'); // If came from plan, go back to plan sessions
            } else {
                setStep('selectPlan'); // If came from direct workout, go back to main selection
            }
            setSelectedSession(null);
        }
    };

    if (step === 'selectPlan') {
        return (
            <div>
                {/* Selection View Header with Tabs */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.25rem', margin: 0 }}>
                        Start Workout
                    </h2>

                    <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '2px'
                    }}>
                        <button
                            onClick={() => setViewMode('plans')}
                            style={{
                                padding: '0.25rem 0.75rem',
                                background: viewMode === 'plans' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: viewMode === 'plans' ? 'white' : '#888',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Plans
                        </button>
                        <button
                            onClick={() => setViewMode('workouts')}
                            style={{
                                padding: '0.25rem 0.75rem',
                                background: viewMode === 'workouts' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: viewMode === 'workouts' ? 'white' : '#888',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Workouts
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                        Loading...
                    </div>
                ) : (
                    <>
                        {viewMode === 'plans' ? (
                            plans.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                    <p style={{ color: '#888', marginBottom: '1rem' }}>No training plans found</p>
                                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                        Create a training plan in your Library first
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {plans.map(plan => (
                                        <div
                                            key={plan.id}
                                            onClick={() => handleSelectPlan(plan)}
                                            className="glass-panel"
                                            style={{
                                                padding: '1.5rem',
                                                cursor: 'pointer',
                                                border: 'none',
                                                textAlign: 'left',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                                                {plan.name}
                                            </h3>
                                            {plan.description && (
                                                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                                    {plan.description}
                                                </p>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: '0.75rem'
                                            }}>
                                                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                                    {plan.duration_weeks} weeks
                                                </span>
                                                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                                    View Sessions
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            // Workouts List View
                            workoutSessions.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                    <p style={{ color: '#888', marginBottom: '1rem' }}>No individual workouts found</p>
                                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                        Create a workout session in your Library first
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {workoutSessions.map(session => (
                                        <div
                                            key={session.id}
                                            onClick={() => handleSelectDirectSession(session)}
                                            className="glass-panel"
                                            style={{
                                                padding: '1.5rem',
                                                cursor: 'pointer',
                                                border: 'none',
                                                textAlign: 'left',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                                                {session.name}
                                            </h3>
                                            {session.description && (
                                                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                                    {session.description}
                                                </p>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: '0.75rem'
                                            }}>
                                                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                                    {session.exercises?.length || 0} exercises
                                                </span>
                                                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                                    Start Workout
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </>
                )
                }
            </div >
        );
    }

    if (step === 'selectSession') {
        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        ← Back
                    </button>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.25rem',
                        margin: 0
                    }}>
                        {selectedPlan?.name}
                    </h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                        Loading sessions...
                    </div>
                ) : planSessions.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <p style={{ color: '#888' }}>No sessions in this plan</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {planSessions.map(ps => (
                            <div
                                key={ps.id}
                                onClick={() => handleSelectSession(ps)}
                                className="glass-panel"
                                style={{
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    border: 'none',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <span style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        Day {ps.day_number}
                                    </span>
                                    <h3 style={{ fontWeight: '600', margin: 0, color: 'var(--foreground)' }}>
                                        {ps.session?.name || 'Unnamed Session'}
                                    </h3>
                                </div>
                                {ps.session?.description && (
                                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                        {ps.session.description}
                                    </p>
                                )}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '0.75rem'
                                }}>
                                    <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                        {ps.session?.exercises?.length || 0} exercises
                                    </span>
                                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                        Start Workout
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (step === 'active' && selectedSession) {
        return (
            <ActiveWorkout
                session={selectedSession}
                userId={userId}
                onBack={handleBack}
                onComplete={onComplete}
            />
        );
    }

    return null;
}

// ============================================
// ACTIVE WORKOUT COMPONENT
// ============================================

interface ActiveWorkoutProps {
    session: WorkoutSession;
    userId: string;
    onBack: () => void;
    onComplete?: () => void;
}

function ActiveWorkout({ session, userId, onBack, onComplete }: ActiveWorkoutProps) {
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
    const [exerciseLogs, setExerciseLogs] = useState<Map<number, ExerciseLog>>(new Map());
    const [currentSets, setCurrentSets] = useState<LoggedSet[]>([]);
    const [restTimer, setRestTimer] = useState<number>(0);
    const [isResting, setIsResting] = useState(false);
    const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);

    const sessionExercise = session.exercises[currentExerciseIndex];

    useEffect(() => {
        initializeWorkout();
    }, []);

    useEffect(() => {
        if (sessionExercise) {
            loadExerciseDetails(sessionExercise.exercise_id);
        }
    }, [currentExerciseIndex]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isResting && restTimer > 0) {
            interval = setInterval(() => {
                setRestTimer(prev => {
                    if (prev <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isResting, restTimer]);

    const initializeWorkout = async () => {
        try {
            // Create workout log
            const log = await db.workoutLogs.create({
                user_id: userId,
                session_id: session.id,
                date: new Date().toISOString().split('T')[0],
                started_at: new Date().toISOString()
            });
            setWorkoutLogId(log.id);
        } catch (error) {
            console.error('Error initializing workout:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadExerciseDetails = async (exerciseId: string) => {
        try {
            const exercise = await db.exercises.getById(exerciseId);
            setCurrentExercise(exercise);
        } catch (error) {
            console.error('Error loading exercise:', error);
        }
    };

    const handleAddSet = async (weight: number, reps: number) => {
        if (!workoutLogId || !sessionExercise) return;

        const currentSetIndex = currentSets.length;
        // Get target set info from the session plan
        const targetSet = sessionExercise.sets[currentSetIndex] || sessionExercise.sets[sessionExercise.sets.length - 1];

        const newSet: LoggedSet = {
            set_number: currentSetIndex + 1,
            weight,
            reps,
            weight_unit: 'lbs',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
        };

        const updatedSets = [...currentSets, newSet];
        setCurrentSets(updatedSets);

        // Create or update exercise log
        let exerciseLog = exerciseLogs.get(currentExerciseIndex);

        if (!exerciseLog) {
            // Create new exercise log
            exerciseLog = await db.exerciseLogs.create({
                workout_log_id: workoutLogId,
                exercise_id: sessionExercise.exercise_id,
                exercise_order: currentExerciseIndex + 1,
                sets: updatedSets
            });
            const newLogs = new Map(exerciseLogs);
            newLogs.set(currentExerciseIndex, exerciseLog);
            setExerciseLogs(newLogs);
        } else {
            // Update existing
            await db.exerciseLogs.update(exerciseLog.id, { sets: updatedSets });
        }

        // Start rest timer if applicable
        const restSeconds = targetSet?.rest_seconds || 60;
        if (currentSets.length < sessionExercise.sets.length) {
            startRest(restSeconds);
        }
    };

    const startRest = (seconds: number) => {
        setRestTimer(seconds);
        setIsResting(true);
    };

    const skipRest = () => {
        setIsResting(false);
        setRestTimer(0);
    };

    const handleNextExercise = () => {
        if (currentExerciseIndex < session.exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);
            setCurrentSets([]);
            setIsResting(false);
            setRestTimer(0);
        } else {
            handleFinishWorkout();
        }
    };

    const handleFinishWorkout = async () => {
        if (!workoutLogId) return;

        try {
            // Mark workout as complete
            await db.workoutLogs.update(workoutLogId, {
                finished_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            });

            // Get user profile to check privacy settings
            const profile = await db.profiles.getById(userId);

            // Check for PRs and create PR posts
            const prsDetected: Array<{ exerciseId: string; exerciseName: string; weight: number; reps: number; unit: string }> = [];

            for (const [index, log] of exerciseLogs.entries()) {
                const exerciseId = session.exercises[index]?.exercise_id;
                if (!exerciseId || !log) continue;

                // Get max weight from current workout
                const maxWeightSet = log.sets.reduce((max, set) =>
                    set.weight > max.weight ? set : max
                    , log.sets[0]);

                if (!maxWeightSet) continue;

                // Get previous PRs for this exercise
                const existingPRs = await db.personalRecords.getByExercise(userId, exerciseId);

                // Check if this is a new PR

                // Check if this is a new PR
                const isPR = existingPRs.length === 0 ||
                    existingPRs.every(pr =>
                        !pr.max_weight || maxWeightSet.weight > pr.max_weight
                    );

                if (isPR) {
                    // Create/update PR record
                    await db.personalRecords.create({
                        user_id: userId,
                        exercise_id: exerciseId,
                        max_weight: maxWeightSet.weight,
                        max_reps: maxWeightSet.reps,
                        max_reps_weight: maxWeightSet.weight,
                        achieved_at: new Date().toISOString(),
                        workout_log_id: workoutLogId,
                        exercise_log_id: log.id,
                        is_current: true
                    });

                    // Get exercise name
                    const exercise = await db.exercises.getById(exerciseId);

                    prsDetected.push({
                        exerciseId,
                        exerciseName: exercise?.name || 'Unknown Exercise',
                        weight: maxWeightSet.weight,
                        reps: maxWeightSet.reps,
                        unit: maxWeightSet.weight_unit || 'lbs'
                    });

                    // Mark old PRs as not current
                    for (const oldPR of existingPRs) {
                        await db.personalRecords.update(oldPR.id, { is_current: false });
                    }
                }
            }

            // Create activity post for workout (if auto-post is enabled)
            if (profile?.auto_post_workouts !== false) {
                const visibility = profile?.workout_privacy || 'public';

                await db.activityPosts.create({
                    user_id: userId,
                    workout_log_id: workoutLogId,
                    post_type: 'workout_completed',
                    content: `Completed ${session.name}`,
                    visibility
                });
            }

            // Create activity posts for each PR
            for (const pr of prsDetected) {
                const visibility = profile?.workout_privacy || 'public';

                await db.activityPosts.create({
                    user_id: userId,
                    workout_log_id: workoutLogId,
                    post_type: 'pr_achieved',
                    content: `${pr.exerciseName}! ${pr.reps} reps for ${pr.weight} ${pr.unit}`,
                    visibility
                });
            }

            if (onComplete) onComplete();
            onBack();
        } catch (error) {
            console.error('Error finishing workout:', error);
        }
    };

    if (loading || !currentExercise) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    ← Back
                </button>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>
                    {currentExerciseIndex + 1} / {session.exercises.length}
                </span>
            </div>

            {/* Exercise GIF Display */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    marginBottom: '1rem',
                    textAlign: 'center'
                }}>
                    {currentExercise.name}
                </h2>

                {/* GIF Container */}
                <div style={{
                    width: '60%',
                    maxWidth: '400px',
                    margin: '0 auto 1rem auto',
                    aspectRatio: '16/9',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {currentExercise.gif_url ? (
                        <img
                            src={currentExercise.gif_url}
                            alt={currentExercise.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <span style={{ color: '#666' }}>No GIF available</span>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                }}>
                    <span style={{ color: '#888' }}>
                        Target: {sessionExercise.sets.length} sets
                        {sessionExercise.sets.length > 0 && ` × ${sessionExercise.sets[0].reps} reps`}
                    </span>
                </div>
            </div>

            {/* Rest Timer */}
            {isResting && (
                <div className="glass-panel" style={{
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    background: 'rgba(242, 95, 41, 0.1)',
                    border: '2px solid var(--primary)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', fontFamily: 'var(--font-orbitron)', color: 'var(--primary)' }}>
                        {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div style={{ color: '#888', marginTop: '0.5rem' }}>Rest Time</div>
                    <button
                        onClick={skipRest}
                        style={{
                            marginTop: '1rem',
                            background: 'none',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Skip Rest
                    </button>
                </div>
            )}

            {/* Previous Sets */}
            {currentSets.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Completed Sets</h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {currentSets.map((set, i) => (
                            <div
                                key={i}
                                className="glass-panel"
                                style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}
                            >
                                <span>Set {set.set_number}</span>
                                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                                    {set.weight} {set.weight_unit} × {set.reps} reps
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Set Form */}
            {(() => {
                const currentSetIndex = currentSets.length;
                const targetSet = sessionExercise.sets[currentSetIndex] || sessionExercise.sets[sessionExercise.sets.length - 1];

                return (
                    <SetEntryForm
                        onAddSet={handleAddSet}
                        disabled={isResting}
                        setNumber={currentSets.length + 1}
                        totalSets={sessionExercise.sets.length}
                        targetWeight={targetSet?.weight ? Number(targetSet.weight) : undefined}
                        targetReps={targetSet?.reps ? Number(targetSet.reps) : undefined}
                    />
                );
            })()}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {currentSets.length >= sessionExercise.sets.length && (
                    <button
                        onClick={handleNextExercise}
                        className="btn-primary"
                        style={{ flex: 1 }}
                    >
                        {currentExerciseIndex < session.exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================
// SET ENTRY FORM
// ============================================

interface SetEntryFormProps {
    onAddSet: (weight: number, reps: number) => void;
    disabled?: boolean;
    setNumber: number;
    totalSets: number;
    targetWeight?: number;
    targetReps?: number;
}

function SetEntryForm({ onAddSet, disabled, setNumber, totalSets, targetWeight, targetReps }: SetEntryFormProps) {
    const [weight, setWeight] = useState(targetWeight?.toString() || '');
    const [reps, setReps] = useState(targetReps?.toString() || '');

    // Update form when set changes
    useEffect(() => {
        setWeight(targetWeight?.toString() || '');
        setReps(targetReps?.toString() || '');
    }, [setNumber, targetWeight, targetReps]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const w = parseFloat(weight);
        const r = parseInt(reps);

        if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
            onAddSet(w, r);
            setWeight('');
            setReps('');
        }
    };

    if (setNumber > totalSets) {
        return null;
    }

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                Log Set {setNumber}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        Weight (lbs)
                    </label>
                    <input
                        type="number"
                        step="0.5"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field"
                        placeholder="0"
                        disabled={disabled}
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        Reps
                    </label>
                    <input
                        type="number"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="input-field"
                        placeholder="0"
                        disabled={disabled}
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={disabled || !weight || !reps}
            >
                {disabled ? 'Resting...' : 'Complete Set'}
            </button>
        </form>
    );
}
