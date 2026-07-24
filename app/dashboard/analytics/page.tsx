'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import {
    VolumeOverTimeChart,
    StrengthProgressionChart,
    BodyWeightTrendChart,
    WorkoutFrequencyHeatmap,
    MuscleGroupVolumeChart,
} from '@/components/charts/AnalyticsCharts';
import type {
    ExerciseLog,
    PersonalRecord,
    Exercise,
    WorkoutLogWithExercises,
} from '@/lib/types';

// ============================================
// TYPES
// ============================================

interface PRDisplayItem {
    exercise_id: string;
    exercise_name: string;
    max_weight: number | null;
    max_reps: number | null;
    max_volume: number | null;
    achieved_at: string;
    is_recent: boolean; // achieved within last 7 days
}

// ============================================
// MAIN PAGE
// ============================================

export default function AnalyticsDashboardPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogWithExercises[]>([]);
    const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
    const [exercises, setExercises] = useState<Record<string, Exercise>>({});
    const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserId(user.id);
        } else {
            router.push('/');
        }
    }, [router]);

    // Fetch data when userId is available
    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch workout logs with exercise logs
                const { data: logs } = await supabase
                    .from('workout_logs')
                    .select('*, exercise_logs(*)')
                    .eq('user_id', userId)
                    .order('date', { ascending: false })
                    .limit(50);

                // Fetch current personal records
                const { data: prs } = await supabase
                    .from('personal_records')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_current', true)
                    .order('achieved_at', { ascending: false });

                // Collect unique exercise IDs from logs and PRs
                const exerciseIds = new Set<string>();
                (logs || []).forEach((log: WorkoutLogWithExercises) => {
                    (log.exercise_logs || []).forEach((el: ExerciseLog) => {
                        exerciseIds.add(el.exercise_id);
                    });
                });
                (prs || []).forEach((pr: PersonalRecord) => {
                    exerciseIds.add(pr.exercise_id);
                });

                // Fetch exercise details
                const exerciseMap: Record<string, Exercise> = {};
                if (exerciseIds.size > 0) {
                    const { data: exerciseData } = await supabase
                        .from('exercises')
                        .select('*')
                        .in('exercise_id', Array.from(exerciseIds));

                    if (exerciseData) {
                        exerciseData.forEach((ex: Exercise) => {
                            exerciseMap[ex.exercise_id] = ex;
                        });
                    }
                }

                // Fetch body weight history
                const { data: weightData } = await supabase
                    .from('body_weight_logs')
                    .select('date, weight')
                    .eq('user_id', userId)
                    .order('date', { ascending: true })
                    .limit(90);

                // Fetch user preferred unit
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('preferred_weight_unit')
                    .eq('id', userId)
                    .single();

                setWorkoutLogs((logs as WorkoutLogWithExercises[]) || []);
                setPersonalRecords((prs as PersonalRecord[]) || []);
                setExercises(exerciseMap);
                setWeightHistory((weightData as { date: string; weight: number }[]) || []);
                if (profileData?.preferred_weight_unit) {
                    setWeightUnit(profileData.preferred_weight_unit as 'lbs' | 'kg');
                }
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    // ============================================
    // COMPUTED: PR Display Items
    // ============================================

    const prDisplayItems = useMemo((): PRDisplayItem[] => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return personalRecords.map((pr) => {
            const exercise = exercises[pr.exercise_id];
            const achievedDate = new Date(pr.achieved_at);

            return {
                exercise_id: pr.exercise_id,
                exercise_name: exercise?.name || pr.exercise_id,
                max_weight: pr.max_weight ?? null,
                max_reps: pr.max_reps ?? null,
                max_volume: pr.max_volume ?? null,
                achieved_at: pr.achieved_at,
                is_recent: achievedDate >= sevenDaysAgo,
            };
        });
    }, [personalRecords, exercises]);

    // ============================================
    // HANDLERS
    // ============================================

    const toggleExpanded = (logId: string) => {
        setExpandedLogId((prev) => (prev === logId ? null : logId));
    };

    const formatDuration = (seconds: number | undefined | null): string => {
        if (!seconds) return '--';
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hrs}h ${remainMins}m`;
    };

    const computeLogStats = (log: WorkoutLogWithExercises) => {
        const exerciseLogs = log.exercise_logs || [];
        let totalSets = 0;
        let totalVolume = 0;

        exerciseLogs.forEach((el) => {
            const sets = el.sets || [];
            totalSets += sets.length;
            sets.forEach((s) => {
                totalVolume += (s.weight || 0) * (s.reps || 0);
            });
        });

        return {
            exerciseCount: exerciseLogs.length,
            totalSets,
            totalVolume: Math.round(totalVolume),
        };
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen max-w-[900px] p-6 pb-24">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="mb-2 cursor-pointer border-none bg-transparent p-0 text-sm text-ink-mid transition-colors hover:text-ink-hi"
                >
                    &larr; Back
                </button>
                <h1 className="display text-gradient-brand m-0 text-[1.75rem]">
                    Analytics
                </h1>
                <p className="mt-1 text-sm text-ink-mid">
                    Workout history and personal records
                </p>
            </div>

            {/* Personal Records Section */}
            <section className="mb-12">
                <h2 className="display mb-5 text-xl">
                    Personal Records
                </h2>

                {prDisplayItems.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-ink-mid">
                            No personal records yet. Complete workouts to start tracking PRs.
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4"
                    >
                        {prDisplayItems.map((pr) => (
                            <motion.div
                                key={pr.exercise_id}
                                variants={fadeInUp}
                                className={`glass-card relative overflow-hidden p-5 ${
                                    pr.is_recent
                                        ? '!border-brand/30 shadow-[0_0_16px_var(--brand-glow-soft)]'
                                        : ''
                                }`}
                            >
                                {/* PR Badge for recent records */}
                                {pr.is_recent && (
                                    <div
                                        data-testid="pr-badge"
                                        className="absolute right-3 top-3 rounded-full bg-[var(--brand-glow-soft)] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-brand"
                                    >
                                        NEW PR
                                    </div>
                                )}

                                <h3 className={`mb-3 text-[0.95rem] font-semibold text-ink-hi ${
                                    pr.is_recent ? 'pr-20' : ''
                                }`}>
                                    {pr.exercise_name}
                                </h3>

                                <div className="grid grid-cols-3 gap-2">
                                    {pr.max_weight != null && (
                                        <div>
                                            <div className="font-display text-xl font-bold text-brand">
                                                {pr.max_weight}
                                            </div>
                                            <div className="text-[0.7rem] uppercase text-ink-low">
                                                Max Weight
                                            </div>
                                        </div>
                                    )}
                                    {pr.max_reps != null && (
                                        <div>
                                            <div className="font-display text-xl font-bold text-ink-hi">
                                                {pr.max_reps}
                                            </div>
                                            <div className="text-[0.7rem] uppercase text-ink-low">
                                                Max Reps
                                            </div>
                                        </div>
                                    )}
                                    {pr.max_volume != null && (
                                        <div>
                                            <div className="font-display text-xl font-bold text-ink-hi">
                                                {Math.round(pr.max_volume)}
                                            </div>
                                            <div className="text-[0.7rem] uppercase text-ink-low">
                                                Max Volume
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 text-xs text-ink-low">
                                    {formatDistanceToNow(parseISO(pr.achieved_at), {
                                        addSuffix: true,
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </section>

            {/* Charts Section */}
            <section className="mb-12">
                <h2 className="display mb-5 text-xl">
                    Performance Charts
                </h2>

                <div className="grid gap-6">
                    {/* Volume Over Time & Strength Progression - side by side on desktop */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                        <VolumeOverTimeChart logs={workoutLogs} />
                        <StrengthProgressionChart logs={workoutLogs} exercises={exercises} />
                    </div>

                    {/* Body Weight Trend */}
                    <BodyWeightTrendChart weightHistory={weightHistory} unit={weightUnit} />

                    {/* Heatmap & Muscle Distribution - side by side on desktop */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                        <WorkoutFrequencyHeatmap logs={workoutLogs} />
                        <MuscleGroupVolumeChart logs={workoutLogs} exercises={exercises} />
                    </div>
                </div>
            </section>

            {/* Workout History Section */}
            <section>
                <h2 className="display mb-5 text-xl">
                    Workout History
                </h2>

                {workoutLogs.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-ink-mid">
                            No workouts recorded yet. Start a workout to see your history here.
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-3"
                    >
                        {workoutLogs.map((log) => {
                            const stats = computeLogStats(log);
                            const isExpanded = expandedLogId === log.id;

                            return (
                                <motion.div
                                    key={log.id}
                                    variants={fadeInUp}
                                    className={`glass-card glass-card-hover cursor-pointer p-5 ${
                                        isExpanded ? '!border-brand/30' : ''
                                    }`}
                                    onClick={() => toggleExpanded(log.id)}
                                    data-testid={`workout-log-${log.id}`}
                                >
                                    {/* Summary Row */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="m-0 text-base font-semibold text-ink-hi">
                                                {format(parseISO(log.date), 'EEEE, MMM d, yyyy')}
                                            </h3>
                                            {log.notes && (
                                                <p className="mb-0 mt-1 text-[0.85rem] text-ink-mid">
                                                    {log.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[0.85rem] font-medium text-brand">
                                                {formatDuration(log.total_duration_seconds)}
                                            </span>
                                            <span className={`inline-block text-xl text-ink-low transition-transform duration-200 ${
                                                isExpanded ? 'rotate-180' : 'rotate-0'
                                            }`}>
                                                &#9662;
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini Stats */}
                                    <div className="mt-3 flex flex-wrap gap-3">
                                        <span className="rounded-full bg-[var(--brand-glow-soft)] px-2.5 py-0.5 text-[0.78rem] text-brand">
                                            {stats.exerciseCount} exercises
                                        </span>
                                        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[0.78rem] text-ink-mid">
                                            {stats.totalSets} sets
                                        </span>
                                        {stats.totalVolume > 0 && (
                                            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[0.78rem] text-ink-mid">
                                                {stats.totalVolume.toLocaleString()} vol
                                            </span>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 border-t border-line-soft pt-4">
                                                    {(log.exercise_logs || []).length === 0 ? (
                                                        <p className="text-[0.85rem] text-ink-low">
                                                            No exercise details recorded.
                                                        </p>
                                                    ) : (
                                                        <div className="grid gap-3">
                                                            {(log.exercise_logs || [])
                                                                .sort((a, b) => a.exercise_order - b.exercise_order)
                                                                .map((el) => {
                                                                    const exercise = exercises[el.exercise_id];
                                                                    return (
                                                                        <div
                                                                            key={el.id}
                                                                            className="rounded-xl bg-[var(--surface-2)] p-3"
                                                                        >
                                                                            <div className="mb-2 text-sm font-semibold text-brand">
                                                                                {exercise?.name || el.exercise_id}
                                                                            </div>

                                                                            {/* Sets Table */}
                                                                            {el.sets && el.sets.length > 0 ? (
                                                                                <div className="grid gap-1">
                                                                                    <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr] px-1 text-[0.7rem] uppercase text-ink-low">
                                                                                        <span>Set</span>
                                                                                        <span>Weight</span>
                                                                                        <span>Reps</span>
                                                                                        <span>RPE</span>
                                                                                    </div>
                                                                                    {el.sets.map((s, idx) => (
                                                                                        <div
                                                                                            key={idx}
                                                                                            className={`grid grid-cols-[2.5rem_1fr_1fr_1fr] rounded-md p-1 text-[0.85rem] ${
                                                                                                s.is_warmup
                                                                                                    ? 'bg-white/[0.02] italic text-ink-low'
                                                                                                    : 'text-ink-mid'
                                                                                            }`}
                                                                                        >
                                                                                            <span>{s.set_number}</span>
                                                                                            <span>{s.weight}{s.weight_unit === 'kg' ? 'kg' : 'lbs'}</span>
                                                                                            <span>{s.reps}</span>
                                                                                            <span>{s.rpe ?? '--'}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-[0.8rem] text-ink-low">
                                                                                    No set data
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </section>
        </div>
    );
}
