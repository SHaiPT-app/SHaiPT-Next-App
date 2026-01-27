'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Edit3,
    Check,
    X,
    Dumbbell,
    Calendar,
    Target,
    Zap,
    RotateCcw,
    RefreshCw,
    Plus,
    Trash2,
    Save,
} from 'lucide-react';
import type {
    Profile,
    TrainingPlan,
    TrainingPlanSession,
    TrainingPlanAssignment,
    WorkoutSession,
    SessionExercise,
    SessionSet,
    Exercise,
    PhaseType,
} from '@/lib/types';

// ============================================
// TYPES
// ============================================

type BlockType = PhaseType;

interface ViewerBlock {
    type: BlockType;
    weekStart: number;
    weekEnd: number;
    label: string;
}

interface ResolvedPlanSession extends TrainingPlanSession {
    session?: WorkoutSession;
}

// ============================================
// CONSTANTS
// ============================================

const BLOCK_COLORS: Record<BlockType, string> = {
    hypertrophy: '#39ff14',
    strength: '#ff007f',
    endurance: '#00d4ff',
    deload: '#f59e0b',
    power: '#c084fc',
    general: '#6ee7b7',
};

const BLOCK_ICONS: Record<BlockType, typeof Dumbbell> = {
    hypertrophy: Dumbbell,
    strength: Target,
    endurance: Zap,
    deload: RotateCcw,
    power: Zap,
    general: Dumbbell,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================
// HELPER FUNCTIONS
// ============================================

function inferBlocksFromPlan(plan: TrainingPlan): ViewerBlock[] {
    const weeks = plan.duration_weeks || 4;

    // Use stored periodization_blocks if available
    if (plan.periodization_blocks && plan.periodization_blocks.length > 0) {
        let weekCursor = 1;
        return plan.periodization_blocks.map(block => {
            const start = weekCursor;
            const end = weekCursor + block.phase_duration_weeks - 1;
            weekCursor = end + 1;
            return {
                type: block.phase_type,
                weekStart: start,
                weekEnd: Math.min(end, weeks),
                label: block.label,
            };
        });
    }

    // Fallback: single phase_type if set
    if (plan.phase_type) {
        return [{
            type: plan.phase_type,
            weekStart: 1,
            weekEnd: weeks,
            label: plan.phase_type.charAt(0).toUpperCase() + plan.phase_type.slice(1),
        }];
    }

    const tags = plan.tags || [];

    // Check if plan tags contain block definitions like "block:hypertrophy:1-4"
    const blockTags = tags.filter(t => t.startsWith('block:'));
    if (blockTags.length > 0) {
        return blockTags.map(tag => {
            const parts = tag.split(':');
            const type = parts[1] as BlockType;
            const range = parts[2]?.split('-') || ['1', String(weeks)];
            return {
                type,
                weekStart: parseInt(range[0]),
                weekEnd: parseInt(range[1]),
                label: type.charAt(0).toUpperCase() + type.slice(1),
            };
        }).sort((a, b) => a.weekStart - b.weekStart);
    }

    // Default periodization: split duration into blocks
    if (weeks <= 4) {
        return [{ type: 'hypertrophy', weekStart: 1, weekEnd: weeks, label: 'Hypertrophy' }];
    }

    if (weeks <= 8) {
        const mid = Math.floor(weeks / 2);
        return [
            { type: 'hypertrophy', weekStart: 1, weekEnd: mid, label: 'Hypertrophy' },
            { type: 'strength', weekStart: mid + 1, weekEnd: weeks - 1, label: 'Strength' },
            { type: 'deload', weekStart: weeks, weekEnd: weeks, label: 'Deload' },
        ];
    }

    // Longer plans: hypertrophy -> strength -> endurance -> deload pattern
    const blockSize = Math.floor(weeks / 4);
    const remainder = weeks - blockSize * 4;
    return [
        { type: 'hypertrophy', weekStart: 1, weekEnd: blockSize + (remainder > 0 ? 1 : 0), label: 'Hypertrophy' },
        { type: 'strength', weekStart: blockSize + (remainder > 0 ? 2 : 1), weekEnd: blockSize * 2 + (remainder > 1 ? 1 : 0), label: 'Strength' },
        { type: 'endurance', weekStart: blockSize * 2 + (remainder > 1 ? 2 : 1), weekEnd: blockSize * 3 + (remainder > 2 ? 1 : 0), label: 'Endurance' },
        { type: 'deload', weekStart: blockSize * 3 + (remainder > 2 ? 2 : 1), weekEnd: weeks, label: 'Deload' },
    ];
}

function getBlockForWeek(blocks: ViewerBlock[], week: number): ViewerBlock | undefined {
    return blocks.find(b => week >= b.weekStart && week <= b.weekEnd);
}

function getWeeksArray(totalWeeks: number): number[] {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PlansViewerPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Plan data
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
    const [activeAssignment, setActiveAssignment] = useState<TrainingPlanAssignment | null>(null);
    const [planSessions, setPlanSessions] = useState<ResolvedPlanSession[]>([]);
    const [blocks, setBlocks] = useState<ViewerBlock[]>([]);
    const [exerciseCache, setExerciseCache] = useState<Record<string, Exercise>>({});

    // UI state
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [editingExercise, setEditingExercise] = useState<{
        sessionId: string;
        exerciseIndex: number;
    } | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            setLoading(false);
        }
    }, []);

    // Load plans and active assignment
    const loadPlanData = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            // Fetch user's plans
            const userPlans = await db.trainingPlans.getByCreator(userId);
            setPlans(userPlans);

            // Check for active assignment
            let assignment: TrainingPlanAssignment | null = null;
            try {
                assignment = await db.trainingPlanAssignments.getActiveByUser(userId);
            } catch {
                // No active assignment
            }

            let plan: TrainingPlan | null = null;

            if (assignment) {
                setActiveAssignment(assignment);
                plan = await db.trainingPlans.getById(assignment.plan_id);
            } else if (userPlans.length > 0) {
                // Fall back to most recent plan
                plan = userPlans[0];
            }

            if (plan) {
                setActivePlan(plan);
                const inferredBlocks = inferBlocksFromPlan(plan);
                setBlocks(inferredBlocks);

                // Load plan sessions with workout session details
                const sessions = await db.trainingPlanSessions.getByPlan(plan.id);
                const sessionIds = [...new Set(sessions.map(s => s.session_id))];
                const sessionDetails = await Promise.all(
                    sessionIds.map(id => db.workoutSessions.getById(id))
                );

                const sessionMap = new Map<string, WorkoutSession>();
                sessionDetails.forEach(s => {
                    if (s) sessionMap.set(s.id, s);
                });

                const resolved: ResolvedPlanSession[] = sessions.map(s => ({
                    ...s,
                    session: sessionMap.get(s.session_id),
                }));
                setPlanSessions(resolved);

                // Cache exercise details
                const exerciseIds = new Set<string>();
                sessionDetails.forEach(s => {
                    if (s) {
                        s.exercises.forEach(ex => exerciseIds.add(ex.exercise_id));
                    }
                });

                const exerciseDetails = await Promise.all(
                    [...exerciseIds].map(id => db.exercises.getById(id))
                );
                const cache: Record<string, Exercise> = {};
                exerciseDetails.forEach(ex => {
                    if (ex) cache[ex.exercise_id] = ex;
                });
                setExerciseCache(cache);
            }
        } catch (error) {
            console.error('Error loading plan data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadPlanData(user.id);
        }
    }, [user?.id, loadPlanData]);

    // Get sessions for a specific day
    const getSessionsForDay = (dayNumber: number): ResolvedPlanSession[] => {
        return planSessions.filter(ps => ps.day_number === dayNumber);
    };

    // Handle exercise field edits
    const updateExerciseField = (
        sessionId: string,
        exerciseIndex: number,
        field: keyof SessionExercise | 'set_update',
        value: unknown,
        setIndex?: number,
        setField?: keyof SessionSet
    ) => {
        setPlanSessions(prev =>
            prev.map(ps => {
                if (ps.session?.id !== sessionId) return ps;
                if (!ps.session) return ps;

                const updatedExercises = [...ps.session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };

                if (field === 'set_update' && setIndex !== undefined && setField) {
                    const updatedSets = [...exercise.sets];
                    updatedSets[setIndex] = { ...updatedSets[setIndex], [setField]: value };
                    exercise.sets = updatedSets;
                } else if (field !== 'set_update') {
                    (exercise as Record<string, unknown>)[field] = value;
                }

                updatedExercises[exerciseIndex] = exercise;

                return {
                    ...ps,
                    session: {
                        ...ps.session,
                        exercises: updatedExercises,
                    },
                };
            })
        );
        setHasUnsavedChanges(true);
    };

    // Add a set to an exercise
    const addSet = (sessionId: string, exerciseIndex: number) => {
        setPlanSessions(prev =>
            prev.map(ps => {
                if (ps.session?.id !== sessionId) return ps;
                if (!ps.session) return ps;

                const updatedExercises = [...ps.session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };
                exercise.sets = [...exercise.sets, { reps: '10', weight: '', rest_seconds: 90 }];
                updatedExercises[exerciseIndex] = exercise;

                return {
                    ...ps,
                    session: { ...ps.session, exercises: updatedExercises },
                };
            })
        );
        setHasUnsavedChanges(true);
    };

    // Remove a set from an exercise
    const removeSet = (sessionId: string, exerciseIndex: number, setIndex: number) => {
        setPlanSessions(prev =>
            prev.map(ps => {
                if (ps.session?.id !== sessionId) return ps;
                if (!ps.session) return ps;

                const updatedExercises = [...ps.session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };
                exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
                updatedExercises[exerciseIndex] = exercise;

                return {
                    ...ps,
                    session: { ...ps.session, exercises: updatedExercises },
                };
            })
        );
        setHasUnsavedChanges(true);
    };

    // Remove an exercise from a session
    const removeExercise = (sessionId: string, exerciseIndex: number) => {
        setPlanSessions(prev =>
            prev.map(ps => {
                if (ps.session?.id !== sessionId) return ps;
                if (!ps.session) return ps;

                const updatedExercises = ps.session.exercises.filter((_, i) => i !== exerciseIndex);

                return {
                    ...ps,
                    session: { ...ps.session, exercises: updatedExercises },
                };
            })
        );
        setHasUnsavedChanges(true);
    };

    // Save changes
    const handleSave = async () => {
        if (!activePlan) return;
        setSaving(true);

        try {
            // Update each modified workout session
            const uniqueSessions = new Map<string, WorkoutSession>();
            planSessions.forEach(ps => {
                if (ps.session) {
                    uniqueSessions.set(ps.session.id, ps.session);
                }
            });

            await Promise.all(
                [...uniqueSessions.values()].map(session =>
                    db.workoutSessions.update(session.id, {
                        exercises: session.exercises,
                    })
                )
            );

            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Switch active plan
    const handlePlanSwitch = async (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        setActivePlan(plan);
        setBlocks(inferBlocksFromPlan(plan));
        setSelectedWeek(1);
        setExpandedDay(null);
        setEditingExercise(null);

        try {
            const sessions = await db.trainingPlanSessions.getByPlan(plan.id);
            const sessionIds = [...new Set(sessions.map(s => s.session_id))];
            const sessionDetails = await Promise.all(
                sessionIds.map(id => db.workoutSessions.getById(id))
            );

            const sessionMap = new Map<string, WorkoutSession>();
            sessionDetails.forEach(s => {
                if (s) sessionMap.set(s.id, s);
            });

            const resolved: ResolvedPlanSession[] = sessions.map(s => ({
                ...s,
                session: sessionMap.get(s.session_id),
            }));
            setPlanSessions(resolved);

            // Update exercise cache
            const exerciseIds = new Set<string>();
            sessionDetails.forEach(s => {
                if (s) {
                    s.exercises.forEach(ex => exerciseIds.add(ex.exercise_id));
                }
            });

            const newExercises = [...exerciseIds].filter(id => !exerciseCache[id]);
            if (newExercises.length > 0) {
                const details = await Promise.all(
                    newExercises.map(id => db.exercises.getById(id))
                );
                const newCache = { ...exerciseCache };
                details.forEach(ex => {
                    if (ex) newCache[ex.exercise_id] = ex;
                });
                setExerciseCache(newCache);
            }
        } catch (error) {
            console.error('Error switching plan:', error);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // No plans state
    if (!activePlan) {
        return (
            <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => router.push('/home')}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.5rem',
                        color: '#39ff14',
                        margin: 0,
                    }}>
                        Training Plans
                    </h1>
                </div>

                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <Dumbbell size={48} style={{ color: '#555', marginBottom: '1rem' }} />
                    <p style={{ color: '#888', marginBottom: '1rem', fontSize: '1.1rem' }}>
                        No training plans yet
                    </p>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Create a periodized plan to structure your training.
                    </p>
                    <button
                        className="btn-primary"
                        onClick={() => router.push('/plans/new')}
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        Create Your First Plan
                    </button>
                </div>
            </div>
        );
    }

    const totalWeeks = activePlan.duration_weeks || 4;
    const currentBlock = getBlockForWeek(blocks, selectedWeek);
    const currentBlockColor = currentBlock ? BLOCK_COLORS[currentBlock.type] : '#39ff14';
    const scheduleType = activePlan.tags?.find(t => t.startsWith('schedule:'))?.split(':')[1] || 'weekly';
    const daysInCycle = scheduleType === 'weekly' ? 7 : parseInt(activePlan.tags?.find(t => t.startsWith('cycle:'))?.split(':')[1] || '7');

    return (
        <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => router.push('/home')}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.5rem',
                        color: '#39ff14',
                        margin: 0,
                    }}>
                        Training Plans
                    </h1>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => router.push('/plans/new')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: '#39ff14',
                        color: '#000',
                    }}
                >
                    + New Plan
                </button>
            </div>

            {/* Plan Selector */}
            {plans.length > 1 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <select
                        value={activePlan.id}
                        onChange={(e) => handlePlanSwitch(e.target.value)}
                        className="input-field"
                        style={{
                            margin: 0,
                            cursor: 'pointer',
                            appearance: 'auto',
                        }}
                    >
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.id === activeAssignment?.plan_id ? '(Active)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Plan Info Card */}
            <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            {activePlan.name}
                        </h2>
                        {activePlan.description && (
                            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                {activePlan.description}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                                padding: '0.2rem 0.6rem',
                                background: 'rgba(57, 255, 20, 0.1)',
                                color: '#39ff14',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                            }}>
                                {totalWeeks} Weeks
                            </span>
                            {activeAssignment && (
                                <span style={{
                                    padding: '0.2rem 0.6rem',
                                    background: 'rgba(57, 255, 20, 0.15)',
                                    color: '#39ff14',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                }}>
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/plans/new?edit=${activePlan.id}`)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            color: '#ccc',
                        }}
                        title="Edit plan structure"
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
            </div>

            {/* Periodization Timeline */}
            {blocks.length > 1 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Periodization Blocks
                    </h3>
                    <div style={{ display: 'flex', gap: '4px', borderRadius: '8px', overflow: 'hidden' }}>
                        {blocks.map((block, i) => {
                            const BlockIcon = BLOCK_ICONS[block.type];
                            const widthPercent = ((block.weekEnd - block.weekStart + 1) / totalWeeks) * 100;
                            const isSelected = selectedWeek >= block.weekStart && selectedWeek <= block.weekEnd;

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedWeek(block.weekStart)}
                                    style={{
                                        flex: `0 0 ${widthPercent}%`,
                                        background: isSelected
                                            ? `${BLOCK_COLORS[block.type]}22`
                                            : 'rgba(255,255,255,0.03)',
                                        border: isSelected
                                            ? `1px solid ${BLOCK_COLORS[block.type]}66`
                                            : '1px solid rgba(255,255,255,0.05)',
                                        padding: '0.75rem 0.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        transition: 'all 0.2s',
                                        color: BLOCK_COLORS[block.type],
                                        borderRadius: i === 0 ? '8px 0 0 8px' : i === blocks.length - 1 ? '0 8px 8px 0' : '0',
                                    }}
                                >
                                    <BlockIcon size={16} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{block.label}</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                        W{block.weekStart}-{block.weekEnd}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Week Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Week View
                </h3>
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {getWeeksArray(totalWeeks).map(week => {
                        const weekBlock = getBlockForWeek(blocks, week);
                        const color = weekBlock ? BLOCK_COLORS[weekBlock.type] : '#39ff14';
                        const isSelected = week === selectedWeek;

                        return (
                            <button
                                key={week}
                                onClick={() => {
                                    setSelectedWeek(week);
                                    setExpandedDay(null);
                                }}
                                style={{
                                    minWidth: '44px',
                                    height: '44px',
                                    borderRadius: '10px',
                                    border: isSelected ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
                                    background: isSelected ? `${color}22` : 'rgba(255,255,255,0.03)',
                                    color: isSelected ? color : '#888',
                                    cursor: 'pointer',
                                    fontWeight: isSelected ? 700 : 400,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                {week}
                            </button>
                        );
                    })}
                </div>
                {currentBlock && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: currentBlockColor,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <Calendar size={14} />
                        Week {selectedWeek} - {currentBlock.label} Block
                    </div>
                )}
            </div>

            {/* Weekly Split View */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {Array.from({ length: daysInCycle }, (_, i) => i + 1).map(dayNumber => {
                    const daySessions = getSessionsForDay(dayNumber);
                    const isExpanded = expandedDay === dayNumber;
                    const dayLabel = scheduleType === 'weekly' && dayNumber <= 7
                        ? DAY_LABELS[dayNumber - 1]
                        : `Day ${dayNumber}`;
                    const hasSession = daySessions.length > 0 && daySessions.some(s => s.session);

                    return (
                        <div key={dayNumber}>
                            <button
                                onClick={() => setExpandedDay(isExpanded ? null : dayNumber)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    background: isExpanded
                                        ? `${currentBlockColor}11`
                                        : 'rgba(255,255,255,0.03)',
                                    border: isExpanded
                                        ? `1px solid ${currentBlockColor}33`
                                        : '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: 'var(--foreground)',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: hasSession ? `${currentBlockColor}22` : 'rgba(255,255,255,0.05)',
                                    color: hasSession ? currentBlockColor : '#555',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    flexShrink: 0,
                                }}>
                                    {dayLabel.slice(0, 3)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                                        {hasSession
                                            ? daySessions.map(s => s.session?.name).filter(Boolean).join(', ')
                                            : 'Rest Day'}
                                    </div>
                                    {hasSession && (
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.15rem' }}>
                                            {daySessions.reduce((acc, s) => acc + (s.session?.exercises.length || 0), 0)} exercises
                                        </div>
                                    )}
                                </div>
                                {hasSession && (
                                    isExpanded
                                        ? <ChevronDown size={18} style={{ color: '#888' }} />
                                        : <ChevronRight size={18} style={{ color: '#888' }} />
                                )}
                            </button>

                            {/* Expanded Day Detail */}
                            {isExpanded && hasSession && (
                                <div style={{
                                    border: `1px solid ${currentBlockColor}33`,
                                    borderTop: 'none',
                                    borderRadius: '0 0 12px 12px',
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.02)',
                                }}>
                                    {daySessions.map(ps => {
                                        if (!ps.session) return null;
                                        const session = ps.session;

                                        return (
                                            <div key={ps.id}>
                                                {/* Exercise List */}
                                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                    {session.exercises.map((exercise, exIdx) => {
                                                        const exDetail = exerciseCache[exercise.exercise_id];
                                                        const isEditing =
                                                            editingExercise?.sessionId === session.id &&
                                                            editingExercise?.exerciseIndex === exIdx;

                                                        return (
                                                            <ExerciseCard
                                                                key={`${session.id}-${exIdx}`}
                                                                exercise={exercise}
                                                                exerciseDetail={exDetail}
                                                                exerciseIndex={exIdx}
                                                                sessionId={session.id}
                                                                isEditing={isEditing}
                                                                blockColor={currentBlockColor}
                                                                onEdit={() =>
                                                                    setEditingExercise(
                                                                        isEditing
                                                                            ? null
                                                                            : { sessionId: session.id, exerciseIndex: exIdx }
                                                                    )
                                                                }
                                                                onUpdateField={updateExerciseField}
                                                                onAddSet={addSet}
                                                                onRemoveSet={removeSet}
                                                                onRemoveExercise={removeExercise}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating Save Button */}
            {hasUnsavedChanges && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 100,
                }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '1rem 2rem',
                            borderRadius: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: '#39ff14',
                            color: '#000',
                            border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 20px rgba(57, 255, 20, 0.3)',
                            transition: 'all 0.2s',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving
                            ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// EXERCISE CARD COMPONENT
// ============================================

interface ExerciseCardProps {
    exercise: SessionExercise;
    exerciseDetail?: Exercise;
    exerciseIndex: number;
    sessionId: string;
    isEditing: boolean;
    blockColor: string;
    onEdit: () => void;
    onUpdateField: (
        sessionId: string,
        exerciseIndex: number,
        field: keyof SessionExercise | 'set_update',
        value: unknown,
        setIndex?: number,
        setField?: keyof SessionSet
    ) => void;
    onAddSet: (sessionId: string, exerciseIndex: number) => void;
    onRemoveSet: (sessionId: string, exerciseIndex: number, setIndex: number) => void;
    onRemoveExercise: (sessionId: string, exerciseIndex: number) => void;
}

function ExerciseCard({
    exercise,
    exerciseDetail,
    exerciseIndex,
    sessionId,
    isEditing,
    blockColor,
    onEdit,
    onUpdateField,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
}: ExerciseCardProps) {
    const exerciseName = exerciseDetail?.name || exercise.exercise_id;
    const targetMuscles = exerciseDetail?.target_muscles?.join(', ') || '';

    return (
        <div
            style={{
                background: isEditing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: isEditing ? `1px solid ${blockColor}44` : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '0.75rem',
                transition: 'all 0.2s',
            }}
        >
            {/* Exercise Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{exerciseName}</div>
                    {targetMuscles && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.1rem' }}>
                            {targetMuscles}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                        onClick={onEdit}
                        style={{
                            background: isEditing ? `${blockColor}22` : 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.35rem',
                            cursor: 'pointer',
                            color: isEditing ? blockColor : '#888',
                            transition: 'all 0.2s',
                        }}
                        title={isEditing ? 'Close editor' : 'Edit exercise'}
                    >
                        {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                    </button>
                    {isEditing && (
                        <button
                            onClick={() => onRemoveExercise(sessionId, exerciseIndex)}
                            style={{
                                background: 'rgba(255, 68, 68, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem',
                                cursor: 'pointer',
                                color: '#ff4444',
                                transition: 'all 0.2s',
                            }}
                            title="Remove exercise"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sets Display */}
            <div style={{ display: 'grid', gap: '0.25rem' }}>
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isEditing ? '30px 1fr 1fr 1fr 30px' : '30px 1fr 1fr 1fr',
                        gap: '0.5rem',
                        padding: '0.25rem 0',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.7rem',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span>Rest</span>
                    {isEditing && <span></span>}
                </div>

                {/* Set Rows */}
                {exercise.sets.map((set, setIdx) => (
                    <div
                        key={setIdx}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: isEditing ? '30px 1fr 1fr 1fr 30px' : '30px 1fr 1fr 1fr',
                            gap: '0.5rem',
                            padding: '0.35rem 0',
                            alignItems: 'center',
                            borderBottom: setIdx < exercise.sets.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        }}
                    >
                        <span style={{ color: blockColor, fontWeight: 600, fontSize: '0.8rem' }}>
                            {setIdx + 1}
                        </span>

                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={set.reps}
                                    onChange={(e) =>
                                        onUpdateField(sessionId, exerciseIndex, 'set_update', e.target.value, setIdx, 'reps')
                                    }
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        padding: '0.3rem 0.4rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.85rem',
                                        width: '100%',
                                    }}
                                    placeholder="10"
                                />
                                <input
                                    type="text"
                                    value={set.weight || ''}
                                    onChange={(e) =>
                                        onUpdateField(sessionId, exerciseIndex, 'set_update', e.target.value, setIdx, 'weight')
                                    }
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        padding: '0.3rem 0.4rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.85rem',
                                        width: '100%',
                                    }}
                                    placeholder="lbs"
                                />
                                <input
                                    type="number"
                                    value={set.rest_seconds || ''}
                                    onChange={(e) =>
                                        onUpdateField(sessionId, exerciseIndex, 'set_update', parseInt(e.target.value) || 0, setIdx, 'rest_seconds')
                                    }
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        padding: '0.3rem 0.4rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.85rem',
                                        width: '100%',
                                    }}
                                    placeholder="90"
                                />
                                <button
                                    onClick={() => onRemoveSet(sessionId, exerciseIndex, setIdx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#ff4444',
                                        padding: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Remove set"
                                >
                                    <X size={12} />
                                </button>
                            </>
                        ) : (
                            <>
                                <span style={{ fontSize: '0.85rem' }}>{set.reps}</span>
                                <span style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                    {set.weight || '--'}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                                    {set.rest_seconds ? `${set.rest_seconds}s` : '--'}
                                </span>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Set Button (when editing) */}
            {isEditing && (
                <button
                    onClick={() => onAddSet(sessionId, exerciseIndex)}
                    style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        padding: '0.4rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s',
                    }}
                >
                    <Plus size={12} />
                    Add Set
                </button>
            )}

            {/* Notes */}
            {isEditing ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <input
                        type="text"
                        value={exercise.notes || ''}
                        onChange={(e) =>
                            onUpdateField(sessionId, exerciseIndex, 'notes', e.target.value)
                        }
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            padding: '0.3rem 0.5rem',
                            color: 'var(--foreground)',
                            fontSize: '0.8rem',
                        }}
                        placeholder="Add notes (e.g., drop sets, tempo, intensifiers)..."
                    />
                </div>
            ) : (
                exercise.notes && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                        {exercise.notes}
                    </div>
                )
            )}
        </div>
    );
}
