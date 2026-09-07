'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { apiFetch, errorMessage } from '@/lib/apiClient';

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
    // message from a failed generate call (a 429 carries the daily/monthly AI limit)
    const [generationError, setGenerationError] = useState<string | null>(null);
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
                } else {
                    // No data for this coach — fall back to most recent completed interview from any coach
                    const { data: anyInterview } = await supabase
                        .from('coach_interviews')
                        .select('intake_data')
                        .eq('user_id', user.id)
                        .eq('is_complete', true)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (anyInterview?.intake_data) {
                        const v1Data = anyInterview.intake_data as IntakeFormData;
                        setFormData(v1Data);
                        setFormDataV2(intakeV1toV2(v1Data));
                        // Don't set isInterviewComplete — new coach still runs its interview
                        // but prefilledFields will tell AI to skip already-answered topics
                    }
                }
            } catch {
                // No previous data, that's fine
            }
        }
        loadPreviousData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coachId]);

    // Check for existing training plans on mount (via assignments for reliable RLS)
    useEffect(() => {
        async function checkExistingPlans() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Query via training_plan_assignments (reliable RLS path)
                const { data: assignments } = await supabase
                    .from('training_plan_assignments')
                    .select('plan_id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (assignments && assignments.length > 0) {
                    const uniquePlanIds = [...new Set(assignments.map(a => a.plan_id))];
                    const planResults = await Promise.all(
                        uniquePlanIds.map(async (id) => {
                            const { data } = await supabase
                                .from('training_plans')
                                .select('id, name')
                                .eq('id', id)
                                .single();
                            return data;
                        })
                    );
                    const validPlans = planResults.filter((p): p is { id: string; name: string } => p !== null);
                    if (validPlans.length > 0) {
                        setExistingPlans(validPlans);
                        setShowExistingPlansBanner(true);
                    }
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
        setGenerationError(null);

        try {
            const data = await apiFetch<{ splits?: SplitOption[] }>('/api/ai-coach/generate-plan', {
                method: 'POST',
                body: {
                    messages,
                    intakeData: formDataRef.current,
                    action: 'recommend_splits',
                },
            });
            setSplitOptions(data.splits || []);
            const recommended = data.splits?.find((s: SplitOption) => s.recommended);
            if (recommended) {
                setSelectedSplit(recommended.id);
            }
        } catch (error) {
            console.error('Failed to fetch split recommendations:', error);
            setGenerationError(errorMessage(error, 'Could not load split recommendations.'));
        } finally {
            setIsLoadingSplits(false);
        }
    }, []);

    const handleConfirmSplit = useCallback(async () => {
        if (!selectedSplit) return;

        setFlowStage('generating');
        setGenerationError(null);

        try {
            const data = await apiFetch<{ plan?: GeneratedPlanData }>('/api/ai-coach/generate-plan', {
                method: 'POST',
                body: {
                    messages: interviewMessages,
                    intakeData: formData,
                    splitType: selectedSplit,
                },
            });
            if (data.plan) {
                setGeneratedPlan(data.plan);
                setFlowStage('plan_review');
                await savePlanToSupabase(data.plan);
            } else {
                throw new Error('Plan generation failed');
            }
        } catch (error) {
            console.error('Plan generation error:', error);
            setGenerationError(errorMessage(error, 'Plan generation failed'));
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
                            // library id when the model picked one; else the name-derived id used before
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
        setGenerationError(null);

        try {
            const data = await apiFetch<{ plan?: GeneratedNutritionPlanData }>('/api/ai-coach/generate-nutrition-plan', {
                method: 'POST',
                body: {
                    messages,
                    dietIntakeData: dietFormData,
                    intakeData: formData,
                },
            });
            if (data.plan) {
                setGeneratedNutritionPlan(data.plan);
                setFlowStage('nutrition_review');
                await saveNutritionPlanToSupabase(data.plan);
            } else {
                throw new Error('Nutrition plan generation failed');
            }
        } catch (error) {
            console.error('Nutrition plan generation error:', error);
            setGenerationError(errorMessage(error, 'Nutrition plan generation failed'));
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
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-ink-mid">Loading...</p>
            </div>
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
        <div className="flex h-dvh max-h-dvh flex-col overflow-hidden text-ink-hi">
            {/* Top Bar */}
            <div className="z-10 flex shrink-0 items-center justify-between border-b border-[var(--line-soft)] bg-[rgba(15,15,25,0.95)] px-3 py-3 backdrop-blur-[16px] md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/coach')}
                        data-testid="back-to-coaches"
                        className="icon-btn !h-9 !w-9 shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <p className="font-display text-[0.85rem] font-semibold text-brand">
                            {getHeaderTitle()}
                        </p>
                        <p className="text-[0.7rem] text-ink-low">
                            {isDietitianPhase ? "Dr. Nadia 'The Fuel'" : coach.displayName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <p className="hidden text-[0.7rem] text-ink-low md:block">
                        {filledFields}/{totalFields} fields
                    </p>

                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        data-testid="save-intake"
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[0.8rem] font-semibold transition-colors ${
                            saveStatus === 'saved'
                                ? 'border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]'
                                : 'border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                        } ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Existing Plans Banner */}
            {showExistingPlansBanner && existingPlans.length > 0 && flowStage === 'interview' && (
                <div className="shrink-0 border-b border-brand/30 bg-[var(--brand-glow-soft)] px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Dumbbell size={16} className="shrink-0 text-brand" />
                            <p className="truncate text-[0.8rem] text-ink-mid">
                                You have <span className="font-semibold text-brand">{existingPlans.length} saved plan{existingPlans.length > 1 ? 's' : ''}</span>
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                            <button
                                onClick={() => router.push('/plans')}
                                className="btn-brand !px-3 !py-1.5 !text-[0.75rem]"
                            >
                                View Plans
                            </button>
                            <button
                                onClick={() => setShowExistingPlansBanner(false)}
                                className="btn-outline !px-2.5 !py-1.5 !text-[0.75rem]"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Segmented Control (only during interview phase) */}
            {showInterviewTabs && (
                <div className="shrink-0 bg-[rgba(15,15,25,0.8)] px-4 py-2">
                    <SegmentedControl
                        tabs={INTERVIEW_TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        disabled={isFormSubmitted}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Waiver Screen */}
                {flowStage === 'waiver' && !waiverLoading && (
                    <div className="flex flex-1 flex-col items-center overflow-auto px-4 py-8">
                        <div className="glass-card w-full max-w-[600px] p-8">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="rounded-[10px] border border-brand/30 bg-[var(--brand-glow-soft)] p-2">
                                    <ShieldCheck size={24} className="text-brand" />
                                </div>
                                <p className="font-display text-[1.1rem] font-bold text-ink-hi">
                                    Health Disclaimer & Liability Waiver
                                </p>
                            </div>

                            <div className="mb-6 max-h-[350px] overflow-y-auto rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-5">
                                <p className="mb-4 text-[0.85rem] leading-[1.7] text-ink-mid">
                                    SHaiPT uses artificial intelligence to generate personalized fitness training programs and
                                    nutrition guidance. By proceeding, you acknowledge and agree to the following:
                                </p>

                                <ul className="mb-4 list-disc pl-5">
                                    <li className="mb-2">
                                        <p className="text-[0.85rem] leading-[1.6] text-ink-mid">
                                            <span className="font-bold text-ink-hi">Not medical advice.</span>{' '}
                                            All content generated by SHaiPT, including workout plans, nutrition plans, and AI coach
                                            responses, is for general informational and fitness purposes only. It is not a substitute
                                            for professional medical advice, diagnosis, or treatment.
                                        </p>
                                    </li>
                                    <li className="mb-2">
                                        <p className="text-[0.85rem] leading-[1.6] text-ink-mid">
                                            <span className="font-bold text-ink-hi">Consult your doctor.</span>{' '}
                                            You should consult a qualified healthcare provider before starting any new exercise or
                                            nutrition program, especially if you have pre-existing medical conditions, injuries, or
                                            health concerns.
                                        </p>
                                    </li>
                                    <li className="mb-2">
                                        <p className="text-[0.85rem] leading-[1.6] text-ink-mid">
                                            <span className="font-bold text-ink-hi">Exercise at your own risk.</span>{' '}
                                            Physical exercise carries inherent risks of injury. You assume full responsibility for
                                            any injuries or health issues that may arise from following AI-generated fitness
                                            recommendations.
                                        </p>
                                    </li>
                                    <li className="mb-2">
                                        <p className="text-[0.85rem] leading-[1.6] text-ink-mid">
                                            <span className="font-bold text-ink-hi">AI limitations.</span>{' '}
                                            The AI coach and AI dietitian are not licensed professionals. Their guidance is based on
                                            general fitness and nutrition principles and may not account for your unique medical
                                            circumstances.
                                        </p>
                                    </li>
                                    <li>
                                        <p className="text-[0.85rem] leading-[1.6] text-ink-mid">
                                            <span className="font-bold text-ink-hi">Form analysis disclaimer.</span>{' '}
                                            The computer vision form checker is for guidance only. Always prioritize safe form and
                                            physical comfort over AI feedback.
                                        </p>
                                    </li>
                                </ul>
                            </div>

                            <label
                                className={`mb-6 flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-all ${
                                    waiverAccepted
                                        ? 'border-brand/30 bg-[var(--brand-glow-soft)]'
                                        : 'border-[var(--line-soft)] bg-transparent'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={waiverAccepted}
                                    onChange={(e) => setWaiverAccepted(e.target.checked)}
                                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand"
                                />
                                <p className="text-[0.85rem] leading-[1.6] text-ink-hi">
                                    I understand that SHaiPT provides AI-generated fitness and nutrition advice, not medical
                                    advice. I accept responsibility for my health decisions and will consult a healthcare
                                    professional for medical concerns.
                                </p>
                            </label>

                            <button
                                onClick={handleAcceptWaiver}
                                disabled={!waiverAccepted}
                                data-testid="accept-waiver-btn"
                                className="btn-brand font-display w-full !py-3.5 !text-[0.9rem]"
                            >
                                Accept & Continue to Interview
                            </button>
                        </div>
                    </div>
                )}

                {/* Interview phase: tabbed Chat/Form */}
                {showInterviewTabs && (
                    <div className={`flex-1 flex-col overflow-hidden ${flowStage === 'interview' ? 'flex' : 'hidden'}`}>
                        {/* Chat Tab */}
                        <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
                            <GamifiedChat
                                coach={coach}
                                onFormDataUpdate={handleFormDataUpdate}
                                onInterviewComplete={handleInterviewComplete}
                                initialFormData={formDataV2}
                            />
                        </div>

                        {/* Form Tab */}
                        <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'form' ? 'flex' : 'hidden'}`}>
                            <IntakeFormV2
                                formData={formDataV2}
                                onChange={handleFormV2Change}
                                coachId={coachId}
                                readOnly={isFormSubmitted}
                            />
                            {/* Submit button on form tab */}
                            {!isFormSubmitted && (
                                <div className="shrink-0 border-t border-[var(--line-soft)] px-4 py-3">
                                    <button
                                        onClick={handleFormSubmit}
                                        disabled={!formDataV2.first_name || !formDataV2.fitness_level}
                                        className="btn-brand font-display w-full !py-3.5 !text-[0.9rem]"
                                    >
                                        Submit & Generate Plan
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Post-interview stages (split selection, plan view, dietitian, etc.) */}
                <div className={`flex-1 overflow-auto ${showInterviewTabs && flowStage === 'interview' ? 'hidden' : 'block'}`}>
                    {/* Read-only form view after submission (shown above downstream stages) */}
                    {isFormSubmitted && flowStage !== 'interview' && !isDietitianPhase && (
                        <div className={flowStage === 'split_selection' || flowStage === 'generating' ? 'hidden' : 'block'}>
                            {/* Form is now embedded read-only in the flow */}
                        </div>
                    )}

                    {/* Generation error (e.g. the AI limit message from a 429) */}
                    {generationError && (flowStage === 'split_selection' || flowStage === 'dietitian_interview') && (
                        <p className="px-4 pt-3 text-center text-[0.8rem] text-[var(--error)]" data-testid="generation-error">
                            {generationError}
                        </p>
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
                        <div className="p-4" data-testid="plan-generating">
                            <div className="rounded-xl border border-brand/30 bg-[var(--brand-glow-soft)] p-5 text-center">
                                <div className="mb-3 flex items-center justify-center gap-1">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-duration:1.4s]" />
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:0.2s] [animation-duration:1.4s]" />
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:0.4s] [animation-duration:1.4s]" />
                                </div>
                                <div className="mb-1 flex items-center justify-center gap-2">
                                    <Dumbbell size={16} className="text-brand" />
                                    <p className="font-display text-[0.85rem] font-semibold text-brand">
                                        Building Your Plan
                                    </p>
                                </div>
                                <p className="text-[0.75rem] text-ink-mid">
                                    Generating a personalized periodized program based on your profile
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Plan Review */}
                    {flowStage === 'plan_review' && generatedPlan && (
                        <div className="p-3" ref={planViewRef}>
                            <InterviewPlanView
                                plan={generatedPlan}
                                onPlanUpdate={handlePlanUpdate}
                                isSaving={isPlanSaving}
                                saveStatus={planSaveStatus}
                            />
                            <div className="mb-4 mt-3">
                                <button
                                    onClick={planSaveStatus === 'error' && generatedPlan ? () => savePlanToSupabase(generatedPlan) : handleStartDietitianInterview}
                                    disabled={planSaveStatus === 'saving'}
                                    data-testid="start-dietitian-btn"
                                    className={`font-display flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none py-3.5 text-[0.9rem] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
                                        planSaveStatus === 'saving'
                                            ? 'bg-brand/40'
                                            : planSaveStatus === 'error'
                                                ? 'bg-[var(--error)]'
                                                : 'bg-[image:var(--brand-gradient)] shadow-[0_4px_24px_var(--brand-glow)]'
                                    }`}
                                >
                                    <UtensilsCrossed size={18} />
                                    {planSaveStatus === 'saving' ? 'Saving Plan...' : planSaveStatus === 'error' ? 'Retry Save' : 'Continue to Nutrition Plan'}
                                </button>
                                {planSaveStatus === 'error' && planSaveError && (
                                    <p className="mt-2 text-center text-[0.75rem] text-[var(--error)]">
                                        {planSaveError}
                                    </p>
                                )}
                            </div>
                        </div>
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
                        <div className="p-4" data-testid="nutrition-generating">
                            <div className="rounded-xl border border-brand/30 bg-[var(--brand-glow-soft)] p-5 text-center">
                                <div className="mb-3 flex items-center justify-center gap-1">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-duration:1.4s]" />
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:0.2s] [animation-duration:1.4s]" />
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:0.4s] [animation-duration:1.4s]" />
                                </div>
                                <div className="mb-1 flex items-center justify-center gap-2">
                                    <UtensilsCrossed size={16} className="text-brand" />
                                    <p className="font-display text-[0.85rem] font-semibold text-brand">
                                        Building Your Meal Plan
                                    </p>
                                </div>
                                <p className="text-[0.75rem] text-ink-mid">
                                    Dr. Nadia is creating a personalized nutrition plan with meals, macros, and recipes
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Nutrition Plan Review */}
                    {flowStage === 'nutrition_review' && generatedNutritionPlan && (
                        <div className="p-3" ref={nutritionViewRef}>
                            <NutritionPlanView
                                plan={generatedNutritionPlan}
                                onPlanUpdate={handleNutritionPlanUpdate}
                                isSaving={isNutritionPlanSaving}
                                saveStatus={nutritionPlanSaveStatus}
                            />
                            <div className="mb-4 mt-3">
                                <button
                                    onClick={() => router.push('/plans')}
                                    data-testid="view-plans-btn"
                                    className="btn-brand font-display w-full !py-3.5 !text-[0.9rem]"
                                >
                                    View All Plans
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
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
