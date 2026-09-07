'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiFetch, errorMessage } from '@/lib/apiClient';
import { db } from '@/lib/supabaseDb';
import type { Profile, TrainingPlan, SessionExercise, IntakeFormData } from '@/lib/types';
import type { GeneratedPlanData } from '@/app/api/ai-coach/generate-plan/route';
import type { SplitOption } from '@/components/ai-coach/SplitSelection';
import { ArrowLeft, FileText, Wrench, Bot, Check } from 'lucide-react';

type MethodTab = 'templates' | 'manual' | 'ai';

export default function AssignPlanPage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [clientProfile, setClientProfile] = useState<Profile | null>(null);
    const [templates, setTemplates] = useState<TrainingPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [activeMethod, setActiveMethod] = useState<MethodTab>('templates');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch trainer's plans (templates)
            const plans = await db.trainingPlans.getByCreator(user.id);
            setTemplates(plans);

            // Fetch client profile
            const client = await db.profiles.getById(clientId);
            setClientProfile(client);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, [user, clientId]);

    useEffect(() => {
        if (user) fetchData();
    }, [user, fetchData]);

    const handleAssignPlan = async (planId: string, durationWeeks?: number) => {
        if (!user) return;
        setAssigning(true);
        setError(null);

        try {
            const selectedPlan = templates.find(p => p.id === planId);
            const weeks = durationWeeks || selectedPlan?.duration_weeks || 12;
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + weeks * 7);

            await db.trainingPlanAssignments.create({
                plan_id: planId,
                user_id: clientId,
                assigned_by_id: user.id,
                is_self_assigned: false,
                start_date: today.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                is_active: true,
            });

            setAssignSuccess(true);
            setTimeout(() => {
                router.push(`/trainer/client/${clientId}`);
            }, 1500);
        } catch (err: any) {
            console.error('Assign plan error:', err);
            setError(err.message || 'Failed to assign plan');
        } finally {
            setAssigning(false);
        }
    };

    const handleGenerateAIPlan = async () => {
        if (!user || !clientProfile) return;
        setAssigning(true);
        setError(null);

        try {
            // The generate-plan route takes intake data + a split and returns the plan itself
            // (the trainer is the token holder); what we know about the client fills the intake.
            const intakeData: Partial<IntakeFormData> = {
                name: clientProfile.full_name || clientProfile.username || '',
                fitness_goals: clientProfile.fitness_goals?.join(', ') || 'General fitness',
                fitness_level: clientProfile.experience || '',
                height: clientProfile.height_cm ? `${clientProfile.height_cm} cm` : '',
                weight: clientProfile.weight_kg ? `${clientProfile.weight_kg} kg` : '',
            };

            const { splits } = await apiFetch<{ splits?: SplitOption[] }>('/api/ai-coach/generate-plan', {
                method: 'POST',
                body: { action: 'recommend_splits', intakeData, messages: [] },
            });
            const split = splits?.find(s => s.recommended) ?? splits?.[0];
            if (!split) {
                throw new Error('AI plan generation failed. Try using the Manual Builder instead.');
            }

            const { plan } = await apiFetch<{ plan?: GeneratedPlanData }>('/api/ai-coach/generate-plan', {
                method: 'POST',
                body: { splitType: split.id, intakeData, messages: [] },
            });
            if (!plan) {
                throw new Error('AI plan generation failed. Try using the Manual Builder instead.');
            }

            // Save it as the trainer's plan, then assign it to the client
            const trainingPlan = await db.trainingPlans.create({
                creator_id: user.id,
                name: plan.name,
                description: plan.description || '',
                duration_weeks: plan.duration_weeks,
                tags: [`split:${plan.split_type}`, `client:${clientId}`],
                is_template: false,
                is_public: false,
            });

            const daysPerWeek = plan.sessions.length > 0
                ? Math.max(...plan.sessions.map(s => s.day_number))
                : 1;

            for (const session of plan.sessions) {
                const exercises: SessionExercise[] = session.exercises.map((ex, exIndex) => {
                    const row: SessionExercise & { fourd_id: string | null } = {
                        // library id when the model picked one; else a name-derived id
                        exercise_id: ex.exercise_id || `${ex.exercise_name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '_')
                            .substring(0, 50)}_d${session.day_number}_e${exIndex}`,
                        exercise_name: ex.exercise_name,
                        // 4Dcoach exercise (or null) so the plan can link to the 4D form check
                        fourd_id: ex.fourd_id ?? null,
                        sets: ex.sets.map(s => ({
                            reps: s.reps,
                            weight: s.weight || '',
                            rest_seconds: s.rest_seconds || 90,
                        })),
                        notes: ex.notes || '',
                    };
                    return row;
                });
                const workoutSession = await db.workoutSessions.create({
                    creator_id: user.id,
                    name: session.name,
                    description: '',
                    exercises,
                    tags: [],
                    is_template: false,
                    is_public: false,
                });
                await db.trainingPlanSessions.create({
                    plan_id: trainingPlan.id,
                    session_id: workoutSession.id,
                    day_number: session.day_number,
                    week_number: Math.ceil(session.day_number / daysPerWeek),
                });
            }

            // Auto-assign the generated plan
            await handleAssignPlan(trainingPlan.id, plan.duration_weeks);
        } catch (err: unknown) {
            // a 429 carries the daily/monthly AI limit message
            setError(errorMessage(err, 'AI plan generation failed. Try using the Manual Builder instead.'));
        } finally {
            setAssigning(false);
        }
    };

    const clientName = clientProfile?.full_name || clientProfile?.username || 'Client';

    const methodTabs: { key: MethodTab; label: string; icon: React.ElementType }[] = [
        { key: 'templates', label: 'From Templates', icon: FileText },
        { key: 'manual', label: 'Manual Builder', icon: Wrench },
        { key: 'ai', label: 'AI-Assisted', icon: Bot },
    ];

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>;
    }

    if (assignSuccess) {
        return (
            <div style={{
                padding: '3rem',
                maxWidth: '600px',
                margin: '0 auto',
                textAlign: 'center',
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(74, 222, 128, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                }}>
                    <Check size={32} color="#4ade80" />
                </div>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.25rem',
                    color: '#4ade80',
                    marginBottom: '0.5rem',
                }}>
                    Plan Assigned!
                </h2>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    {clientName} has been notified about their new training plan.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
            {/* Back Button */}
            <button
                onClick={() => router.push(`/trainer/client/${clientId}`)}
                style={{
                    background: 'rgba(218, 0, 35, 0.15)',
                    border: '1px solid rgba(218, 0, 35, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#da0023',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                }}
            >
                <ArrowLeft size={18} />
                Back to {clientName}
            </button>

            <h1 style={{
                fontFamily: 'var(--font-orbitron)',
                fontSize: '1.5rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
            }}>
                Assign Plan
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Choose a method to assign a training plan to {clientName}.
            </p>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    background: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '0.85rem',
                }}>
                    {error}
                </div>
            )}

            {/* Method Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '0.25rem',
            }}>
                {methodTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveMethod(tab.key)}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: activeMethod === tab.key ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: activeMethod === tab.key ? 'white' : '#888',
                                cursor: 'pointer',
                                fontWeight: activeMethod === tab.key ? '600' : '400',
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

            {/* From Templates */}
            {activeMethod === 'templates' && (
                <div>
                    {loading ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                            Loading templates...
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                            <FileText size={36} color="#555" style={{ marginBottom: '0.75rem' }} />
                            <p>No templates found.</p>
                            <p style={{ fontSize: '0.85rem' }}>
                                Create plans using the Manual Builder or AI-Assisted method first.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {templates.map(plan => (
                                <div
                                    key={plan.id}
                                    className="glass-panel"
                                    style={{
                                        padding: '1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        border: selectedPlanId === plan.id
                                            ? '1px solid var(--primary)'
                                            : undefined,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
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
                                    <button
                                        onClick={() => handleAssignPlan(plan.id)}
                                        disabled={assigning}
                                        style={{
                                            background: 'var(--primary)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0.5rem 1rem',
                                            color: 'white',
                                            cursor: assigning ? 'not-allowed' : 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            opacity: assigning ? 0.6 : 1,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {assigning ? 'Assigning...' : 'Assign'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Manual Builder */}
            {activeMethod === 'manual' && (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <Wrench size={36} color="#888" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '1rem' }}>
                        Use the Plan Creator to build a custom plan for {clientName}.
                    </p>
                    <button
                        onClick={() => router.push(`/plans/new?traineeId=${clientId}&trainerId=${user?.id}`)}
                        style={{
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '0.75rem 2rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                        }}
                    >
                        Open Plan Creator
                    </button>
                </div>
            )}

            {/* AI-Assisted */}
            {activeMethod === 'ai' && (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <Bot size={36} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                        Generate a training plan using AI based on {clientName}&apos;s profile.
                    </p>
                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        The AI will use the client&apos;s intake data, goals, and available equipment to create a personalized plan.
                    </p>
                    <button
                        onClick={handleGenerateAIPlan}
                        disabled={assigning}
                        style={{
                            background: assigning ? 'rgba(218, 0, 35, 0.5)' : 'var(--primary)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '0.75rem 2rem',
                            color: 'white',
                            cursor: assigning ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Bot size={18} />
                        {assigning ? 'Generating...' : 'Generate & Assign Plan'}
                    </button>
                </div>
            )}
        </div>
    );
}
