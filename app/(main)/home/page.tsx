'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import { db } from '@/lib/supabaseDb';
import type { Profile, WorkoutSession, TrainingPlanAssignment, Exercise } from '@/lib/types';

export default function HomePage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'log' | 'analytics'>('library');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                }}>
                    Home
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    Welcome back, {user?.full_name || user?.username || 'Athlete'}!
                </p>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '0.25rem'
            }}>
                <button
                    onClick={() => setActiveTab('library')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: activeTab === 'library' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: activeTab === 'library' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'library' ? '600' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    Library
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: activeTab === 'log' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: activeTab === 'log' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'log' ? '600' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    Start Workout
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: activeTab === 'analytics' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'analytics' ? '600' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    Analytics
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'library' && <LibraryView userId={user?.id || ''} />}
            {activeTab === 'log' && <WorkoutLoggerTab userId={user?.id || ''} />}
            {activeTab === 'analytics' && <AnalyticsView userId={user?.id || ''} />}
        </div>
    );
}

// ============================================
// LIBRARY VIEW
// ============================================

// ============================================
// LIBRARY VIEW
// ============================================

function LibraryView({ userId }: { userId: string }) {
    const [view, setView] = useState<'workouts' | 'plans'>('workouts');
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [plans, setPlans] = useState<any[]>([]); // Using any for now, should be TrainingPlan[]
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'plans' | 'sessions'>('plans'); // 'plans' or 'sessions'

    // Deletion Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'plan' | 'session' | null;
        id: string | null;
        name: string;
    }>({ isOpen: false, type: null, id: null, name: '' });

    useEffect(() => {
        loadLibrary();
    }, [userId, view]);

    const loadLibrary = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            if (view === 'workouts') {
                const data = await db.workoutSessions.getByCreator(userId);
                setSessions(data);
            } else {
                // Fetch plans
                const data = await db.trainingPlans.getByCreator(userId);
                setPlans(data);
            }
        } catch (error) {
            console.error('Error loading library:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.25rem', margin: 0 }}>Library</h2>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '2px'
                    }}>
                        <button
                            onClick={() => setView('workouts')}
                            style={{
                                padding: '0.25rem 0.75rem',
                                background: view === 'workouts' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: view === 'workouts' ? 'white' : '#888',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Workouts
                        </button>
                        <button
                            onClick={() => setView('plans')}
                            style={{
                                padding: '0.25rem 0.75rem',
                                background: view === 'plans' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: view === 'plans' ? 'white' : '#888',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Plans
                        </button>
                    </div>
                </div>

                <button
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={() => router.push(view === 'workouts' ? '/workouts/new' : '/plans/new')}
                >
                    + New {view === 'workouts' ? 'Workout' : 'Plan'}
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading...</div>
            ) : (
                <>
                    {view === 'workouts' ? (
                        sessions.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                                <p style={{ color: '#888', marginBottom: '1rem' }}>No workouts yet</p>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Create your first workout to get started!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {sessions.map(session => (
                                    <div key={session.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                        <div style={{ paddingRight: '40px' }}>
                                            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{session.name}</h3>
                                            {session.description && (
                                                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{session.description}</p>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {session.tags?.map((tag, i) => (
                                                    <span key={i} style={{
                                                        padding: '0.25rem 0.75rem',
                                                        background: 'rgba(242, 95, 41, 0.1)',
                                                        color: 'var(--primary)',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/workouts/new?edit=${session.id}`);
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem',
                                                    cursor: 'pointer',
                                                    color: '#ccc',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Edit"
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        type: 'session',
                                                        id: session.id,
                                                        name: session.name
                                                    });
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem',
                                                    cursor: 'pointer',
                                                    color: '#ff4444',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Delete"
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        plans.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                                <p style={{ color: '#888', marginBottom: '1rem' }}>No training plans yet</p>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Create a structured plan to track your progress!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {plans.map(plan => (
                                    <div key={plan.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '80px' }}>
                                            <div>
                                                <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{plan.name}</h3>
                                                {plan.duration_weeks && (
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--primary)',
                                                        background: 'rgba(242, 95, 41, 0.1)',
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '4px',
                                                        marginBottom: '0.5rem',
                                                        display: 'inline-block'
                                                    }}>
                                                        {plan.duration_weeks} Weeks
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {plan.description && (
                                            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0' }}>{plan.description}</p>
                                        )}

                                        {/* Actions */}
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/plans/new?edit=${plan.id}`);
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem',
                                                    cursor: 'pointer',
                                                    color: '#ccc',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Edit"
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        type: 'plan',
                                                        id: plan.id,
                                                        name: plan.name
                                                    });
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem',
                                                    cursor: 'pointer',
                                                    color: '#ff4444',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Delete"
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={`Delete ${deleteModal.type === 'plan' ? 'Training Plan' : 'Workout'}`}
                message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
                onConfirm={async () => {
                    if (!deleteModal.id || !deleteModal.type) return;

                    try {
                        if (deleteModal.type === 'plan') {
                            await db.trainingPlans.delete(deleteModal.id);
                            setPlans(prev => prev.filter(p => p.id !== deleteModal.id));
                        } else {
                            await db.workoutSessions.delete(deleteModal.id);
                            setSessions(prev => prev.filter(s => s.id !== deleteModal.id));
                        }
                        setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        alert('Failed to delete item');
                    }
                }}
                onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, name: '' })}
            />
        </div>
    );
}

import WorkoutLogger from '@/components/WorkoutLogger';

// ============================================
// WORKOUT LOGGER (now using dedicated component)
// ============================================

function WorkoutLoggerTab({ userId }: { userId: string }) {
    return <WorkoutLogger userId={userId} />;
}

// ============================================
// ANALYTICS VIEW
// ============================================

function AnalyticsView({ userId }: { userId: string }) {
    return (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '1rem' }}>Analytics</h2>
            <p style={{ color: '#888' }}>
                Your workout stats and progress charts coming soon...
            </p>
        </div>
    );
}
