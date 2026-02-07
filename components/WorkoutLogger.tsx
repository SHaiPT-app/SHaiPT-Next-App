'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/supabaseDb';
import type { WorkoutSession, Exercise, ExerciseLog, LoggedSet, TrainingPlan, TrainingPlanSession, SessionExercise } from '@/lib/types';

/** Build a fallback Exercise object from SessionExercise JSONB data when DB lookup fails */
function buildFallbackExercise(se: SessionExercise): Exercise {
    const name = se.exercise_name
        || se.exercise_id
            .replace(/_d\d+_e\d+$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    return { exercise_id: se.exercise_id, name, body_parts: [], target_muscles: [], equipments: [] };
}

const FORM_CHECKER_PREF_KEY = 'shaipt_form_checker_enabled';

const PoseDetectionOverlay = lazy(() => import('@/components/PoseDetectionOverlay'));

interface WorkoutLoggerProps {
    userId: string;
    onComplete?: () => void;
}

export default function WorkoutLogger({ userId, onComplete }: WorkoutLoggerProps) {
    const [viewMode, setViewMode] = useState<'plans' | 'workouts'>('plans');
    const [step, setStep] = useState<'selectPlan' | 'selectSession' | 'formCheckerPrompt' | 'active'>('selectPlan');
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
    const [planSessions, setPlanSessions] = useState<(TrainingPlanSession & { session?: WorkoutSession })[]>([]);
    const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
    const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [formCheckerEnabled, setFormCheckerEnabled] = useState(false);

    // Today's workout from active plan assignment
    const [todaySession, setTodaySession] = useState<WorkoutSession | null>(null);
    const [todayDayNumber, setTodayDayNumber] = useState<number | null>(null);
    const [activePlanName, setActivePlanName] = useState<string>('');
    const [todayLoading, setTodayLoading] = useState(true);

    // Load saved form checker preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem(FORM_CHECKER_PREF_KEY);
            if (saved !== null) {
                setFormCheckerEnabled(saved === 'true');
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    // Load today's workout from active plan assignment
    useEffect(() => {
        loadTodayWorkout();
    }, [userId]);

    const loadTodayWorkout = async () => {
        if (!userId) {
            setTodayLoading(false);
            return;
        }
        setTodayLoading(true);
        try {
            const assignment = await db.trainingPlanAssignments.getActiveByUser(userId);
            if (!assignment) {
                setTodayLoading(false);
                return;
            }
            // Calculate which day of the plan we're on
            const startDate = new Date(assignment.start_date);
            const today = new Date();
            // Reset time to compare dates only
            startDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // Get plan sessions
            const planSessionsList = await db.trainingPlanSessions.getByPlan(assignment.plan_id);
            if (planSessionsList.length === 0) {
                setTodayLoading(false);
                return;
            }

            // Get plan name
            const plan = await db.trainingPlans.getById(assignment.plan_id);
            if (plan) {
                setActivePlanName(plan.name);
            }

            // Find today's session: use day_number cycling within the plan's sessions
            const maxDay = Math.max(...planSessionsList.map(ps => ps.day_number));
            const todayDayNum = (diffDays % maxDay) + 1;
            setTodayDayNumber(todayDayNum);

            const todayPlanSession = planSessionsList.find(ps => ps.day_number === todayDayNum);
            if (todayPlanSession) {
                const session = await db.workoutSessions.getById(todayPlanSession.session_id);
                setTodaySession(session);
            }
        } catch (err) {
            console.error('Error loading today workout:', err);
        } finally {
            setTodayLoading(false);
        }
    };

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
            // Primary path: via training_plan_assignments (reliable RLS)
            const assignments = await db.trainingPlanAssignments.getByUser(userId);
            const uniquePlanIds = [...new Set(assignments.map(a => a.plan_id))];

            let data: TrainingPlan[] = [];
            if (uniquePlanIds.length > 0) {
                const results = await Promise.all(
                    uniquePlanIds.map(id => db.trainingPlans.getById(id))
                );
                data = results.filter((p): p is TrainingPlan => p !== null);
            }

            // Fallback: direct query
            if (data.length === 0) {
                try {
                    data = await db.trainingPlans.getByCreator(userId);
                } catch {
                    // RLS may block — that's OK
                }
            }

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
            setStep('formCheckerPrompt');
        }
    };

    const handleSelectDirectSession = (session: WorkoutSession) => {
        setSelectedSession(session);
        setStep('formCheckerPrompt');
    };

    const handleStartTodayWorkout = () => {
        if (todaySession) {
            setSelectedSession(todaySession);
            setStep('formCheckerPrompt');
        }
    };

    const handleToggleFormChecker = (enabled: boolean) => {
        setFormCheckerEnabled(enabled);
        try {
            localStorage.setItem(FORM_CHECKER_PREF_KEY, String(enabled));
        } catch {
            // localStorage unavailable
        }
    };

    const handleConfirmStart = () => {
        setStep('active');
    };

    const handleBack = () => {
        if (step === 'selectSession') {
            setStep('selectPlan');
            setSelectedPlan(null);
            setPlanSessions([]);
        } else if (step === 'formCheckerPrompt') {
            if (selectedPlan) {
                setStep('selectSession');
            } else {
                setStep('selectPlan');
            }
            setSelectedSession(null);
        } else if (step === 'active') {
            setStep('formCheckerPrompt');
        }
    };

    if (step === 'selectPlan') {
        return (
            <div>
                {/* Today's Workout Card */}
                {!todayLoading && todaySession && (
                    <motion.div
                        data-testid="today-workout-card"
                        className="glass-panel"
                        style={{
                            padding: '1.5rem',
                            marginBottom: '1.5rem',
                            border: '1px solid rgba(255, 102, 0, 0.3)',
                            background: 'rgba(255, 102, 0, 0.05)',
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.75rem',
                        }}>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#FF6600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    fontWeight: 600,
                                    marginBottom: '0.25rem',
                                }}>
                                    Today&apos;s Workout
                                </div>
                                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
                                    {todaySession.name}
                                </h3>
                            </div>
                            {todayDayNumber !== null && (
                                <span style={{
                                    background: '#FF6600',
                                    color: '#000',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                }}>
                                    Day {todayDayNumber}
                                </span>
                            )}
                        </div>
                        {activePlanName && (
                            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                {activePlanName}
                            </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                {todaySession.exercises?.length || 0} exercises
                            </span>
                            <button
                                data-testid="start-today-workout-btn"
                                onClick={handleStartTodayWorkout}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    background: '#FF6600',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Start
                            </button>
                        </div>
                    </motion.div>
                )}

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

    if (step === 'formCheckerPrompt' && selectedSession) {
        return (
            <FormCheckerPrompt
                session={selectedSession}
                formCheckerEnabled={formCheckerEnabled}
                onToggleFormChecker={handleToggleFormChecker}
                onStart={handleConfirmStart}
                onBack={handleBack}
            />
        );
    }

    if (step === 'active' && selectedSession) {
        return (
            <ActiveWorkout
                session={selectedSession}
                userId={userId}
                onBack={handleBack}
                onComplete={onComplete}
                formCheckerEnabled={formCheckerEnabled}
            />
        );
    }

    return null;
}

// ============================================
// FORM CHECKER PROMPT COMPONENT
// ============================================

interface FormCheckerPromptProps {
    session: WorkoutSession;
    formCheckerEnabled: boolean;
    onToggleFormChecker: (enabled: boolean) => void;
    onStart: () => void;
    onBack: () => void;
}

function FormCheckerPrompt({ session, formCheckerEnabled, onToggleFormChecker, onStart, onBack }: FormCheckerPromptProps) {
    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#FF6600',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    &larr; Back
                </button>
                <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.25rem', margin: 0 }}>
                    Ready to Start
                </h2>
            </div>

            {/* Session Overview */}
            <motion.div
                className="glass-panel"
                style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h3 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.1rem',
                    color: '#FF6600',
                    marginBottom: '0.75rem',
                }}>
                    {session.name}
                </h3>
                {session.description && (
                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {session.description}
                    </p>
                )}
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {session.exercises?.map((ex, i) => (
                        <ExercisePreviewRow key={i} sessionExercise={ex} sets={ex.sets.length} reps={ex.sets[0]?.reps} />
                    ))}
                </div>
            </motion.div>

            {/* Form Checker Toggle */}
            <motion.div
                data-testid="form-checker-prompt"
                className="glass-panel"
                style={{
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    border: formCheckerEnabled ? '1px solid rgba(255, 102, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'border-color 0.2s',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>
                            Real-Time Form Checker
                        </h4>
                        <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            Would you like to enable the real-time form checker? This uses your camera to analyze your form and give feedback during exercises.
                        </p>
                    </div>
                    {/* Toggle Switch */}
                    <button
                        data-testid="form-checker-toggle"
                        role="switch"
                        aria-checked={formCheckerEnabled}
                        onClick={() => onToggleFormChecker(!formCheckerEnabled)}
                        style={{
                            flexShrink: 0,
                            width: '52px',
                            height: '28px',
                            borderRadius: '14px',
                            border: 'none',
                            background: formCheckerEnabled ? '#FF6600' : 'rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                            marginTop: '0.25rem',
                        }}
                    >
                        <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: formCheckerEnabled ? '27px' : '3px',
                            transition: 'left 0.2s',
                        }} />
                    </button>
                </div>
            </motion.div>

            {/* Start Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                <button
                    data-testid="confirm-start-workout-btn"
                    onClick={onStart}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: '#FF6600',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-orbitron)',
                        transition: 'all 0.2s',
                    }}
                >
                    Start Workout
                </button>
            </motion.div>
        </div>
    );
}

// ============================================
// EXERCISE PREVIEW ROW (for form checker prompt)
// ============================================

function ExercisePreviewRow({ sessionExercise, sets, reps }: { sessionExercise: SessionExercise; sets: number; reps?: string }) {
    const [name, setName] = useState<string>(() => {
        // Immediate fallback name from JSONB data
        return buildFallbackExercise(sessionExercise).name;
    });

    useEffect(() => {
        // Try to load the real name from the exercises table
        db.exercises.getById(sessionExercise.exercise_id).then(ex => {
            if (ex) setName(ex.name);
        }).catch(() => {});
    }, [sessionExercise.exercise_id]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
            <span style={{ color: '#ddd', fontSize: '0.9rem' }}>
                {name}
            </span>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                {sets} sets{reps ? ` x ${reps}` : ''}
            </span>
        </div>
    );
}

// ============================================
// ACTIVE WORKOUT COMPONENT
// ============================================

interface ActiveWorkoutProps {
    session: WorkoutSession;
    userId: string;
    onBack: () => void;
    onComplete?: () => void;
    formCheckerEnabled?: boolean;
}

function ActiveWorkout({ session, userId, onBack, onComplete, formCheckerEnabled }: ActiveWorkoutProps) {
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
    const [exerciseLogs, setExerciseLogs] = useState<Map<number, ExerciseLog>>(new Map());
    const [currentSets, setCurrentSets] = useState<LoggedSet[]>([]);
    const [restTimer, setRestTimer] = useState<number>(0);
    const [isResting, setIsResting] = useState(false);
    const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPoseDetection, setShowPoseDetection] = useState(!!formCheckerEnabled);

    const sessionExercise = session.exercises[currentExerciseIndex];

    useEffect(() => {
        initializeWorkout();
        // Set immediate fallback exercise so we don't show a loading spinner
        if (sessionExercise) {
            setCurrentExercise(buildFallbackExercise(sessionExercise));
        }
    }, []);

    useEffect(() => {
        if (sessionExercise) {
            loadExerciseDetails(sessionExercise.exercise_id, sessionExercise);
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

    const loadExerciseDetails = async (exerciseId: string, se?: SessionExercise) => {
        try {
            const exercise = await db.exercises.getById(exerciseId);
            if (exercise) {
                setCurrentExercise(exercise);
            } else if (se) {
                // Fallback: build exercise from JSONB session data
                setCurrentExercise(buildFallbackExercise(se));
            } else {
                // Last resort: parse name from synthetic ID
                setCurrentExercise(buildFallbackExercise({ exercise_id: exerciseId, sets: [], notes: '' }));
            }
        } catch (error) {
            console.error('Error loading exercise:', error);
            // On error, still show fallback
            if (se) {
                setCurrentExercise(buildFallbackExercise(se));
            } else {
                setCurrentExercise(buildFallbackExercise({ exercise_id: exerciseId, sets: [], notes: '' }));
            }
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

                {/* Form Check Toggle */}
                {formCheckerEnabled && (
                    <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                        <button
                            data-testid="pose-toggle-btn"
                            onClick={() => setShowPoseDetection(prev => !prev)}
                            style={{
                                background: showPoseDetection
                                    ? 'rgba(255, 102, 0, 0.15)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${showPoseDetection ? 'rgba(255, 102, 0, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
                                color: showPoseDetection ? '#FF6600' : '#aaa',
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
                )}

                {/* Pose Detection Overlay */}
                {showPoseDetection && formCheckerEnabled && (
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
