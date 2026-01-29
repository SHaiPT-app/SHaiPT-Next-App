'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Text, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, X, Save, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { coaches } from '@/data/coaches';
import InterviewChat from '@/components/ai-coach/InterviewChat';
import IntakeForm from '@/components/ai-coach/IntakeForm';
import DietIntakeForm from '@/components/ai-coach/DietIntakeForm';
import DietitianChat from '@/components/ai-coach/DietitianChat';
import SplitSelection from '@/components/ai-coach/SplitSelection';
import InterviewPlanView from '@/components/ai-coach/InterviewPlanView';
import NutritionPlanView from '@/components/ai-coach/NutritionPlanView';
import type { IntakeFormData, DietIntakeFormData } from '@/lib/types';
import type { SplitOption } from '@/components/ai-coach/SplitSelection';
import type { GeneratedPlanData } from '@/app/api/ai-coach/generate-plan/route';
import type { GeneratedNutritionPlanData } from '@/app/api/ai-coach/generate-nutrition-plan/route';
import { supabase } from '@/lib/supabase';

const MotionBox = motion.create(Box);

const EMPTY_FORM: IntakeFormData = {
    name: '',
    age: '',
    height: '',
    weight: '',
    sport_history: '',
    training_duration: '',
    training_style: '',
    fitness_goals: '',
    training_days_per_week: '',
    session_duration: '',
    preferred_time: '',
    available_equipment: '',
    training_location: '',
    injuries: '',
    medical_considerations: '',
    fitness_level: '',
};

const EMPTY_DIET_FORM: DietIntakeFormData = {
    allergies: '',
    intolerances: '',
    diet_style: '',
    foods_love: '',
    foods_hate: '',
    medical_dietary_considerations: '',
    meals_per_day: '',
    cooking_preferences: '',
};

type FlowStage =
    | 'interview'
    | 'split_selection'
    | 'generating'
    | 'plan_review'
    | 'dietitian_interview'
    | 'generating_nutrition'
    | 'nutrition_review';

export default function CoachInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const coachId = params.coachId as string;

    const coach = coaches.find(c => c.id === coachId);

    const [formData, setFormData] = useState<IntakeFormData>({ ...EMPTY_FORM });
    const [dietFormData, setDietFormData] = useState<DietIntakeFormData>({ ...EMPTY_DIET_FORM });
    const [showMobileForm, setShowMobileForm] = useState(false);
    const [isInterviewComplete, setIsInterviewComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    // Plan generation flow state
    const [flowStage, setFlowStage] = useState<FlowStage>('interview');
    const [interviewMessages, setInterviewMessages] = useState<{ role: string; content: string }[]>([]);
    const [splitOptions, setSplitOptions] = useState<SplitOption[]>([]);
    const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
    const [isLoadingSplits, setIsLoadingSplits] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlanData | null>(null);
    const [planSaveStatus, setPlanSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isPlanSaving, setIsPlanSaving] = useState(false);
    const planViewRef = useRef<HTMLDivElement>(null);

    // Dietitian flow state
    const [, setDietitianMessages] = useState<{ role: string; content: string }[]>([]);
    const [generatedNutritionPlan, setGeneratedNutritionPlan] = useState<GeneratedNutritionPlanData | null>(null);
    const [nutritionPlanSaveStatus, setNutritionPlanSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isNutritionPlanSaving, setIsNutritionPlanSaving] = useState(false);
    const nutritionViewRef = useRef<HTMLDivElement>(null);

    // Ref to always have latest formData (avoids stale closure in callbacks)
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    // Auth guard: redirect to /login if no user
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Redirect if invalid coach
    useEffect(() => {
        if (!coach) {
            router.push('/coach');
        }
    }, [coach, router]);

    const handleFormDataUpdate = useCallback((data: Partial<IntakeFormData>) => {
        setFormData(prev => {
            const updated = { ...prev };
            for (const key of Object.keys(data) as (keyof IntakeFormData)[]) {
                const newVal = data[key];
                if (newVal && newVal.trim().length > 0) {
                    updated[key] = newVal;
                }
            }
            return updated;
        });
    }, []);

    const handleFieldChange = useCallback((field: keyof IntakeFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleDietFormDataUpdate = useCallback((data: Partial<DietIntakeFormData>) => {
        setDietFormData(prev => {
            const updated = { ...prev };
            for (const key of Object.keys(data) as (keyof DietIntakeFormData)[]) {
                const newVal = data[key];
                if (newVal && newVal.trim().length > 0) {
                    updated[key] = newVal;
                }
            }
            return updated;
        });
    }, []);

    const handleDietFieldChange = useCallback((field: keyof DietIntakeFormData, value: string) => {
        setDietFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleInterviewComplete = useCallback(async (messages: { role: string; content: string }[]) => {
        setIsInterviewComplete(true);
        setInterviewMessages(messages);
        setFlowStage('split_selection');
        setIsLoadingSplits(true);

        // Fetch split recommendations
        try {
            const res = await fetch('/api/ai-coach/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    intakeData: formDataRef.current,
                    action: 'recommend_splits',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setSplitOptions(data.splits || []);
                // Auto-select the recommended split
                const recommended = data.splits?.find((s: SplitOption) => s.recommended);
                if (recommended) {
                    setSelectedSplit(recommended.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch split recommendations:', error);
        } finally {
            setIsLoadingSplits(false);
        }
    }, []);

    const handleConfirmSplit = useCallback(async () => {
        if (!selectedSplit) return;

        setFlowStage('generating');

        try {
            const res = await fetch('/api/ai-coach/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: interviewMessages,
                    intakeData: formData,
                    splitType: selectedSplit,
                }),
            });

            if (!res.ok) {
                throw new Error('Plan generation failed');
            }

            const data = await res.json();
            if (data.plan) {
                setGeneratedPlan(data.plan);
                setFlowStage('plan_review');

                // Auto-save the plan
                await savePlanToSupabase(data.plan);
            }
        } catch (error) {
            console.error('Plan generation error:', error);
            // Go back to split selection on error
            setFlowStage('split_selection');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savePlanToSupabase is stable but triggers re-render loop if included
    }, [selectedSplit, interviewMessages, formData]);

    // Auto-save plan to Supabase
    const savePlanToSupabase = useCallback(async (plan: GeneratedPlanData) => {
        setIsPlanSaving(true);
        setPlanSaveStatus('saving');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPlanSaveStatus('error');
                return;
            }

            // 1. Create the training plan
            const { data: trainingPlan, error: planError } = await supabase
                .from('training_plans')
                .insert({
                    creator_id: user.id,
                    name: plan.name,
                    description: plan.description,
                    duration_weeks: plan.duration_weeks,
                    periodization_blocks: plan.periodization_blocks,
                    tags: [
                        `split:${plan.split_type}`,
                        ...(formData.fitness_goals
                            ? formData.fitness_goals.split(/[,;]/).map(g => g.trim()).filter(Boolean)
                            : []),
                    ],
                    is_template: false,
                    is_public: false,
                })
                .select()
                .single();

            if (planError) throw planError;

            // 2. Create workout sessions and link them
            const planSessions: {
                plan_id: string;
                session_id: string;
                day_number: number;
                week_number: number;
            }[] = [];

            const daysPerWeek = plan.sessions.length > 0
                ? Math.max(...plan.sessions.map(s => s.day_number))
                : plan.sessions.length || 1;

            for (const session of plan.sessions) {
                const { data: workoutSession, error: sessionError } = await supabase
                    .from('workout_sessions')
                    .insert({
                        creator_id: user.id,
                        name: session.name,
                        description: '',
                        exercises: session.exercises.map((ex, exIndex) => ({
                            exercise_id: `${ex.exercise_name
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')
                                .substring(0, 50)}_d${session.day_number}_e${exIndex}`,
                            sets: ex.sets.map(s => ({
                                reps: s.reps,
                                weight: s.weight || '',
                                rest_seconds: s.rest_seconds || 90,
                            })),
                            notes: ex.notes || '',
                        })),
                        tags: [],
                        is_template: false,
                        is_public: false,
                    })
                    .select()
                    .single();

                if (sessionError) throw sessionError;

                planSessions.push({
                    plan_id: trainingPlan.id,
                    session_id: workoutSession.id,
                    day_number: session.day_number,
                    week_number: Math.ceil(session.day_number / daysPerWeek),
                });
            }

            // 3. Bulk create plan-session links
            if (planSessions.length > 0) {
                const { error: linkError } = await supabase
                    .from('training_plan_sessions')
                    .insert(planSessions);
                if (linkError) throw linkError;
            }

            // 4. Assign the plan to the user
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + (plan.duration_weeks || 8) * 7);

            const { error: assignError } = await supabase
                .from('training_plan_assignments')
                .insert({
                    plan_id: trainingPlan.id,
                    user_id: user.id,
                    is_self_assigned: true,
                    start_date: today.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    is_active: true,
                });

            if (assignError) throw assignError;

            setPlanSaveStatus('saved');

            // Also update localStorage with the plan info
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                parsed.pinned_plan_id = trainingPlan.id;
                if (formData.fitness_goals) {
                    parsed.fitness_goals = formData.fitness_goals
                        .split(/[,;]/)
                        .map((g: string) => g.trim())
                        .filter(Boolean);
                }
                localStorage.setItem('user', JSON.stringify(parsed));
            }
        } catch (error) {
            console.error('Plan save error:', error);
            setPlanSaveStatus('error');
        } finally {
            setIsPlanSaving(false);
        }
    }, [formData]);

    // Handle plan edits -- re-save when user modifies
    const handlePlanUpdate = useCallback((updatedPlan: GeneratedPlanData) => {
        setGeneratedPlan(updatedPlan);
        // Debounced auto-save: mark as changed, actual save happens on user action
        setPlanSaveStatus('idle');
    }, []);

    // Scroll to plan view when it appears
    useEffect(() => {
        if (flowStage === 'plan_review' && planViewRef.current) {
            setTimeout(() => {
                planViewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [flowStage]);

    // Scroll to nutrition view when it appears
    useEffect(() => {
        if (flowStage === 'nutrition_review' && nutritionViewRef.current) {
            setTimeout(() => {
                nutritionViewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [flowStage]);

    // Transition to dietitian interview after plan is saved
    const handleStartDietitianInterview = useCallback(() => {
        setFlowStage('dietitian_interview');
    }, []);

    // Handle dietitian interview completion
    const handleDietitianInterviewComplete = useCallback(async (messages: { role: string; content: string }[]) => {
        setDietitianMessages(messages);
        setFlowStage('generating_nutrition');

        try {
            const res = await fetch('/api/ai-coach/generate-nutrition-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    dietIntakeData: dietFormData,
                    intakeData: formData,
                }),
            });

            if (!res.ok) {
                throw new Error('Nutrition plan generation failed');
            }

            const data = await res.json();
            if (data.plan) {
                setGeneratedNutritionPlan(data.plan);
                setFlowStage('nutrition_review');

                // Auto-save the nutrition plan
                await saveNutritionPlanToSupabase(data.plan);
            }
        } catch (error) {
            console.error('Nutrition plan generation error:', error);
            // Go back to dietitian interview on error
            setFlowStage('dietitian_interview');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dietFormData, formData]);

    // Auto-save nutrition plan to Supabase
    const saveNutritionPlanToSupabase = useCallback(async (plan: GeneratedNutritionPlanData) => {
        setIsNutritionPlanSaving(true);
        setNutritionPlanSaveStatus('saving');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setNutritionPlanSaveStatus('error');
                return;
            }

            const { error } = await supabase
                .from('nutrition_plans')
                .insert({
                    user_id: user.id,
                    name: plan.name,
                    dietary_preferences: plan.dietary_preferences,
                    plan_overview: plan.plan_overview,
                    daily_schedule: plan.daily_schedule,
                    shopping_list: plan.shopping_list,
                    nutrition_tips: plan.nutrition_tips,
                });

            if (error) throw error;

            setNutritionPlanSaveStatus('saved');
        } catch (error) {
            console.error('Nutrition plan save error:', error);
            setNutritionPlanSaveStatus('error');
        } finally {
            setIsNutritionPlanSaving(false);
        }
    }, []);

    // Handle nutrition plan edits
    const handleNutritionPlanUpdate = useCallback((updatedPlan: GeneratedNutritionPlanData) => {
        setGeneratedNutritionPlan(updatedPlan);
        setNutritionPlanSaveStatus('idle');
    }, []);

    const handleSaveProfile = useCallback(async () => {
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSaveStatus('error');
                return;
            }

            const profileUpdates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (formData.name) profileUpdates.full_name = formData.name;
            if (formData.height) {
                const heightCm = parseHeightToCm(formData.height);
                if (heightCm) profileUpdates.height_cm = heightCm;
            }
            if (formData.weight) {
                const weightKg = parseWeightToKg(formData.weight);
                if (weightKg) profileUpdates.weight_kg = weightKg;
            }
            if (formData.fitness_goals) {
                profileUpdates.fitness_goals = formData.fitness_goals
                    .split(/[,;]/)
                    .map(g => g.trim())
                    .filter(Boolean);
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            const { error: interviewError } = await supabase
                .from('coach_interviews')
                .upsert({
                    user_id: user.id,
                    coach_id: coachId,
                    intake_data: formData,
                    is_complete: isInterviewComplete,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,coach_id',
                });

            if (interviewError && interviewError.code !== '42P01') {
                console.warn('Could not save to coach_interviews table:', interviewError.message);
            }

            // Also re-save the plan if it was edited
            if (generatedPlan && planSaveStatus === 'idle') {
                try {
                    await savePlanToSupabase(generatedPlan);
                } catch (planSaveError) {
                    console.error('Plan re-save error:', planSaveError);
                    setSaveStatus('error');
                    return;
                }
            }

            // Also re-save nutrition plan if edited
            if (generatedNutritionPlan && nutritionPlanSaveStatus === 'idle') {
                try {
                    await saveNutritionPlanToSupabase(generatedNutritionPlan);
                } catch (nutritionSaveError) {
                    console.error('Nutrition plan re-save error:', nutritionSaveError);
                    setSaveStatus('error');
                    return;
                }
            }

            setSaveStatus('saved');
        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    }, [formData, coachId, isInterviewComplete, generatedPlan, planSaveStatus, savePlanToSupabase, generatedNutritionPlan, nutritionPlanSaveStatus, saveNutritionPlanToSupabase]);

    if (!coach) {
        return (
            <Box
                minH="100vh"
                bg="var(--background)"
                display="flex"
                alignItems="center"
                justifyContent="center"
            >
                <Text color="#888">Loading...</Text>
            </Box>
        );
    }

    // Determine which form to show based on flow stage
    const isDietitianPhase = flowStage === 'dietitian_interview' || flowStage === 'generating_nutrition' || flowStage === 'nutrition_review';
    const filledFields = isDietitianPhase
        ? Object.values(dietFormData).filter(v => v.trim().length > 0).length
        : Object.values(formData).filter(v => v.trim().length > 0).length;
    const totalFields = isDietitianPhase
        ? Object.keys(dietFormData).length
        : Object.keys(formData).length;

    // Determine header title
    const getHeaderTitle = () => {
        switch (flowStage) {
            case 'plan_review':
                return 'Your Training Plan';
            case 'dietitian_interview':
                return 'Nutrition Interview';
            case 'generating_nutrition':
                return 'Generating Nutrition Plan';
            case 'nutrition_review':
                return 'Your Nutrition Plan';
            default:
                return 'Intake Interview';
        }
    };

    return (
        <Box
            minH="100vh"
            bg="var(--background)"
            color="var(--foreground)"
            display="flex"
            flexDirection="column"
        >
            {/* Top Bar */}
            <Flex
                px={{ base: '0.75rem', md: '1.5rem' }}
                py="0.75rem"
                borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                alignItems="center"
                justifyContent="space-between"
                bg="rgba(15, 15, 25, 0.95)"
                backdropFilter="blur(16px)"
                flexShrink={0}
                style={{ WebkitBackdropFilter: 'blur(16px)' }}
                zIndex={10}
            >
                <Flex alignItems="center" gap="0.75rem">
                    <button
                        onClick={() => router.push('/coach')}
                        data-testid="back-to-coaches"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                        }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Box>
                        <Text
                            fontFamily="var(--font-orbitron)"
                            fontSize="0.85rem"
                            fontWeight="600"
                            color="var(--neon-orange)"
                        >
                            {getHeaderTitle()}
                        </Text>
                        <Text fontSize="0.7rem" color="#888">
                            {isDietitianPhase ? "Dr. Nadia 'The Fuel'" : coach.displayName}
                        </Text>
                    </Box>
                </Flex>

                <Flex alignItems="center" gap="0.5rem">
                    <Text fontSize="0.7rem" color="#888" display={{ base: 'none', md: 'block' }}>
                        {filledFields}/{totalFields} fields
                    </Text>

                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        data-testid="save-intake"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            background: saveStatus === 'saved'
                                ? 'rgba(0, 200, 100, 0.2)'
                                : 'rgba(255, 102, 0, 0.15)',
                            border: saveStatus === 'saved'
                                ? '1px solid rgba(0, 200, 100, 0.4)'
                                : '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: '8px',
                            color: saveStatus === 'saved' ? '#00C864' : 'var(--neon-orange)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.6 : 1,
                        }}
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                    </button>

                    <button
                        onClick={() => setShowMobileForm(true)}
                        data-testid="view-form-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255, 102, 0, 0.1)',
                            border: '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--neon-orange)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                        className="mobile-form-btn"
                    >
                        <FileText size={14} />
                        <span>View Form</span>
                        {filledFields > 0 && (
                            <span
                                style={{
                                    background: 'var(--neon-orange)',
                                    color: '#0B0B15',
                                    borderRadius: '10px',
                                    padding: '0 0.35rem',
                                    fontSize: '0.65rem',
                                    fontWeight: '700',
                                    lineHeight: '1.5',
                                }}
                            >
                                {filledFields}
                            </span>
                        )}
                    </button>
                </Flex>
            </Flex>

            {/* Main Content: Split Screen */}
            <Flex flex={1} overflow="hidden">
                {/* LEFT: Chat + Plan Flow (full width on mobile, 50% on desktop) */}
                <Box
                    flex={{ base: 1, md: 1 }}
                    borderRight={{ base: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                >
                    <Box flex={1} overflow="auto">
                        {/* Training interview chat (always rendered to preserve state) */}
                        {!isDietitianPhase && (
                            <InterviewChat
                                coach={coach}
                                onFormDataUpdate={handleFormDataUpdate}
                                onInterviewComplete={handleInterviewComplete}
                            />
                        )}

                        {/* Split Selection (appears after interview completes) */}
                        {(flowStage === 'split_selection' || flowStage === 'generating') && (
                            <SplitSelection
                                splits={splitOptions}
                                selectedSplit={selectedSplit}
                                onSelectSplit={setSelectedSplit}
                                onConfirm={handleConfirmSplit}
                                isLoading={isLoadingSplits || flowStage === 'generating'}
                            />
                        )}

                        {/* Generating Indicator */}
                        {flowStage === 'generating' && (
                            <Box
                                p="1rem"
                                data-testid="plan-generating"
                            >
                                <Box
                                    p="1.25rem"
                                    borderRadius="12px"
                                    bg="rgba(255, 102, 0, 0.05)"
                                    border="1px solid rgba(255, 102, 0, 0.2)"
                                    textAlign="center"
                                >
                                    <Flex
                                        gap="0.3rem"
                                        alignItems="center"
                                        justifyContent="center"
                                        mb="0.75rem"
                                    >
                                        <Box
                                            as="span"
                                            w="8px"
                                            h="8px"
                                            borderRadius="50%"
                                            bg="var(--neon-orange)"
                                            display="inline-block"
                                            animation="pulse 1.4s ease-in-out infinite"
                                        />
                                        <Box
                                            as="span"
                                            w="8px"
                                            h="8px"
                                            borderRadius="50%"
                                            bg="var(--neon-orange)"
                                            display="inline-block"
                                            animation="pulse 1.4s ease-in-out 0.2s infinite"
                                        />
                                        <Box
                                            as="span"
                                            w="8px"
                                            h="8px"
                                            borderRadius="50%"
                                            bg="var(--neon-orange)"
                                            display="inline-block"
                                            animation="pulse 1.4s ease-in-out 0.4s infinite"
                                        />
                                    </Flex>
                                    <Flex alignItems="center" justifyContent="center" gap="0.5rem" mb="0.25rem">
                                        <Dumbbell size={16} color="#FF6600" />
                                        <Text
                                            color="var(--neon-orange)"
                                            fontFamily="var(--font-orbitron)"
                                            fontSize="0.85rem"
                                            fontWeight="600"
                                        >
                                            Building Your Plan
                                        </Text>
                                    </Flex>
                                    <Text color="#888" fontSize="0.75rem">
                                        Generating a personalized periodized program based on your profile
                                    </Text>
                                </Box>
                            </Box>
                        )}

                        {/* Plan Review */}
                        {flowStage === 'plan_review' && generatedPlan && (
                            <Box p="0.75rem" ref={planViewRef}>
                                <InterviewPlanView
                                    plan={generatedPlan}
                                    onPlanUpdate={handlePlanUpdate}
                                    isSaving={isPlanSaving}
                                    saveStatus={planSaveStatus}
                                />

                                {/* Continue to dietitian interview */}
                                <Box mt="0.75rem" mb="1rem">
                                    <button
                                        onClick={handleStartDietitianInterview}
                                        disabled={planSaveStatus !== 'saved'}
                                        data-testid="start-dietitian-btn"
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            background: planSaveStatus !== 'saved' ? 'rgba(255, 102, 0, 0.3)' : '#FF6600',
                                            color: '#0B0B15',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            fontFamily: 'var(--font-orbitron)',
                                            cursor: planSaveStatus !== 'saved' ? 'not-allowed' : 'pointer',
                                            transition: 'opacity 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            opacity: planSaveStatus !== 'saved' ? 0.6 : 1,
                                        }}
                                    >
                                        <UtensilsCrossed size={18} />
                                        {planSaveStatus === 'saving' ? 'Saving Plan...' : planSaveStatus === 'error' ? 'Plan Save Failed' : 'Continue to Nutrition Plan'}
                                    </button>
                                </Box>
                            </Box>
                        )}

                        {/* Dietitian Interview Chat */}
                        {isDietitianPhase && (
                            <DietitianChat
                                coach={coach}
                                onFormDataUpdate={handleDietFormDataUpdate}
                                onInterviewComplete={handleDietitianInterviewComplete}
                                previousMessages={interviewMessages}
                            />
                        )}

                        {/* Generating Nutrition Plan Indicator */}
                        {flowStage === 'generating_nutrition' && (
                            <Box
                                p="1rem"
                                data-testid="nutrition-generating"
                            >
                                <Box
                                    p="1.25rem"
                                    borderRadius="12px"
                                    bg="rgba(255, 102, 0, 0.05)"
                                    border="1px solid rgba(255, 102, 0, 0.2)"
                                    textAlign="center"
                                >
                                    <Flex
                                        gap="0.3rem"
                                        alignItems="center"
                                        justifyContent="center"
                                        mb="0.75rem"
                                    >
                                        <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out infinite" />
                                        <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.2s infinite" />
                                        <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.4s infinite" />
                                    </Flex>
                                    <Flex alignItems="center" justifyContent="center" gap="0.5rem" mb="0.25rem">
                                        <UtensilsCrossed size={16} color="#FF6600" />
                                        <Text
                                            color="var(--neon-orange)"
                                            fontFamily="var(--font-orbitron)"
                                            fontSize="0.85rem"
                                            fontWeight="600"
                                        >
                                            Building Your Meal Plan
                                        </Text>
                                    </Flex>
                                    <Text color="#888" fontSize="0.75rem">
                                        Dr. Nadia is creating a personalized nutrition plan with meals, macros, and recipes
                                    </Text>
                                </Box>
                            </Box>
                        )}

                        {/* Nutrition Plan Review */}
                        {flowStage === 'nutrition_review' && generatedNutritionPlan && (
                            <Box p="0.75rem" ref={nutritionViewRef}>
                                <NutritionPlanView
                                    plan={generatedNutritionPlan}
                                    onPlanUpdate={handleNutritionPlanUpdate}
                                    isSaving={isNutritionPlanSaving}
                                    saveStatus={nutritionPlanSaveStatus}
                                />

                                {/* View all plans button */}
                                <Box mt="0.75rem" mb="1rem">
                                    <button
                                        onClick={() => router.push('/plans')}
                                        data-testid="view-plans-btn"
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            background: '#FF6600',
                                            color: '#0B0B15',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            fontFamily: 'var(--font-orbitron)',
                                            cursor: 'pointer',
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        View All Plans
                                    </button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* RIGHT: Form (hidden on mobile, 50% on desktop) */}
                <Box
                    flex={1}
                    display={{ base: 'none', md: 'flex' }}
                    flexDirection="column"
                    bg="rgba(10, 10, 18, 0.5)"
                    overflow="hidden"
                >
                    {isDietitianPhase ? (
                        <DietIntakeForm
                            formData={dietFormData}
                            onFieldChange={handleDietFieldChange}
                        />
                    ) : (
                        <IntakeForm
                            formData={formData}
                            onFieldChange={handleFieldChange}
                        />
                    )}
                </Box>
            </Flex>

            {/* Mobile Form Modal (slide-up) */}
            <AnimatePresence>
                {showMobileForm && (
                    <>
                        <MotionBox
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            position="fixed"
                            inset="0"
                            bg="rgba(0, 0, 0, 0.6)"
                            zIndex={50}
                            onClick={() => setShowMobileForm(false)}
                        />
                        <MotionBox
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            position="fixed"
                            bottom="0"
                            left="0"
                            right="0"
                            height="85vh"
                            bg="rgba(15, 15, 25, 0.98)"
                            borderTop="1px solid rgba(255, 102, 0, 0.3)"
                            borderTopRadius="20px"
                            zIndex={51}
                            display="flex"
                            flexDirection="column"
                            overflow="hidden"
                            data-testid="mobile-form-modal"
                        >
                            <Flex
                                px="1rem"
                                py="0.75rem"
                                borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                                alignItems="center"
                                justifyContent="space-between"
                                flexShrink={0}
                            >
                                <Flex alignItems="center" gap="0.5rem">
                                    <FileText size={16} color="#FF6600" />
                                    <Text
                                        fontFamily="var(--font-orbitron)"
                                        fontSize="0.9rem"
                                        fontWeight="600"
                                        color="var(--neon-orange)"
                                    >
                                        {isDietitianPhase ? 'Nutrition Form' : 'Intake Form'}
                                    </Text>
                                    <Text fontSize="0.7rem" color="#888">
                                        {filledFields}/{totalFields}
                                    </Text>
                                </Flex>
                                <button
                                    onClick={() => setShowMobileForm(false)}
                                    data-testid="close-mobile-form"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </Flex>
                            <Box flex={1} overflow="auto">
                                {isDietitianPhase ? (
                                    <DietIntakeForm
                                        formData={dietFormData}
                                        onFieldChange={handleDietFieldChange}
                                    />
                                ) : (
                                    <IntakeForm
                                        formData={formData}
                                        onFieldChange={handleFieldChange}
                                    />
                                )}
                            </Box>
                        </MotionBox>
                    </>
                )}
            </AnimatePresence>

            {/* CSS for mobile-only View Form button */}
            <style>{`
                @media (min-width: 768px) {
                    .mobile-form-btn {
                        display: none !important;
                    }
                }
            `}</style>
        </Box>
    );
}

/** Parse height string to cm. Handles formats like "5'10", "5'10\"", "178cm", "178" */
function parseHeightToCm(height: string): number | null {
    const trimmed = height.trim().toLowerCase();

    const feetInchesMatch = trimmed.match(/(\d+)['\s]+(ft\s*)?(\d+)?/);
    if (feetInchesMatch) {
        const feet = parseInt(feetInchesMatch[1], 10);
        const inches = parseInt(feetInchesMatch[3] || '0', 10);
        return Math.round(feet * 30.48 + inches * 2.54);
    }

    const cmMatch = trimmed.match(/(\d+\.?\d*)\s*cm/);
    if (cmMatch) {
        return parseFloat(cmMatch[1]);
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
        return num > 100 ? num : Math.round(num * 2.54);
    }

    return null;
}

/** Parse weight string to kg. Handles formats like "180 lbs", "82kg", "180" */
function parseWeightToKg(weight: string): number | null {
    const trimmed = weight.trim().toLowerCase();

    const lbsMatch = trimmed.match(/(\d+\.?\d*)\s*(lbs?|pounds?)/);
    if (lbsMatch) {
        return Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 10) / 10;
    }

    const kgMatch = trimmed.match(/(\d+\.?\d*)\s*kg/);
    if (kgMatch) {
        return parseFloat(kgMatch[1]);
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
        return num > 100
            ? Math.round(num * 0.453592 * 10) / 10
            : num;
    }

    return null;
}
