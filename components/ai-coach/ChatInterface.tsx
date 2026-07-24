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
        <div className="flex h-full flex-col">
            {/* Messages Area */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 text-ink-hi ${
                                msg.role === 'user'
                                    ? 'rounded-tr-none border border-brand/30 bg-[var(--brand-glow-soft)]'
                                    : 'rounded-tl-none border border-line-soft bg-[var(--surface-1)]'
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="rounded-xl rounded-tl-none border border-line-soft bg-[var(--surface-1)] px-4 py-3 text-brand">
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line-soft p-4">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder || "Type a message..."}
                    className="flex-1 rounded-[10px] border border-line-soft bg-[var(--surface-1)] p-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand"
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn-brand !px-6 !py-3 !text-sm"
                    disabled={loading || !inputValue.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    );
}
