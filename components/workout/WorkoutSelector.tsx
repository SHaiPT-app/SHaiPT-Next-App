'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    Dumbbell,
    ChevronRight,
    Bookmark,
    Play,
    Sparkles,
} from 'lucide-react';
import { WorkoutCalendar } from './WorkoutCalendar';
import type {
    TrainingPlanAssignment,
    TrainingPlan,
    TrainingPlanSessionWithRestDay,
    WorkoutSession,
    WorkoutLog,
} from '@/lib/types';

interface WorkoutSelectorProps {
    userId: string;
    activeAssignment?: TrainingPlanAssignment | null;
    plan?: TrainingPlan | null;
    planSessions: TrainingPlanSessionWithRestDay[];
    sessions: Map<string, WorkoutSession>;
    workoutLogs: WorkoutLog[];
    savedSessions: WorkoutSession[];
    onSelectSession: (session: WorkoutSession, dayNumber?: number) => void;
    onStartQuickWorkout: () => void;
}

export function WorkoutSelector({
    userId,
    activeAssignment,
    plan,
    planSessions,
    sessions,
    workoutLogs,
    savedSessions,
    onSelectSession,
    onStartQuickWorkout,
}: WorkoutSelectorProps) {
    const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'plan' | 'saved'>('plan');

    // Get today's session from the plan
    const todaysSession = (() => {
        if (!activeAssignment || !plan) return null;
        const today = new Date();
        const startDate = new Date(activeAssignment.start_date);
        const diffTime = today.getTime() - startDate.getTime();
        const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const planSession = planSessions.find(ps => ps.day_number === dayNumber);
        if (!planSession || planSession.is_rest_day) return null;
        const session = sessions.get(planSession.session_id);
        return session ? { session, dayNumber, planSession } : null;
    })();

    // Handle day selection from calendar
    const handleDaySelect = (dayNumber: number, planSession?: TrainingPlanSessionWithRestDay) => {
        setSelectedDayNumber(dayNumber);
        if (planSession && !planSession.is_rest_day) {
            const session = sessions.get(planSession.session_id);
            if (session) {
                onSelectSession(session, dayNumber);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Today's Workout Card */}
            {todaysSession && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                            <span className="text-sm font-medium text-cyan-400">Today's Workout</span>
                        </div>
                        <span className="text-xs text-gray-400">
                            Day {todaysSession.dayNumber} of {plan?.duration_weeks ? plan.duration_weeks * 7 : '--'}
                        </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                        {todaysSession.session.name}
                    </h3>

                    {todaysSession.session.description && (
                        <p className="text-sm text-gray-400 mb-4">
                            {todaysSession.session.description}
                        </p>
                    )}

                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Dumbbell className="w-4 h-4" />
                            <span>{todaysSession.session.exercises.length} exercises</span>
                        </div>
                        {todaysSession.planSession.expected_duration_minutes && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>~{todaysSession.planSession.expected_duration_minutes} min</span>
                            </div>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectSession(todaysSession.session, todaysSession.dayNumber)}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500
                                 text-white font-medium flex items-center justify-center gap-2
                                 shadow-lg shadow-cyan-500/20"
                    >
                        <Play className="w-5 h-5" />
                        Start Workout
                    </motion.button>
                </motion.div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-900/50 rounded-lg border border-gray-800">
                <button
                    onClick={() => setActiveTab('plan')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'plan'
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <Calendar className="w-4 h-4 inline-block mr-2" />
                    This Week
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'saved'
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <Bookmark className="w-4 h-4 inline-block mr-2" />
                    Saved Workouts
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'plan' ? (
                    <motion.div
                        key="plan"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        {activeAssignment && plan ? (
                            <WorkoutCalendar
                                planSessions={planSessions}
                                workoutLogs={workoutLogs}
                                planStartDate={activeAssignment.start_date}
                                onDaySelect={handleDaySelect}
                                selectedDay={selectedDayNumber ?? undefined}
                            />
                        ) : (
                            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 text-center">
                                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    No Active Training Plan
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    You don't have an active training plan assigned. Create or get one assigned by your coach.
                                </p>
                                <button
                                    onClick={onStartQuickWorkout}
                                    className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 font-medium
                                             hover:bg-cyan-500/30 transition-colors"
                                >
                                    Start Quick Workout
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="saved"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-2"
                    >
                        {savedSessions.length > 0 ? (
                            savedSessions.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => onSelectSession(session)}
                                    className="w-full p-4 bg-gray-900/50 rounded-xl border border-gray-800
                                             hover:border-gray-700 transition-colors text-left
                                             flex items-center justify-between group"
                                >
                                    <div>
                                        <h4 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                                            {session.name}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                                            <span>{session.exercises.length} exercises</span>
                                            {session.tags && session.tags.length > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs">
                                                    {session.tags[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                                </button>
                            ))
                        ) : (
                            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 text-center">
                                <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    No Saved Workouts
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Save your favorite workout sessions for quick access.
                                </p>
                            </div>
                        )}

                        {/* Quick Workout Button */}
                        <button
                            onClick={onStartQuickWorkout}
                            className="w-full p-4 bg-gray-900/50 rounded-xl border border-dashed border-gray-700
                                     hover:border-cyan-500/50 transition-colors text-center group"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Play className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                <span className="text-gray-400 group-hover:text-cyan-400 transition-colors font-medium">
                                    Start Quick Workout
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Create a custom workout on the fly
                            </p>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default WorkoutSelector;
