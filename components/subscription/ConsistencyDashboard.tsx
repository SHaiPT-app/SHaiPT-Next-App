'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Calendar,
    Flame,
    Target,
    Clock,
    AlertCircle,
    ChevronRight,
    Shield,
} from 'lucide-react';
import type { ConsistencyChallenge, ConsistencyLog } from '@/lib/types';

interface ConsistencyDashboardProps {
    challenge: ConsistencyChallenge | null;
    logs: ConsistencyLog[];
    onEnroll: () => void;
    onRequestGrace: () => void;
}

export function ConsistencyDashboard({
    challenge,
    logs,
    onEnroll,
    onRequestGrace,
}: ConsistencyDashboardProps) {
    // Calculate stats
    const stats = useMemo(() => {
        if (!challenge) {
            return {
                weeksCompleted: 0,
                totalWorkouts: 0,
                currentStreak: 0,
                daysRemaining: 0,
                progress: 0,
            };
        }

        const completedLogs = logs.filter(log => log.completed);
        const totalWorkouts = completedLogs.length;

        // Calculate current streak
        let currentStreak = 0;
        const sortedLogs = [...logs].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        for (const log of sortedLogs) {
            if (log.completed) {
                currentStreak++;
            } else if (log.scheduled) {
                break;
            }
        }

        // Calculate days remaining in challenge (12 weeks = 84 days)
        const startDate = new Date(challenge.started_at);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 84);
        const today = new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        // Progress percentage
        const daysPassed = 84 - daysRemaining;
        const progress = Math.round((daysPassed / 84) * 100);

        return {
            weeksCompleted: challenge.weeks_completed,
            totalWorkouts,
            currentStreak,
            daysRemaining,
            progress,
        };
    }, [challenge, logs]);

    // Get this week's days
    const weekDays = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const log = logs.find(l => l.date === dateStr);
            return {
                date,
                dateStr,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNum: date.getDate(),
                isToday: date.toDateString() === today.toDateString(),
                isPast: date < today,
                scheduled: log?.scheduled || false,
                completed: log?.completed || false,
            };
        });
    }, [logs]);

    if (!challenge) {
        return (
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        Earn Free Pro Access
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                        Complete the 12-week consistency challenge and get free Pro access.
                        Just stick to your training plan!
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">12</div>
                            <div className="text-xs text-gray-500">Weeks</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">3-5</div>
                            <div className="text-xs text-gray-500">Workouts/Week</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">1</div>
                            <div className="text-xs text-gray-500">Grace Period</div>
                        </div>
                    </div>

                    <button
                        onClick={onEnroll}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium"
                    >
                        Start Challenge
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Consistency Challenge</h3>
                            <p className="text-sm text-purple-400">
                                {challenge.status === 'grace_period' ? 'Grace Period Active' : 'In Progress'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">{stats.weeksCompleted}/12</div>
                        <div className="text-xs text-gray-500">weeks</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Started {new Date(challenge.started_at).toLocaleDateString()}</span>
                    <span>{stats.daysRemaining} days left</span>
                </div>
            </div>

            {/* This Week */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">This Week</h4>
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => (
                        <div
                            key={day.dateStr}
                            className={`
                                flex flex-col items-center p-2 rounded-lg
                                ${day.isToday ? 'bg-cyan-500/10 border border-cyan-500/30' : ''}
                                ${day.completed ? 'bg-green-500/10' : ''}
                            `}
                        >
                            <span className="text-xs text-gray-500">{day.dayName}</span>
                            <span className={`text-lg font-bold ${day.isToday ? 'text-cyan-400' : 'text-white'}`}>
                                {day.dayNum}
                            </span>
                            {day.completed ? (
                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                    <span className="text-xs text-white">✓</span>
                                </div>
                            ) : day.scheduled ? (
                                <div className="w-4 h-4 rounded-full bg-gray-700" />
                            ) : (
                                <div className="w-4 h-4" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Missed Days Warning */}
                {challenge.missed_days_this_week > 0 && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">
                            {challenge.missed_days_this_week} missed workout{challenge.missed_days_this_week > 1 ? 's' : ''} this week
                        </span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-3 text-center">
                    <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">{stats.currentStreak}</div>
                    <div className="text-xs text-gray-500">Streak</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-3 text-center">
                    <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">{stats.totalWorkouts}</div>
                    <div className="text-xs text-gray-500">Workouts</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-3 text-center">
                    <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">{stats.daysRemaining}</div>
                    <div className="text-xs text-gray-500">Days Left</div>
                </div>
            </div>

            {/* Grace Period Button */}
            {challenge.status === 'active' && !challenge.grace_period_requested_at && (
                <button
                    onClick={onRequestGrace}
                    className="w-full p-4 bg-gray-900/50 rounded-xl border border-gray-800 flex items-center justify-between hover:border-gray-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div className="text-left">
                            <p className="text-sm font-medium text-white">Need a Break?</p>
                            <p className="text-xs text-gray-500">Request a grace period for medical reasons</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
            )}

            {/* Grace Period Active */}
            {challenge.status === 'grace_period' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-blue-400">Grace Period Active</span>
                    </div>
                    <p className="text-sm text-gray-400">
                        Your challenge is paused until{' '}
                        {challenge.grace_period_expires_at
                            ? new Date(challenge.grace_period_expires_at).toLocaleDateString()
                            : 'approved'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default ConsistencyDashboard;
