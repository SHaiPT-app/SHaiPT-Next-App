'use client';

import { useState, useEffect } from 'react';
import { User, WorkoutPlan, WorkoutLog } from '@/lib/types';
import PlanViewer from './PlanViewer';

export default function TraineeDashboard({ user }: { user: User }) {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [logs, setLogs] = useState<WorkoutLog[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);

    useEffect(() => {
        fetch(`/api/plans?traineeId=${user.id}`)
            .then(res => res.json())
            .then(data => setPlans(data.plans || []));

        fetch(`/api/logs?traineeId=${user.id}`)
            .then(res => res.json())
            .then(data => setLogs(data.logs || []));
    }, [user.id, selectedPlan]); // Refresh logs when returning from plan view

    if (selectedPlan) {
        return (
            <PlanViewer
                plan={selectedPlan}
                traineeId={user.id}
                onBack={() => setSelectedPlan(null)}
            />
        );
    }

    return (
        <div className="dashboard-grid">
            {/* View Plan Modal */}
            {viewingPlan && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setViewingPlan(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            &times;
                        </button>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>{viewingPlan.name}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {viewingPlan.exercises.map((ex, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>{ex.name}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                        {ex.sets.map((set, j) => (
                                            <div key={j} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem', textAlign: 'center' }}>
                                                <div style={{ color: '#888', fontSize: '0.75rem' }}>Set {j + 1}</div>
                                                <div>{set.targetReps} reps</div>
                                                {set.targetWeight && <div>@ {set.targetWeight}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => {
                                setSelectedPlan(viewingPlan);
                                setViewingPlan(null);
                            }}
                            style={{ width: '100%', marginTop: '2rem' }}
                        >
                            Start Workout
                        </button>
                    </div>
                </div>
            )}

            {/* Assigned Plans */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Your Plans</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {plans.map(plan => (
                        <div key={plan.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{plan.name}</h4>
                            <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>{plan.exercises.length} Exercises</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => setViewingPlan(plan)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--primary)',
                                        background: 'transparent',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    View Plan
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => setSelectedPlan(plan)}
                                >
                                    Start
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && <p style={{ color: '#888' }}>No plans assigned yet.</p>}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {logs.map(log => (
                        <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>{new Date(log.date).toLocaleDateString()}</span>
                                <span style={{ color: '#888', fontSize: '0.875rem' }}>{new Date(log.date).toLocaleTimeString()}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#ccc' }}>
                                {log.exercises.length} exercises logged
                            </div>
                            {/* Show PRs if any */}
                            {log.exercises.some(ex => ex.sets.some(s => s.isPr)) && (
                                <div style={{ marginTop: '0.5rem', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                    🏆 PRs set!
                                </div>
                            )}
                        </div>
                    ))}
                    {logs.length === 0 && <p style={{ color: '#888' }}>No workouts logged yet.</p>}
                </div>
            </div>
        </div>
    );
}
