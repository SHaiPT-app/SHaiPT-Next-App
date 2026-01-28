import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';

// Mock next/navigation
const mockPush = jest.fn();
let currentCoachId = 'bodybuilding';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    useParams: () => ({ coachId: currentCoachId }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
            }),
        },
        from: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
        }),
    },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        create: () => {
            const Component = (props: Record<string, unknown>) => {
                const { children, ...rest } = props;
                // Filter out framer motion specific props
                const htmlProps: Record<string, unknown> = {};
                for (const key of Object.keys(rest)) {
                    if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap'].includes(key)) {
                        htmlProps[key] = rest[key];
                    }
                }
                return <div {...htmlProps}>{children as React.ReactNode}</div>;
            };
            return Component;
        },
        div: 'div',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
    ArrowLeft: () => <span data-testid="icon-arrow-left" />,
    FileText: () => <span data-testid="icon-file-text" />,
    X: () => <span data-testid="icon-x" />,
    Save: () => <span data-testid="icon-save" />,
    Send: () => <span data-testid="icon-send" />,
    User: () => <span data-testid="icon-user" />,
    Bot: () => <span data-testid="icon-bot" />,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock InterviewChat to avoid complex streaming logic
jest.mock('@/components/ai-coach/InterviewChat', () => {
    return function MockInterviewChat({ coach }: { coach: { displayName: string } }) {
        return (
            <div data-testid="interview-chat">
                <div data-testid="interview-chat-coach">{coach.displayName}</div>
                <input data-testid="interview-chat-input" placeholder="Type your answer..." />
            </div>
        );
    };
});

// Mock IntakeForm to avoid Chakra context issues in unit tests
jest.mock('@/components/ai-coach/IntakeForm', () => {
    return function MockIntakeForm() {
        return <div data-testid="intake-form">Intake Form</div>;
    };
});

import CoachInterviewPage from '@/app/coach/[coachId]/page';

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <ChakraProvider value={system}>
            {ui}
        </ChakraProvider>
    );
}

describe('CoachInterviewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentCoachId = 'bodybuilding';
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
    });

    it('renders the interview page with correct coach', () => {
        renderWithProviders(<CoachInterviewPage />);
        expect(screen.getByText('Intake Interview')).toBeInTheDocument();
        expect(screen.getAllByText("Marcus 'The Titan'").length).toBeGreaterThanOrEqual(1);
    });

    it('renders the interview chat component', () => {
        renderWithProviders(<CoachInterviewPage />);
        expect(screen.getByTestId('interview-chat')).toBeInTheDocument();
    });

    it('displays back button that navigates to coach selection', () => {
        renderWithProviders(<CoachInterviewPage />);
        const backBtn = screen.getByTestId('back-to-coaches');
        fireEvent.click(backBtn);
        expect(mockPush).toHaveBeenCalledWith('/coach');
    });

    it('displays the save button', () => {
        renderWithProviders(<CoachInterviewPage />);
        expect(screen.getByTestId('save-intake')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('displays the View Form button for mobile', () => {
        renderWithProviders(<CoachInterviewPage />);
        expect(screen.getByTestId('view-form-btn')).toBeInTheDocument();
        expect(screen.getByText('View Form')).toBeInTheDocument();
    });

    it('opens mobile form modal on View Form click', () => {
        renderWithProviders(<CoachInterviewPage />);
        fireEvent.click(screen.getByTestId('view-form-btn'));
        expect(screen.getByTestId('mobile-form-modal')).toBeInTheDocument();
    });

    it('closes mobile form modal on X click', () => {
        renderWithProviders(<CoachInterviewPage />);
        fireEvent.click(screen.getByTestId('view-form-btn'));
        expect(screen.getByTestId('mobile-form-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('close-mobile-form'));
    });

    it('shows field count indicator', () => {
        renderWithProviders(<CoachInterviewPage />);
        expect(screen.getByText('0/16 fields')).toBeInTheDocument();
    });

    it('redirects to /coach when invalid coachId', () => {
        currentCoachId = 'nonexistent-coach';
        renderWithProviders(<CoachInterviewPage />);
        expect(mockPush).toHaveBeenCalledWith('/coach');
    });
});
