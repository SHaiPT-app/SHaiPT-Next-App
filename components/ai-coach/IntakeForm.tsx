'use client';

import { Box, Text, Flex, VStack } from '@chakra-ui/react';
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

export default function IntakeForm({ formData, onFieldChange }: IntakeFormProps) {
    return (
        <Box
            h="100%"
            overflowY="auto"
            px={{ base: '1rem', md: '1.5rem' }}
            py="1.25rem"
        >
            {/* Paper-style header */}
            <Box
                mb="1.5rem"
                pb="1rem"
                borderBottom="2px solid rgba(255, 102, 0, 0.3)"
            >
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
                    This form auto-fills as you chat with your coach. You can also edit fields directly.
                </Text>
            </Box>

            <VStack gap="1.5rem" align="stretch">
                {FORM_SECTIONS.map((section) => (
                    <Box key={section.title}>
                        <Text
                            fontSize="0.75rem"
                            fontWeight="700"
                            color="var(--neon-orange)"
                            textTransform="uppercase"
                            letterSpacing="0.08em"
                            mb="0.75rem"
                            fontFamily="var(--font-orbitron)"
                        >
                            {section.title}
                        </Text>
                        <VStack gap="0.6rem" align="stretch">
                            {section.fields.map((field) => {
                                const value = formData[field.key];
                                const isFilled = value.trim().length > 0;

                                return (
                                    <Box key={field.key}>
                                        <Flex
                                            alignItems="center"
                                            gap="0.5rem"
                                            mb="0.25rem"
                                        >
                                            <Text
                                                fontSize="0.75rem"
                                                color="#aaa"
                                                fontWeight="500"
                                            >
                                                {field.label}
                                            </Text>
                                            {isFilled && (
                                                <Box
                                                    w="6px"
                                                    h="6px"
                                                    borderRadius="50%"
                                                    bg="var(--neon-orange)"
                                                    flexShrink={0}
                                                />
                                            )}
                                        </Flex>
                                        {field.multiline ? (
                                            <textarea
                                                data-testid={`intake-field-${field.key}`}
                                                value={value}
                                                onChange={(e) =>
                                                    onFieldChange(field.key, e.target.value)
                                                }
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem 0.75rem',
                                                    fontSize: '0.85rem',
                                                    background: isFilled
                                                        ? 'rgba(255, 102, 0, 0.05)'
                                                        : 'rgba(255, 255, 255, 0.03)',
                                                    border: isFilled
                                                        ? '1px solid rgba(255, 102, 0, 0.25)'
                                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: 'var(--foreground)',
                                                    outline: 'none',
                                                    resize: 'vertical',
                                                    transition: 'all 0.3s ease',
                                                    fontFamily: 'inherit',
                                                    lineHeight: '1.5',
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--neon-orange)';
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor = isFilled
                                                        ? 'rgba(255, 102, 0, 0.25)'
                                                        : 'rgba(255, 255, 255, 0.1)';
                                                }}
                                            />
                                        ) : (
                                            <input
                                                data-testid={`intake-field-${field.key}`}
                                                value={value}
                                                onChange={(e) =>
                                                    onFieldChange(field.key, e.target.value)
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem 0.75rem',
                                                    fontSize: '0.85rem',
                                                    background: isFilled
                                                        ? 'rgba(255, 102, 0, 0.05)'
                                                        : 'rgba(255, 255, 255, 0.03)',
                                                    border: isFilled
                                                        ? '1px solid rgba(255, 102, 0, 0.25)'
                                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: 'var(--foreground)',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease',
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--neon-orange)';
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor = isFilled
                                                        ? 'rgba(255, 102, 0, 0.25)'
                                                        : 'rgba(255, 255, 255, 0.1)';
                                                }}
                                            />
                                        )}
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                ))}
            </VStack>
        </Box>
    );
}
