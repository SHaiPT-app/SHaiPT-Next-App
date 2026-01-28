'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_WORKOUT_LOG, DEMO_TRAINING_PLAN } from '@/lib/demoData';

export default function DemoWorkoutPage() {
  const router = useRouter();
  const session = DEMO_TRAINING_PLAN.sessions[0];
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showFormAnalysis, setShowFormAnalysis] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});

  const currentExercise = session.exercises[currentExerciseIndex];

  const toggleSet = (setIndex: number) => {
    const key = `${currentExerciseIndex}-${setIndex}`;
    setCompletedSets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allCurrentSetsCompleted = currentExercise.sets.every(
    (_, i) => completedSets[`${currentExerciseIndex}-${i}`]
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '1.5rem',
            color: 'var(--primary)',
            margin: 0,
          }}
        >
          {session.name}
        </h1>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Exercise {currentExerciseIndex + 1} of {session.exercises.length}
        </p>
      </div>

      {/* Exercise Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        {session.exercises.map((ex, i) => (
          <button
            key={i}
            onClick={() => setCurrentExerciseIndex(i)}
            style={{
              padding: '0.5rem 1rem',
              background:
                i === currentExerciseIndex
                  ? 'var(--primary)'
                  : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '20px',
              color: i === currentExerciseIndex ? 'white' : '#888',
              fontSize: '0.8rem',
              fontWeight: i === currentExerciseIndex ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Current Exercise */}
      <div
        className="glass-panel"
        style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
      >
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1rem' }}>
          {currentExercise.name}
        </h2>

        {/* Sets Table */}
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.5rem 1fr 1fr 1fr 3rem',
              fontSize: '0.7rem',
              color: '#666',
              textTransform: 'uppercase',
              padding: '0 0.25rem',
              letterSpacing: '0.05em',
            }}
          >
            <span>Set</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>Rest</span>
            <span>Done</span>
          </div>

          {currentExercise.sets.map((set, i) => {
            const isCompleted = completedSets[`${currentExerciseIndex}-${i}`];
            return (
              <div
                key={i}
                data-testid={`set-row-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5rem 1fr 1fr 1fr 3rem',
                  alignItems: 'center',
                  padding: '0.75rem 0.25rem',
                  background: isCompleted
                    ? 'rgba(255, 102, 0, 0.05)'
                    : 'transparent',
                  borderRadius: '8px',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ fontWeight: 600, color: '#888' }}>{i + 1}</span>
                <span>{set.weight}</span>
                <span>{set.reps}</span>
                <span style={{ color: '#888' }}>{set.rest_seconds}s</span>
                <button
                  onClick={() => toggleSet(i)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: isCompleted
                      ? '2px solid #FF6600'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    background: isCompleted
                      ? 'rgba(255, 102, 0, 0.2)'
                      : 'transparent',
                    color: isCompleted ? '#FF6600' : '#666',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {isCompleted ? '\u2713' : ''}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Analysis Toggle */}
      <button
        data-testid="form-analysis-toggle"
        onClick={() => setShowFormAnalysis(!showFormAnalysis)}
        style={{
          width: '100%',
          padding: '1rem',
          background: showFormAnalysis
            ? 'rgba(99, 102, 241, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
          border: showFormAnalysis
            ? '1px solid rgba(99, 102, 241, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: showFormAnalysis ? '#818cf8' : '#aaa',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem',
          transition: 'all 0.2s',
        }}
      >
        {showFormAnalysis ? 'Hide' : 'Show'} AI Form Analysis
      </button>

      {/* Form Analysis Results */}
      {showFormAnalysis && (
        <div
          data-testid="form-analysis-panel"
          className="glass-panel"
          style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#818cf8',
              margin: '0 0 1rem',
            }}
          >
            Form Analysis — {DEMO_WORKOUT_LOG.exercise}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DEMO_WORKOUT_LOG.formFeedback.map((fb, i) => (
              <div
                key={i}
                data-testid={`form-feedback-${fb.type}`}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  background:
                    fb.type === 'good'
                      ? 'rgba(255, 102, 0, 0.05)'
                      : 'rgba(245, 158, 11, 0.05)',
                  borderRadius: '8px',
                  border: `1px solid ${
                    fb.type === 'good'
                      ? 'rgba(255, 102, 0, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)'
                  }`,
                }}
              >
                <span
                  style={{
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {fb.type === 'good' ? '\u2713' : '\u26A0'}
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    color:
                      fb.type === 'good'
                        ? 'rgba(255, 102, 0, 0.9)'
                        : '#f59e0b',
                    lineHeight: 1.5,
                  }}
                >
                  {fb.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Exercise / Continue */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {currentExerciseIndex < session.exercises.length - 1 ? (
          <>
            <button
              data-testid="next-exercise-button"
              onClick={() => {
                setCurrentExerciseIndex((prev) => prev + 1);
                setShowFormAnalysis(false);
              }}
              style={{
                flex: 1,
                padding: '1rem',
                background: allCurrentSetsCompleted
                  ? 'var(--primary)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: allCurrentSetsCompleted ? 'white' : '#aaa',
                border: allCurrentSetsCompleted
                  ? 'none'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next Exercise
            </button>
            <button
              data-testid="demo-continue-button"
              onClick={() => router.push('/demo/analytics')}
              style={{
                padding: '1rem 1.5rem',
                background: 'transparent',
                color: '#888',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Skip to Analytics
            </button>
          </>
        ) : (
          <button
            data-testid="demo-continue-button"
            onClick={() => router.push('/demo/analytics')}
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
            View Analytics
          </button>
        )}
      </div>
    </div>
  );
}
