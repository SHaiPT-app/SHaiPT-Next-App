'use client';

import { useRouter } from 'next/navigation';
import { DEMO_ANALYTICS } from '@/lib/demoData';

export default function DemoAnalyticsPage() {
  const router = useRouter();

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
            color: '#39ff14',
            margin: 0,
          }}
        >
          Analytics Dashboard
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Performance tracking and insights
        </p>
      </div>

      {/* Summary Cards */}
      <div
        data-testid="analytics-summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          className="glass-panel"
          style={{ padding: '1.25rem', textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#39ff14',
              fontFamily: 'var(--font-orbitron)',
            }}
          >
            {DEMO_ANALYTICS.workoutStreak}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
            Day Streak
          </div>
        </div>
        <div
          className="glass-panel"
          style={{ padding: '1.25rem', textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--primary)',
              fontFamily: 'var(--font-orbitron)',
            }}
          >
            {DEMO_ANALYTICS.totalWorkouts}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
            Total Workouts
          </div>
        </div>
        <div
          className="glass-panel"
          style={{ padding: '1.25rem', textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#818cf8',
              fontFamily: 'var(--font-orbitron)',
            }}
          >
            {DEMO_ANALYTICS.personalRecords.filter((pr) => pr.isNew).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
            New PRs This Week
          </div>
        </div>
      </div>

      {/* Personal Records */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.15rem',
            color: 'white',
            marginBottom: '1rem',
          }}
        >
          Personal Records
        </h2>
        <div
          data-testid="personal-records"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {DEMO_ANALYTICS.personalRecords.map((pr, i) => (
            <div
              key={i}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                position: 'relative',
                border: pr.isNew
                  ? '1px solid rgba(57, 255, 20, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {pr.isNew && (
                <div
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(57, 255, 20, 0.15)',
                    color: '#39ff14',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  NEW PR
                </div>
              )}
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                {pr.exercise}
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#39ff14',
                }}
              >
                {pr.weight} lbs
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {pr.date}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Volume Chart */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.15rem',
            color: 'white',
            marginBottom: '1rem',
          }}
        >
          Weekly Volume
        </h2>
        <div
          data-testid="volume-chart"
          className="glass-panel"
          style={{ padding: '1.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              height: '160px',
            }}
          >
            {DEMO_ANALYTICS.weeklyVolume.map((week, i) => {
              const maxVol = Math.max(...DEMO_ANALYTICS.weeklyVolume.map((w) => w.volume));
              const height = (week.volume / maxVol) * 140;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${height}px`,
                      background:
                        i === DEMO_ANALYTICS.weeklyVolume.length - 1
                          ? 'linear-gradient(180deg, var(--primary), rgba(242, 95, 41, 0.3))'
                          : 'linear-gradient(180deg, rgba(0, 212, 255, 0.6), rgba(0, 212, 255, 0.2))',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.6rem',
                      color: '#666',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    W{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: '#888',
            }}
          >
            <span>
              Start: {DEMO_ANALYTICS.weeklyVolume[0].volume.toLocaleString()} lbs
            </span>
            <span style={{ color: '#39ff14' }}>
              Current:{' '}
              {DEMO_ANALYTICS.weeklyVolume[
                DEMO_ANALYTICS.weeklyVolume.length - 1
              ].volume.toLocaleString()}{' '}
              lbs (+
              {Math.round(
                ((DEMO_ANALYTICS.weeklyVolume[DEMO_ANALYTICS.weeklyVolume.length - 1]
                  .volume -
                  DEMO_ANALYTICS.weeklyVolume[0].volume) /
                  DEMO_ANALYTICS.weeklyVolume[0].volume) *
                  100
              )}
              %)
            </span>
          </div>
        </div>
      </section>

      {/* Body Weight Trend */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.15rem',
            color: 'white',
            marginBottom: '1rem',
          }}
        >
          Body Weight Trend
        </h2>
        <div
          data-testid="bodyweight-chart"
          className="glass-panel"
          style={{ padding: '1.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              height: '120px',
            }}
          >
            {DEMO_ANALYTICS.bodyWeight.map((entry, i) => {
              const min = Math.min(...DEMO_ANALYTICS.bodyWeight.map((e) => e.weight));
              const max = Math.max(...DEMO_ANALYTICS.bodyWeight.map((e) => e.weight));
              const range = max - min || 1;
              const height = ((entry.weight - min) / range) * 80 + 30;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: '#aaa' }}>
                    {entry.weight}
                  </span>
                  <div
                    style={{
                      width: '8px',
                      height: `${height}px`,
                      background:
                        'linear-gradient(180deg, #10b981, rgba(16, 185, 129, 0.3))',
                      borderRadius: '4px',
                    }}
                  />
                  <span style={{ fontSize: '0.55rem', color: '#666' }}>
                    {entry.date.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Muscle Group Distribution */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.15rem',
            color: 'white',
            marginBottom: '1rem',
          }}
        >
          Muscle Group Distribution
        </h2>
        <div
          data-testid="muscle-distribution"
          className="glass-panel"
          style={{ padding: '1.5rem' }}
        >
          {DEMO_ANALYTICS.muscleGroups.map((mg, i) => (
            <div key={i} style={{ marginBottom: i < DEMO_ANALYTICS.muscleGroups.length - 1 ? '0.75rem' : 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                <span>{mg.name}</span>
                <span style={{ color: '#888' }}>{mg.percentage}%</span>
              </div>
              <div
                style={{
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${mg.percentage}%`,
                    background: `hsl(${i * 60 + 160}, 70%, 50%)`,
                    borderRadius: '3px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Continue */}
      <button
        data-testid="demo-continue-button"
        onClick={() => router.push('/demo/trainer')}
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
        View Trainer Dashboard
      </button>
    </div>
  );
}
