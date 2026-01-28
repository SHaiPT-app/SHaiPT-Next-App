'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DirectMessage } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseDirectMessagesOptions {
    userId: string;
    otherUserId: string;
    authToken: string;
}

interface UseDirectMessagesReturn {
    messages: DirectMessage[];
    sendMessage: (content: string) => Promise<void>;
    markAsRead: (messageId: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

export function useDirectMessages({
    userId,
    otherUserId,
    authToken,
}: UseDirectMessagesOptions): UseDirectMessagesReturn {
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Fetch initial messages
    useEffect(() => {
        if (!userId || !otherUserId || !authToken) return;

        const fetchMessages = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/direct-messages?userId=${userId}&otherUserId=${otherUserId}`,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to fetch messages');
                }
                const data = await res.json();
                setMessages(data.messages || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch messages');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [userId, otherUserId, authToken]);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!userId || !otherUserId) return;

        const channelName = `dm:${[userId, otherUserId].sort().join(':')}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `sender_id=eq.${otherUserId}`,
                },
                (payload) => {
                    const newMsg = payload.new as DirectMessage;
                    if (
                        newMsg.recipient_id === userId &&
                        newMsg.sender_id === otherUserId
                    ) {
                        setMessages((prev) => [...prev, newMsg]);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'direct_messages',
                },
                (payload) => {
                    const updated = payload.new as DirectMessage;
                    setMessages((prev) =>
                        prev.map((m) => (m.id === updated.id ? updated : m))
                    );
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [userId, otherUserId]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim()) return;

            try {
                const res = await fetch('/api/direct-messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        senderId: userId,
                        recipientId: otherUserId,
                        content,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to send message');
                }

                const data = await res.json();
                setMessages((prev) => [...prev, data.message]);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to send message');
                throw err;
            }
        },
        [userId, otherUserId, authToken]
    );

    const markAsRead = useCallback(
        async (messageId: string) => {
            try {
                const { data, error: updateError } = await supabase
                    .from('direct_messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', messageId)
                    .select()
                    .single();

                if (updateError) throw updateError;

                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? data : m))
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to mark as read');
            }
        },
        []
    );

    return { messages, sendMessage, markAsRead, loading, error };
}
