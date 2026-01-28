'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import { Box, Text, Button, VStack } from '@chakra-ui/react';

export default function AuthCallback() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    setError(`Authentication failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                const { session } = data;
                if (!session) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const errorDescription = hashParams.get('error_description');

                    if (errorDescription) {
                        setError(`OAuth Error: ${errorDescription}`);
                        setLoading(false);
                        return;
                    }

                    if (accessToken) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: sessionData } = await supabase.auth.getSession();

                        if (sessionData.session) {
                            await handleUserSession(sessionData.session);
                            return;
                        }
                    }

                    router.push('/login');
                    return;
                }

                await handleUserSession(session);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(`Something went wrong: ${message}`);
                setLoading(false);
            }
        };

        const handleUserSession = async (session: { user: { id: string; email?: string; user_metadata?: Record<string, string> } }) => {
            const profile = await db.profiles.getById(session.user.id);

            if (profile) {
                // Returning user → dashboard
                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/home');
            } else {
                // New user → check for metadata from email signup
                const { username } = session.user.user_metadata || {};

                if (username) {
                    try {
                        const newProfile = await db.profiles.create({
                            id: session.user.id,
                            username,
                            email: session.user.email || '',
                            full_name: username
                        });
                        localStorage.setItem('user', JSON.stringify(newProfile));
                        router.push('/home');
                        return;
                    } catch {
                        // Fall through to onboarding setup
                    }
                }

                // New OAuth user → onboarding
                router.push(`/auth/setup?userId=${session.user.id}&email=${encodeURIComponent(session.user.email || '')}`);
            }
        };

        handleAuthCallback();
    }, [router]);

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                h="100vh"
                flexDirection="column"
                gap="1rem"
                bg="var(--background)"
            >
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '200px', height: '200px' }}
                >
                    <source src="/loader.webm" type="video/webm" />
                </video>
                <Text fontSize="1.2rem" color="var(--foreground)">
                    Setting up your account...
                </Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                h="100vh"
                bg="var(--background)"
            >
                <VStack gap="1rem">
                    <Text color="red.400" fontSize="1.2rem">{error}</Text>
                    <Button
                        onClick={() => router.push('/login')}
                        bg="var(--primary)"
                        color="white"
                        borderRadius="8px"
                        _hover={{ opacity: 0.9 }}
                    >
                        Back to Login
                    </Button>
                </VStack>
            </Box>
        );
    }

    return null;
}
