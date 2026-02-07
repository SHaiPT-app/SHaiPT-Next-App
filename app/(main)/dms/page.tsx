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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // If a conversation is selected, show the thread
    if (selectedPartner) {
        return (
            <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto', height: 'calc(100vh - 100px)' }}>
                <button
                    onClick={() => {
                        setSelectedPartner(null);
                        fetchConversations(); // Refresh on back
                    }}
                    style={{
                        background: 'rgba(255, 102, 0, 0.15)',
                        border: '1px solid rgba(255, 102, 0, 0.3)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#FF6600',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                    }}
                >
                    <ArrowLeft size={18} />
                    Back
                </button>
                <div style={{ height: 'calc(100% - 60px)', borderRadius: '12px', overflow: 'hidden' }}>
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
        <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
            <h1 style={{
                fontFamily: 'var(--font-orbitron)',
                fontSize: '1.5rem',
                color: 'var(--primary)',
                marginBottom: '1.5rem',
            }}>
                Messages
            </h1>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    Loading conversations...
                </div>
            ) : conversations.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    <MessageSquare size={40} color="#555" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No conversations yet</p>
                    <p style={{ fontSize: '0.85rem' }}>
                        Messages will appear here when you connect with a coach or trainee.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {conversations.map(convo => (
                        <button
                            key={convo.partnerId}
                            onClick={() => setSelectedPartner({ id: convo.partnerId, name: convo.partnerName })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem 1.25rem',
                                background: convo.unreadCount > 0
                                    ? 'rgba(255, 102, 0, 0.04)'
                                    : 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '100%',
                                textAlign: 'left',
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                fontWeight: '700',
                                color: 'white',
                                flexShrink: 0,
                                position: 'relative',
                            }}>
                                {convo.partnerName[0].toUpperCase()}
                                {convo.unreadCount > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: '#FF6600',
                                        border: '2px solid rgba(21, 21, 31, 1)',
                                    }} />
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                    <span style={{
                                        fontWeight: convo.unreadCount > 0 ? '600' : '500',
                                        color: convo.unreadCount > 0 ? 'white' : '#ccc',
                                        fontSize: '0.95rem',
                                    }}>
                                        {convo.partnerName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', flexShrink: 0 }}>
                                        {timeAgo(convo.lastMessageAt)}
                                    </span>
                                </div>
                                <p style={{
                                    color: convo.unreadCount > 0 ? '#bbb' : '#888',
                                    fontSize: '0.85rem',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
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
