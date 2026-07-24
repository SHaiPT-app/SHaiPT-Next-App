'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile, DirectMessage } from '@/lib/types';
import DirectMessageThread from '@/components/DirectMessageThread';
import { MessageSquare, ArrowLeft } from 'lucide-react';

interface Conversation {
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

export default function DMsPage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/');
                return;
            }

            const parsed = JSON.parse(storedUser);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/');
                return;
            }

            setUser(parsed);
            setAuthToken(session.access_token);
        };

        init();
    }, [router]);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Get all messages for the user
            const allMessages = await db.directMessages.getConversations(user.id);

            // Group by conversation partner
            const partnerMap = new Map<string, DirectMessage[]>();
            for (const msg of allMessages) {
                const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
                if (!partnerMap.has(partnerId)) {
                    partnerMap.set(partnerId, []);
                }
                partnerMap.get(partnerId)!.push(msg);
            }

            // Only show conversations with active coaching relationships
            const relationships = await db.coachingRelationships.getByUser(user.id);
            const activePartnerIds = new Set<string>();
            for (const rel of relationships) {
                if (rel.status === 'active') {
                    activePartnerIds.add(rel.coach_id === user.id ? rel.athlete_id : rel.coach_id);
                }
            }

            // Build conversation list
            const convos: Conversation[] = [];
            for (const [partnerId, messages] of partnerMap) {
                // Only show conversations with active coaching partners (or any existing DMs)
                if (activePartnerIds.size === 0 || activePartnerIds.has(partnerId) || messages.length > 0) {
                    // Get partner profile
                    const partner = await db.profiles.getById(partnerId).catch(() => null);
                    const lastMsg = messages[0]; // Already sorted descending
                    const unread = messages.filter(m => m.sender_id === partnerId && !m.read_at).length;

                    convos.push({
                        partnerId,
                        partnerName: partner?.full_name || partner?.username || 'Unknown',
                        partnerAvatar: partner?.avatar_url,
                        lastMessage: lastMsg.content,
                        lastMessageAt: lastMsg.created_at || '',
                        unreadCount: unread,
                    });
                }
            }

            // Sort by most recent message
            convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
            setConversations(convos);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchConversations();
    }, [user, fetchConversations]);

    function timeAgo(dateStr: string): string {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    if (!user || !authToken) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    // If a conversation is selected, show the thread
    if (selectedPartner) {
        return (
            <div className="mx-auto h-[calc(100vh-100px)] max-w-[700px] p-6">
                <button
                    onClick={() => {
                        setSelectedPartner(null);
                        fetchConversations(); // Refresh on back
                    }}
                    className="btn-soft mb-4 !px-3.5 !py-2 !text-[0.85rem] !font-semibold"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>
                <div className="h-[calc(100%-60px)] overflow-hidden rounded-xl">
                    <DirectMessageThread
                        userId={user.id}
                        otherUserId={selectedPartner.id}
                        otherUserName={selectedPartner.name}
                        authToken={authToken}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[700px] p-6 pb-8">
            <h1 className="display text-gradient-brand mb-6 text-[2rem]">
                Messages
            </h1>

            {loading ? (
                <div className="p-12 text-center text-ink-mid">
                    <div className="spinner mx-auto mb-4"></div>
                    Loading conversations...
                </div>
            ) : conversations.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <MessageSquare size={40} className="mx-auto mb-4 text-ink-low" />
                    <p className="mb-2 text-base text-ink-mid">No conversations yet</p>
                    <p className="text-[0.85rem] text-ink-low">
                        Messages will appear here when you connect with a coach or trainee.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {conversations.map(convo => (
                        <button
                            key={convo.partnerId}
                            onClick={() => setSelectedPartner({ id: convo.partnerId, name: convo.partnerName })}
                            className={`glass-card glass-card-hover flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left ${
                                convo.unreadCount > 0 ? '!border-brand/30 !bg-[var(--brand-glow-soft)]' : ''
                            }`}
                        >
                            {/* Avatar */}
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]">
                                {convo.partnerName[0].toUpperCase()}
                                {convo.unreadCount > 0 && (
                                    <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface-0)] bg-brand" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex justify-between">
                                    <span
                                        className={`text-[0.95rem] ${
                                            convo.unreadCount > 0
                                                ? 'font-semibold text-ink-hi'
                                                : 'font-medium text-ink-mid'
                                        }`}
                                    >
                                        {convo.partnerName}
                                    </span>
                                    <span className="shrink-0 text-xs text-ink-low">
                                        {timeAgo(convo.lastMessageAt)}
                                    </span>
                                </div>
                                <p
                                    className={`m-0 truncate text-[0.85rem] ${
                                        convo.unreadCount > 0 ? 'text-ink-mid' : 'text-ink-low'
                                    }`}
                                >
                                    {convo.lastMessage}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
