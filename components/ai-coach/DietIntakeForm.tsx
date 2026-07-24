'use client';

import type { DietIntakeFormData } from '@/lib/types';

interface DietIntakeFormProps {
    formData: DietIntakeFormData;
    onFieldChange: (field: keyof DietIntakeFormData, value: string) => void;
}

interface FormSection {
    title: string;
    fields: { key: keyof DietIntakeFormData; label: string; multiline?: boolean }[];
}

const FORM_SECTIONS: FormSection[] = [
    {
        title: 'Allergies & Intolerances',
        fields: [
            { key: 'allergies', label: 'Food Allergies', multiline: true },
            { key: 'intolerances', label: 'Food Intolerances', multiline: true },
        ],
    },
    {
        title: 'Dietary Preferences',
        fields: [
            { key: 'diet_style', label: 'Diet Style (e.g. keto, vegan, Mediterranean)', multiline: true },
        ],
    },
    {
        title: 'Food Preferences',
        fields: [
            { key: 'foods_love', label: 'Foods You Love', multiline: true },
            { key: 'foods_hate', label: 'Foods You Hate', multiline: true },
        ],
    },
    {
        title: 'Medical & Dietary Considerations',
        fields: [
            { key: 'medical_dietary_considerations', label: 'Medical / Dietary Considerations', multiline: true },
        ],
    },
    {
        title: 'Meal Preferences',
        fields: [
            { key: 'meals_per_day', label: 'Meals Per Day' },
            { key: 'cooking_preferences', label: 'Cooking Preferences', multiline: true },
        ],
    },
];

const fieldClass = (isFilled: boolean): string =>
    `w-full rounded-lg border px-3 py-[0.6rem] text-[0.85rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand ${
        isFilled ? 'border-brand/25 bg-brand/5' : 'border-line-soft bg-[var(--surface-1)]'
    }`;

export default function DietIntakeForm({ formData, onFieldChange }: DietIntakeFormProps) {
    return (
        <div className="h-full overflow-y-auto px-4 py-5 md:px-6">
            {/* Paper-style header */}
            <div className="mb-6 border-b-2 border-brand/30 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold text-ink-hi">
                    Nutrition Intake Form
                </h2>
                <p className="text-[0.8rem] text-ink-mid">
                    This form auto-fills as you chat with Dr. Nadia. You can also edit fields directly.
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
                                                data-testid={`diet-field-${field.key}`}
                                                value={value}
                                                onChange={(e) =>
                                                    onFieldChange(field.key, e.target.value)
                                                }
                                                rows={3}
                                                className={`${fieldClass(isFilled)} resize-y leading-normal`}
                                            />
                                        ) : (
                                            <input
                                                data-testid={`diet-field-${field.key}`}
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
