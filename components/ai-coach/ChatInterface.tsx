'use client';

import { useState, useEffect, useRef } from 'react';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    messages: Message[];
    onSendMessage: (content: string) => void;
    loading: boolean;
    placeholder?: string;
}

export default function ChatInterface({ messages, onSendMessage, loading, placeholder }: ChatInterfaceProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || loading) return;
        onSendMessage(inputValue);
        setInputValue('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        <div style={{
                            maxWidth: '80%',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            background: msg.role === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                            color: msg.role === 'user' ? 'black' : 'white',
                            borderTopRightRadius: msg.role === 'user' ? '0' : '12px',
                            borderTopLeftRadius: msg.role === 'assistant' ? '0' : '12px',
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#888',
                            borderTopLeftRadius: '0',
                        }}>
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder || "Type a message..."}
                    className="input-field"
                    style={{ marginBottom: 0, flex: 1 }}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || !inputValue.trim()}
                    style={{ width: 'auto', padding: '0 1.5rem' }}
                >
                    Send
                </button>
            </form>
        </div>
    );
}
