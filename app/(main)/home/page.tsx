'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ClipboardList, Bot, UtensilsCrossed, Trash2, Pencil, ChevronRight } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import EmptyState from '@/components/EmptyState';
import { db } from '@/lib/supabaseDb';
import type { Profile, TrainingPlan, NutritionPlan } from '@/lib/types';

export default function HomePage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const loadPlans = useCallback(async () => {
        if (!user?.id) return;
        setPlansLoading(true);
        try {
            const [workoutPlans, dietPlans] = await Promise.all([
                db.trainingPlans.getByCreator(user.id),
                db.nutritionPlans.getByUser(user.id),
            ]);
            setPlans(workoutPlans);
            setNutritionPlans(dietPlans);
        } catch (err) {
            // Supabase may fail if user is only in localStorage (not authenticated)
            console.warn('Could not load plans:', err);
        } finally {
            setPlansLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const hasPlans = plans.length > 0 || nutritionPlans.length > 0;

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
        <div style={{ padding: '1.5rem', paddingBottom: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                }}>
                    Dashboard
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    Welcome back, {user?.full_name || user?.username || 'Athlete'}!
                </p>
            </div>

            {/* Two Primary Action Cards */}
            <div
                data-testid="primary-actions"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2.5rem'
                }}
            >
                {/* Start Workout Card */}
                <button
                    data-testid="start-workout-card"
                    onClick={() => router.push('/home/workout')}
                    className="glass-panel"
                    style={{
                        padding: '2rem 1.5rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: '1px solid rgba(242, 95, 41, 0.3)',
                        background: 'rgba(242, 95, 41, 0.05)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(242, 95, 41, 0.12)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(242, 95, 41, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(242, 95, 41, 0.3)';
                    }}
                >
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Dumbbell size={28} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontFamily: 'var(--font-orbitron)',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '0.25rem'
                        }}>
                            Start Workout
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            {plans.length > 0
                                ? `${plans.length} saved plan${plans.length > 1 ? 's' : ''} available`
                                : 'Create a plan with AI Coach first'}
                        </div>
                    </div>
                    <ChevronRight size={20} color="#888" />
                </button>

                {/* AI Coach Card */}
                <button
                    data-testid="ai-coach-card"
                    onClick={() => router.push('/coach')}
                    className="glass-panel"
                    style={{
                        padding: '2rem 1.5rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: hasPlans
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '2px solid var(--primary)',
                        background: hasPlans
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(242, 95, 41, 0.08)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(242, 95, 41, 0.12)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = hasPlans
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(242, 95, 41, 0.08)';
                        e.currentTarget.style.borderColor = hasPlans
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'var(--primary)';
                    }}
                >
                    {!hasPlans && (
                        <div
                            data-testid="recommended-badge"
                            style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: 'var(--primary)',
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            Recommended
                        </div>
                    )}
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--primary), #ff6b35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Bot size={28} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontFamily: 'var(--font-orbitron)',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '0.25rem'
                        }}>
                            AI Coach
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            {hasPlans
                                ? 'Chat, generate plans, get advice'
                                : 'Get started with a personalized plan'}
                        </div>
                    </div>
                    <ChevronRight size={20} color="#888" />
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
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem'
            }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.25rem',
                    margin: 0,
                    color: 'white'
                }}>
                    My Library
                </h2>
                <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tab Toggle */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '0.25rem'
            }}>
                <button
                    data-testid="library-tab-workout"
                    onClick={() => setActiveTab('workout')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        background: activeTab === 'workout' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: activeTab === 'workout' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'workout' ? '600' : '400',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <Dumbbell size={16} />
                    Workout Plans ({plans.length})
                </button>
                <button
                    data-testid="library-tab-nutrition"
                    onClick={() => setActiveTab('nutrition')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        background: activeTab === 'nutrition' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: activeTab === 'nutrition' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'nutrition' ? '600' : '400',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <UtensilsCrossed size={16} />
                    Diet Plans ({nutritionPlans.length})
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading...</div>
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
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {plans.map(plan => (
                                    <div
                                        key={plan.id}
                                        data-testid="library-workout-plan"
                                        className="glass-panel"
                                        style={{
                                            padding: '1.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => router.push(`/plans?id=${plan.id}`)}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{
                                                fontWeight: '600',
                                                marginBottom: '0.25rem',
                                                fontSize: '1rem',
                                                color: 'white',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {plan.name}
                                            </h3>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {plan.duration_weeks && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--primary)',
                                                        background: 'rgba(242, 95, 41, 0.1)',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px'
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
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {plan.phase_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                            <button
                                                data-testid="edit-workout-plan"
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
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {nutritionPlans.map(plan => (
                                    <div
                                        key={plan.id}
                                        data-testid="library-nutrition-plan"
                                        className="glass-panel"
                                        style={{
                                            padding: '1.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => router.push(`/nutrition?planId=${plan.id}`)}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{
                                                fontWeight: '600',
                                                marginBottom: '0.25rem',
                                                fontSize: '1rem',
                                                color: 'white',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {plan.name || 'Nutrition Plan'}
                                            </h3>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {plan.plan_overview?.daily_calories && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--primary)',
                                                        background: 'rgba(242, 95, 41, 0.1)',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {plan.plan_overview.daily_calories} cal/day
                                                    </span>
                                                )}
                                                {plan.dietary_preferences?.length > 0 && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: '#aaa',
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {plan.dietary_preferences.slice(0, 2).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
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
