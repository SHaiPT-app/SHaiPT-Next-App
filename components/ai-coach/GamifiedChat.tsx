'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ChevronUp, ChevronDown } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import type { IntakeFormData, IntakeFormDataV2 } from '@/lib/types';
import ProgressBar from './ProgressBar';
import QuickReplyChips from './QuickReplyChips';
import IntakePhotoUpload from './IntakePhotoUpload';
import { apiFetch, apiFetchRaw, ApiError, errorMessage } from '@/lib/apiClient';
import { MAX_ANSWER_CHARS } from '@/lib/ai/guard';

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


/**
 * Pulls the markers out of a reply.
 *
 * [STEP:<id>] advances the progress bar. [OPTIONS: a | b | c] becomes the row of buttons under the
 * message — the coach is told to send the marker *instead of* listing the choices in its sentence,
 * so the text stays short enough to read without scrolling.
 *
 * The catch-all at the end is for markers the model invents. The server strips those too; this is
 * here because the reply is rendered while it streams, and a half-written tag should never flash
 * up on screen mid-stream.
 */
function parseMarkers(text: string): { cleaned: string; steps: string[]; options: string[] } {
    const steps: string[] = [];
    let options: string[] = [];

    let cleaned = text.replace(/\[STEP:(\w+)\]/g, (_, step) => {
        if (STEP_MARKERS[step]) steps.push(STEP_MARKERS[step]);
        return '';
    });

    cleaned = cleaned.replace(/\[OPTIONS:([^\]]*)\]/g, (_, list: string) => {
        options = list.split('|').map((o) => o.trim()).filter(Boolean);
        return '';
    });

    // A tag still being streamed ("[OPT", "[STEP:equi") plus anything we never defined.
    cleaned = cleaned
        .replace(/\[(?!STEP:|OPTIONS:)[A-Z][A-Z0-9_ ]{2,}\]/g, '')
        .replace(/\[[A-Z]*$/, '')
        .replace(/[ \t]{2,}/g, ' ');

    return { cleaned: cleaned.trim(), steps, options };
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
    /** Choices offered by the current question, from its [OPTIONS:] marker. */
    const [options, setOptions] = useState<string[]>([]);
    /** Whether the transcript is open. The coach's latest line is always on screen; this is the rest. */
    const [showTranscript, setShowTranscript] = useState(false);

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
    // The anchor only exists while the transcript is open, so this is a no-op when it is closed.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showPhotoUpload, showTranscript]);

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
    // The route files the upload under the caller: no user id in the form
    const uploadPhotosToStorage = useCallback(async (files: File[]): Promise<number> => {
        let uploadedCount = 0;
        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('caption', 'intake_photo');
                fd.append('visibility', 'private');
                await apiFetchRaw('/api/progress-media', { method: 'POST', body: fd });
                uploadedCount++;
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

            // No AI assessment of the photos: they are only saved to the progress gallery
            const ackId = nextId('assistant-photo-ack');
            setMessages(prev => [...prev, {
                id: ackId,
                role: 'assistant',
                content: uploadedCount > 0
                    ? 'Photos saved to your progress gallery. Let\'s keep going.'
                    : 'I couldn\'t save those photos, but no worries -- you can add them later. Let\'s keep going.',
            }]);
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
        const { cleaned, steps, options: parsed } = parseMarkers(text);
        if (steps.length > 0) {
            setCompletedSteps(prev => {
                const newSet = new Set([...prev, ...steps]);
                return Array.from(newSet);
            });
            setActiveStep(steps[steps.length - 1]);
        }
        setOptions(parsed);
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
            const response = await apiFetchRaw('/api/ai-coach/interview', {
                method: 'POST',
                body: {
                    messages: [{ role: 'user', content: introMessage.content }],
                    coachId: coach.id,
                    prefilledFields: pf.length > 0 ? pf : undefined,
                },
            });

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
                content: error instanceof ApiError
                    ? errorMessage(error)
                    : 'Sorry, I had trouble starting up. Please refresh and try again.',
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
        setOptions([]);
        setIsLoading(true);
        setUserMessageCount(prev => prev + 1);

        const assistantId = nextId('assistant');
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
            const response = await apiFetchRaw('/api/ai-coach/interview', {
                method: 'POST',
                body: {
                    messages: apiMessages,
                    coachId: coach.id,
                    prefilledFields: prefilledFields(),
                },
            });

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
    }, [input, isLoading, coach.id, extractFormData, onInterviewComplete, nextId, prefilledFields, processResponse]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    // The coach's latest line, which is what the card shows when the transcript is closed.
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.length > 0);

    // The conversation so far. The opening "Hi, I just selected you as my coach" is synthetic — the
    // client never typed it — so it is not part of what they scroll back through.
    const transcript = messages.filter(m => m.content.length > 0 && !m.id.startsWith('user-init'));

    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--surface-0)]">
            {/* Portrait frame — locked to available height */}
            <div className="relative h-full w-full max-w-[480px] overflow-hidden">
                {/* Background image — fills frame, always visible */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-[position:center_top]"
                    style={{ backgroundImage: `url(${coach.chatBgUrl})` }}
                />

                {/* Content layer — absolute so it never pushes frame height */}
                <div className="absolute inset-0 z-[1] flex flex-col justify-between px-[10%] pb-[2.5%] pt-[2.5%]">
                    {/* ─── TOP: Progress + Coach message ─── */}
                    <div>
                        <div className="mb-[0.35rem]">
                            <ProgressBar completedSteps={completedSteps} activeStep={activeStep} />
                        </div>
                        <div className={`glass-card overflow-y-auto p-[0.85rem] ${showTranscript ? 'max-h-[58vh]' : 'max-h-[34vh]'}`}>
                            <div className="mb-2 flex items-center gap-2">
                                <div
                                    className={`h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand ${
                                        isLoading ? 'animate-pulse' : ''
                                    }`}
                                >
                                    <img
                                        src={coach.avatarUrl}
                                        alt={coach.fullName}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            if (target.parentElement) {
                                                target.parentElement.style.background = 'var(--brand-gradient)';
                                                target.parentElement.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;font-weight:700;color:var(--ink-hi)">${coach.fullName.charAt(0)}</span>`;
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="text-[0.85rem] font-bold leading-[1.2] text-ink-hi">
                                        {coach.displayName}
                                    </p>
                                    <p className={`text-[0.7rem] ${isLoading ? 'font-semibold text-brand' : 'font-normal text-ink-low'}`}>
                                        {isLoading ? 'Thinking...' : 'AI Coach'}
                                    </p>
                                </div>
                                {transcript.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTranscript(v => !v)}
                                        aria-expanded={showTranscript}
                                        data-testid="interview-transcript-toggle"
                                        className="ml-auto flex cursor-pointer items-center gap-1 rounded-[8px] border border-line-soft bg-transparent px-2 py-1 text-[0.65rem] uppercase tracking-[0.08em] text-ink-low transition-colors hover:text-ink-hi"
                                    >
                                        {showTranscript ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                        {showTranscript ? 'Latest' : 'History'}
                                    </button>
                                )}
                            </div>

                            {showTranscript ? (
                                <div className="flex flex-col gap-3">
                                    {transcript.map(m => (
                                        <div key={m.id}>
                                            <p className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-ink-low">
                                                {m.role === 'user' ? 'You' : coach.nickname}
                                            </p>
                                            <p
                                                className={
                                                    m.role === 'user'
                                                        ? 'whitespace-pre-wrap rounded-[8px] bg-[var(--brand-glow-soft)] px-2 py-1 text-[0.8rem] text-ink-hi'
                                                        : 'coach-handwriting whitespace-pre-wrap text-ink-hi'
                                                }
                                            >
                                                {m.content}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            ) : lastAssistantMsg ? (
                                <p className="coach-handwriting whitespace-pre-wrap text-ink-hi">
                                    {lastAssistantMsg.content}
                                </p>
                            ) : isLoading ? (
                                <div className="flex items-center gap-[0.4rem] py-2">
                                    <p className="coach-handwriting text-base font-semibold text-ink-hi">
                                        Coach is thinking
                                    </p>
                                    <span className="thinking-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* ─── BOTTOM: Photo upload + Input ─── */}
                    <div>
                        {showPhotoUpload && (
                            <div className="mb-2">
                                <div className="glass-card p-3">
                                    <IntakePhotoUpload
                                        onPhotosSubmitted={handlePhotosSubmitted}
                                        onSkip={handlePhotoSkip}
                                        isUploading={isUploadingPhotos}
                                    />
                                </div>
                            </div>
                        )}

                        {options.length > 0 && !showPhotoUpload && !isLoading && (
                            <div className="glass-card mb-2 p-3" data-testid="interview-options">
                                <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-ink-low">
                                    Pick one, or type your own
                                </p>
                                <QuickReplyChips
                                    options={options}
                                    selected={[]}
                                    onSelect={(picked) => {
                                        if (picked[0]) sendMessage(picked[0]);
                                    }}
                                />
                            </div>
                        )}

                        <div className="glass-card p-3">
                            <form onSubmit={handleSubmit} className="flex gap-2">
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
                                    maxLength={MAX_ANSWER_CHARS}
                                    data-testid="interview-input"
                                    className={`flex-1 rounded-[10px] border border-line-soft bg-[var(--surface-1)] px-[0.7rem] py-[0.6rem] text-[0.85rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand ${
                                        showPhotoUpload ? 'opacity-50' : ''
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim() || showPhotoUpload}
                                    className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-brand p-[0.6rem] text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
