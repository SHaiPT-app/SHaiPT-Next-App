'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Share2,
    Loader2,
    Dumbbell,
    Target,
    Zap,
    RotateCcw,
    Shield,
    Layers,
    Copy,
} from 'lucide-react';
import type {
    WorkoutSession,
    Profile,
    SessionExercise,
    PhaseType,
    PeriodizedBlock,
} from '@/lib/types';
import ExerciseSearch from '@/components/ExerciseSearch';

// ============================================
// TYPES
// ============================================

interface PlanSession {
    id: string;
    name: string;
    day_number: number;
    exercises: PlanExercise[];
    isNew?: boolean;
    linkedSessionId?: string;
}

interface PlanExercise {
    id: string;
    exercise_id?: string;
    name: string;
    sets: PlanSet[];
    notes?: string;
}

interface PlanSet {
    reps: string;
    weight: string;
    rest_seconds: number;
}

type CreationMode = 'manual' | 'ai';

// ============================================
// CONSTANTS
// ============================================

const PHASE_OPTIONS: { value: PhaseType; label: string; icon: typeof Dumbbell; color: string }[] = [
    { value: 'hypertrophy', label: 'Hypertrophy', icon: Dumbbell, color: '#FF6600' },
    { value: 'strength', label: 'Strength', icon: Target, color: '#ff007f' },
    { value: 'endurance', label: 'Endurance', icon: Zap, color: '#FF6600' },
    { value: 'power', label: 'Power', icon: Shield, color: '#f59e0b' },
    { value: 'deload', label: 'Deload', icon: RotateCcw, color: '#a78bfa' },
    { value: 'general', label: 'General', icon: Layers, color: '#888' },
];

const PHASE_COLORS: Record<PhaseType, string> = {
    hypertrophy: '#FF6600',
    strength: '#ff007f',
    endurance: '#FF6600',
    power: '#f59e0b',
    deload: '#a78bfa',
    general: '#888',
};

let nextId = 0;
function generateId(): string {
    nextId++;
    return `local-${Date.now()}-${nextId}`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editPlanId = searchParams.get('edit');

    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Creation mode
    const [creationMode, setCreationMode] = useState<CreationMode>('manual');

    // Plan Basic Info
    const [planName, setPlanName] = useState('');
    const [description, setDescription] = useState('');
    const [durationWeeks, setDurationWeeks] = useState(8);
    const [isTemplate, setIsTemplate] = useState(true);
    const [isPublic, setIsPublic] = useState(false);
    const [isShareable, setIsShareable] = useState(false);

    // Periodization blocks
    const [blocks, setBlocks] = useState<PeriodizedBlock[]>([
        { phase_type: 'hypertrophy', phase_duration_weeks: 4, label: 'Hypertrophy Phase' },
        { phase_type: 'strength', phase_duration_weeks: 3, label: 'Strength Phase' },
        { phase_type: 'deload', phase_duration_weeks: 1, label: 'Deload' },
    ]);

    // Sessions
    const [sessions, setSessions] = useState<PlanSession[]>([]);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(4);

    // AI generation state
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiGoals, setAiGoals] = useState('');
    const [aiExperience, setAiExperience] = useState('intermediate');
    const [aiEquipment, setAiEquipment] = useState('Full gym');
    const [aiInjuries, setAiInjuries] = useState('');
    const [aiPreferences, setAiPreferences] = useState('');
    const [aiPhaseType, setAiPhaseType] = useState<PhaseType | ''>('');

    // Share state
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [shareLink, setShareLink] = useState('');

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Load existing plan for editing
    useEffect(() => {
        if (!editPlanId || !user) return;

        const loadPlanForEdit = async () => {
            setLoading(true);
            try {
                const plan = await db.trainingPlans.getById(editPlanId);
                if (!plan) {
                    router.push('/plans');
                    return;
                }

                setPlanName(plan.name);
                setDescription(plan.description || '');
                setDurationWeeks(plan.duration_weeks || 8);
                setIsTemplate(plan.is_template ?? true);
                setIsPublic(plan.is_public ?? false);
                setIsShareable(plan.is_shareable ?? false);

                // Load periodization blocks
                if (plan.periodization_blocks && plan.periodization_blocks.length > 0) {
                    setBlocks(plan.periodization_blocks);
                } else if (plan.phase_type) {
                    setBlocks([{
                        phase_type: plan.phase_type,
                        phase_duration_weeks: plan.phase_duration_weeks || plan.duration_weeks || 4,
                        label: `${plan.phase_type.charAt(0).toUpperCase()}${plan.phase_type.slice(1)} Phase`,
                    }]);
                }

                // Load plan sessions
                const planSessions = await db.trainingPlanSessions.getByPlan(editPlanId);
                const sessionIds = [...new Set(planSessions.map(s => s.session_id))];
                const sessionDetails = await Promise.all(
                    sessionIds.map(id => db.workoutSessions.getById(id))
                );

                const sessionMap = new Map<string, WorkoutSession>();
                sessionDetails.forEach(s => {
                    if (s) sessionMap.set(s.id, s);
                });

                const loadedSessions: PlanSession[] = planSessions.map(ps => {
                    const ws = sessionMap.get(ps.session_id);
                    return {
                        id: generateId(),
                        name: ws?.name || 'Unnamed Session',
                        day_number: ps.day_number,
                        linkedSessionId: ps.session_id,
                        exercises: ws?.exercises.map(ex => ({
                            id: generateId(),
                            exercise_id: ex.exercise_id,
                            name: ex.exercise_id,
                            sets: ex.sets.map(s => ({
                                reps: s.reps,
                                weight: s.weight || '',
                                rest_seconds: s.rest_seconds || 90,
                            })),
                            notes: ex.notes,
                        })) || [],
                    };
                });

                setSessions(loadedSessions);
                const maxDay = Math.max(...planSessions.map(ps => ps.day_number), 0);
                if (maxDay > 0) setTrainingDaysPerWeek(maxDay);
            } catch (error) {
                console.error('Error loading plan for edit:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlanForEdit();
    }, [editPlanId, user, router]);

    // Auto-populate empty sessions when training days changes
    useEffect(() => {
        if (editPlanId) return;
        if (sessions.length > 0) return;

        const newSessions: PlanSession[] = [];
        for (let i = 1; i <= trainingDaysPerWeek; i++) {
            newSessions.push({
                id: generateId(),
                name: `Day ${i}`,
                day_number: i,
                exercises: [],
                isNew: true,
            });
        }
        setSessions(newSessions);
    }, [trainingDaysPerWeek, editPlanId, sessions.length]);

    // ============================================
    // BLOCK MANAGEMENT
    // ============================================

    const addBlock = () => {
        setBlocks(prev => [...prev, {
            phase_type: 'general',
            phase_duration_weeks: 2,
            label: 'New Phase',
        }]);
    };

    const updateBlock = (index: number, updates: Partial<PeriodizedBlock>) => {
        setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b));
    };

    const removeBlock = (index: number) => {
        if (blocks.length <= 1) return;
        setBlocks(prev => prev.filter((_, i) => i !== index));
    };

    // Sync total duration from blocks
    useEffect(() => {
        const total = blocks.reduce((sum, b) => sum + b.phase_duration_weeks, 0);
        if (total > 0) setDurationWeeks(total);
    }, [blocks]);

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    const addSession = () => {
        const newDayNumber = sessions.length > 0
            ? Math.max(...sessions.map(s => s.day_number)) + 1
            : 1;

        const newSession: PlanSession = {
            id: generateId(),
            name: `Day ${newDayNumber}`,
            day_number: newDayNumber,
            exercises: [],
            isNew: true,
        };
        setSessions(prev => [...prev, newSession]);
        setExpandedSession(newSession.id);
        setTrainingDaysPerWeek(prev => Math.max(prev, newDayNumber));
    };

    const removeSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    const updateSession = (sessionId: string, updates: Partial<PlanSession>) => {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
    };

    // ============================================
    // EXERCISE MANAGEMENT
    // ============================================

    const addExercise = (sessionId: string) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                exercises: [...s.exercises, {
                    id: generateId(),
                    name: '',
                    sets: [{ reps: '10', weight: '', rest_seconds: 90 }],
                }],
            };
        }));
    };

    const updateExercise = (sessionId: string, exerciseIndex: number, updates: Partial<PlanExercise>) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const exercises = [...s.exercises];
            exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates };
            return { ...s, exercises };
        }));
    };

    const removeExercise = (sessionId: string, exerciseIndex: number) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                exercises: s.exercises.filter((_, i) => i !== exerciseIndex),
            };
        }));
    };

    // ============================================
    // SET MANAGEMENT
    // ============================================

    const addSet = (sessionId: string, exerciseIndex: number) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const exercises = [...s.exercises];
            const exercise = { ...exercises[exerciseIndex] };
            exercise.sets = [...exercise.sets, { reps: '10', weight: '', rest_seconds: 90 }];
            exercises[exerciseIndex] = exercise;
            return { ...s, exercises };
        }));
    };

    const updateSet = (sessionId: string, exerciseIndex: number, setIndex: number, updates: Partial<PlanSet>) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const exercises = [...s.exercises];
            const exercise = { ...exercises[exerciseIndex] };
            const sets = [...exercise.sets];
            sets[setIndex] = { ...sets[setIndex], ...updates };
            exercise.sets = sets;
            exercises[exerciseIndex] = exercise;
            return { ...s, exercises };
        }));
    };

    const removeSet = (sessionId: string, exerciseIndex: number, setIndex: number) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const exercises = [...s.exercises];
            const exercise = { ...exercises[exerciseIndex] };
            exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
            exercises[exerciseIndex] = exercise;
            return { ...s, exercises };
        }));
    };

    // ============================================
    // AI GENERATION
    // ============================================

    const handleAiGenerate = async () => {
        if (!aiGoals.trim()) return;
        setAiGenerating(true);

        try {
            const res = await fetch('/api/plans/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goals: aiGoals.split(',').map(g => g.trim()),
                    experience_level: aiExperience,
                    available_equipment: aiEquipment,
                    training_days_per_week: trainingDaysPerWeek,
                    injuries_limitations: aiInjuries || 'None',
                    duration_weeks: durationWeeks,
                    phase_type: aiPhaseType || undefined,
                    preferences: aiPreferences || undefined,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to generate plan');
            }

            const data = await res.json();
            const plan = data.data?.plan;
            if (!plan) throw new Error('No plan data in response');

            setPlanName(plan.name || '');
            setDescription(plan.description || '');
            setDurationWeeks(plan.duration_weeks || durationWeeks);

            if (plan.periodization_blocks && plan.periodization_blocks.length > 0) {
                setBlocks(plan.periodization_blocks);
            }

            if (plan.sessions && plan.sessions.length > 0) {
                const newSessions: PlanSession[] = plan.sessions.map((s: {
                    name: string;
                    day_number: number;
                    exercises: Array<{
                        exercise_name: string;
                        sets: Array<{ reps: string; weight: string; rest_seconds: number }>;
                        notes: string;
                    }>;
                }) => ({
                    id: generateId(),
                    name: s.name,
                    day_number: s.day_number,
                    isNew: true,
                    exercises: (s.exercises || []).map((ex) => ({
                        id: generateId(),
                        name: ex.exercise_name,
                        sets: (ex.sets || []).map((set) => ({
                            reps: set.reps || '10',
                            weight: set.weight || '',
                            rest_seconds: set.rest_seconds || 90,
                        })),
                        notes: ex.notes || '',
                    })),
                }));
                setSessions(newSessions);
                setTrainingDaysPerWeek(newSessions.length);
            }

            setCreationMode('manual');
        } catch (error) {
            console.error('AI generation error:', error);
            const message = error instanceof Error ? error.message : 'Failed to generate plan';
            alert(message);
        } finally {
            setAiGenerating(false);
        }
    };

    // ============================================
    // SAVE
    // ============================================

    const getBlockWeekRange = (blockIndex: number): string => {
        let weekStart = 1;
        for (let i = 0; i < blockIndex; i++) {
            weekStart += blocks[i].phase_duration_weeks;
        }
        const weekEnd = weekStart + blocks[blockIndex].phase_duration_weeks - 1;
        return `${weekStart}-${weekEnd}`;
    };

    const handleSave = async () => {
        if (!user || !planName.trim()) return;
        setSaving(true);

        try {
            const planData = {
                creator_id: user.id,
                name: planName.trim(),
                description: description.trim(),
                duration_weeks: durationWeeks,
                phase_type: blocks[0]?.phase_type || ('general' as PhaseType),
                phase_duration_weeks: blocks[0]?.phase_duration_weeks || durationWeeks,
                periodization_blocks: blocks,
                is_template: isTemplate,
                is_public: isPublic,
                is_shareable: isShareable,
                tags: [
                    'schedule:weekly',
                    ...blocks.map((b, i) => `block:${b.phase_type}:${getBlockWeekRange(i)}`),
                ],
            };

            let targetPlanId = editPlanId;

            if (editPlanId) {
                await db.trainingPlans.update(editPlanId, planData);
                await db.trainingPlanSessions.deleteByPlan(editPlanId);
            } else {
                const newPlan = await db.trainingPlans.create(planData);
                targetPlanId = newPlan.id;
            }

            if (!targetPlanId) throw new Error('Failed to save plan');

            for (const session of sessions) {
                let sessionId = session.linkedSessionId;

                if (!sessionId || session.isNew) {
                    const exercises: SessionExercise[] = session.exercises.map(ex => ({
                        exercise_id: ex.exercise_id || ex.name.toLowerCase().replace(/\s+/g, '-'),
                        sets: ex.sets.map(s => ({
                            reps: s.reps,
                            weight: s.weight || undefined,
                            rest_seconds: s.rest_seconds,
                        })),
                        notes: ex.notes,
                    }));

                    const newSession = await db.workoutSessions.create({
                        creator_id: user.id,
                        name: session.name,
                        exercises,
                        is_template: true,
                        is_public: isPublic,
                    });
                    sessionId = newSession.id;
                }

                await db.trainingPlanSessions.create({
                    plan_id: targetPlanId,
                    session_id: sessionId,
                    day_number: session.day_number,
                });
            }

            router.push('/plans');
        } catch (error) {
            console.error('Error saving plan:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to save plan: ${message}`);
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // SHARE
    // ============================================

    const handleShare = async () => {
        if (!editPlanId) {
            alert('Save the plan first before sharing.');
            return;
        }

        try {
            await db.trainingPlans.update(editPlanId, {
                is_shareable: true,
                is_public: true,
            });
            setIsShareable(true);
            setIsPublic(true);

            const link = `${window.location.origin}/plans?view=${editPlanId}`;
            setShareLink(link);
            setShowSharePanel(true);

            await navigator.clipboard.writeText(link);
        } catch (error) {
            console.error('Error sharing plan:', error);
        }
    };

    const handleExerciseSelect = (sessionId: string, exerciseIndex: number, selectedExercise: {
        exercise_id: string;
        name: string;
    }) => {
        updateExercise(sessionId, exerciseIndex, {
            name: selectedExercise.name,
            exercise_id: selectedExercise.exercise_id,
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.5rem',
                    margin: 0,
                    color: '#FF6600',
                }}>
                    {editPlanId ? 'Edit Training Plan' : 'Create Training Plan'}
                </h1>
                {editPlanId && (
                    <button
                        onClick={handleShare}
                        style={{
                            marginLeft: 'auto',
                            background: 'rgba(255, 102, 0, 0.1)',
                            border: '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            color: '#FF6600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                        }}
                    >
                        <Share2 size={16} />
                        Share
                    </button>
                )}
            </div>

            {/* Share Panel */}
            {showSharePanel && (
                <div className="glass-panel" style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(255, 102, 0, 0.3)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: '#FF6600', fontWeight: 600, marginBottom: '0.25rem' }}>
                                Plan link copied to clipboard
                            </p>
                            <p style={{ color: '#888', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                {shareLink}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSharePanel(false)}
                            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Creation Mode Toggle */}
            {!editPlanId && (
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '2rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '4px',
                }}>
                    <button
                        onClick={() => setCreationMode('manual')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            background: creationMode === 'manual' ? 'rgba(255, 102, 0, 0.15)' : 'transparent',
                            color: creationMode === 'manual' ? '#FF6600' : '#888',
                            fontWeight: creationMode === 'manual' ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Dumbbell size={18} />
                        Manual
                    </button>
                    <button
                        onClick={() => setCreationMode('ai')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            background: creationMode === 'ai' ? 'rgba(255, 102, 0, 0.15)' : 'transparent',
                            color: creationMode === 'ai' ? '#FF6600' : '#888',
                            fontWeight: creationMode === 'ai' ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Sparkles size={18} />
                        AI Generate
                    </button>
                </div>
            )}

            {/* AI Generation Panel */}
            {creationMode === 'ai' && !editPlanId && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{
                        marginBottom: '1.25rem',
                        color: '#FF6600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <Sparkles size={20} />
                        AI Plan Generator
                    </h3>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                Training Goals (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={aiGoals}
                                onChange={(e) => setAiGoals(e.target.value)}
                                placeholder="e.g., Build muscle, Increase bench press, Improve conditioning"
                                className="input-field"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                    Experience Level
                                </label>
                                <select
                                    value={aiExperience}
                                    onChange={(e) => setAiExperience(e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', margin: 0 }}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                    Days Per Week
                                </label>
                                <select
                                    value={trainingDaysPerWeek}
                                    onChange={(e) => setTrainingDaysPerWeek(parseInt(e.target.value))}
                                    className="input-field"
                                    style={{ width: '100%', margin: 0 }}
                                >
                                    {[2, 3, 4, 5, 6].map(n => (
                                        <option key={n} value={n}>{n} days</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                    Duration (Weeks)
                                </label>
                                <input
                                    type="number"
                                    value={durationWeeks}
                                    onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 4)}
                                    min={2}
                                    max={52}
                                    className="input-field"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                    Phase Emphasis
                                </label>
                                <select
                                    value={aiPhaseType}
                                    onChange={(e) => setAiPhaseType(e.target.value as PhaseType | '')}
                                    className="input-field"
                                    style={{ width: '100%', margin: 0 }}
                                >
                                    <option value="">Auto (AI decides)</option>
                                    {PHASE_OPTIONS.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                Available Equipment
                            </label>
                            <input
                                type="text"
                                value={aiEquipment}
                                onChange={(e) => setAiEquipment(e.target.value)}
                                placeholder="e.g., Full gym, Dumbbells only, Home gym with barbell"
                                className="input-field"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                Injuries / Limitations
                            </label>
                            <input
                                type="text"
                                value={aiInjuries}
                                onChange={(e) => setAiInjuries(e.target.value)}
                                placeholder="e.g., Lower back pain, recovering from shoulder surgery"
                                className="input-field"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                                Additional Preferences
                            </label>
                            <textarea
                                value={aiPreferences}
                                onChange={(e) => setAiPreferences(e.target.value)}
                                placeholder="e.g., Prefer supersets, no deadlifts, focus on compound lifts"
                                className="input-field"
                                style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                            />
                        </div>

                        <button
                            onClick={handleAiGenerate}
                            disabled={aiGenerating || !aiGoals.trim()}
                            style={{
                                padding: '0.875rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: aiGenerating ? 'rgba(255, 102, 0, 0.1)' : '#FF6600',
                                color: aiGenerating ? '#FF6600' : '#000',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: aiGenerating ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            {aiGenerating ? (
                                <>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                    Generating Plan...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Generate Plan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Plan Editor (always visible in manual mode or editing) */}
            {(creationMode === 'manual' || editPlanId) && (
                <>
                    {/* Step 1: Plan Details */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{
                            marginBottom: '1rem',
                            color: '#FF6600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span style={{
                                background: '#FF6600',
                                color: '#000',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                            }}>1</span>
                            Plan Details
                        </h3>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Plan Name</label>
                                <input
                                    type="text"
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                    placeholder="e.g., 12 Week Strength & Hypertrophy"
                                    className="input-field"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of this plan's goals and approach"
                                    className="input-field"
                                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ccc', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} style={{ accentColor: '#FF6600' }} />
                                    Save as Template
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ccc', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ accentColor: '#FF6600' }} />
                                    Public
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ccc', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={isShareable} onChange={(e) => setIsShareable(e.target.checked)} style={{ accentColor: '#FF6600' }} />
                                    Shareable
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Periodization Blocks */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{
                                color: '#FF6600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: 0,
                            }}>
                                <span style={{
                                    background: '#FF6600',
                                    color: '#000',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                }}>2</span>
                                Periodization Blocks
                            </h3>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{durationWeeks} weeks total</span>
                        </div>

                        {/* Block Timeline */}
                        <div style={{ display: 'flex', gap: '3px', marginBottom: '1.25rem', borderRadius: '6px', overflow: 'hidden', height: '8px' }}>
                            {blocks.map((block, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: block.phase_duration_weeks,
                                        background: PHASE_COLORS[block.phase_type],
                                        borderRadius: i === 0 ? '6px 0 0 6px' : i === blocks.length - 1 ? '0 6px 6px 0' : '0',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Block Editor */}
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {blocks.map((block, i) => {
                                const phase = PHASE_OPTIONS.find(p => p.value === block.phase_type);
                                const PhaseIcon = phase?.icon || Layers;
                                const color = PHASE_COLORS[block.phase_type];

                                return (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: `${color}08`,
                                        border: `1px solid ${color}22`,
                                        borderRadius: '10px',
                                    }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: `${color}22`, color: color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <PhaseIcon size={16} />
                                        </div>

                                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <select
                                                value={block.phase_type}
                                                onChange={(e) => {
                                                    const type = e.target.value as PhaseType;
                                                    const opt = PHASE_OPTIONS.find(p => p.value === type);
                                                    updateBlock(i, { phase_type: type, label: opt ? `${opt.label} Phase` : block.label });
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px', padding: '0.4rem 0.5rem', color: 'var(--foreground)',
                                                    fontSize: '0.85rem', minWidth: '120px',
                                                }}
                                            >
                                                {PHASE_OPTIONS.map(p => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    value={block.phase_duration_weeks}
                                                    onChange={(e) => updateBlock(i, { phase_duration_weeks: parseInt(e.target.value) || 1 })}
                                                    min={1} max={26}
                                                    style={{
                                                        width: '50px', background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                                                        padding: '0.4rem', color: 'var(--foreground)', fontSize: '0.85rem', textAlign: 'center',
                                                    }}
                                                />
                                                <span style={{ color: '#888', fontSize: '0.8rem' }}>wks</span>
                                            </div>

                                            <input
                                                type="text"
                                                value={block.label}
                                                onChange={(e) => updateBlock(i, { label: e.target.value })}
                                                style={{
                                                    flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                                                    padding: '0.4rem 0.5rem', color: 'var(--foreground)', fontSize: '0.85rem',
                                                }}
                                                placeholder="Block label"
                                            />
                                        </div>

                                        {blocks.length > 1 && (
                                            <button onClick={() => removeBlock(i)} style={{
                                                background: 'none', border: 'none', color: '#ff4444',
                                                cursor: 'pointer', padding: '0.25rem', flexShrink: 0,
                                            }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={addBlock} style={{
                            width: '100%', marginTop: '0.75rem', padding: '0.6rem',
                            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        }}>
                            <Plus size={14} />
                            Add Block
                        </button>
                    </div>

                    {/* Step 3: Weekly Sessions */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{
                                color: '#FF6600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: 0,
                            }}>
                                <span style={{
                                    background: '#FF6600', color: '#000', borderRadius: '50%',
                                    width: '24px', height: '24px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 700,
                                }}>3</span>
                                Weekly Sessions
                            </h3>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{sessions.length} sessions</span>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {sessions.map((session) => {
                                const isExpanded = expandedSession === session.id;

                                return (
                                    <div key={session.id} style={{
                                        border: isExpanded ? '1px solid rgba(255, 102, 0, 0.2)' : '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px', overflow: 'hidden',
                                        background: isExpanded ? 'rgba(255, 102, 0, 0.03)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.2s',
                                    }}>
                                        {/* Session Header */}
                                        <div
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.875rem 1rem', cursor: 'pointer',
                                            }}
                                            onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                                        >
                                            <div style={{
                                                width: '32px', height: '32px',
                                                background: 'rgba(255, 102, 0, 0.15)', color: '#FF6600',
                                                borderRadius: '8px', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                                            }}>
                                                {session.day_number}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={session.name}
                                                    onChange={(e) => { e.stopPropagation(); updateSession(session.id, { name: e.target.value }); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        background: 'transparent', border: 'none', color: 'var(--foreground)',
                                                        fontSize: '0.95rem', fontWeight: 500, width: '100%', outline: 'none',
                                                    }}
                                                    placeholder="Session name"
                                                />
                                                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.1rem' }}>
                                                    {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>

                                            <button onClick={(e) => { e.stopPropagation(); removeSession(session.id); }} style={{
                                                background: 'none', border: 'none', color: '#ff4444',
                                                cursor: 'pointer', padding: '0.25rem', opacity: 0.5,
                                            }}>
                                                <Trash2 size={14} />
                                            </button>

                                            {isExpanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
                                        </div>

                                        {/* Expanded Session Content */}
                                        {isExpanded && (
                                            <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                                                    {session.exercises.map((exercise, exIdx) => (
                                                        <div key={exercise.id} style={{
                                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '10px', padding: '0.875rem',
                                                        }}>
                                                            {/* Exercise Header */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <ExerciseSearch
                                                                        onSelectExercise={(sel) => handleExerciseSelect(session.id, exIdx, sel)}
                                                                        placeholder={exercise.name || 'Search for an exercise...'}
                                                                    />
                                                                    {exercise.name && !exercise.exercise_id && (
                                                                        <input
                                                                            type="text"
                                                                            value={exercise.name}
                                                                            onChange={(e) => updateExercise(session.id, exIdx, { name: e.target.value })}
                                                                            style={{
                                                                                width: '100%', marginTop: '0.5rem',
                                                                                background: 'rgba(255,255,255,0.05)',
                                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                                borderRadius: '6px', padding: '0.4rem 0.5rem',
                                                                                color: 'var(--foreground)', fontSize: '0.85rem',
                                                                            }}
                                                                            placeholder="Exercise name"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <button onClick={() => removeExercise(session.id, exIdx)} style={{
                                                                    background: 'none', border: 'none', color: '#ff4444',
                                                                    cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem',
                                                                }}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>

                                                            {/* Sets */}
                                                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                                                <div style={{
                                                                    display: 'grid', gridTemplateColumns: '30px 1fr 1fr 1fr 30px',
                                                                    gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.7rem',
                                                                    color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                                }}>
                                                                    <span>Set</span>
                                                                    <span>Reps</span>
                                                                    <span>Weight</span>
                                                                    <span>Rest(s)</span>
                                                                    <span></span>
                                                                </div>

                                                                {exercise.sets.map((set, setIdx) => (
                                                                    <div key={setIdx} style={{
                                                                        display: 'grid', gridTemplateColumns: '30px 1fr 1fr 1fr 30px',
                                                                        gap: '0.5rem', alignItems: 'center',
                                                                    }}>
                                                                        <span style={{ color: '#FF6600', fontWeight: 600, fontSize: '0.8rem' }}>{setIdx + 1}</span>
                                                                        <input
                                                                            type="text" value={set.reps}
                                                                            onChange={(e) => updateSet(session.id, exIdx, setIdx, { reps: e.target.value })}
                                                                            placeholder="10"
                                                                            style={{
                                                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                                                borderRadius: '4px', padding: '0.3rem 0.4rem',
                                                                                color: 'var(--foreground)', fontSize: '0.85rem', width: '100%',
                                                                            }}
                                                                        />
                                                                        <input
                                                                            type="text" value={set.weight}
                                                                            onChange={(e) => updateSet(session.id, exIdx, setIdx, { weight: e.target.value })}
                                                                            placeholder="lbs/kg"
                                                                            style={{
                                                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                                                borderRadius: '4px', padding: '0.3rem 0.4rem',
                                                                                color: 'var(--foreground)', fontSize: '0.85rem', width: '100%',
                                                                            }}
                                                                        />
                                                                        <input
                                                                            type="number" value={set.rest_seconds}
                                                                            onChange={(e) => updateSet(session.id, exIdx, setIdx, { rest_seconds: parseInt(e.target.value) || 0 })}
                                                                            placeholder="90"
                                                                            style={{
                                                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                                                borderRadius: '4px', padding: '0.3rem 0.4rem',
                                                                                color: 'var(--foreground)', fontSize: '0.85rem', width: '100%',
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeSet(session.id, exIdx, setIdx)}
                                                                            disabled={exercise.sets.length <= 1}
                                                                            style={{
                                                                                background: 'none', border: 'none',
                                                                                cursor: exercise.sets.length > 1 ? 'pointer' : 'not-allowed',
                                                                                color: exercise.sets.length > 1 ? '#ff4444' : '#333',
                                                                                padding: '0.2rem', display: 'flex',
                                                                                alignItems: 'center', justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <button onClick={() => addSet(session.id, exIdx)} style={{
                                                                width: '100%', marginTop: '0.5rem', padding: '0.35rem',
                                                                background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                                                                borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '0.8rem',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                                            }}>
                                                                <Plus size={12} />
                                                                Add Set
                                                            </button>

                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <input
                                                                    type="text"
                                                                    value={exercise.notes || ''}
                                                                    onChange={(e) => updateExercise(session.id, exIdx, { notes: e.target.value })}
                                                                    style={{
                                                                        width: '100%', background: 'rgba(255,255,255,0.03)',
                                                                        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
                                                                        padding: '0.35rem 0.5rem', color: '#888', fontSize: '0.8rem',
                                                                    }}
                                                                    placeholder="Notes (form cues, tempo, etc.)"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button onClick={() => addExercise(session.id)} style={{
                                                    width: '100%', marginTop: '0.75rem', padding: '0.65rem',
                                                    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                                                    borderRadius: '8px', color: '#FF6600', cursor: 'pointer', fontSize: '0.85rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                                }}>
                                                    <Plus size={14} />
                                                    Add Exercise
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={addSession} style={{
                            width: '100%', marginTop: '0.75rem', padding: '0.75rem',
                            background: 'rgba(255, 102, 0, 0.08)', border: '1px dashed rgba(255, 102, 0, 0.2)',
                            borderRadius: '10px', color: '#FF6600', cursor: 'pointer', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500,
                        }}>
                            <Plus size={16} />
                            Add Training Day
                        </button>
                    </div>
                </>
            )}

            {/* Floating Save Button */}
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !planName.trim() || sessions.length === 0}
                    style={{
                        padding: '1rem 2rem', borderRadius: '50px',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        fontSize: '1rem', fontWeight: 700,
                        background: saving ? 'rgba(255, 102, 0, 0.1)' : '#FF6600',
                        color: saving ? '#FF6600' : '#000',
                        border: 'none',
                        cursor: (saving || !planName.trim() || sessions.length === 0) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 20px rgba(255, 102, 0, 0.3)',
                        transition: 'all 0.2s',
                        opacity: (!planName.trim() || sessions.length === 0) ? 0.5 : 1,
                    }}
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            {editPlanId ? 'Update Plan' : 'Create Plan'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
