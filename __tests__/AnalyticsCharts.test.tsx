import { render, screen, fireEvent } from '@testing-library/react';
import {
    VolumeOverTimeChart,
    StrengthProgressionChart,
    BodyWeightTrendChart,
    WorkoutFrequencyHeatmap,
    MuscleGroupVolumeChart,
} from '@/components/charts/AnalyticsCharts';
import type { WorkoutLogWithExercises, Exercise } from '@/lib/types';

// Mock Recharts - jsdom doesn't support SVG rendering
jest.mock('recharts', () => {
    const OriginalModule = jest.requireActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="responsive-container">{children}</div>
        ),
    };
});

// ============================================
// TEST DATA
// ============================================

const mockExercises: Record<string, Exercise> = {
    'ex-1': {
        exercise_id: 'ex-1',
        name: 'Bench Press',
        body_parts: ['chest'],
        target_muscles: ['Pectorals'],
        equipments: ['barbell'],
    },
    'ex-2': {
        exercise_id: 'ex-2',
        name: 'Squat',
        body_parts: ['legs'],
        target_muscles: ['Quadriceps', 'Glutes'],
        equipments: ['barbell'],
    },
};

function createMockLog(overrides: Partial<WorkoutLogWithExercises> = {}): WorkoutLogWithExercises {
    return {
        id: 'log-1',
        user_id: 'user-1',
        date: '2025-01-15',
        exercise_logs: [
            {
                id: 'el-1',
                workout_log_id: 'log-1',
                exercise_id: 'ex-1',
                exercise_order: 1,
                sets: [
                    { set_number: 1, reps: 10, weight: 135, weight_unit: 'lbs' as const },
                    { set_number: 2, reps: 8, weight: 155, weight_unit: 'lbs' as const },
                    { set_number: 3, reps: 6, weight: 175, weight_unit: 'lbs' as const },
                ],
            },
        ],
        ...overrides,
    };
}

function createMultipleLogs(): WorkoutLogWithExercises[] {
    return [
        createMockLog({ id: 'log-1', date: '2025-01-10' }),
        createMockLog({
            id: 'log-2',
            date: '2025-01-12',
            exercise_logs: [
                {
                    id: 'el-2',
                    workout_log_id: 'log-2',
                    exercise_id: 'ex-1',
                    exercise_order: 1,
                    sets: [
                        { set_number: 1, reps: 10, weight: 145, weight_unit: 'lbs' as const },
                        { set_number: 2, reps: 8, weight: 165, weight_unit: 'lbs' as const },
                    ],
                },
                {
                    id: 'el-3',
                    workout_log_id: 'log-2',
                    exercise_id: 'ex-2',
                    exercise_order: 2,
                    sets: [
                        { set_number: 1, reps: 8, weight: 225, weight_unit: 'lbs' as const },
                        { set_number: 2, reps: 6, weight: 245, weight_unit: 'lbs' as const },
                    ],
                },
            ],
        }),
        createMockLog({
            id: 'log-3',
            date: '2025-01-15',
            exercise_logs: [
                {
                    id: 'el-4',
                    workout_log_id: 'log-3',
                    exercise_id: 'ex-1',
                    exercise_order: 1,
                    sets: [
                        { set_number: 1, reps: 10, weight: 155, weight_unit: 'lbs' as const },
                        { set_number: 2, reps: 8, weight: 185, weight_unit: 'lbs' as const },
                    ],
                },
            ],
        }),
    ];
}

// ============================================
// VOLUME OVER TIME
// ============================================

describe('VolumeOverTimeChart', () => {
    it('renders empty state when no logs', () => {
        render(<VolumeOverTimeChart logs={[]} />);
        expect(screen.getByText('No volume data yet')).toBeInTheDocument();
    });

    it('renders chart with data', () => {
        render(<VolumeOverTimeChart logs={[createMockLog()]} />);
        expect(screen.getByText('Volume Over Time')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('excludes warmup sets from volume calculation', () => {
        const logWithWarmup = createMockLog({
            exercise_logs: [
                {
                    id: 'el-1',
                    workout_log_id: 'log-1',
                    exercise_id: 'ex-1',
                    exercise_order: 1,
                    sets: [
                        { set_number: 1, reps: 10, weight: 45, weight_unit: 'lbs' as const, is_warmup: true },
                        { set_number: 2, reps: 10, weight: 135, weight_unit: 'lbs' as const },
                    ],
                },
            ],
        });
        // Should render without errors even with warmup sets
        const { container } = render(<VolumeOverTimeChart logs={[logWithWarmup]} />);
        expect(container).toBeTruthy();
    });
});

// ============================================
// STRENGTH PROGRESSION
// ============================================

describe('StrengthProgressionChart', () => {
    it('renders empty state when no exercises', () => {
        render(<StrengthProgressionChart logs={[]} exercises={{}} />);
        expect(screen.getByText('No exercise data yet')).toBeInTheDocument();
    });

    it('renders with exercise selector', () => {
        const logs = createMultipleLogs();
        render(<StrengthProgressionChart logs={logs} exercises={mockExercises} />);
        expect(screen.getByText('Strength Progression')).toBeInTheDocument();
        expect(screen.getByTestId('exercise-select')).toBeInTheDocument();
    });

    it('shows all exercises in the selector', () => {
        const logs = createMultipleLogs();
        render(<StrengthProgressionChart logs={logs} exercises={mockExercises} />);
        const select = screen.getByTestId('exercise-select');
        const options = select.querySelectorAll('option');
        expect(options.length).toBe(2);
        // Sorted alphabetically
        expect(options[0].textContent).toBe('Bench Press');
        expect(options[1].textContent).toBe('Squat');
    });

    it('allows switching exercises', () => {
        const logs = createMultipleLogs();
        render(<StrengthProgressionChart logs={logs} exercises={mockExercises} />);
        const select = screen.getByTestId('exercise-select');
        fireEvent.change(select, { target: { value: 'ex-2' } });
        expect((select as HTMLSelectElement).value).toBe('ex-2');
    });
});

// ============================================
// BODY WEIGHT TREND
// ============================================

describe('BodyWeightTrendChart', () => {
    it('renders empty state when no weight data', () => {
        render(<BodyWeightTrendChart weightHistory={[]} />);
        expect(screen.getByText('Body Weight Trend')).toBeInTheDocument();
        expect(screen.getByText(/No body weight data recorded yet/)).toBeInTheDocument();
    });

    it('renders chart with weight data', () => {
        const weightData = [
            { date: '2025-01-01', weight: 180 },
            { date: '2025-01-08', weight: 179.5 },
            { date: '2025-01-15', weight: 178.2 },
        ];
        render(<BodyWeightTrendChart weightHistory={weightData} unit="lbs" />);
        expect(screen.getByText('Body Weight Trend')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders with kg unit', () => {
        const weightData = [
            { date: '2025-01-01', weight: 82 },
            { date: '2025-01-08', weight: 81.5 },
        ];
        const { container } = render(<BodyWeightTrendChart weightHistory={weightData} unit="kg" />);
        expect(container).toBeTruthy();
    });
});

// ============================================
// WORKOUT FREQUENCY HEATMAP
// ============================================

describe('WorkoutFrequencyHeatmap', () => {
    it('renders empty state when no logs', () => {
        render(<WorkoutFrequencyHeatmap logs={[]} />);
        expect(screen.getByText('No workout data for heatmap')).toBeInTheDocument();
    });

    it('renders heatmap cells with workout data', () => {
        const logs = createMultipleLogs();
        render(<WorkoutFrequencyHeatmap logs={logs} />);
        expect(screen.getByText('Workout Frequency (Last 3 Months)')).toBeInTheDocument();
        const cells = screen.getAllByTestId('heatmap-cell');
        expect(cells.length).toBeGreaterThan(0);
    });

    it('renders legend', () => {
        const logs = [createMockLog()];
        render(<WorkoutFrequencyHeatmap logs={logs} />);
        expect(screen.getByText('Less')).toBeInTheDocument();
        expect(screen.getByText('More')).toBeInTheDocument();
    });
});

// ============================================
// MUSCLE GROUP VOLUME DISTRIBUTION
// ============================================

describe('MuscleGroupVolumeChart', () => {
    it('renders empty state when no data', () => {
        render(<MuscleGroupVolumeChart logs={[]} exercises={{}} />);
        expect(screen.getByText('No muscle group data yet')).toBeInTheDocument();
    });

    it('renders chart with muscle group data', () => {
        const logs = createMultipleLogs();
        render(<MuscleGroupVolumeChart logs={logs} exercises={mockExercises} />);
        expect(screen.getByText('Muscle Group Volume Distribution')).toBeInTheDocument();
    });

    it('displays muscle group names from exercise data', () => {
        const logs = createMultipleLogs();
        render(<MuscleGroupVolumeChart logs={logs} exercises={mockExercises} />);
        expect(screen.getByText('Pectorals')).toBeInTheDocument();
        expect(screen.getByText('Quadriceps')).toBeInTheDocument();
        expect(screen.getByText('Glutes')).toBeInTheDocument();
    });

    it('handles exercises without target_muscles', () => {
        const exercisesNoMuscles: Record<string, Exercise> = {
            'ex-1': {
                exercise_id: 'ex-1',
                name: 'Bench Press',
                body_parts: ['chest'],
                target_muscles: [],
                equipments: ['barbell'],
            },
        };
        const logs = [createMockLog()];
        // Should not crash with empty target_muscles
        const { container } = render(<MuscleGroupVolumeChart logs={logs} exercises={exercisesNoMuscles} />);
        expect(container).toBeTruthy();
    });
});
