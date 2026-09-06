'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';
import { Send } from 'lucide-react';

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
    const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
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

            // Generate personalized plans from the conversation
            await generatePlans(chatMessages);
        } catch (error) {
            console.error('Failed to save onboarding data:', error);
        }
    };

    const generatePlans = async (chatMessages: Message[]) => {
        if (!user) return;
        setIsGeneratingPlans(true);
        setGenerationError(null);

        try {
            const response = await fetch('/api/onboarding/generate-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chatMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    userId: user.id,
                }),
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            const { data } = result;

            // Save training plan to Supabase
            const trainingPlan = await db.trainingPlans.create({
                creator_id: user.id,
                name: data.training_plan.name,
                description: data.training_plan.description,
                duration_weeks: data.training_plan.duration_weeks,
                tags: data.extracted_profile.fitness_goals,
                is_template: false,
                is_public: false,
            });

            // Create workout sessions and link them to the plan
            const planSessions: {
                plan_id: string;
                session_id: string;
                day_number: number;
                week_number: number;
            }[] = [];

            for (const session of data.training_plan.sessions) {
                const workoutSession = await db.workoutSessions.create({
                    creator_id: user.id,
                    name: session.name,
                    description: session.description || '',
                    exercises: session.exercises.map(
                        (ex: {
                            exercise_name: string;
                            sets: {
                                reps: string;
                                weight?: string;
                                rest_seconds?: number;
                            }[];
                            notes?: string;
                        }) => ({
                            exercise_id: ex.exercise_name
                                .toLowerCase()
                                .replace(/\s+/g, '_')
                                .substring(0, 20),
                            sets: ex.sets.map((s) => ({
                                reps: s.reps,
                                weight: s.weight || '',
                                rest_seconds: s.rest_seconds || 90,
                            })),
                            notes: ex.notes || '',
                        })
                    ),
                    tags: [],
                    is_template: false,
                    is_public: false,
                });

                planSessions.push({
                    plan_id: trainingPlan.id,
                    session_id: workoutSession.id,
                    day_number: session.day_number,
                    week_number: session.week_number || 1,
                });
            }

            // Bulk create plan-session links
            if (planSessions.length > 0) {
                await db.trainingPlanSessions.createBulk(planSessions);
            }

            // Assign the plan to the user
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(
                endDate.getDate() +
                    (data.training_plan.duration_weeks || 4) * 7
            );

            await db.trainingPlanAssignments.create({
                plan_id: trainingPlan.id,
                user_id: user.id,
                is_self_assigned: true,
                start_date: today.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                is_active: true,
            });

            // Save nutrition plan as an AI chat for reference
            await db.aiChats.create({
                user_id: user.id,
                title: 'My Nutrition Plan',
                messages: [
                    {
                        role: 'assistant',
                        content: JSON.stringify(data.nutrition_plan),
                        timestamp: new Date().toISOString(),
                    },
                ],
            });

            // Update user profile with fitness goals from onboarding
            if (data.extracted_profile.fitness_goals) {
                await db.profiles.update(user.id, {
                    fitness_goals: data.extracted_profile.fitness_goals,
                });
                // Update localStorage with new goals
                const updatedUser = {
                    ...user,
                    fitness_goals: data.extracted_profile.fitness_goals,
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        } catch (error) {
            console.error('Failed to generate plans:', error);
            setGenerationError(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate plans'
            );
        } finally {
            setIsGeneratingPlans(false);
        }
    };

    const handleContinue = () => {
        router.push('/dashboard');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage();
    };

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
                <p className="text-ink-low">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
            {/* Header */}
            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="border-b border-[var(--line-soft)] px-4 py-4 md:px-8"
            >
                <div className="mx-auto w-full max-w-[900px]">
                    <h1 className="display text-gradient-brand mb-1 text-xl md:text-2xl">
                        AI Onboarding
                    </h1>
                    <p className="text-sm text-ink-mid">
                        Let your AI Coach get to know you
                    </p>
                </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="flex items-start gap-3"
                            >
                                {/* Avatar */}
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                                        message.role === 'user'
                                            ? 'bg-[image:var(--brand-gradient)]'
                                            : 'bg-[#27272b]'
                                    }`}
                                >
                                    {message.role === 'user' ? '\u{1F464}' : '\u{1F916}'}
                                </div>

                                {/* Message content */}
                                <div
                                    className={`flex-1 rounded-xl border p-4 ${
                                        message.role === 'user'
                                            ? 'border-brand/20 bg-[var(--brand-glow-soft)]'
                                            : 'border-[var(--line-soft)] bg-[var(--surface-1)]'
                                    }`}
                                >
                                    <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-low">
                                        {message.role === 'user' ? 'You' : 'AI Coach'}
                                    </p>
                                    <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-hi">
                                        {message.content}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            className="flex items-start gap-3"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#27272b] text-base">
                                {'\u{1F916}'}
                            </div>
                            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-4">
                                <span className="thinking-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </span>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input / Complete */}
            <div className="border-t border-[var(--line-soft)] px-4 py-4 md:px-8">
                <div className="mx-auto w-full max-w-[900px]">
                    {isComplete ? (
                        <motion.div
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                        >
                            {isGeneratingPlans ? (
                                <div
                                    data-testid="generating-plans"
                                    className="rounded-xl border border-brand/20 bg-[var(--brand-glow-soft)] p-6 text-center"
                                >
                                    <div className="mb-3 flex items-center justify-center">
                                        <span className="thinking-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </span>
                                    </div>
                                    <p className="font-display text-sm font-semibold text-brand">
                                        Generating your personalized plans...
                                    </p>
                                    <p className="mt-1 text-xs text-ink-low">
                                        Creating your training and nutrition plans
                                    </p>
                                </div>
                            ) : generationError ? (
                                <div data-testid="generation-error">
                                    <p className="mb-3 text-center text-sm text-red-400">
                                        {generationError}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() =>
                                                generatePlans(
                                                    messages.filter(
                                                        (m) => m.id !== 'error'
                                                    )
                                                )
                                            }
                                            data-testid="retry-button"
                                            className="btn-brand flex-1"
                                        >
                                            Retry
                                        </button>
                                        <button
                                            onClick={handleContinue}
                                            data-testid="skip-button"
                                            className="btn-outline flex-1"
                                        >
                                            Skip for now
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleContinue}
                                    data-testid="continue-button"
                                    className="btn-brand font-display w-full"
                                >
                                    Continue to Dashboard
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your response..."
                                disabled={isLoading}
                                data-testid="chat-input"
                                className="flex-1 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)] disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                data-testid="send-button"
                                className="btn-brand !px-5"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
