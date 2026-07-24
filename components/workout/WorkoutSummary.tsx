'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Dumbbell,
    Trophy,
    Flame,
    TrendingUp,
    MessageSquare,
    Share2,
    Home,
} from 'lucide-react';
import { PRDisplay } from './PRDisplay';
import type { WorkoutSummaryData } from '@/lib/types';

interface WorkoutSummaryProps {
    summary: WorkoutSummaryData;
    aiFeedback?: string;
    onGoHome: () => void;
    onShare: () => void;
}

export function WorkoutSummary({
    summary,
    aiFeedback,
    onGoHome,
    onShare,
}: WorkoutSummaryProps) {
    // Format duration — include seconds for sub-minute durations
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        if (minutes > 0) {
            return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
        }
        return `${secs}s`;
    };

    // Calculate stats
    const stats = useMemo(() => [
        {
            icon: Clock,
            label: 'Duration',
            value: formatDuration(summary.totalDurationSeconds),
            color: 'text-brand',
            bgColor: 'bg-[var(--brand-glow-soft)]',
        },
        {
            icon: Dumbbell,
            label: 'Total Volume',
            value: `${summary.totalVolume.toLocaleString()} ${summary.volumeUnit}`,
            color: 'text-brand-hot',
            bgColor: 'bg-[var(--brand-glow-soft)]',
        },
        {
            icon: Flame,
            label: 'Total Sets',
            value: summary.totalSets.toString(),
            color: 'text-brand',
            bgColor: 'bg-[var(--brand-glow-soft)]',
        },
        {
            icon: TrendingUp,
            label: 'Total Reps',
            value: summary.totalReps.toString(),
            color: 'text-brand-hot',
            bgColor: 'bg-[var(--brand-glow-soft)]',
        },
    ], [summary.totalDurationSeconds, summary.totalVolume, summary.volumeUnit, summary.totalSets, summary.totalReps]);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] px-4 py-6">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-[image:var(--brand-gradient)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_var(--brand-glow)]">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="display text-2xl mb-1">
                        Workout Complete!
                    </h1>
                    <p className="text-ink-mid">{summary.sessionName}</p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 gap-3"
                >
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                className={`p-4 rounded-xl ${stat.bgColor} border border-line-soft`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                    <span className="text-xs text-ink-mid">{stat.label}</span>
                                </div>
                                <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* PRs Section */}
                {summary.prsAchieved.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <PRDisplay prs={summary.prsAchieved} />
                    </motion.div>
                )}

                {/* Average RPE */}
                {summary.averageRpe && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="glass-card p-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-ink-mid">Average RPE</span>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        summary.averageRpe >= 9 ? 'bg-red-500/20 text-red-400' :
                                        summary.averageRpe >= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-green-500/20 text-green-400'
                                    }`}
                                >
                                    {summary.averageRpe.toFixed(1)}
                                </div>
                                <span className="text-xs text-ink-low">
                                    {summary.averageRpe >= 9 ? 'Maximal' :
                                     summary.averageRpe >= 7 ? 'Hard' :
                                     'Moderate'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* AI Feedback */}
                {aiFeedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-[var(--brand-glow-soft)] rounded-xl border border-brand/30 p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-5 h-5 text-brand" />
                            <h3 className="font-semibold text-ink-hi">Coach Feedback</h3>
                        </div>
                        <p className="text-ink-mid text-sm leading-relaxed">{aiFeedback}</p>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex gap-3"
                >
                    <button
                        onClick={onShare}
                        className="btn-outline flex-1"
                    >
                        <Share2 className="w-5 h-5" />
                        Share
                    </button>
                    <button
                        onClick={onGoHome}
                        className="btn-brand flex-1"
                    >
                        <Home className="w-5 h-5" />
                        Done
                    </button>
                </motion.div>

                {/* Timestamp */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-xs text-ink-low"
                >
                    Completed at {new Date(summary.completedAt).toLocaleTimeString()}
                </motion.p>
            </div>
        </div>
    );
}

export default WorkoutSummary;
