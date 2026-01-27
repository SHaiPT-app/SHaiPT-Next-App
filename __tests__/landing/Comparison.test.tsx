import { render, screen } from '@testing-library/react'
import Comparison from '@/components/landing/Comparison'

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: Record<string, unknown>) => (
            <div data-testid="motion-div" {...props}>{children as React.ReactNode}</div>
        ),
        table: ({ children, ...props }: Record<string, unknown>) => (
            <table data-testid="motion-table" {...props}>{children as React.ReactNode}</table>
        ),
    },
}))

// Mock ScrollReveal
jest.mock('@/components/ScrollReveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="scroll-reveal">{children}</div>
    ),
}))

describe('Comparison', () => {
    it('renders the section heading', () => {
        render(<Comparison />)
        expect(screen.getByText('Why SHaiPT?')).toBeInTheDocument()
    })

    it('renders comparison table with competitor columns', () => {
        render(<Comparison />)
        expect(screen.getByText('SHaiPT')).toBeInTheDocument()
        expect(screen.getByText('Fitbod')).toBeInTheDocument()
        expect(screen.getByText('Strong')).toBeInTheDocument()
        expect(screen.getByText('Personal Trainer')).toBeInTheDocument()
    })

    it('renders all comparison features', () => {
        render(<Comparison />)
        expect(screen.getByText('AI Workout Generation')).toBeInTheDocument()
        expect(screen.getByText('Real-Time Form Analysis')).toBeInTheDocument()
        expect(screen.getByText('AI Nutrition Coaching')).toBeInTheDocument()
        expect(screen.getByText('Periodized Programming')).toBeInTheDocument()
        expect(screen.getByText('Progressive Overload Tracking')).toBeInTheDocument()
        expect(screen.getByText('User-Editable AI Plans')).toBeInTheDocument()
        expect(screen.getByText('24/7 Availability')).toBeInTheDocument()
    })

    it('renders pricing row with price values', () => {
        render(<Comparison />)
        expect(screen.getByText('Starting Price')).toBeInTheDocument()
        expect(screen.getByText('$9.99/mo')).toBeInTheDocument()
        expect(screen.getByText('$12.99/mo')).toBeInTheDocument()
        expect(screen.getByText('$4.99/mo')).toBeInTheDocument()
        expect(screen.getByText('$200+/mo')).toBeInTheDocument()
    })

    it('has the comparison section id for anchor linking', () => {
        const { container } = render(<Comparison />)
        const section = container.querySelector('#comparison')
        expect(section).toBeInTheDocument()
    })
})
