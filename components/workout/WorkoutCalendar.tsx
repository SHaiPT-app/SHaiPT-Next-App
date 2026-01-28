'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Coffee, Dumbbell } from 'lucide-react';
import type { TrainingPlanSessionWithRestDay, WorkoutLog } from '@/lib/types';

interface WorkoutCalendarProps {
    planSessions: TrainingPlanSessionWithRestDay[];
    workoutLogs: WorkoutLog[];
    planStartDate: string;
    onDaySelect: (dayNumber: number, session?: TrainingPlanSessionWithRestDay) => void;
    selectedDay?: number;
}

interface CalendarDay {
    date: Date;
    dayNumber: number;
    dayOfWeek: number;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    session?: TrainingPlanSessionWithRestDay;
    isCompleted: boolean;
    isRestDay: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkoutCalendar({
    planSessions,
    workoutLogs,
    planStartDate,
    onDaySelect,
    selectedDay,
}: WorkoutCalendarProps) {
    const [weekOffset, setWeekOffset] = useState(0);

    // Calculate the current week's days
    const weekDays = useMemo(() => {
        const startDate = new Date(planStartDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get the start of the current display week
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

        const days: CalendarDay[] = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            date.setHours(0, 0, 0, 0);

            // Calculate day number in plan
            const diffTime = date.getTime() - startDate.getTime();
            const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            // Find session for this day
            const session = planSessions.find(s => s.day_number === dayNumber);

            // Check if completed
            const dateStr = date.toISOString().split('T')[0];
            const isCompleted = workoutLogs.some(log => log.date === dateStr);

            days.push({
                date,
                dayNumber,
                dayOfWeek: date.getDay(),
                isToday: date.getTime() === today.getTime(),
                isPast: date < today,
                isFuture: date > today,
                session,
                isCompleted,
                isRestDay: session?.is_rest_day || false,
            });
        }

        return days;
    }, [planSessions, workoutLogs, planStartDate, weekOffset]);

    // Format date range for display
    const weekRange = useMemo(() => {
        if (weekDays.length === 0) return '';
        const start = weekDays[0].date;
        const end = weekDays[6].date;
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }, [weekDays]);

    const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
    const goToNextWeek = () => setWeekOffset(prev => prev + 1);
    const goToCurrentWeek = () => setWeekOffset(0);

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <button
                    onClick={goToPreviousWeek}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    onClick={goToCurrentWeek}
                    className="flex flex-col items-center"
                >
                    <span className="text-sm font-medium text-white">{weekRange}</span>
                    {weekOffset !== 0 && (
                        <span className="text-xs text-cyan-400">Tap to go to today</span>
                    )}
                </button>

                <button
                    onClick={goToNextWeek}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-800">
                {DAYS_OF_WEEK.map((day) => (
                    <div
                        key={day}
                        className="py-2 text-center text-xs font-medium text-gray-500"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
                <AnimatePresence mode="wait">
                    {weekDays.map((day) => (
                        <motion.button
                            key={day.date.toISOString()}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onClick={() => day.session && onDaySelect(day.dayNumber, day.session)}
                            disabled={!day.session || day.isFuture}
                            className={`
                                relative p-3 flex flex-col items-center gap-1
                                transition-colors border-r border-b border-gray-800 last:border-r-0
                                ${day.isToday ? 'bg-cyan-500/10' : ''}
                                ${selectedDay === day.dayNumber ? 'bg-cyan-500/20' : ''}
                                ${!day.session || day.isFuture ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/50 cursor-pointer'}
                            `}
                        >
                            {/* Date Number */}
                            <span
                                className={`
                                    text-lg font-bold
                                    ${day.isToday ? 'text-cyan-400' : 'text-white'}
                                    ${day.isPast && !day.isToday ? 'text-gray-400' : ''}
                                `}
                            >
                                {day.date.getDate()}
                            </span>

                            {/* Status Icon */}
                            <div className="h-6 flex items-center justify-center">
                                {day.isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-green-400" />
                                    </div>
                                ) : day.isRestDay ? (
                                    <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center">
                                        <Coffee className="w-4 h-4 text-gray-400" />
                                    </div>
                                ) : day.session ? (
                                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                        <Dumbbell className="w-4 h-4 text-cyan-400" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6" />
                                )}
                            </div>

                            {/* Today Indicator */}
                            {day.isToday && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                    <div className="w-1 h-1 rounded-full bg-cyan-400" />
                                </div>
                            )}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-3 border-t border-gray-800 bg-gray-900/30">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-xs text-gray-400">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Dumbbell className="w-3 h-3 text-cyan-400" />
                    </div>
                    <span className="text-xs text-gray-400">Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                        <Coffee className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-xs text-gray-400">Rest Day</span>
                </div>
            </div>
        </div>
    );
}

export default WorkoutCalendar;
