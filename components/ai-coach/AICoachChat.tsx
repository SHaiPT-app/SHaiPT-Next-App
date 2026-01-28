'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, Heading, VStack, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Send, X, MessageSquare, Trash2, User, Bot } from 'lucide-react';
import type { Profile, AIChat } from '@/lib/types';

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

interface AICoachChatProps {
    user: Profile;
    isOpen: boolean;
    onToggle: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTIONS = [
    { label: 'Adjust my plan', prompt: 'How should I adjust my current training plan based on my recent progress?' },
    { label: 'Recovery tips', prompt: 'What recovery strategies should I focus on right now?' },
    { label: 'Nutrition check', prompt: 'Based on my goals, am I eating the right macros?' },
    { label: 'Form advice', prompt: 'Can you explain proper deadlift form and common mistakes?' },
];

export default function AICoachChat({ user, isOpen, onToggle }: AICoachChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [chatHistory, setChatHistory] = useState<AIChat[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadChatHistory = useCallback(async () => {
        try {
            const res = await fetch(`/api/ai-coach/chat/history?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data.chats || []);
            }
        } catch {
            // Silently fail - history is non-critical
        }
    }, [user.id]);

    // Load chat history on mount
    useEffect(() => {
        if (user.id && isOpen) {
            loadChatHistory();
        }
    }, [user.id, isOpen, loadChatHistory]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChat = (chat: AIChat) => {
        setChatId(chat.id);
        setMessages(
            chat.messages.map((m, i) => ({
                id: `${m.role}-${i}-${Date.now()}`,
                role: m.role,
                content: m.content,
            }))
        );
        setShowHistory(false);
    };

    const startNewChat = () => {
        setChatId(undefined);
        setMessages([]);
        setShowHistory(false);
    };

    const sendMessage = useCallback(async (messageText?: string) => {
        const text = messageText || input;
        if (!text.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        // Add a placeholder for the streaming assistant message
        const assistantId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/ai-coach/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    userId: user.id,
                    chatId,
                }),
            });

            if (response.status === 429) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: 'Rate limited. Please wait a moment and try again.' }
                            : m
                    )
                );
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to get response');
            }

            // Capture chatId from response header for new chats
            const returnedChatId = response.headers.get('X-Chat-Id');
            if (returnedChatId && !chatId) {
                setChatId(returnedChatId);
            }

            // Read the stream
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, content: fullText } : m
                    )
                );
            }

            // Refresh chat history after a successful message
            loadChatHistory();
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId
                        ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, user.id, chatId, loadChatHistory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <MotionBox
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    position="fixed"
                    bottom={{ base: '1.5rem', md: '2rem' }}
                    right={{ base: '1.5rem', md: '2rem' }}
                    zIndex={1000}
                >
                    <button
                        onClick={onToggle}
                        data-testid="ai-coach-toggle"
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF6600, #E55C00)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(255, 102, 0, 0.4)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 102, 0, 0.6)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 102, 0, 0.4)';
                        }}
                    >
                        <MessageSquare size={24} />
                    </button>
                </MotionBox>
            )}

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        position="fixed"
                        bottom={{ base: 0, md: '1.5rem' }}
                        right={{ base: 0, md: '1.5rem' }}
                        width={{ base: '100%', md: '420px' }}
                        height={{ base: '100vh', md: '600px' }}
                        maxH={{ base: '100vh', md: '80vh' }}
                        bg="rgba(15, 15, 25, 0.98)"
                        border={{ base: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' }}
                        borderRadius={{ base: 0, md: '16px' }}
                        zIndex={1001}
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        backdropFilter="blur(20px)"
                        boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
                        data-testid="ai-coach-panel"
                    >
                        {/* Header */}
                        <Flex
                            px="1rem"
                            py="0.75rem"
                            borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                            alignItems="center"
                            justifyContent="space-between"
                            flexShrink={0}
                        >
                            <Flex alignItems="center" gap="0.75rem">
                                <Box
                                    w="32px"
                                    h="32px"
                                    borderRadius="50%"
                                    bg="linear-gradient(135deg, #FF6600, #E55C00)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    fontSize="0.9rem"
                                >
                                    <MessageSquare size={16} color="#0B0B15" />
                                </Box>
                                <Box>
                                    <Heading
                                        as="h3"
                                        fontSize="0.95rem"
                                        fontFamily="var(--font-orbitron)"
                                        color="var(--foreground)"
                                        lineHeight="1.2"
                                    >
                                        AI Coach
                                    </Heading>
                                    <Text fontSize="0.7rem" color="gray.500">
                                        {isLoading ? 'Typing...' : 'Online'}
                                    </Text>
                                </Box>
                            </Flex>
                            <Flex gap="0.5rem">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    title="Chat history"
                                    style={{
                                        background: showHistory ? 'rgba(255, 102, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: showHistory ? 'var(--primary)' : 'var(--foreground)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <MessageSquare size={14} />
                                </button>
                                <button
                                    onClick={startNewChat}
                                    title="New chat"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={onToggle}
                                    data-testid="ai-coach-close"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </Flex>
                        </Flex>

                        {/* Chat History Sidebar */}
                        {showHistory && (
                            <Box
                                borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                                maxH="200px"
                                overflowY="auto"
                                px="0.75rem"
                                py="0.5rem"
                            >
                                <Text fontSize="0.7rem" color="gray.500" mb="0.5rem" fontWeight="600" textTransform="uppercase">
                                    Recent Chats
                                </Text>
                                {chatHistory.length === 0 ? (
                                    <Text fontSize="0.8rem" color="gray.600" py="0.5rem">
                                        No previous chats
                                    </Text>
                                ) : (
                                    <VStack gap="0.25rem" align="stretch">
                                        {chatHistory.slice(0, 10).map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadChat(chat)}
                                                style={{
                                                    background: chatId === chat.id ? 'rgba(255, 102, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                    border: chatId === chat.id ? '1px solid rgba(255, 102, 0, 0.3)' : '1px solid transparent',
                                                    borderRadius: '8px',
                                                    padding: '0.5rem 0.75rem',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    color: 'var(--foreground)',
                                                    width: '100%',
                                                }}
                                            >
                                                <Text fontSize="0.8rem" lineClamp={1}>
                                                    {chat.title}
                                                </Text>
                                                <Text fontSize="0.65rem" color="gray.600">
                                                    {chat.messages.length} messages
                                                </Text>
                                            </button>
                                        ))}
                                    </VStack>
                                )}
                            </Box>
                        )}

                        {/* Messages Area */}
                        <Box
                            flex={1}
                            overflowY="auto"
                            px="0.75rem"
                            py="0.75rem"
                        >
                            <VStack gap="0.75rem" align="stretch">
                                {messages.length === 0 ? (
                                    <Box py="2rem" textAlign="center">
                                        <Box mb="0.75rem" display="flex" justifyContent="center">
                                            <Box
                                                w="40px"
                                                h="40px"
                                                borderRadius="50%"
                                                bg="linear-gradient(135deg, #FF6600, #E55C00)"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                <MessageSquare size={20} color="#0B0B15" />
                                            </Box>
                                        </Box>
                                        <Text
                                            fontFamily="var(--font-orbitron)"
                                            fontSize="0.95rem"
                                            mb="0.5rem"
                                            color="var(--foreground)"
                                        >
                                            Hey{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                                        </Text>
                                        <Text fontSize="0.8rem" color="gray.500" mb="1.25rem">
                                            I know your goals and recent workouts. Ask me anything!
                                        </Text>
                                        <VStack gap="0.5rem" align="stretch">
                                            {SUGGESTIONS.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendMessage(s.prompt)}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '10px',
                                                        padding: '0.6rem 0.75rem',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        color: 'var(--foreground)',
                                                        fontSize: '0.8rem',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = 'rgba(255, 102, 0, 0.1)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 102, 0, 0.3)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                    }}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </VStack>
                                    </Box>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {messages.map(message => (
                                            <MotionFlex
                                                key={message.id}
                                                variants={fadeInUp}
                                                initial="hidden"
                                                animate="visible"
                                                gap="0.5rem"
                                                alignItems="flex-start"
                                            >
                                                <Box
                                                    w="28px"
                                                    h="28px"
                                                    borderRadius="50%"
                                                    bg={
                                                        message.role === 'user'
                                                            ? 'linear-gradient(135deg, #FF6600, #E55C00)'
                                                            : 'linear-gradient(135deg, rgba(255, 102, 0, 0.6), rgba(229, 92, 0, 0.4))'
                                                    }
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    flexShrink={0}
                                                    fontSize="0.75rem"
                                                    mt="0.15rem"
                                                >
                                                    {message.role === 'user' ? <User size={14} color="#0B0B15" /> : <Bot size={14} color="#0B0B15" />}
                                                </Box>
                                                <Box
                                                    flex={1}
                                                    p="0.65rem 0.75rem"
                                                    borderRadius="10px"
                                                    bg={
                                                        message.role === 'user'
                                                            ? 'rgba(255, 102, 0, 0.08)'
                                                            : 'rgba(255, 255, 255, 0.04)'
                                                    }
                                                    border="1px solid"
                                                    borderColor={
                                                        message.role === 'user'
                                                            ? 'rgba(255, 102, 0, 0.15)'
                                                            : 'rgba(255, 255, 255, 0.06)'
                                                    }
                                                >
                                                    <Text
                                                        fontSize="0.6rem"
                                                        color="gray.600"
                                                        mb="0.15rem"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        letterSpacing="0.05em"
                                                    >
                                                        {message.role === 'user' ? 'You' : 'AI Coach'}
                                                    </Text>
                                                    <Text
                                                        whiteSpace="pre-wrap"
                                                        lineHeight="1.5"
                                                        color="var(--foreground)"
                                                        fontSize="0.85rem"
                                                    >
                                                        {message.content || (isLoading && message.role === 'assistant' ? '' : '')}
                                                    </Text>
                                                    {/* Loading dots for empty assistant message */}
                                                    {message.role === 'assistant' && !message.content && isLoading && (
                                                        <Flex gap="0.2rem" alignItems="center" py="0.25rem">
                                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--primary)" display="inline-block" animation="pulse 1.4s ease-in-out infinite" />
                                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--primary)" display="inline-block" animation="pulse 1.4s ease-in-out 0.2s infinite" />
                                                            <Box as="span" w="5px" h="5px" borderRadius="50%" bg="var(--primary)" display="inline-block" animation="pulse 1.4s ease-in-out 0.4s infinite" />
                                                        </Flex>
                                                    )}
                                                </Box>
                                            </MotionFlex>
                                        ))}
                                    </AnimatePresence>
                                )}
                                <div ref={messagesEndRef} />
                            </VStack>
                        </Box>

                        {/* Input Area */}
                        <Box
                            px="0.75rem"
                            py="0.75rem"
                            borderTop="1px solid rgba(255, 255, 255, 0.1)"
                            flexShrink={0}
                        >
                            <form
                                onSubmit={handleSubmit}
                                style={{ display: 'flex', gap: '0.5rem' }}
                            >
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask your AI Coach..."
                                    disabled={isLoading}
                                    data-testid="ai-coach-input"
                                    style={{
                                        flex: 1,
                                        padding: '0.7rem 0.75rem',
                                        fontSize: '0.9rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '10px',
                                        color: 'var(--foreground)',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onBlur={e => {
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    data-testid="ai-coach-send"
                                    style={{
                                        padding: '0.7rem',
                                        background:
                                            isLoading || !input.trim()
                                                ? 'rgba(255, 102, 0, 0.3)'
                                                : '#FF6600',
                                        color: '#0B0B15',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </Box>
                    </MotionBox>
                )}
            </AnimatePresence>
        </>
    );
}
