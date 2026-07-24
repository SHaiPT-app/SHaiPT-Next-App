'use client';

import { useCallback } from 'react';
import type { IntakeFormDataV2, TrainingLocationType } from '@/lib/types';
import { EQUIPMENT_BY_LOCATION, LOCATION_LABELS } from '@/data/equipment';
import { getGoalsForCoach } from '@/data/fitnessGoals';
import FieldTooltip from './FieldTooltip';
import IntakePhotoUpload from './IntakePhotoUpload';

interface IntakeFormV2Props {
    formData: IntakeFormDataV2;
    onChange: (data: Partial<IntakeFormDataV2>) => void;
    coachId: string;
    readOnly?: boolean;
    onPhotosSubmitted?: (files: File[]) => void;
    onPhotoSkip?: () => void;
    isUploadingPhotos?: boolean;
    showPhotoUpload?: boolean;
}

// Styles
const chipClass = (selected: boolean): string =>
    `cursor-pointer rounded-[10px] border text-center transition-all duration-200 ${
        selected
            ? 'border-brand bg-[var(--brand-glow-soft)] font-semibold text-brand'
            : 'border-line-soft bg-[var(--surface-1)] font-normal text-foreground hover:border-line-strong'
    }`;

const inputClass =
    'w-full rounded-lg border border-line-soft bg-[var(--surface-1)] px-3 py-[0.6rem] text-[0.85rem] text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand';

const labelClass = 'text-sm text-ink-mid';

const unitBtnClass = (selected: boolean, readOnly: boolean): string =>
    `border-none px-3 py-2 text-[0.8rem] font-semibold transition-colors ${
        selected
            ? 'bg-[image:var(--brand-gradient)] text-white'
            : 'bg-[var(--surface-1)] text-ink-low'
    } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`;

const ATHLETIC_HISTORY_OPTIONS = [
    { value: 'never', label: 'Never Trained' },
    { value: '<1yr', label: '< 1 Year' },
    { value: '1-3yr', label: '1-3 Years' },
    { value: '3-5yr', label: '3-5 Years' },
    { value: '5-10yr', label: '5-10 Years' },
    { value: '10+yr', label: '10+ Years' },
];

const FITNESS_LEVELS = [
    { value: 'beginner', label: 'Beginner', desc: 'New to fitness or returning after a long break' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Consistent training for 1-3 years' },
    { value: 'advanced', label: 'Advanced', desc: '3+ years of structured training' },
];

export default function IntakeFormV2({
    formData,
    onChange,
    coachId,
    readOnly = false,
    onPhotosSubmitted,
    onPhotoSkip,
    isUploadingPhotos = false,
    showPhotoUpload = false,
}: IntakeFormV2Props) {
    const goals = getGoalsForCoach(coachId);
    const locationEquipment = formData.training_location
        ? EQUIPMENT_BY_LOCATION[formData.training_location as TrainingLocationType] || []
        : [];

    const handleGoalClick = useCallback(
        (goal: string) => {
            if (readOnly) return;
            const current = [...formData.fitness_goals];
            const idx = current.indexOf(goal);
            if (idx >= 0) {
                current.splice(idx, 1);
            } else if (current.length < 3) {
                current.push(goal);
            }
            onChange({ fitness_goals: current });
        },
        [formData.fitness_goals, onChange, readOnly]
    );

    const handleEquipmentToggle = useCallback(
        (item: string) => {
            if (readOnly) return;
            const current = [...formData.equipment];
            const idx = current.indexOf(item);
            if (idx >= 0) {
                current.splice(idx, 1);
            } else {
                current.push(item);
            }
            onChange({ equipment: current });
        },
        [formData.equipment, onChange, readOnly]
    );

    const handleSelectAllEquipment = useCallback(() => {
        if (readOnly) return;
        onChange({ equipment: [...locationEquipment] });
    }, [locationEquipment, onChange, readOnly]);

    const handleDeselectAllEquipment = useCallback(() => {
        if (readOnly) return;
        onChange({ equipment: [] });
    }, [onChange, readOnly]);

    const handleDayClick = useCallback(
        (day: number) => {
            if (readOnly) return;
            onChange({ training_days: day });
        },
        [onChange, readOnly]
    );

    return (
        <div className="h-full overflow-y-auto px-4 py-5 md:px-6">
            {/* Header */}
            <div className="mb-6 border-b-2 border-brand/30 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold text-ink-hi">
                    Client Intake Form
                </h2>
                <p className="text-[0.8rem] text-ink-mid">
                    {readOnly
                        ? 'Your submitted intake information. Review before proceeding.'
                        : 'Fill in your details below. All fields are required unless marked optional.'}
                </p>
            </div>

            <div className="flex flex-col gap-7">
                {/* ─── Basic Info ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Basic Information
                    </h3>
                    <div className="flex flex-col gap-[0.6rem]">
                        {/* Name row */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <div className="mb-1 flex items-center gap-[0.4rem]">
                                    <span className={labelClass}>First Name</span>
                                    <FieldTooltip text="Your given name" />
                                </div>
                                <input
                                    data-testid="v2-first-name"
                                    value={formData.first_name}
                                    onChange={e => onChange({ first_name: e.target.value })}
                                    placeholder="e.g. John"
                                    readOnly={readOnly}
                                    className={inputClass}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="mb-1 flex items-center gap-[0.4rem]">
                                    <span className={labelClass}>Last Name</span>
                                    <FieldTooltip text="Your family name" />
                                </div>
                                <input
                                    data-testid="v2-last-name"
                                    value={formData.last_name}
                                    onChange={e => onChange({ last_name: e.target.value })}
                                    placeholder="e.g. Smith"
                                    readOnly={readOnly}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Age */}
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Age</span>
                                <FieldTooltip text="Your current age in years (2 digits)" />
                            </div>
                            <input
                                data-testid="v2-age"
                                type="number"
                                min={10}
                                max={99}
                                value={formData.age ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    onChange({ age: val ? parseInt(val, 10) : null });
                                }}
                                placeholder="e.g. 27"
                                readOnly={readOnly}
                                className={`${inputClass} max-w-[120px]`}
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Weight</span>
                                <FieldTooltip text="Your current body weight" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    data-testid="v2-weight"
                                    type="number"
                                    min={30}
                                    max={500}
                                    value={formData.weight_value ?? ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        onChange({ weight_value: val ? parseFloat(val) : null });
                                    }}
                                    placeholder="e.g. 180"
                                    readOnly={readOnly}
                                    className={`${inputClass} max-w-[120px]`}
                                />
                                <div className="flex overflow-hidden rounded-lg border border-line-soft">
                                    {(['lbs', 'kg'] as const).map(unit => (
                                        <button
                                            key={unit}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ weight_unit: unit })}
                                            className={unitBtnClass(formData.weight_unit === unit, readOnly)}
                                        >
                                            {unit}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Height */}
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Height</span>
                                <FieldTooltip text="Your height in your preferred unit" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {formData.height_unit === 'imperial' ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <input
                                                data-testid="v2-height-feet"
                                                type="number"
                                                min={3}
                                                max={8}
                                                value={formData.height_feet ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    onChange({ height_feet: val ? parseInt(val, 10) : null });
                                                }}
                                                placeholder="5"
                                                readOnly={readOnly}
                                                className={`${inputClass} max-w-[70px]`}
                                            />
                                            <span className="text-[0.85rem] text-ink-mid">ft</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                data-testid="v2-height-inches"
                                                type="number"
                                                min={0}
                                                max={11}
                                                value={formData.height_inches ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    onChange({ height_inches: val ? parseInt(val, 10) : null });
                                                }}
                                                placeholder="10"
                                                readOnly={readOnly}
                                                className={`${inputClass} max-w-[70px]`}
                                            />
                                            <span className="text-[0.85rem] text-ink-mid">in</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <input
                                            data-testid="v2-height-cm"
                                            type="number"
                                            min={100}
                                            max={250}
                                            value={formData.height_value ?? ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                onChange({ height_value: val ? parseFloat(val) : null });
                                            }}
                                            placeholder="178"
                                            readOnly={readOnly}
                                            className={`${inputClass} max-w-[100px]`}
                                        />
                                        <span className="text-[0.85rem] text-ink-mid">cm</span>
                                    </div>
                                )}
                                <div className="flex overflow-hidden rounded-lg border border-line-soft">
                                    {([
                                        { key: 'imperial', label: 'ft/in' },
                                        { key: 'metric', label: 'cm' },
                                    ] as const).map(u => (
                                        <button
                                            key={u.key}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ height_unit: u.key })}
                                            className={unitBtnClass(formData.height_unit === u.key, readOnly)}
                                        >
                                            {u.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Athletic History ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Athletic History
                    </h3>
                    <div className="mb-2 flex items-center gap-[0.4rem]">
                        <span className={labelClass}>How long have you been training?</span>
                        <FieldTooltip text="Select the option that best describes your training experience" />
                    </div>
                    <div className="flex flex-wrap gap-[0.4rem]">
                        {ATHLETIC_HISTORY_OPTIONS.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => !readOnly && onChange({ athletic_history: opt.value })}
                                className={`${chipClass(formData.athletic_history === opt.value)} px-[0.85rem] py-[0.65rem] text-[0.82rem]`}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Fitness Goals ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Fitness Goals
                    </h3>
                    <div className="mb-2 flex items-center gap-[0.4rem]">
                        <span className={labelClass}>Select up to 3 goals (click order = priority)</span>
                        <FieldTooltip text="Your first click is priority #1, second is #2, etc." />
                    </div>
                    <div className="flex flex-wrap gap-[0.4rem]">
                        {goals.map(goal => {
                            const idx = formData.fitness_goals.indexOf(goal);
                            const isSelected = idx >= 0;
                            return (
                                <div
                                    key={goal}
                                    onClick={() => handleGoalClick(goal)}
                                    className={`${chipClass(isSelected)} flex items-center gap-[0.35rem] px-[0.85rem] py-[0.65rem] text-[0.82rem]`}
                                >
                                    {isSelected && (
                                        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[0.65rem] font-bold text-white">
                                            {idx + 1}
                                        </span>
                                    )}
                                    {goal}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Training Schedule ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Training Schedule
                    </h3>
                    <div className="flex flex-col gap-3">
                        {/* Days per week */}
                        <div>
                            <div className="mb-2 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Days per week</span>
                                <FieldTooltip text="How many days per week can you train?" />
                            </div>
                            <div className="flex gap-[0.35rem]">
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                    <div
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border text-[0.85rem] font-semibold transition-colors ${
                                            formData.training_days === day
                                                ? 'border-brand bg-[var(--brand-glow-soft)] text-brand ring-1 ring-brand'
                                                : 'border-line-soft bg-[var(--surface-1)] text-ink-low hover:border-line-strong'
                                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Session Duration (minutes)</span>
                                <FieldTooltip text="How long is your typical training session?" />
                            </div>
                            <input
                                data-testid="v2-duration"
                                type="number"
                                min={15}
                                max={180}
                                value={formData.session_duration_minutes ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    onChange({ session_duration_minutes: val ? parseInt(val, 10) : null });
                                }}
                                placeholder="e.g. 60"
                                readOnly={readOnly}
                                className={`${inputClass} max-w-[120px]`}
                            />
                        </div>

                        {/* Preferred time */}
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Preferred Time</span>
                                <FieldTooltip text="When do you prefer to train?" />
                            </div>
                            <div className="flex items-center gap-[0.35rem]">
                                <input
                                    data-testid="v2-time-hour"
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={formData.preferred_time_hour ?? ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        onChange({ preferred_time_hour: val ? parseInt(val, 10) : null });
                                    }}
                                    placeholder="HH"
                                    readOnly={readOnly}
                                    className={`${inputClass} max-w-[60px] text-center`}
                                />
                                <span className="text-ink-mid">:</span>
                                <input
                                    data-testid="v2-time-minute"
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={formData.preferred_time_minute != null ? String(formData.preferred_time_minute).padStart(2, '0') : ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        onChange({ preferred_time_minute: val ? parseInt(val, 10) : null });
                                    }}
                                    placeholder="MM"
                                    readOnly={readOnly}
                                    className={`${inputClass} max-w-[60px] text-center`}
                                />
                                <div className="flex overflow-hidden rounded-lg border border-line-soft">
                                    {(['AM', 'PM'] as const).map(ampm => (
                                        <button
                                            key={ampm}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ preferred_time_ampm: ampm })}
                                            className={`border-none px-[0.6rem] py-[0.45rem] text-xs font-semibold transition-colors ${
                                                formData.preferred_time_ampm === ampm
                                                    ? 'bg-[image:var(--brand-gradient)] text-white'
                                                    : 'bg-[var(--surface-1)] text-ink-low'
                                            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {ampm}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Equipment & Location ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Equipment & Location
                    </h3>
                    <div className="flex flex-col gap-3">
                        <div>
                            <div className="mb-2 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Training Location</span>
                                <FieldTooltip text="Where will you primarily train?" />
                            </div>
                            <div className="flex flex-wrap gap-[0.4rem]">
                                {(Object.entries(LOCATION_LABELS) as [TrainingLocationType, string][]).map(
                                    ([key, label]) => (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                if (readOnly) return;
                                                onChange({ training_location: key, equipment: [] });
                                            }}
                                            className={`${chipClass(formData.training_location === key)} px-[0.85rem] py-[0.65rem] text-[0.82rem]`}
                                        >
                                            {label}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {formData.training_location && locationEquipment.length > 0 && (
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-[0.4rem]">
                                        <span className={labelClass}>Available Equipment</span>
                                        <FieldTooltip text="Check all equipment you have access to" />
                                    </div>
                                    {!readOnly && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllEquipment}
                                                className="cursor-pointer border-none bg-transparent text-[0.7rem] font-semibold text-brand"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllEquipment}
                                                className="cursor-pointer border-none bg-transparent text-[0.7rem] text-ink-low"
                                            >
                                                Deselect All
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-[0.4rem]">
                                    {locationEquipment.map(item => (
                                        <div
                                            key={item}
                                            onClick={() => handleEquipmentToggle(item)}
                                            className={`${chipClass(formData.equipment.includes(item))} px-[0.7rem] py-[0.45rem] text-[0.78rem]`}
                                        >
                                            {formData.equipment.includes(item) && (
                                                <span className="mr-[0.3rem]">&#10003;</span>
                                            )}
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Medical ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Medical History
                    </h3>
                    <div className="flex flex-col gap-[0.6rem]">
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Injuries / Limitations</span>
                                <span className="text-[0.65rem] italic text-ink-low">(Optional)</span>
                                <FieldTooltip text="Any past or current injuries, surgeries, or physical limitations" />
                            </div>
                            <textarea
                                data-testid="v2-injuries"
                                value={formData.injuries}
                                onChange={e => onChange({ injuries: e.target.value })}
                                placeholder="e.g. ACL surgery 2020 (fully recovered), mild lower back tightness"
                                readOnly={readOnly}
                                rows={3}
                                className={`${inputClass} resize-y leading-normal`}
                            />
                        </div>
                        <div>
                            <div className="mb-1 flex items-center gap-[0.4rem]">
                                <span className={labelClass}>Medical Considerations</span>
                                <span className="text-[0.65rem] italic text-ink-low">(Optional)</span>
                                <FieldTooltip text="Any medical conditions, medications, or health concerns" />
                            </div>
                            <textarea
                                data-testid="v2-medical"
                                value={formData.medical_considerations}
                                onChange={e => onChange({ medical_considerations: e.target.value })}
                                placeholder="e.g. Asthma (controlled), taking daily allergy medication"
                                readOnly={readOnly}
                                rows={3}
                                className={`${inputClass} resize-y leading-normal`}
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Fitness Level ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Fitness Level
                    </h3>
                    <div className="mb-2 flex items-center gap-[0.4rem]">
                        <span className={labelClass}>Self-assessment</span>
                        <FieldTooltip text="Be honest -- this helps us calibrate your starting point" />
                    </div>
                    <div className="flex flex-col gap-[0.4rem]">
                        {FITNESS_LEVELS.map(level => (
                            <div
                                key={level.value}
                                onClick={() => !readOnly && onChange({ fitness_level: level.value })}
                                className={`${chipClass(formData.fitness_level === level.value)} flex flex-col gap-[0.15rem] px-[0.85rem] py-[0.65rem] text-left text-[0.82rem]`}
                            >
                                <span className="text-[0.85rem] font-semibold">
                                    {level.label}
                                </span>
                                <span className="text-[0.72rem] font-normal text-ink-mid">
                                    {level.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Photo Upload ──────────────────────── */}
                <div>
                    <h3 className="eyebrow mb-3">
                        Physique Photos
                    </h3>
                    <p className={`${labelClass} mb-2`}>
                        Upload front, back, and side photos (optional)
                    </p>
                    {showPhotoUpload && onPhotosSubmitted && onPhotoSkip ? (
                        <IntakePhotoUpload
                            onPhotosSubmitted={onPhotosSubmitted}
                            onSkip={onPhotoSkip}
                            isUploading={isUploadingPhotos}
                        />
                    ) : (
                        <p className="text-[0.8rem] text-ink-low">
                            Photos can be uploaded during the chat interview or from your profile settings.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
