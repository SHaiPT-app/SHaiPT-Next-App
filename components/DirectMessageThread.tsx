'use client';

import { useState, useRef, useEffect } from 'react';
import { useDirectMessages } from '@/lib/useDirectMessages';
import { Send } from 'lucide-react';

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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'rgba(21, 21, 31, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.03)',
            }}>
                <h3 style={{ fontWeight: '600', color: 'white', fontSize: '0.95rem', margin: 0 }}>
                    {otherUserName}
                </h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            lineHeight: 1,
                        }}
                        aria-label="Close conversation"
                    >
                        &times;
                    </button>
                )}
            </div>

            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                minHeight: 0,
            }}>
                {loading && (
                    <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                        Loading messages...
                    </p>
                )}
                {error && (
                    <p style={{ textAlign: 'center', color: '#f87171', fontSize: '0.85rem' }}>
                        {error}
                    </p>
                )}
                {!loading && messages.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '2rem' }}>
                        No messages yet. Start the conversation!
                    </p>
                )}
                {messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex',
                                justifyContent: isMine ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div style={{
                                maxWidth: '75%',
                                borderRadius: '12px',
                                padding: '0.6rem 0.85rem',
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                background: isMine
                                    ? 'rgba(255, 102, 0, 0.2)'
                                    : 'rgba(255, 255, 255, 0.06)',
                                border: isMine
                                    ? '1px solid rgba(255, 102, 0, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                color: isMine ? '#fff' : '#ddd',
                            }}>
                                <p style={{ margin: 0 }}>{msg.content}</p>
                                <p style={{
                                    fontSize: '0.7rem',
                                    marginTop: '0.25rem',
                                    color: isMine ? 'rgba(255, 102, 0, 0.7)' : '#666',
                                    margin: 0,
                                }}>
                                    {msg.created_at
                                        ? new Date(msg.created_at).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : ''}
                                    {isMine && msg.read_at && (
                                        <span style={{ marginLeft: '0.3rem' }}>&#10003;&#10003;</span>
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
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(255, 255, 255, 0.02)',
                }}
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        padding: '0.6rem 1rem',
                        color: 'white',
                        fontSize: '0.9rem',
                        outline: 'none',
                    }}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    style={{
                        background: sending || !input.trim()
                            ? 'rgba(255, 102, 0, 0.3)'
                            : 'var(--neon-orange, #FF6600)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                >
                    <Send size={18} color="white" />
                </button>
            </form>
        </div>
    );
}
