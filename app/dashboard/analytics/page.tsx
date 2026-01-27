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
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#0B0B15',
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{
            padding: '1.5rem',
            paddingBottom: '6rem',
            maxWidth: '900px',
            margin: '0 auto',
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        marginBottom: '0.5rem',
                        padding: 0,
                    }}
                >
                    &larr; Back
                </button>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.75rem',
                    color: '#39ff14',
                    margin: 0,
                }}>
                    Analytics
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Workout history and personal records
                </p>
            </div>

            {/* Personal Records Section */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.15rem',
                    color: 'white',
                    marginBottom: '1.25rem',
                }}>
                    Personal Records
                </h2>

                {prDisplayItems.length === 0 ? (
                    <div
                        className="glass-panel"
                        style={{ padding: '3rem', textAlign: 'center' }}
                    >
                        <p style={{ color: '#888' }}>
                            No personal records yet. Complete workouts to start tracking PRs.
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {prDisplayItems.map((pr) => (
                            <motion.div
                                key={pr.exercise_id}
                                variants={fadeInUp}
                                className="glass-panel"
                                style={{
                                    padding: '1.25rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    border: pr.is_recent
                                        ? '1px solid rgba(57, 255, 20, 0.3)'
                                        : undefined,
                                }}
                            >
                                {/* PR Badge for recent records */}
                                {pr.is_recent && (
                                    <div
                                        data-testid="pr-badge"
                                        style={{
                                            position: 'absolute',
                                            top: '0.75rem',
                                            right: '0.75rem',
                                            background: 'rgba(57, 255, 20, 0.15)',
                                            color: '#39ff14',
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        NEW PR
                                    </div>
                                )}

                                <h3 style={{
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    color: 'white',
                                    marginBottom: '0.75rem',
                                    paddingRight: pr.is_recent ? '5rem' : '0',
                                }}>
                                    {pr.exercise_name}
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '0.5rem',
                                }}>
                                    {pr.max_weight != null && (
                                        <div>
                                            <div style={{
                                                fontSize: '1.25rem',
                                                fontWeight: '700',
                                                color: '#39ff14',
                                            }}>
                                                {pr.max_weight}
                                            </div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#888',
                                                textTransform: 'uppercase',
                                            }}>
                                                Max Weight
                                            </div>
                                        </div>
                                    )}
                                    {pr.max_reps != null && (
                                        <div>
                                            <div style={{
                                                fontSize: '1.25rem',
                                                fontWeight: '700',
                                                color: 'white',
                                            }}>
                                                {pr.max_reps}
                                            </div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#888',
                                                textTransform: 'uppercase',
                                            }}>
                                                Max Reps
                                            </div>
                                        </div>
                                    )}
                                    {pr.max_volume != null && (
                                        <div>
                                            <div style={{
                                                fontSize: '1.25rem',
                                                fontWeight: '700',
                                                color: 'white',
                                            }}>
                                                {Math.round(pr.max_volume)}
                                            </div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#888',
                                                textTransform: 'uppercase',
                                            }}>
                                                Max Volume
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    marginTop: '0.75rem',
                                    fontSize: '0.75rem',
                                    color: '#666',
                                }}>
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
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.15rem',
                    color: 'white',
                    marginBottom: '1.25rem',
                }}>
                    Performance Charts
                </h2>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Volume Over Time & Strength Progression - side by side on desktop */}
                    <div style={{
                        display: 'grid',
                        gap: '1.5rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    }}>
                        <VolumeOverTimeChart logs={workoutLogs} />
                        <StrengthProgressionChart logs={workoutLogs} exercises={exercises} />
                    </div>

                    {/* Body Weight Trend */}
                    <BodyWeightTrendChart weightHistory={weightHistory} unit={weightUnit} />

                    {/* Heatmap & Muscle Distribution - side by side on desktop */}
                    <div style={{
                        display: 'grid',
                        gap: '1.5rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    }}>
                        <WorkoutFrequencyHeatmap logs={workoutLogs} />
                        <MuscleGroupVolumeChart logs={workoutLogs} exercises={exercises} />
                    </div>
                </div>
            </section>

            {/* Workout History Section */}
            <section>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.15rem',
                    color: 'white',
                    marginBottom: '1.25rem',
                }}>
                    Workout History
                </h2>

                {workoutLogs.length === 0 ? (
                    <div
                        className="glass-panel"
                        style={{ padding: '3rem', textAlign: 'center' }}
                    >
                        <p style={{ color: '#888' }}>
                            No workouts recorded yet. Start a workout to see your history here.
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        style={{ display: 'grid', gap: '0.75rem' }}
                    >
                        {workoutLogs.map((log) => {
                            const stats = computeLogStats(log);
                            const isExpanded = expandedLogId === log.id;

                            return (
                                <motion.div
                                    key={log.id}
                                    variants={fadeInUp}
                                    className="glass-panel"
                                    style={{
                                        padding: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        border: isExpanded
                                            ? '1px solid rgba(57, 255, 20, 0.2)'
                                            : '1px solid transparent',
                                    }}
                                    onClick={() => toggleExpanded(log.id)}
                                    data-testid={`workout-log-${log.id}`}
                                >
                                    {/* Summary Row */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <div>
                                            <h3 style={{
                                                fontWeight: '600',
                                                fontSize: '1rem',
                                                color: 'white',
                                                margin: 0,
                                            }}>
                                                {format(parseISO(log.date), 'EEEE, MMM d, yyyy')}
                                            </h3>
                                            {log.notes && (
                                                <p style={{
                                                    color: '#888',
                                                    fontSize: '0.85rem',
                                                    margin: '0.25rem 0 0',
                                                }}>
                                                    {log.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                        }}>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                color: '#39ff14',
                                                fontWeight: '500',
                                            }}>
                                                {formatDuration(log.total_duration_seconds)}
                                            </span>
                                            <span style={{
                                                color: '#555',
                                                fontSize: '1.2rem',
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                display: 'inline-block',
                                            }}>
                                                &#9662;
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini Stats */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        marginTop: '0.75rem',
                                        flexWrap: 'wrap',
                                    }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            background: 'rgba(57, 255, 20, 0.08)',
                                            color: '#aaa',
                                            borderRadius: '16px',
                                            fontSize: '0.78rem',
                                        }}>
                                            {stats.exerciseCount} exercises
                                        </span>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#aaa',
                                            borderRadius: '16px',
                                            fontSize: '0.78rem',
                                        }}>
                                            {stats.totalSets} sets
                                        </span>
                                        {stats.totalVolume > 0 && (
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: '#aaa',
                                                borderRadius: '16px',
                                                fontSize: '0.78rem',
                                            }}>
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
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{
                                                    marginTop: '1rem',
                                                    paddingTop: '1rem',
                                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                                }}>
                                                    {(log.exercise_logs || []).length === 0 ? (
                                                        <p style={{
                                                            color: '#666',
                                                            fontSize: '0.85rem',
                                                        }}>
                                                            No exercise details recorded.
                                                        </p>
                                                    ) : (
                                                        <div style={{
                                                            display: 'grid',
                                                            gap: '0.75rem',
                                                        }}>
                                                            {(log.exercise_logs || [])
                                                                .sort((a, b) => a.exercise_order - b.exercise_order)
                                                                .map((el) => {
                                                                    const exercise = exercises[el.exercise_id];
                                                                    return (
                                                                        <div
                                                                            key={el.id}
                                                                            style={{
                                                                                padding: '0.75rem',
                                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                                borderRadius: '8px',
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                fontWeight: '600',
                                                                                fontSize: '0.9rem',
                                                                                color: '#39ff14',
                                                                                marginBottom: '0.5rem',
                                                                            }}>
                                                                                {exercise?.name || el.exercise_id}
                                                                            </div>

                                                                            {/* Sets Table */}
                                                                            {el.sets && el.sets.length > 0 ? (
                                                                                <div style={{
                                                                                    display: 'grid',
                                                                                    gap: '0.25rem',
                                                                                }}>
                                                                                    <div style={{
                                                                                        display: 'grid',
                                                                                        gridTemplateColumns: '2.5rem 1fr 1fr 1fr',
                                                                                        fontSize: '0.7rem',
                                                                                        color: '#666',
                                                                                        textTransform: 'uppercase',
                                                                                        padding: '0 0.25rem',
                                                                                    }}>
                                                                                        <span>Set</span>
                                                                                        <span>Weight</span>
                                                                                        <span>Reps</span>
                                                                                        <span>RPE</span>
                                                                                    </div>
                                                                                    {el.sets.map((s, idx) => (
                                                                                        <div
                                                                                            key={idx}
                                                                                            style={{
                                                                                                display: 'grid',
                                                                                                gridTemplateColumns: '2.5rem 1fr 1fr 1fr',
                                                                                                fontSize: '0.85rem',
                                                                                                color: s.is_warmup ? '#666' : '#ccc',
                                                                                                padding: '0.25rem',
                                                                                                background: s.is_warmup
                                                                                                    ? 'rgba(255,255,255,0.02)'
                                                                                                    : 'transparent',
                                                                                                borderRadius: '4px',
                                                                                                fontStyle: s.is_warmup ? 'italic' : 'normal',
                                                                                            }}
                                                                                        >
                                                                                            <span>{s.set_number}</span>
                                                                                            <span>{s.weight}{s.weight_unit === 'kg' ? 'kg' : 'lbs'}</span>
                                                                                            <span>{s.reps}</span>
                                                                                            <span>{s.rpe ?? '--'}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <p style={{
                                                                                    color: '#666',
                                                                                    fontSize: '0.8rem',
                                                                                }}>
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
