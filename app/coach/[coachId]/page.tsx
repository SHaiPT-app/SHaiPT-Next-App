'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Text, Flex } from '@chakra-ui/react';
import { ArrowLeft, Save, Dumbbell, UtensilsCrossed, MessageCircle, ClipboardList, ShieldCheck } from 'lucide-react';
import { coaches } from '@/data/coaches';
import GamifiedChat from '@/components/ai-coach/GamifiedChat';
import IntakeFormV2 from '@/components/ai-coach/IntakeFormV2';
import DietIntakeForm from '@/components/ai-coach/DietIntakeForm';
import DietitianChat from '@/components/ai-coach/DietitianChat';
import SplitSelection from '@/components/ai-coach/SplitSelection';
import InterviewPlanView from '@/components/ai-coach/InterviewPlanView';
import NutritionPlanView from '@/components/ai-coach/NutritionPlanView';
import SegmentedControl from '@/components/ai-coach/SegmentedControl';
import type { IntakeFormData, IntakeFormDataV2, DietIntakeFormData } from '@/lib/types';
import { EMPTY_INTAKE_FORM_V2, intakeV2toV1, intakeV1toV2 } from '@/lib/types';
import type { SplitOption } from '@/components/ai-coach/SplitSelection';
import type { GeneratedPlanData } from '@/app/api/ai-coach/generate-plan/route';
import type { GeneratedNutritionPlanData } from '@/app/api/ai-coach/generate-nutrition-plan/route';
import { supabase } from '@/lib/supabase';

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
    | 'waiver'
    | 'interview'
    | 'split_selection'
    | 'generating'
    | 'plan_review'
    | 'dietitian_interview'
    | 'generating_nutrition'
    | 'nutrition_review';

const INTERVIEW_TABS = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={14} /> },
    { id: 'form', label: 'Form', icon: <ClipboardList size={14} /> },
];

export default function CoachInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const coachId = params.coachId as string;

    const coach = coaches.find(c => c.id === coachId);

    // V1 form data (for API compatibility)
    const [formData, setFormData] = useState<IntakeFormData>({ ...EMPTY_FORM });
    // V2 structured form data
    const [formDataV2, setFormDataV2] = useState<IntakeFormDataV2>({ ...EMPTY_INTAKE_FORM_V2 });
    const [dietFormData, setDietFormData] = useState<DietIntakeFormData>({ ...EMPTY_DIET_FORM });
    const [isInterviewComplete, setIsInterviewComplete] = useState(false);
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    // Tab state
    const [activeTab, setActiveTab] = useState('chat');

    // Waiver state
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [waiverLoading, setWaiverLoading] = useState(true);

    // Plan generation flow state
    const [flowStage, setFlowStage] = useState<FlowStage>('waiver');
    const [interviewMessages, setInterviewMessages] = useState<{ role: string; content: string }[]>([]);
    const [splitOptions, setSplitOptions] = useState<SplitOption[]>([]);
    const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
    const [isLoadingSplits, setIsLoadingSplits] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlanData | null>(null);
    const [planSaveStatus, setPlanSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [planSaveError, setPlanSaveError] = useState<string | null>(null);
    const [isPlanSaving, setIsPlanSaving] = useState(false);
    const planViewRef = useRef<HTMLDivElement>(null);

    // Existing plans state
    const [existingPlans, setExistingPlans] = useState<{ id: string; name: string }[]>([]);
    const [showExistingPlansBanner, setShowExistingPlansBanner] = useState(false);

    // Dietitian flow state
    const [, setDietitianMessages] = useState<{ role: string; content: string }[]>([]);
    const [generatedNutritionPlan, setGeneratedNutritionPlan] = useState<GeneratedNutritionPlanData | null>(null);
    const [nutritionPlanSaveStatus, setNutritionPlanSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isNutritionPlanSaving, setIsNutritionPlanSaving] = useState(false);
    const nutritionViewRef = useRef<HTMLDivElement>(null);

    // Ref to always have latest formData
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    // Auth guard
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check if terms already accepted
    useEffect(() => {
        async function checkWaiver() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setWaiverLoading(false);
                    return;
                }
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('terms_accepted_at')
                    .eq('id', user.id)
                    .single();

                if (profile?.terms_accepted_at) {
                    setWaiverAccepted(true);
                    setFlowStage('interview');
                }
            } catch {
                // No profile or column doesn't exist yet — show waiver
            } finally {
                setWaiverLoading(false);
            }
        }
        checkWaiver();
    }, []);

    // Redirect if invalid coach
    useEffect(() => {
        if (!coach) {
            router.push('/coach');
        }
    }, [coach, router]);

    // Load previous interview data on mount
    useEffect(() => {
        async function loadPreviousData() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: interview } = await supabase
                    .from('coach_interviews')
                    .select('intake_data, is_complete')
                    .eq('user_id', user.id)
                    .eq('coach_id', coachId)
                    .single();

                if (interview?.intake_data) {
                    const v1Data = interview.intake_data as IntakeFormData;
                    setFormData(v1Data);
                    setFormDataV2(intakeV1toV2(v1Data));
                    if (interview.is_complete) {
                        setIsInterviewComplete(true);
                    }
                }
            } catch {
                // No previous data, that's fine
            }
        }
        loadPreviousData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coachId]);

    // Check for existing training plans on mount
    useEffect(() => {
        async function checkExistingPlans() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: plans } = await supabase
                    .from('training_plans')
                    .select('id, name')
                    .eq('creator_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (plans && plans.length > 0) {
                    setExistingPlans(plans);
                    setShowExistingPlansBanner(true);
                }
            } catch {
                // Non-critical — don't block the interview
            }
        }
        checkExistingPlans();
    }, []);

    // Waiver acceptance handler
    const handleAcceptWaiver = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date().toISOString();
            await supabase
                .from('profiles')
                .update({ terms_accepted_at: now })
                .eq('id', user.id);

            setWaiverAccepted(true);
            setFlowStage('interview');
        } catch (error) {
            console.error('Failed to save waiver acceptance:', error);
            // Still proceed — the waiver was shown and accepted in-session
            setWaiverAccepted(true);
            setFlowStage('interview');
        }
    }, []);

    // V1 update handler (from chat extraction)
    const handleFormDataUpdate = useCallback((data: Partial<IntakeFormData>) => {
        setFormData(prev => {
            const updated = { ...prev };
            for (const key of Object.keys(data) as (keyof IntakeFormData)[]) {
                const newVal = data[key];
                if (newVal && newVal.trim().length > 0) {
                    updated[key] = newVal;
                }
            }
            // Sync V2
            setFormDataV2(intakeV1toV2(updated));
            return updated;
        });
    }, []);

    // V2 update handler (from form)
    const handleFormV2Change = useCallback((data: Partial<IntakeFormDataV2>) => {
        if (isFormSubmitted) return;
        setFormDataV2(prev => {
            const updated = { ...prev, ...data };
            // Sync V1
            setFormData(intakeV2toV1(updated));
            return updated;
        });
    }, [isFormSubmitted]);

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
        setIsFormSubmitted(true);
        setInterviewMessages(messages);

        // Auto-switch to Form tab so user can review pre-filled data
        setActiveTab('form');

        setFlowStage('split_selection');
        setIsLoadingSplits(true);

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
                await savePlanToSupabase(data.plan);
            }
        } catch (error) {
            console.error('Plan generation error:', error);
            setFlowStage('split_selection');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSplit, interviewMessages, formData]);

    const savePlanToSupabase = useCallback(async (plan: GeneratedPlanData) => {
        setIsPlanSaving(true);
        setPlanSaveStatus('saving');
        setPlanSaveError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPlanSaveStatus('error');
                setPlanSaveError('Not authenticated. Please log in and try again.');
                return;
            }

            // Step 1: Insert training plan (try with periodization_blocks, fall back without)
            const basePlanData: Record<string, unknown> = {
                creator_id: user.id,
                name: plan.name,
                description: plan.description || '',
                duration_weeks: plan.duration_weeks,
                tags: [
                    `split:${plan.split_type}`,
                    ...(formData.fitness_goals
                        ? formData.fitness_goals.split(/[,;]/).map(g => g.trim()).filter(Boolean)
                        : []),
                ],
                is_template: false,
                is_public: false,
            };

            let trainingPlan: { id: string } | null = null;

            // Try with periodization_blocks first
            if (plan.periodization_blocks) {
                const { data, error } = await supabase
                    .from('training_plans')
                    .insert({ ...basePlanData, periodization_blocks: plan.periodization_blocks })
                    .select('id')
                    .single();

                if (error) {
                    // If column doesn't exist, retry without it
                    if (error.message?.includes('periodization_blocks') || error.code === '42703') {
                        console.warn('periodization_blocks column not found, retrying without it');
                        const { data: fallbackData, error: fallbackError } = await supabase
                            .from('training_plans')
                            .insert(basePlanData)
                            .select('id')
                            .single();
                        if (fallbackError) {
                            console.error('Training plan insert error (fallback):', fallbackError.code, fallbackError.message, fallbackError.details, fallbackError.hint);
                            throw new Error(`Training plan save failed: ${fallbackError.message}`);
                        }
                        trainingPlan = fallbackData;
                    } else {
                        console.error('Training plan insert error:', error.code, error.message, error.details, error.hint);
                        throw new Error(`Training plan save failed: ${error.message}`);
                    }
                } else {
                    trainingPlan = data;
                }
            } else {
                const { data, error } = await supabase
                    .from('training_plans')
                    .insert(basePlanData)
                    .select('id')
                    .single();
                if (error) {
                    console.error('Training plan insert error:', error.code, error.message, error.details, error.hint);
                    throw new Error(`Training plan save failed: ${error.message}`);
                }
                trainingPlan = data;
            }

            if (!trainingPlan?.id) {
                throw new Error('Training plan was created but no ID was returned');
            }

            // Step 2: Insert workout sessions
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
                            exercise_name: ex.exercise_name,
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
                    .select('id')
                    .single();

                if (sessionError) {
                    console.error(`Workout session "${session.name}" insert error:`, sessionError.code, sessionError.message, sessionError.details);
                    throw new Error(`Failed to save workout "${session.name}": ${sessionError.message}`);
                }

                if (!workoutSession?.id) {
                    throw new Error(`Workout session "${session.name}" was created but no ID returned`);
                }

                planSessions.push({
                    plan_id: trainingPlan.id,
                    session_id: workoutSession.id,
                    day_number: session.day_number,
                    week_number: Math.ceil(session.day_number / daysPerWeek),
                });
            }

            // Step 3: Link sessions to plan
            if (planSessions.length > 0) {
                const { error: linkError } = await supabase
                    .from('training_plan_sessions')
                    .insert(planSessions);
                if (linkError) {
                    console.error('Plan sessions link error:', linkError.code, linkError.message, linkError.details);
                    throw new Error(`Failed to link sessions to plan: ${linkError.message}`);
                }
            }

            // Step 4: Create plan assignment
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + (plan.duration_weeks || 8) * 7);

            const { error: assignError } = await supabase
                .from('training_plan_assignments')
                .insert({
                    plan_id: trainingPlan.id,
                    user_id: user.id,
                    assigned_by_id: user.id,
                    is_self_assigned: true,
                    start_date: today.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    is_active: true,
                });

            if (assignError) {
                console.error('Plan assignment error:', assignError.code, assignError.message, assignError.details);
                throw new Error(`Failed to assign plan: ${assignError.message}`);
            }

            setPlanSaveStatus('saved');

            try {
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
            } catch {
                // localStorage is non-critical
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error saving plan';
            console.error('Plan save error:', msg, error);
            setPlanSaveStatus('error');
            setPlanSaveError(msg);
        } finally {
            setIsPlanSaving(false);
        }
    }, [formData]);

    const handlePlanUpdate = useCallback((updatedPlan: GeneratedPlanData) => {
        setGeneratedPlan(updatedPlan);
        setPlanSaveStatus('idle');
    }, []);

    useEffect(() => {
        if (flowStage === 'plan_review' && planViewRef.current) {
            setTimeout(() => {
                planViewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [flowStage]);

    useEffect(() => {
        if (flowStage === 'nutrition_review' && nutritionViewRef.current) {
            setTimeout(() => {
                nutritionViewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [flowStage]);

    const handleStartDietitianInterview = useCallback(() => {
        setFlowStage('dietitian_interview');
    }, []);

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
                await saveNutritionPlanToSupabase(data.plan);
            }
        } catch (error) {
            console.error('Nutrition plan generation error:', error);
            setFlowStage('dietitian_interview');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dietFormData, formData]);

    const saveNutritionPlanToSupabase = useCallback(async (plan: GeneratedNutritionPlanData) => {
        setIsNutritionPlanSaving(true);
        setNutritionPlanSaveStatus('saving');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('Nutrition plan save: no authenticated user');
                setNutritionPlanSaveStatus('error');
                return;
            }

            const { data: savedPlan, error } = await supabase
                .from('nutrition_plans')
                .insert({
                    user_id: user.id,
                    name: plan.name,
                    dietary_preferences: plan.dietary_preferences,
                    plan_overview: plan.plan_overview,
                    daily_schedule: plan.daily_schedule,
                    shopping_list: plan.shopping_list,
                    nutrition_tips: plan.nutrition_tips,
                })
                .select()
                .single();

            if (error) {
                console.error('Nutrition plan Supabase error:', error.code, error.message, error.details, error.hint);
                throw error;
            }

            console.log('Nutrition plan saved:', savedPlan?.id);
            setNutritionPlanSaveStatus('saved');
        } catch (error) {
            console.error('Nutrition plan save error:', error);
            setNutritionPlanSaveStatus('error');
        } finally {
            setIsNutritionPlanSaving(false);
        }
    }, []);

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

            if (generatedPlan && planSaveStatus === 'idle') {
                try {
                    await savePlanToSupabase(generatedPlan);
                } catch (planSaveError) {
                    console.error('Plan re-save error:', planSaveError);
                    setSaveStatus('error');
                    return;
                }
            }

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

    // Handle form submit (from Form tab)
    const handleFormSubmit = useCallback(() => {
        setIsFormSubmitted(true);
        setIsInterviewComplete(true);
        // Trigger the same flow as interview completion
        const pseudoMessages = [
            { role: 'user', content: `My name is ${formData.name}. I'm ${formData.age} years old, ${formData.height} tall, ${formData.weight}. I've been training for ${formData.training_duration}. My goals are ${formData.fitness_goals}. I train ${formData.training_days_per_week} days per week for ${formData.session_duration}. Equipment: ${formData.available_equipment}. Location: ${formData.training_location}. Injuries: ${formData.injuries || 'None'}. Medical: ${formData.medical_considerations || 'None'}. Fitness level: ${formData.fitness_level}.` },
        ];
        handleInterviewComplete(pseudoMessages);
    }, [formData, handleInterviewComplete]);

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

    const isDietitianPhase = flowStage === 'dietitian_interview' || flowStage === 'generating_nutrition' || flowStage === 'nutrition_review';
    const filledFields = Object.values(formData).filter(v => v.trim().length > 0).length;
    const totalFields = Object.keys(formData).length;

    const getHeaderTitle = () => {
        switch (flowStage) {
            case 'waiver':
                return 'Health Disclaimer';
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

    // Whether we should show the tabbed interview UI
    const showInterviewTabs = flowStage === 'interview' && !isDietitianPhase && waiverAccepted;

    return (
        <Box
            h="100dvh"
            maxH="100dvh"
            bg="var(--background)"
            color="var(--foreground)"
            display="flex"
            flexDirection="column"
            overflow="hidden"
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
                </Flex>
            </Flex>

            {/* Existing Plans Banner */}
            {showExistingPlansBanner && existingPlans.length > 0 && flowStage === 'interview' && (
                <Box
                    px="1rem"
                    py="0.6rem"
                    flexShrink={0}
                    bg="rgba(255, 102, 0, 0.08)"
                    borderBottom="1px solid rgba(255, 102, 0, 0.2)"
                >
                    <Flex alignItems="center" justifyContent="space-between" gap="0.5rem">
                        <Flex alignItems="center" gap="0.5rem" flex={1} minW={0}>
                            <Dumbbell size={16} color="#FF6600" style={{ flexShrink: 0 }} />
                            <Text fontSize="0.8rem" color="#ccc" truncate>
                                You have <Text as="span" color="var(--neon-orange)" fontWeight="600">{existingPlans.length} saved plan{existingPlans.length > 1 ? 's' : ''}</Text>
                            </Text>
                        </Flex>
                        <Flex gap="0.4rem" flexShrink={0}>
                            <button
                                onClick={() => router.push('/plans')}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    background: '#FF6600',
                                    color: '#0B0B15',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                }}
                            >
                                View Plans
                            </button>
                            <button
                                onClick={() => setShowExistingPlansBanner(false)}
                                style={{
                                    padding: '0.35rem 0.5rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#888',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Dismiss
                            </button>
                        </Flex>
                    </Flex>
                </Box>
            )}

            {/* Segmented Control (only during interview phase) */}
            {showInterviewTabs && (
                <Box px="1rem" py="0.5rem" flexShrink={0} bg="rgba(15, 15, 25, 0.8)">
                    <SegmentedControl
                        tabs={INTERVIEW_TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        disabled={isFormSubmitted}
                    />
                </Box>
            )}

            {/* Main Content */}
            <Box flex={1} overflow="hidden" display="flex" flexDirection="column">
                {/* Waiver Screen */}
                {flowStage === 'waiver' && !waiverLoading && (
                    <Box
                        flex={1}
                        overflow="auto"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        px="1rem"
                        py="2rem"
                    >
                        <Box
                            maxW="600px"
                            w="100%"
                            p="2rem"
                            borderRadius="16px"
                            bg="rgba(21, 21, 31, 0.8)"
                            border="1px solid rgba(255, 255, 255, 0.1)"
                            backdropFilter="blur(16px)"
                            style={{ WebkitBackdropFilter: 'blur(16px)' }}
                        >
                            <Flex alignItems="center" gap="0.75rem" mb="1.5rem">
                                <Box
                                    p="0.5rem"
                                    borderRadius="10px"
                                    bg="rgba(255, 102, 0, 0.15)"
                                    border="1px solid rgba(255, 102, 0, 0.3)"
                                >
                                    <ShieldCheck size={24} color="#FF6600" />
                                </Box>
                                <Text
                                    fontFamily="var(--font-orbitron)"
                                    fontSize="1.1rem"
                                    fontWeight="700"
                                    color="#fff"
                                >
                                    Health Disclaimer & Liability Waiver
                                </Text>
                            </Flex>

                            <Box
                                p="1.25rem"
                                borderRadius="12px"
                                bg="rgba(255, 255, 255, 0.03)"
                                border="1px solid rgba(255, 255, 255, 0.06)"
                                mb="1.5rem"
                                maxH="350px"
                                overflowY="auto"
                            >
                                <Text fontSize="0.85rem" color="rgba(255,255,255,0.75)" lineHeight="1.7" mb="1rem">
                                    SHaiPT uses artificial intelligence to generate personalized fitness training programs and
                                    nutrition guidance. By proceeding, you acknowledge and agree to the following:
                                </Text>

                                <Box as="ul" pl="1.25rem" mb="1rem">
                                    <Box as="li" mb="0.5rem">
                                        <Text fontSize="0.85rem" color="rgba(255,255,255,0.7)" lineHeight="1.6">
                                            <Text as="span" fontWeight="700" color="rgba(255,255,255,0.9)">Not medical advice.</Text>{' '}
                                            All content generated by SHaiPT, including workout plans, nutrition plans, and AI coach
                                            responses, is for general informational and fitness purposes only. It is not a substitute
                                            for professional medical advice, diagnosis, or treatment.
                                        </Text>
                                    </Box>
                                    <Box as="li" mb="0.5rem">
                                        <Text fontSize="0.85rem" color="rgba(255,255,255,0.7)" lineHeight="1.6">
                                            <Text as="span" fontWeight="700" color="rgba(255,255,255,0.9)">Consult your doctor.</Text>{' '}
                                            You should consult a qualified healthcare provider before starting any new exercise or
                                            nutrition program, especially if you have pre-existing medical conditions, injuries, or
                                            health concerns.
                                        </Text>
                                    </Box>
                                    <Box as="li" mb="0.5rem">
                                        <Text fontSize="0.85rem" color="rgba(255,255,255,0.7)" lineHeight="1.6">
                                            <Text as="span" fontWeight="700" color="rgba(255,255,255,0.9)">Exercise at your own risk.</Text>{' '}
                                            Physical exercise carries inherent risks of injury. You assume full responsibility for
                                            any injuries or health issues that may arise from following AI-generated fitness
                                            recommendations.
                                        </Text>
                                    </Box>
                                    <Box as="li" mb="0.5rem">
                                        <Text fontSize="0.85rem" color="rgba(255,255,255,0.7)" lineHeight="1.6">
                                            <Text as="span" fontWeight="700" color="rgba(255,255,255,0.9)">AI limitations.</Text>{' '}
                                            The AI coach and AI dietitian are not licensed professionals. Their guidance is based on
                                            general fitness and nutrition principles and may not account for your unique medical
                                            circumstances.
                                        </Text>
                                    </Box>
                                    <Box as="li">
                                        <Text fontSize="0.85rem" color="rgba(255,255,255,0.7)" lineHeight="1.6">
                                            <Text as="span" fontWeight="700" color="rgba(255,255,255,0.9)">Form analysis disclaimer.</Text>{' '}
                                            The computer vision form checker is for guidance only. Always prioritize safe form and
                                            physical comfort over AI feedback.
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    marginBottom: '1.5rem',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    background: waiverAccepted ? 'rgba(255, 102, 0, 0.08)' : 'transparent',
                                    border: waiverAccepted ? '1px solid rgba(255, 102, 0, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={waiverAccepted}
                                    onChange={(e) => setWaiverAccepted(e.target.checked)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        marginTop: '2px',
                                        accentColor: '#FF6600',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                    }}
                                />
                                <Text fontSize="0.85rem" color="rgba(255,255,255,0.85)" lineHeight="1.6">
                                    I understand that SHaiPT provides AI-generated fitness and nutrition advice, not medical
                                    advice. I accept responsibility for my health decisions and will consult a healthcare
                                    professional for medical concerns.
                                </Text>
                            </label>

                            <button
                                onClick={handleAcceptWaiver}
                                disabled={!waiverAccepted}
                                data-testid="accept-waiver-btn"
                                style={{
                                    width: '100%',
                                    padding: '0.85rem',
                                    background: waiverAccepted ? '#FF6600' : 'rgba(255, 102, 0, 0.3)',
                                    color: waiverAccepted ? '#0B0B15' : 'rgba(255, 255, 255, 0.4)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    fontFamily: 'var(--font-orbitron)',
                                    cursor: waiverAccepted ? 'pointer' : 'not-allowed',
                                    opacity: waiverAccepted ? 1 : 0.6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Accept & Continue to Interview
                            </button>
                        </Box>
                    </Box>
                )}

                {/* Interview phase: tabbed Chat/Form */}
                {showInterviewTabs && (
                    <Box flex={1} overflow="hidden" display={flowStage === 'interview' ? 'flex' : 'none'} flexDirection="column">
                        {/* Chat Tab */}
                        <Box
                            flex={1}
                            overflow="hidden"
                            display={activeTab === 'chat' ? 'flex' : 'none'}
                            flexDirection="column"
                        >
                            <GamifiedChat
                                coach={coach}
                                onFormDataUpdate={handleFormDataUpdate}
                                onInterviewComplete={handleInterviewComplete}
                                initialFormData={formDataV2}
                            />
                        </Box>

                        {/* Form Tab */}
                        <Box
                            flex={1}
                            overflow="hidden"
                            display={activeTab === 'form' ? 'flex' : 'none'}
                            flexDirection="column"
                        >
                            <IntakeFormV2
                                formData={formDataV2}
                                onChange={handleFormV2Change}
                                coachId={coachId}
                                readOnly={isFormSubmitted}
                            />
                            {/* Submit button on form tab */}
                            {!isFormSubmitted && (
                                <Box px="1rem" py="0.75rem" flexShrink={0} borderTop="1px solid rgba(255,255,255,0.1)">
                                    <button
                                        onClick={handleFormSubmit}
                                        disabled={!formDataV2.first_name || !formDataV2.fitness_level}
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            background: (!formDataV2.first_name || !formDataV2.fitness_level)
                                                ? 'rgba(255, 102, 0, 0.3)'
                                                : '#FF6600',
                                            color: '#0B0B15',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            fontFamily: 'var(--font-orbitron)',
                                            cursor: (!formDataV2.first_name || !formDataV2.fitness_level)
                                                ? 'not-allowed'
                                                : 'pointer',
                                            opacity: (!formDataV2.first_name || !formDataV2.fitness_level) ? 0.6 : 1,
                                        }}
                                    >
                                        Submit & Generate Plan
                                    </button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Post-interview stages (split selection, plan view, dietitian, etc.) */}
                <Box flex={1} overflow="auto" display={showInterviewTabs && flowStage === 'interview' ? 'none' : 'block'}>
                    {/* Read-only form view after submission (shown above downstream stages) */}
                    {isFormSubmitted && flowStage !== 'interview' && !isDietitianPhase && (
                        <Box display={flowStage === 'split_selection' || flowStage === 'generating' ? 'none' : 'block'}>
                            {/* Form is now embedded read-only in the flow */}
                        </Box>
                    )}

                    {/* Split Selection */}
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
                        <Box p="1rem" data-testid="plan-generating">
                            <Box
                                p="1.25rem"
                                borderRadius="12px"
                                bg="rgba(255, 102, 0, 0.05)"
                                border="1px solid rgba(255, 102, 0, 0.2)"
                                textAlign="center"
                            >
                                <Flex gap="0.3rem" alignItems="center" justifyContent="center" mb="0.75rem">
                                    <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out infinite" />
                                    <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.2s infinite" />
                                    <Box as="span" w="8px" h="8px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.4s infinite" />
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
                            <Box mt="0.75rem" mb="1rem">
                                <button
                                    onClick={planSaveStatus === 'error' && generatedPlan ? () => savePlanToSupabase(generatedPlan) : handleStartDietitianInterview}
                                    disabled={planSaveStatus === 'saving'}
                                    data-testid="start-dietitian-btn"
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem',
                                        background: planSaveStatus === 'saving' ? 'rgba(255, 102, 0, 0.3)' : planSaveStatus === 'error' ? '#cc3300' : '#FF6600',
                                        color: planSaveStatus === 'error' ? '#fff' : '#0B0B15',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        fontFamily: 'var(--font-orbitron)',
                                        cursor: planSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
                                        transition: 'opacity 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        opacity: planSaveStatus === 'saving' ? 0.6 : 1,
                                    }}
                                >
                                    <UtensilsCrossed size={18} />
                                    {planSaveStatus === 'saving' ? 'Saving Plan...' : planSaveStatus === 'error' ? 'Retry Save' : 'Continue to Nutrition Plan'}
                                </button>
                                {planSaveStatus === 'error' && planSaveError && (
                                    <Text fontSize="0.75rem" color="#ff4444" mt="0.5rem" textAlign="center">
                                        {planSaveError}
                                    </Text>
                                )}
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
                        <Box p="1rem" data-testid="nutrition-generating">
                            <Box
                                p="1.25rem"
                                borderRadius="12px"
                                bg="rgba(255, 102, 0, 0.05)"
                                border="1px solid rgba(255, 102, 0, 0.2)"
                                textAlign="center"
                            >
                                <Flex gap="0.3rem" alignItems="center" justifyContent="center" mb="0.75rem">
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
        </Box>
    );
}

/** Parse height string to cm */
function parseHeightToCm(height: string): number | null {
    const trimmed = height.trim().toLowerCase();
    const feetInchesMatch = trimmed.match(/(\d+)['\s]+(ft\s*)?(\d+)?/);
    if (feetInchesMatch) {
        const feet = parseInt(feetInchesMatch[1], 10);
        const inches = parseInt(feetInchesMatch[3] || '0', 10);
        return Math.round(feet * 30.48 + inches * 2.54);
    }
    const cmMatch = trimmed.match(/(\d+\.?\d*)\s*cm/);
    if (cmMatch) return parseFloat(cmMatch[1]);
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num > 100 ? num : Math.round(num * 2.54);
    return null;
}

/** Parse weight string to kg */
function parseWeightToKg(weight: string): number | null {
    const trimmed = weight.trim().toLowerCase();
    const lbsMatch = trimmed.match(/(\d+\.?\d*)\s*(lbs?|pounds?)/);
    if (lbsMatch) return Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 10) / 10;
    const kgMatch = trimmed.match(/(\d+\.?\d*)\s*kg/);
    if (kgMatch) return parseFloat(kgMatch[1]);
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num > 100 ? Math.round(num * 0.453592 * 10) / 10 : num;
    return null;
}
