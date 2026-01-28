/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDirectMessages } from '@/lib/useDirectMessages';

// Mock Supabase - use require to avoid hoisting issues
jest.mock('@/lib/supabase', () => {
    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn().mockReturnValue({ id: 'channel-1' });
    const mockRemoveChannel = jest.fn();
    return {
        supabase: {
            channel: jest.fn(() => ({
                on: mockOn,
                subscribe: mockSubscribe,
            })),
            removeChannel: mockRemoveChannel,
            from: jest.fn(() => ({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { id: 'msg-1', read_at: '2024-01-01T00:00:00Z' },
                    error: null,
                }),
            })),
        },
        __mockOn: mockOn,
        __mockSubscribe: mockSubscribe,
        __mockRemoveChannel: mockRemoveChannel,
    };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockOn: mockOn, __mockSubscribe: mockSubscribe, __mockRemoveChannel: mockRemoveChannel } = require('@/lib/supabase');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useDirectMessages', () => {
    const defaultProps = {
        userId: 'user-1',
        otherUserId: 'user-2',
        authToken: 'test-token',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    it('fetches messages on mount', async () => {
        const mockMessages = [
            { id: 'msg-1', sender_id: 'user-1', recipient_id: 'user-2', content: 'Hello' },
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messages: mockMessages }),
        });

        const { result } = renderHook(() => useDirectMessages(defaultProps));

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Hello');
        expect(mockFetch).toHaveBeenCalledWith(
            '/api/direct-messages?userId=user-1&otherUserId=user-2',
            { headers: { Authorization: 'Bearer test-token' } }
        );
    });

    it('sets error on fetch failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Forbidden' }),
        });

        const { result } = renderHook(() => useDirectMessages(defaultProps));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Forbidden');
        expect(result.current.messages).toHaveLength(0);
    });

    it('sends a message and appends to state', async () => {
        // Initial fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messages: [] }),
        });

        const { result } = renderHook(() => useDirectMessages(defaultProps));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const newMessage = {
            id: 'msg-new',
            sender_id: 'user-1',
            recipient_id: 'user-2',
            content: 'Hi there',
        };

        // Send message fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: newMessage }),
        });

        await act(async () => {
            await result.current.sendMessage('Hi there');
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Hi there');
    });

    it('does not send empty messages', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messages: [] }),
        });

        const { result } = renderHook(() => useDirectMessages(defaultProps));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.sendMessage('   ');
        });

        // Only the initial fetch should have been called
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('subscribes to realtime channel on mount and cleans up', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messages: [] }),
        });

        const { unmount } = renderHook(() => useDirectMessages(defaultProps));

        await waitFor(() => {
            expect(mockOn).toHaveBeenCalled();
        });

        expect(mockSubscribe).toHaveBeenCalled();

        unmount();

        expect(mockRemoveChannel).toHaveBeenCalled();
    });

    it('does not fetch if userId is missing', async () => {
        renderHook(() =>
            useDirectMessages({ userId: '', otherUserId: 'user-2', authToken: 'token' })
        );

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws on send failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messages: [] }),
        });

        const { result } = renderHook(() => useDirectMessages(defaultProps));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Send failed' }),
        });

        let caughtError: Error | null = null;
        await act(async () => {
            try {
                await result.current.sendMessage('Hello');
            } catch (err) {
                caughtError = err as Error;
            }
        });

        expect(caughtError).not.toBeNull();
        expect(caughtError!.message).toBe('Send failed');
        expect(result.current.error).toBe('Send failed');
    });
});
