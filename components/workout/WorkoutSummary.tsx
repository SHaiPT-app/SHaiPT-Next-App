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
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
        },
        {
            icon: Dumbbell,
            label: 'Total Volume',
            value: `${summary.totalVolume.toLocaleString()} ${summary.volumeUnit}`,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/10',
        },
        {
            icon: Flame,
            label: 'Total Sets',
            value: summary.totalSets.toString(),
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
        },
        {
            icon: TrendingUp,
            label: 'Total Reps',
            value: summary.totalReps.toString(),
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
        },
    ], [summary.totalDurationSeconds, summary.totalVolume, summary.volumeUnit, summary.totalSets, summary.totalReps]);

    return (
        <div className="min-h-screen bg-gray-950 px-4 py-6">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Workout Complete!
                    </h1>
                    <p className="text-gray-400">{summary.sessionName}</p>
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
                                className={`p-4 rounded-xl ${stat.bgColor} border border-gray-800`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                    <span className="text-xs text-gray-400">{stat.label}</span>
                                </div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
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
                        className="bg-gray-900/50 rounded-xl border border-gray-800 p-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Average RPE</span>
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
                                <span className="text-xs text-gray-500">
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
                        className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-semibold text-white">Coach Feedback</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{aiFeedback}</p>
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
                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-5 h-5" />
                        Share
                    </button>
                    <button
                        onClick={onGoHome}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
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
                    className="text-center text-xs text-gray-600"
                >
                    Completed at {new Date(summary.completedAt).toLocaleTimeString()}
                </motion.p>
            </div>
        </div>
    );
}

export default WorkoutSummary;
