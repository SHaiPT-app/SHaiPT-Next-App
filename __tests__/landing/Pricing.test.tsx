import { render, screen } from '@testing-library/react'
import Pricing from '@/components/landing/Pricing'

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: Record<string, unknown>) => (
            <div data-testid="motion-div" {...props}>{children as React.ReactNode}</div>
        ),
    },
}))

// Mock ScrollReveal
jest.mock('@/components/ScrollReveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="scroll-reveal">{children}</div>
    ),
}))

describe('Pricing', () => {
    it('renders the section heading', () => {
        render(<Pricing />)
        expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
    })

    it('renders all three pricing tiers', () => {
        render(<Pricing />)
        expect(screen.getByText('Starter')).toBeInTheDocument()
        expect(screen.getByText('Pro')).toBeInTheDocument()
        expect(screen.getByText('Elite')).toBeInTheDocument()
    })

    it('renders correct prices', () => {
        render(<Pricing />)
        expect(screen.getByText('$9.99')).toBeInTheDocument()
        expect(screen.getByText('$19.99')).toBeInTheDocument()
        expect(screen.getByText('$29.99')).toBeInTheDocument()
    })

    it('highlights the Pro tier as most popular', () => {
        render(<Pricing />)
        expect(screen.getByText('Most Popular')).toBeInTheDocument()
    })

    it('renders CTA buttons for each tier', () => {
        render(<Pricing />)
        expect(screen.getByText('Get Started')).toBeInTheDocument()
        expect(screen.getByText('Start Pro Trial')).toBeInTheDocument()
        expect(screen.getByText('Contact Sales')).toBeInTheDocument()
    })

    it('renders feature lists for tiers', () => {
        render(<Pricing />)
        expect(screen.getByText('AI workout generation')).toBeInTheDocument()
        expect(screen.getByText('Real-time form analysis')).toBeInTheDocument()
        expect(screen.getByText('Coach dashboard')).toBeInTheDocument()
    })

    it('has the pricing section id for anchor linking', () => {
        const { container } = render(<Pricing />)
        const section = container.querySelector('#pricing')
        expect(section).toBeInTheDocument()
    })
})
