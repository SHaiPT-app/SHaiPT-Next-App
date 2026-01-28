'use client';

import { Box, Text, Flex, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Check, Star } from 'lucide-react';

const MotionBox = motion.create(Box);

export interface SplitOption {
    id: string;
    name: string;
    description: string;
    days_per_week: number;
    recommended: boolean;
}

interface SplitSelectionProps {
    splits: SplitOption[];
    selectedSplit: string | null;
    onSelectSplit: (splitId: string) => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export default function SplitSelection({
    splits,
    selectedSplit,
    onSelectSplit,
    onConfirm,
    isLoading,
}: SplitSelectionProps) {
    return (
        <MotionBox
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            p="1rem"
            data-testid="split-selection"
        >
            <Box
                p="1rem"
                borderRadius="12px"
                bg="rgba(255, 102, 0, 0.05)"
                border="1px solid rgba(255, 102, 0, 0.2)"
            >
                <Text
                    fontFamily="var(--font-orbitron)"
                    fontSize="0.9rem"
                    fontWeight="600"
                    color="var(--neon-orange)"
                    mb="0.5rem"
                >
                    Choose Your Training Split
                </Text>
                <Text fontSize="0.8rem" color="#888" mb="1rem">
                    Based on your profile, here are the best options. Select one to generate your plan.
                </Text>

                <VStack gap="0.5rem" align="stretch">
                    {splits.map((split) => {
                        const isSelected = selectedSplit === split.id;
                        return (
                            <button
                                key={split.id}
                                onClick={() => onSelectSplit(split.id)}
                                data-testid={`split-option-${split.id}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    background: isSelected
                                        ? 'rgba(255, 102, 0, 0.15)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                    border: isSelected
                                        ? '2px solid #FF6600'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'var(--foreground)',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                }}
                            >
                                {/* Selection indicator */}
                                <Box
                                    w="20px"
                                    h="20px"
                                    borderRadius="50%"
                                    border={isSelected ? '2px solid #FF6600' : '2px solid rgba(255, 255, 255, 0.2)'}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                    bg={isSelected ? '#FF6600' : 'transparent'}
                                >
                                    {isSelected && <Check size={12} color="#0B0B15" />}
                                </Box>

                                <Box flex={1}>
                                    <Flex alignItems="center" gap="0.5rem">
                                        <Text fontWeight="600" fontSize="0.9rem">
                                            {split.name}
                                        </Text>
                                        {split.recommended && (
                                            <Flex
                                                alignItems="center"
                                                gap="0.2rem"
                                                px="0.4rem"
                                                py="0.1rem"
                                                borderRadius="4px"
                                                bg="rgba(255, 102, 0, 0.2)"
                                            >
                                                <Star size={10} color="#FF6600" fill="#FF6600" />
                                                <Text fontSize="0.65rem" color="#FF6600" fontWeight="600">
                                                    Recommended
                                                </Text>
                                            </Flex>
                                        )}
                                    </Flex>
                                    <Text fontSize="0.8rem" color="#888" mt="0.15rem">
                                        {split.description}
                                    </Text>
                                    <Text fontSize="0.7rem" color="#666" mt="0.1rem">
                                        {split.days_per_week} days/week
                                    </Text>
                                </Box>
                            </button>
                        );
                    })}
                </VStack>

                <button
                    onClick={onConfirm}
                    disabled={!selectedSplit || isLoading}
                    data-testid="confirm-split-btn"
                    style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: !selectedSplit || isLoading
                            ? 'rgba(255, 102, 0, 0.3)'
                            : '#FF6600',
                        color: !selectedSplit || isLoading ? '#888' : '#0B0B15',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        fontFamily: 'var(--font-orbitron)',
                        cursor: !selectedSplit || isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {isLoading ? 'Generating Plan...' : 'Generate My Plan'}
                </button>
            </Box>
        </MotionBox>
    );
}
