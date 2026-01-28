'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, WorkoutLogWithExercises, BodyMeasurement, ProgressMedia } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type TabKey = 'workouts' | 'analytics' | 'photos';

interface ClientProgressData {
    client: {
        id: string;
        email: string;
        username?: string;
        full_name?: string;
        avatar_url?: string;
    } | null;
    workoutLogs: WorkoutLogWithExercises[];
    bodyMeasurements: BodyMeasurement[];
    progressMedia: (ProgressMedia & { url: string | null })[];
    permissions: {
        can_view_workouts: boolean;
        can_assign_plans: boolean;
    };
}

export default function ClientProgressPage() {
    const [user, setUser] = useState<User | null>(null);
    const [data, setData] = useState<ClientProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('workouts');
    const router = useRouter();
    const params = useParams();
    const clientId = params.id as string;

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/');
                return;
            }

            const parsed = JSON.parse(storedUser);

            if (parsed.id !== 'dev-user-id') {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    localStorage.removeItem('user');
                    router.push('/');
                    return;
                }
            }

            if (parsed.role !== 'trainer') {
                router.push('/dashboard');
                return;
            }

            setUser(parsed);
        };

        initAuth();
    }, [router]);

    const fetchProgress = useCallback(async () => {
        if (!user || !clientId) return;
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            } else if (user.id === 'dev-user-id') {
                headers.Authorization = 'Bearer dev-token';
            }

            const res = await fetch(
                `/api/trainer/clients/progress?trainerId=${user.id}&clientId=${clientId}`,
                { headers }
            );

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch client progress');
            }

            const progressData = await res.json();
            setData(progressData);
        } catch (err: unknown) {
            console.error('Error fetching client progress:', err);
            setError(err instanceof Error ? err.message : 'Failed to load client progress');
        } finally {
            setLoading(false);
        }
    }, [user, clientId]);

    useEffect(() => {
        if (user) fetchProgress();
    }, [user, fetchProgress]);

    // Compute analytics from workout logs
    const analytics = useMemo(() => {
        if (!data?.workoutLogs || data.workoutLogs.length === 0) return null;

        const logs = data.workoutLogs;
        const totalWorkouts = logs.length;
        const totalVolume = logs.reduce((acc, log) => {
            return acc + (log.exercise_logs || []).reduce((eAcc, el) => {
                return eAcc + (el.sets || []).reduce((sAcc, s) => {
                    if (s.is_warmup) return sAcc;
                    return sAcc + (s.weight || 0) * (s.reps || 0);
                }, 0);
            }, 0);
        }, 0);

        const avgDuration = logs.reduce((acc, log) => acc + (log.total_duration_seconds || 0), 0) / totalWorkouts;

        // Volume by date (last 30 entries)
        const volumeByDate: Record<string, number> = {};
        logs.forEach((log) => {
            let volume = 0;
            (log.exercise_logs || []).forEach((el) => {
                (el.sets || []).forEach((s) => {
                    if (!s.is_warmup) {
                        volume += (s.weight || 0) * (s.reps || 0);
                    }
                });
            });
            volumeByDate[log.date] = (volumeByDate[log.date] || 0) + volume;
        });

        const volumeData = Object.entries(volumeByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-30)
            .map(([date, volume]) => ({ date, volume: Math.round(volume) }));

        // Weight trend from body measurements
        const weightHistory = (data.bodyMeasurements || [])
            .filter(m => m.weight_kg)
            .map(m => ({ date: m.date, weight: m.weight_kg! }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return { totalWorkouts, totalVolume, avgDuration, volumeData, weightHistory };
    }, [data]);

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>;
    }

    if (loading) {
        return (
            <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    Loading client progress...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <button
                    onClick={() => router.push('/trainer')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        padding: 0,
                        marginBottom: '1rem',
                    }}
                >
                    &larr; Back to Client Roster
                </button>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--error)',
                    fontSize: '0.875rem',
                }}>
                    {error}
                </div>
            </main>
        );
    }

    if (!data || !data.permissions.can_view_workouts) {
        return (
            <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <button
                    onClick={() => router.push('/trainer')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        padding: 0,
                        marginBottom: '1rem',
                    }}
                >
                    &larr; Back to Client Roster
                </button>
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    <p>You do not have permission to view this client&apos;s workout data.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        The client needs to grant you workout viewing access.
                    </p>
                </div>
            </main>
        );
    }

    const clientName = data.client?.full_name || data.client?.username || 'Unknown Client';

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'workouts', label: 'Workout Logs' },
        { key: 'analytics', label: 'Analytics' },
        { key: 'photos', label: 'Progress Photos' },
    ];

    return (
        <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <button
                onClick={() => router.push('/trainer')}
                data-testid="back-button"
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: 0,
                    marginBottom: '1rem',
                }}
            >
                &larr; Back to Client Roster
            </button>

            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: 'white',
                        flexShrink: 0,
                    }}
                >
                    {clientName[0].toUpperCase()}
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                        {clientName}
                    </h1>
                    {data.client?.username && data.client?.full_name && (
                        <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
                            @{data.client.username}
                        </p>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.25rem',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        data-testid={`tab-${tab.key}`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.key
                                ? '2px solid var(--primary)'
                                : '2px solid transparent',
                            color: activeTab === tab.key ? 'var(--primary)' : '#888',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: activeTab === tab.key ? 600 : 400,
                            padding: '0.75rem 1rem',
                            transition: 'color 0.2s, border-color 0.2s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'workouts' && (
                <WorkoutLogsTab logs={data.workoutLogs} />
            )}
            {activeTab === 'analytics' && (
                <AnalyticsTab analytics={analytics} />
            )}
            {activeTab === 'photos' && (
                <ProgressPhotosTab media={data.progressMedia} />
            )}
        </main>
    );
}

// ============================================
// WORKOUT LOGS TAB
// ============================================

function WorkoutLogsTab({ logs }: { logs: WorkoutLogWithExercises[] }) {
    if (logs.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                No workout logs recorded yet.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map((log) => (
                <div key={log.id} className="glass-panel" data-testid="workout-log-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                            {format(parseISO(log.date), 'EEEE, MMMM do, yyyy')}
                        </h3>
                        {log.total_duration_seconds && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
                                {Math.floor(log.total_duration_seconds / 60)} min
                            </span>
                        )}
                    </div>

                    {log.notes && (
                        <p style={{ color: '#888', fontSize: '0.875rem', margin: '0.5rem 0' }}>{log.notes}</p>
                    )}

                    {/* Exercise summary */}
                    {log.exercise_logs && log.exercise_logs.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {log.exercise_logs.map((el) => (
                                <div
                                    key={el.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '6px',
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    <span style={{ color: '#ccc' }}>{el.exercise_id}</span>
                                    <span style={{ color: '#888' }}>
                                        {el.total_sets || el.sets?.length || 0} sets
                                        {el.max_weight ? ` - max ${el.max_weight} lbs` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ============================================
// ANALYTICS TAB
// ============================================

interface AnalyticsData {
    totalWorkouts: number;
    totalVolume: number;
    avgDuration: number;
    volumeData: { date: string; volume: number }[];
    weightHistory: { date: string; weight: number }[];
}

function AnalyticsTab({ analytics }: { analytics: AnalyticsData | null }) {
    if (!analytics) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                No analytics data available yet.
            </div>
        );
    }

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" data-testid="stat-total-workouts" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {analytics.totalWorkouts}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Workouts</div>
                </div>
                <div className="glass-panel" data-testid="stat-total-volume" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>
                        {Math.round(analytics.totalVolume / 1000)}k
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Total Volume</div>
                </div>
                <div className="glass-panel" data-testid="stat-avg-duration" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {Math.round(analytics.avgDuration / 60)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Avg Min</div>
                </div>
            </div>

            {/* Volume chart (simple bar representation) */}
            {analytics.volumeData.length > 0 && (
                <div className="glass-panel" data-testid="volume-chart" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Volume Over Time</h4>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
                        {analytics.volumeData.map((d, i) => {
                            const maxVol = Math.max(...analytics.volumeData.map(v => v.volume), 1);
                            const height = Math.max((d.volume / maxVol) * 100, 2);
                            return (
                                <div
                                    key={i}
                                    title={`${d.date}: ${d.volume.toLocaleString()} lbs`}
                                    style={{
                                        flex: 1,
                                        height: `${height}%`,
                                        background: 'var(--primary)',
                                        borderRadius: '2px 2px 0 0',
                                        opacity: 0.7,
                                        minWidth: '4px',
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Weight trend */}
            {analytics.weightHistory.length > 0 && (
                <div className="glass-panel" data-testid="weight-chart" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Body Weight Trend</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {analytics.weightHistory.slice(-10).map((entry, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.8125rem',
                                    padding: '0.375rem 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span style={{ color: '#888' }}>{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                                <span style={{ fontWeight: 500 }}>{entry.weight} kg</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// PROGRESS PHOTOS TAB
// ============================================

function ProgressPhotosTab({ media }: { media: (ProgressMedia & { url: string | null })[] }) {
    if (media.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                No progress photos available.
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {media.map((item) => (
                <div key={item.id} className="glass-panel" data-testid="progress-photo-card" style={{ overflow: 'hidden', borderRadius: '8px' }}>
                    {item.url ? (
                        item.media_type === 'video' ? (
                            <video
                                src={item.url}
                                controls
                                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.url}
                                alt={item.caption || 'Progress photo'}
                                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                        )
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            color: '#666',
                            fontSize: '0.8125rem',
                        }}>
                            Media unavailable
                        </div>
                    )}
                    <div style={{ padding: '0.75rem' }}>
                        {item.caption && (
                            <p style={{ fontSize: '0.8125rem', margin: '0 0 0.25rem', color: '#ccc' }}>
                                {item.caption}
                            </p>
                        )}
                        <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                            {item.taken_at ? format(parseISO(item.taken_at), 'MMM d, yyyy') : 'No date'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
