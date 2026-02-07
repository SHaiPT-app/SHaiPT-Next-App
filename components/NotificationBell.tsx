'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, UserPlus, Dumbbell, MessageSquare, Trophy, Heart, AtSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Notification, NotificationType } from '@/lib/types';

interface NotificationBellProps {
    userId: string;
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
    coaching_request: UserPlus,
    coaching_accepted: Check,
    plan_assigned: Dumbbell,
    new_message: MessageSquare,
    pr_achieved: Trophy,
    new_follower: UserPlus,
    post_like: Heart,
    post_comment: MessageSquare,
    mention: AtSign,
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                return { Authorization: `Bearer ${session.access_token}` };
            }
        } catch { /* ignore */ }
        return {};
    }, []);

    const fetchCount = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/notifications?userId=${userId}&countOnly=true`, { headers });
            if (res.ok) {
                const { count } = await res.json();
                setUnreadCount(count);
            }
        } catch {
            // Silently fail
        }
    }, [userId, getAuthHeaders]);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/notifications?userId=${userId}`, { headers });
            if (res.ok) {
                const { notifications: data } = await res.json();
                setNotifications(data || []);
            }
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, [userId, getAuthHeaders]);

    // Poll for unread count
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [fetchCount]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleToggle = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAllRead = async () => {
        try {
            const authHeaders = await getAuthHeaders();
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ userId, markAll: true }),
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {
            // Silently fail
        }
    };

    const handleMarkOneRead = async (notificationId: string) => {
        try {
            const authHeaders = await getAuthHeaders();
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ notificationId }),
            });
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // Silently fail
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                style={{
                    background: isOpen ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#ff4444',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid rgba(21, 21, 31, 1)',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '340px',
                    maxHeight: '420px',
                    background: 'rgba(30, 30, 45, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                    zIndex: 1000,
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'white' }}>
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--neon-orange, #FF6600)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div style={{ overflowY: 'auto', maxHeight: '360px' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.slice(0, 20).map(notification => {
                                const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                handleMarkOneRead(notification.id);
                                            }
                                        }}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            alignItems: 'flex-start',
                                            background: notification.is_read
                                                ? 'transparent'
                                                : 'rgba(255, 102, 0, 0.04)',
                                            cursor: notification.is_read ? 'default' : 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 102, 0, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <IconComponent size={16} color="#FF6600" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontSize: '0.85rem',
                                                color: notification.is_read ? '#999' : 'white',
                                                lineHeight: 1.4,
                                                margin: 0,
                                            }}>
                                                {notification.content}
                                            </p>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#666',
                                                marginTop: '2px',
                                                display: 'block',
                                            }}>
                                                {notification.created_at ? timeAgo(notification.created_at) : ''}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#FF6600',
                                                flexShrink: 0,
                                                marginTop: '6px',
                                            }} />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
