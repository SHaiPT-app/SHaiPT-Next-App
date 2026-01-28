import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AICoachChat from '@/components/ai-coach/AICoachChat';
import type { Profile } from '@/lib/types';

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

// Polyfill TextEncoder for jsdom
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}

// Mock framer-motion
jest.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: {
            create: (Component: any) => {
                return React.forwardRef((props: any, ref: any) => {
                    // Filter out framer-motion and Chakra props that aren't valid DOM attrs
                    const {
                        variants, initial, animate, exit, transition,
                        whileHover, whileTap, mode,
                        ...rest
                    } = props;
                    return React.createElement(Component, { ...rest, ref });
                });
            },
        },
        AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    };
});

// Mock Chakra UI - strip non-DOM props
jest.mock('@chakra-ui/react', () => {
    const React = require('react');

    // List of Chakra-specific props to filter out
    const chakraProps = [
        'as', 'lineClamp', 'flexShrink', 'alignItems', 'justifyContent',
        'flexDirection', 'borderRadius', 'fontSize', 'fontWeight',
        'fontFamily', 'lineHeight', 'textTransform', 'letterSpacing',
        'whiteSpace', 'borderColor', 'borderBottom', 'borderTop',
        'backdropFilter', 'boxShadow', 'overflowY', 'maxH', 'minH',
        'bg', 'px', 'py', 'mb', 'mt', 'mx', 'w', 'h', 'gap',
        'display', 'flex', 'maxW', 'color', 'textAlign', 'align',
        'position', 'bottom', 'right', 'top', 'left', 'zIndex',
        'width', 'height', 'overflow', 'border',
    ];

    const createComponent = (displayName: string, tag = 'div') => {
        const Component = React.forwardRef((props: any, ref: any) => {
            const filtered: any = {};
            for (const key of Object.keys(props)) {
                if (!chakraProps.includes(key) && typeof props[key] !== 'object') {
                    filtered[key] = props[key];
                } else if (key === 'children') {
                    filtered[key] = props[key];
                } else if (key === 'data-testid' || key === 'className' || key === 'style' || key === 'id') {
                    filtered[key] = props[key];
                }
            }
            // Always pass children
            if (props.children !== undefined) {
                filtered.children = props.children;
            }
            return React.createElement(tag, { ...filtered, ref });
        });
        Component.displayName = displayName;
        return Component;
    };
    return {
        Box: createComponent('Box'),
        Text: createComponent('Text', 'p'),
        Heading: createComponent('Heading', 'h3'),
        VStack: createComponent('VStack'),
        Flex: createComponent('Flex'),
    };
});

// Mock lucide-react
jest.mock('lucide-react', () => ({
    Send: () => React.createElement('span', { 'data-testid': 'send-icon' }),
    X: () => React.createElement('span', { 'data-testid': 'x-icon' }),
    MessageSquare: () => React.createElement('span', { 'data-testid': 'message-icon' }),
    Trash2: () => React.createElement('span', { 'data-testid': 'trash-icon' }),
}));

// Mock animations
jest.mock('@/lib/animations', () => ({
    fadeInUp: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUser: Profile = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    role: 'trainee',
    fitness_goals: ['muscle gain'],
};

describe('AICoachChat', () => {
    const mockToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ chats: [] }),
        });
    });

    it('renders toggle button when closed', () => {
        render(<AICoachChat user={mockUser} isOpen={false} onToggle={mockToggle} />);
        const toggleBtn = screen.getByTestId('ai-coach-toggle');
        expect(toggleBtn).toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
        render(<AICoachChat user={mockUser} isOpen={false} onToggle={mockToggle} />);
        fireEvent.click(screen.getByTestId('ai-coach-toggle'));
        expect(mockToggle).toHaveBeenCalled();
    });

    it('renders chat panel when open', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        expect(screen.getByTestId('ai-coach-panel')).toBeInTheDocument();
    });

    it('renders input field when open', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        expect(screen.getByTestId('ai-coach-input')).toBeInTheDocument();
    });

    it('renders send button when open', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        expect(screen.getByTestId('ai-coach-send')).toBeInTheDocument();
    });

    it('renders close button when open', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        const closeBtn = screen.getByTestId('ai-coach-close');
        expect(closeBtn).toBeInTheDocument();
    });

    it('calls onToggle when close button is clicked', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        fireEvent.click(screen.getByTestId('ai-coach-close'));
        expect(mockToggle).toHaveBeenCalled();
    });

    it('shows personalized greeting with user name', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        expect(screen.getByText(/Hey, Test/)).toBeInTheDocument();
    });

    it('shows suggestion buttons when no messages', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        expect(screen.getByText('Adjust my plan')).toBeInTheDocument();
        expect(screen.getByText('Recovery tips')).toBeInTheDocument();
        expect(screen.getByText('Nutrition check')).toBeInTheDocument();
        expect(screen.getByText('Form advice')).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        const sendBtn = screen.getByTestId('ai-coach-send');
        expect(sendBtn).toBeDisabled();
    });

    it('enables send button when input has text', () => {
        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);
        const input = screen.getByTestId('ai-coach-input');
        fireEvent.change(input, { target: { value: 'Hello' } });
        const sendBtn = screen.getByTestId('ai-coach-send');
        expect(sendBtn).not.toBeDisabled();
    });

    it('sends message and shows user message in chat', async () => {
        // Create a mock reader that simulates a stream
        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Mock response') })
                .mockResolvedValueOnce({ done: true, value: undefined }),
        };

        mockFetch
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ chats: [] }) }) // history
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                body: { getReader: () => mockReader },
                headers: new Headers({ 'Content-Type': 'text/plain' }),
            }) // chat
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ chats: [] }) }); // history refresh

        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);

        const input = screen.getByTestId('ai-coach-input');
        fireEvent.change(input, { target: { value: 'Help me with squats' } });
        fireEvent.submit(input.closest('form')!);

        await waitFor(() => {
            expect(screen.getByText('Help me with squats')).toBeInTheDocument();
        });
    });

    it('loads chat history from API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    chats: [
                        {
                            id: 'chat-1',
                            user_id: 'test-user-id',
                            title: 'Previous chat',
                            messages: [
                                { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
                                { role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() },
                            ],
                        },
                    ],
                }),
        });

        render(<AICoachChat user={mockUser} isOpen={true} onToggle={mockToggle} />);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/ai-coach/chat/history')
            );
        });
    });
});
