'use client';

import { useState, useRef, useEffect } from 'react';
import { useDirectMessages } from '@/lib/useDirectMessages';

interface DirectMessageThreadProps {
    userId: string;
    otherUserId: string;
    otherUserName: string;
    authToken: string;
    onClose?: () => void;
}

export default function DirectMessageThread({
    userId,
    otherUserId,
    otherUserName,
    authToken,
    onClose,
}: DirectMessageThreadProps) {
    const { messages, sendMessage, markAsRead, loading, error } =
        useDirectMessages({ userId, otherUserId, authToken });
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark unread messages as read when they appear
    useEffect(() => {
        const unread = messages.filter(
            (m) => m.sender_id === otherUserId && !m.read_at
        );
        unread.forEach((m) => markAsRead(m.id));
    }, [messages, otherUserId, markAsRead]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        setSending(true);
        try {
            await sendMessage(input.trim());
            setInput('');
        } catch {
            // error is handled by the hook
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-900">{otherUserName}</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close conversation"
                    >
                        &times;
                    </button>
                )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loading && (
                    <p className="text-center text-gray-500 text-sm">Loading messages...</p>
                )}
                {error && (
                    <p className="text-center text-red-500 text-sm">{error}</p>
                )}
                {!loading && messages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm">
                        No messages yet. Start the conversation!
                    </p>
                )}
                {messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                    isMine
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                }`}
                            >
                                <p>{msg.content}</p>
                                <p
                                    className={`text-xs mt-1 ${
                                        isMine ? 'text-blue-200' : 'text-gray-400'
                                    }`}
                                >
                                    {msg.created_at
                                        ? new Date(msg.created_at).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : ''}
                                    {isMine && msg.read_at && (
                                        <span className="ml-1">&#10003;&#10003;</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-4 py-3 border-t border-gray-200"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {sending ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
}
