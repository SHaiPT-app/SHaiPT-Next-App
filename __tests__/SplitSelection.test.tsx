import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        create: () => {
            const Component = (props: Record<string, unknown>) => {
                const { children, ...rest } = props;
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
    Check: () => <span data-testid="icon-check" />,
    Star: () => <span data-testid="icon-star" />,
}));

import SplitSelection from '@/components/ai-coach/SplitSelection';
import type { SplitOption } from '@/components/ai-coach/SplitSelection';

const mockSplits: SplitOption[] = [
    {
        id: 'upper_lower',
        name: 'Upper/Lower Split',
        description: 'Best for 4-day training schedule.',
        days_per_week: 4,
        recommended: true,
    },
    {
        id: 'ppl',
        name: 'Push/Pull/Legs',
        description: 'Classic bodybuilding split.',
        days_per_week: 4,
        recommended: false,
    },
    {
        id: 'full_body',
        name: 'Full Body',
        description: 'Hit every muscle group each session.',
        days_per_week: 4,
        recommended: false,
    },
];

function renderComponent(props: Partial<React.ComponentProps<typeof SplitSelection>> = {}) {
    const defaultProps = {
        splits: mockSplits,
        selectedSplit: null,
        onSelectSplit: jest.fn(),
        onConfirm: jest.fn(),
        isLoading: false,
        ...props,
    };

    return render(
        <ChakraProvider value={system}>
            <SplitSelection {...defaultProps} />
        </ChakraProvider>
    );
}

describe('SplitSelection', () => {
    it('renders all split options', () => {
        renderComponent();

        expect(screen.getByText('Upper/Lower Split')).toBeInTheDocument();
        expect(screen.getByText('Push/Pull/Legs')).toBeInTheDocument();
        expect(screen.getByText('Full Body')).toBeInTheDocument();
    });

    it('shows recommended badge on recommended split', () => {
        renderComponent();

        expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('shows days per week for each split', () => {
        renderComponent();

        const dayLabels = screen.getAllByText('4 days/week');
        expect(dayLabels.length).toBe(3);
    });

    it('calls onSelectSplit when a split option is clicked', () => {
        const onSelectSplit = jest.fn();
        renderComponent({ onSelectSplit });

        fireEvent.click(screen.getByTestId('split-option-ppl'));
        expect(onSelectSplit).toHaveBeenCalledWith('ppl');
    });

    it('calls onConfirm when generate button is clicked with selection', () => {
        const onConfirm = jest.fn();
        renderComponent({ selectedSplit: 'upper_lower', onConfirm });

        fireEvent.click(screen.getByTestId('confirm-split-btn'));
        expect(onConfirm).toHaveBeenCalled();
    });

    it('disables generate button when no split is selected', () => {
        const onConfirm = jest.fn();
        renderComponent({ selectedSplit: null, onConfirm });

        const button = screen.getByTestId('confirm-split-btn');
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('disables generate button when loading', () => {
        const onConfirm = jest.fn();
        renderComponent({ selectedSplit: 'ppl', isLoading: true, onConfirm });

        const button = screen.getByTestId('confirm-split-btn');
        expect(button).toBeDisabled();
    });

    it('shows generating text when loading', () => {
        renderComponent({ isLoading: true, selectedSplit: 'ppl' });

        expect(screen.getByText('Generating Plan...')).toBeInTheDocument();
    });

    it('shows generate text when not loading', () => {
        renderComponent({ selectedSplit: 'ppl' });

        expect(screen.getByText('Generate My Plan')).toBeInTheDocument();
    });

    it('renders the section header', () => {
        renderComponent();

        expect(screen.getByText('Choose Your Training Split')).toBeInTheDocument();
    });
});
