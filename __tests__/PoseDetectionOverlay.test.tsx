import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
    const React = require('react')
    return {
        motion: {
            div: React.forwardRef(({ children, ...props }: any, ref: any) => {
                const filteredProps = Object.fromEntries(
                    Object.entries(props).filter(([key]) =>
                        !['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap'].includes(key)
                    )
                )
                return <div ref={ref} {...filteredProps}>{children}</div>
            }),
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    }
})

// Mock MediaPipe
const mockDetectForVideo = jest.fn().mockReturnValue({ landmarks: [] })
const mockCreateFromOptions = jest.fn().mockResolvedValue({
    detectForVideo: mockDetectForVideo,
})
const mockForVisionTasks = jest.fn().mockResolvedValue({})

jest.mock('@mediapipe/tasks-vision', () => ({
    FilesetResolver: {
        forVisionTasks: (...args: unknown[]) => mockForVisionTasks(...args),
    },
    PoseLandmarker: {
        createFromOptions: (...args: unknown[]) => mockCreateFromOptions(...args),
    },
}))

// Mock getUserMedia
const mockGetUserMedia = jest.fn()
const mockStopTrack = jest.fn()

beforeEach(() => {
    jest.clearAllMocks()

    mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: mockStopTrack }],
    })

    Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
        configurable: true,
    })

    // Mock HTMLVideoElement.play
    HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined)

    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        // Don't call callback to avoid infinite loop in tests
        return 1
    })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
    })
})

import PoseDetectionOverlay from '@/components/PoseDetectionOverlay'

describe('PoseDetectionOverlay', () => {
    it('renders nothing when not visible', () => {
        const { container } = render(
            <PoseDetectionOverlay visible={false} onClose={jest.fn()} />
        )
        expect(container.innerHTML).toBe('')
    })

    it('renders the overlay when visible', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        expect(screen.getByTestId('pose-detection-overlay')).toBeInTheDocument()
    })

    it('renders video and canvas elements', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        expect(screen.getByTestId('pose-video')).toBeInTheDocument()
        expect(screen.getByTestId('pose-canvas')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        expect(screen.getByTestId('pose-loading')).toBeInTheDocument()
        expect(screen.getByText('Loading pose detection...')).toBeInTheDocument()
    })

    it('renders close button with correct aria-label', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        const closeBtn = screen.getByTestId('pose-close-btn')
        expect(closeBtn).toBeInTheDocument()
        expect(closeBtn).toHaveAttribute('aria-label', 'Close pose detection')
    })

    it('calls onClose when close button is clicked', () => {
        const mockOnClose = jest.fn()
        render(
            <PoseDetectionOverlay visible={true} onClose={mockOnClose} />
        )
        fireEvent.click(screen.getByTestId('pose-close-btn'))
        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('stops camera tracks when close button is clicked', async () => {
        // Simulate camera being started by triggering onloadeddata
        mockGetUserMedia.mockResolvedValue({
            getTracks: () => [{ stop: mockStopTrack }],
        })

        const mockOnClose = jest.fn()
        render(
            <PoseDetectionOverlay visible={true} onClose={mockOnClose} />
        )

        // Wait for getUserMedia to be called
        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalled()
        })

        fireEvent.click(screen.getByTestId('pose-close-btn'))
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('requests camera with user-facing mode for mobile', async () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalledWith(
                expect.objectContaining({
                    video: expect.objectContaining({
                        facingMode: 'user',
                    }),
                    audio: false,
                })
            )
        })
    })

    it('initializes MediaPipe PoseLandmarker', async () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(mockForVisionTasks).toHaveBeenCalledWith(
                expect.stringContaining('mediapipe')
            )
        })

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    runningMode: 'VIDEO',
                    numPoses: 1,
                })
            )
        })
    })

    it('shows error state when camera access is denied', async () => {
        mockGetUserMedia.mockRejectedValueOnce(
            new DOMException('Permission denied', 'NotAllowedError')
        )

        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(screen.getByTestId('pose-error')).toBeInTheDocument()
        })
        expect(screen.getByText('Camera access denied. Please allow camera permissions.')).toBeInTheDocument()
    })

    it('shows error state when no camera is found', async () => {
        mockGetUserMedia.mockRejectedValueOnce(
            new DOMException('No camera', 'NotFoundError')
        )

        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(screen.getByTestId('pose-error')).toBeInTheDocument()
        })
        expect(screen.getByText('No camera found on this device.')).toBeInTheDocument()
    })

    it('provides a retry button on error', async () => {
        mockGetUserMedia.mockRejectedValueOnce(new Error('fail'))

        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(screen.getByTestId('pose-error')).toBeInTheDocument()
        })

        const retryBtn = screen.getByText('Retry')
        expect(retryBtn).toBeInTheDocument()

        // Mock success on retry
        mockGetUserMedia.mockResolvedValueOnce({
            getTracks: () => [{ stop: mockStopTrack }],
        })

        fireEvent.click(retryBtn)

        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalledTimes(2)
        })
    })

    it('cleans up when visibility changes to false', async () => {
        const { rerender } = render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )

        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalled()
        })

        rerender(
            <PoseDetectionOverlay visible={false} onClose={jest.fn()} />
        )

        // Component should render nothing
        expect(screen.queryByTestId('pose-detection-overlay')).not.toBeInTheDocument()
    })

    it('video element has playsInline attribute for mobile Safari', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        const video = screen.getByTestId('pose-video') as HTMLVideoElement
        expect(video).toHaveAttribute('playsinline')
    })

    it('video element is muted for autoplay policy', () => {
        render(
            <PoseDetectionOverlay visible={true} onClose={jest.fn()} />
        )
        const video = screen.getByTestId('pose-video') as HTMLVideoElement
        expect(video.muted).toBe(true)
    })
})
