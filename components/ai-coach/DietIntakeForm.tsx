'use client';

import { Box, Text, Flex, VStack } from '@chakra-ui/react';
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

export default function DietIntakeForm({ formData, onFieldChange }: DietIntakeFormProps) {
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
                    Nutrition Intake Form
                </Text>
                <Text fontSize="0.8rem" color="#888">
                    This form auto-fills as you chat with Dr. Nadia. You can also edit fields directly.
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
                                                data-testid={`diet-field-${field.key}`}
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
                                                data-testid={`diet-field-${field.key}`}
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
