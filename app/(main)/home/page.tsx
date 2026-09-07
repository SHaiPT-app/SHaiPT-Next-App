'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ClipboardList, Bot, UtensilsCrossed, Trash2, Pencil, ChevronRight, X, Video } from 'lucide-react';
import { fourDcoachUrl } from '@/lib/fourDcoach';
import ConfirmationModal from '@/components/ConfirmationModal';
import EmptyState from '@/components/EmptyState';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/apiClient';
import type { Profile, TrainingPlan, NutritionPlan, Notification } from '@/lib/types';

async function fetchPlans(userId: string): Promise<{ workoutPlans: TrainingPlan[]; dietPlans: NutritionPlan[] }> {
    let workoutPlans: TrainingPlan[] = [];
    let dietPlans: NutritionPlan[] = [];

    // 1. Fetch Workout Plans
    try {
        // Load training plans via training_plan_assignments (reliable RLS path)
        const assignments = await db.trainingPlanAssignments.getByUser(userId);
        const uniquePlanIds = [...new Set(assignments.map(a => a.plan_id))];

        if (uniquePlanIds.length > 0) {
            const planResults = await Promise.all(
                uniquePlanIds.map(id => db.trainingPlans.getById(id).catch(() => null))
            );
            workoutPlans = planResults.filter((p): p is TrainingPlan => p !== null);
        }

        // Fallback: also try direct query in case some plans don't have assignments
        if (workoutPlans.length === 0) {
            try {
                const directPlans = await db.trainingPlans.getByCreator(userId);
                if (directPlans.length > 0) workoutPlans = directPlans;
            } catch {
                // Direct query may fail due to RLS — that's OK
            }
        }
    } catch (error) {
        console.warn('Error fetching workout plans:', error);
    }

    // 2. Fetch Diet Plans
    try {
        dietPlans = await db.nutritionPlans.getByUser(userId);
    } catch (error) {
        // Silently fail if table missing or RLS error
    }

    return { workoutPlans, dietPlans };
}

export default function HomePage() {
    // ... (state declarations)
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [planBanner, setPlanBanner] = useState<Notification | null>(null);
    const router = useRouter();
    const userIdRef = useRef<string | null>(null);

    const loadPlans = useCallback(async () => {
        const userId = userIdRef.current;
        if (!userId) return;
        setPlansLoading(true);
        try {
            const { workoutPlans, dietPlans } = await fetchPlans(userId);
            setPlans(workoutPlans);
            setNutritionPlans(dietPlans);
        } catch (err) {
            console.warn('Could not load plans:', err);
        } finally {
            setPlansLoading(false);
        }
    }, []);

    useEffect(() => {
        async function initAndLoad() {
            // Resolve the authenticated user ID
            let resolvedUserId: string | null = null;

            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    resolvedUserId = authUser.id;
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    } else {
                        setUser({ id: authUser.id, email: authUser.email || '', username: authUser.email || '' } as Profile);
                    }
                }
            } catch {
                // getUser() can throw on network errors — continue to fallbacks
            }

            if (!resolvedUserId) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        resolvedUserId = session.user.id;
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            setUser(JSON.parse(storedUser));
                        } else {
                            setUser({ id: session.user.id, email: session.user.email || '', username: session.user.email || '' } as Profile);
                        }
                    }
                } catch {
                    // getSession() failed — continue to localStorage fallback
                }
            }

            if (!resolvedUserId) {
                // ... (session check omitted)
            }

            // PRIORITIZE LOCAL STORAGE
            // If we have a stored user in localStorage, prefer that ID over the session ID
            // This ensures consistency with WorkoutLogger and other components that rely on localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed && parsed.id) {
                        setUser(parsed);
                        resolvedUserId = parsed.id;
                    }
                } catch (e) {
                    console.warn('Failed to parse stored user:', e);
                }
            } else if (resolvedUserId && !user) {
                // If no local storage but we have a session ID, fetch the full profile
                try {
                    const profile = await db.profiles.getById(resolvedUserId);
                    if (profile) {
                        setUser(profile);
                        localStorage.setItem('user', JSON.stringify(profile));
                    }
                } catch {
                    // Ignore profile fetch errors
                }
            }

            userIdRef.current = resolvedUserId;
            setLoading(false);

            // Load plans directly with the resolved userId — no useCallback/useEffect chain
            if (resolvedUserId) {
                setPlansLoading(true);
                try {
                    const { workoutPlans, dietPlans } = await fetchPlans(resolvedUserId);
                    setPlans(workoutPlans);
                    setNutritionPlans(dietPlans);
                } catch (err) {
                    console.warn('Could not load plans:', err);
                } finally {
                    setPlansLoading(false);
                }
                // Check for plan_assigned notifications
                try {
                    const { notifications } = await apiFetch<{ notifications?: Notification[] }>('/api/notifications');
                    const planNotif = (notifications || []).find(
                        (n: Notification) => n.type === 'plan_assigned' && !n.is_read
                    );
                    if (planNotif) setPlanBanner(planNotif);
                } catch {
                    // Silently fail
                }
            } else {
                setPlansLoading(false);
            }
        }
        initAndLoad();
    }, []);

    const dismissBanner = async () => {
        if (planBanner) {
            try {
                await apiFetch('/api/notifications', {
                    method: 'PATCH',
                    body: { notificationId: planBanner.id },
                });
            } catch {
                // Silently fail
            }
        }
        setPlanBanner(null);
    };

    const hasPlans = plans.length > 0 || nutritionPlans.length > 0;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[900px] p-6 pb-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="display text-gradient-brand mb-2 text-[2rem]">
                    Dashboard
                </h1>
                <p className="text-sm text-ink-mid">
                    Welcome back, {user?.full_name || user?.username || 'Athlete'}!
                </p>
            </div>

            {/* Plan Assignment Banner */}
            {planBanner && (
                <div className="mb-6 flex items-center gap-4 rounded-xl border border-brand/30 bg-[var(--brand-glow-soft)] px-5 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand shadow-[0_0_16px_var(--brand-glow-soft)]">
                        <Dumbbell size={22} className="text-ink-hi" />
                    </div>
                    <div className="flex-1">
                        <div className="mb-0.5 text-[0.95rem] font-semibold text-ink-hi">
                            New Plan Assigned!
                        </div>
                        <div className="text-sm text-ink-mid">
                            {planBanner.content}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button
                            onClick={() => router.push('/home/workout')}
                            className="btn-brand !px-4 !py-2 !text-[0.8rem]"
                        >
                            View Plan
                        </button>
                        <button
                            onClick={dismissBanner}
                            className="icon-btn !h-9 !w-9"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Two Primary Action Cards */}
            <div
                data-testid="primary-actions"
                className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4"
            >
                {/* Start Workout Card */}
                <button
                    data-testid="start-workout-card"
                    onClick={() => router.push('/home/workout')}
                    className="glass-card glass-card-hover flex cursor-pointer items-center gap-4 !border-brand/30 !bg-[var(--brand-glow-soft)] px-6 py-8 text-left"
                >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-brand shadow-[0_0_24px_var(--brand-glow-soft)]">
                        <Dumbbell size={28} className="text-ink-hi" />
                    </div>
                    <div className="flex-1">
                        <div className="font-display mb-1 text-[1.1rem] font-semibold text-ink-hi">
                            Start Workout
                        </div>
                        <div className="text-sm text-ink-mid">
                            {plans.length > 0
                                ? `${plans.length} saved plan${plans.length > 1 ? 's' : ''} available`
                                : 'Create a plan with AI Coach first'}
                        </div>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-ink-low" />
                </button>

                {/* 4Dcoach: film a set, get a 4D replay with reps, tempo and a technique score */}
                <a
                    data-testid="fourd-coach-card"
                    href={fourDcoachUrl()}
                    className="glass-card glass-card-hover relative flex cursor-pointer items-center gap-4 overflow-hidden !border-brand/40 !bg-[var(--brand-glow-soft)] px-6 py-8 text-left no-underline"
                >
                    <div className="absolute right-2 top-2 rounded bg-brand px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.5px] text-ink-hi shadow-[0_0_12px_var(--brand-glow-soft)]">
                        New
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[image:var(--brand-gradient)] shadow-[0_0_24px_var(--brand-glow)]">
                        <Video size={28} className="text-ink-hi" />
                    </div>
                    <div className="flex-1">
                        <div className="font-display mb-1 text-[1.1rem] font-semibold text-ink-hi">
                            4Dcoach
                        </div>
                        <div className="text-sm text-ink-mid">
                            Film a set, get a 4D replay: reps, tempo, technique score
                        </div>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-ink-low" />
                </a>

                {/* AI Coach Card */}
                <button
                    data-testid="ai-coach-card"
                    onClick={() => router.push('/coach')}
                    className={`glass-card glass-card-hover relative flex cursor-pointer items-center gap-4 overflow-hidden px-6 py-8 text-left ${
                        hasPlans ? '' : '!border-2 !border-brand !bg-[var(--brand-glow-soft)]'
                    }`}
                >
                    {!hasPlans && (
                        <div
                            data-testid="recommended-badge"
                            className="absolute right-2 top-2 rounded bg-brand px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.5px] text-ink-hi shadow-[0_0_12px_var(--brand-glow-soft)]"
                        >
                            Recommended
                        </div>
                    )}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[image:var(--brand-gradient)] shadow-[0_0_24px_var(--brand-glow-soft)]">
                        <Bot size={28} className="text-ink-hi" />
                    </div>
                    <div className="flex-1">
                        <div className="font-display mb-1 text-[1.1rem] font-semibold text-ink-hi">
                            Coach List
                        </div>
                        <div className="text-sm text-ink-mid">
                            {hasPlans
                                ? 'Browse AI and human coaches'
                                : 'Get started with a personalized plan'}
                        </div>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-ink-low" />
                </button>
            </div>

            {/* My Library Section */}
            <MyLibrary
                plans={plans}
                nutritionPlans={nutritionPlans}
                loading={plansLoading}
                onRefresh={loadPlans}
            />
        </div>
    );
}

// ============================================
// MY LIBRARY SECTION
// ============================================

function MyLibrary({
    plans,
    nutritionPlans,
    loading,
    onRefresh
}: {
    plans: TrainingPlan[];
    nutritionPlans: NutritionPlan[];
    loading: boolean;
    onRefresh: () => void;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'workout' | 'nutrition'>('workout');
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'workout' | 'nutrition' | null;
        id: string | null;
        name: string;
    }>({ isOpen: false, type: null, id: null, name: '' });

    const handleDelete = async () => {
        if (!deleteModal.id || !deleteModal.type) return;
        try {
            if (deleteModal.type === 'workout') {
                await db.trainingPlans.delete(deleteModal.id);
            } else {
                await db.nutritionPlans.delete(deleteModal.id);
            }
            setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
            onRefresh();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const totalItems = plans.length + nutritionPlans.length;

    return (
        <div data-testid="my-library">
            {/* Section Header */}
            <div className="mb-5 flex items-center justify-between">
                <h2 className="display m-0 text-xl">
                    My Library
                </h2>
                <span className="text-sm text-ink-low">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tab Toggle */}
            <div className="mb-6 flex gap-2 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1">
                <button
                    data-testid="library-tab-workout"
                    onClick={() => setActiveTab('workout')}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm transition-all ${
                        activeTab === 'workout'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
                >
                    <Dumbbell size={16} />
                    Workout Plans ({plans.length})
                </button>
                <button
                    data-testid="library-tab-nutrition"
                    onClick={() => setActiveTab('nutrition')}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm transition-all ${
                        activeTab === 'nutrition'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
                >
                    <UtensilsCrossed size={16} />
                    Diet Plans ({nutritionPlans.length})
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="p-8 text-center text-ink-mid">Loading...</div>
            ) : (
                <>
                    {activeTab === 'workout' ? (
                        plans.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="No workout plans yet"
                                description="Use the AI Coach to generate your first personalized training plan."
                                action={{ label: 'Open AI Coach', onClick: () => router.push('/coach') }}
                            />
                        ) : (
                            <div className="grid gap-3">
                                {plans.map(plan => (
                                    <div
                                        key={plan.id}
                                        data-testid="library-workout-plan"
                                        className="glass-card glass-card-hover flex cursor-pointer items-center gap-4 p-5"
                                        onClick={() => router.push(`/plans?id=${plan.id}`)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h3 className="mb-1 truncate text-base font-semibold text-ink-hi">
                                                {plan.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {plan.duration_weeks && (
                                                    <span className="rounded bg-[var(--brand-glow-soft)] px-2 py-0.5 text-xs text-brand">
                                                        {plan.duration_weeks} Weeks
                                                    </span>
                                                )}
                                                {plan.phase_type && (
                                                    <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs capitalize text-ink-mid">
                                                        {plan.phase_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex shrink-0 gap-1.5">
                                            <button
                                                data-testid="edit-workout-plan"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/plans/new?edit=${plan.id}`);
                                                }}
                                                className="icon-btn !h-9 !w-9 !rounded-lg"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                data-testid="delete-workout-plan"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        type: 'workout',
                                                        id: plan.id,
                                                        name: plan.name
                                                    });
                                                }}
                                                className="icon-btn !h-9 !w-9 !rounded-lg !text-destructive hover:!border-destructive/40 hover:!bg-destructive/10 hover:!text-destructive hover:!shadow-none"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        nutritionPlans.length === 0 ? (
                            <EmptyState
                                icon={UtensilsCrossed}
                                title="No diet plans yet"
                                description="Use the AI Coach to generate a personalized nutrition plan."
                                action={{ label: 'Open AI Coach', onClick: () => router.push('/coach') }}
                            />
                        ) : (
                            <div className="grid gap-3">
                                {nutritionPlans.map(plan => (
                                    <div
                                        key={plan.id}
                                        data-testid="library-nutrition-plan"
                                        className="glass-card glass-card-hover flex cursor-pointer items-center gap-4 p-5"
                                        onClick={() => router.push(`/nutrition?planId=${plan.id}`)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h3 className="mb-1 truncate text-base font-semibold text-ink-hi">
                                                {plan.name || 'Nutrition Plan'}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {plan.plan_overview?.daily_calories && (
                                                    <span className="rounded bg-[var(--brand-glow-soft)] px-2 py-0.5 text-xs text-brand">
                                                        {plan.plan_overview.daily_calories} cal/day
                                                    </span>
                                                )}
                                                {plan.dietary_preferences?.length > 0 && (
                                                    <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs text-ink-mid">
                                                        {plan.dietary_preferences.slice(0, 2).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex shrink-0 gap-1.5">
                                            <button
                                                data-testid="delete-nutrition-plan"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        type: 'nutrition',
                                                        id: plan.id,
                                                        name: plan.name || 'Nutrition Plan'
                                                    });
                                                }}
                                                className="icon-btn !h-9 !w-9 !rounded-lg !text-destructive hover:!border-destructive/40 hover:!bg-destructive/10 hover:!text-destructive hover:!shadow-none"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
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
                title={`Delete ${deleteModal.type === 'workout' ? 'Training Plan' : 'Diet Plan'}`}
                message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, name: '' })}
            />
        </div>
    );
}
