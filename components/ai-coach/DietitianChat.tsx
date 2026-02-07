'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { Send } from 'lucide-react';
import type { CoachPersona } from '@/data/coaches';
import { dietitianPersona } from '@/data/coaches';
import type { DietIntakeFormData } from '@/lib/types';

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
            const res = await fetch('/api/ai-coach/dietitian-interview', {
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
            const response = await fetch('/api/ai-coach/dietitian-interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Hi Dr. Nadia, my coach just introduced us. I just finished my training intake and I\'m ready to talk about nutrition.' }],
                    coachId: coach.id,
                    previousContext: previousMessages?.slice(-6),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start dietitian interview');
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

            const response = await fetch('/api/ai-coach/dietitian-interview', {
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
        <Flex
            h="100%"
            w="100%"
            overflow="hidden"
            alignItems="center"
            justifyContent="center"
            bg="#0a0a12"
            position="relative"
        >
            {/* Portrait frame */}
            <Box
                position="relative"
                h="100%"
                w="100%"
                maxW="480px"
                overflow="hidden"
            >
                {/* Background image */}
                <Box
                    position="absolute"
                    inset="0"
                    zIndex={0}
                    style={{
                        backgroundImage: `url(${dietitianPersona.chatBgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top',
                    }}
                />

                {/* Content layer */}
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
                    {/* TOP: Persona info + message */}
                    <Box>
                        <Box
                            bg="rgba(255, 255, 255, 0.88)"
                            borderRadius="14px"
                            p="0.85rem"
                            maxHeight="35vh"
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
                                        src={currentPersona.avatarUrl}
                                        alt={currentPersona.fullName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            if (target.parentElement) {
                                                target.parentElement.style.background = 'linear-gradient(135deg, var(--neon-orange), #E55C00)';
                                                target.parentElement.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;font-weight:700;color:#fff">${currentPersona.fullName.charAt(0)}</span>`;
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
                                        {currentPersona.displayName}
                                    </Text>
                                    <Text fontSize="0.7rem" fontWeight={isLoading ? '600' : '400'} color={isLoading ? 'var(--neon-orange)' : '#888'}>
                                        {isLoading ? 'Thinking...' : isCoachHandoff ? 'AI Coach' : 'Nutrition Interview'}
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
                                        Dr. Nadia is thinking
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

                    {/* BOTTOM: Input */}
                    <Box>
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
                                    placeholder="Tell Dr. Nadia about your nutrition..."
                                    disabled={isLoading}
                                    data-testid="dietitian-chat-input"
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem 0.7rem',
                                        fontSize: '0.85rem',
                                        background: '#f5f5f5',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '10px',
                                        color: '#1a1a1a',
                                        outline: 'none',
                                        opacity: isLoading ? 0.5 : 1,
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    data-testid="dietitian-chat-send"
                                    style={{
                                        padding: '0.6rem',
                                        background: isLoading || !input.trim()
                                            ? 'rgba(255, 102, 0, 0.3)'
                                            : '#FF6600',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
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
        </Flex>
    );
}
