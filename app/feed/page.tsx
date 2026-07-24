'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabaseDb';
import type { ActivityPost, Profile, WorkoutLog, PostComment, PostVisibility } from '@/lib/types';

// ============================================
// TYPES
// ============================================

interface ActivityPostWithDetails extends ActivityPost {
    user?: Profile;
    workout_log?: WorkoutLog & {
        exercise_logs?: Array<{
            exercise_id: string;
            sets: unknown[];
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

type FeedFilter = 'all' | 'following';

// ============================================
// MAIN FEED PAGE
// ============================================

export default function FeedPage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<ActivityPostWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FeedFilter>('all');
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
    const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const loadFollowing = useCallback(async (userId: string) => {
        try {
            const following = await db.userFollows.getFollowing(userId);
            setFollowingIds(new Set(following.map(f => f.following_id)));
        } catch (error) {
            console.error('Error loading following:', error);
        }
    }, []);

    const loadSuggestedUsers = useCallback(async (userId: string, currentFollowingIds: Set<string>) => {
        try {
            const allProfiles = await db.profiles.getAll();
            const suggestions = allProfiles
                .filter(p => p.id !== userId && !currentFollowingIds.has(p.id))
                .slice(0, 5);
            setSuggestedUsers(suggestions);
        } catch (error) {
            console.error('Error loading suggested users:', error);
        }
    }, []);

    const loadPosts = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);

            const activityPosts = filter === 'following'
                ? await db.activityPosts.getFollowedFeed(user.id)
                : await db.activityPosts.getGlobalFeed();

            const enrichedPosts = await Promise.all(
                activityPosts.map(async (post) => {
                    const [postUser, workout, likes, comments] = await Promise.all([
                        db.profiles.getById(post.user_id),
                        post.workout_log_id ? db.workoutLogs.getById(post.workout_log_id) : null,
                        db.postLikes.getByPost(post.id),
                        db.postComments.getByPost(post.id)
                    ]);

                    const enrichedComments = await Promise.all(
                        comments.map(async (comment) => ({
                            ...comment,
                            user: await db.profiles.getById(comment.user_id)
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
                    } as ActivityPostWithDetails;
                })
            );

            enrichedPosts.sort((a, b) =>
                new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
            );

            setPosts(enrichedPosts);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    }, [user, filter]);

    useEffect(() => {
        if (user) {
            loadFollowing(user.id);
        }
    }, [user, loadFollowing]);

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [user, filter, loadPosts]);

    useEffect(() => {
        if (user && followingIds.size >= 0) {
            loadSuggestedUsers(user.id, followingIds);
        }
    }, [user, followingIds, loadSuggestedUsers]);

    const handleLike = async (postId: string) => {
        if (!user) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        try {
            if (post.is_liked) {
                await db.postLikes.unlike(postId, user.id);
            } else {
                await db.postLikes.like(postId, user.id);
            }
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
            await loadPosts();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await db.postComments.delete(commentId);
            await loadPosts();
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleFollow = async (targetUserId: string) => {
        if (!user) return;

        setFollowLoading(prev => new Set(prev).add(targetUserId));
        try {
            await db.userFollows.follow(user.id, targetUserId);
            setFollowingIds(prev => new Set(prev).add(targetUserId));
            setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
        } catch (error) {
            console.error('Error following user:', error);
        } finally {
            setFollowLoading(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        }
    };

    const handleUnfollow = async (targetUserId: string) => {
        if (!user) return;

        setFollowLoading(prev => new Set(prev).add(targetUserId));
        try {
            await db.userFollows.unfollow(user.id, targetUserId);
            setFollowingIds(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        } catch (error) {
            console.error('Error unfollowing user:', error);
        } finally {
            setFollowLoading(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await db.activityPosts.delete(postId);
            await loadPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    if (loading && !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[600px] p-6 pb-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="display text-gradient-brand mb-2 text-[2rem]">
                    Feed
                </h1>
                <p className="text-sm text-ink-mid">
                    See what your community is up to
                </p>
            </div>

            {/* Filter Tabs */}
            <div
                className="mb-6 flex gap-2 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1"
                role="tablist"
                aria-label="Feed filter"
            >
                {(['all', 'following'] as const).map(tab => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={filter === tab}
                        onClick={() => setFilter(tab)}
                        className={`flex-1 cursor-pointer rounded-lg py-3 text-sm transition-all ${
                            filter === tab
                                ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                                : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                        }`}
                    >
                        {tab === 'all' ? 'All' : 'Following'}
                    </button>
                ))}
            </div>

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
                <div className="glass-card mb-6 p-4">
                    <h3 className="eyebrow mb-3">
                        Suggested Users
                    </h3>
                    <div className="flex flex-col gap-3">
                        {suggestedUsers.map(suggestedUser => (
                            <div key={suggestedUser.id} className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[0.85rem] font-semibold text-ink-hi">
                                    {suggestedUser.full_name?.charAt(0) || suggestedUser.username?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[0.9rem] font-semibold text-ink-hi">
                                        {suggestedUser.full_name || suggestedUser.username || 'Unknown'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(suggestedUser.id)}
                                    disabled={followLoading.has(suggestedUser.id)}
                                    aria-label={`Follow ${suggestedUser.full_name || suggestedUser.username}`}
                                    className="btn-brand !px-3 !py-1.5 !text-[0.8rem]"
                                >
                                    {followLoading.has(suggestedUser.id) ? '...' : 'Follow'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Posts Feed */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="spinner" />
                </div>
            ) : posts.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="mb-2 text-ink-mid">No activity yet</p>
                    <p className="text-sm text-ink-low">
                        {filter === 'following'
                            ? 'Follow users to see their activity here!'
                            : 'Complete a workout to share your progress!'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={user?.id || ''}
                            isFollowing={followingIds.has(post.user_id)}
                            followLoading={followLoading.has(post.user_id)}
                            onLike={handleLike}
                            onComment={handleComment}
                            onDeleteComment={handleDeleteComment}
                            onFollow={handleFollow}
                            onUnfollow={handleUnfollow}
                            onDeletePost={handleDeletePost}
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
    isFollowing: boolean;
    followLoading: boolean;
    onLike: (postId: string) => void;
    onComment: (postId: string, content: string) => void;
    onDeleteComment: (commentId: string) => void;
    onFollow: (userId: string) => void;
    onUnfollow: (userId: string) => void;
    onDeletePost: (postId: string) => void;
}

function PostCard({
    post,
    currentUserId,
    isFollowing,
    followLoading,
    onLike,
    onComment,
    onDeleteComment,
    onFollow,
    onUnfollow,
    onDeletePost,
}: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const isOwnPost = post.user_id === currentUserId;

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

    const getVisibilityLabel = (visibility: PostVisibility) => {
        switch (visibility) {
            case 'public': return 'Public';
            case 'followers': return 'Followers';
            case 'private': return 'Private';
            default: return '';
        }
    };

    return (
        <div className="glass-card p-6">
            {/* Post Header */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[1.1rem] font-semibold text-ink-hi">
                    {post.user?.full_name?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-hi">
                            {post.user?.full_name || post.user?.username || 'Unknown User'}
                        </span>
                        {!isOwnPost && (
                            <button
                                onClick={() => isFollowing ? onUnfollow(post.user_id) : onFollow(post.user_id)}
                                disabled={followLoading}
                                aria-label={isFollowing ? `Unfollow ${post.user?.full_name || post.user?.username}` : `Follow ${post.user?.full_name || post.user?.username}`}
                                className={`cursor-pointer rounded-md px-2 py-0.5 text-[0.7rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isFollowing
                                        ? 'border border-[var(--line-strong)] bg-[var(--surface-2)] text-ink-mid hover:text-ink-hi'
                                        : 'bg-brand text-ink-hi shadow-[0_0_12px_var(--brand-glow-soft)] hover:bg-brand-hot'
                                }`}
                            >
                                {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[0.85rem] text-ink-mid">
                        <span>{getTimeAgo(post.created_at || '')}</span>
                        <span
                            className="rounded bg-[var(--surface-2)] px-1.5 py-[1px] text-[0.7rem] text-ink-low"
                            data-testid="visibility-badge"
                        >
                            {getVisibilityLabel(post.visibility)}
                        </span>
                    </div>
                </div>

                {/* Post menu for own posts */}
                {isOwnPost && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            aria-label="Post options"
                            className="cursor-pointer bg-transparent p-1 text-[1.2rem] text-ink-mid transition-colors hover:text-ink-hi"
                        >
                            &#8942;
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full z-10 min-w-[120px] rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                                <button
                                    onClick={() => {
                                        onDeletePost(post.id);
                                        setShowMenu(false);
                                    }}
                                    data-testid="delete-post-btn"
                                    className="block w-full cursor-pointer rounded-lg bg-transparent px-3 py-2 text-left text-[0.85rem] text-destructive transition-colors hover:bg-destructive/10"
                                >
                                    Delete Post
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Post Content */}
            {post.post_type === 'pr_achieved' && (
                <div>
                    <div className="mb-4 rounded-xl border-2 border-brand bg-[var(--brand-glow-soft)] p-6">
                        <div className="font-display mb-2 text-center text-2xl font-bold text-brand">
                            NEW PR!
                        </div>
                        <p className="text-center text-[1.1rem] text-ink-hi">
                            {post.content}
                        </p>
                    </div>
                </div>
            )}

            {post.post_type === 'workout_completed' && (
                <div>
                    <p className="mb-4 text-ink-hi">{post.content}</p>
                    {post.workout_log && (
                        <div className="rounded-2xl border border-brand/30 bg-[var(--brand-glow-soft)] p-4">
                            <div className="flex justify-around text-center">
                                <div>
                                    <div className="font-display text-2xl font-semibold text-brand">
                                        {post.workout_log.exercise_logs?.length || 0}
                                    </div>
                                    <div className="text-xs text-ink-mid">Exercises</div>
                                </div>
                                <div>
                                    <div className="font-display text-2xl font-semibold text-brand">
                                        {post.workout_log.exercise_logs?.reduce(
                                            (sum, log) => sum + (log.sets?.length || log.total_sets || 0), 0
                                        ) || 0}
                                    </div>
                                    <div className="text-xs text-ink-mid">Sets</div>
                                </div>
                                <div>
                                    <div className="font-display text-2xl font-semibold text-brand">
                                        {Math.floor((post.workout_log.total_duration_seconds || 0) / 60)}m
                                    </div>
                                    <div className="text-xs text-ink-mid">Duration</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {post.post_type === 'manual' && (
                <p className="mb-4 text-ink-hi">{post.content}</p>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-6 border-t border-[var(--line-soft)] pt-4">
                <button
                    onClick={() => onLike(post.id)}
                    aria-label={post.is_liked ? 'Unlike post' : 'Like post'}
                    className={`flex cursor-pointer items-center gap-2 bg-transparent text-[0.9rem] transition-colors ${
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
                        aria-hidden="true"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span data-testid="like-count">{post.likes_count || 0}</span>
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    aria-label="Toggle comments"
                    className="flex cursor-pointer items-center gap-2 bg-transparent text-[0.9rem] text-ink-mid transition-colors hover:text-ink-hi"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span data-testid="comment-count">{post.comments_count || 0}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
                    {post.comments && post.comments.length > 0 && (
                        <div className="mb-4">
                            {post.comments.map(comment => (
                                <div key={comment.id} className="mb-3">
                                    <div className="flex gap-2">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[0.7rem] font-semibold text-ink-hi">
                                            {comment.user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[0.85rem] font-semibold text-ink-hi">
                                                {comment.user?.full_name || comment.user?.username}
                                            </span>
                                            <p className="my-1 text-[0.9rem] text-ink-mid">{comment.content}</p>
                                        </div>
                                        {comment.user_id === currentUserId && (
                                            <button
                                                onClick={() => onDeleteComment(comment.id)}
                                                aria-label="Delete comment"
                                                className="cursor-pointer bg-transparent p-1 text-xs text-ink-low transition-colors hover:text-destructive"
                                            >
                                                x
                                            </button>
                                        )}
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
                            className="min-w-0 flex-1 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-ink-hi placeholder:text-ink-low outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                            aria-label="Comment input"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="btn-brand !px-4 !py-2 !text-sm"
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
