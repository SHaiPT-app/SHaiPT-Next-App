'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import { ArrowLeft, Plus, Trash2, Calendar, Dumbbell, Save } from 'lucide-react';
import type { WorkoutSession, Profile, SessionExercise } from '@/lib/types';
import SessionSearch from '@/components/SessionSearch';

interface WeeklySchedule {
    day_number: number;
    session_id: string | null;
    session_name?: string;
}

export default function NewPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editPlanId = searchParams.get('edit');

    const [user, setUser] = useState<Profile | null>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Plan Basic Info
    const [planName, setPlanName] = useState('');
    const [description, setDescription] = useState('');
    const [durationWeeks, setDurationWeeks] = useState(4);

    // Schedule State
    const [scheduleType, setScheduleType] = useState<'weekly' | 'rolling'>('weekly');
    const [cycleLength, setCycleLength] = useState(7);
    const [schedule, setSchedule] = useState<WeeklySchedule[]>([]);

    // Initialize/Update Schedule based on Cycle Length
    useEffect(() => {
        const days = scheduleType === 'weekly' ? 7 : (cycleLength || 1);

        setSchedule(prev => {
            // Preserve existing data if possible
            const newSchedule = [];
            for (let i = 1; i <= days; i++) {
                const existing = prev.find(d => d.day_number === i);
                newSchedule.push(existing || { day_number: i, session_id: null });
            }
            return newSchedule;
        });
    }, [scheduleType, cycleLength]);

    // Available Sessions (from library)
    const [availableSessions, setAvailableSessions] = useState<WorkoutSession[]>([]);

    // Session Creator Modal State
    const [showSessionCreator, setShowSessionCreator] = useState(false);
    const [currentDayEditing, setCurrentDayEditing] = useState<number | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            loadSessions(parsedUser.id);
        }
    }, []);

    // Load existing plan (and sessions) if editing
    useEffect(() => {
        const loadPlanForEdit = async () => {
            if (!editPlanId) return;

            setLoading(true);
            try {
                // 1. Get Plan Details
                const plan = await db.trainingPlans.getById(editPlanId);
                if (plan) {
                    setPlanName(plan.name);
                    setDescription(plan.description || '');
                    setDurationWeeks(plan.duration_weeks || 4);

                    // Parse tags for schedule type
                    // Tags like "schedule:weekly", "kind:weekly", etc.
                    // We stored as `schedule:${scheduleType}` and optionally `cycle:${cycleLength}`
                    const scheduleTag = plan.tags?.find(t => t.startsWith('schedule:'));
                    if (scheduleTag) {
                        const type = scheduleTag.split(':')[1] as 'weekly' | 'rolling';
                        setScheduleType(type);
                    }

                    const cycleTag = plan.tags?.find(t => t.startsWith('cycle:'));
                    if (cycleTag) {
                        setCycleLength(parseInt(cycleTag.split(':')[1]));
                    }
                }

                // 2. Get Plan Sessions (Schedule)
                const planSessions = await db.trainingPlanSessions.getByPlan(editPlanId);
                if (planSessions.length > 0) {
                    // We need to resolve session names. Since `availableSessions` might not be loaded yet or fully loaded,
                    // let's fetch the sessions referenced here to be sure, or just rely on IDs and let UI resolve names if needed.
                    // But our `schedule` state needs `session_name`.

                    // Let's rely on mapping these to the schedule format.
                    // We need to fetch details for these sessions to get names if they aren't available yet.
                    const distinctSessionIds = Array.from(new Set(planSessions.map(ps => ps.session_id)));
                    const sessionsDetails = await Promise.all(
                        distinctSessionIds.map(id => db.workoutSessions.getById(id))
                    );

                    const sessionMap = new Map();
                    sessionsDetails.forEach(s => {
                        if (s) sessionMap.set(s.id, s);
                    });

                    setSchedule(prev => {
                        // Create a map of existing schedule to overlay
                        const newSchedule = [...prev];

                        planSessions.forEach(ps => {
                            const existingDay = newSchedule.find(d => d.day_number === ps.day_number);
                            if (existingDay) {
                                existingDay.session_id = ps.session_id;
                                existingDay.session_name = sessionMap.get(ps.session_id)?.name;
                            } else {
                                // If day doesn't exist (e.g. cycle length changed), append it
                                newSchedule.push({
                                    day_number: ps.day_number,
                                    session_id: ps.session_id,
                                    session_name: sessionMap.get(ps.session_id)?.name
                                });
                            }
                        });

                        // Sort by day number
                        return newSchedule.sort((a, b) => a.day_number - b.day_number);
                    });
                }

            } catch (error) {
                console.error('Error loading plan for edit:', error);
                alert('Failed to load plan for editing');
            } finally {
                setLoading(false);
            }
        };

        if (user) { // Only load after user is ready (and maybe sessions?) - actually user ID isn't strictly needed for getById but good practice
            loadPlanForEdit();
        }
    }, [editPlanId, user]);

    const loadSessions = async (userId: string) => {
        try {
            const data = await db.workoutSessions.getByCreator(userId);
            setAvailableSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    };

    const handleSavePlan = async () => {
        if (!user || !planName.trim()) return;
        setLoading(true);

        try {
            // 1. Prepare Plan Data
            const planData = {
                creator_id: user.id,
                name: planName,
                description,
                duration_weeks: durationWeeks,
                is_template: true,
                is_public: true, // Default to true for now
                tags: [
                    `schedule:${scheduleType}`,
                    ...(scheduleType === 'rolling' ? [`cycle:${cycleLength}`] : [])
                ]
            };

            let targetPlanId = editPlanId;

            if (editPlanId) {
                // Update Plan
                await db.trainingPlans.update(editPlanId, planData);

                // For sessions: simplified approach is delete all and recreate
                await db.trainingPlanSessions.deleteByPlan(editPlanId);
            } else {
                // Create Plan
                const newPlan = await db.trainingPlans.create(planData);
                targetPlanId = newPlan.id;
            }

            if (!targetPlanId) throw new Error('Failed to save plan');

            // 2. Create Plan Sessions
            const planSessions = schedule
                .filter(day => day.session_id !== null)
                .map(day => ({
                    plan_id: targetPlanId!,
                    session_id: day.session_id!,
                    day_number: day.day_number
                }));

            // Bulk insert (using new method or loop if loop is safer for now)
            // We'll use loop as createBulk isn't fully robust in my manual mock check above,
            // actually I added createBulk logic in previous steps, let's use loop to be safe or bulk if confident.
            // I'll stick to the existing loop pattern but maybe optimized.
            // Actually, let's use the loop pattern to be consistently safe with the existing code structure unless I see bulk.
            // I added createBulk earlier (wait, did I? I added deleteByPlan. I saw createBulk existed in view).
            // Yes, createBulk exists. Let's try to use it for efficiency as deleting/recreating is heavy.

            if (planSessions.length > 0) {
                await db.trainingPlanSessions.createBulk(planSessions);
            }

            router.push('/home');
        } catch (error: any) {
            console.error('Error saving plan full object:', error);
            console.error('Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                status: error?.status
            });
            alert(`Failed to save plan: ${error?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = (dayNumber: number, sessionId: string) => {
        const session = availableSessions.find(s => s.id === sessionId);
        setSchedule(prev => prev.map(d =>
            d.day_number === dayNumber
                ? { ...d, session_id: sessionId, session_name: session?.name }
                : d
        ));
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.5rem', margin: 0 }}>
                    {editPlanId ? 'Edit Training Plan' : 'Create Training Plan'}
                </h1>
            </div>

            {/* Step 1: Basics */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                    Plan Details
                </h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Plan Name</label>
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            placeholder="e.g., 12 Week Strength & Hypertrophy"
                            className="input-field"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Goal of this plan, target audience, etc."
                            className="input-field"
                            style={{ width: '100%', minHeight: '80px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Duration (Weeks)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                min="1"
                                max="52"
                                value={durationWeeks}
                                onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
                                style={{ flex: 1, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>{durationWeeks} Weeks</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Schedule */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                        Schedule
                    </h3>
                    <button
                        className="btn-primary"
                        onClick={() => router.push('/workouts/new')} // Redirect to create new session
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        + Create New Workout
                    </button>
                </div>

                {/* Schedule Type Toggle */}
                <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#ccc' }}>Schedule Type</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px' }}>
                            <button
                                onClick={() => setScheduleType('weekly')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: scheduleType === 'weekly' ? 'rgba(242, 95, 41, 0.2)' : 'transparent',
                                    color: scheduleType === 'weekly' ? 'var(--primary)' : '#888',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: scheduleType === 'weekly' ? 'bold' : 'normal',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Weekly (7 Days)
                            </button>
                            <button
                                onClick={() => setScheduleType('rolling')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: scheduleType === 'rolling' ? 'rgba(242, 95, 41, 0.2)' : 'transparent',
                                    color: scheduleType === 'rolling' ? 'var(--primary)' : '#888',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: scheduleType === 'rolling' ? 'bold' : 'normal',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Rolling Cycle
                            </button>
                        </div>

                        {scheduleType === 'rolling' && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Cycle Length:</span>
                                <input
                                    type="number"
                                    min="2"
                                    max="14"
                                    value={cycleLength}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCycleLength(val);
                                    }}
                                    className="input-field"
                                    style={{ width: '60px', margin: 0, padding: '0.4rem', textAlign: 'center' }}
                                />
                                <span style={{ color: '#888', fontSize: '0.9rem' }}>days</span>
                            </div>
                        )}
                    </div>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                        {scheduleType === 'weekly'
                            ? 'Standard Monday-Sunday weekly schedule.'
                            : 'Flexible cycle that repeats independent of the calendar week (e.g. 3-day split repeating every 4 days).'}
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {schedule.map((day) => (
                        <div key={day.day_number} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(242, 95, 41, 0.1)',
                                color: 'var(--primary)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}>
                                {day.day_number}
                            </div>

                            {/* Day Label for Weekly Schedule */}
                            {scheduleType === 'weekly' && (
                                <div style={{ width: '50px', color: '#888', fontSize: '0.8rem', fontWeight: '500' }}>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day.day_number - 1]}
                                </div>
                            )}

                            <div style={{ flex: 1, position: 'relative' }}>
                                <SessionSearch
                                    availableSessions={availableSessions}
                                    onSelect={(sessionId) => handleSelectSession(day.day_number, sessionId)}
                                    placeholder="Select a workout..."
                                    initialValue={day.session_id}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Save Button */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 100
            }}>
                <button
                    onClick={handleSavePlan}
                    disabled={loading || !planName}
                    className="btn-primary"
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '1.1rem'
                    }}
                >
                    {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : <Save size={20} />}
                    {loading ? 'Saving...' : (editPlanId ? 'Update Plan' : 'Create Plan')}
                </button>
            </div>
        </div>
    );
}
