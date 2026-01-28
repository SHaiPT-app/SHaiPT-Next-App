'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Text, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, X, Save } from 'lucide-react';
import { coaches } from '@/data/coaches';
import InterviewChat from '@/components/ai-coach/InterviewChat';
import IntakeForm from '@/components/ai-coach/IntakeForm';
import type { IntakeFormData } from '@/lib/types';
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

export default function CoachInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const coachId = params.coachId as string;

    const coach = coaches.find(c => c.id === coachId);

    const [formData, setFormData] = useState<IntakeFormData>({ ...EMPTY_FORM });
    const [showMobileForm, setShowMobileForm] = useState(false);
    const [isInterviewComplete, setIsInterviewComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

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
                // Only update if the AI extracted a non-empty value
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

    const handleInterviewComplete = useCallback(() => {
        setIsInterviewComplete(true);
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

            // Map intake form data to profile fields
            const profileUpdates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (formData.name) profileUpdates.full_name = formData.name;
            if (formData.height) {
                // Try to parse height to cm
                const heightCm = parseHeightToCm(formData.height);
                if (heightCm) profileUpdates.height_cm = heightCm;
            }
            if (formData.weight) {
                // Try to parse weight to kg
                const weightKg = parseWeightToKg(formData.weight);
                if (weightKg) profileUpdates.weight_kg = weightKg;
            }
            if (formData.fitness_goals) {
                profileUpdates.fitness_goals = formData.fitness_goals
                    .split(/[,;]/)
                    .map(g => g.trim())
                    .filter(Boolean);
            }

            // Save profile updates
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Save the full intake data as a coach interview record
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

            // If coach_interviews table doesn't exist yet, just save to profile
            if (interviewError && interviewError.code !== '42P01') {
                console.warn('Could not save to coach_interviews table:', interviewError.message);
            }

            setSaveStatus('saved');
        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    }, [formData, coachId, isInterviewComplete]);

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

    const filledFields = Object.values(formData).filter(v => v.trim().length > 0).length;
    const totalFields = Object.keys(formData).length;

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
                            Intake Interview
                        </Text>
                        <Text fontSize="0.7rem" color="#888">
                            {coach.displayName}
                        </Text>
                    </Box>
                </Flex>

                <Flex alignItems="center" gap="0.5rem">
                    {/* Progress indicator */}
                    <Text fontSize="0.7rem" color="#888" display={{ base: 'none', md: 'block' }}>
                        {filledFields}/{totalFields} fields
                    </Text>

                    {/* Save button */}
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

                    {/* Mobile: View Form button */}
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
                {/* LEFT: Chat (full width on mobile, 50% on desktop) */}
                <Box
                    flex={{ base: 1, md: 1 }}
                    borderRight={{ base: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                >
                    <InterviewChat
                        coach={coach}
                        onFormDataUpdate={handleFormDataUpdate}
                        onInterviewComplete={handleInterviewComplete}
                    />
                </Box>

                {/* RIGHT: Form (hidden on mobile, 50% on desktop) */}
                <Box
                    flex={1}
                    display={{ base: 'none', md: 'flex' }}
                    flexDirection="column"
                    bg="rgba(10, 10, 18, 0.5)"
                    overflow="hidden"
                >
                    <IntakeForm
                        formData={formData}
                        onFieldChange={handleFieldChange}
                    />
                </Box>
            </Flex>

            {/* Mobile Form Modal (slide-up) */}
            <AnimatePresence>
                {showMobileForm && (
                    <>
                        {/* Backdrop */}
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
                        {/* Slide-up panel */}
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
                            {/* Modal header */}
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
                                        Intake Form
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

                            {/* Form content */}
                            <Box flex={1} overflow="auto">
                                <IntakeForm
                                    formData={formData}
                                    onFieldChange={handleFieldChange}
                                />
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

    // Feet and inches: 5'10, 5'10", 5 ft 10 in
    const feetInchesMatch = trimmed.match(/(\d+)['\s]+(ft\s*)?(\d+)?/);
    if (feetInchesMatch) {
        const feet = parseInt(feetInchesMatch[1], 10);
        const inches = parseInt(feetInchesMatch[3] || '0', 10);
        return Math.round(feet * 30.48 + inches * 2.54);
    }

    // CM value: 178cm, 178 cm
    const cmMatch = trimmed.match(/(\d+\.?\d*)\s*cm/);
    if (cmMatch) {
        return parseFloat(cmMatch[1]);
    }

    // Plain number (assume cm if > 100, inches if < 100)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
        return num > 100 ? num : Math.round(num * 2.54);
    }

    return null;
}

/** Parse weight string to kg. Handles formats like "180 lbs", "82kg", "180" */
function parseWeightToKg(weight: string): number | null {
    const trimmed = weight.trim().toLowerCase();

    // LBS: 180 lbs, 180lbs, 180 pounds
    const lbsMatch = trimmed.match(/(\d+\.?\d*)\s*(lbs?|pounds?)/);
    if (lbsMatch) {
        return Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 10) / 10;
    }

    // KG: 82kg, 82 kg
    const kgMatch = trimmed.match(/(\d+\.?\d*)\s*kg/);
    if (kgMatch) {
        return parseFloat(kgMatch[1]);
    }

    // Plain number (assume lbs if > 100, kg otherwise)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
        return num > 100
            ? Math.round(num * 0.453592 * 10) / 10
            : num;
    }

    return null;
}
