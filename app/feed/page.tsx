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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="spinner" />
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
                    Feed
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
            }} role="tablist" aria-label="Feed filter">
                {(['all', 'following'] as const).map(tab => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={filter === tab}
                        onClick={() => setFilter(tab)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: filter === tab ? 'var(--primary)' : 'transparent',
                            border: 'none',
                            borderRadius: '10px',
                            color: filter === tab ? 'white' : '#888',
                            cursor: 'pointer',
                            fontWeight: filter === tab ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab === 'all' ? 'All' : 'Following'}
                    </button>
                ))}
            </div>

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem' }}>
                        Suggested Users
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {suggestedUsers.map(suggestedUser => (
                            <div key={suggestedUser.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary), #ff6b35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    flexShrink: 0
                                }}>
                                    {suggestedUser.full_name?.charAt(0) || suggestedUser.username?.charAt(0) || 'U'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {suggestedUser.full_name || suggestedUser.username || 'Unknown'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(suggestedUser.id)}
                                    disabled={followLoading.has(suggestedUser.id)}
                                    aria-label={`Follow ${suggestedUser.full_name || suggestedUser.username}`}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: followLoading.has(suggestedUser.id) ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.8rem',
                                        opacity: followLoading.has(suggestedUser.id) ? 0.6 : 1,
                                        transition: 'all 0.2s'
                                    }}
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
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="spinner" />
                </div>
            ) : posts.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: '#888', marginBottom: '0.5rem' }}>No activity yet</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                        {filter === 'following'
                            ? 'Follow users to see their activity here!'
                            : 'Complete a workout to share your progress!'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
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
                    fontSize: '1.1rem',
                    flexShrink: 0
                }}>
                    {post.user?.full_name?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>
                            {post.user?.full_name || post.user?.username || 'Unknown User'}
                        </span>
                        {!isOwnPost && (
                            <button
                                onClick={() => isFollowing ? onUnfollow(post.user_id) : onFollow(post.user_id)}
                                disabled={followLoading}
                                aria-label={isFollowing ? `Unfollow ${post.user?.full_name || post.user?.username}` : `Follow ${post.user?.full_name || post.user?.username}`}
                                style={{
                                    padding: '0.15rem 0.5rem',
                                    background: isFollowing ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: followLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    opacity: followLoading ? 0.6 : 1,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        <span>{getTimeAgo(post.created_at || '')}</span>
                        <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#666'
                        }} data-testid="visibility-badge">
                            {getVisibilityLabel(post.visibility)}
                        </span>
                    </div>
                </div>

                {/* Post menu for own posts */}
                {isOwnPost && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            aria-label="Post options"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#888',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                fontSize: '1.2rem'
                            }}
                        >
                            &#8942;
                        </button>
                        {showMenu && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: '#1e1e2e',
                                borderRadius: '8px',
                                padding: '0.25rem',
                                minWidth: '120px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                zIndex: 10
                            }}>
                                <button
                                    onClick={() => {
                                        onDeletePost(post.id);
                                        setShowMenu(false);
                                    }}
                                    data-testid="delete-post-btn"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '0.5rem 0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#ff4444',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem'
                                    }}
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
                        <p style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                            {post.content}
                        </p>
                    </div>
                </div>
            )}

            {post.post_type === 'workout_completed' && (
                <div>
                    <p style={{ marginBottom: '1rem' }}>{post.content}</p>
                    {post.workout_log && (
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
                                        {post.workout_log.exercise_logs?.reduce(
                                            (sum, log) => sum + (log.sets?.length || log.total_sets || 0), 0
                                        ) || 0}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Sets</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                                        {Math.floor((post.workout_log.total_duration_seconds || 0) / 60)}m
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Duration</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {post.post_type === 'manual' && (
                <p style={{ marginBottom: '1rem' }}>{post.content}</p>
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
                    aria-label={post.is_liked ? 'Unlike post' : 'Like post'}
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
                        aria-hidden="true"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span data-testid="like-count">{post.likes_count || 0}</span>
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    aria-label="Toggle comments"
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span data-testid="comment-count">{post.comments_count || 0}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
                                        {comment.user_id === currentUserId && (
                                            <button
                                                onClick={() => onDeleteComment(comment.id)}
                                                aria-label="Delete comment"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#666',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    padding: '0.25rem'
                                                }}
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
                    <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="input-field"
                            style={{ flex: 1 }}
                            aria-label="Comment input"
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
