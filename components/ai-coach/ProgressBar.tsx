'use client';

const INTERVIEW_STEPS = [
    { id: 'basic_info', label: 'Basic Info' },
    { id: 'athletic_history', label: 'Athletic History' },
    { id: 'fitness_goals', label: 'Goals' },
    { id: 'training_schedule', label: 'Schedule' },
    { id: 'equipment_location', label: 'Equipment' },
    { id: 'medical', label: 'Medical' },
    { id: 'fitness_level', label: 'Level' },
    { id: 'photo_upload', label: 'Photos' },
];

interface ProgressBarProps {
    completedSteps: string[];
    activeStep?: string;
}

export default function ProgressBar({ completedSteps, activeStep }: ProgressBarProps) {
    return (
        <div className="interview-progress">
            {INTERVIEW_STEPS.map((step, i) => {
                const isComplete = completedSteps.includes(step.id);
                const isActive = step.id === activeStep;

                return (
                    <div
                        key={step.id}
                        className="interview-progress-step"
                        data-complete={isComplete ? 'true' : 'false'}
                        data-active={isActive ? 'true' : 'false'}
                        title={step.label}
                        style={i > 0 ? { marginLeft: '2px' } : undefined}
                    />
                );
            })}
        </div>
    );
}

export { INTERVIEW_STEPS };
