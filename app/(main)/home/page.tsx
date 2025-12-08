'use client';

import { useState, useEffect } from 'react';
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
                    Log Workout
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

function LibraryView({ userId }: { userId: string }) {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, [userId]);

    const loadSessions = async () => {
        if (!userId) return;

        try {
            const data = await db.workoutSessions.getByCreator(userId);
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading library...</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.25rem' }}>My Workouts</h2>
                <button className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    + New Workout
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: '#888', marginBottom: '1rem' }}>No workouts yet</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Create your first workout to get started!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {sessions.map(session => (
                        <div key={session.id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }}>
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
                    ))}
                </div>
            )}
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
