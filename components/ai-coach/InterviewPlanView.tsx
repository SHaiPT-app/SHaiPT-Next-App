'use client';

import { useState, useCallback } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
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

const MotionBox = motion.create(Box);

interface InterviewPlanViewProps {
    plan: GeneratedPlanData;
    onPlanUpdate: (plan: GeneratedPlanData) => void;
    isSaving: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const PHASE_COLORS: Record<string, string> = {
    hypertrophy: '#FF6600',
    strength: '#ff007f',
    endurance: '#FF6600',
    deload: '#f59e0b',
    power: '#c084fc',
    general: '#6ee7b7',
};

const PHASE_ICONS: Record<string, typeof Dumbbell> = {
    hypertrophy: Dumbbell,
    strength: Target,
    endurance: Zap,
    deload: RotateCcw,
    power: Zap,
    general: Dumbbell,
};

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
        <MotionBox
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            data-testid="interview-plan-view"
        >
            {/* Plan Header */}
            <Box
                p="1rem"
                borderRadius="12px"
                bg="rgba(255, 102, 0, 0.05)"
                border="1px solid rgba(255, 102, 0, 0.2)"
                mb="0.75rem"
            >
                <Flex justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                        <Text
                            fontFamily="var(--font-orbitron)"
                            fontSize="1rem"
                            fontWeight="700"
                            color="var(--neon-orange)"
                            mb="0.25rem"
                        >
                            {plan.name}
                        </Text>
                        <Text fontSize="0.8rem" color="#888" mb="0.5rem">
                            {plan.description}
                        </Text>
                        <Flex gap="0.5rem" flexWrap="wrap">
                            <Text
                                fontSize="0.7rem"
                                px="0.5rem"
                                py="0.15rem"
                                borderRadius="4px"
                                bg="rgba(255, 102, 0, 0.1)"
                                color="#FF6600"
                            >
                                {plan.duration_weeks} weeks
                            </Text>
                            <Text
                                fontSize="0.7rem"
                                px="0.5rem"
                                py="0.15rem"
                                borderRadius="4px"
                                bg="rgba(255, 102, 0, 0.1)"
                                color="#FF6600"
                            >
                                {plan.sessions.length} days/week
                            </Text>
                        </Flex>
                    </Box>
                    <Box>
                        {saveStatus === 'saving' || isSaving ? (
                            <Text fontSize="0.7rem" color="#FF6600">Saving...</Text>
                        ) : saveStatus === 'saved' ? (
                            <Flex alignItems="center" gap="0.25rem">
                                <Check size={12} color="#00C864" />
                                <Text fontSize="0.7rem" color="#00C864">Saved</Text>
                            </Flex>
                        ) : saveStatus === 'error' ? (
                            <Text fontSize="0.7rem" color="#ff4444">Save failed</Text>
                        ) : null}
                    </Box>
                </Flex>
            </Box>

            {/* Periodization Blocks */}
            {plan.periodization_blocks.length > 1 && (
                <Box mb="0.75rem">
                    <Text
                        fontSize="0.7rem"
                        color="#666"
                        textTransform="uppercase"
                        letterSpacing="0.05em"
                        mb="0.5rem"
                        px="0.25rem"
                    >
                        Periodization
                    </Text>
                    <Flex gap="4px" borderRadius="8px" overflow="hidden">
                        {plan.periodization_blocks.map((block, i) => {
                            const color = PHASE_COLORS[block.phase_type] || '#FF6600';
                            const Icon = PHASE_ICONS[block.phase_type] || Dumbbell;
                            const totalWeeks = plan.periodization_blocks.reduce(
                                (sum, b) => sum + b.phase_duration_weeks,
                                0
                            );
                            const widthPercent = (block.phase_duration_weeks / totalWeeks) * 100;

                            return (
                                <Box
                                    key={i}
                                    flex={`0 0 ${widthPercent}%`}
                                    bg={`${color}15`}
                                    border={`1px solid ${color}40`}
                                    borderRadius={
                                        i === 0
                                            ? '8px 0 0 8px'
                                            : i === plan.periodization_blocks.length - 1
                                            ? '0 8px 8px 0'
                                            : '0'
                                    }
                                    p="0.5rem 0.35rem"
                                    display="flex"
                                    flexDirection="column"
                                    alignItems="center"
                                    gap="0.15rem"
                                >
                                    <Icon size={12} color={color} />
                                    <Text fontSize="0.6rem" fontWeight="600" color={color}>
                                        {block.label}
                                    </Text>
                                    <Text fontSize="0.55rem" color={color} opacity={0.7}>
                                        {block.phase_duration_weeks}w
                                    </Text>
                                </Box>
                            );
                        })}
                    </Flex>
                </Box>
            )}

            {/* Session Cards */}
            <VStack gap="0.5rem" align="stretch">
                <Text
                    fontSize="0.7rem"
                    color="#666"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                    px="0.25rem"
                >
                    Weekly Schedule
                </Text>

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
            </VStack>

            {/* Edit hint */}
            <Text
                fontSize="0.7rem"
                color="#555"
                textAlign="center"
                mt="0.75rem"
                fontStyle="italic"
            >
                Tap any day to expand. Use the edit icon to modify exercises, sets, reps, and weights.
            </Text>
        </MotionBox>
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
        <Box>
            <button
                onClick={onToggle}
                data-testid={`session-day-${session.day_number}`}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: isExpanded
                        ? 'rgba(255, 102, 0, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                    border: isExpanded
                        ? '1px solid rgba(255, 102, 0, 0.25)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                }}
            >
                <Box
                    w="32px"
                    h="32px"
                    bg="rgba(255, 102, 0, 0.15)"
                    color="#FF6600"
                    borderRadius="8px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="600"
                    fontSize="0.75rem"
                    flexShrink={0}
                >
                    {dayLabel}
                </Box>
                <Box flex={1}>
                    <Text fontWeight="500" fontSize="0.9rem">
                        {session.name}
                    </Text>
                    <Text fontSize="0.75rem" color="#666">
                        {session.exercises.length} exercises
                    </Text>
                </Box>
                {isExpanded ? (
                    <ChevronDown size={16} color="#888" />
                ) : (
                    <ChevronRight size={16} color="#888" />
                )}
            </button>

            {/* Expanded Exercises */}
            {isExpanded && (
                <Box
                    border="1px solid rgba(255, 102, 0, 0.25)"
                    borderTop="none"
                    borderRadius="0 0 10px 10px"
                    p="0.75rem"
                    bg="rgba(255, 255, 255, 0.02)"
                >
                    <VStack gap="0.5rem" align="stretch">
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
                    </VStack>
                </Box>
            )}
        </Box>
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
        <Box
            bg={isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'}
            border={
                isEditing
                    ? '1px solid rgba(255, 102, 0, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.05)'
            }
            borderRadius="8px"
            p="0.6rem"
            transition="all 0.2s"
            data-testid="exercise-card"
        >
            {/* Exercise Header */}
            <Flex justifyContent="space-between" alignItems="center" mb="0.4rem">
                <Box flex={1}>
                    {isEditing ? (
                        <input
                            value={exercise.exercise_name}
                            onChange={(e) =>
                                onUpdateExercise({ exercise_name: e.target.value })
                            }
                            data-testid="exercise-name-input"
                            style={{
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                padding: '0.25rem 0.4rem',
                                color: 'var(--foreground)',
                                width: '100%',
                            }}
                        />
                    ) : (
                        <Text fontWeight="600" fontSize="0.85rem">
                            {exercise.exercise_name}
                        </Text>
                    )}
                </Box>
                <Flex gap="0.2rem" ml="0.5rem">
                    <button
                        onClick={onEdit}
                        data-testid="edit-exercise-btn"
                        style={{
                            background: isEditing
                                ? 'rgba(255, 102, 0, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem',
                            cursor: 'pointer',
                            color: isEditing ? '#FF6600' : '#888',
                            transition: 'all 0.2s',
                        }}
                    >
                        {isEditing ? <Check size={12} /> : <Edit3 size={12} />}
                    </button>
                    {isEditing && (
                        <button
                            onClick={onRemoveExercise}
                            data-testid="remove-exercise-btn"
                            style={{
                                background: 'rgba(255, 68, 68, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.3rem',
                                cursor: 'pointer',
                                color: '#ff4444',
                            }}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </Flex>
            </Flex>

            {/* Sets Table */}
            <Box>
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isEditing
                            ? '24px 1fr 1fr 1fr 24px'
                            : '24px 1fr 1fr 1fr',
                        gap: '0.4rem',
                        padding: '0.2rem 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.6rem',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
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
                        style={{
                            display: 'grid',
                            gridTemplateColumns: isEditing
                                ? '24px 1fr 1fr 1fr 24px'
                                : '24px 1fr 1fr 1fr',
                            gap: '0.4rem',
                            padding: '0.3rem 0',
                            alignItems: 'center',
                            borderBottom:
                                setIdx < exercise.sets.length - 1
                                    ? '1px solid rgba(255, 255, 255, 0.03)'
                                    : 'none',
                        }}
                    >
                        <span
                            style={{
                                color: '#FF6600',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                            }}
                        >
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
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        padding: '0.2rem 0.3rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.8rem',
                                        width: '100%',
                                    }}
                                />
                                <input
                                    type="text"
                                    value={set.weight}
                                    onChange={(e) =>
                                        onUpdateSet(setIdx, 'weight', e.target.value)
                                    }
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        padding: '0.2rem 0.3rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.8rem',
                                        width: '100%',
                                    }}
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
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        padding: '0.2rem 0.3rem',
                                        color: 'var(--foreground)',
                                        fontSize: '0.8rem',
                                        width: '100%',
                                    }}
                                />
                                <button
                                    onClick={() => onRemoveSet(setIdx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#ff4444',
                                        padding: '0.15rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <X size={10} />
                                </button>
                            </>
                        ) : (
                            <>
                                <span style={{ fontSize: '0.8rem' }}>{set.reps}</span>
                                <span style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                    {set.weight || '--'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                    {set.rest_seconds ? `${set.rest_seconds}s` : '--'}
                                </span>
                            </>
                        )}
                    </div>
                ))}
            </Box>

            {/* Add Set (editing) */}
            {isEditing && (
                <button
                    onClick={onAddSet}
                    data-testid="add-set-btn"
                    style={{
                        width: '100%',
                        marginTop: '0.4rem',
                        padding: '0.3rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                    }}
                >
                    <Plus size={10} />
                    Add Set
                </button>
            )}

            {/* Notes */}
            {isEditing ? (
                <Box mt="0.4rem">
                    <input
                        type="text"
                        value={exercise.notes}
                        onChange={(e) => onUpdateExercise({ notes: e.target.value })}
                        data-testid="exercise-notes-input"
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.4rem',
                            color: 'var(--foreground)',
                            fontSize: '0.75rem',
                        }}
                        placeholder="Notes (form cues, tempo, intensifiers)..."
                    />
                </Box>
            ) : exercise.notes ? (
                <Text
                    mt="0.3rem"
                    fontSize="0.7rem"
                    color="#888"
                    fontStyle="italic"
                >
                    {exercise.notes}
                </Text>
            ) : null}
        </Box>
    );
}
