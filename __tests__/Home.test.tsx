import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

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

jest.mock('@/components/landing/Footer', () => {
    return function MockFooter() {
        return <div data-testid="footer">Footer Component</div>
    }
})

describe('Home', () => {
    it('renders the landing page components', () => {
        render(<Home />)

        expect(screen.getByTestId('hero')).toBeInTheDocument()
        expect(screen.getByTestId('features')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
})
