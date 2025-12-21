'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, XAxis, YAxis
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { WorkoutLog, UserStats, UserStatsHistory } from '@/lib/types';

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
// MAIN COMPONENT
// ============================================

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
    const [data, setData] = useState<AnalyticsState>({ logs: [], stats: null, history: [], loading: true });

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
            // Using RPC if available, or fallback to manual query
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

        // Parse muscle breakdown
        const muscleData = Object.entries(data.stats.muscle_group_volumes || {}).map(([muscle, metrics]: [string, any]) => ({
            name: muscle.charAt(0).toUpperCase() + muscle.slice(1),
            value: metrics.volume || 0,
            sets: metrics.sets || 0,
            color: '#F25F29'
        })).sort((a, b) => b.value - a.value);

        // Assign colors dynamically
        const COLORS = ['#F25F29', '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#6b7280'];
        muscleData.forEach((d, i) => {
            d.color = COLORS[i % COLORS.length];
        });

        // 30-day volume
        const volume30Days = data.history.reduce((acc, curr) => acc + (curr.total_volume_kg || 0), 0);

        return {
            streak: data.stats.current_streak_days,
            totalWorkouts: data.stats.total_workouts,
            volume30Days: volume30Days,
            muscleSplitData: muscleData
        };
    }, [data.stats, data.history]);


    if (data.loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading Analytics...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.25rem', margin: 0 }}>Analytics</h2>
            </div>

            {/* Metrics - Dispersed Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{computedStats?.streak || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Day Streak</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{computedStats?.totalWorkouts || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Workouts</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{Math.round((computedStats?.volume30Days || 0) / 1000)}k</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Vol (30d)</div>
                </div>
            </div>

            {/* Charts Section - Dispersed / Stacked */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.9 }}>Performance Trends</h3>

                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {/* Volume Bar Chart */}
                    <div className="glass-panel" style={{ padding: '1.5rem', height: '300px' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Volume (Last 30 Days)</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={data.history.map(h => ({ name: format(parseISO(h.date), 'MM/dd'), v: h.total_volume_kg }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                                <RechartsTooltip
                                    cursor={{ fill: 'white', opacity: 0.05 }}
                                    contentStyle={{ background: '#1F1F29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="v" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Muscle Pie Chart */}
                    <div className="glass-panel" style={{ padding: '1.5rem', height: '300px' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Muscle Focus (All Time)</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={computedStats?.muscleSplitData || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {computedStats?.muscleSplitData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ background: '#1F1F29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    formatter={(value: number) => [`${value} kg`, 'Volume']}
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '0.8rem', color: '#aaa' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* History Section - Library Style List */}
            <div>
                <h3 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.1rem', marginBottom: '1.5rem', opacity: 0.9 }}>Workout History</h3>

                {data.logs.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: '#888' }}>No workouts recorded yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {data.logs.map(log => (
                            <div key={log.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                <div style={{ paddingRight: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'white' }}>
                                            {format(parseISO(log.date), 'EEEE, MMMM do, yyyy')}
                                        </h3>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                                            {log.total_duration_seconds ? `${Math.floor(log.total_duration_seconds / 60)} min` : ''}
                                        </span>
                                    </div>

                                    {log.notes && (
                                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>{log.notes}</p>
                                    )}

                                    {/* Mini Stats Row */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#aaa',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem'
                                        }}>
                                            {log.total_work_seconds ? `${Math.floor(log.total_work_seconds / 60)}m Work Time` : 'No work time stats'}
                                        </span>
                                        {/* TODO: Add PR badge if applicable */}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

