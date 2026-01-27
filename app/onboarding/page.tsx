'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Heading, VStack, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';
import { Send } from 'lucide-react';

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [router]);

    // Start the interview once user is loaded
    useEffect(() => {
        if (user && !initialized) {
            setInitialized(true);
            startInterview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, initialized]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startInterview = async () => {
        setIsLoading(true);
        try {
            const greeting = `Hi, my name is ${user?.full_name || user?.username || 'there'}. I just signed up and I'm ready to get started!`;
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: greeting }],
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setMessages([
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                },
            ]);
        } catch (error) {
            console.error('Failed to start interview:', error);
            setMessages([
                {
                    id: 'error',
                    role: 'assistant',
                    content: "Welcome! I'm your AI Coach. Let's get to know each other so I can build you the perfect fitness plan. What are your main fitness goals?",
                },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleSendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading || isComplete) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = updatedMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (data.isComplete) {
                setIsComplete(true);
                await saveOnboardingData(updatedMessages);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please try again.',
                },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const saveOnboardingData = async (chatMessages: Message[]) => {
        if (!user) return;
        try {
            // Save the conversation to ai_chats for reference
            await db.aiChats.create({
                user_id: user.id,
                title: 'Onboarding Interview',
                messages: chatMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date().toISOString(),
                })),
            });
        } catch (error) {
            console.error('Failed to save onboarding data:', error);
        }
    };

    const handleContinue = () => {
        router.push('/home');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage();
    };

    if (!user) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minH="100vh"
                bg="var(--background)"
            >
                <Text color="gray.500">Loading...</Text>
            </Box>
        );
    }

    return (
        <Box
            display="flex"
            flexDirection="column"
            h="100vh"
            bg="var(--background)"
            overflow="hidden"
        >
            {/* Header */}
            <MotionBox
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                px={{ base: '1rem', md: '2rem' }}
                py="1rem"
                borderBottom="1px solid var(--glass-border)"
            >
                <Box maxW="900px" mx="auto" w="100%">
                    <Heading
                        as="h1"
                        fontSize={{ base: '1.25rem', md: '1.5rem' }}
                        fontFamily="var(--font-orbitron)"
                        color="var(--primary)"
                        mb="0.25rem"
                    >
                        AI Onboarding
                    </Heading>
                    <Text color="gray.500" fontSize="sm">
                        Let your AI Coach get to know you
                    </Text>
                </Box>
            </MotionBox>

            {/* Messages */}
            <Box
                flex={1}
                overflowY="auto"
                px={{ base: '1rem', md: '2rem' }}
                py="1.5rem"
            >
                <VStack
                    maxW="900px"
                    mx="auto"
                    w="100%"
                    gap="1rem"
                    align="stretch"
                >
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
                            <MotionFlex
                                key={message.id}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                gap="0.75rem"
                                alignItems="flex-start"
                            >
                                {/* Avatar */}
                                <Box
                                    w="36px"
                                    h="36px"
                                    borderRadius="50%"
                                    bg={
                                        message.role === 'user'
                                            ? 'linear-gradient(135deg, var(--primary), #ff6b35)'
                                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                    }
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                    fontSize="1rem"
                                >
                                    {message.role === 'user' ? '\u{1F464}' : '\u{1F916}'}
                                </Box>

                                {/* Message content */}
                                <Box
                                    flex={1}
                                    p="1rem"
                                    borderRadius="12px"
                                    bg={
                                        message.role === 'user'
                                            ? 'rgba(0, 212, 255, 0.1)'
                                            : 'rgba(255, 255, 255, 0.05)'
                                    }
                                    border="1px solid"
                                    borderColor={
                                        message.role === 'user'
                                            ? 'rgba(0, 212, 255, 0.2)'
                                            : 'var(--glass-border)'
                                    }
                                >
                                    <Text
                                        fontSize="0.7rem"
                                        color="gray.500"
                                        mb="0.25rem"
                                        fontWeight="600"
                                        textTransform="uppercase"
                                        letterSpacing="0.05em"
                                    >
                                        {message.role === 'user' ? 'You' : 'AI Coach'}
                                    </Text>
                                    <Text
                                        whiteSpace="pre-wrap"
                                        lineHeight="1.6"
                                        color="var(--foreground)"
                                        fontSize="0.95rem"
                                    >
                                        {message.content}
                                    </Text>
                                </Box>
                            </MotionFlex>
                        ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <MotionFlex
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            gap="0.75rem"
                            alignItems="flex-start"
                        >
                            <Box
                                w="36px"
                                h="36px"
                                borderRadius="50%"
                                bg="linear-gradient(135deg, #6366f1, #8b5cf6)"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                                fontSize="1rem"
                            >
                                {'\u{1F916}'}
                            </Box>
                            <Box
                                p="1rem"
                                borderRadius="12px"
                                bg="rgba(255, 255, 255, 0.05)"
                                border="1px solid var(--glass-border)"
                            >
                                <Box display="flex" gap="0.3rem" alignItems="center">
                                    <Box
                                        as="span"
                                        w="6px"
                                        h="6px"
                                        borderRadius="50%"
                                        bg="var(--primary)"
                                        display="inline-block"
                                        animation="pulse 1.4s ease-in-out infinite"
                                    />
                                    <Box
                                        as="span"
                                        w="6px"
                                        h="6px"
                                        borderRadius="50%"
                                        bg="var(--primary)"
                                        display="inline-block"
                                        animation="pulse 1.4s ease-in-out 0.2s infinite"
                                    />
                                    <Box
                                        as="span"
                                        w="6px"
                                        h="6px"
                                        borderRadius="50%"
                                        bg="var(--primary)"
                                        display="inline-block"
                                        animation="pulse 1.4s ease-in-out 0.4s infinite"
                                    />
                                </Box>
                            </Box>
                        </MotionFlex>
                    )}

                    <div ref={messagesEndRef} />
                </VStack>
            </Box>

            {/* Input / Complete */}
            <Box
                px={{ base: '1rem', md: '2rem' }}
                py="1rem"
                borderTop="1px solid var(--glass-border)"
            >
                <Box maxW="900px" mx="auto" w="100%">
                    {isComplete ? (
                        <MotionBox
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                        >
                            <button
                                onClick={handleContinue}
                                data-testid="continue-button"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    fontFamily: 'var(--font-orbitron)',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '0.9';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                            >
                                Continue to Dashboard
                            </button>
                        </MotionBox>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            style={{ display: 'flex', gap: '0.75rem' }}
                        >
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your response..."
                                disabled={isLoading}
                                data-testid="chat-input"
                                style={{
                                    flex: 1,
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                data-testid="send-button"
                                style={{
                                    padding: '0.875rem 1.25rem',
                                    background: isLoading || !input.trim()
                                        ? 'rgba(0, 212, 255, 0.3)'
                                        : 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: isLoading || !input.trim()
                                        ? 'not-allowed'
                                        : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
