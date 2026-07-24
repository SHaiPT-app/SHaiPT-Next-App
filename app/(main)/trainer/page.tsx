'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile, CoachingRelationship, ClientAlert, ClientAlertSummary } from '@/lib/types';
import { Users, Clock, ClipboardList, Check, X, Hourglass, ChevronRight } from 'lucide-react';

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
    const [user, setUser] = useState<Profile | null>(null);
    const [clients, setClients] = useState<ClientStats[]>([]);
    const [clientAlerts, setClientAlerts] = useState<Record<string, ClientAlert[]>>({});
    const [pendingRequests, setPendingRequests] = useState<(CoachingRelationship & { athlete?: Profile })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [declineReasonInput, setDeclineReasonInput] = useState<string>('');
    const [showDeclineInput, setShowDeclineInput] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/');
                return;
            }

            const parsed = JSON.parse(storedUser);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                localStorage.removeItem('user');
                router.push('/');
                return;
            }

            if (parsed.role !== 'trainer') {
                router.push('/home');
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

    const fetchPendingRequests = useCallback(async () => {
        if (!user) return;
        try {
            const pending = await db.coachingRelationships.getPendingAsCoach(user.id);
            // Enrich with athlete profiles
            const enriched = await Promise.all(
                pending.map(async (rel) => {
                    const athlete = await db.profiles.getById(rel.athlete_id).catch(() => null);
                    return { ...rel, athlete: athlete || undefined };
                })
            );
            setPendingRequests(enriched);
        } catch (err) {
            console.error('Error fetching pending requests:', err);
        }
    }, [user]);

    const fetchAlerts = useCallback(async () => {
        if (!user) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const res = await fetch(`/api/trainer/clients/alerts?trainerId=${user.id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const alertMap: Record<string, ClientAlert[]> = {};
                for (const summary of (data.alerts || []) as ClientAlertSummary[]) {
                    alertMap[summary.clientId] = summary.alerts;
                }
                setClientAlerts(alertMap);
            }
        } catch (err) {
            console.error('Error fetching alerts:', err);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchClients();
            fetchPendingRequests();
            fetchAlerts();
        }
    }, [user, fetchClients, fetchPendingRequests, fetchAlerts]);

    const handleRespond = async (relationshipId: string, action: 'accept' | 'decline' | 'waitlist') => {
        setRespondingTo(relationshipId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/coaching/respond', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    relationshipId,
                    action,
                    declineReason: action === 'decline' ? declineReasonInput : undefined,
                }),
            });

            if (res.ok) {
                // Refresh data
                fetchPendingRequests();
                fetchClients();
                setShowDeclineInput(null);
                setDeclineReasonInput('');
            }
        } catch (err) {
            console.error('Error responding to request:', err);
        } finally {
            setRespondingTo(null);
        }
    };

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
        if (streak >= 7) return 'var(--success, #4ade80)';
        if (streak >= 3) return '#f59e0b';
        if (streak >= 1) return 'var(--primary)';
        return '#888';
    };

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                }}>
                    Trainer Dashboard
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    Manage your clients, review requests, and track progress.
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
            }}>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <Users size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white' }}>
                        {clients.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>
                        Active Trainees
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <Clock size={24} color="#facc15" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white' }}>
                        {pendingRequests.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>
                        Pending Requests
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <ClipboardList size={24} color="#4ade80" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white' }}>
                        {clients.filter(c => c.currentPlan).length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>
                        Active Plans
                    </div>
                </div>
            </div>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.1rem',
                        marginBottom: '1rem',
                        color: '#facc15',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <Clock size={18} />
                        Pending Requests ({pendingRequests.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pendingRequests.map(req => (
                            <div key={req.id} className="glass-panel" style={{
                                padding: '1.25rem',
                                border: '1px solid rgba(250, 204, 21, 0.2)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <div style={{
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
                                            }}>
                                                {(req.athlete?.full_name || req.athlete?.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                                    {req.athlete?.full_name || req.athlete?.username || 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                                    {req.athlete?.email}
                                                    {req.athlete?.gender && (
                                                        <span style={{ marginLeft: '0.5rem', color: '#aaa' }}>
                                                            {req.athlete.gender}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Intake summary */}
                                        {req.intake_data && (
                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '8px',
                                                padding: '0.75rem',
                                                marginTop: '0.5rem',
                                                fontSize: '0.8rem',
                                                color: '#aaa',
                                            }}>
                                                <strong style={{ color: '#ccc' }}>Intake:</strong>{' '}
                                                {req.intake_data.fitness_goals && `Goals: ${req.intake_data.fitness_goals}`}
                                                {req.intake_data.fitness_level && ` | Level: ${req.intake_data.fitness_level}`}
                                                {req.intake_data.training_days_per_week && ` | ${req.intake_data.training_days_per_week} days/week`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        <button
                                            onClick={() => handleRespond(req.id, 'accept')}
                                            disabled={respondingTo === req.id}
                                            style={{
                                                background: 'rgba(74, 222, 128, 0.15)',
                                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                                borderRadius: '8px',
                                                padding: '0.5rem 0.75rem',
                                                color: '#4ade80',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                            }}
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (showDeclineInput === req.id) {
                                                    handleRespond(req.id, 'decline');
                                                } else {
                                                    setShowDeclineInput(req.id);
                                                }
                                            }}
                                            disabled={respondingTo === req.id}
                                            style={{
                                                background: 'rgba(248, 113, 113, 0.15)',
                                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                                borderRadius: '8px',
                                                padding: '0.5rem 0.75rem',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                            }}
                                        >
                                            <X size={16} /> Decline
                                        </button>
                                        <button
                                            onClick={() => handleRespond(req.id, 'waitlist')}
                                            disabled={respondingTo === req.id}
                                            style={{
                                                background: 'rgba(96, 165, 250, 0.15)',
                                                border: '1px solid rgba(96, 165, 250, 0.3)',
                                                borderRadius: '8px',
                                                padding: '0.5rem 0.75rem',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                            }}
                                        >
                                            <Hourglass size={16} /> Waitlist
                                        </button>
                                    </div>
                                </div>

                                {/* Decline reason input */}
                                {showDeclineInput === req.id && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Reason (optional)..."
                                            value={declineReasonInput}
                                            onChange={(e) => setDeclineReasonInput(e.target.value)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '6px',
                                                padding: '0.5rem 0.75rem',
                                                color: 'white',
                                                fontSize: '0.85rem',
                                            }}
                                        />
                                        <button
                                            onClick={() => handleRespond(req.id, 'decline')}
                                            style={{
                                                background: '#f87171',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '0.5rem 1rem',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                            }}
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Client Roster */}
            <div>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.1rem',
                    marginBottom: '1rem',
                    color: 'white',
                }}>
                    Client Roster
                </h2>

                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
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
                        <Users size={36} color="#555" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ marginBottom: '0.5rem' }}>No active clients yet.</p>
                        <p style={{ fontSize: '0.875rem' }}>
                            Clients will appear here once they send a request and you accept.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {clients.map(client => (
                            <div
                                key={client.id}
                                className="glass-panel"
                                onClick={() => router.push(`/trainer/client/${client.id}`)}
                                style={{
                                    padding: '1rem 1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s',
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    flexShrink: 0,
                                }}>
                                    {(client.full_name || client.username || 'U')[0].toUpperCase()}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.15rem' }}>
                                        {client.full_name || client.username || 'Unknown'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#888' }}>
                                        <span>{formatDate(client.lastWorkoutDate)}</span>
                                        {client.currentPlan && (
                                            <span style={{ color: 'var(--primary)' }}>{client.currentPlan}</span>
                                        )}
                                        {client.streak > 0 && (
                                            <span style={{ color: getStreakColor(client.streak) }}>
                                                {client.streak}d streak
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Alert badges */}
                                {clientAlerts[client.id] && clientAlerts[client.id].length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        {clientAlerts[client.id].map((alert, idx) => (
                                            <span
                                                key={idx}
                                                title={alert.message}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '22px',
                                                    height: '22px',
                                                    borderRadius: '11px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: 'white',
                                                    background: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                                                    padding: '0 0.375rem',
                                                }}
                                            >
                                                !
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <ChevronRight size={18} color="#555" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
