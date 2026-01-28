'use client';

import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, PieChart, Pie, Cell,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    CartesianGrid, XAxis, YAxis, Area, AreaChart,
} from 'recharts';
import { format, parseISO, eachWeekOfInterval, subMonths } from 'date-fns';
import type {
    WorkoutLogWithExercises,
    Exercise,
} from '@/lib/types';

// ============================================
// SHARED CONSTANTS
// ============================================

const CHART_COLORS = {
    neonOrange: '#FF6600',
    neonOrangeDim: 'rgba(255, 102, 0, 0.3)',
    neonPink: '#ff007f',
    purple: '#8884d8',
    orange: '#ff8042',
    yellow: '#ffc658',
    white: '#ffffff',
    gray: '#888',
    darkBg: '#1F1F29',
    gridLine: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
};

const MUSCLE_COLORS = [
    '#FF6600', '#E55C00', '#ff007f', '#ffc658',
    '#8884d8', '#ff8042', '#FF8533', '#e879f9',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const tooltipStyle = {
    background: CHART_COLORS.darkBg,
    border: `1px solid ${CHART_COLORS.border}`,
    borderRadius: '8px',
    fontSize: '0.85rem',
};

// ============================================
// 1. VOLUME OVER TIME CHART
// ============================================

interface VolumeOverTimeProps {
    logs: WorkoutLogWithExercises[];
}

export function VolumeOverTimeChart({ logs }: VolumeOverTimeProps) {
    const chartData = useMemo(() => {
        const volumeByDate: Record<string, number> = {};

        logs.forEach((log) => {
            const dateKey = log.date;
            let volume = 0;
            (log.exercise_logs || []).forEach((el) => {
                (el.sets || []).forEach((s) => {
                    if (!s.is_warmup) {
                        volume += (s.weight || 0) * (s.reps || 0);
                    }
                });
            });
            volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + volume;
        });

        return Object.entries(volumeByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-30)
            .map(([date, volume]) => ({
                date: format(parseISO(date), 'MM/dd'),
                volume: Math.round(volume),
            }));
    }, [logs]);

    if (chartData.length === 0) {
        return <EmptyChartState message="No volume data yet" />;
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, marginBottom: '1rem' }}>
                Volume Over Time
            </h4>
            <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.neonOrange} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={CHART_COLORS.neonOrange} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridLine} vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
                        />
                        <RechartsTooltip
                            cursor={{ stroke: CHART_COLORS.neonOrange, strokeWidth: 1, strokeDasharray: '3 3' }}
                            contentStyle={tooltipStyle}
                            formatter={(value: number) => [`${value.toLocaleString()} lbs`, 'Volume']}
                        />
                        <Area
                            type="monotone"
                            dataKey="volume"
                            stroke={CHART_COLORS.neonOrange}
                            fill="url(#volumeGradient)"
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS.neonOrange, r: 3 }}
                            activeDot={{ r: 5, fill: CHART_COLORS.neonOrange }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ============================================
// 2. STRENGTH PROGRESSION PER EXERCISE
// ============================================

interface StrengthProgressionProps {
    logs: WorkoutLogWithExercises[];
    exercises: Record<string, Exercise>;
}

export function StrengthProgressionChart({ logs, exercises }: StrengthProgressionProps) {
    const exerciseOptions = useMemo(() => {
        const exerciseIds = new Set<string>();
        logs.forEach((log) => {
            (log.exercise_logs || []).forEach((el) => {
                exerciseIds.add(el.exercise_id);
            });
        });
        return Array.from(exerciseIds).map((id) => ({
            id,
            name: exercises[id]?.name || id,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [logs, exercises]);

    const [selectedExercise, setSelectedExercise] = useState<string>('');

    const activeExerciseId = selectedExercise || (exerciseOptions.length > 0 ? exerciseOptions[0].id : '');

    const chartData = useMemo(() => {
        if (!activeExerciseId) return [];

        const dataPoints: { date: string; maxWeight: number; bestSet: string }[] = [];

        const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

        sortedLogs.forEach((log) => {
            const exerciseLogs = (log.exercise_logs || []).filter(
                (el) => el.exercise_id === activeExerciseId
            );

            exerciseLogs.forEach((el) => {
                let maxWeight = 0;
                let bestReps = 0;
                (el.sets || []).forEach((s) => {
                    if (!s.is_warmup && (s.weight || 0) > maxWeight) {
                        maxWeight = s.weight || 0;
                        bestReps = s.reps || 0;
                    }
                });
                if (maxWeight > 0) {
                    dataPoints.push({
                        date: format(parseISO(log.date), 'MM/dd'),
                        maxWeight,
                        bestSet: `${maxWeight} x ${bestReps}`,
                    });
                }
            });
        });

        return dataPoints;
    }, [logs, activeExerciseId]);

    if (exerciseOptions.length === 0) {
        return <EmptyChartState message="No exercise data yet" />;
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, margin: 0 }}>
                    Strength Progression
                </h4>
                <select
                    data-testid="exercise-select"
                    value={activeExerciseId}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: `1px solid ${CHART_COLORS.border}`,
                        borderRadius: '8px',
                        color: 'white',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.8rem',
                        maxWidth: '200px',
                        cursor: 'pointer',
                    }}
                >
                    {exerciseOptions.map((ex) => (
                        <option key={ex.id} value={ex.id} style={{ background: CHART_COLORS.darkBg }}>
                            {ex.name}
                        </option>
                    ))}
                </select>
            </div>
            <div style={{ height: '260px' }}>
                {chartData.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '0.85rem' }}>
                        No data for this exercise
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridLine} vertical={false} />
                            <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                                contentStyle={tooltipStyle}
                                formatter={(value: number, _name: string, props: { payload: { bestSet: string } }) => [
                                    `${value} lbs (${props.payload.bestSet})`,
                                    'Max Weight',
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="maxWeight"
                                stroke={CHART_COLORS.neonOrange}
                                strokeWidth={2}
                                dot={{ fill: CHART_COLORS.neonOrange, r: 4 }}
                                activeDot={{ r: 6, fill: CHART_COLORS.neonOrange, stroke: CHART_COLORS.darkBg, strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

// ============================================
// 3. BODY WEIGHT TREND
// ============================================

interface BodyWeightTrendProps {
    weightHistory: { date: string; weight: number }[];
    unit?: 'lbs' | 'kg';
}

export function BodyWeightTrendChart({ weightHistory, unit = 'lbs' }: BodyWeightTrendProps) {
    const chartData = useMemo(() => {
        return [...weightHistory]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((entry) => ({
                date: format(parseISO(entry.date), 'MM/dd'),
                weight: Math.round(entry.weight * 10) / 10,
            }));
    }, [weightHistory]);

    if (chartData.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, marginBottom: '1rem' }}>
                    Body Weight Trend
                </h4>
                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#666', fontSize: '0.85rem' }}>
                        No body weight data recorded yet. Log your weight in your profile to track trends.
                    </p>
                </div>
            </div>
        );
    }

    const weights = chartData.map((d) => d.weight);
    const minWeight = Math.floor(Math.min(...weights) - 2);
    const maxWeight = Math.ceil(Math.max(...weights) + 2);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, marginBottom: '1rem' }}>
                Body Weight Trend
            </h4>
            <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.neonPink} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={CHART_COLORS.neonPink} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridLine} vertical={false} />
                        <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            domain={[minWeight, maxWeight]}
                            tickFormatter={(v) => `${v}`}
                        />
                        <RechartsTooltip
                            contentStyle={tooltipStyle}
                            formatter={(value: number) => [`${value} ${unit}`, 'Weight']}
                        />
                        <Area
                            type="monotone"
                            dataKey="weight"
                            stroke={CHART_COLORS.neonPink}
                            fill="url(#weightGradient)"
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS.neonPink, r: 3 }}
                            activeDot={{ r: 5, fill: CHART_COLORS.neonPink }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ============================================
// 4. WORKOUT FREQUENCY HEATMAP
// ============================================

interface WorkoutFrequencyHeatmapProps {
    logs: WorkoutLogWithExercises[];
}

interface HeatmapCell {
    weekLabel: string;
    weekStart: Date;
    day: number;
    dayLabel: string;
    count: number;
}

export function WorkoutFrequencyHeatmap({ logs }: WorkoutFrequencyHeatmapProps) {
    const { cells, maxCount, weeks } = useMemo(() => {
        const now = new Date();
        const threeMonthsAgo = subMonths(now, 3);
        const weekStarts = eachWeekOfInterval(
            { start: threeMonthsAgo, end: now },
            { weekStartsOn: 0 }
        );

        // Count workouts per date
        const countByDate: Record<string, number> = {};
        logs.forEach((log) => {
            const dateKey = log.date;
            countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
        });

        let maxCount = 0;
        const cells: HeatmapCell[] = [];

        weekStarts.forEach((weekStart) => {
            const weekLabel = format(weekStart, 'MM/dd');
            for (let d = 0; d < 7; d++) {
                const cellDate = new Date(weekStart);
                cellDate.setDate(cellDate.getDate() + d);
                if (cellDate > now) continue;

                const dateKey = format(cellDate, 'yyyy-MM-dd');
                const count = countByDate[dateKey] || 0;
                if (count > maxCount) maxCount = count;

                cells.push({
                    weekLabel,
                    weekStart,
                    day: d,
                    dayLabel: DAY_LABELS[d],
                    count,
                });
            }
        });

        return { cells, maxCount, weeks: weekStarts };
    }, [logs]);

    const getCellColor = (count: number) => {
        if (count === 0) return 'rgba(255,255,255,0.04)';
        const intensity = Math.min(count / Math.max(maxCount, 1), 1);
        if (intensity <= 0.33) return 'rgba(255, 102, 0, 0.2)';
        if (intensity <= 0.66) return 'rgba(255, 102, 0, 0.45)';
        return 'rgba(255, 102, 0, 0.8)';
    };

    const CELL_SIZE = 14;
    const CELL_GAP = 3;
    const LABEL_WIDTH = 30;

    if (logs.length === 0) {
        return <EmptyChartState message="No workout data for heatmap" />;
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, marginBottom: '1rem' }}>
                Workout Frequency (Last 3 Months)
            </h4>
            <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0' }}>
                    {/* Day labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px`, marginRight: '4px', paddingTop: '0' }}>
                        {DAY_LABELS.map((label, i) => (
                            <div
                                key={label}
                                style={{
                                    height: `${CELL_SIZE}px`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '0.6rem',
                                    color: '#666',
                                    width: `${LABEL_WIDTH}px`,
                                    visibility: i % 2 === 1 ? 'visible' : 'hidden',
                                }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                    {/* Heatmap grid */}
                    <div style={{ display: 'flex', gap: `${CELL_GAP}px` }}>
                        {weeks.map((weekStart) => {
                            const weekCells = cells.filter(
                                (c) => c.weekStart.getTime() === weekStart.getTime()
                            );
                            return (
                                <div
                                    key={weekStart.toISOString()}
                                    style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}
                                >
                                    {Array.from({ length: 7 }, (_, dayIdx) => {
                                        const cell = weekCells.find((c) => c.day === dayIdx);
                                        if (!cell) {
                                            return (
                                                <div
                                                    key={dayIdx}
                                                    style={{
                                                        width: `${CELL_SIZE}px`,
                                                        height: `${CELL_SIZE}px`,
                                                        borderRadius: '2px',
                                                        background: 'transparent',
                                                    }}
                                                />
                                            );
                                        }
                                        return (
                                            <div
                                                key={dayIdx}
                                                data-testid="heatmap-cell"
                                                title={`${format(new Date(cell.weekStart.getTime() + dayIdx * 86400000), 'MMM d')}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
                                                style={{
                                                    width: `${CELL_SIZE}px`,
                                                    height: `${CELL_SIZE}px`,
                                                    borderRadius: '2px',
                                                    background: getCellColor(cell.count),
                                                    cursor: 'default',
                                                    transition: 'transform 0.1s',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', marginLeft: `${LABEL_WIDTH + 4}px` }}>
                    <span style={{ fontSize: '0.65rem', color: '#666' }}>Less</span>
                    {[0, 0.33, 0.66, 1].map((intensity, i) => (
                        <div
                            key={i}
                            style={{
                                width: `${CELL_SIZE}px`,
                                height: `${CELL_SIZE}px`,
                                borderRadius: '2px',
                                background: getCellColor(intensity * Math.max(maxCount, 1)),
                            }}
                        />
                    ))}
                    <span style={{ fontSize: '0.65rem', color: '#666' }}>More</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// 5. MUSCLE GROUP VOLUME DISTRIBUTION
// ============================================

interface MuscleGroupVolumeProps {
    logs: WorkoutLogWithExercises[];
    exercises: Record<string, Exercise>;
}

interface MuscleVolumeData {
    name: string;
    volume: number;
    sets: number;
    color: string;
}

export function MuscleGroupVolumeChart({ logs, exercises }: MuscleGroupVolumeProps) {
    const chartData = useMemo((): MuscleVolumeData[] => {
        const muscleVolumes: Record<string, { volume: number; sets: number }> = {};

        logs.forEach((log) => {
            (log.exercise_logs || []).forEach((el) => {
                const exercise = exercises[el.exercise_id];
                if (!exercise) return;

                const targetMuscles = exercise.target_muscles || [];
                let exerciseVolume = 0;
                let exerciseSets = 0;

                (el.sets || []).forEach((s) => {
                    if (!s.is_warmup) {
                        exerciseVolume += (s.weight || 0) * (s.reps || 0);
                        exerciseSets += 1;
                    }
                });

                // Distribute volume across target muscles
                const muscleCount = targetMuscles.length || 1;
                targetMuscles.forEach((muscle) => {
                    const key = muscle.charAt(0).toUpperCase() + muscle.slice(1).toLowerCase();
                    if (!muscleVolumes[key]) {
                        muscleVolumes[key] = { volume: 0, sets: 0 };
                    }
                    muscleVolumes[key].volume += exerciseVolume / muscleCount;
                    muscleVolumes[key].sets += exerciseSets;
                });
            });
        });

        return Object.entries(muscleVolumes)
            .map(([name, data], i) => ({
                name,
                volume: Math.round(data.volume),
                sets: data.sets,
                color: MUSCLE_COLORS[i % MUSCLE_COLORS.length],
            }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 8);
    }, [logs, exercises]);

    if (chartData.length === 0) {
        return <EmptyChartState message="No muscle group data yet" />;
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: CHART_COLORS.gray, marginBottom: '1rem' }}>
                Muscle Group Volume Distribution
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                {/* Pie chart */}
                <div style={{ height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="volume"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={tooltipStyle}
                                formatter={(value: number, name: string) => [
                                    `${value.toLocaleString()} lbs`,
                                    name,
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend with bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {chartData.map((entry) => {
                        const maxVolume = chartData[0]?.volume || 1;
                        const barWidth = Math.max((entry.volume / maxVolume) * 100, 5);
                        return (
                            <div key={entry.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                                    <span style={{ color: entry.color }}>{entry.name}</span>
                                    <span style={{ color: '#888' }}>{entry.sets}s</span>
                                </div>
                                <div style={{
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${barWidth}%`,
                                        background: entry.color,
                                        borderRadius: '3px',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyChartState({ message }: { message: string }) {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{
                height: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>{message}</p>
            </div>
        </div>
    );
}
