import { render, screen } from '@testing-library/react'
import { system } from '@/lib/theme'
import { ChakraProvider, Box, Text } from '@chakra-ui/react'

// Simple wrapper to test that ChakraProvider works with our custom system
function TestProvider({ children }: { children: React.ReactNode }) {
    return <ChakraProvider value={system}>{children}</ChakraProvider>
}

describe('Chakra UI Theme', () => {
    it('renders children within ChakraProvider without errors', () => {
        render(
            <TestProvider>
                <div data-testid="child">Hello</div>
            </TestProvider>
        )
        expect(screen.getByTestId('child')).toBeInTheDocument()
        expect(screen.getByTestId('child')).toHaveTextContent('Hello')
    })

    it('renders Chakra Box component', () => {
        render(
            <TestProvider>
                <Box data-testid="chakra-box" p="4">
                    Chakra Box
                </Box>
            </TestProvider>
        )
        expect(screen.getByTestId('chakra-box')).toBeInTheDocument()
        expect(screen.getByTestId('chakra-box')).toHaveTextContent('Chakra Box')
    })

    it('renders Chakra Text component', () => {
        render(
            <TestProvider>
                <Text data-testid="chakra-text">Styled Text</Text>
            </TestProvider>
        )
        expect(screen.getByTestId('chakra-text')).toBeInTheDocument()
        expect(screen.getByTestId('chakra-text')).toHaveTextContent('Styled Text')
    })

    it('system is created with custom theme tokens', () => {
        // Verify the system object exists and has the expected structure
        expect(system).toBeDefined()
        expect(system.token).toBeDefined()
    })

    it('has neon orange color tokens defined', () => {
        const neonOrange500 = system.token('colors.neonOrange.500')
        expect(neonOrange500).toBe('#FF6600')
    })

    it('has neon pink color tokens defined', () => {
        const neonPink500 = system.token('colors.neonPink.500')
        expect(neonPink500).toBe('#ff007f')
    })

    it('has dark background color tokens defined', () => {
        const dark700 = system.token('colors.dark.700')
        expect(dark700).toBe('#15151F')
    })

    it('renders multiple nested Chakra components', () => {
        render(
            <TestProvider>
                <Box data-testid="outer">
                    <Box data-testid="inner">
                        <Text data-testid="nested-text">Nested content</Text>
                    </Box>
                </Box>
            </TestProvider>
        )
        expect(screen.getByTestId('outer')).toBeInTheDocument()
        expect(screen.getByTestId('inner')).toBeInTheDocument()
        expect(screen.getByTestId('nested-text')).toHaveTextContent('Nested content')
    })
})
