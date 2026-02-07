'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile, TrainingPlan } from '@/lib/types';
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

    const handleAssignPlan = async (planId: string) => {
        if (!user) return;
        setAssigning(true);
        setError(null);

        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 84); // 12 weeks default

            const res = await fetch('/api/plan-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_id: planId,
                    user_id: clientId,
                    assigned_by_id: user.id,
                    is_self_assigned: false,
                    start_date: today.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to assign plan');
            }

            setAssignSuccess(true);
            setTimeout(() => {
                router.push(`/trainer/client/${clientId}`);
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleGenerateAIPlan = async () => {
        if (!user || !clientProfile) return;
        setAssigning(true);
        setError(null);

        try {
            // Use the existing generate-plan endpoint with client's intake data
            const res = await fetch('/api/ai-coach/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: clientId,
                    trainerId: user.id,
                    // Include any available client data
                    fitnessGoals: clientProfile.fitness_goals?.join(', ') || 'General fitness',
                }),
            });

            if (!res.ok) {
                throw new Error('AI plan generation failed. Try using the Manual Builder instead.');
            }

            const data = await res.json();
            if (data.planId) {
                // Auto-assign the generated plan
                await handleAssignPlan(data.planId);
            } else {
                throw new Error('Plan generated but no ID returned.');
            }
        } catch (err: any) {
            setError(err.message);
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
                            background: assigning ? 'rgba(255, 102, 0, 0.5)' : 'var(--primary)',
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
