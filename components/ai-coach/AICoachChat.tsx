'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Send, X, MessageSquare, Trash2, User, Bot } from 'lucide-react';
import type { Profile, AIChat } from '@/lib/types';

interface AICoachChatProps {
    user: Profile;
    isOpen: boolean;
    onToggle: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTIONS = [
    { label: 'Adjust my plan', prompt: 'How should I adjust my current training plan based on my recent progress?' },
    { label: 'Recovery tips', prompt: 'What recovery strategies should I focus on right now?' },
    { label: 'Nutrition check', prompt: 'Based on my goals, am I eating the right macros?' },
    { label: 'Form advice', prompt: 'Can you explain proper deadlift form and common mistakes?' },
];

export default function AICoachChat({ user, isOpen, onToggle }: AICoachChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [chatHistory, setChatHistory] = useState<AIChat[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadChatHistory = useCallback(async () => {
        try {
            const res = await fetch(`/api/ai-coach/chat/history?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data.chats || []);
            }
        } catch {
            // Silently fail - history is non-critical
        }
    }, [user.id]);

    // Load chat history on mount
    useEffect(() => {
        if (user.id && isOpen) {
            loadChatHistory();
        }
    }, [user.id, isOpen, loadChatHistory]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChat = (chat: AIChat) => {
        setChatId(chat.id);
        setMessages(
            chat.messages.map((m, i) => ({
                id: `${m.role}-${i}-${Date.now()}`,
                role: m.role,
                content: m.content,
            }))
        );
        setShowHistory(false);
    };

    const startNewChat = () => {
        setChatId(undefined);
        setMessages([]);
        setShowHistory(false);
    };

    const sendMessage = useCallback(async (messageText?: string) => {
        const text = messageText || input;
        if (!text.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        // Add a placeholder for the streaming assistant message
        const assistantId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/ai-coach/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    userId: user.id,
                    chatId,
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
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to get response');
            }

            // Capture chatId from response header for new chats
            const returnedChatId = response.headers.get('X-Chat-Id');
            if (returnedChatId && !chatId) {
                setChatId(returnedChatId);
            }

            // Read the stream
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

            // Refresh chat history after a successful message
            loadChatHistory();
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
    }, [input, isLoading, messages, user.id, chatId, loadChatHistory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="fixed bottom-6 right-6 z-[1000] md:bottom-8 md:right-8"
                >
                    <button
                        onClick={onToggle}
                        data-testid="ai-coach-toggle"
                        className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-none text-white [background:var(--brand-gradient)] shadow-[0_4px_20px_var(--brand-glow)] transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_25px_var(--brand-glow)]"
                    >
                        <MessageSquare size={24} />
                    </button>
                </motion.div>
            )}

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="fixed bottom-0 right-0 z-[1001] flex h-screen max-h-screen w-full flex-col overflow-hidden bg-[var(--surface-0)] shadow-2xl backdrop-blur-xl md:bottom-6 md:right-6 md:h-[600px] md:max-h-[80vh] md:w-[420px] md:rounded-2xl md:border md:border-line-soft"
                        data-testid="ai-coach-panel"
                    >
                        {/* Header */}
                        <div className="flex flex-shrink-0 items-center justify-between border-b border-line-soft px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full text-white [background:var(--brand-gradient)]">
                                    <MessageSquare size={16} />
                                </div>
                                <div>
                                    <h3 className="font-display text-[0.95rem] font-bold leading-[1.2] text-ink-hi">
                                        AI Coach
                                    </h3>
                                    <p className={`text-[0.7rem] ${isLoading ? 'font-semibold text-brand' : 'font-normal text-ink-low'}`}>
                                        {isLoading ? 'Thinking...' : 'Online'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    title="Chat history"
                                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                                        showHistory
                                            ? 'border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                                            : 'border-line-soft bg-[var(--surface-1)] text-ink-hi hover:border-brand/40 hover:text-brand'
                                    }`}
                                >
                                    <MessageSquare size={14} />
                                </button>
                                <button
                                    onClick={startNewChat}
                                    title="New chat"
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line-soft bg-[var(--surface-1)] text-ink-hi transition-colors hover:border-brand/40 hover:text-brand"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={onToggle}
                                    data-testid="ai-coach-close"
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line-soft bg-[var(--surface-1)] text-ink-hi transition-colors hover:border-brand/40 hover:text-brand"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Chat History Sidebar */}
                        {showHistory && (
                            <div className="max-h-[200px] overflow-y-auto border-b border-line-soft px-3 py-2">
                                <p className="mb-2 text-[0.7rem] font-semibold uppercase text-ink-low">
                                    Recent Chats
                                </p>
                                {chatHistory.length === 0 ? (
                                    <p className="py-2 text-[0.8rem] text-ink-low">
                                        No previous chats
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-stretch gap-1">
                                        {chatHistory.slice(0, 10).map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadChat(chat)}
                                                className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors ${
                                                    chatId === chat.id
                                                        ? 'border-brand/30 bg-[var(--brand-glow-soft)]'
                                                        : 'border-transparent bg-[var(--surface-1)] hover:border-line-strong'
                                                }`}
                                            >
                                                <p className="line-clamp-1 text-[0.8rem] text-ink-hi">
                                                    {chat.title}
                                                </p>
                                                <p className="text-[0.65rem] text-ink-low">
                                                    {chat.messages.length} messages
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            <div className="flex flex-col items-stretch gap-3">
                                {messages.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <div className="mb-3 flex justify-center">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full text-white [background:var(--brand-gradient)]">
                                                <MessageSquare size={20} />
                                            </div>
                                        </div>
                                        <p className="font-display mb-2 text-[0.95rem] text-ink-hi">
                                            Hey{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                                        </p>
                                        <p className="mb-5 text-[0.8rem] text-ink-low">
                                            I know your goals and recent workouts. Ask me anything!
                                        </p>
                                        <div className="flex flex-col items-stretch gap-2">
                                            {SUGGESTIONS.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendMessage(s.prompt)}
                                                    className="cursor-pointer rounded-[10px] border border-line-soft bg-[var(--surface-1)] px-3 py-2.5 text-left text-[0.8rem] text-ink-hi transition-colors hover:border-brand/30 hover:bg-[var(--brand-glow-soft)]"
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
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
                                                    {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                                </div>
                                                <div
                                                    className={`flex-1 rounded-[10px] border px-3 py-[0.65rem] ${
                                                        message.role === 'user'
                                                            ? 'border-brand/30 bg-[var(--brand-glow-soft)]'
                                                            : 'border-line-soft bg-[var(--surface-1)]'
                                                    }`}
                                                >
                                                    <p className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-ink-low">
                                                        {message.role === 'user' ? 'You' : 'AI Coach'}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-[0.85rem] leading-normal text-ink-hi">
                                                        {message.content || (isLoading && message.role === 'assistant' ? '' : '')}
                                                    </p>
                                                    {/* Thinking indicator for empty assistant message */}
                                                    {message.role === 'assistant' && !message.content && isLoading && (
                                                        <div className="flex items-center gap-[0.35rem] py-1">
                                                            <p className="text-[0.8rem] font-medium text-brand">
                                                                AI Coach is thinking
                                                            </p>
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
                                    placeholder="Ask your AI Coach..."
                                    disabled={isLoading}
                                    data-testid="ai-coach-input"
                                    className="flex-1 rounded-[10px] border border-line-soft bg-[var(--surface-1)] px-3 py-[0.7rem] text-[0.9rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    data-testid="ai-coach-send"
                                    className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-brand p-[0.7rem] text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
