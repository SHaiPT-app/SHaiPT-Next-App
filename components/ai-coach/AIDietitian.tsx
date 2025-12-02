'use client';

import { useState } from 'react';
import ChatInterface, { Message } from './ChatInterface';
import FeatureGate from '@/components/FeatureGate';
import { User } from '@/lib/types';

interface AIDietitianProps {
    user: User;
}

export default function AIDietitian({ user }: AIDietitianProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your AI Dietitian. I can help you create a meal plan or answer nutrition questions. What are your dietary goals?"
        }
    ]);
    const [loading, setLoading] = useState(false);
    // Placeholder for plan state if needed later
    const [plan, setPlan] = useState<any>(null);

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai-coach/diet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    userProfile: {
                        // Pass relevant user profile data
                        age: 30, // Placeholder
                        gender: 'Male', // Placeholder
                        goal: 'Weight Loss' // Placeholder
                    }
                }),
            });

            const data = await res.json();
            const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply };
            setMessages(prev => [...prev, aiMessage]);

            if (data.plan) {
                setPlan(data.plan);
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureGate user={user} feature="dietitian">
            <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>AI Dietitian</h3>
                <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    loading={loading}
                    placeholder="e.g., I want to lose weight, I am vegetarian..."
                />

                {/* Display plan details if available */}
                {plan && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', overflowY: 'auto' }}>
                        <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Your Plan</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Calories</div>
                                <div style={{ fontWeight: 'bold' }}>{plan.daily_calories}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Protein</div>
                                <div style={{ fontWeight: 'bold' }}>{plan.macros?.protein_g}g</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Carbs</div>
                                <div style={{ fontWeight: 'bold' }}>{plan.macros?.carbs_g}g</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Fats</div>
                                <div style={{ fontWeight: 'bold' }}>{plan.macros?.fat_g}g</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}
