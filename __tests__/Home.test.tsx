import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
    },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

// Mock StaticBackground
jest.mock('@/components/StaticBackground', () => {
    return function MockStaticBackground({ children }: { children: React.ReactNode }) {
        return <div data-testid="static-background">{children}</div>
    }
})

// Mock the child components to avoid deep rendering issues and focus on Home page structure
jest.mock('@/components/landing/Hero', () => {
    return function MockHero() {
        return <div data-testid="hero">Hero Component</div>
    }
})

jest.mock('@/components/landing/Features', () => {
    return function MockFeatures() {
        return <div data-testid="features">Features Component</div>
    }
})

jest.mock('@/components/landing/Comparison', () => {
    return function MockComparison() {
        return <div data-testid="comparison">Comparison Component</div>
    }
})

jest.mock('@/components/landing/Pricing', () => {
    return function MockPricing() {
        return <div data-testid="pricing">Pricing Component</div>
    }
})

jest.mock('@/components/landing/Footer', () => {
    return function MockFooter() {
        return <div data-testid="footer">Footer Component</div>
    }
})

describe('Home', () => {
    it('renders all landing page sections', () => {
        render(<Home />)

        expect(screen.getByTestId('hero')).toBeInTheDocument()
        expect(screen.getByTestId('features')).toBeInTheDocument()
        expect(screen.getByTestId('comparison')).toBeInTheDocument()
        expect(screen.getByTestId('pricing')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('renders sections in correct order', () => {
        render(<Home />)

        const hero = screen.getByTestId('hero')
        const features = screen.getByTestId('features')
        const comparison = screen.getByTestId('comparison')
        const pricing = screen.getByTestId('pricing')
        const footer = screen.getByTestId('footer')

        // Verify order by checking DOM positions
        const parent = hero.parentElement!
        const children = Array.from(parent.children)
        const heroIdx = children.indexOf(hero)
        const featuresIdx = children.indexOf(features)
        const comparisonIdx = children.indexOf(comparison)
        const pricingIdx = children.indexOf(pricing)
        const footerIdx = children.indexOf(footer)

        expect(heroIdx).toBeLessThan(featuresIdx)
        expect(featuresIdx).toBeLessThan(comparisonIdx)
        expect(comparisonIdx).toBeLessThan(pricingIdx)
        expect(pricingIdx).toBeLessThan(footerIdx)
    })
})
