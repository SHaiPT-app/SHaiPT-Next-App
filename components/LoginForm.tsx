'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import { Box, Text, Input, Button, VStack, HStack, Heading, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { fadeInUp, tapScale } from '@/lib/animations';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react';

const MotionBox = motion.create(Box);
const MotionButton = motion.create(Button);

export default function LoginForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const passwordRules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        numberOrSpecial: /[0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)
    };

    const passwordStrength = (() => {
        let score = 0;
        if (password.length > 0) {
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score++;
        }
        return score;
    })();

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const profile = await db.profiles.getById(session.user.id);
                if (profile) {
                    router.push('/home');
                }
            }
        };
        checkExistingSession();
    }, [router]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                if (session.user.app_metadata.provider === 'google' || session.user.app_metadata.provider === 'apple') {
                    // OAuth sign-in handling is done in callback page
                }
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;
        if (!identifier.includes('@')) {
            setError('Please enter your email address to resend confirmation.');
            return;
        }
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: identifier,
            });
            if (error) throw error;
            setResendCooldown(60);
            setSuccessMessage('Confirmation email resent! Please check your inbox.');
            setError('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend email';
            setError(message);
        }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    ...(provider === 'google' && {
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                    }),
                }
            });
            if (error) {
                setError(error.message);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `${provider} auth failed`;
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (isLogin) {
                const isEmail = identifier.includes('@');
                let email = identifier;

                if (!isEmail) {
                    const profile = await db.profiles.getByUsername(identifier);
                    if (!profile) {
                        setError('Username not found');
                        setLoading(false);
                        return;
                    }
                    email = profile.email;
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setError(`Login failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                const profile = await db.profiles.getById(data.user.id);

                if (!profile) {
                    const newProfile = await db.profiles.create({
                        id: data.user.id,
                        username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user',
                        email: data.user.email || '',
                        full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User'
                    });
                    localStorage.setItem('user', JSON.stringify(newProfile));
                    router.push('/auth/setup?userId=' + data.user.id + '&email=' + encodeURIComponent(data.user.email || ''));
                    return;
                }

                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/home');
            } else {
                const email = identifier;

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Please enter a valid email address.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.length) {
                    setError('Password must be at least 8 characters long.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.uppercase) {
                    setError('Password must contain at least one uppercase letter.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.numberOrSpecial) {
                    setError('Password must contain at least one number or special character.');
                    setLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    setLoading(false);
                    return;
                }

                if (username.length < 3) {
                    setError('Username must be at least 3 characters long.');
                    setLoading(false);
                    return;
                }

                try {
                    const { data: existingEmailProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (existingEmailProfile) {
                        setError('Account already exists. Please log in instead.');
                        setLoading(false);
                        return;
                    }
                } catch {
                    // No existing account found - continue
                }

                try {
                    const { data: existingUsername } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('username', username)
                        .single();

                    if (existingUsername) {
                        setError('Username already taken. Please choose another.');
                        setLoading(false);
                        return;
                    }
                } catch {
                    // No existing username found - continue
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username,
                            full_name: username
                        }
                    }
                });

                if (error) {
                    setError(error.message);
                    setLoading(false);
                    return;
                }

                if (data.user) {
                    if (!data.session || !data.user.email_confirmed_at) {
                        if (data.session) {
                            await supabase.auth.signOut();
                        }
                        setSuccessMessage('Account created! Please check your email to confirm your account.');
                        setError('');
                        setLoading(false);
                        setIsLogin(true);
                        setResendCooldown(60);
                        return;
                    }

                    try {
                        const profile = await db.profiles.create({
                            id: data.user.id,
                            username: username,
                            email: email,
                            full_name: username
                        });
                        localStorage.setItem('user', JSON.stringify(profile));
                        router.push('/home');
                    } catch (profileError: unknown) {
                        const message = profileError instanceof Error ? profileError.message : 'Profile creation failed';
                        setError(message);
                        setLoading(false);
                        return;
                    }
                } else {
                    setSuccessMessage('Please check your email to confirm your account.');
                    setError('');
                    setLoading(false);
                    setResendCooldown(60);
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    const strengthColor = passwordStrength < 3 ? 'red.500' : passwordStrength < 5 ? 'yellow.500' : 'orange.500';

    return (
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
            <Heading
                as="h2"
                size="lg"
                mb="1.5rem"
                textAlign="center"
                color="white"
            >
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap="0.75rem" align="stretch">
                    {/* Email / Username input */}
                    <Box position="relative">
                        <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                            <Mail size={18} />
                        </Box>
                        <Input
                            type={isLogin ? "text" : "email"}
                            placeholder={isLogin ? "Email or Username" : "Email"}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
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

                    {/* Username input (signup only) */}
                    {!isLogin && (
                        <Box position="relative">
                            <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                                <User size={18} />
                            </Box>
                            <Input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
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
                    )}

                    {/* Password input */}
                    <Box position="relative">
                        <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                            <Lock size={18} />
                        </Box>
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            bg="var(--secondary)"
                            border="1px solid var(--glass-border)"
                            color="var(--foreground)"
                            borderRadius="8px"
                            pl="40px"
                            pr="44px"
                            h="48px"
                            _focus={{ outline: '2px solid var(--primary)', borderColor: 'transparent' }}
                            _placeholder={{ color: 'gray.500' }}
                        />
                        <Box
                            as="button"
                            onClick={() => setShowPassword(!showPassword)}
                            position="absolute"
                            right="12px"
                            top="50%"
                            transform="translateY(-50%)"
                            bg="transparent"
                            border="none"
                            cursor="pointer"
                            color="gray.500"
                            display="flex"
                            alignItems="center"
                            p="0"
                            zIndex={1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Box>
                    </Box>

                    {/* Confirm password + strength (signup only) */}
                    {!isLogin && (
                        <>
                            <Box position="relative">
                                <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                                    <Lock size={18} />
                                </Box>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    bg="var(--secondary)"
                                    border="1px solid var(--glass-border)"
                                    color="var(--foreground)"
                                    borderRadius="8px"
                                    pl="40px"
                                    pr="44px"
                                    h="48px"
                                    _focus={{ outline: '2px solid var(--primary)', borderColor: 'transparent' }}
                                    _placeholder={{ color: 'gray.500' }}
                                />
                            </Box>

                            {/* Password strength indicator */}
                            <Box>
                                <HStack gap="4px" mb="8px" h="4px">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Box
                                            key={i}
                                            flex={1}
                                            bg={i <= passwordStrength ? strengthColor : 'rgba(255,255,255,0.1)'}
                                            borderRadius="2px"
                                            transition="all 0.3s"
                                            h="4px"
                                        />
                                    ))}
                                </HStack>
                                <Flex gap="4px" wrap="wrap" fontSize="0.75rem">
                                    <HStack gap="4px" minW="45%">
                                        <Text color={passwordRules.length ? 'orange.400' : 'gray.500'} fontSize="xs">
                                            {passwordRules.length ? '✓' : '○'} 8+ characters
                                        </Text>
                                    </HStack>
                                    <HStack gap="4px" minW="45%">
                                        <Text color={passwordRules.uppercase ? 'orange.400' : 'gray.500'} fontSize="xs">
                                            {passwordRules.uppercase ? '✓' : '○'} Uppercase
                                        </Text>
                                    </HStack>
                                    <HStack gap="4px" minW="45%">
                                        <Text color={passwordRules.numberOrSpecial ? 'orange.400' : 'gray.500'} fontSize="xs">
                                            {passwordRules.numberOrSpecial ? '✓' : '○'} Number/Special
                                        </Text>
                                    </HStack>
                                </Flex>
                            </Box>
                        </>
                    )}

                    {/* Success message */}
                    {successMessage && (
                        <Box
                            bg="rgba(16, 185, 129, 0.1)"
                            border="1px solid rgba(16, 185, 129, 0.2)"
                            borderRadius="8px"
                            p="1rem"
                            textAlign="center"
                        >
                            <VStack gap="0.5rem">
                                <CheckCircle size={24} color="#10b981" />
                                <Text color="orange.400" fontWeight="bold" fontSize="sm">
                                    {successMessage.includes('resent') ? 'Email Resent!' : 'Account Created!'}
                                </Text>
                                <Text color="orange.400" fontSize="sm">{successMessage}</Text>
                            </VStack>
                            <Button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={resendCooldown > 0}
                                mt="1rem"
                                w="100%"
                                bg="var(--primary)"
                                color="white"
                                borderRadius="6px"
                                h="40px"
                                fontSize="sm"
                                fontWeight="500"
                                opacity={resendCooldown > 0 ? 0.7 : 1}
                                _hover={{ opacity: 0.9 }}
                            >
                                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Confirmation Email'}
                            </Button>
                        </Box>
                    )}

                    {/* Error message */}
                    {error && (
                        <Box
                            bg="rgba(239, 68, 68, 0.1)"
                            border="1px solid rgba(239, 68, 68, 0.2)"
                            borderRadius="8px"
                            p="0.75rem"
                            textAlign="center"
                        >
                            <Text color="red.400" fontSize="sm">{error}</Text>
                            {error.includes('already exists') && (
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => setIsLogin(true)}
                                    color="var(--primary)"
                                    textDecoration="underline"
                                    fontSize="sm"
                                    p="0"
                                    mt="0.25rem"
                                    h="auto"
                                    minH="auto"
                                >
                                    Log in
                                </Button>
                            )}
                        </Box>
                    )}

                    {/* Submit button */}
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
                        disabled={loading}
                        _hover={{ opacity: 0.9 }}
                        _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                    </MotionButton>

                    {/* Divider */}
                    <HStack gap="0.75rem" my="0.25rem">
                        <Box flex={1} h="1px" bg="rgba(255,255,255,0.1)" />
                        <Text color="gray.500" fontSize="sm">or</Text>
                        <Box flex={1} h="1px" bg="rgba(255,255,255,0.1)" />
                    </HStack>

                    {/* OAuth buttons */}
                    <VStack gap="0.5rem">
                        <MotionButton
                            type="button"
                            onClick={() => handleOAuth('google')}
                            disabled={loading}
                            {...tapScale}
                            w="100%"
                            h="48px"
                            bg="#4285F4"
                            color="white"
                            borderRadius="8px"
                            fontWeight="500"
                            _hover={{ bg: '#3574d4' }}
                            _disabled={{ opacity: 0.6 }}
                        >
                            <HStack gap="0.5rem" justify="center">
                                <svg width="18" height="18" viewBox="0 0 18 18">
                                    <path fill="#fff" d="M16.51,8H8.98v3h4.3c-0.18,0.95-0.75,1.77-1.58,2.26v1.69h2.55C15.47,13.78,16.51,11.17,16.51,8z" />
                                    <path fill="#fff" d="M8.98,17c2.16,0,3.97-0.72,5.3-1.94l-2.55-1.69c-0.75,0.5-1.71,0.8-2.75,0.8c-2.11,0-3.9-1.43-4.54-3.35H1.83v1.71C3.15,15.04,5.83,17,8.98,17z" />
                                    <path fill="#fff" d="M4.43,10.77c-0.16-0.5-0.26-1.04-0.26-1.58s0.09-1.08,0.26-1.58V5.9H1.83C1.29,7.01,1,8.25,1,9.6s0.29,2.59,0.83,3.69L4.43,10.77z" />
                                    <path fill="#fff" d="M8.98,3.58c1.19,0,2.26,0.41,3.1,1.22l2.3-2.3C13.94,1.19,11.7,0,8.98,0C5.83,0,3.15,1.96,1.83,4.47l2.6,2.02C5.08,5.01,6.87,3.58,8.98,3.58z" />
                                </svg>
                                <Text>Continue with Google</Text>
                            </HStack>
                        </MotionButton>

                        <MotionButton
                            type="button"
                            onClick={() => handleOAuth('apple')}
                            disabled={loading}
                            {...tapScale}
                            w="100%"
                            h="48px"
                            bg="#000"
                            color="white"
                            border="1px solid rgba(255,255,255,0.2)"
                            borderRadius="8px"
                            fontWeight="500"
                            _hover={{ bg: '#1a1a1a' }}
                            _disabled={{ opacity: 0.6 }}
                        >
                            <HStack gap="0.5rem" justify="center">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                                    <path d="M13.71 9.04c-.02-1.86 1.52-2.76 1.59-2.8-.87-1.27-2.22-1.44-2.7-1.46-1.14-.12-2.24.68-2.82.68-.58 0-1.48-.66-2.43-.65-1.25.02-2.41.73-3.05 1.86-1.3 2.26-.33 5.61.94 7.44.62.9 1.36 1.91 2.33 1.87.94-.04 1.29-.6 2.42-.6s1.45.6 2.44.58c1.01-.02 1.64-.91 2.25-1.82.71-1.04 1-2.04 1.02-2.1-.02-.01-1.95-.75-1.99-2.98v-.02zM11.85 3.5c.52-.63.86-1.5.77-2.37-.74.03-1.64.5-2.17 1.12-.48.55-.9 1.43-.78 2.28.82.06 1.66-.42 2.18-1.03z" />
                                </svg>
                                <Text>Continue with Apple</Text>
                            </HStack>
                        </MotionButton>
                    </VStack>

                    {/* Toggle login/signup */}
                    <Text textAlign="center" fontSize="sm" color="gray.500">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Box
                            as="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccessMessage('');
                            }}
                            bg="transparent"
                            border="none"
                            color="var(--primary)"
                            cursor="pointer"
                            textDecoration="underline"
                            fontSize="sm"
                        >
                            {isLogin ? 'Sign Up' : 'Login'}
                        </Box>
                    </Text>
                </VStack>
            </form>
        </MotionBox>
    );
}
