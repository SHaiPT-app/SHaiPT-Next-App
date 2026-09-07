'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Send, User, Bot } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import type { IntakeFormData } from '@/lib/types';
import IntakePhotoUpload from './IntakePhotoUpload';
import { apiFetch, apiFetchRaw, ApiError, errorMessage } from '@/lib/apiClient';

interface InterviewChatProps {
    coach: CoachPersona;
    onFormDataUpdate: (data: Partial<IntakeFormData>) => void;
    onInterviewComplete: (messages: { role: string; content: string }[]) => void;
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
    const messagesRef = useRef<ChatMessage[]>([]);
    const idCounter = useRef(0);

    // Keep messagesRef in sync with messages state
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Unique ID generator to avoid Date.now() collisions
    const nextId = useCallback((prefix: string) => {
        return `${prefix}-${Date.now()}-${++idCounter.current}`;
    }, []);

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
            const formData = await apiFetch<Partial<IntakeFormData> & { error?: string }>('/api/ai-coach/interview', {
                method: 'POST',
                body: {
                    messages: allMessages.map(m => ({ role: m.role, content: m.content })),
                    action: 'extract_form_data',
                },
            });
            if (formData && !formData.error) {
                onFormDataUpdate(formData);
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
            const photoAskId = nextId('assistant-photo-ask');
            const photoAskMessage: ChatMessage = {
                id: photoAskId,
                role: 'assistant',
                content: `Great info so far. Before we continue, I'd like to get a look at where you're starting from. Could you upload a few physique photos -- front, back, and side views? Stand with your arms out in a T-shape if possible, and wear minimal clothing so I can assess your build. This helps me tailor your program to your body type and current development. If you'd rather skip this, that's totally fine too.`,
            };
            setMessages(prev => [...prev, photoAskMessage]);
            setShowPhotoUpload(true);
        }
    }, [userMessageCount, photoUploadComplete, showPhotoUpload, isLoading]);

    // Upload photos to the progress gallery (the route files them under the caller)
    const uploadPhotosToStorage = useCallback(async (files: File[]): Promise<number> => {
        let uploadedCount = 0;

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('caption', 'intake_photo');
                formData.append('visibility', 'private');

                await apiFetchRaw('/api/progress-media', {
                    method: 'POST',
                    body: formData,
                });
                uploadedCount++;
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
                id: nextId('user-photos'),
                role: 'user',
                content: `[Uploaded ${uploadedCount} physique photo${uploadedCount !== 1 ? 's' : ''}]`,
            };

            setMessages(prev => [...prev, userPhotoMsg]);
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);

            // No AI assessment of the photos: they are only saved to the progress gallery
            setMessages(prev => [...prev, {
                id: nextId('assistant-photo-saved'),
                role: 'assistant',
                content: uploadedCount > 0
                    ? 'Photos saved to your progress gallery. Let\'s continue with the interview -- we have a few more things to cover.'
                    : 'I couldn\'t save those photos, but no worries -- you can add them later from your progress gallery. Let\'s keep going.',
            }]);
        } catch (error) {
            console.error('Photo upload error:', error);
            // Still dismiss the upload widget and continue
            setShowPhotoUpload(false);
            setPhotoUploadComplete(true);

            const errorMsg: ChatMessage = {
                id: nextId('assistant-photo-err'),
                role: 'assistant',
                content: 'I had some trouble saving the photos, but no worries -- we can always add them later. Let\'s keep going with the interview.',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsUploadingPhotos(false);
        }
    }, [uploadPhotosToStorage, nextId]);

    // Handle photo skip
    const handlePhotoSkip = useCallback(() => {
        setShowPhotoUpload(false);
        setPhotoUploadComplete(true);

        const skipMsg: ChatMessage = {
            id: nextId('user-photo-skip'),
            role: 'user',
            content: 'I\'ll skip the photos for now.',
        };

        const coachContinueMsg: ChatMessage = {
            id: nextId('assistant-photo-skip'),
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
            id: nextId('user-init'),
            role: 'user',
            content: 'Hi, I just selected you as my coach. Let\'s get started with the intake interview.',
        };

        const assistantId = nextId('assistant');
        setMessages([introMessage, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const response = await apiFetchRaw('/api/ai-coach/interview', {
                method: 'POST',
                body: {
                    messages: [{ role: 'user', content: introMessage.content }],
                    coachId: coach.id,
                },
            });

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setMessages([introMessage, { id: assistantId, role: 'assistant', content: fullText }]);
            }
        } catch (error) {
            console.error('Interview start error:', error);
            setMessages([introMessage, {
                id: assistantId,
                role: 'assistant',
                content: error instanceof ApiError
                    ? errorMessage(error)
                    : 'Sorry, I had trouble starting up. Please refresh and try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [hasStarted, coach.id, nextId]);

    // Auto-start interview on mount
    useEffect(() => {
        startInterview();
    }, [startInterview]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: nextId('user'),
            role: 'user',
            content: text,
        };

        // Use messagesRef to avoid stale closure over messages state
        const updatedMessages = [...messagesRef.current, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        setUserMessageCount(prev => prev + 1);

        const assistantId = nextId('assistant');
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await apiFetchRaw('/api/ai-coach/interview', {
                method: 'POST',
                body: {
                    messages: apiMessages,
                    coachId: coach.id,
                },
            });

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

            // Extract form data after each assistant response (await so data is ready before completion check)
            await extractFormData(finalMessages);

            if (isComplete) {
                // Filter out photo-related messages before passing to completion handler
                const filteredMessages = finalMessages.filter(
                    m => !m.content.startsWith('[Uploaded') && !m.content.startsWith('I\'ll skip the photos')
                );
                onInterviewComplete(
                    filteredMessages.map(m => ({ role: m.role, content: m.content }))
                );
            }
        } catch (error) {
            console.error('Chat error:', error);
            // 429 / 503 carry a friendly message from the AI gateway; show it as the coach's reply
            const notice = error instanceof ApiError
                ? errorMessage(error)
                : 'Sorry, I encountered an error. Please try again.';
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId ? { ...m, content: notice } : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, coach.id, extractFormData, onInterviewComplete, nextId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-soft px-4 py-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand">
                    <img
                        src={coach.avatarUrl}
                        alt={coach.fullName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.parentElement) {
                                target.parentElement.style.background = 'var(--brand-gradient)';
                                target.parentElement.style.display = 'flex';
                                target.parentElement.style.alignItems = 'center';
                                target.parentElement.style.justifyContent = 'center';
                                target.parentElement.innerHTML = `<span style="font-size:1rem;font-weight:700;color:var(--ink-hi);font-family:var(--font-orbitron)">${coach.fullName.charAt(0)}</span>`;
                            }
                        }}
                    />
                </div>
                <div>
                    <p className="font-display text-[0.9rem] font-semibold leading-[1.2] text-ink-hi">
                        {coach.displayName}
                    </p>
                    <p className={`text-[0.7rem] ${isLoading ? 'text-brand' : 'text-ink-low'}`}>
                        {isLoading ? 'Typing...' : 'Intake Interview'}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="flex flex-col items-stretch gap-3">
                    <AnimatePresence mode="popLayout">
                        {messages.map(message => (
                            <motion.div
                                key={message.id}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                className="flex items-start gap-2"
                            >
                                <div
                                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[0.75rem] ${
                                        message.role === 'user'
                                            ? 'text-white [background:var(--brand-gradient)]'
                                            : 'border border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                                    }`}
                                >
                                    {message.role === 'user' ? (
                                        <User size={14} />
                                    ) : (
                                        <Bot size={14} />
                                    )}
                                </div>
                                <div
                                    className={`flex-1 rounded-[10px] border px-3 py-[0.65rem] ${
                                        message.role === 'user'
                                            ? 'border-brand/30 bg-[var(--brand-glow-soft)]'
                                            : 'border-line-soft bg-[var(--surface-1)]'
                                    }`}
                                >
                                    <p className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-ink-low">
                                        {message.role === 'user' ? 'You' : coach.nickname}
                                    </p>
                                    <p className="whitespace-pre-wrap text-[0.85rem] leading-normal text-ink-hi">
                                        {message.content}
                                    </p>
                                    {message.role === 'assistant' && !message.content && isLoading && (
                                        <div className="flex items-center gap-1 py-1">
                                            <span className="thinking-dots">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
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
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-line-soft px-3 py-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={showPhotoUpload ? 'Upload photos or skip to continue...' : 'Type your answer...'}
                        disabled={isLoading || showPhotoUpload}
                        data-testid="interview-chat-input"
                        className={`flex-1 rounded-[10px] border border-line-soft bg-[var(--surface-1)] px-3 py-[0.7rem] text-[0.9rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand ${
                            showPhotoUpload ? 'opacity-50' : ''
                        }`}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim() || showPhotoUpload}
                        data-testid="interview-chat-send"
                        className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-brand p-[0.7rem] text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
