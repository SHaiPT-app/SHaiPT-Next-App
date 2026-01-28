'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { db } from '@/lib/supabaseDb';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import type { ActivityPost, Profile, WorkoutLog, PostComment } from '@/lib/types';

interface ActivityPostWithDetails extends ActivityPost {
    user?: Profile;
    workout_log?: WorkoutLog & {
        exercise_logs?: Array<{
            exercise_id: string;
            sets: any[];
            total_sets?: number;
            total_reps?: number;
            max_weight?: number;
        }>;
    };
    likes_count?: number;
    comments_count?: number;
    is_liked?: boolean;
    comments?: (PostComment & { user?: Profile })[];
}

export default function ActivityPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<ActivityPostWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'following'>('all');

    useEffect(() => {
        initializePage();
    }, []);

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [user, filter]);

    const initializePage = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    };

    const loadPosts = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            // Get posts based on filter
            const activityPosts = filter === 'following'
                ? await db.activityPosts.getFollowedFeed(user.id)
                : await db.activityPosts.getGlobalFeed();

            // Enrich posts with user, workout, likes, comments
            const enrichedPosts = await Promise.all(
                activityPosts.map(async (post) => {
                    const [postUser, workout, likes, comments] = await Promise.all([
                        db.profiles.getById(post.user_id),
                        post.workout_log_id ? db.workoutLogs.getById(post.workout_log_id) : null,
                        db.postLikes.getByPost(post.id),
                        db.postComments.getByPost(post.id)
                    ]);

                    // Get comment user details
                    const enrichedComments = await Promise.all(
                        comments.map(async (comment) => ({
                            ...comment,
                            user: (await db.profiles.getById(comment.user_id)) || undefined
                        }))
                    );

                    return {
                        ...post,
                        user: postUser || undefined,
                        workout_log: workout || undefined,
                        likes_count: likes.length,
                        comments_count: comments.length,
                        is_liked: likes.some(like => like.user_id === user.id),
                        comments: enrichedComments
                    };
                })
            );

            // Sort by newest first
            enrichedPosts.sort((a, b) =>
                new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
            );

            setPosts(enrichedPosts);
        } catch (err) {
            console.error('Error loading posts:', err);
            setError('Failed to load activity feed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId: string) => {
        if (!user) return;

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        try {
            if (post.is_liked) {
                // Unlike
                await db.postLikes.unlike(postId, user.id);
            } else {
                // Like
                await db.postLikes.like(postId, user.id);
            }

            // Reload posts to update counts
            await loadPosts();
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleComment = async (postId: string, content: string) => {
        if (!user || !content.trim()) return;

        try {
            await db.postComments.create({
                post_id: postId,
                user_id: user.id,
                content: content.trim()
            });

            // Reload posts to show new comment
            await loadPosts();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                }}>
                    Activity
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    See what your community is up to
                </p>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '0.25rem'
            }}>
                <button
                    onClick={() => setFilter('all')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: filter === 'all' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: filter === 'all' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: filter === 'all' ? '600' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('following')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: filter === 'following' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: filter === 'following' ? 'white' : '#888',
                        cursor: 'pointer',
                        fontWeight: filter === 'following' ? '600' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    Following
                </button>
            </div>

            {/* Error State */}
            {error && (
                <ErrorState message={error} onRetry={loadPosts} />
            )}

            {/* Posts Feed */}
            {!error && posts.length === 0 ? (
                <EmptyState
                    icon={Activity}
                    title="No activity yet"
                    description="Complete a workout to share your progress with the community!"
                />
            ) : !error && (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={user?.id || ''}
                            onLike={handleLike}
                            onComment={handleComment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// POST CARD COMPONENT
// ============================================

interface PostCardProps {
    post: ActivityPostWithDetails;
    currentUserId: string;
    onLike: (postId: string) => void;
    onComment: (postId: string, content: string) => void;
}

function PostCard({ post, currentUserId, onLike, onComment }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            onComment(post.id, commentText);
            setCommentText('');
        }
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const postDate = new Date(date);
        const seconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return postDate.toLocaleDateString();
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {/* Post Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), #ff6b35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '1.1rem'
                }}>
                    {post.user?.full_name?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>
                        {post.user?.full_name || post.user?.username || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {getTimeAgo(post.created_at || '')}
                    </div>
                </div>
            </div>

            {/* Post Content */}
            {post.post_type === 'pr_achieved' && (
                <div>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(242, 95, 41, 0.2), rgba(255, 107, 53, 0.2))',
                        border: '2px solid var(--primary)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            fontSize: '1.5rem',
                            fontFamily: 'var(--font-orbitron)',
                            color: 'var(--primary)',
                            marginBottom: '0.5rem',
                            textAlign: 'center'
                        }}>
                            NEW PR!
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            {post.content}
                        </p>
                    </div>
                </div>
            )}

            {post.post_type === 'workout_completed' && post.workout_log && (
                <div>
                    <p style={{ marginBottom: '1rem' }}>{post.content}</p>

                    {/* Workout Summary */}
                    <div className="glass-panel" style={{
                        padding: '1rem',
                        background: 'rgba(242, 95, 41, 0.05)',
                        border: '1px solid rgba(242, 95, 41, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                                    {post.workout_log.exercise_logs?.length || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Exercises</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                                    {post.workout_log.exercise_logs?.reduce((sum, log) => sum + (log.sets?.length || log.total_sets || 0), 0) || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Sets</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                                    {Math.floor(((post.workout_log.total_duration_seconds || 0) / 60))}m
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Duration</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <button
                    onClick={() => onLike(post.id)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: post.is_liked ? 'var(--primary)' : '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={post.is_liked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {post.likes_count || 0}
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {post.comments_count || 0}
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {/* Existing Comments */}
                    {post.comments && post.comments.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            {post.comments.map(comment => (
                                <div key={comment.id} style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), #ff6b35)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            flexShrink: 0
                                        }}>
                                            {comment.user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                                                {comment.user?.full_name || comment.user?.username}
                                            </span>
                                            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comment Form */}
                    <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="input-field"
                            style={{ flex: 1 }}
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            style={{
                                padding: '0.5rem 1rem',
                                background: commentText.trim() ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
