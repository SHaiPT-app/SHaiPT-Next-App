'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeeklyInsight } from '@/lib/types';
import { fadeInUp, staggerContainer } from '@/lib/animations';

interface WeeklyInsightsCardProps {
    userId: string;
    logs: Array<{
        id: string;
        date: string;
        exercises: Array<{
            name?: string;
            exercise_id?: string;
            sets: Array<{
                weight?: number;
                reps?: number;
                weight_unit?: string;
                rpe?: number;
                isPr?: boolean;
            }>;
        }>;
    }>;
}

const cardReveal = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const sectionReveal = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: 0.3 + i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
};

function AdherenceBar({ percentage }: { percentage: number }) {
    return (
        <div
            style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                style={{
                    height: '100%',
                    background:
                        percentage >= 80
                            ? 'var(--neon-green, #00ff88)'
                            : percentage >= 50
                              ? 'var(--neon-blue, #00d4ff)'
                              : 'var(--neon-pink, #ff0080)',
                    borderRadius: '4px',
                }}
            />
        </div>
    );
}

function TrendTag({ label, direction }: { label: string; direction: 'up' | 'down' }) {
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background:
                    direction === 'up'
                        ? 'rgba(0, 255, 136, 0.15)'
                        : 'rgba(255, 0, 128, 0.15)',
                color: direction === 'up' ? 'var(--neon-green, #00ff88)' : 'var(--neon-pink, #ff0080)',
                border: `1px solid ${direction === 'up' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 0, 128, 0.3)'}`,
            }}
        >
            {direction === 'up' ? '\u2191' : '\u2193'} {label}
        </span>
    );
}

export default function WeeklyInsightsCard({ userId, logs }: WeeklyInsightsCardProps) {
    const [insight, setInsight] = useState<WeeklyInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const workoutLogs = logs.map((log) => ({
                date: log.date,
                exercises: log.exercises.map((ex) => ({
                    name: ex.name || ex.exercise_id || 'Unknown',
                    sets: ex.sets.map((s) => ({
                        weight: s.weight || 0,
                        reps: s.reps || 0,
                        weight_unit: s.weight_unit || 'lbs',
                        rpe: s.rpe,
                    })),
                })),
            }));

            const res = await fetch('/api/ai-coach/weekly-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    workoutLogs,
                    plannedWorkouts: 4,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to fetch insights');
            }

            const data: WeeklyInsight = await res.json();
            setInsight(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [userId, logs]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    return (
        <motion.div
            className="glass-panel"
            variants={cardReveal}
            initial="hidden"
            animate="visible"
            style={{ padding: '2rem' }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                }}
            >
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                    Weekly AI Insights
                </h3>
                {insight && (
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                        {insight.week_start} &mdash; {insight.week_end}
                    </span>
                )}
            </div>

            {loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '2rem 0', color: '#888' }}
                >
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        Analyzing your week...
                    </motion.div>
                </motion.div>
            )}

            {error && (
                <div style={{ color: 'var(--error, #ff4444)', padding: '1rem 0' }}>
                    <p style={{ marginBottom: '0.5rem' }}>{error}</p>
                    <button
                        onClick={fetchInsights}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--error, #ff4444)',
                            color: 'var(--error, #ff4444)',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {insight && !loading && (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Overall Summary */}
                    <motion.p
                        variants={fadeInUp}
                        style={{
                            color: '#ccc',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                            marginBottom: '1.5rem',
                        }}
                    >
                        {insight.overall_summary}
                    </motion.p>

                    {/* Adherence */}
                    <motion.div
                        custom={0}
                        variants={sectionReveal}
                        initial="hidden"
                        animate="visible"
                        style={{ marginBottom: '1.25rem' }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
                                Adherence
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                {insight.adherence.completed_workouts}/{insight.adherence.planned_workouts} workouts
                            </span>
                        </div>
                        <AdherenceBar percentage={insight.adherence.adherence_percentage} />
                    </motion.div>

                    {/* Strength Trends */}
                    <motion.div
                        custom={1}
                        variants={sectionReveal}
                        initial="hidden"
                        animate="visible"
                        style={{ marginBottom: '1.25rem' }}
                    >
                        <span
                            style={{
                                fontSize: '0.8rem',
                                color: '#888',
                                fontWeight: 600,
                                display: 'block',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Strength Trends
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {insight.strength_trends.trending_up.map((ex) => (
                                <TrendTag key={ex} label={ex} direction="up" />
                            ))}
                            {insight.strength_trends.trending_down.map((ex) => (
                                <TrendTag key={ex} label={ex} direction="down" />
                            ))}
                            {insight.strength_trends.trending_up.length === 0 &&
                                insight.strength_trends.trending_down.length === 0 && (
                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        No significant trends yet
                                    </span>
                                )}
                        </div>
                    </motion.div>

                    {/* Expandable Details */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--neon-blue, #00d4ff)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '0.25rem 0',
                            marginBottom: expanded ? '1rem' : 0,
                        }}
                    >
                        {expanded ? 'Show less' : 'Show details'}
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden' }}
                            >
                                {/* Plateaus */}
                                {insight.plateaus.exercises.length > 0 && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <span
                                            style={{
                                                fontSize: '0.8rem',
                                                color: '#888',
                                                fontWeight: 600,
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                            }}
                                        >
                                            Plateaus Detected
                                        </span>
                                        <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>
                                            {insight.plateaus.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Recommendations */}
                                <div>
                                    <span
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#888',
                                            fontWeight: 600,
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        Recommendations
                                    </span>
                                    <ul
                                        style={{
                                            margin: 0,
                                            paddingLeft: '1.25rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        {insight.recommendations.map((rec, i) => (
                                            <motion.li
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    color: '#ccc',
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {rec}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Detailed Summaries */}
                                <div
                                    style={{
                                        marginTop: '1.25rem',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                    }}
                                >
                                    <p
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#999',
                                            margin: '0 0 0.5rem',
                                        }}
                                    >
                                        {insight.adherence.summary}
                                    </p>
                                    <p
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#999',
                                            margin: 0,
                                        }}
                                    >
                                        {insight.strength_trends.summary}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </motion.div>
    );
}
