'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { MagicBentoCard } from './MagicBento';
import MagicBento from './MagicBento'; // Wrapper for styles
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { WorkoutLog, WorkoutSession, UserStats, UserStatsHistory } from '@/lib/types';

// ============================================
// TYPES
// ============================================

interface AnalyticsDashboardProps {
    userId: string;
}

interface AnalyticsState {
    logs: WorkoutLog[];
    stats: UserStats | null;
    history: UserStatsHistory[];
    loading: boolean;
}

// ============================================
// HEADER COMPONENTS
// ============================================

const BentoHeader = ({ title, icon }: { title: string, icon?: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm uppercase tracking-wider opacity-70 font-semibold">{title}</h4>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
    const [data, setData] = useState<AnalyticsState>({ logs: [], stats: null, history: [], loading: true });
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [viewState, setViewState] = useState<'dashboard' | 'inspector' | 'workout_detail'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Workout Logs
            const { data: logs } = await supabase
                .from('workout_logs')
                .select('*, exercise_logs(*)')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            // 2. Fetch User Stats
            const { data: stats } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .single();

            // 3. Fetch History (Recent Trends)
            // Using RPC if available, or fallback to table query
            let historyData: any[] = [];
            const { data: historyRPC, error: rpcError } = await supabase
                .rpc('get_recent_stats', { p_user_id: userId, p_days: 30 });

            if (!rpcError && historyRPC) {
                historyData = historyRPC;
            } else {
                // Fallback to manual query
                const { data: historyTable } = await supabase
                    .from('user_stats_history')
                    .select('*')
                    .eq('user_id', userId)
                    .order('date', { ascending: false })
                    .limit(30);
                historyData = historyTable || [];
            }

            setData({
                logs: logs as any[] || [],
                stats: stats as UserStats | null,
                history: historyData.reverse(), // Reverse for chronological chart order
                loading: false
            });
        };

        fetchData();
    }, [userId]);

    // ============================================
    // COMPUTED STATS
    // ============================================

    const computedStats = useMemo(() => {
        if (!data.stats) return null;

        // Parse muscle breakdown from JSONB
        // Expected format: { "chest": { "volume": 5000, "sets": 20 }, ... }
        const muscleData = Object.entries(data.stats.muscle_group_volumes || {}).map(([muscle, metrics]: [string, any]) => ({
            name: muscle.charAt(0).toUpperCase() + muscle.slice(1),
            value: metrics.volume || 0,
            sets: metrics.sets || 0,
            color: '#F25F29' // We can vary this if we want specific colors map
        })).sort((a, b) => b.value - a.value);

        // Assign colors dynamically for top 5 (e.g. shades of orange/purple)
        const COLORS = ['#F25F29', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];
        muscleData.forEach((d, i) => {
            d.color = COLORS[i % COLORS.length];
        });

        return {
            username: 'User', // Could fetch profile
            streak: data.stats.current_streak_days,
            longestStreak: data.stats.longest_streak_days,
            muscleSplitData: muscleData
        };
    }, [data.stats]);


    if (data.loading) return <div className="p-10 text-center text-white/50">Loading Analytics...</div>;

    // ============================================
    // RENDER HELPERS
    // ============================================

    const renderLeftColumn = () => (
        <div className="flex flex-col gap-4 h-full">
            {/* STREAK */}
            <MagicBentoCard className="aspect-square flex items-center justify-center text-center p-4">
                <div className="flex flex-col items-center">
                    <span className="text-4xl mb-2">🔥</span>
                    <span className="text-3xl font-bold font-orbitron text-[var(--primary)]">{computedStats?.streak || 0}</span>
                    <span className="text-xs text-white/60 uppercase mt-1">Day Streak</span>
                </div>
            </MagicBentoCard>

            {/* MUSCLE SPLIT */}
            <MagicBentoCard className="aspect-[1/1.5] md:aspect-[1/2]" header={<BentoHeader title="Muscle Split" />}>
                <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                        <Pie
                            data={computedStats?.muscleSplitData || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {computedStats?.muscleSplitData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </MagicBentoCard>

            {/* FAVORITES */}
            <MagicBentoCard className="flex-grow min-h-[200px]" header={<BentoHeader title="Top Exercises" />}>
                <ul className="space-y-3 mt-2 text-sm text-white/80">
                    {/* Placeholder for top exercises until we query them properly */}
                    {['Bench Press', 'Squat', 'Deadlift', 'Pull Ups', 'Shoulder Press'].map((ex, i) => (
                        <li
                            key={i}
                            className="flex justify-between items-center p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                            onClick={() => {
                                setSelectedExercise(ex);
                                setViewState('inspector');
                            }}
                        >
                            <span>{i + 1}. {ex}</span>
                            <span className="opacity-50 text-xs">→</span>
                        </li>
                    ))}
                </ul>
            </MagicBentoCard>
        </div>
    );

    const renderRightColumn = () => {
        // Feed Data
        const feedItems = data.logs.filter(l =>
            l.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            true // TODO: Filter logic
        );

        return (
            <div className="flex flex-col gap-4 h-full">
                {/* FEED CARD (Large, Scrollable) */}
                <MagicBentoCard
                    className="w-full h-[500px] flex flex-col" // Fixed height for scrolling
                >
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-[#15151F] z-20 pb-4 border-b border-white/10 mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-orbitron text-xl">Workout Log</h3>
                            <div className="text-xs text-[var(--primary)]">{data.stats?.total_workouts || 0} Total Workouts</div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search workouts..."
                                className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-[var(--primary)] w-full"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-grow">
                        {feedItems.map(log => (
                            <div
                                key={log.id}
                                className="p-3 rounded bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all cursor-pointer group"
                                onClick={() => setViewState('workout_detail')}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-white group-hover:text-[var(--primary)] transition-colors">
                                            {format(parseISO(log.date), 'EEEE, MMM do')}
                                        </div>
                                        <div className="text-xs text-white/50 mt-1">
                                            {log.total_duration_seconds ? `${Math.floor(log.total_duration_seconds / 60)}m` : '-'} • {log.total_work_seconds ? `${Math.floor(log.total_work_seconds / 60)}m work` : 'Stats pending'}
                                        </div>
                                    </div>
                                    {/* PR Badge Placeholder - logic needs updating to use real PRs */}
                                    {Math.random() > 0.9 && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">🏆 PR</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </MagicBentoCard>

                {/* CHARTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Volume Trends */}
                    <MagicBentoCard className="h-[250px]" header={<BentoHeader title="Volume Trends (30 Days)" />}>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={data.history.map(h => ({ name: format(parseISO(h.date), 'MM/dd'), v: h.total_volume_kg }))}>
                                <Bar dataKey="v" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.6} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#15151F', border: '1px solid #333' }} />
                                <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} interval={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </MagicBentoCard>

                    {/* Trophy Case */}
                    <MagicBentoCard className="h-[250px] overflow-y-auto" header={<BentoHeader title="Recent PRs" />}>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                                { ex: 'Bench', w: '225 lbs' },
                                { ex: 'Squat', w: '315 lbs' },
                                { ex: 'Deadlift', w: '405 lbs' },
                                { ex: 'OHP', w: '135 lbs' }
                            ].map((pr, i) => (
                                <div key={i} className="bg-white/5 p-3 rounded flex flex-col items-center justify-center text-center">
                                    <span className="text-xs text-white/50">{pr.ex}</span>
                                    <span className="font-bold text-[var(--primary)]">{pr.w}</span>
                                </div>
                            ))}
                        </div>
                    </MagicBentoCard>
                </div>
            </div>
        );
    };

    return (
        <MagicBento disableAnimations={false} enableTilt={false} clickEffect={false} enableMagnetism={false} enableStars={false} enableSpotlight={false}>
            <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-4 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
                {/* Mobile: Vertical Stack (Left then Right) */}
                <div className="flex flex-col gap-4">
                    {renderLeftColumn()}
                </div>
                <div className="flex flex-col gap-4">
                    {viewState === 'dashboard' && renderRightColumn()}
                    {viewState === 'inspector' && (
                        <MagicBentoCard className="h-full min-h-[500px] p-8">
                            <div onClick={() => setViewState('dashboard')} className="cursor-pointer text-[var(--primary)] mb-4">← Back to Dashboard</div>
                            <h2 className="text-2xl font-orbitron">{selectedExercise} Analysis</h2>
                            <p className="text-white/50 mt-2">Deep dive stats coming here...</p>
                        </MagicBentoCard>
                    )}
                    {viewState === 'workout_detail' && (
                        <MagicBentoCard className="h-full min-h-[500px] p-8">
                            <div onClick={() => setViewState('dashboard')} className="cursor-pointer text-[var(--primary)] mb-4">← Back to Dashboard</div>
                            <h2 className="text-2xl font-orbitron">Workout Detail</h2>
                            <p className="text-white/50 mt-2">Set by set breakdown coming here...</p>
                        </MagicBentoCard>
                    )}
                </div>
            </div>
        </MagicBento>
    );
}
