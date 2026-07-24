'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { Send } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import type { IntakeFormData, IntakeFormDataV2 } from '@/lib/types';
import ProgressBar from './ProgressBar';
import IntakePhotoUpload from './IntakePhotoUpload';
import { supabase } from '@/lib/supabase';

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

const PHOTO_PROMPT_AFTER_MESSAGES = 8;

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
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [photoUploadComplete, setPhotoUploadComplete] = useState(false);
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const idCounter = useRef(0);
    const extractionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, [messages, showPhotoUpload]);

    // Focus input
    useEffect(() => {
        if (!isLoading && !showPhotoUpload && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading, showPhotoUpload]);

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
        }
        return cleaned;
    }, []);

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

            processResponse(fullText);
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

            const isComplete = response.headers.get('X-Interview-Complete') === 'true';
            const finalMessages = [
                ...updatedMessages,
                { id: assistantId, role: 'assistant' as const, content: finalCleaned },
            ];

            // Debounce form extraction to reduce API calls (extract after 3s delay)
            if (extractionTimer.current) clearTimeout(extractionTimer.current);
            extractionTimer.current = setTimeout(() => {
                extractFormData(finalMessages);
            }, 3000);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    // Get only the last assistant message for display in the top card
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.length > 0);

    return (
        <Flex
            h="100%"
            w="100%"
            overflow="hidden"
            alignItems="center"
            justifyContent="center"
            bg="#0a0a12"
            position="relative"
        >
            {/* Portrait frame — locked to available height */}
            <Box
                position="relative"
                h="100%"
                w="100%"
                maxW="480px"
                overflow="hidden"
            >
                {/* Background image — fills frame, always visible */}
                <Box
                    position="absolute"
                    inset="0"
                    zIndex={0}
                    style={{
                        backgroundImage: `url(${coach.chatBgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top',
                    }}
                />

                {/* Content layer — absolute so it never pushes frame height */}
                <Flex
                    direction="column"
                    position="absolute"
                    inset="0"
                    zIndex={1}
                    justifyContent="space-between"
                    px="10%"
                    pt="2.5%"
                    pb="2.5%"
                >
                    {/* ─── TOP: Progress + Coach message ─── */}
                    <Box>
                        <Box mb="0.35rem">
                            <ProgressBar completedSteps={completedSteps} activeStep={activeStep} />
                        </Box>
                        <Box
                            bg="rgba(255, 255, 255, 0.88)"
                            borderRadius="14px"
                            p="0.85rem"
                            maxHeight="30vh"
                            overflowY="auto"
                            backdropFilter="blur(6px)"
                            style={{ WebkitBackdropFilter: 'blur(6px)' }}
                        >
                    <Flex alignItems="center" gap="0.5rem" mb="0.5rem">
                        <Box
                            w="32px"
                            h="32px"
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
                            <Text fontSize="0.7rem" fontWeight={isLoading ? '600' : '400'} color={isLoading ? 'var(--neon-orange)' : '#888'}>
                                {isLoading ? 'Thinking...' : 'AI Coach'}
                            </Text>
                        </Box>
                    </Flex>

                    {lastAssistantMsg ? (
                        <Text
                            className="coach-handwriting"
                            color="#1a1a1a"
                            whiteSpace="pre-wrap"
                        >
                            {lastAssistantMsg.content}
                        </Text>
                    ) : isLoading ? (
                        <Flex alignItems="center" gap="0.4rem" py="0.5rem">
                            <Text
                                className="coach-handwriting"
                                color="#1a1a1a"
                                fontSize="1rem"
                                fontWeight="600"
                            >
                                Coach is thinking
                            </Text>
                            <span className="thinking-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </Flex>
                    ) : null}
                        </Box>
                    </Box>

                    {/* ─── BOTTOM: Photo upload + Input ─── */}
                    <Box>
                        {showPhotoUpload && (
                            <Box mb="0.5rem">
                                <Box
                                    bg="rgba(255, 255, 255, 0.88)"
                                    borderRadius="14px"
                                    p="0.75rem"
                                    backdropFilter="blur(6px)"
                                    style={{ WebkitBackdropFilter: 'blur(6px)' }}
                                >
                                    <IntakePhotoUpload
                                        onPhotosSubmitted={handlePhotosSubmitted}
                                        onSkip={handlePhotoSkip}
                                        isUploading={isUploadingPhotos}
                                    />
                                </Box>
                            </Box>
                        )}

                        <Box
                            bg="rgba(255, 255, 255, 0.88)"
                            borderRadius="14px"
                            p="0.75rem"
                            backdropFilter="blur(6px)"
                            style={{ WebkitBackdropFilter: 'blur(6px)' }}
                        >
                            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder={
                                        showPhotoUpload
                                            ? 'Upload photos or skip to continue...'
                                            : 'Type your answer...'
                                    }
                                    disabled={isLoading || showPhotoUpload}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem 0.7rem',
                                        fontSize: '0.85rem',
                                        background: '#f5f5f5',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '10px',
                                        color: '#1a1a1a',
                                        outline: 'none',
                                        opacity: showPhotoUpload ? 0.5 : 1,
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim() || showPhotoUpload}
                                    style={{
                                        padding: '0.6rem',
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
                </Flex>
            </Box>
            <div ref={messagesEndRef} style={{ display: 'none' }} />
        </Flex>
    );
}
