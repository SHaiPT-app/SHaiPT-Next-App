'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/supabaseDb';
import { apiFetch, apiFetchRaw, ApiError } from '@/lib/apiClient';

const FITNESS_SUGGESTIONS = [
    {
        title: "Generate Training Plan",
        description: "Create a personalized workout program",
        prompt: "Create a 4-week training plan for building muscle. I train 4 days per week."
    },
    {
        title: "Exercise Tutorial",
        description: "Learn proper form and technique",
        prompt: "Explain how to perform a proper barbell squat with correct form."
    },
    {
        title: "Meal Plan",
        description: "Get nutrition guidance",
        prompt: "Create a high-protein meal plan for muscle gain (2500 calories)."
    },
    {
        title: "Recovery Tips",
        description: "Optimize rest and recovery",
        prompt: "What are the best recovery strategies after intense leg day?"
    }
];

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIPage() {
    const [isPrivate, setIsPrivate] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reopen the last conversation, so a reload does not throw the thread away. On a cold
    // load the Supabase session can still be hydrating, so the first call goes out without a
    // token and comes back 401; retry a couple of times before giving up.
    useEffect(() => {
        let cancelled = false;

        const load = async (attempt = 0): Promise<void> => {
            try {
                const data = await apiFetch<{ chatId: string | null; messages: Message[] }>('/api/ai-coach/chat');
                if (cancelled || !data?.chatId || !data.messages?.length) return;
                setChatId(data.chatId);
                setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
            } catch (err) {
                const unauthorized = err instanceof ApiError && err.status === 401;
                if (cancelled || !unauthorized || attempt >= 3) return;
                await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
                if (!cancelled) await load(attempt + 1);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const startNewChat = () => {
        setChatId(null);
        setMessages([]);
        setInput('');
    };

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // the caller comes from the bearer token; the reply is streamed text/plain
            const response = await apiFetchRaw('/api/ai-coach/chat', {
                method: 'POST',
                body: {
                    messages: [...messages, userMessage],
                    chatId: chatId ?? undefined,
                    isPrivate
                }
            });

            const newChatId = response.headers.get('X-Chat-Id');
            if (newChatId) setChatId(newChatId);

            const replaceLast = (content: string) => setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content };
                return next;
            });
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            let text = '';
            const reader = response.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    text += decoder.decode(value, { stream: true });
                    replaceLast(text);
                }
                text += decoder.decode();
            } else {
                text = await response.text();
            }
            replaceLast(text || 'Sorry, I encountered an error. Please try again.');
        } catch (error) {
            // a 429 carries the AI limit message from the server; show it as the reply
            console.error('Chat error:', error);
            const errorReply: Message = {
                role: 'assistant',
                content: error instanceof ApiError ? error.message : 'Sorry, I encountered an error. Please try again.'
            };
            setMessages(prev => [...prev, errorReply]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (prompt: string) => {
        handleSendMessage(prompt);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage();
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 150px)',
            maxWidth: '900px',
            margin: '0 auto',
            padding: '1.5rem',
            paddingBottom: '2rem'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '2rem',
                        color: 'var(--primary)',
                        margin: 0
                    }}>
                        AI Coach
                    </h1>

                    {/* Private Mode Toggle */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}>
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ color: isPrivate ? 'var(--primary)' : '#888' }}>
                            Private Mode {isPrivate && '(not saved)'}
                        </span>
                    </label>

                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={startNewChat}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '999px',
                                color: '#888',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                padding: '0.25rem 0.7rem',
                            }}
                        >
                            New chat
                        </button>
                    )}
                </div>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                    Your personal fitness AI assistant
                </p>
            </div>

            {/* Messages Container */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}
            >
                {messages.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '2rem'
                    }}>
                        {/* Welcome Message */}
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{
                                fontSize: '1.5rem',
                                marginBottom: '1rem',
                                fontFamily: 'var(--font-orbitron)',
                                color: 'var(--neon-orange)',
                                fontWeight: '700'
                            }}>
                                SHaiPT
                            </div>
                            <h2 style={{
                                fontFamily: 'var(--font-orbitron)',
                                fontSize: '1.5rem',
                                marginBottom: '0.5rem'
                            }}>
                                Hey there, athlete!
                            </h2>
                            <p style={{ color: '#888' }}>
                                I'm your AI fitness coach. How can I help you today?
                            </p>
                        </div>

                        {/* Suggested Actions */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1rem',
                            width: '100%',
                            maxWidth: '800px'
                        }}>
                            {FITNESS_SUGGESTIONS.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                                    className="glass-panel"
                                    style={{
                                        padding: '1.5rem',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        border: 'none',
                                        transition: 'all 0.2s',
                                        background: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(218, 0, 35, 0.1)';
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                >
                                    <div style={{
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                        color: 'var(--primary)'
                                    }}>
                                        {suggestion.title}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                        {suggestion.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                data-testid={`chat-message-${message.role}`}
                                style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'flex-start'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: message.role === 'user'
                                        ? 'var(--primary)'
                                        : '#27272b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontSize: '1.2rem'
                                }}>
                                    {message.role === 'user' ? 'U' : 'AI'}
                                </div>

                                {/* Message Content */}
                                <div
                                    className="glass-panel"
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        background: message.role === 'user'
                                            ? 'rgba(218, 0, 35, 0.1)'
                                            : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#888',
                                        marginBottom: '0.5rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                    }}>
                                        {message.role === 'user' ? 'You' : 'AI Coach'}
                                    </div>
                                    <div style={{
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.6',
                                        color: 'var(--foreground)'
                                    }}>
                                        {message.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#27272b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    AI
                                </div>
                                <div className="glass-panel" style={{ padding: '1rem' }}>
                                    <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSubmit}
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    position: 'relative'
                }}
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about fitness..."
                    disabled={isLoading}
                    className="input-field"
                    style={{
                        flex: 1,
                        padding: '1rem',
                        fontSize: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="btn-primary"
                    style={{
                        padding: '1rem 2rem',
                        minWidth: '100px'
                    }}
                >
                    {isLoading ? (
                        <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                    ) : (
                        'Send'
                    )}
                </button>
            </form>

            {isPrivate && (
                <p style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    marginTop: '0.5rem',
                    textAlign: 'center'
                }}>
                    Private mode: This conversation won't be saved
                </p>
            )}
        </div>
    );
}
