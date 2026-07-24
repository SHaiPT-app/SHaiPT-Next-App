'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile, WorkoutLogWithExercises, BodyMeasurement, ProgressMedia, TrainingPlan } from '@/lib/types';
import DirectMessageThread from '@/components/DirectMessageThread';
import { ArrowLeft, Dumbbell, ClipboardList, MessageSquare, Plus } from 'lucide-react';

type TabKey = 'progress' | 'plans' | 'messages';

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

export default function ClientDetailPage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [data, setData] = useState<ClientProgressData | null>(null);
    const [clientProfile, setClientProfile] = useState<Profile | null>(null);
    const [assignedPlans, setAssignedPlans] = useState<TrainingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('progress');
    const [authToken, setAuthToken] = useState<string | null>(null);
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
            setAuthToken(session.access_token);
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

            // Fetch full client profile for gender and other details
            try {
                const profile = await db.profiles.getById(clientId);
                if (profile) setClientProfile(profile);
            } catch {
                // Non-critical
            }
        } catch (err: unknown) {
            console.error('Error fetching client progress:', err);
            setError(err instanceof Error ? err.message : 'Failed to load client progress');
        } finally {
            setLoading(false);
        }
    }, [user, clientId]);

    const fetchAssignedPlans = useCallback(async () => {
        if (!clientId) return;
        try {
            const assignments = await db.trainingPlanAssignments.getByUser(clientId);
            const planIds = [...new Set(assignments.map(a => a.plan_id))];
            const plans = await Promise.all(
                planIds.map(id => db.trainingPlans.getById(id).catch(() => null))
            );
            setAssignedPlans(plans.filter((p): p is TrainingPlan => p !== null));
        } catch (err) {
            console.error('Error fetching assigned plans:', err);
        }
    }, [clientId]);

    useEffect(() => {
        if (user) {
            fetchProgress();
            fetchAssignedPlans();
        }
    }, [user, fetchProgress, fetchAssignedPlans]);

    const clientName = data?.client?.full_name || data?.client?.username || 'Client';

    const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: 'progress', label: 'Progress', icon: Dumbbell },
        { key: 'plans', label: 'Plans', icon: ClipboardList },
        { key: 'messages', label: 'Messages', icon: MessageSquare },
    ];

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Back Button */}
            <button
                onClick={() => router.push('/trainer')}
                style={{
                    background: 'rgba(255, 102, 0, 0.15)',
                    border: '1px solid rgba(255, 102, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#FF6600',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                }}
            >
                <ArrowLeft size={18} />
                Back to Roster
            </button>

            {/* Client Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    color: 'white',
                    flexShrink: 0,
                }}>
                    {clientName[0].toUpperCase()}
                </div>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.5rem',
                        color: 'white',
                        margin: 0,
                    }}>
                        {clientName}
                    </h1>
                    <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                        {data?.client?.email}
                        {clientProfile?.gender && (
                            <span style={{ marginLeft: '0.75rem', color: '#aaa' }}>
                                {clientProfile.gender}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '0.25rem',
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: activeTab === tab.key ? 'white' : '#888',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab.key ? '600' : '400',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                            }}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
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

            {activeTab === 'progress' && (
                loading ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                        Loading progress...
                    </div>
                ) : !data ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                        No progress data available.
                    </div>
                ) : (
                    <ProgressTab data={data} />
                )
            )}

            {activeTab === 'plans' && (
                <PlansTab
                    plans={assignedPlans}
                    clientId={clientId}
                    onAssignNew={() => router.push(`/trainer/client/${clientId}/assign-plan`)}
                />
            )}

            {activeTab === 'messages' && user && authToken && (
                <div className="glass-panel" style={{
                    padding: '0',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    height: '500px',
                }}>
                    <DirectMessageThread
                        userId={user.id}
                        otherUserId={clientId}
                        otherUserName={clientName}
                        authToken={authToken}
                    />
                </div>
            )}
        </div>
    );
}

function ProgressTab({ data }: { data: ClientProgressData }) {
    const logs = data.workoutLogs || [];

    if (logs.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                No workout logs recorded yet.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Quick stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1rem',
            }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {logs.length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                        Workouts
                    </div>
                </div>
            </div>

            {/* Recent logs */}
            {logs.slice(0, 10).map(log => (
                <div key={log.id} className="glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                            {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric'
                            })}
                        </span>
                        {log.total_duration_seconds && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                                {Math.floor(log.total_duration_seconds / 60)} min
                            </span>
                        )}
                    </div>
                    {log.exercise_logs && log.exercise_logs.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {log.exercise_logs.length} exercises, {log.exercise_logs.reduce((acc, el) => acc + (el.sets?.length || 0), 0)} sets
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function PlansTab({
    plans,
    clientId,
    onAssignNew,
}: {
    plans: TrainingPlan[];
    clientId: string;
    onAssignNew: () => void;
}) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#888' }}>
                    {plans.length} plan{plans.length !== 1 ? 's' : ''} assigned
                </span>
                <button
                    onClick={onAssignNew}
                    style={{
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                    }}
                >
                    <Plus size={16} /> Assign New Plan
                </button>
            </div>

            {plans.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    <ClipboardList size={36} color="#555" style={{ marginBottom: '0.75rem' }} />
                    <p>No plans assigned yet.</p>
                    <p style={{ fontSize: '0.85rem' }}>Click &ldquo;Assign New Plan&rdquo; to get started.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {plans.map(plan => (
                        <div key={plan.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                            <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'white', marginBottom: '0.25rem' }}>
                                {plan.name}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {plan.duration_weeks && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--primary)',
                                        background: 'rgba(242, 95, 41, 0.1)',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                    }}>
                                        {plan.duration_weeks} Weeks
                                    </span>
                                )}
                                {plan.phase_type && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: '#aaa',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                        textTransform: 'capitalize',
                                    }}>
                                        {plan.phase_type}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
