'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_TRAINING_PLAN, DEMO_NUTRITION_PLAN } from '@/lib/demoData';

export default function DemoPlanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'plan' | 'nutrition'>('plan');
  const [expandedSession, setExpandedSession] = useState<string | null>(
    DEMO_TRAINING_PLAN.sessions[0].id
  );

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
        <h1
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.75rem',
            color: 'var(--primary)',
            margin: 0,
          }}
        >
          Your Personalized Plan
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          AI-generated from your interview responses
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '0.25rem',
        }}
      >
        <button
          data-testid="plan-tab"
          onClick={() => setActiveTab('plan')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: activeTab === 'plan' ? 'var(--primary)' : 'transparent',
            border: 'none',
            borderRadius: '10px',
            color: activeTab === 'plan' ? 'white' : '#888',
            cursor: 'pointer',
            fontWeight: activeTab === 'plan' ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          Training Plan
        </button>
        <button
          data-testid="nutrition-tab"
          onClick={() => setActiveTab('nutrition')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: activeTab === 'nutrition' ? 'var(--primary)' : 'transparent',
            border: 'none',
            borderRadius: '10px',
            color: activeTab === 'nutrition' ? 'white' : '#888',
            cursor: 'pointer',
            fontWeight: activeTab === 'nutrition' ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          Nutrition Plan
        </button>
      </div>

      {/* Training Plan Tab */}
      {activeTab === 'plan' && (
        <div data-testid="training-plan-content">
          {/* Plan Overview */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              {DEMO_TRAINING_PLAN.name}
            </h2>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0' }}>
              {DEMO_TRAINING_PLAN.description}
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '0.2rem 0.75rem',
                background: 'rgba(242, 95, 41, 0.1)',
                color: 'var(--primary)',
                borderRadius: '20px',
                fontSize: '0.8rem',
              }}
            >
              {DEMO_TRAINING_PLAN.duration_weeks} Weeks
            </span>
          </div>

          {/* Sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DEMO_TRAINING_PLAN.sessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              return (
                <div
                  key={session.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    border: isExpanded
                      ? '1px solid rgba(242, 95, 41, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() =>
                    setExpandedSession(isExpanded ? null : session.id)
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontWeight: 600,
                          fontSize: '1rem',
                          margin: 0,
                        }}
                      >
                        {session.name}
                      </h3>
                      <span style={{ color: '#888', fontSize: '0.8rem' }}>
                        Day {session.day_number} &middot;{' '}
                        {session.exercises.length} exercises
                      </span>
                    </div>
                    <span
                      style={{
                        color: '#555',
                        fontSize: '1.2rem',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        display: 'inline-block',
                      }}
                    >
                      &#9662;
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {session.exercises.map((ex, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: 'var(--primary)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            {ex.name}
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2rem 1fr 1fr 1fr',
                              gap: '0.25rem',
                              fontSize: '0.8rem',
                            }}
                          >
                            <span style={{ color: '#666' }}>Set</span>
                            <span style={{ color: '#666' }}>Reps</span>
                            <span style={{ color: '#666' }}>Weight</span>
                            <span style={{ color: '#666' }}>Rest</span>
                            {ex.sets.map((set, si) => (
                              <div
                                key={si}
                                style={{
                                  display: 'contents',
                                  color: '#ccc',
                                }}
                              >
                                <span>{si + 1}</span>
                                <span>{set.reps}</span>
                                <span>{set.weight}</span>
                                <span>{set.rest_seconds}s</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nutrition Plan Tab */}
      {activeTab === 'nutrition' && (
        <div data-testid="nutrition-plan-content">
          {/* Macro Overview */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Daily Targets
            </h2>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--primary)',
                fontFamily: 'var(--font-orbitron)',
                margin: '0.75rem 0',
              }}
            >
              {DEMO_NUTRITION_PLAN.dailyCalories} kcal
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>
                  {DEMO_NUTRITION_PLAN.macros.protein.grams}g
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  Protein ({DEMO_NUTRITION_PLAN.macros.protein.percentage}%)
                </div>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.75rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>
                  {DEMO_NUTRITION_PLAN.macros.carbs.grams}g
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  Carbs ({DEMO_NUTRITION_PLAN.macros.carbs.percentage}%)
                </div>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981' }}>
                  {DEMO_NUTRITION_PLAN.macros.fat.grams}g
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  Fat ({DEMO_NUTRITION_PLAN.macros.fat.percentage}%)
                </div>
              </div>
            </div>
          </div>

          {/* Meal Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DEMO_NUTRITION_PLAN.meals.map((meal, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{ padding: '1.25rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                    {meal.name}
                  </h3>
                  <span
                    style={{
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {meal.calories} kcal
                  </span>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    color: '#aaa',
                    fontSize: '0.9rem',
                  }}
                >
                  {meal.items.map((item, j) => (
                    <li key={j} style={{ marginBottom: '0.25rem' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div style={{ marginTop: '2rem' }}>
        <button
          data-testid="demo-continue-button"
          onClick={() => router.push('/demo/workout')}
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
          }}
        >
          Start a Workout
        </button>
      </div>
    </div>
  );
}
