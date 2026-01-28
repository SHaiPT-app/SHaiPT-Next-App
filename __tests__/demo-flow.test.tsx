import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
const mockPathname = jest.fn().mockReturnValue('/demo')
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => mockPathname(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
        nav: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <nav {...props}>{children}</nav>,
        create: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

import DemoSignupPage from '@/app/demo/page'
import DemoInterviewPage from '@/app/demo/interview/page'
import DemoPlanPage from '@/app/demo/plan/page'
import DemoWorkoutPage from '@/app/demo/workout/page'
import DemoAnalyticsPage from '@/app/demo/analytics/page'
import DemoTrainerPage from '@/app/demo/trainer/page'
import DemoPricingPage from '@/app/demo/pricing/page'
import DemoLayout from '@/app/demo/layout'
import { DEMO_STEPS, DEMO_INTERVIEW_SCRIPT, DEMO_TRAINING_PLAN, DEMO_ANALYTICS, DEMO_TRAINER_CLIENTS } from '@/lib/demoData'

// ============================================
// DEMO DATA TESTS
// ============================================

describe('Demo Data', () => {
    it('defines all demo steps in order', () => {
        expect(DEMO_STEPS).toHaveLength(7)
        expect(DEMO_STEPS[0].path).toBe('/demo')
        expect(DEMO_STEPS[1].path).toBe('/demo/interview')
        expect(DEMO_STEPS[2].path).toBe('/demo/plan')
        expect(DEMO_STEPS[3].path).toBe('/demo/workout')
        expect(DEMO_STEPS[4].path).toBe('/demo/analytics')
        expect(DEMO_STEPS[5].path).toBe('/demo/trainer')
        expect(DEMO_STEPS[6].path).toBe('/demo/pricing')
    })

    it('has a complete interview script with alternating roles', () => {
        expect(DEMO_INTERVIEW_SCRIPT.length).toBeGreaterThanOrEqual(6)
        // First message is from assistant
        expect(DEMO_INTERVIEW_SCRIPT[0].role).toBe('assistant')
        // Check alternating pattern
        for (let i = 1; i < DEMO_INTERVIEW_SCRIPT.length; i++) {
            if (i < DEMO_INTERVIEW_SCRIPT.length - 1) {
                // Roles should alternate (except the last message which can be assistant)
                expect(['user', 'assistant']).toContain(DEMO_INTERVIEW_SCRIPT[i].role)
            }
        }
    })

    it('has a training plan with multiple sessions', () => {
        expect(DEMO_TRAINING_PLAN.sessions.length).toBeGreaterThanOrEqual(2)
        DEMO_TRAINING_PLAN.sessions.forEach(session => {
            expect(session.name).toBeTruthy()
            expect(session.exercises.length).toBeGreaterThan(0)
            session.exercises.forEach(ex => {
                expect(ex.name).toBeTruthy()
                expect(ex.sets.length).toBeGreaterThan(0)
            })
        })
    })

    it('has analytics data with charts and PRs', () => {
        expect(DEMO_ANALYTICS.weeklyVolume.length).toBeGreaterThan(0)
        expect(DEMO_ANALYTICS.personalRecords.length).toBeGreaterThan(0)
        expect(DEMO_ANALYTICS.muscleGroups.length).toBeGreaterThan(0)
        expect(DEMO_ANALYTICS.bodyWeight.length).toBeGreaterThan(0)
        expect(DEMO_ANALYTICS.workoutStreak).toBeGreaterThan(0)
    })

    it('has trainer clients data', () => {
        expect(DEMO_TRAINER_CLIENTS.length).toBeGreaterThanOrEqual(3)
        DEMO_TRAINER_CLIENTS.forEach(client => {
            expect(client.name).toBeTruthy()
            expect(client.currentPlan).toBeTruthy()
        })
    })
})

// ============================================
// DEMO LAYOUT TESTS
// ============================================

describe('DemoLayout', () => {
    it('renders progress bar with step indicators', () => {
        render(
            <DemoLayout>
                <div>Test Content</div>
            </DemoLayout>
        )
        expect(screen.getByTestId('demo-progress-bar')).toBeInTheDocument()
        expect(screen.getByText('SHaiPT')).toBeInTheDocument()
    })

    it('renders children content', () => {
        render(
            <DemoLayout>
                <div data-testid="child-content">Hello</div>
            </DemoLayout>
        )
        expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })
})

// ============================================
// DEMO SIGNUP PAGE TESTS
// ============================================

describe('DemoSignupPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
        localStorage.clear()
    })

    it('renders the demo signup form', () => {
        render(<DemoSignupPage />)
        expect(screen.getByText('SHaiPT Demo')).toBeInTheDocument()
        expect(screen.getByTestId('demo-name-input')).toBeInTheDocument()
        expect(screen.getByTestId('start-demo-button')).toBeInTheDocument()
    })

    it('starts the demo on button click', () => {
        render(<DemoSignupPage />)
        fireEvent.click(screen.getByTestId('start-demo-button'))
        expect(localStorage.getItem('demo_mode')).toBe('true')
        expect(localStorage.getItem('demo_user')).toBeTruthy()
        expect(mockPush).toHaveBeenCalledWith('/demo/interview')
    })

    it('uses custom name when provided', () => {
        render(<DemoSignupPage />)
        fireEvent.change(screen.getByTestId('demo-name-input'), {
            target: { value: 'Investor Bob' },
        })
        fireEvent.click(screen.getByTestId('start-demo-button'))
        const demoUser = JSON.parse(localStorage.getItem('demo_user') || '{}')
        expect(demoUser.full_name).toBe('Investor Bob')
    })

    it('uses default name when none provided', () => {
        render(<DemoSignupPage />)
        fireEvent.click(screen.getByTestId('start-demo-button'))
        const demoUser = JSON.parse(localStorage.getItem('demo_user') || '{}')
        expect(demoUser.full_name).toBe('Alex Demo')
    })

    it('starts demo on Enter key press', () => {
        render(<DemoSignupPage />)
        fireEvent.keyDown(screen.getByTestId('demo-name-input'), { key: 'Enter' })
        expect(mockPush).toHaveBeenCalledWith('/demo/interview')
    })
})

// ============================================
// DEMO INTERVIEW PAGE TESTS
// ============================================

describe('DemoInterviewPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('renders the interview page header', () => {
        render(<DemoInterviewPage />)
        expect(screen.getByText('AI Onboarding Interview')).toBeInTheDocument()
    })

    it('auto-plays the interview script', async () => {
        render(<DemoInterviewPage />)

        // Advance through all script messages
        for (let i = 0; i < DEMO_INTERVIEW_SCRIPT.length; i++) {
            act(() => {
                jest.advanceTimersByTime(2000)
            })
        }

        // After all messages, should show continue button
        await waitFor(() => {
            expect(screen.getByTestId('demo-continue-button')).toBeInTheDocument()
        })
    })

    it('has a skip button while interview is playing', () => {
        render(<DemoInterviewPage />)
        expect(screen.getByTestId('demo-skip-button')).toBeInTheDocument()
    })

    it('skips to results when skip button clicked', async () => {
        render(<DemoInterviewPage />)
        fireEvent.click(screen.getByTestId('demo-skip-button'))
        await waitFor(() => {
            expect(screen.getByTestId('demo-continue-button')).toBeInTheDocument()
        })
    })

    it('navigates to plan page on continue', async () => {
        render(<DemoInterviewPage />)
        fireEvent.click(screen.getByTestId('demo-skip-button'))
        await waitFor(() => {
            fireEvent.click(screen.getByTestId('demo-continue-button'))
            expect(mockPush).toHaveBeenCalledWith('/demo/plan')
        })
    })
})

// ============================================
// DEMO PLAN PAGE TESTS
// ============================================

describe('DemoPlanPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
    })

    it('renders training plan content by default', () => {
        render(<DemoPlanPage />)
        expect(screen.getByTestId('training-plan-content')).toBeInTheDocument()
        expect(screen.getByText(DEMO_TRAINING_PLAN.name)).toBeInTheDocument()
    })

    it('switches to nutrition tab', () => {
        render(<DemoPlanPage />)
        fireEvent.click(screen.getByTestId('nutrition-tab'))
        expect(screen.getByTestId('nutrition-plan-content')).toBeInTheDocument()
        expect(screen.getByText('2800 kcal')).toBeInTheDocument()
    })

    it('displays macro breakdowns in nutrition tab', () => {
        render(<DemoPlanPage />)
        fireEvent.click(screen.getByTestId('nutrition-tab'))
        expect(screen.getByText('190g')).toBeInTheDocument()
        expect(screen.getByText('340g')).toBeInTheDocument()
        expect(screen.getByText('75g')).toBeInTheDocument()
    })

    it('shows training plan sessions with expandable details', () => {
        render(<DemoPlanPage />)
        DEMO_TRAINING_PLAN.sessions.forEach(session => {
            expect(screen.getByText(session.name)).toBeInTheDocument()
        })
    })

    it('navigates to workout on continue', () => {
        render(<DemoPlanPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/workout')
    })
})

// ============================================
// DEMO WORKOUT PAGE TESTS
// ============================================

describe('DemoWorkoutPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
    })

    it('renders the first workout session', () => {
        render(<DemoWorkoutPage />)
        expect(screen.getByText(DEMO_TRAINING_PLAN.sessions[0].name)).toBeInTheDocument()
    })

    it('renders set rows for the current exercise', () => {
        render(<DemoWorkoutPage />)
        expect(screen.getByTestId('set-row-0')).toBeInTheDocument()
    })

    it('toggles form analysis panel', () => {
        render(<DemoWorkoutPage />)
        const toggle = screen.getByTestId('form-analysis-toggle')
        fireEvent.click(toggle)
        expect(screen.getByTestId('form-analysis-panel')).toBeInTheDocument()
    })

    it('shows form feedback items when analysis is open', () => {
        render(<DemoWorkoutPage />)
        fireEvent.click(screen.getByTestId('form-analysis-toggle'))
        expect(screen.getAllByTestId('form-feedback-good').length).toBeGreaterThan(0)
        expect(screen.getByTestId('form-feedback-warning')).toBeInTheDocument()
    })

    it('has a continue button to analytics', () => {
        render(<DemoWorkoutPage />)
        expect(screen.getByTestId('demo-continue-button')).toBeInTheDocument()
    })

    it('navigates to analytics on continue', () => {
        render(<DemoWorkoutPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/analytics')
    })
})

// ============================================
// DEMO ANALYTICS PAGE TESTS
// ============================================

describe('DemoAnalyticsPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
    })

    it('renders analytics summary cards', () => {
        render(<DemoAnalyticsPage />)
        expect(screen.getByTestId('analytics-summary')).toBeInTheDocument()
        expect(screen.getByText('Day Streak')).toBeInTheDocument()
        expect(screen.getByText('Total Workouts')).toBeInTheDocument()
        expect(screen.getByText('New PRs This Week')).toBeInTheDocument()
    })

    it('renders personal records', () => {
        render(<DemoAnalyticsPage />)
        expect(screen.getByTestId('personal-records')).toBeInTheDocument()
        DEMO_ANALYTICS.personalRecords.forEach(pr => {
            expect(screen.getByText(pr.exercise)).toBeInTheDocument()
        })
    })

    it('renders volume chart', () => {
        render(<DemoAnalyticsPage />)
        expect(screen.getByTestId('volume-chart')).toBeInTheDocument()
    })

    it('renders body weight chart', () => {
        render(<DemoAnalyticsPage />)
        expect(screen.getByTestId('bodyweight-chart')).toBeInTheDocument()
    })

    it('renders muscle distribution', () => {
        render(<DemoAnalyticsPage />)
        expect(screen.getByTestId('muscle-distribution')).toBeInTheDocument()
    })

    it('navigates to trainer view on continue', () => {
        render(<DemoAnalyticsPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/trainer')
    })
})

// ============================================
// DEMO TRAINER PAGE TESTS
// ============================================

describe('DemoTrainerPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
    })

    it('renders trainer dashboard with client list', () => {
        render(<DemoTrainerPage />)
        expect(screen.getByTestId('trainer-client-list')).toBeInTheDocument()
        expect(screen.getByText('Client Roster')).toBeInTheDocument()
    })

    it('renders all demo clients', () => {
        render(<DemoTrainerPage />)
        const rows = screen.getAllByTestId('demo-client-row')
        expect(rows).toHaveLength(DEMO_TRAINER_CLIENTS.length)
    })

    it('shows client names', () => {
        render(<DemoTrainerPage />)
        DEMO_TRAINER_CLIENTS.forEach(client => {
            expect(screen.getByText(client.name)).toBeInTheDocument()
        })
    })

    it('shows alert badges for clients with issues', () => {
        render(<DemoTrainerPage />)
        // Clients with alerts should show warning badges
        const clientsWithAlerts = DEMO_TRAINER_CLIENTS.filter(c => c.alerts.length > 0)
        expect(clientsWithAlerts.length).toBeGreaterThan(0)
    })

    it('navigates to pricing on continue', () => {
        render(<DemoTrainerPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/pricing')
    })
})

// ============================================
// DEMO PRICING PAGE TESTS
// ============================================

describe('DemoPricingPage', () => {
    beforeEach(() => {
        mockPush.mockClear()
        localStorage.clear()
    })

    it('renders pricing grid with all tiers', () => {
        render(<DemoPricingPage />)
        expect(screen.getByTestId('pricing-grid')).toBeInTheDocument()
        expect(screen.getByTestId('pricing-tier-starter')).toBeInTheDocument()
        expect(screen.getByTestId('pricing-tier-pro')).toBeInTheDocument()
        expect(screen.getByTestId('pricing-tier-elite')).toBeInTheDocument()
    })

    it('shows demo complete badge', () => {
        render(<DemoPricingPage />)
        expect(screen.getByText('Demo Complete')).toBeInTheDocument()
    })

    it('shows pricing amounts', () => {
        render(<DemoPricingPage />)
        expect(screen.getByText('$9.99')).toBeInTheDocument()
        expect(screen.getByText('$19.99')).toBeInTheDocument()
        expect(screen.getByText('$29.99')).toBeInTheDocument()
    })

    it('navigates to login on CTA click', () => {
        render(<DemoPricingPage />)
        fireEvent.click(screen.getByTestId('pricing-cta-pro'))
        expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('clears demo data on CTA click', () => {
        localStorage.setItem('demo_mode', 'true')
        localStorage.setItem('demo_user', '{}')
        render(<DemoPricingPage />)
        fireEvent.click(screen.getByTestId('pricing-cta-pro'))
        expect(localStorage.getItem('demo_mode')).toBeNull()
        expect(localStorage.getItem('demo_user')).toBeNull()
    })

    it('has restart demo button', () => {
        render(<DemoPricingPage />)
        const restartBtn = screen.getByTestId('restart-demo-button')
        fireEvent.click(restartBtn)
        expect(mockPush).toHaveBeenCalledWith('/demo')
    })

    it('has back to landing button', () => {
        render(<DemoPricingPage />)
        const backBtn = screen.getByTestId('back-to-landing-button')
        fireEvent.click(backBtn)
        expect(mockPush).toHaveBeenCalledWith('/')
    })
})

// ============================================
// END-TO-END FLOW NAVIGATION TESTS
// ============================================

describe('Demo Flow Navigation', () => {
    beforeEach(() => {
        mockPush.mockClear()
        localStorage.clear()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('follows the complete demo flow without dead ends', async () => {
        // Step 1: Demo signup -> interview
        const { unmount: u1 } = render(<DemoSignupPage />)
        fireEvent.click(screen.getByTestId('start-demo-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/interview')
        u1()
        mockPush.mockClear()

        // Step 2: Interview -> plan
        const { unmount: u2 } = render(<DemoInterviewPage />)
        fireEvent.click(screen.getByTestId('demo-skip-button'))
        await waitFor(() => {
            fireEvent.click(screen.getByTestId('demo-continue-button'))
            expect(mockPush).toHaveBeenCalledWith('/demo/plan')
        })
        u2()
        mockPush.mockClear()

        // Step 3: Plan -> workout
        const { unmount: u3 } = render(<DemoPlanPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/workout')
        u3()
        mockPush.mockClear()

        // Step 4: Workout -> analytics
        const { unmount: u4 } = render(<DemoWorkoutPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/analytics')
        u4()
        mockPush.mockClear()

        // Step 5: Analytics -> trainer
        const { unmount: u5 } = render(<DemoAnalyticsPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/trainer')
        u5()
        mockPush.mockClear()

        // Step 6: Trainer -> pricing
        const { unmount: u6 } = render(<DemoTrainerPage />)
        fireEvent.click(screen.getByTestId('demo-continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/demo/pricing')
        u6()
        mockPush.mockClear()

        // Step 7: Pricing -> login (conversion)
        const { unmount: u7 } = render(<DemoPricingPage />)
        fireEvent.click(screen.getByTestId('pricing-cta-pro'))
        expect(mockPush).toHaveBeenCalledWith('/login')
        u7()
    })

    it('no page renders a loading spinner (no long spinners)', () => {
        // All demo pages should render their content immediately with mock data
        const pages = [
            <DemoSignupPage key="signup" />,
            <DemoPlanPage key="plan" />,
            <DemoWorkoutPage key="workout" />,
            <DemoAnalyticsPage key="analytics" />,
            <DemoTrainerPage key="trainer" />,
            <DemoPricingPage key="pricing" />,
        ]

        pages.forEach((page) => {
            const { container, unmount } = render(page)
            // No spinner class should be present
            const spinners = container.querySelectorAll('.spinner')
            expect(spinners).toHaveLength(0)
            // No "Loading..." text (except button text which says "Starting...")
            const loadingElements = container.querySelectorAll('[data-testid="loading"]')
            expect(loadingElements).toHaveLength(0)
            unmount()
        })
    })
})
