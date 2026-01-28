'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import { Box, Text, Input, Button, VStack, Heading, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { fadeInUp, tapScale } from '@/lib/animations';
import { User } from 'lucide-react';

const MotionBox = motion.create(Box);
const MotionButton = motion.create(Button);

function UsernameSetupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!userId || !email) {
            router.push('/login');
        }
    }, [userId, email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const existingEmailProfile = await db.profiles.getByEmail(email!);
            if (existingEmailProfile) {
                setError('This email is already associated with another account. Please log in instead.');
                setLoading(false);
                return;
            }

            const existingUser = await db.profiles.getByUsername(username);
            if (existingUser) {
                setError('Username already taken. Please choose another.');
                setLoading(false);
                return;
            }

            const profile = await db.profiles.create({
                id: userId!,
                username: username,
                email: email!,
                role: role,
                full_name: username
            });

            localStorage.setItem('user', JSON.stringify(profile));
            router.push('/home');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create profile';
            if (message.includes('profiles_email_unique')) {
                setError('This email is already associated with another account. Please log in instead.');
            } else {
                setError(message);
            }
            setLoading(false);
        }
    };

    if (!userId || !email) {
        return null;
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minH="100vh"
            p="1rem"
            bg="#15151F"
        >
            <MotionBox
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                bg="rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(10px)"
                border="1px solid rgba(255, 255, 255, 0.1)"
                borderRadius="16px"
                p={{ base: '1.5rem', md: '2rem' }}
                w="100%"
                maxW="420px"
                boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            >
                <VStack gap="1rem" align="stretch">
                    <Heading as="h2" size="lg" textAlign="center" color="white">
                        Complete Your Profile
                    </Heading>
                    <Text textAlign="center" color="gray.500" fontSize="sm">
                        Choose a username and your role to get started
                    </Text>

                    {/* Role toggle */}
                    <Flex
                        bg="var(--secondary)"
                        borderRadius="8px"
                        p="4px"
                    >
                        <Button
                            type="button"
                            onClick={() => setRole('trainee')}
                            flex={1}
                            h="40px"
                            bg={role === 'trainee' ? 'var(--primary)' : 'transparent'}
                            color={role === 'trainee' ? 'white' : 'var(--foreground)'}
                            borderRadius="6px"
                            fontWeight="500"
                            _hover={{ opacity: 0.9 }}
                            transition="all 0.2s"
                        >
                            Trainee
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setRole('trainer')}
                            flex={1}
                            h="40px"
                            bg={role === 'trainer' ? 'var(--primary)' : 'transparent'}
                            color={role === 'trainer' ? 'white' : 'var(--foreground)'}
                            borderRadius="6px"
                            fontWeight="500"
                            _hover={{ opacity: 0.9 }}
                            transition="all 0.2s"
                        >
                            Trainer
                        </Button>
                    </Flex>

                    <form onSubmit={handleSubmit}>
                        <VStack gap="0.75rem" align="stretch">
                            {/* Email (disabled) */}
                            <Input
                                type="email"
                                value={email || ''}
                                disabled
                                bg="rgba(255,255,255,0.05)"
                                border="1px solid var(--glass-border)"
                                color="gray.500"
                                borderRadius="8px"
                                h="48px"
                            />

                            {/* Username */}
                            <Box position="relative">
                                <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                                    <User size={18} />
                                </Box>
                                <Input
                                    type="text"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    maxLength={20}
                                    pattern="^[a-zA-Z0-9_]+$"
                                    title="Username can only contain letters, numbers, and underscores"
                                    bg="var(--secondary)"
                                    border="1px solid var(--glass-border)"
                                    color="var(--foreground)"
                                    borderRadius="8px"
                                    pl="40px"
                                    h="48px"
                                    _focus={{ outline: '2px solid var(--primary)', borderColor: 'transparent' }}
                                    _placeholder={{ color: 'gray.500' }}
                                />
                            </Box>

                            {error && (
                                <Box
                                    bg="rgba(239, 68, 68, 0.1)"
                                    border="1px solid rgba(239, 68, 68, 0.2)"
                                    borderRadius="8px"
                                    p="0.75rem"
                                    textAlign="center"
                                >
                                    <Text color="red.400" fontSize="sm">{error}</Text>
                                    {error.includes('log in') && (
                                        <Button
                                            type="button"
                                            variant="plain"
                                            onClick={() => router.push('/login')}
                                            color="var(--primary)"
                                            textDecoration="underline"
                                            fontSize="sm"
                                            p="0"
                                            mt="0.25rem"
                                            h="auto"
                                            minH="auto"
                                        >
                                            Go to Login
                                        </Button>
                                    )}
                                </Box>
                            )}

                            <MotionButton
                                type="submit"
                                {...tapScale}
                                w="100%"
                                h="48px"
                                bg="var(--primary)"
                                color="white"
                                borderRadius="8px"
                                fontWeight="600"
                                fontSize="md"
                                disabled={loading || !username}
                                _hover={{ opacity: 0.9 }}
                                _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                            >
                                {loading ? 'Creating Profile...' : 'Complete Setup'}
                            </MotionButton>
                        </VStack>
                    </form>
                </VStack>
            </MotionBox>
        </Box>
    );
}

export default function UsernameSetup() {
    return (
        <Suspense fallback={
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minH="100vh"
                bg="#15151F"
            >
                <Text color="gray.500">Loading...</Text>
            </Box>
        }>
            <UsernameSetupForm />
        </Suspense>
    );
}
