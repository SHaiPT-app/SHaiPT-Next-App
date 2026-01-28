import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
}))

// Mock supabaseDb - must define mock inside factory since jest.mock is hoisted
jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: {
            getAll: jest.fn(),
            getById: jest.fn(),
        },
        userFollows: {
            getFollowing: jest.fn(),
            getFollowers: jest.fn(),
            follow: jest.fn(),
            unfollow: jest.fn(),
            isFollowing: jest.fn(),
        },
        activityPosts: {
            getGlobalFeed: jest.fn(),
            getFollowedFeed: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        postLikes: {
            getByPost: jest.fn(),
            like: jest.fn(),
            unlike: jest.fn(),
            hasLiked: jest.fn(),
        },
        postComments: {
            getByPost: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        workoutLogs: {
            getById: jest.fn(),
        },
    },
}))

// Import after mocks are set up
import FeedPage from '@/app/feed/page'
import { db } from '@/lib/supabaseDb'

// Cast db methods to jest.Mock for type safety
const mockDb = db as {
    profiles: { getAll: jest.Mock; getById: jest.Mock };
    userFollows: { getFollowing: jest.Mock; getFollowers: jest.Mock; follow: jest.Mock; unfollow: jest.Mock; isFollowing: jest.Mock };
    activityPosts: { getGlobalFeed: jest.Mock; getFollowedFeed: jest.Mock; create: jest.Mock; delete: jest.Mock };
    postLikes: { getByPost: jest.Mock; like: jest.Mock; unlike: jest.Mock; hasLiked: jest.Mock };
    postComments: { getByPost: jest.Mock; create: jest.Mock; delete: jest.Mock };
    workoutLogs: { getById: jest.Mock };
}

// Test data
const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    username: 'testuser',
    workout_privacy: 'public' as const,
}

const mockOtherUser = {
    id: 'user-2',
    email: 'other@example.com',
    full_name: 'Other User',
    username: 'otheruser',
    workout_privacy: 'public' as const,
}

const mockPost = {
    id: 'post-1',
    user_id: 'user-2',
    post_type: 'workout_completed' as const,
    content: 'Finished leg day!',
    visibility: 'public' as const,
    created_at: new Date().toISOString(),
    workout_log_id: 'log-1',
}

const mockPrPost = {
    id: 'post-2',
    user_id: 'user-2',
    post_type: 'pr_achieved' as const,
    content: 'New bench press PR: 225 lbs!',
    visibility: 'followers' as const,
    created_at: new Date().toISOString(),
}

const mockOwnPost = {
    id: 'post-3',
    user_id: 'user-1',
    post_type: 'manual' as const,
    content: 'Feeling strong today!',
    visibility: 'public' as const,
    created_at: new Date().toISOString(),
}

const mockWorkoutLog = {
    id: 'log-1',
    user_id: 'user-2',
    date: '2025-01-15',
    total_duration_seconds: 3600,
    exercise_logs: [
        { exercise_id: 'ex-1', sets: [{}, {}, {}], total_sets: 3, total_reps: 30, max_weight: 100 },
        { exercise_id: 'ex-2', sets: [{}, {}], total_sets: 2, total_reps: 20, max_weight: 80 },
    ],
}

const mockComment = {
    id: 'comment-1',
    post_id: 'post-1',
    user_id: 'user-1',
    content: 'Great workout!',
    created_at: new Date().toISOString(),
}

// Helper to setup default mocks
function setupDefaultMocks() {
    const localStorageMock = {
        getItem: jest.fn((key: string) => {
            if (key === 'user') return JSON.stringify(mockUser)
            return null
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

    mockDb.userFollows.getFollowing.mockResolvedValue([])
    mockDb.profiles.getAll.mockResolvedValue([mockOtherUser])
    mockDb.profiles.getById.mockImplementation(async (id: string) => {
        if (id === 'user-1') return mockUser
        if (id === 'user-2') return mockOtherUser
        return null
    })
    mockDb.activityPosts.getGlobalFeed.mockResolvedValue([mockPost])
    mockDb.activityPosts.getFollowedFeed.mockResolvedValue([])
    mockDb.postLikes.getByPost.mockResolvedValue([])
    mockDb.postComments.getByPost.mockResolvedValue([])
    mockDb.workoutLogs.getById.mockResolvedValue(mockWorkoutLog)
    mockDb.activityPosts.delete.mockResolvedValue(undefined)
    mockDb.postLikes.like.mockResolvedValue({ post_id: 'post-1', user_id: 'user-1' })
    mockDb.postLikes.unlike.mockResolvedValue(undefined)
    mockDb.postComments.create.mockResolvedValue({ id: 'new-comment', post_id: 'post-1', user_id: 'user-1', content: 'Nice!' })
    mockDb.postComments.delete.mockResolvedValue(undefined)
    mockDb.userFollows.follow.mockResolvedValue({ follower_id: 'user-1', following_id: 'user-2' })
    mockDb.userFollows.unfollow.mockResolvedValue(undefined)
}

describe('FeedPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupDefaultMocks()
    })

    it('renders the feed page with header and filter tabs', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Feed')).toBeInTheDocument()
        })
        expect(screen.getByText('See what your community is up to')).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Following' })).toBeInTheDocument()
    })

    it('loads and displays posts from global feed', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })
        expect(screen.getAllByText('Other User').length).toBeGreaterThanOrEqual(1)
        expect(mockDb.activityPosts.getGlobalFeed).toHaveBeenCalled()
    })

    it('switches to following feed when tab is clicked', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Feed')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('tab', { name: 'Following' }))
        })

        await waitFor(() => {
            expect(mockDb.activityPosts.getFollowedFeed).toHaveBeenCalledWith('user-1')
        })
    })

    it('displays workout stats for workout_completed posts', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Exercises')).toBeInTheDocument()
        })
        expect(screen.getByText('Sets')).toBeInTheDocument()
        expect(screen.getByText('Duration')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('60m')).toBeInTheDocument()
    })

    it('displays PR posts with special styling', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([mockPrPost])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('NEW PR!')).toBeInTheDocument()
            expect(screen.getByText('New bench press PR: 225 lbs!')).toBeInTheDocument()
        })
    })

    it('shows visibility badge on posts', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            const badge = screen.getByTestId('visibility-badge')
            expect(badge).toHaveTextContent('Public')
        })
    })

    it('shows followers visibility badge', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([mockPrPost])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            const badge = screen.getByTestId('visibility-badge')
            expect(badge).toHaveTextContent('Followers')
        })
    })

    it('shows empty state message when no posts', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('No activity yet')).toBeInTheDocument()
            expect(screen.getByText('Complete a workout to share your progress!')).toBeInTheDocument()
        })
    })

    it('shows following-specific empty state when in following tab', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([])
        mockDb.activityPosts.getFollowedFeed.mockResolvedValue([])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Feed')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('tab', { name: 'Following' }))
        })

        await waitFor(() => {
            expect(screen.getByText('Follow users to see their activity here!')).toBeInTheDocument()
        })
    })

    it('shows suggested users section', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Suggested Users')).toBeInTheDocument()
            expect(screen.getAllByText('Other User').length).toBeGreaterThanOrEqual(1)
        })
    })

    it('handles like on a post', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Like post'))
        })

        await waitFor(() => {
            expect(mockDb.postLikes.like).toHaveBeenCalledWith('post-1', 'user-1')
        })
    })

    it('handles unlike on a liked post', async () => {
        mockDb.postLikes.getByPost.mockResolvedValue([{ post_id: 'post-1', user_id: 'user-1' }])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByLabelText('Unlike post')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Unlike post'))
        })

        await waitFor(() => {
            expect(mockDb.postLikes.unlike).toHaveBeenCalledWith('post-1', 'user-1')
        })
    })

    it('toggles comments section visibility', async () => {
        mockDb.postComments.getByPost.mockResolvedValue([mockComment])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument()

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Toggle comments'))
        })

        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
        expect(screen.getByText('Great workout!')).toBeInTheDocument()
    })

    it('submits a new comment', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Toggle comments'))
        })

        const input = screen.getByPlaceholderText('Add a comment...')
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Nice workout!' } })
        })

        await act(async () => {
            fireEvent.click(screen.getByText('Post'))
        })

        await waitFor(() => {
            expect(mockDb.postComments.create).toHaveBeenCalledWith({
                post_id: 'post-1',
                user_id: 'user-1',
                content: 'Nice workout!',
            })
        })
    })

    it('does not submit empty comment', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Toggle comments'))
        })

        const postButton = screen.getByText('Post')
        expect(postButton).toBeDisabled()
    })

    it('handles follow from suggested users', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Suggested Users')).toBeInTheDocument()
        })

        // Multiple Follow buttons may exist (suggested users + post header)
        const followBtns = screen.getAllByLabelText('Follow Other User')
        // First one is in the suggested users section
        await act(async () => {
            fireEvent.click(followBtns[0])
        })

        await waitFor(() => {
            expect(mockDb.userFollows.follow).toHaveBeenCalledWith('user-1', 'user-2')
        })
    })

    it('handles follow/unfollow from post header', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        // There will be two Follow buttons - one in suggested users, one in post header
        // Use getAllByLabelText and pick the one in the post header (second one if suggested users also has one)
        const followBtns = screen.getAllByLabelText('Follow Other User')
        const postFollowBtn = followBtns[followBtns.length - 1]
        expect(postFollowBtn).toBeInTheDocument()

        await act(async () => {
            fireEvent.click(postFollowBtn)
        })

        await waitFor(() => {
            expect(mockDb.userFollows.follow).toHaveBeenCalledWith('user-1', 'user-2')
        })
    })

    it('shows unfollow button when already following', async () => {
        mockDb.userFollows.getFollowing.mockResolvedValue([
            { follower_id: 'user-1', following_id: 'user-2' },
        ])
        // When following, the user won't appear in suggestions
        mockDb.profiles.getAll.mockResolvedValue([mockOtherUser])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        const unfollowBtn = screen.getByLabelText('Unfollow Other User')
        expect(unfollowBtn).toBeInTheDocument()

        await act(async () => {
            fireEvent.click(unfollowBtn)
        })

        await waitFor(() => {
            expect(mockDb.userFollows.unfollow).toHaveBeenCalledWith('user-1', 'user-2')
        })
    })

    it('shows delete option for own posts', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([mockOwnPost])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Feeling strong today!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Post options'))
        })

        expect(screen.getByTestId('delete-post-btn')).toBeInTheDocument()

        await act(async () => {
            fireEvent.click(screen.getByTestId('delete-post-btn'))
        })

        await waitFor(() => {
            expect(mockDb.activityPosts.delete).toHaveBeenCalledWith('post-3')
        })
    })

    it('does not show post options for other users posts', async () => {
        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        expect(screen.queryByLabelText('Post options')).not.toBeInTheDocument()
    })

    it('does not show follow button on own posts', async () => {
        mockDb.activityPosts.getGlobalFeed.mockResolvedValue([mockOwnPost])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Feeling strong today!')).toBeInTheDocument()
        })

        expect(screen.queryByLabelText(/Follow Test User/)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/Unfollow Test User/)).not.toBeInTheDocument()
    })

    it('shows delete button for own comments', async () => {
        mockDb.postComments.getByPost.mockResolvedValue([mockComment])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Toggle comments'))
        })

        expect(screen.getByLabelText('Delete comment')).toBeInTheDocument()

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Delete comment'))
        })

        await waitFor(() => {
            expect(mockDb.postComments.delete).toHaveBeenCalledWith('comment-1')
        })
    })

    it('does not show delete button for other users comments', async () => {
        mockDb.postComments.getByPost.mockResolvedValue([
            { ...mockComment, user_id: 'user-2' },
        ])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByText('Finished leg day!')).toBeInTheDocument()
        })

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Toggle comments'))
        })

        expect(screen.queryByLabelText('Delete comment')).not.toBeInTheDocument()
    })

    it('handles no user in localStorage', async () => {
        const localStorageMock = {
            getItem: jest.fn(() => null),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
            length: 0,
            key: jest.fn(),
        }
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

        await act(async () => {
            render(<FeedPage />)
        })

        expect(screen.queryByText('Finished leg day!')).not.toBeInTheDocument()
    })

    it('displays like count correctly', async () => {
        mockDb.postLikes.getByPost.mockResolvedValue([
            { post_id: 'post-1', user_id: 'user-3' },
            { post_id: 'post-1', user_id: 'user-4' },
        ])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByTestId('like-count')).toHaveTextContent('2')
        })
    })

    it('displays comment count correctly', async () => {
        mockDb.postComments.getByPost.mockResolvedValue([
            { id: 'c-1', post_id: 'post-1', user_id: 'user-2', content: 'Comment 1' },
            { id: 'c-2', post_id: 'post-1', user_id: 'user-3', content: 'Comment 2' },
            { id: 'c-3', post_id: 'post-1', user_id: 'user-4', content: 'Comment 3' },
        ])

        await act(async () => {
            render(<FeedPage />)
        })

        await waitFor(() => {
            expect(screen.getByTestId('comment-count')).toHaveTextContent('3')
        })
    })
})
