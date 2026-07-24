'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import {
    ChevronDown,
    ChevronRight,
    Edit3,
    Check,
    Plus,
    X,
    Trash2,
    Dumbbell,
    Target,
    Zap,
    RotateCcw,
} from 'lucide-react';
import type { GeneratedPlanData, GeneratedSession, GeneratedExercise } from '@/app/api/ai-coach/generate-plan/route';

interface InterviewPlanViewProps {
    plan: GeneratedPlanData;
    onPlanUpdate: (plan: GeneratedPlanData) => void;
    isSaving: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const PHASE_COLORS: Record<string, string> = {
    hypertrophy: 'var(--brand)',
    strength: 'var(--neon-pink)',
    endurance: 'var(--brand)',
    deload: 'var(--warning)',
    power: 'var(--brand-hot)',
    general: 'var(--success)',
};

const PHASE_ICONS: Record<string, typeof Dumbbell> = {
    hypertrophy: Dumbbell,
    strength: Target,
    endurance: Zap,
    deload: RotateCcw,
    power: Zap,
    general: Dumbbell,
};

const setInputClass =
    'w-full rounded border border-line-soft bg-[var(--surface-1)] px-[0.3rem] py-[0.2rem] text-[0.8rem] text-ink-hi outline-none focus:border-brand focus:ring-1 focus:ring-brand';

export default function InterviewPlanView({
    plan,
    onPlanUpdate,
    isSaving,
    saveStatus,
}: InterviewPlanViewProps) {
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [editingExercise, setEditingExercise] = useState<{
        dayNumber: number;
        exerciseIndex: number;
    } | null>(null);

    const updateExercise = useCallback(
        (dayNumber: number, exerciseIndex: number, updates: Partial<GeneratedExercise>) => {
            const updatedSessions = plan.sessions.map((session) => {
                if (session.day_number !== dayNumber) return session;
                const updatedExercises = [...session.exercises];
                updatedExercises[exerciseIndex] = {
                    ...updatedExercises[exerciseIndex],
                    ...updates,
                };
                return { ...session, exercises: updatedExercises };
            });
            onPlanUpdate({ ...plan, sessions: updatedSessions });
        },
        [plan, onPlanUpdate]
    );

    const updateSet = useCallback(
        (
            dayNumber: number,
            exerciseIndex: number,
            setIndex: number,
            field: 'reps' | 'weight' | 'rest_seconds',
            value: string | number
        ) => {
            const updatedSessions = plan.sessions.map((session) => {
                if (session.day_number !== dayNumber) return session;
                const updatedExercises = [...session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };
                const updatedSets = [...exercise.sets];
                updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
                exercise.sets = updatedSets;
                updatedExercises[exerciseIndex] = exercise;
                return { ...session, exercises: updatedExercises };
            });
            onPlanUpdate({ ...plan, sessions: updatedSessions });
        },
        [plan, onPlanUpdate]
    );

    const addSet = useCallback(
        (dayNumber: number, exerciseIndex: number) => {
            const updatedSessions = plan.sessions.map((session) => {
                if (session.day_number !== dayNumber) return session;
                const updatedExercises = [...session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };
                exercise.sets = [...exercise.sets, { reps: '10', weight: 'moderate', rest_seconds: 90 }];
                updatedExercises[exerciseIndex] = exercise;
                return { ...session, exercises: updatedExercises };
            });
            onPlanUpdate({ ...plan, sessions: updatedSessions });
        },
        [plan, onPlanUpdate]
    );

    const removeSet = useCallback(
        (dayNumber: number, exerciseIndex: number, setIndex: number) => {
            const updatedSessions = plan.sessions.map((session) => {
                if (session.day_number !== dayNumber) return session;
                const updatedExercises = [...session.exercises];
                const exercise = { ...updatedExercises[exerciseIndex] };
                exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
                updatedExercises[exerciseIndex] = exercise;
                return { ...session, exercises: updatedExercises };
            });
            onPlanUpdate({ ...plan, sessions: updatedSessions });
        },
        [plan, onPlanUpdate]
    );

    const removeExercise = useCallback(
        (dayNumber: number, exerciseIndex: number) => {
            const updatedSessions = plan.sessions.map((session) => {
                if (session.day_number !== dayNumber) return session;
                return {
                    ...session,
                    exercises: session.exercises.filter((_, i) => i !== exerciseIndex),
                };
            });
            onPlanUpdate({ ...plan, sessions: updatedSessions });
        },
        [plan, onPlanUpdate]
    );

    return (
        <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            data-testid="interview-plan-view"
        >
            {/* Plan Header */}
            <div className="glass-card mb-3 p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-display mb-1 text-base font-bold text-ink-hi">
                            {plan.name}
                        </h3>
                        <p className="mb-2 text-[0.8rem] text-ink-mid">
                            {plan.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded bg-[var(--brand-glow-soft)] px-2 py-[0.15rem] text-[0.7rem] text-brand">
                                {plan.duration_weeks} weeks
                            </span>
                            <span className="rounded bg-[var(--brand-glow-soft)] px-2 py-[0.15rem] text-[0.7rem] text-brand">
                                {plan.sessions.length} days/week
                            </span>
                        </div>
                    </div>
                    <div>
                        {saveStatus === 'saving' || isSaving ? (
                            <span className="text-[0.7rem] text-brand">Saving...</span>
                        ) : saveStatus === 'saved' ? (
                            <span className="flex items-center gap-1">
                                <Check size={12} className="text-[var(--success)]" />
                                <span className="text-[0.7rem] text-[var(--success)]">Saved</span>
                            </span>
                        ) : saveStatus === 'error' ? (
                            <span className="text-[0.7rem] text-destructive">Save failed</span>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Periodization Blocks */}
            {plan.periodization_blocks.length > 1 && (
                <div className="mb-3">
                    <p className="eyebrow mb-2 px-1">
                        Periodization
                    </p>
                    <div className="flex gap-1 overflow-hidden rounded-lg">
                        {plan.periodization_blocks.map((block, i) => {
                            const color = PHASE_COLORS[block.phase_type] || 'var(--brand)';
                            const Icon = PHASE_ICONS[block.phase_type] || Dumbbell;
                            const totalWeeks = plan.periodization_blocks.reduce(
                                (sum, b) => sum + b.phase_duration_weeks,
                                0
                            );
                            const widthPercent = (block.phase_duration_weeks / totalWeeks) * 100;

                            return (
                                <div
                                    key={i}
                                    className={`flex flex-col items-center gap-[0.15rem] px-[0.35rem] py-2 ${
                                        i === 0
                                            ? 'rounded-l-lg'
                                            : i === plan.periodization_blocks.length - 1
                                            ? 'rounded-r-lg'
                                            : ''
                                    }`}
                                    style={{
                                        flex: `0 0 ${widthPercent}%`,
                                        background: `color-mix(in srgb, ${color} 8%, transparent)`,
                                        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                                    }}
                                >
                                    <Icon size={12} style={{ color }} />
                                    <span className="text-[0.6rem] font-semibold" style={{ color }}>
                                        {block.label}
                                    </span>
                                    <span className="text-[0.55rem] opacity-70" style={{ color }}>
                                        {block.phase_duration_weeks}w
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Session Cards */}
            <div className="flex flex-col items-stretch gap-2">
                <p className="eyebrow px-1">
                    Weekly Schedule
                </p>

                {plan.sessions.map((session) => (
                    <SessionCard
                        key={session.day_number}
                        session={session}
                        isExpanded={expandedDay === session.day_number}
                        onToggle={() =>
                            setExpandedDay(
                                expandedDay === session.day_number ? null : session.day_number
                            )
                        }
                        editingExercise={editingExercise}
                        onEditExercise={(exerciseIndex) =>
                            setEditingExercise(
                                editingExercise?.dayNumber === session.day_number &&
                                    editingExercise?.exerciseIndex === exerciseIndex
                                    ? null
                                    : { dayNumber: session.day_number, exerciseIndex }
                            )
                        }
                        onUpdateExercise={(exerciseIndex, updates) =>
                            updateExercise(session.day_number, exerciseIndex, updates)
                        }
                        onUpdateSet={(exerciseIndex, setIndex, field, value) =>
                            updateSet(session.day_number, exerciseIndex, setIndex, field, value)
                        }
                        onAddSet={(exerciseIndex) => addSet(session.day_number, exerciseIndex)}
                        onRemoveSet={(exerciseIndex, setIndex) =>
                            removeSet(session.day_number, exerciseIndex, setIndex)
                        }
                        onRemoveExercise={(exerciseIndex) =>
                            removeExercise(session.day_number, exerciseIndex)
                        }
                    />
                ))}
            </div>

            {/* Edit hint */}
            <p className="mt-3 text-center text-[0.7rem] italic text-ink-low">
                Tap any day to expand. Use the edit icon to modify exercises, sets, reps, and weights.
            </p>
        </motion.div>
    );
}

// ============================================
// SESSION CARD
// ============================================

interface SessionCardProps {
    session: GeneratedSession;
    isExpanded: boolean;
    onToggle: () => void;
    editingExercise: { dayNumber: number; exerciseIndex: number } | null;
    onEditExercise: (exerciseIndex: number) => void;
    onUpdateExercise: (exerciseIndex: number, updates: Partial<GeneratedExercise>) => void;
    onUpdateSet: (
        exerciseIndex: number,
        setIndex: number,
        field: 'reps' | 'weight' | 'rest_seconds',
        value: string | number
    ) => void;
    onAddSet: (exerciseIndex: number) => void;
    onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
    onRemoveExercise: (exerciseIndex: number) => void;
}

function SessionCard({
    session,
    isExpanded,
    onToggle,
    editingExercise,
    onEditExercise,
    onUpdateExercise,
    onUpdateSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
}: SessionCardProps) {
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayLabel = session.day_number <= 7
        ? DAY_LABELS[session.day_number - 1]
        : `Day ${session.day_number}`;

    return (
        <div>
            <button
                onClick={onToggle}
                data-testid={`session-day-${session.day_number}`}
                className={`flex w-full cursor-pointer items-center gap-3 border p-3 text-left text-foreground transition-all duration-200 ${
                    isExpanded
                        ? 'rounded-t-[10px] border-brand/25 bg-[var(--brand-glow-soft)]'
                        : 'rounded-[10px] border-line-soft bg-[var(--surface-1)] hover:border-line-strong'
                }`}
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-[var(--brand-glow-soft)] text-xs font-semibold text-brand">
                    {dayLabel}
                </span>
                <span className="flex-1">
                    <span className="block text-[0.9rem] font-medium text-ink-hi">
                        {session.name}
                    </span>
                    <span className="block text-xs text-ink-low">
                        {session.exercises.length} exercises
                    </span>
                </span>
                {isExpanded ? (
                    <ChevronDown size={16} className="text-ink-low" />
                ) : (
                    <ChevronRight size={16} className="text-ink-low" />
                )}
            </button>

            {/* Expanded Exercises */}
            {isExpanded && (
                <div className="rounded-b-[10px] border border-t-0 border-brand/25 bg-[var(--surface-1)] p-3">
                    <div className="flex flex-col items-stretch gap-2">
                        {session.exercises.map((exercise, exIdx) => {
                            const isEditing =
                                editingExercise?.dayNumber === session.day_number &&
                                editingExercise?.exerciseIndex === exIdx;

                            return (
                                <ExerciseCard
                                    key={`${session.day_number}-${exIdx}`}
                                    exercise={exercise}
                                    isEditing={isEditing}
                                    onEdit={() => onEditExercise(exIdx)}
                                    onUpdateExercise={(updates) => onUpdateExercise(exIdx, updates)}
                                    onUpdateSet={(setIndex, field, value) =>
                                        onUpdateSet(exIdx, setIndex, field, value)
                                    }
                                    onAddSet={() => onAddSet(exIdx)}
                                    onRemoveSet={(setIndex) => onRemoveSet(exIdx, setIndex)}
                                    onRemoveExercise={() => onRemoveExercise(exIdx)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// EXERCISE CARD
// ============================================

interface ExerciseCardProps {
    exercise: GeneratedExercise;
    isEditing: boolean;
    onEdit: () => void;
    onUpdateExercise: (updates: Partial<GeneratedExercise>) => void;
    onUpdateSet: (
        setIndex: number,
        field: 'reps' | 'weight' | 'rest_seconds',
        value: string | number
    ) => void;
    onAddSet: () => void;
    onRemoveSet: (setIndex: number) => void;
    onRemoveExercise: () => void;
}

function ExerciseCard({
    exercise,
    isEditing,
    onEdit,
    onUpdateExercise,
    onUpdateSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
}: ExerciseCardProps) {
    return (
        <div
            className={`rounded-lg border p-[0.6rem] transition-all duration-200 ${
                isEditing
                    ? 'border-brand/30 bg-[var(--surface-2)]'
                    : 'border-line-soft bg-[var(--surface-1)]'
            }`}
            data-testid="exercise-card"
        >
            {/* Exercise Header */}
            <div className="mb-[0.4rem] flex items-center justify-between">
                <div className="flex-1">
                    {isEditing ? (
                        <input
                            value={exercise.exercise_name}
                            onChange={(e) =>
                                onUpdateExercise({ exercise_name: e.target.value })
                            }
                            data-testid="exercise-name-input"
                            className="w-full rounded border border-line-soft bg-[var(--surface-1)] px-[0.4rem] py-1 text-[0.85rem] font-semibold text-ink-hi outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                        />
                    ) : (
                        <p className="text-[0.85rem] font-semibold text-ink-hi">
                            {exercise.exercise_name}
                        </p>
                    )}
                </div>
                <div className="ml-2 flex gap-[0.2rem]">
                    <button
                        onClick={onEdit}
                        data-testid="edit-exercise-btn"
                        className={`cursor-pointer rounded-md border-none p-[0.3rem] transition-all duration-200 ${
                            isEditing
                                ? 'bg-[var(--brand-glow-soft)] text-brand'
                                : 'bg-[var(--surface-2)] text-ink-low hover:text-brand'
                        }`}
                    >
                        {isEditing ? <Check size={12} /> : <Edit3 size={12} />}
                    </button>
                    {isEditing && (
                        <button
                            onClick={onRemoveExercise}
                            data-testid="remove-exercise-btn"
                            className="cursor-pointer rounded-md border-none bg-destructive/10 p-[0.3rem] text-destructive"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sets Table */}
            <div>
                {/* Header */}
                <div
                    className={`grid gap-[0.4rem] border-b border-line-soft py-[0.2rem] text-[0.6rem] uppercase tracking-wider text-ink-low ${
                        isEditing
                            ? 'grid-cols-[24px_1fr_1fr_1fr_24px]'
                            : 'grid-cols-[24px_1fr_1fr_1fr]'
                    }`}
                >
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span>Rest</span>
                    {isEditing && <span />}
                </div>

                {/* Set Rows */}
                {exercise.sets.map((set, setIdx) => (
                    <div
                        key={setIdx}
                        className={`grid items-center gap-[0.4rem] py-[0.3rem] ${
                            isEditing
                                ? 'grid-cols-[24px_1fr_1fr_1fr_24px]'
                                : 'grid-cols-[24px_1fr_1fr_1fr]'
                        } ${
                            setIdx < exercise.sets.length - 1
                                ? 'border-b border-line-soft'
                                : ''
                        }`}
                    >
                        <span className="text-xs font-semibold text-brand">
                            {setIdx + 1}
                        </span>

                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={set.reps}
                                    onChange={(e) =>
                                        onUpdateSet(setIdx, 'reps', e.target.value)
                                    }
                                    className={setInputClass}
                                />
                                <input
                                    type="text"
                                    value={set.weight}
                                    onChange={(e) =>
                                        onUpdateSet(setIdx, 'weight', e.target.value)
                                    }
                                    className={setInputClass}
                                />
                                <input
                                    type="number"
                                    value={set.rest_seconds}
                                    onChange={(e) =>
                                        onUpdateSet(
                                            setIdx,
                                            'rest_seconds',
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    className={setInputClass}
                                />
                                <button
                                    onClick={() => onRemoveSet(setIdx)}
                                    className="flex cursor-pointer items-center justify-center border-none bg-transparent p-[0.15rem] text-destructive"
                                >
                                    <X size={10} />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-[0.8rem] text-ink-hi">{set.reps}</span>
                                <span className="text-[0.8rem] text-ink-mid">
                                    {set.weight || '--'}
                                </span>
                                <span className="text-[0.8rem] text-ink-low">
                                    {set.rest_seconds ? `${set.rest_seconds}s` : '--'}
                                </span>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Set (editing) */}
            {isEditing && (
                <button
                    onClick={onAddSet}
                    data-testid="add-set-btn"
                    className="mt-[0.4rem] flex w-full cursor-pointer items-center justify-center gap-[0.2rem] rounded border border-dashed border-line-soft bg-transparent p-[0.3rem] text-[0.7rem] text-ink-low transition-colors hover:border-brand/40 hover:text-brand"
                >
                    <Plus size={10} />
                    Add Set
                </button>
            )}

            {/* Notes */}
            {isEditing ? (
                <div className="mt-[0.4rem]">
                    <input
                        type="text"
                        value={exercise.notes}
                        onChange={(e) => onUpdateExercise({ notes: e.target.value })}
                        data-testid="exercise-notes-input"
                        className="w-full rounded border border-line-soft bg-[var(--surface-1)] px-[0.4rem] py-[0.2rem] text-xs text-ink-hi outline-none placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand"
                        placeholder="Notes (form cues, tempo, intensifiers)..."
                    />
                </div>
            ) : exercise.notes ? (
                <p className="mt-[0.3rem] text-[0.7rem] italic text-ink-low">
                    {exercise.notes}
                </p>
            ) : null}
        </div>
    );
}
