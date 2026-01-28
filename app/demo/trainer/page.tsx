'use client';

import { useRouter } from 'next/navigation';
import { DEMO_TRAINER_CLIENTS } from '@/lib/demoData';

export default function DemoTrainerPage() {
  const router = useRouter();

  const getStreakColor = (streak: number): string => {
    if (streak >= 7) return '#FF6600';
    if (streak >= 3) return '#f59e0b';
    if (streak >= 1) return 'var(--primary)';
    return '#888';
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem',
        paddingBottom: '6rem',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: '#8b5cf6',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          Trainer View
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.75rem',
            color: 'white',
            margin: 0,
          }}
        >
          Client Roster
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {DEMO_TRAINER_CLIENTS.length} active clients
        </p>
      </div>

      {/* Table Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr',
          gap: '1rem',
          padding: '0.75rem 1.25rem',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#888',
          fontWeight: 600,
        }}
      >
        <span>Client</span>
        <span>Last Workout</span>
        <span>Current Plan</span>
        <span style={{ textAlign: 'center' }}>Streak</span>
        <span style={{ textAlign: 'center' }}>Alerts</span>
      </div>

      {/* Client Rows */}
      <div
        data-testid="trainer-client-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '0.5rem',
        }}
      >
        {DEMO_TRAINER_CLIENTS.map((client) => (
          <div
            key={client.id}
            data-testid="demo-client-row"
            className="glass-panel"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr',
              gap: '1rem',
              padding: '1rem 1.25rem',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Client info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {client.avatar}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {client.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#888' }}>
                  @{client.username}
                </div>
              </div>
            </div>

            {/* Last Workout */}
            <div style={{ fontSize: '0.875rem' }}>{client.lastWorkout}</div>

            {/* Current Plan */}
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  background: 'rgba(255, 102, 0, 0.1)',
                  border: '1px solid rgba(255, 102, 0, 0.2)',
                  color: 'var(--primary)',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {client.currentPlan}
              </span>
            </div>

            {/* Streak */}
            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: getStreakColor(client.streak),
                  background: `${getStreakColor(client.streak)}15`,
                }}
              >
                {client.streak > 0 ? `${client.streak}d` : '-'}
              </span>
            </div>

            {/* Alerts */}
            <div style={{ textAlign: 'center' }}>
              {client.alerts.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.25rem',
                    justifyContent: 'center',
                  }}
                >
                  {client.alerts.map((alert, idx) => (
                    <span
                      key={idx}
                      title={alert.message}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '22px',
                        height: '22px',
                        borderRadius: '11px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: 'white',
                        background:
                          alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                        padding: '0 0.375rem',
                      }}
                    >
                      !
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: '#666' }}>--</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Continue */}
      <button
        data-testid="demo-continue-button"
        onClick={() => router.push('/demo/pricing')}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1rem',
          fontWeight: 700,
          fontFamily: 'var(--font-orbitron)',
          cursor: 'pointer',
          marginTop: '2rem',
        }}
      >
        View Pricing
      </button>
    </div>
  );
}
