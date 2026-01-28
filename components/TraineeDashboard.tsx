
'use client';

import { useState, useEffect } from 'react';
import { User, WorkoutPlan, WorkoutLog, TrainingPlan, TrainingPlanAssignment } from '@/lib/types';
import { supabase } from '@/lib/supabase';

/** Denormalized workout log with inline exercises, as returned by the API */
interface DenormalizedWorkoutLog extends WorkoutLog {
    exercises: Array<{
        name?: string;
        exercise_id?: string;
        sets: Array<{
            weight?: number;
            reps?: number;
            targetReps?: number;
            targetWeight?: string;
            weight_unit?: string;
            rpe?: number;
            isPr?: boolean;
        }>;
    }>;
}
import PlanViewer from './PlanViewer';
import AIWorkoutPlanner from './ai-coach/AIWorkoutPlanner';
import AIDietitian from './ai-coach/AIDietitian';
import AIFormChecker from './ai-coach/AIFormChecker';
import WeeklyInsightsCard from './WeeklyInsightsCard';

export default function TraineeDashboard({ user }: { user: User }) {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [logs, setLogs] = useState<DenormalizedWorkoutLog[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
    const [activeTab, setActiveTab] = useState<'plans' | 'coach'>('plans');
    const [coachModule, setCoachModule] = useState<'workout' | 'diet' | 'form'>('workout');
    const [assignedPlans, setAssignedPlans] = useState<(TrainingPlanAssignment & { plan: TrainingPlan | null })[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Wait for auth state to be ready and retry if session is not available
                let session = null;

                // DEV BYPASS
                if (user.id === 'dev-user-id') {
                    console.log('Dev user detected, skipping Supabase session check');
                    // Mock session for API calls if needed, or just proceed
                } else {
                    let retryCount = 0;
                    const maxRetries = 5;

                    while (!session && retryCount < maxRetries) {
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        if (currentSession) {
                            session = currentSession;
                            break;
                        }

                        // Wait briefly before retrying
                        await new Promise(resolve => setTimeout(resolve, 200));
                        retryCount++;
                    }

                    if (!session) {
                        console.error('No valid session found after retries');
                        return;
                    }
                }

                const headers: any = { 'Content-Type': 'application/json' };
                if (session?.access_token) {
                    headers.Authorization = `Bearer ${session.access_token}`;
                }

                // Fetch plans
                console.log(`Fetching plans for trainee ID: ${user.id} (${user.username})`);
                const plansRes = await fetch(`/api/plans?traineeId=${user.id}`, { headers });

                if (plansRes.ok) {
                    const plansData = await plansRes.json();
                    setPlans(plansData.plans || []);
                } else {
                    setPlans([]);
                }

                // Fetch logs
                const logsRes = await fetch(`/api/logs?traineeId=${user.id}`, { headers });
                if (logsRes.ok) {
                    const logsData = await logsRes.json();
                    setLogs(logsData.logs || []);
                } else {
                    setLogs([]);
                }

                // Fetch assigned training plans
                const assignmentsRes = await fetch(`/api/plan-assignments?userId=${user.id}`, { headers });
                if (assignmentsRes.ok) {
                    const assignmentsData = await assignmentsRes.json();
                    setAssignedPlans(assignmentsData.assignments || []);
                } else {
                    setAssignedPlans([]);
                }
            } catch (error) {
                console.error('Error fetching trainee data:', error);
                setPlans([]);
                setLogs([]);
                setAssignedPlans([]);
            }
        };

        fetchData();
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('plans')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: activeTab === 'plans' ? 'var(--accent)' : '#888',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        borderBottom: activeTab === 'plans' ? '2px solid var(--accent)' : 'none'
                    }}
                >
                    My Workout Plans
                </button>
                <button
                    onClick={() => setActiveTab('coach')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: activeTab === 'coach' ? 'var(--accent)' : '#888',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        borderBottom: activeTab === 'coach' ? '2px solid var(--accent)' : 'none'
                    }}
                >
                    AI Coach
                </button>
            </div>

            {activeTab === 'plans' ? (
                <div className="dashboard-grid">
                    {/* Weekly AI Insights Card */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <WeeklyInsightsCard userId={user.id} logs={logs} />
                    </div>

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
                                    {(viewingPlan.exercises || []).map((ex: any, i: number) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                            <h4 style={{ marginBottom: '0.5rem' }}>{ex.name}</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                {ex.sets.map((set: any, j: number) => (
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
                                    <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>{(plan.exercises || []).length} Exercises</p>
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

                    {/* Assigned Training Plans */}
                    {assignedPlans.length > 0 && (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Assigned Training Plans</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {assignedPlans
                                    .filter(a => a.is_active && a.plan)
                                    .map(assignment => (
                                        <div key={assignment.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h4 style={{ color: 'var(--accent)' }}>{assignment.plan!.name}</h4>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(255, 102, 0, 0.1)',
                                                    border: '1px solid rgba(255, 102, 0, 0.2)',
                                                    color: 'var(--primary)',
                                                }}>
                                                    Assigned
                                                </span>
                                            </div>
                                            {assignment.plan!.description && (
                                                <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{assignment.plan!.description}</p>
                                            )}
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                {assignment.start_date} to {assignment.end_date}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

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
                                            PRs set!
                                        </div>
                                    )}
                                </div>
                            ))}
                            {logs.length === 0 && <p style={{ color: '#888' }}>No workouts logged yet.</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#111', padding: '0.5rem', borderRadius: '8px', width: 'fit-content' }}>
                        <button
                            onClick={() => setCoachModule('workout')}
                            style={{
                                background: coachModule === 'workout' ? 'var(--accent)' : 'transparent',
                                color: coachModule === 'workout' ? 'white' : '#888',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Workout Planner
                        </button>
                        <button
                            onClick={() => setCoachModule('diet')}
                            style={{
                                background: coachModule === 'diet' ? 'var(--accent)' : 'transparent',
                                color: coachModule === 'diet' ? 'white' : '#888',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Dietitian
                        </button>
                        <button
                            onClick={() => setCoachModule('form')}
                            style={{
                                background: coachModule === 'form' ? 'var(--accent)' : 'transparent',
                                color: coachModule === 'form' ? 'white' : '#888',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Form Checker
                        </button>
                    </div>

                    {coachModule === 'workout' && <AIWorkoutPlanner user={user} />}
                    {coachModule === 'diet' && <AIDietitian user={user} />}
                    {coachModule === 'form' && <AIFormChecker />}
                </div>
            )}
        </div>
    );
}
