'use client';

import { useCallback } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
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
const cardStyle = (selected: boolean): React.CSSProperties => ({
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    border: selected ? '1.5px solid var(--neon-orange)' : '1.5px solid rgba(255, 255, 255, 0.1)',
    background: selected ? 'rgba(255, 102, 0, 0.12)' : 'rgba(255, 255, 255, 0.03)',
    color: selected ? 'var(--neon-orange)' : 'var(--foreground)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
    fontWeight: selected ? '600' : '400',
    fontSize: '0.82rem',
});

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'var(--foreground)',
    outline: 'none',
    transition: 'all 0.2s',
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--neon-orange)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-orbitron)',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#aaa',
    fontWeight: '500',
};

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
        <Box
            h="100%"
            overflowY="auto"
            px={{ base: '1rem', md: '1.5rem' }}
            py="1.25rem"
        >
            {/* Header */}
            <Box mb="1.5rem" pb="1rem" borderBottom="2px solid rgba(255, 102, 0, 0.3)">
                <Text
                    fontFamily="var(--font-orbitron)"
                    fontSize="1.1rem"
                    fontWeight="700"
                    color="var(--neon-orange)"
                    mb="0.25rem"
                >
                    Client Intake Form
                </Text>
                <Text fontSize="0.8rem" color="#888">
                    {readOnly
                        ? 'Your submitted intake information. Review before proceeding.'
                        : 'Fill in your details below. All fields are required unless marked optional.'}
                </Text>
            </Box>

            <VStack gap="1.75rem" align="stretch">
                {/* ─── Basic Info ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Basic Information
                    </Text>
                    <VStack gap="0.6rem" align="stretch">
                        {/* Name row */}
                        <Flex gap="0.5rem">
                            <Box flex={1}>
                                <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                    <Text style={labelStyle}>First Name</Text>
                                    <FieldTooltip text="Your given name" />
                                </Flex>
                                <input
                                    data-testid="v2-first-name"
                                    value={formData.first_name}
                                    onChange={e => onChange({ first_name: e.target.value })}
                                    placeholder="e.g. John"
                                    readOnly={readOnly}
                                    style={inputStyle}
                                />
                            </Box>
                            <Box flex={1}>
                                <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                    <Text style={labelStyle}>Last Name</Text>
                                    <FieldTooltip text="Your family name" />
                                </Flex>
                                <input
                                    data-testid="v2-last-name"
                                    value={formData.last_name}
                                    onChange={e => onChange({ last_name: e.target.value })}
                                    placeholder="e.g. Smith"
                                    readOnly={readOnly}
                                    style={inputStyle}
                                />
                            </Box>
                        </Flex>

                        {/* Age */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Age</Text>
                                <FieldTooltip text="Your current age in years (2 digits)" />
                            </Flex>
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
                                style={{ ...inputStyle, maxWidth: '120px' }}
                            />
                        </Box>

                        {/* Weight */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Weight</Text>
                                <FieldTooltip text="Your current body weight" />
                            </Flex>
                            <Flex gap="0.5rem" alignItems="center">
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
                                    style={{ ...inputStyle, maxWidth: '120px' }}
                                />
                                <Flex gap="0" borderRadius="8px" overflow="hidden" border="1px solid rgba(255,255,255,0.1)">
                                    {(['lbs', 'kg'] as const).map(unit => (
                                        <button
                                            key={unit}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ weight_unit: unit })}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                background: formData.weight_unit === unit ? 'var(--neon-orange)' : 'rgba(255,255,255,0.03)',
                                                color: formData.weight_unit === unit ? '#0B0B15' : '#888',
                                                border: 'none',
                                                cursor: readOnly ? 'default' : 'pointer',
                                            }}
                                        >
                                            {unit}
                                        </button>
                                    ))}
                                </Flex>
                            </Flex>
                        </Box>

                        {/* Height */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Height</Text>
                                <FieldTooltip text="Your height in your preferred unit" />
                            </Flex>
                            <Flex gap="0.5rem" alignItems="center" flexWrap="wrap">
                                {formData.height_unit === 'imperial' ? (
                                    <>
                                        <Flex alignItems="center" gap="0.25rem">
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
                                                style={{ ...inputStyle, maxWidth: '70px' }}
                                            />
                                            <Text color="#888" fontSize="0.85rem">ft</Text>
                                        </Flex>
                                        <Flex alignItems="center" gap="0.25rem">
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
                                                style={{ ...inputStyle, maxWidth: '70px' }}
                                            />
                                            <Text color="#888" fontSize="0.85rem">in</Text>
                                        </Flex>
                                    </>
                                ) : (
                                    <Flex alignItems="center" gap="0.25rem">
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
                                            style={{ ...inputStyle, maxWidth: '100px' }}
                                        />
                                        <Text color="#888" fontSize="0.85rem">cm</Text>
                                    </Flex>
                                )}
                                <Flex gap="0" borderRadius="8px" overflow="hidden" border="1px solid rgba(255,255,255,0.1)">
                                    {([
                                        { key: 'imperial', label: 'ft/in' },
                                        { key: 'metric', label: 'cm' },
                                    ] as const).map(u => (
                                        <button
                                            key={u.key}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ height_unit: u.key })}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                background: formData.height_unit === u.key ? 'var(--neon-orange)' : 'rgba(255,255,255,0.03)',
                                                color: formData.height_unit === u.key ? '#0B0B15' : '#888',
                                                border: 'none',
                                                cursor: readOnly ? 'default' : 'pointer',
                                            }}
                                        >
                                            {u.label}
                                        </button>
                                    ))}
                                </Flex>
                            </Flex>
                        </Box>
                    </VStack>
                </Box>

                {/* ─── Athletic History ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Athletic History
                    </Text>
                    <Flex alignItems="center" gap="0.4rem" mb="0.5rem">
                        <Text style={labelStyle}>How long have you been training?</Text>
                        <FieldTooltip text="Select the option that best describes your training experience" />
                    </Flex>
                    <Flex gap="0.4rem" flexWrap="wrap">
                        {ATHLETIC_HISTORY_OPTIONS.map(opt => (
                            <Box
                                key={opt.value}
                                onClick={() => !readOnly && onChange({ athletic_history: opt.value })}
                                style={cardStyle(formData.athletic_history === opt.value)}
                            >
                                {opt.label}
                            </Box>
                        ))}
                    </Flex>
                </Box>

                {/* ─── Fitness Goals ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Fitness Goals
                    </Text>
                    <Flex alignItems="center" gap="0.4rem" mb="0.5rem">
                        <Text style={labelStyle}>Select up to 3 goals (click order = priority)</Text>
                        <FieldTooltip text="Your first click is priority #1, second is #2, etc." />
                    </Flex>
                    <Flex gap="0.4rem" flexWrap="wrap">
                        {goals.map(goal => {
                            const idx = formData.fitness_goals.indexOf(goal);
                            const isSelected = idx >= 0;
                            return (
                                <Box
                                    key={goal}
                                    onClick={() => handleGoalClick(goal)}
                                    style={{
                                        ...cardStyle(isSelected),
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                    }}
                                >
                                    {isSelected && (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: 'var(--neon-orange)',
                                                color: '#0B0B15',
                                                fontSize: '0.65rem',
                                                fontWeight: '700',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {idx + 1}
                                        </span>
                                    )}
                                    {goal}
                                </Box>
                            );
                        })}
                    </Flex>
                </Box>

                {/* ─── Training Schedule ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Training Schedule
                    </Text>
                    <VStack gap="0.75rem" align="stretch">
                        {/* Days per week */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.5rem">
                                <Text style={labelStyle}>Days per week</Text>
                                <FieldTooltip text="How many days per week can you train?" />
                            </Flex>
                            <Flex gap="0.35rem">
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                    <Box
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: formData.training_days === day
                                                ? '2px solid var(--neon-orange)'
                                                : '1.5px solid rgba(255, 255, 255, 0.1)',
                                            background: formData.training_days === day
                                                ? 'rgba(255, 102, 0, 0.15)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            color: formData.training_days === day ? 'var(--neon-orange)' : '#888',
                                            fontWeight: '600',
                                            fontSize: '0.85rem',
                                            cursor: readOnly ? 'default' : 'pointer',
                                        }}
                                    >
                                        {day}
                                    </Box>
                                ))}
                            </Flex>
                        </Box>

                        {/* Duration */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Session Duration (minutes)</Text>
                                <FieldTooltip text="How long is your typical training session?" />
                            </Flex>
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
                                style={{ ...inputStyle, maxWidth: '120px' }}
                            />
                        </Box>

                        {/* Preferred time */}
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Preferred Time</Text>
                                <FieldTooltip text="When do you prefer to train?" />
                            </Flex>
                            <Flex gap="0.35rem" alignItems="center">
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
                                    style={{ ...inputStyle, maxWidth: '60px', textAlign: 'center' }}
                                />
                                <Text color="#888">:</Text>
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
                                    style={{ ...inputStyle, maxWidth: '60px', textAlign: 'center' }}
                                />
                                <Flex gap="0" borderRadius="8px" overflow="hidden" border="1px solid rgba(255,255,255,0.1)">
                                    {(['AM', 'PM'] as const).map(ampm => (
                                        <button
                                            key={ampm}
                                            type="button"
                                            onClick={() => !readOnly && onChange({ preferred_time_ampm: ampm })}
                                            style={{
                                                padding: '0.45rem 0.6rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: formData.preferred_time_ampm === ampm ? 'var(--neon-orange)' : 'rgba(255,255,255,0.03)',
                                                color: formData.preferred_time_ampm === ampm ? '#0B0B15' : '#888',
                                                border: 'none',
                                                cursor: readOnly ? 'default' : 'pointer',
                                            }}
                                        >
                                            {ampm}
                                        </button>
                                    ))}
                                </Flex>
                            </Flex>
                        </Box>
                    </VStack>
                </Box>

                {/* ─── Equipment & Location ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Equipment & Location
                    </Text>
                    <VStack gap="0.75rem" align="stretch">
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.5rem">
                                <Text style={labelStyle}>Training Location</Text>
                                <FieldTooltip text="Where will you primarily train?" />
                            </Flex>
                            <Flex gap="0.4rem" flexWrap="wrap">
                                {(Object.entries(LOCATION_LABELS) as [TrainingLocationType, string][]).map(
                                    ([key, label]) => (
                                        <Box
                                            key={key}
                                            onClick={() => {
                                                if (readOnly) return;
                                                onChange({ training_location: key, equipment: [] });
                                            }}
                                            style={cardStyle(formData.training_location === key)}
                                        >
                                            {label}
                                        </Box>
                                    )
                                )}
                            </Flex>
                        </Box>

                        {formData.training_location && locationEquipment.length > 0 && (
                            <Box>
                                <Flex alignItems="center" justifyContent="space-between" mb="0.5rem">
                                    <Flex alignItems="center" gap="0.4rem">
                                        <Text style={labelStyle}>Available Equipment</Text>
                                        <FieldTooltip text="Check all equipment you have access to" />
                                    </Flex>
                                    {!readOnly && (
                                        <Flex gap="0.5rem">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllEquipment}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: 'var(--neon-orange)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllEquipment}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: '#888',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Deselect All
                                            </button>
                                        </Flex>
                                    )}
                                </Flex>
                                <Flex gap="0.4rem" flexWrap="wrap">
                                    {locationEquipment.map(item => (
                                        <Box
                                            key={item}
                                            onClick={() => handleEquipmentToggle(item)}
                                            style={{
                                                ...cardStyle(formData.equipment.includes(item)),
                                                padding: '0.45rem 0.7rem',
                                                fontSize: '0.78rem',
                                            }}
                                        >
                                            {formData.equipment.includes(item) && (
                                                <span style={{ marginRight: '0.3rem' }}>&#10003;</span>
                                            )}
                                            {item}
                                        </Box>
                                    ))}
                                </Flex>
                            </Box>
                        )}
                    </VStack>
                </Box>

                {/* ─── Medical ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Medical History
                    </Text>
                    <VStack gap="0.6rem" align="stretch">
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Injuries / Limitations</Text>
                                <Text fontSize="0.65rem" color="#666" fontStyle="italic">(Optional)</Text>
                                <FieldTooltip text="Any past or current injuries, surgeries, or physical limitations" />
                            </Flex>
                            <textarea
                                data-testid="v2-injuries"
                                value={formData.injuries}
                                onChange={e => onChange({ injuries: e.target.value })}
                                placeholder="e.g. ACL surgery 2020 (fully recovered), mild lower back tightness"
                                readOnly={readOnly}
                                rows={3}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    lineHeight: '1.5',
                                }}
                            />
                        </Box>
                        <Box>
                            <Flex alignItems="center" gap="0.4rem" mb="0.25rem">
                                <Text style={labelStyle}>Medical Considerations</Text>
                                <Text fontSize="0.65rem" color="#666" fontStyle="italic">(Optional)</Text>
                                <FieldTooltip text="Any medical conditions, medications, or health concerns" />
                            </Flex>
                            <textarea
                                data-testid="v2-medical"
                                value={formData.medical_considerations}
                                onChange={e => onChange({ medical_considerations: e.target.value })}
                                placeholder="e.g. Asthma (controlled), taking daily allergy medication"
                                readOnly={readOnly}
                                rows={3}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    lineHeight: '1.5',
                                }}
                            />
                        </Box>
                    </VStack>
                </Box>

                {/* ─── Fitness Level ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Fitness Level
                    </Text>
                    <Flex alignItems="center" gap="0.4rem" mb="0.5rem">
                        <Text style={labelStyle}>Self-assessment</Text>
                        <FieldTooltip text="Be honest -- this helps us calibrate your starting point" />
                    </Flex>
                    <VStack gap="0.4rem" align="stretch">
                        {FITNESS_LEVELS.map(level => (
                            <Box
                                key={level.value}
                                onClick={() => !readOnly && onChange({ fitness_level: level.value })}
                                style={{
                                    ...cardStyle(formData.fitness_level === level.value),
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.15rem',
                                }}
                            >
                                <Text fontWeight="600" fontSize="0.85rem">
                                    {level.label}
                                </Text>
                                <Text fontSize="0.72rem" color="#888" fontWeight="400">
                                    {level.desc}
                                </Text>
                            </Box>
                        ))}
                    </VStack>
                </Box>

                {/* ─── Photo Upload ──────────────────────── */}
                <Box>
                    <Text style={sectionTitleStyle} mb="0.75rem">
                        Physique Photos
                    </Text>
                    <Text style={labelStyle} mb="0.5rem">
                        Upload front, back, and side photos (optional)
                    </Text>
                    {showPhotoUpload && onPhotosSubmitted && onPhotoSkip ? (
                        <IntakePhotoUpload
                            onPhotosSubmitted={onPhotosSubmitted}
                            onSkip={onPhotoSkip}
                            isUploading={isUploadingPhotos}
                        />
                    ) : (
                        <Text fontSize="0.8rem" color="#666">
                            Photos can be uploaded during the chat interview or from your profile settings.
                        </Text>
                    )}
                </Box>
            </VStack>
        </Box>
    );
}
