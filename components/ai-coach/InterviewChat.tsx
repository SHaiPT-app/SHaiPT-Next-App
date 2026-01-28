'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Send, User, Bot } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import type { IntakeFormData } from '@/lib/types';
import IntakePhotoUpload from './IntakePhotoUpload';
import { supabase } from '@/lib/supabase';

const MotionFlex = motion.create(Flex);

interface InterviewChatProps {
    coach: CoachPersona;
    onFormDataUpdate: (data: Partial<IntakeFormData>) => void;
    onInterviewComplete: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

// After how many user messages should we prompt for photo upload
const PHOTO_PROMPT_AFTER_MESSAGES = 4;

export default function InterviewChat({
    coach,
    onFormDataUpdate,
    onInterviewComplete,
}: InterviewChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [photoUploadComplete, setPhotoUploadComplete] = useState(false);
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages or photo upload state change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showPhotoUpload]);

    // Focus input
    useEffect(() => {
        if (!isLoading && !showPhotoUpload && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading, showPhotoUpload]);

    // Extract form data from conversation
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
            // Non-critical -- form extraction failing shouldn't break chat
        }
    }, [onFormDataUpdate]);

    // Trigger photo upload prompt after enough conversation
    useEffect(() => {
        if (
            userMessageCount >= PHOTO_PROMPT_AFTER_MESSAGES &&
            !photoUploadComplete &&
            !showPhotoUpload &&
            !isLoading
        ) {
            // Add coach message asking for photos
            const photoAskId = `assistant-photo-ask-${Date.now()}`;
            const photoAskMessage: ChatMessage = {
                id: photoAskId,
                role: 'assistant',
                content: `Great info so far. Before we continue, I'd like to get a look at where you're starting from. Could you upload a few physique photos -- front, back, and side views? Stand with your arms out in a T-shape if possible, and wear minimal clothing so I can assess your build. This helps me tailor your program to your body type and current development. If you'd rather skip this, that's totally fine too.`,
            };
            setMessages(prev => [...prev, photoAskMessage]);
            setShowPhotoUpload(true);
        }
    }, [userMessageCount, photoUploadComplete, showPhotoUpload, isLoading]);

    // Upload photos to Supabase storage and save records
    const uploadPhotosToStorage = useCallback(async (files: File[]): Promise<number> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        let uploadedCount = 0;

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('user_id', user.id);
                formData.append('caption', 'intake_photo');
                formData.append('visibility', 'private');

                const res = await fetch('/api/progress-media', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    uploadedCount++;
                }
            } catch (err) {
                console.error('Failed to upload photo:', err);
            }
        }

        return uploadedCount;
    }, []);

    // Handle photo submission
    const handlePhotosSubmitted = useCallback(async (files: File[]) => {
        setIsUploadingPhotos(true);

        try {
            // Upload to storage
            const uploadedCount = await uploadPhotosToStorage(files);

            // Add user message about photo upload
            const userPhotoMsg: ChatMessage = {
                id: `user-photos-${Date.now()}`,
                role: 'user',
                content: `[Uploaded ${uploadedCount} physique photo${uploadedCount !== 1 ? 's' : ''}]`,
            };

            setMessages(prev => [...prev, userPhotoMsg]);
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);
            setIsLoading(true);

            // Get AI assessment
            const assistantId = `assistant-assessment-${Date.now()}`;
            setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

            try {
                const assessmentRes = await fetch('/api/ai-coach/photo-assessment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        coachId: coach.id,
                        photoCount: uploadedCount,
                    }),
                });

                const { assessment } = await assessmentRes.json();

                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, content: assessment } : m
                    )
                );
            } catch {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: 'Thanks for sharing those photos. I\'ve saved them to your profile. Let\'s continue with the interview -- we have a few more things to cover.' }
                            : m
                    )
                );
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            // Still dismiss the upload widget and continue
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);

            const errorMsg: ChatMessage = {
                id: `assistant-photo-err-${Date.now()}`,
                role: 'assistant',
                content: 'I had some trouble saving the photos, but no worries -- we can always add them later. Let\'s keep going with the interview.',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsUploadingPhotos(false);
            setIsLoading(false);
        }
    }, [coach.id, uploadPhotosToStorage]);

    // Handle photo skip
    const handlePhotoSkip = useCallback(() => {
        setShowPhotoUpload(false);
        setPhotoUploadComplete(true);

        const skipMsg: ChatMessage = {
            id: `user-photo-skip-${Date.now()}`,
            role: 'user',
            content: 'I\'ll skip the photos for now.',
        };

        const coachContinueMsg: ChatMessage = {
            id: `assistant-photo-skip-${Date.now()}`,
            role: 'assistant',
            content: 'No problem at all. You can always upload physique photos later from your profile. Let\'s continue where we left off.',
        };

        setMessages(prev => [...prev, skipMsg, coachContinueMsg]);
    }, []);

    // Start the interview automatically
    const startInterview = useCallback(async () => {
        if (hasStarted) return;
        setHasStarted(true);
        setIsLoading(true);

        const introMessage: ChatMessage = {
            id: `user-init-${Date.now()}`,
            role: 'user',
            content: 'Hi, I just selected you as my coach. Let\'s get started with the intake interview.',
        };

        const assistantId = `assistant-${Date.now()}`;
        setMessages([{ id: assistantId, role: 'assistant', content: '' }]);

        try {
            const response = await fetch('/api/ai-coach/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: introMessage.content }],
                    coachId: coach.id,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start interview');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setMessages([{ id: assistantId, role: 'assistant', content: fullText }]);
            }
        } catch (error) {
            console.error('Interview start error:', error);
            setMessages([{
                id: assistantId,
                role: 'assistant',
                content: 'Sorry, I had trouble starting up. Please refresh and try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [hasStarted, coach.id]);

    // Auto-start interview on mount
    useEffect(() => {
        startInterview();
    }, [startInterview]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        setUserMessageCount(prev => prev + 1);

        const assistantId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/ai-coach/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    coachId: coach.id,
                }),
            });

            if (response.status === 429) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: 'Rate limited. Please wait a moment and try again.' }
                            : m
                    )
                );
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, content: fullText } : m
                    )
                );
            }

            // Check if interview is complete
            const isComplete = response.headers.get('X-Interview-Complete') === 'true';

            // Build final messages for extraction
            const finalMessages = [
                ...updatedMessages,
                { id: assistantId, role: 'assistant' as const, content: fullText },
            ];

            // Extract form data after each assistant response
            extractFormData(finalMessages);

            if (isComplete) {
                onInterviewComplete();
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId
                        ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, coach.id, extractFormData, onInterviewComplete]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    return (
        <Flex direction="column" h="100%" overflow="hidden">
            {/* Chat Header */}
            <Flex
                px="1rem"
                py="0.75rem"
                borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                alignItems="center"
                gap="0.75rem"
                flexShrink={0}
            >
                <Box
                    w="40px"
                    h="40px"
                    borderRadius="50%"
                    overflow="hidden"
                    border="2px solid var(--neon-orange)"
                    flexShrink={0}
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
                                target.parentElement.style.display = 'flex';
                                target.parentElement.style.alignItems = 'center';
                                target.parentElement.style.justifyContent = 'center';
                                target.parentElement.innerHTML = `<span style="font-size:1rem;font-weight:700;color:#fff;font-family:var(--font-orbitron)">${coach.fullName.charAt(0)}</span>`;
                            }
                        }}
                    />
                </Box>
                <Box>
                    <Text
                        fontFamily="var(--font-orbitron)"
                        fontSize="0.9rem"
                        fontWeight="600"
                        color="var(--foreground)"
                        lineHeight="1.2"
                    >
                        {coach.displayName}
                    </Text>
                    <Text fontSize="0.7rem" color={isLoading ? 'var(--neon-orange)' : '#888'}>
                        {isLoading ? 'Typing...' : 'Intake Interview'}
                    </Text>
                </Box>
            </Flex>

            {/* Messages Area */}
            <Box flex={1} overflowY="auto" px="0.75rem" py="0.75rem">
                <VStack gap="0.75rem" align="stretch">
                    <AnimatePresence mode="popLayout">
                        {messages.map(message => (
                            <MotionFlex
                                key={message.id}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                gap="0.5rem"
                                alignItems="flex-start"
                            >
                                <Box
                                    w="28px"
                                    h="28px"
                                    borderRadius="50%"
                                    bg={
                                        message.role === 'user'
                                            ? 'linear-gradient(135deg, #FF6600, #E55C00)'
                                            : 'linear-gradient(135deg, rgba(255, 102, 0, 0.6), rgba(229, 92, 0, 0.4))'
                                    }
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                    fontSize="0.75rem"
                                    mt="0.15rem"
                                >
                                    {message.role === 'user' ? (
                                        <User size={14} color="#0B0B15" />
                                    ) : (
                                        <Bot size={14} color="#0B0B15" />
                                    )}
                                </Box>
                                <Box
                                    flex={1}
                                    p="0.65rem 0.75rem"
                                    borderRadius="10px"
                                    bg={
                                        message.role === 'user'
                                            ? 'rgba(255, 102, 0, 0.08)'
                                            : 'rgba(255, 255, 255, 0.04)'
                                    }
                                    border="1px solid"
                                    borderColor={
                                        message.role === 'user'
                                            ? 'rgba(255, 102, 0, 0.15)'
                                            : 'rgba(255, 255, 255, 0.06)'
                                    }
                                >
                                    <Text
                                        fontSize="0.6rem"
                                        color="gray.600"
                                        mb="0.15rem"
                                        fontWeight="600"
                                        textTransform="uppercase"
                                        letterSpacing="0.05em"
                                    >
                                        {message.role === 'user' ? 'You' : coach.nickname}
                                    </Text>
                                    <Text
                                        whiteSpace="pre-wrap"
                                        lineHeight="1.5"
                                        color="var(--foreground)"
                                        fontSize="0.85rem"
                                    >
                                        {message.content}
                                    </Text>
                                    {message.role === 'assistant' && !message.content && isLoading && (
                                        <Flex gap="0.2rem" alignItems="center" py="0.25rem">
                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out infinite" />
                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.2s infinite" />
                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--neon-orange)" display="inline-block" animation="pulse 1.4s ease-in-out 0.4s infinite" />
                                        </Flex>
                                    )}
                                </Box>
                            </MotionFlex>
                        ))}
                    </AnimatePresence>

                    {/* Photo Upload Widget */}
                    {showPhotoUpload && (
                        <IntakePhotoUpload
                            onPhotosSubmitted={handlePhotosSubmitted}
                            onSkip={handlePhotoSkip}
                            isUploading={isUploadingPhotos}
                        />
                    )}

                    <div ref={messagesEndRef} />
                </VStack>
            </Box>

            {/* Input Area */}
            <Box
                px="0.75rem"
                py="0.75rem"
                borderTop="1px solid rgba(255, 255, 255, 0.1)"
                flexShrink={0}
            >
                <form
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', gap: '0.5rem' }}
                >
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={showPhotoUpload ? 'Upload photos or skip to continue...' : 'Type your answer...'}
                        disabled={isLoading || showPhotoUpload}
                        data-testid="interview-chat-input"
                        style={{
                            flex: 1,
                            padding: '0.7rem 0.75rem',
                            fontSize: '0.9rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: 'var(--foreground)',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            opacity: showPhotoUpload ? 0.5 : 1,
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = 'var(--neon-orange)';
                        }}
                        onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim() || showPhotoUpload}
                        data-testid="interview-chat-send"
                        style={{
                            padding: '0.7rem',
                            background:
                                isLoading || !input.trim() || showPhotoUpload
                                    ? 'rgba(255, 102, 0, 0.3)'
                                    : '#FF6600',
                            color: '#0B0B15',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: isLoading || !input.trim() || showPhotoUpload ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </Box>
        </Flex>
    );
}
