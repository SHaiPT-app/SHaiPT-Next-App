'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_INTERVIEW_SCRIPT } from '@/lib/demoData';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DemoInterviewPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Auto-play the script using timeouts to avoid synchronous setState in effects
  useEffect(() => {
    if (scriptIndex >= DEMO_INTERVIEW_SCRIPT.length) {
      const completeTimer = setTimeout(() => setIsComplete(true), 0);
      return () => clearTimeout(completeTimer);
    }

    const current = DEMO_INTERVIEW_SCRIPT[scriptIndex];
    const delay = current.role === 'assistant' ? 800 : 1200;
    // Show typing indicator via timeout (not synchronous in effect body)
    const typingTimer = current.role === 'assistant'
      ? setTimeout(() => setIsTyping(true), 0)
      : null;

    const timer = setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, current]);
      setScriptIndex((prev) => prev + 1);
    }, delay);

    return () => {
      if (typingTimer) clearTimeout(typingTimer);
      clearTimeout(timer);
    };
  }, [scriptIndex]);

  const handleContinue = () => {
    router.push('/demo/plan');
  };

  const handleSkip = () => {
    setMessages(DEMO_INTERVIEW_SCRIPT);
    setIsComplete(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: 'var(--font-orbitron)',
              fontSize: '1.25rem',
              color: 'var(--primary)',
              margin: 0,
            }}
          >
            AI Onboarding Interview
          </h1>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Watch how the AI Coach personalizes your experience
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              data-testid={`demo-message-${msg.role}`}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, var(--primary), #ff6b35)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.9rem',
                }}
              >
                {msg.role === 'user' ? '\u{1F464}' : '\u{1F916}'}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: '12px',
                  background:
                    msg.role === 'user'
                      ? 'rgba(255, 102, 0, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${
                    msg.role === 'user'
                      ? 'rgba(255, 102, 0, 0.2)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#888',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {msg.role === 'user' ? 'You' : 'AI Coach'}
                </div>
                <div
                  style={{
                    lineHeight: 1.6,
                    fontSize: '0.95rem',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div
              data-testid="typing-indicator"
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.9rem',
                }}
              >
                {'\u{1F916}'}
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'inline-block',
                      animation: 'pulse 1.4s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'inline-block',
                      animation: 'pulse 1.4s ease-in-out 0.2s infinite',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'inline-block',
                      animation: 'pulse 1.4s ease-in-out 0.4s infinite',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          padding: '1rem 2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            gap: '0.75rem',
          }}
        >
          {isComplete ? (
            <button
              data-testid="demo-continue-button"
              onClick={handleContinue}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-orbitron)',
                cursor: 'pointer',
              }}
            >
              View Generated Plan
            </button>
          ) : (
            <button
              data-testid="demo-skip-button"
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#aaa',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Skip to Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
