'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import { dietitianPersona } from '@/data/coaches';
import type { DietIntakeFormData } from '@/lib/types';
import { apiFetch, apiFetchRaw, ApiError, errorMessage } from '@/lib/apiClient';

interface DietitianChatProps {
    coach: CoachPersona;
    onFormDataUpdate: (data: Partial<DietIntakeFormData>) => void;
    onInterviewComplete: (messages: { role: string; content: string }[]) => void;
    previousMessages?: { role: string; content: string }[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    persona?: 'coach' | 'dietitian';
}

export default function DietitianChat({
    coach,
    onFormDataUpdate,
    onInterviewComplete,
    previousMessages,
}: DietitianChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const mountedRef = useRef(true);
    const messagesRef = useRef<ChatMessage[]>([]);
    const idCounter = useRef(0);
    const nextId = useMemo(() => (prefix: string) => `${prefix}-${Date.now()}-${++idCounter.current}`, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Focus input
    useEffect(() => {
        if (!isLoading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading]);

    // Extract diet form data from conversation
    const extractDietFormData = useCallback(async (allMessages: ChatMessage[]) => {
        if (allMessages.length < 2) return;

        try {
            const formData = await apiFetch<Partial<DietIntakeFormData> & { error?: string }>('/api/ai-coach/dietitian-interview', {
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

    // Start the dietitian interview with a handoff from the coach
    const startDietitianInterview = useCallback(async () => {
        if (hasStarted) return;
        setHasStarted(true);
        setIsLoading(true);

        // Coach handoff message
        const handoffMsg: ChatMessage = {
            id: nextId('coach-handoff'),
            role: 'assistant',
            content: `Great news -- your training plan is saved and ready to go. Now, to really maximize your results, I want to introduce you to someone special on our team. Dr. Nadia "The Fuel" is a registered dietitian and sports nutritionist who is going to build you a nutrition plan that perfectly complements your training. I'll let her take it from here.`,
            persona: 'coach',
        };
        setMessages([handoffMsg]);

        // Small delay before Dr. Nadia's intro
        await new Promise(r => setTimeout(r, 800));
        if (!mountedRef.current) return;

        const introId = nextId('dietitian-intro');
        setMessages(prev => [...prev, { id: introId, role: 'assistant', content: '', persona: 'dietitian' }]);

        try {
            const response = await apiFetchRaw('/api/ai-coach/dietitian-interview', {
                method: 'POST',
                body: {
                    messages: [{ role: 'user', content: 'Hi Dr. Nadia, my coach just introduced us. I just finished my training intake and I\'m ready to talk about nutrition.' }],
                    coachId: coach.id,
                    previousContext: previousMessages?.slice(-6),
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
                        m.id === introId ? { ...m, content: fullText } : m
                    )
                );
            }
        } catch (error) {
            console.error('Dietitian interview start error:', error);
            setMessages(prev =>
                prev.map(m =>
                    m.id === introId
                        ? { ...m, content: 'Hello! I\'m Dr. Nadia, and I\'m thrilled to work with you on your nutrition plan. Let\'s start with the basics -- do you have any food allergies or intolerances I should know about?' }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [hasStarted, coach.id, previousMessages, nextId]);

    useEffect(() => {
        startDietitianInterview();
    }, [startDietitianInterview]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: nextId('user'),
            role: 'user',
            content: text,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const assistantId = nextId('dietitian');
        const updatedMessages = [...messagesRef.current, userMessage];
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', persona: 'dietitian' }]);

        try {
            const apiMessages = updatedMessages
                .filter(m => m.persona !== 'coach')
                .map(m => ({
                    role: m.role,
                    content: m.content,
                }));

            const response = await apiFetchRaw('/api/ai-coach/dietitian-interview', {
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

            const isComplete = response.headers.get('X-Interview-Complete') === 'true';

            const finalMessages = [
                ...updatedMessages,
                { id: assistantId, role: 'assistant' as const, content: fullText, persona: 'dietitian' as const },
            ];

            await extractDietFormData(finalMessages);

            if (isComplete) {
                const interviewMessages = finalMessages
                    .filter(m => m.persona !== 'coach')
                    .map(m => ({ role: m.role, content: m.content }));
                onInterviewComplete(interviewMessages);
            }
        } catch (error) {
            console.error('Dietitian chat error:', error);
            // 429 / 503 carry a friendly message from the AI gateway; show it as the reply
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
    }, [input, isLoading, coach.id, extractDietFormData, onInterviewComplete, nextId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    // Get only the last assistant message for display
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.length > 0);
    const isCoachHandoff = lastAssistantMsg?.persona === 'coach';
    const currentPersona = isCoachHandoff ? coach : dietitianPersona;

    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--surface-0)]">
            {/* Portrait frame */}
            <div className="relative h-full w-full max-w-[480px] overflow-hidden">
                {/* Background image */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-[position:center_top]"
                    style={{ backgroundImage: `url(${dietitianPersona.chatBgUrl})` }}
                />

                {/* Content layer */}
                <div className="absolute inset-0 z-[1] flex flex-col justify-between px-[10%] pb-[2.5%] pt-[2.5%]">
                    {/* TOP: Persona info + message */}
                    <div>
                        <div className="glass-card max-h-[35vh] overflow-y-auto p-[0.85rem]">
                            <div className="mb-2 flex items-center gap-2">
                                <div
                                    className={`h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand ${
                                        isLoading ? 'animate-pulse' : ''
                                    }`}
                                >
                                    <img
                                        src={currentPersona.avatarUrl}
                                        alt={currentPersona.fullName}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            if (target.parentElement) {
                                                target.parentElement.style.background = 'var(--brand-gradient)';
                                                target.parentElement.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;font-weight:700;color:var(--ink-hi)">${currentPersona.fullName.charAt(0)}</span>`;
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="text-[0.85rem] font-bold leading-[1.2] text-ink-hi">
                                        {currentPersona.displayName}
                                    </p>
                                    <p className={`text-[0.7rem] ${isLoading ? 'font-semibold text-brand' : 'font-normal text-ink-low'}`}>
                                        {isLoading ? 'Thinking...' : isCoachHandoff ? 'AI Coach' : 'Nutrition Interview'}
                                    </p>
                                </div>
                            </div>

                            {lastAssistantMsg ? (
                                <p className="coach-handwriting whitespace-pre-wrap text-ink-hi">
                                    {lastAssistantMsg.content}
                                </p>
                            ) : isLoading ? (
                                <div className="flex items-center gap-[0.4rem] py-2">
                                    <p className="coach-handwriting text-base font-semibold text-ink-hi">
                                        Dr. Nadia is thinking
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

                    {/* BOTTOM: Input */}
                    <div>
                        <div className="glass-card p-3">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Tell Dr. Nadia about your nutrition..."
                                    disabled={isLoading}
                                    data-testid="dietitian-chat-input"
                                    className={`flex-1 rounded-[10px] border border-line-soft bg-[var(--surface-1)] px-[0.7rem] py-[0.6rem] text-[0.85rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand ${
                                        isLoading ? 'opacity-50' : ''
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    data-testid="dietitian-chat-send"
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
