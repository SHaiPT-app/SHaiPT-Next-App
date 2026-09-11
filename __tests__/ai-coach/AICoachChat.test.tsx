/* eslint-disable @typescript-eslint/no-require-imports, react/display-name */
/**
 * Tests for the AICoachChat component
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Profile } from '@/lib/types';


// framer-motion: one shared mock (test-utils/framerMotion.ts). The inline mock this
// replaces defined motion.create but not motion.div, which is what the component
// actually renders — so every test here died on render.
jest.mock('framer-motion', () => require('@/test-utils/framerMotion').createFramerMotionMock());

// Mock animations
jest.mock('@/lib/animations', () => ({
    fadeInUp: { hidden: {}, visible: {} },
}));

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import component after mocks
import AICoachChat from '@/components/ai-coach/AICoachChat';

const mockUser: Profile = {
    id: 'user-1',
    email: 'test@test.com',
    username: 'testuser',
    full_name: 'Test User',
    role: 'trainee',
};

describe('AICoachChat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ chats: [] }),
        });
    });

    it('renders the toggle button when closed', () => {
        render(
            <AICoachChat user={mockUser} isOpen={false} onToggle={jest.fn()} />
        );
        expect(screen.getByTestId('ai-coach-toggle')).toBeInTheDocument();
    });

    it('renders the chat panel when open', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );
        expect(screen.getByTestId('ai-coach-panel')).toBeInTheDocument();
        expect(screen.getByTestId('ai-coach-input')).toBeInTheDocument();
    });

    it('does not render panel when closed', () => {
        render(
            <AICoachChat user={mockUser} isOpen={false} onToggle={jest.fn()} />
        );
        expect(screen.queryByTestId('ai-coach-panel')).not.toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
        const onToggle = jest.fn();
        render(
            <AICoachChat user={mockUser} isOpen={false} onToggle={onToggle} />
        );
        fireEvent.click(screen.getByTestId('ai-coach-toggle'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when close button is clicked', () => {
        const onToggle = jest.fn();
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={onToggle} />
        );
        fireEvent.click(screen.getByTestId('ai-coach-close'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('displays welcome message with user name when open', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );
        expect(screen.getByText(/Hey, Test/)).toBeInTheDocument();
    });

    it('shows suggestion buttons when no messages', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );
        expect(screen.getByText('Adjust my plan')).toBeInTheDocument();
        expect(screen.getByText('Recovery tips')).toBeInTheDocument();
        expect(screen.getByText('Nutrition check')).toBeInTheDocument();
        expect(screen.getByText('Form advice')).toBeInTheDocument();
    });

    it('has a disabled send button when input is empty', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );
        const sendButton = screen.getByTestId('ai-coach-send');
        expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );
        const input = screen.getByTestId('ai-coach-input');
        fireEvent.change(input, { target: { value: 'Hello coach' } });
        const sendButton = screen.getByTestId('ai-coach-send');
        expect(sendButton).not.toBeDisabled();
    });

    it('does not contain emoji in the UI text', () => {
        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );

        const panel = screen.getByTestId('ai-coach-panel');
        const textContent = panel.textContent || '';
        // Check for common emoji unicode ranges
        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        expect(emojiRegex.test(textContent)).toBe(false);
    });

    it('loads chat history when opened', async () => {
        const mockChats = [
            {
                id: 'chat-1',
                user_id: 'user-1',
                title: 'Previous chat',
                messages: [{ role: 'user', content: 'Hi', timestamp: '2025-01-01' }],
            },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ chats: mockChats }),
        });

        render(
            <AICoachChat user={mockUser} isOpen={true} onToggle={jest.fn()} />
        );

        await waitFor(() => {
            /* Two arguments, not one: apiFetch passes an options object alongside the URL, and
               toHaveBeenCalledWith matches the whole call. The id is deliberately absent from the
               URL — app/api/ai-coach/chat/history derives the caller from the bearer token, and
               its own comment records that it "used to take ?userId=", which trusted the client. */
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/ai-coach/chat/history'),
                expect.anything()
            );
            // and prove the id is not being smuggled through the query string any more
            expect(mockFetch.mock.calls[0][0]).not.toContain('userId=');
        });
    });
});
