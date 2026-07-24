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
        <div className="flex items-center gap-1 px-4 py-2">
            {INTERVIEW_STEPS.map((step) => {
                const isComplete = completedSteps.includes(step.id);
                const isActive = step.id === activeStep;

                return (
                    <div
                        key={step.id}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            isComplete
                                ? 'bg-[image:var(--brand-gradient)] shadow-[0_0_8px_var(--brand-glow-soft)]'
                                : isActive
                                ? 'bg-brand/50'
                                : 'bg-[var(--line-soft)]'
                        }`}
                        data-complete={isComplete ? 'true' : 'false'}
                        data-active={isActive ? 'true' : 'false'}
                        title={step.label}
                    />
                );
            })}
        </div>
    );
}

export { INTERVIEW_STEPS };
