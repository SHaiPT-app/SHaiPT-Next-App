'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

interface ClientStats {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    lastWorkoutDate: string | null;
    currentPlan: string | null;
    streak: number;
    relationshipId: string;
    canAssignPlans: boolean;
    canViewWorkouts: boolean;
}

export default function TrainerDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [clients, setClients] = useState<ClientStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

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

    const fetchClients = useCallback(async () => {
        if (!user) return;
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

            const res = await fetch(`/api/trainer/clients?trainerId=${user.id}`, { headers });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch clients');
            }

            const data = await res.json();
            setClients(data.clients || []);
        } catch (err: unknown) {
            console.error('Error fetching clients:', err);
            setError(err instanceof Error ? err.message : 'Failed to load client roster');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchClients();
    }, [user, fetchClients]);

    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'No workouts yet';
        const date = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const getStreakColor = (streak: number): string => {
        if (streak >= 7) return 'var(--success)';
        if (streak >= 3) return '#f59e0b';
        if (streak >= 1) return 'var(--primary)';
        return '#888';
    };

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>;
    }

    return (
        <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    Client Roster
                </h1>
                <p style={{ color: '#888', fontSize: '0.875rem' }}>
                    {clients.length} active client{clients.length !== 1 ? 's' : ''}
                </p>
            </header>

            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--error)',
                    fontSize: '0.875rem',
                }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    Loading clients...
                </div>
            ) : clients.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    <p style={{ marginBottom: '0.5rem' }}>No active clients found.</p>
                    <p style={{ fontSize: '0.875rem' }}>
                        Clients will appear here once they accept your coaching request.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Table header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr',
                            gap: '1rem',
                            padding: '0.75rem 1.25rem',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#888',
                            fontWeight: 600,
                        }}
                    >
                        <span>Client</span>
                        <span>Last Workout</span>
                        <span>Current Plan</span>
                        <span style={{ textAlign: 'center' }}>Streak</span>
                    </div>

                    {/* Client rows */}
                    {clients.map(client => (
                        <div
                            key={client.id}
                            className="glass-panel"
                            data-testid="client-row"
                            onClick={() => router.push(`/trainer/client/${client.id}/progress`)}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr',
                                gap: '1rem',
                                padding: '1rem 1.25rem',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                            }}
                        >
                            {/* Client info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        flexShrink: 0,
                                    }}
                                >
                                    {(client.full_name || client.username || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                        {client.full_name || client.username || 'Unknown'}
                                    </div>
                                    {client.username && client.full_name && (
                                        <div style={{ fontSize: '0.8125rem', color: '#888' }}>
                                            @{client.username}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Last workout */}
                            <div style={{ fontSize: '0.875rem', color: client.lastWorkoutDate ? 'var(--foreground)' : '#666' }}>
                                {formatDate(client.lastWorkoutDate)}
                            </div>

                            {/* Current plan */}
                            <div>
                                {client.currentPlan ? (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.8125rem',
                                            background: 'rgba(0, 212, 255, 0.1)',
                                            border: '1px solid rgba(0, 212, 255, 0.2)',
                                            color: 'var(--primary)',
                                            maxWidth: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {client.currentPlan}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.8125rem', color: '#666' }}>No active plan</span>
                                )}
                            </div>

                            {/* Streak */}
                            <div style={{ textAlign: 'center' }}>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '12px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: getStreakColor(client.streak),
                                        background: `${getStreakColor(client.streak)}15`,
                                    }}
                                >
                                    {client.streak > 0 ? `${client.streak}d` : '-'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
