'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { Send } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import type { IntakeFormData, IntakeFormDataV2 } from '@/lib/types';
import ProgressBar from './ProgressBar';
import QuickReplyChips from './QuickReplyChips';
import TypewriterText from './TypewriterText';
import IntakePhotoUpload from './IntakePhotoUpload';
import { supabase } from '@/lib/supabase';
import { getGoalsForCoach } from '@/data/fitnessGoals';
import { LOCATION_LABELS } from '@/data/equipment';
import type { TrainingLocationType } from '@/lib/types';

interface GamifiedChatProps {
    coach: CoachPersona;
    onFormDataUpdate: (data: Partial<IntakeFormData>) => void;
    onInterviewComplete: (messages: { role: string; content: string }[]) => void;
    initialFormData?: IntakeFormDataV2;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const PHOTO_PROMPT_AFTER_MESSAGES = 4;

// Map step markers from AI response to progress step IDs
const STEP_MARKERS: Record<string, string> = {
    basic_info: 'basic_info',
    athletic_history: 'athletic_history',
    fitness_goals: 'fitness_goals',
    training_schedule: 'training_schedule',
    equipment_location: 'equipment_location',
    medical: 'medical',
    fitness_level: 'fitness_level',
    photo_upload: 'photo_upload',
};

// Determine which questions should show quick-reply chips
function getChipsForStep(step: string, coachId: string): { options: string[]; multi: boolean } | null {
    switch (step) {
        case 'athletic_history':
            return {
                options: ['Never trained', 'Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
                multi: false,
            };
        case 'fitness_goals':
            return {
                options: getGoalsForCoach(coachId).slice(0, 8),
                multi: true,
            };
        case 'equipment_location':
            return {
                options: Object.values(LOCATION_LABELS),
                multi: false,
            };
        case 'fitness_level':
            return {
                options: ['Beginner', 'Intermediate', 'Advanced'],
                multi: false,
            };
        default:
            return null;
    }
}

function stripStepMarkers(text: string): { cleaned: string; steps: string[] } {
    const steps: string[] = [];
    const cleaned = text.replace(/\[STEP:(\w+)\]/g, (_, step) => {
        if (STEP_MARKERS[step]) steps.push(STEP_MARKERS[step]);
        return '';
    });
    return { cleaned: cleaned.trim(), steps };
}

export default function GamifiedChat({
    coach,
    onFormDataUpdate,
    onInterviewComplete,
    initialFormData,
}: GamifiedChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [activeStep, setActiveStep] = useState<string | undefined>();
    const [currentChips, setCurrentChips] = useState<{ options: string[]; multi: boolean } | null>(null);
    const [chipSelection, setChipSelection] = useState<string[]>([]);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [photoUploadComplete, setPhotoUploadComplete] = useState(false);
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const [latestAssistantText, setLatestAssistantText] = useState('');
    const [isTypewriting, setIsTypewriting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const idCounter = useRef(0);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const nextId = useCallback((prefix: string) => {
        return `${prefix}-${Date.now()}-${++idCounter.current}`;
    }, []);

    // Derive pre-filled fields to skip
    const prefilledFields = useCallback((): string[] => {
        if (!initialFormData) return [];
        const filled: string[] = [];
        if (initialFormData.first_name && initialFormData.last_name && initialFormData.age) filled.push('basic_info');
        if (initialFormData.athletic_history) filled.push('athletic_history');
        if (initialFormData.fitness_goals.length > 0) filled.push('fitness_goals');
        if (initialFormData.training_days && initialFormData.session_duration_minutes) filled.push('training_schedule');
        if (initialFormData.training_location && initialFormData.equipment.length > 0) filled.push('equipment_location');
        if (initialFormData.injuries || initialFormData.medical_considerations) filled.push('medical');
        if (initialFormData.fitness_level) filled.push('fitness_level');
        return filled;
    }, [initialFormData]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showPhotoUpload, currentChips]);

    // Focus input
    useEffect(() => {
        if (!isLoading && !showPhotoUpload && !currentChips && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading, showPhotoUpload, currentChips]);

    // Extract form data
    const extractFormData = useCallback(async (allMessages: ChatMessage[]) => {
        if (allMessages.length < 2) return;
        try {
            const res = await fetch('/api/ai-coach/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: allMessages.map(m => ({ role: m.role, content: m.content })),
                    action: 'extract_form_data',
                }),
            });
            if (res.ok) {
                const formData = await res.json();
                if (!formData.error) {
                    onFormDataUpdate(formData);
                }
            }
        } catch {
            // Non-critical
        }
    }, [onFormDataUpdate]);

    // Photo upload trigger
    useEffect(() => {
        if (
            userMessageCount >= PHOTO_PROMPT_AFTER_MESSAGES &&
            !photoUploadComplete &&
            !showPhotoUpload &&
            !isLoading
        ) {
            const photoAskId = nextId('assistant-photo-ask');
            const msg: ChatMessage = {
                id: photoAskId,
                role: 'assistant',
                content: `Great info so far. Before we continue, could you upload a few physique photos -- front, back, and side views? This helps me tailor your program to your body type. If you'd rather skip this, that's totally fine.`,
            };
            setMessages(prev => [...prev, msg]);
            setShowPhotoUpload(true);
            setActiveStep('photo_upload');
        }
    }, [userMessageCount, photoUploadComplete, showPhotoUpload, isLoading, nextId]);

    // Upload photos
    const uploadPhotosToStorage = useCallback(async (files: File[]): Promise<number> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        let uploadedCount = 0;
        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('user_id', user.id);
                fd.append('caption', 'intake_photo');
                fd.append('visibility', 'private');
                const res = await fetch('/api/progress-media', { method: 'POST', body: fd });
                if (res.ok) uploadedCount++;
            } catch (err) {
                console.error('Failed to upload photo:', err);
            }
        }
        return uploadedCount;
    }, []);

    const handlePhotosSubmitted = useCallback(async (files: File[]) => {
        setIsUploadingPhotos(true);
        try {
            const uploadedCount = await uploadPhotosToStorage(files);
            const userPhotoMsg: ChatMessage = {
                id: nextId('user-photos'),
                role: 'user',
                content: `[Uploaded ${uploadedCount} physique photo${uploadedCount !== 1 ? 's' : ''}]`,
            };
            setMessages(prev => [...prev, userPhotoMsg]);
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);
            setCompletedSteps(prev => prev.includes('photo_upload') ? prev : [...prev, 'photo_upload']);

            // Add coach acknowledgement
            const ackId = nextId('assistant-photo-ack');
            setMessages(prev => [...prev, { id: ackId, role: 'assistant', content: 'Thanks for the photos -- saved them to your profile. Let\'s keep going.' }]);
        } catch (error) {
            console.error('Photo upload error:', error);
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);
            setMessages(prev => [...prev, {
                id: nextId('assistant-photo-err'),
                role: 'assistant',
                content: 'Had some trouble saving those, but no worries -- we can always add them later. Let\'s continue.',
            }]);
        } finally {
            setIsUploadingPhotos(false);
            setIsLoading(false);
        }
    }, [uploadPhotosToStorage, nextId]);

    const handlePhotoSkip = useCallback(() => {
        setShowPhotoUpload(false);
        setPhotoUploadComplete(true);
        setMessages(prev => [
            ...prev,
            { id: nextId('user-photo-skip'), role: 'user', content: 'I\'ll skip the photos for now.' },
            { id: nextId('assistant-photo-skip'), role: 'assistant', content: 'No problem at all. You can always upload photos later. Let\'s continue.' },
        ]);
    }, [nextId]);

    // Process AI response for step markers
    const processResponse = useCallback((text: string) => {
        const { cleaned, steps } = stripStepMarkers(text);
        if (steps.length > 0) {
            setCompletedSteps(prev => {
                const newSet = new Set([...prev, ...steps]);
                return Array.from(newSet);
            });
            setActiveStep(steps[steps.length - 1]);

            // Check if we should show chips for the detected step
            const lastStep = steps[steps.length - 1];
            const chips = getChipsForStep(lastStep, coach.id);
            if (chips) {
                setCurrentChips(chips);
                setChipSelection([]);
            } else {
                setCurrentChips(null);
            }
        }
        return cleaned;
    }, [coach.id]);

    // Start interview
    const startInterview = useCallback(async () => {
        if (hasStarted) return;
        setHasStarted(true);
        setIsLoading(true);

        const introMessage: ChatMessage = {
            id: nextId('user-init'),
            role: 'user',
            content: 'Hi, I just selected you as my coach. Let\'s get started with the intake interview.',
        };

        const assistantId = nextId('assistant');
        setMessages([introMessage, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const pf = prefilledFields();
            const response = await fetch('/api/ai-coach/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: introMessage.content }],
                    coachId: coach.id,
                    prefilledFields: pf.length > 0 ? pf : undefined,
                }),
            });

            if (!response.ok) throw new Error('Failed to start interview');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
                const cleaned = processResponse(fullText);
                setMessages([introMessage, { id: assistantId, role: 'assistant', content: cleaned }]);
            }

            const finalCleaned = processResponse(fullText);
            setLatestAssistantText(finalCleaned);
            setIsTypewriting(true);
        } catch (error) {
            console.error('Interview start error:', error);
            setMessages([introMessage, {
                id: assistantId,
                role: 'assistant',
                content: 'Sorry, I had trouble starting up. Please refresh and try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [hasStarted, coach.id, nextId, prefilledFields, processResponse]);

    useEffect(() => {
        startInterview();
    }, [startInterview]);

    // Send message
    const sendMessage = useCallback(async (overrideText?: string) => {
        const text = (overrideText || input).trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: nextId('user'),
            role: 'user',
            content: text,
        };

        const updatedMessages = [...messagesRef.current, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setCurrentChips(null);
        setChipSelection([]);
        setIsLoading(true);
        setUserMessageCount(prev => prev + 1);

        const assistantId = nextId('assistant');
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
            const response = await fetch('/api/ai-coach/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    coachId: coach.id,
                    prefilledFields: prefilledFields(),
                }),
            });

            if (response.status === 429) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, content: 'Rate limited. Please wait a moment and try again.' } : m
                    )
                );
                setIsLoading(false);
                return;
            }

            if (!response.ok) throw new Error('Failed to get response');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
                const cleaned = processResponse(fullText);
                setMessages(prev =>
                    prev.map(m => (m.id === assistantId ? { ...m, content: cleaned } : m))
                );
            }

            const finalCleaned = processResponse(fullText);
            setLatestAssistantText(finalCleaned);
            setIsTypewriting(true);

            const isComplete = response.headers.get('X-Interview-Complete') === 'true';
            const finalMessages = [
                ...updatedMessages,
                { id: assistantId, role: 'assistant' as const, content: finalCleaned },
            ];

            await extractFormData(finalMessages);

            if (isComplete) {
                const filteredMessages = finalMessages.filter(
                    m => !m.content.startsWith('[Uploaded') && !m.content.startsWith('I\'ll skip the photos')
                );
                onInterviewComplete(filteredMessages.map(m => ({ role: m.role, content: m.content })));
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId ? { ...m, content: 'Sorry, I encountered an error. Please try again.' } : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, coach.id, extractFormData, onInterviewComplete, nextId, prefilledFields, processResponse]);

    const handleChipSubmit = useCallback(() => {
        if (chipSelection.length === 0) return;
        sendMessage(chipSelection.join(', '));
    }, [chipSelection, sendMessage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    // Get only the last assistant message for display in the top card
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.length > 0);

    return (
        <Flex
            direction="column"
            h="100%"
            overflow="hidden"
            position="relative"
        >
            {/* Background image */}
            <Box
                position="absolute"
                inset="0"
                zIndex={0}
                style={{
                    backgroundImage: `url(${coach.chatBgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <Box
                    position="absolute"
                    inset="0"
                    bg="rgba(0, 0, 0, 0.75)"
                />
            </Box>

            {/* Progress bar */}
            <Box zIndex={1} flexShrink={0}>
                <ProgressBar completedSteps={completedSteps} activeStep={activeStep} />
            </Box>

            {/* TOP: Coach message card */}
            <Box zIndex={1} px="0.75rem" pt="0.5rem" flexShrink={0}>
                <Box
                    bg="rgba(255, 255, 255, 0.95)"
                    borderRadius="16px"
                    p="1rem"
                    boxShadow="0 4px 20px rgba(0,0,0,0.3)"
                    maxHeight="45vh"
                    overflowY="auto"
                >
                    <Flex alignItems="center" gap="0.5rem" mb="0.5rem">
                        <Box
                            w="36px"
                            h="36px"
                            borderRadius="50%"
                            overflow="hidden"
                            border="2px solid var(--neon-orange)"
                            flexShrink={0}
                            style={isLoading ? {
                                animation: 'pulse 1.5s ease-in-out infinite',
                            } : undefined}
                        >
                            <img
                                src={coach.avatarUrl}
                                alt={coach.fullName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (target.parentElement) {
                                        target.parentElement.style.background = 'linear-gradient(135deg, var(--neon-orange), #E55C00)';
                                        target.parentElement.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;font-weight:700;color:#fff">${coach.fullName.charAt(0)}</span>`;
                                    }
                                }}
                            />
                        </Box>
                        <Box>
                            <Text
                                fontWeight="700"
                                fontSize="0.85rem"
                                color="#1a1a1a"
                                lineHeight="1.2"
                            >
                                {coach.displayName}
                            </Text>
                            <Text fontSize="0.65rem" color={isLoading ? 'var(--neon-orange)' : '#888'}>
                                {isLoading ? 'Typing...' : 'AI Coach'}
                            </Text>
                        </Box>
                    </Flex>

                    {lastAssistantMsg ? (
                        <Text
                            className="coach-handwriting"
                            color="#1a1a1a"
                            whiteSpace="pre-wrap"
                        >
                            {isTypewriting ? (
                                <TypewriterText
                                    text={lastAssistantMsg.content}
                                    speed={15}
                                    onComplete={() => setIsTypewriting(false)}
                                />
                            ) : (
                                lastAssistantMsg.content
                            )}
                        </Text>
                    ) : isLoading ? (
                        <Flex gap="0.2rem" py="0.5rem">
                            <Box as="span" w="6px" h="6px" borderRadius="50%" bg="var(--neon-orange)" animation="pulse 1.4s ease-in-out infinite" />
                            <Box as="span" w="6px" h="6px" borderRadius="50%" bg="var(--neon-orange)" animation="pulse 1.4s ease-in-out 0.2s infinite" />
                            <Box as="span" w="6px" h="6px" borderRadius="50%" bg="var(--neon-orange)" animation="pulse 1.4s ease-in-out 0.4s infinite" />
                        </Flex>
                    ) : null}
                </Box>
            </Box>

            {/* MIDDLE: Spacer (background image visible) */}
            <Box flex={1} zIndex={0} />

            {/* Photo upload widget (shown between middle and bottom) */}
            {showPhotoUpload && (
                <Box zIndex={1} px="0.75rem" pb="0.5rem">
                    <Box
                        bg="rgba(255, 255, 255, 0.95)"
                        borderRadius="16px"
                        p="0.75rem"
                        boxShadow="0 4px 20px rgba(0,0,0,0.3)"
                    >
                        <IntakePhotoUpload
                            onPhotosSubmitted={handlePhotosSubmitted}
                            onSkip={handlePhotoSkip}
                            isUploading={isUploadingPhotos}
                        />
                    </Box>
                </Box>
            )}

            {/* BOTTOM: User input card */}
            <Box zIndex={1} px="0.75rem" pb="0.75rem" flexShrink={0}>
                <Box
                    bg="rgba(255, 255, 255, 0.95)"
                    borderRadius="16px"
                    p="0.75rem"
                    boxShadow="0 -4px 20px rgba(0,0,0,0.3)"
                >
                    {/* Quick-reply chips */}
                    {currentChips && !showPhotoUpload && (
                        <Box mb="0.5rem">
                            <QuickReplyChips
                                options={currentChips.options}
                                selected={chipSelection}
                                onSelect={setChipSelection}
                                multiSelect={currentChips.multi}
                                maxSelections={3}
                                onSubmit={handleChipSubmit}
                            />
                        </Box>
                    )}

                    {/* Text input */}
                    <form
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', gap: '0.5rem' }}
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={
                                showPhotoUpload
                                    ? 'Upload photos or skip to continue...'
                                    : currentChips
                                        ? 'Or type your answer...'
                                        : 'Type your answer...'
                            }
                            disabled={isLoading || showPhotoUpload || (!!currentChips && !currentChips.multi)}
                            style={{
                                flex: 1,
                                padding: '0.65rem 0.75rem',
                                fontSize: '0.9rem',
                                background: '#f5f5f5',
                                border: '1px solid #e0e0e0',
                                borderRadius: '10px',
                                color: '#1a1a1a',
                                outline: 'none',
                                opacity: (showPhotoUpload || (currentChips && !currentChips.multi)) ? 0.5 : 1,
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim() || showPhotoUpload}
                            style={{
                                padding: '0.65rem',
                                background: isLoading || !input.trim() || showPhotoUpload
                                    ? 'rgba(255, 102, 0, 0.3)'
                                    : '#FF6600',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: isLoading || !input.trim() || showPhotoUpload ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </Box>
            </Box>

            <div ref={messagesEndRef} />
        </Flex>
    );
}
