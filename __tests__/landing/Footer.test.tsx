import { render, screen } from '@testing-library/react'
import Footer from '@/components/landing/Footer'

// Mock ScrollReveal
jest.mock('@/components/ScrollReveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="scroll-reveal">{children}</div>
    ),
}))

describe('Footer', () => {
    it('renders the CTA banner', () => {
        render(<Footer />)
        expect(screen.getByText('Ready to Transform Your Training?')).toBeInTheDocument()
    })

    it('renders the Start Free Trial CTA link', () => {
        render(<Footer />)
        expect(screen.getByText('Start Free Trial')).toBeInTheDocument()
    })

    it('renders the SHaiPT brand name', () => {
        render(<Footer />)
        expect(screen.getByText('SHaiPT')).toBeInTheDocument()
    })

    it('renders footer link categories', () => {
        render(<Footer />)
        expect(screen.getByText('Product')).toBeInTheDocument()
        expect(screen.getByText('Company')).toBeInTheDocument()
        expect(screen.getByText('Legal')).toBeInTheDocument()
    })

    it('renders product links', () => {
        render(<Footer />)
        expect(screen.getByText('Features')).toBeInTheDocument()
        expect(screen.getByText('Pricing')).toBeInTheDocument()
    })

    it('renders legal links', () => {
        render(<Footer />)
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
        expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    })

    it('renders copyright text', () => {
        render(<Footer />)
        const year = new Date().getFullYear()
        expect(screen.getByText(`\u00A9 ${year} SHaiPT. All rights reserved.`)).toBeInTheDocument()
    })

    it('renders sign in and sign up links', () => {
        render(<Footer />)
        expect(screen.getByText('Sign In')).toBeInTheDocument()
        expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })
})
