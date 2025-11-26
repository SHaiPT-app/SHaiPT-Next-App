'use client';

import { useState, useEffect } from 'react';

interface Message {
    type: 'bot' | 'user';
    text: string;
}

interface Question {
    id: string;
    prompt: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    validation?: (value: any) => boolean;
    placeholder?: string;
}

interface ChatInterfaceProps {
    questions: Question[];
    onComplete: (answers: Record<string, any>) => void;
    title: string;
    loading?: boolean;
}

export default function ChatInterface({ questions, onComplete, title, loading }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        { type: 'bot', text: `Hi! I'm your AI ${title}. Let me ask you a few questions to create your personalized plan. 👋` }
    ]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [inputValue, setInputValue] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputValue.trim() && currentQuestion.type !== 'select') return;

        const value = currentQuestion.type === 'number' ? parseFloat(inputValue) : inputValue;

        // Validation
        if (currentQuestion.validation && !currentQuestion.validation(value)) {
            return;
        }

        // Save answer
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        // Add user message
        const displayValue = currentQuestion.type === 'select'
            ? currentQuestion.options?.find(opt => opt === value) || value
            : value;

        setMessages(prev => [...prev, { type: 'user', text: String(displayValue) }]);
        setInputValue('');

        // Move to next question or complete
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setTimeout(() => {
                setMessages(prev => [...prev, { type: 'bot', text: questions[currentQuestionIndex + 1].prompt }]);
            }, 500);
        } else {
            setIsComplete(true);
            setMessages(prev => [...prev, { type: 'bot', text: '✅ Perfect! Generating your personalized plan now...' }]);
            setTimeout(() => onComplete(newAnswers), 1000);
        }
    };

    const handleReset = () => {
        setMessages([{ type: 'bot', text: `Hi! I'm your AI ${title}. Let me ask you a few questions to create your personalized plan. 👋` }]);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setInputValue('');
        setIsComplete(false);
    };

    // Show first question initially
    useEffect(() => {
        if (messages.length === 1 && currentQuestionIndex === 0) {
            const timer = setTimeout(() => {
                setMessages(prev => {
                    // Prevent duplicate if it was already added
                    if (prev.length > 1) return prev;
                    return [...prev, { type: 'bot', text: questions[0].prompt }];
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [messages.length, currentQuestionIndex, questions]);

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '600px' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px 12px 0 0', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'fadeIn 0.3s ease-in'
                        }}
                    >
                        <div style={{
                            maxWidth: '70%',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            background: msg.type === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                            color: 'white'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Form */}
            {!isComplete && !loading && (
                <form onSubmit={handleSubmit} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0 0 12px 12px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {currentQuestion.type === 'select' ? (
                        <select
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: '#222',
                                color: 'white',
                                border: '1px solid #444',
                                fontSize: '1rem'
                            }}
                            required
                        >
                            <option value="">Choose...</option>
                            {currentQuestion.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={currentQuestion.type}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder={currentQuestion.placeholder || 'Type your answer...'}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: '#222',
                                color: 'white',
                                border: '1px solid #444',
                                fontSize: '1rem'
                            }}
                            required
                        />
                    )}
                    <button
                        type="submit"
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        Send
                    </button>
                </form>
            )}

            {/* Reset Button */}
            {!loading && (
                <button
                    onClick={handleReset}
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: 'transparent',
                        color: '#888',
                        border: '1px solid #444',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    Start Over
                </button>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
