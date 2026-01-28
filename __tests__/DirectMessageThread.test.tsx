/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DirectMessageThread from '@/components/DirectMessageThread';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock the useDirectMessages hook
const mockSendMessage = jest.fn();
const mockMarkAsRead = jest.fn();

jest.mock('@/lib/useDirectMessages', () => ({
    useDirectMessages: jest.fn(() => ({
        messages: [],
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        loading: false,
        error: null,
    })),
}));

// Get the mocked module for manipulation in tests
import { useDirectMessages } from '@/lib/useDirectMessages';
const mockedUseDirectMessages = useDirectMessages as jest.MockedFunction<typeof useDirectMessages>;

describe('DirectMessageThread', () => {
    const defaultProps = {
        userId: 'user-1',
        otherUserId: 'user-2',
        otherUserName: 'John Doe',
        authToken: 'test-token',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSendMessage.mockResolvedValue(undefined);
        mockedUseDirectMessages.mockReturnValue({
            messages: [],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: false,
            error: null,
        });
    });

    it('renders the other user name in header', () => {
        render(<DirectMessageThread {...defaultProps} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        mockedUseDirectMessages.mockReturnValue({
            messages: [],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: true,
            error: null,
        });

        render(<DirectMessageThread {...defaultProps} />);
        expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('shows error message', () => {
        mockedUseDirectMessages.mockReturnValue({
            messages: [],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: false,
            error: 'Something went wrong',
        });

        render(<DirectMessageThread {...defaultProps} />);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
        render(<DirectMessageThread {...defaultProps} />);
        expect(
            screen.getByText('No messages yet. Start the conversation!')
        ).toBeInTheDocument();
    });

    it('renders messages with correct alignment', () => {
        mockedUseDirectMessages.mockReturnValue({
            messages: [
                {
                    id: 'msg-1',
                    sender_id: 'user-1',
                    recipient_id: 'user-2',
                    content: 'My message',
                    created_at: '2024-01-01T10:00:00Z',
                },
                {
                    id: 'msg-2',
                    sender_id: 'user-2',
                    recipient_id: 'user-1',
                    content: 'Their message',
                    created_at: '2024-01-01T10:01:00Z',
                },
            ],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: false,
            error: null,
        });

        render(<DirectMessageThread {...defaultProps} />);
        expect(screen.getByText('My message')).toBeInTheDocument();
        expect(screen.getByText('Their message')).toBeInTheDocument();
    });

    it('sends message on form submit', async () => {
        render(<DirectMessageThread {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type a message...');
        const sendButton = screen.getByText('Send');

        fireEvent.change(input, { target: { value: 'Hello!' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith('Hello!');
        });
    });

    it('clears input after sending', async () => {
        render(<DirectMessageThread {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'Hello!' } });
        fireEvent.click(screen.getByText('Send'));

        await waitFor(() => {
            expect(input.value).toBe('');
        });
    });

    it('disables send button when input is empty', () => {
        render(<DirectMessageThread {...defaultProps} />);
        const sendButton = screen.getByText('Send');
        expect(sendButton).toBeDisabled();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = jest.fn();
        render(<DirectMessageThread {...defaultProps} onClose={onClose} />);

        const closeButton = screen.getByLabelText('Close conversation');
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render close button when onClose is not provided', () => {
        render(<DirectMessageThread {...defaultProps} />);
        expect(screen.queryByLabelText('Close conversation')).not.toBeInTheDocument();
    });

    it('marks unread incoming messages as read', () => {
        mockedUseDirectMessages.mockReturnValue({
            messages: [
                {
                    id: 'msg-unread',
                    sender_id: 'user-2',
                    recipient_id: 'user-1',
                    content: 'Unread message',
                    created_at: '2024-01-01T10:00:00Z',
                },
            ],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: false,
            error: null,
        });

        render(<DirectMessageThread {...defaultProps} />);
        expect(mockMarkAsRead).toHaveBeenCalledWith('msg-unread');
    });

    it('shows read receipt for sent messages', () => {
        mockedUseDirectMessages.mockReturnValue({
            messages: [
                {
                    id: 'msg-read',
                    sender_id: 'user-1',
                    recipient_id: 'user-2',
                    content: 'Read message',
                    read_at: '2024-01-01T10:05:00Z',
                    created_at: '2024-01-01T10:00:00Z',
                },
            ],
            sendMessage: mockSendMessage,
            markAsRead: mockMarkAsRead,
            loading: false,
            error: null,
        });

        render(<DirectMessageThread {...defaultProps} />);
        // Double checkmarks for read messages
        expect(screen.getByText(/✓✓/)).toBeInTheDocument();
    });
});
