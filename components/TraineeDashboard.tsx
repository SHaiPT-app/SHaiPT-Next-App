
'use client';

import { useState, useEffect } from 'react';
import { User, WorkoutPlan, WorkoutLog, TrainingPlan, TrainingPlanAssignment } from '@/lib/types';
import { apiFetch } from '@/lib/apiClient';

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
import AIFormChecker from './ai-coach/AIFormChecker';
import WeeklyInsightsCard from './WeeklyInsightsCard';

export default function TraineeDashboard({ user }: { user: User }) {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [logs, setLogs] = useState<DenormalizedWorkoutLog[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
    const [activeTab, setActiveTab] = useState<'plans' | 'coach'>('plans');
    const [assignedPlans, setAssignedPlans] = useState<(TrainingPlanAssignment & { plan: TrainingPlan | null })[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // apiFetch attaches the session token; the routes derive the trainee from it
                const [plansData, logsData, assignmentsData] = await Promise.all([
                    apiFetch<{ plans?: WorkoutPlan[] }>(`/api/plans?traineeId=${user.id}`).catch(() => ({ plans: [] })),
                    apiFetch<{ logs?: DenormalizedWorkoutLog[] }>(`/api/logs?traineeId=${user.id}`).catch(() => ({ logs: [] })),
                    apiFetch<{ assignments?: (TrainingPlanAssignment & { plan: TrainingPlan | null })[] }>(`/api/plan-assignments?userId=${user.id}`).catch(() => ({ assignments: [] })),
                ]);
                setPlans(plansData.plans || []);
                setLogs(logsData.logs || []);
                setAssignedPlans(assignmentsData.assignments || []);
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
        <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex gap-2 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex-1 cursor-pointer rounded-lg py-3 text-sm transition-all ${
                        activeTab === 'plans'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
                >
                    My Workout Plans
                </button>
                <button
                    onClick={() => setActiveTab('coach')}
                    className={`flex-1 cursor-pointer rounded-lg py-3 text-sm transition-all ${
                        activeTab === 'coach'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
                >
                    AI Coach
                </button>
            </div>

            {activeTab === 'plans' ? (
                <div className="dashboard-grid">
                    {/* Weekly AI Insights Card */}
                    <div className="col-span-full">
                        <WeeklyInsightsCard userId={user.id} logs={logs} />
                    </div>

                    {/* View Plan Modal */}
                    {viewingPlan && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
                            <div className="glass-card relative max-h-[90vh] w-full max-w-[600px] overflow-y-auto !border-brand/30 p-8">
                                <button
                                    onClick={() => setViewingPlan(null)}
                                    className="icon-btn absolute right-4 top-4 !h-9 !w-9 !text-xl"
                                >
                                    &times;
                                </button>
                                <h2 className="mb-6 pr-10 font-display text-lg font-bold text-brand">{viewingPlan.name}</h2>
                                <div className="flex flex-col gap-6">
                                    {(viewingPlan.exercises || []).map((ex: any, i: number) => (
                                        <div key={i} className="rounded-xl border border-line-soft bg-[var(--surface-2)] p-4">
                                            <h4 className="mb-2 text-sm font-semibold text-ink-hi">{ex.name}</h4>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
                                                {ex.sets.map((set: any, j: number) => (
                                                    <div key={j} className="rounded-lg bg-black/30 p-2 text-center text-sm text-ink-mid">
                                                        <div className="text-xs text-ink-low">Set {j + 1}</div>
                                                        <div>{set.targetReps} reps</div>
                                                        {set.targetWeight && <div>@ {set.targetWeight}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="btn-brand mt-8 w-full"
                                    onClick={() => {
                                        setSelectedPlan(viewingPlan);
                                        setViewingPlan(null);
                                    }}
                                >
                                    Start Workout
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Assigned Plans */}
                    <div className="glass-card p-8">
                        <h3 className="display mb-6 text-lg">Your Plans</h3>
                        <div className="flex flex-col gap-4">
                            {plans.map(plan => (
                                <div key={plan.id} className="rounded-xl border border-line-soft bg-[var(--surface-2)] p-5">
                                    <h4 className="mb-1 text-base font-semibold text-ink-hi">{plan.name}</h4>
                                    <p className="mb-4 text-sm text-ink-low">{(plan.exercises || []).length} Exercises</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setViewingPlan(plan)}
                                            className="btn-outline !px-4 !py-2.5 !text-sm"
                                        >
                                            View Plan
                                        </button>
                                        <button
                                            className="btn-brand !px-4 !py-2.5 !text-sm"
                                            onClick={() => setSelectedPlan(plan)}
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {plans.length === 0 && <p className="text-sm text-ink-low">No plans assigned yet.</p>}
                        </div>
                    </div>

                    {/* Assigned Training Plans */}
                    {assignedPlans.length > 0 && (
                        <div className="glass-card p-8">
                            <h3 className="display mb-6 text-lg">Assigned Training Plans</h3>
                            <div className="flex flex-col gap-4">
                                {assignedPlans
                                    .filter(a => a.is_active && a.plan)
                                    .map(assignment => (
                                        <div key={assignment.id} className="rounded-xl border border-line-soft bg-[var(--surface-2)] p-5">
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <h4 className="text-base font-semibold text-ink-hi">{assignment.plan!.name}</h4>
                                                <span className="badge-brand shrink-0 !px-3 !py-1 !text-xs">
                                                    Assigned
                                                </span>
                                            </div>
                                            {assignment.plan!.description && (
                                                <p className="mb-2 text-sm text-ink-mid">{assignment.plan!.description}</p>
                                            )}
                                            <div className="text-[0.8rem] text-ink-low">
                                                {assignment.start_date} to {assignment.end_date}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="glass-card p-8">
                        <h3 className="display mb-6 text-lg">Recent Activity</h3>
                        <div className="flex flex-col gap-4">
                            {logs.map(log => (
                                <div key={log.id} className="rounded-xl border border-line-soft bg-[var(--surface-2)] p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-semibold text-ink-hi">{new Date(log.date).toLocaleDateString()}</span>
                                        <span className="text-sm text-ink-low">{new Date(log.date).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm text-ink-mid">
                                        {log.exercises.length} exercises logged
                                    </div>
                                    {/* Show PRs if any */}
                                    {log.exercises.some(ex => ex.sets.some(s => s.isPr)) && (
                                        <div className="mt-2 text-sm font-bold text-brand">
                                            PRs set!
                                        </div>
                                    )}
                                </div>
                            ))}
                            {logs.length === 0 && <p className="text-sm text-ink-low">No workouts logged yet.</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Plans and nutrition are built with the coach at /coach; here the AI checks your form */}
                    <AIFormChecker />
                </div>
            )}
        </div>
    );
}
