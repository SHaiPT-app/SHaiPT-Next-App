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
            <div className="flex min-h-screen items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[600px] p-6 pb-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="display text-gradient-brand mb-2 text-[2rem]">
                    Activity
                </h1>
                <p className="text-sm text-ink-mid">
                    See what your community is up to
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 flex gap-2 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1">
                <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 cursor-pointer rounded-lg py-3 transition-all ${
                        filter === 'all'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('following')}
                    className={`flex-1 cursor-pointer rounded-lg py-3 transition-all ${
                        filter === 'following'
                            ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                            : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                    }`}
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
                <div className="grid gap-6">
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
        <div className="glass-card p-6">
            {/* Post Header */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[1.1rem] font-semibold text-ink-hi">
                    {post.user?.full_name?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                    <div className="font-semibold text-ink-hi">
                        {post.user?.full_name || post.user?.username || 'Unknown User'}
                    </div>
                    <div className="text-sm text-ink-low">
                        {getTimeAgo(post.created_at || '')}
                    </div>
                </div>
            </div>

            {/* Post Content */}
            {post.post_type === 'pr_achieved' && (
                <div>
                    <div className="mb-4 rounded-xl border-2 border-brand bg-[var(--brand-glow-soft)] p-6 shadow-[0_0_24px_var(--brand-glow-soft)]">
                        <div className="font-display mb-2 text-center text-2xl font-bold text-brand">
                            NEW PR!
                        </div>
                        <p className="mb-2 text-center text-[1.1rem]">
                            {post.content}
                        </p>
                    </div>
                </div>
            )}

            {post.post_type === 'workout_completed' && post.workout_log && (
                <div>
                    <p className="mb-4">{post.content}</p>

                    {/* Workout Summary */}
                    <div className="glass-card !border-brand/20 !bg-[var(--brand-glow-soft)] p-4">
                        <div className="flex justify-around text-center">
                            <div>
                                <div className="text-2xl font-semibold text-brand">
                                    {post.workout_log.exercise_logs?.length || 0}
                                </div>
                                <div className="text-xs text-ink-low">Exercises</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold text-brand">
                                    {post.workout_log.exercise_logs?.reduce((sum, log) => sum + (log.sets?.length || log.total_sets || 0), 0) || 0}
                                </div>
                                <div className="text-xs text-ink-low">Sets</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold text-brand">
                                    {Math.floor(((post.workout_log.total_duration_seconds || 0) / 60))}m
                                </div>
                                <div className="text-xs text-ink-low">Duration</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-6 border-t border-line-soft pt-4">
                <button
                    onClick={() => onLike(post.id)}
                    className={`flex cursor-pointer items-center gap-2 bg-transparent text-sm transition-colors ${
                        post.is_liked ? 'text-brand' : 'text-ink-mid hover:text-brand'
                    }`}
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
                    className="flex cursor-pointer items-center gap-2 bg-transparent text-sm text-ink-mid transition-colors hover:text-brand"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {post.comments_count || 0}
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 border-t border-line-soft pt-4">
                    {/* Existing Comments */}
                    {post.comments && post.comments.length > 0 && (
                        <div className="mb-4">
                            {post.comments.map(comment => (
                                <div key={comment.id} className="mb-3">
                                    <div className="flex gap-2">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[0.7rem] text-ink-hi">
                                            {comment.user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-sm font-semibold text-ink-hi">
                                                {comment.user?.full_name || comment.user?.username}
                                            </span>
                                            <p className="my-1 text-sm text-ink-mid">{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comment Form */}
                    <form onSubmit={handleSubmitComment} className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="input-field flex-1"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="btn-brand !px-5 !py-2 !text-sm"
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
