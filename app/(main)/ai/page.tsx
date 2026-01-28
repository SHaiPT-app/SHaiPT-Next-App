'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';

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
    const [user, setUser] = useState<Profile | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    userId: user?.id,
                    isPrivate
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const assistantMessage: Message = { role: 'assistant', content: data.message };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            };
            setMessages(prev => [...prev, errorMessage]);
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
                            Private Mode {isPrivate && '(locked)'}
                        </span>
                    </label>
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
                                        e.currentTarget.style.background = 'rgba(242, 95, 41, 0.1)';
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
                                        ? 'linear-gradient(135deg, var(--primary), #ff6b35)'
                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
                                            ? 'rgba(242, 95, 41, 0.1)'
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
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
