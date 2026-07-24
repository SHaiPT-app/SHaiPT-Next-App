'use client';

import type { IntakeFormData } from '@/lib/types';

interface IntakeFormProps {
    formData: IntakeFormData;
    onFieldChange: (field: keyof IntakeFormData, value: string) => void;
}

interface FormSection {
    title: string;
    fields: { key: keyof IntakeFormData; label: string; multiline?: boolean }[];
}

const FORM_SECTIONS: FormSection[] = [
    {
        title: 'Basic Information',
        fields: [
            { key: 'name', label: 'Name' },
            { key: 'age', label: 'Age' },
            { key: 'height', label: 'Height' },
            { key: 'weight', label: 'Weight' },
        ],
    },
    {
        title: 'Athletic History',
        fields: [
            { key: 'sport_history', label: 'Sport / Athletic History', multiline: true },
            { key: 'training_duration', label: 'Training Experience' },
            { key: 'training_style', label: 'Current Training Style' },
        ],
    },
    {
        title: 'Fitness Goals',
        fields: [
            { key: 'fitness_goals', label: 'Goals', multiline: true },
        ],
    },
    {
        title: 'Training Schedule',
        fields: [
            { key: 'training_days_per_week', label: 'Days Per Week' },
            { key: 'session_duration', label: 'Session Duration' },
            { key: 'preferred_time', label: 'Preferred Time' },
        ],
    },
    {
        title: 'Equipment & Location',
        fields: [
            { key: 'available_equipment', label: 'Available Equipment', multiline: true },
            { key: 'training_location', label: 'Training Location' },
        ],
    },
    {
        title: 'Medical History',
        fields: [
            { key: 'injuries', label: 'Injuries / Limitations', multiline: true },
            { key: 'medical_considerations', label: 'Medical Considerations', multiline: true },
        ],
    },
    {
        title: 'Self-Assessment',
        fields: [
            { key: 'fitness_level', label: 'Current Fitness Level' },
        ],
    },
];

const fieldClass = (isFilled: boolean): string =>
    `w-full rounded-lg border px-3 py-[0.6rem] text-[0.85rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand ${
        isFilled ? 'border-brand/25 bg-brand/5' : 'border-line-soft bg-[var(--surface-1)]'
    }`;

export default function IntakeForm({ formData, onFieldChange }: IntakeFormProps) {
    return (
        <div className="h-full overflow-y-auto px-4 py-5 md:px-6">
            {/* Paper-style header */}
            <div className="mb-6 border-b-2 border-brand/30 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold text-ink-hi">
                    Client Intake Form
                </h2>
                <p className="text-[0.8rem] text-ink-mid">
                    This form auto-fills as you chat with your coach. You can also edit fields directly.
                </p>
            </div>

            <div className="flex flex-col gap-6">
                {FORM_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <h3 className="eyebrow mb-3">
                            {section.title}
                        </h3>
                        <div className="flex flex-col gap-[0.6rem]">
                            {section.fields.map((field) => {
                                const value = formData[field.key];
                                const isFilled = value.trim().length > 0;

                                return (
                                    <div key={field.key}>
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className="text-sm text-ink-mid">
                                                {field.label}
                                            </span>
                                            {isFilled && (
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_8px_var(--brand-glow)]" />
                                            )}
                                        </div>
                                        {field.multiline ? (
                                            <textarea
                                                data-testid={`intake-field-${field.key}`}
                                                value={value}
                                                onChange={(e) =>
                                                    onFieldChange(field.key, e.target.value)
                                                }
                                                rows={3}
                                                className={`${fieldClass(isFilled)} resize-y leading-normal`}
                                            />
                                        ) : (
                                            <input
                                                data-testid={`intake-field-${field.key}`}
                                                value={value}
                                                onChange={(e) =>
                                                    onFieldChange(field.key, e.target.value)
                                                }
                                                className={fieldClass(isFilled)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
