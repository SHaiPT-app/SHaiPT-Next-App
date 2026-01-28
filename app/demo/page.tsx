'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_USER } from '@/lib/demoData';

export default function DemoSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    setStarting(true);
    const demoUser = {
      ...DEMO_USER,
      full_name: name.trim() || DEMO_USER.full_name,
    };
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    router.push('/demo/interview');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '2.5rem',
            color: 'var(--primary)',
            marginBottom: '0.5rem',
          }}
        >
          SHaiPT Demo
        </h1>
        <p
          style={{
            color: '#888',
            fontSize: '1.05rem',
            marginBottom: '2.5rem',
            lineHeight: 1.6,
          }}
        >
          Experience the full platform in under 5 minutes. No account required.
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
          }}
        >
          <label
            htmlFor="demo-name"
            style={{
              display: 'block',
              textAlign: 'left',
              color: '#aaa',
              fontSize: '0.85rem',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}
          >
            Your name (optional)
          </label>
          <input
            id="demo-name"
            data-testid="demo-name-input"
            type="text"
            placeholder="Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStart();
            }}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: 'var(--foreground)',
              outline: 'none',
              marginBottom: '1.5rem',
              boxSizing: 'border-box',
            }}
          />

          <button
            data-testid="start-demo-button"
            onClick={handleStart}
            disabled={starting}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-orbitron)',
              cursor: starting ? 'wait' : 'pointer',
              opacity: starting ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {starting ? 'Starting...' : 'Start Demo'}
          </button>
        </div>

        <p
          style={{
            color: '#555',
            fontSize: '0.8rem',
            marginTop: '1.5rem',
          }}
        >
          This demo uses simulated data. No real account is created.
        </p>
      </div>
    </div>
  );
}
