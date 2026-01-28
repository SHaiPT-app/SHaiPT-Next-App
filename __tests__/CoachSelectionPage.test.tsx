import { render, screen, fireEvent } from '@testing-library/react'
import CoachSelectionPage from '@/app/coach/page'
import { coaches } from '@/data/coaches'

describe('CoachSelectionPage', () => {
    it('renders the page heading', () => {
        render(<CoachSelectionPage />)
        expect(screen.getByText('Choose Your AI Coach')).toBeInTheDocument()
    })

    it('renders the subheading', () => {
        render(<CoachSelectionPage />)
        expect(
            screen.getByText('Select a coaching persona that matches your training goals and style.')
        ).toBeInTheDocument()
    })

    it('renders all 10 coach cards', () => {
        render(<CoachSelectionPage />)
        for (const coach of coaches) {
            expect(screen.getByTestId(`coach-card-${coach.id}`)).toBeInTheDocument()
        }
    })

    it('displays coach display names', () => {
        render(<CoachSelectionPage />)
        for (const coach of coaches) {
            expect(screen.getByText(coach.displayName)).toBeInTheDocument()
        }
    })

    it('displays coaching style descriptions', () => {
        render(<CoachSelectionPage />)
        for (const coach of coaches) {
            expect(screen.getByText(coach.coachingStyle)).toBeInTheDocument()
        }
    })

    it('displays specialty tags for each coach', () => {
        render(<CoachSelectionPage />)
        for (const coach of coaches) {
            for (const tag of coach.specialtyTags) {
                const elements = screen.getAllByText(tag)
                expect(elements.length).toBeGreaterThanOrEqual(1)
            }
        }
    })

    it('does not show the CTA bar initially', () => {
        render(<CoachSelectionPage />)
        expect(screen.queryByTestId('selected-coach-cta')).not.toBeInTheDocument()
    })

    it('shows the CTA bar after selecting a coach', () => {
        render(<CoachSelectionPage />)
        fireEvent.click(screen.getByTestId('coach-card-bodybuilding'))
        expect(screen.getByTestId('selected-coach-cta')).toBeInTheDocument()
        expect(screen.getByText("Marcus 'The Titan'", { selector: 'strong' })).toBeInTheDocument()
    })

    it('shows a Start Training button after selection', () => {
        render(<CoachSelectionPage />)
        fireEvent.click(screen.getByTestId('coach-card-crossfit'))
        expect(screen.getByTestId('start-training-btn')).toBeInTheDocument()
        expect(screen.getByText('Start Training')).toBeInTheDocument()
    })

    it('allows switching selected coach', () => {
        render(<CoachSelectionPage />)
        fireEvent.click(screen.getByTestId('coach-card-bodybuilding'))
        expect(screen.getByText("Marcus 'The Titan'", { selector: 'strong' })).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('coach-card-science-based'))
        expect(screen.getByText("Dr. Elena 'The Professor'", { selector: 'strong' })).toBeInTheDocument()
    })

    it('renders the coach grid container', () => {
        render(<CoachSelectionPage />)
        expect(screen.getByTestId('coach-grid')).toBeInTheDocument()
    })
})

describe('coaches config', () => {
    it('contains exactly 10 coaches', () => {
        expect(coaches).toHaveLength(10)
    })

    it('each coach has all required fields', () => {
        for (const coach of coaches) {
            expect(coach.id).toBeTruthy()
            expect(coach.fullName).toBeTruthy()
            expect(coach.nickname).toBeTruthy()
            expect(coach.displayName).toBeTruthy()
            expect(coach.avatarUrl).toBeTruthy()
            expect(coach.coachingStyle).toBeTruthy()
            expect(coach.specialtyTags.length).toBeGreaterThan(0)
        }
    })

    it('each coach has a unique id', () => {
        const ids = coaches.map((c) => c.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('includes the expected coach types', () => {
        const ids = coaches.map((c) => c.id)
        expect(ids).toContain('bodybuilding')
        expect(ids).toContain('booty-builder')
        expect(ids).toContain('crossfit')
        expect(ids).toContain('old-school')
        expect(ids).toContain('science-based')
        expect(ids).toContain('beach-body')
        expect(ids).toContain('everyday-fitness')
        expect(ids).toContain('athletic-functionality')
        expect(ids).toContain('sport-basketball')
        expect(ids).toContain('sport-climbing')
    })
})
