'use client';

import React, { Component, Suspense } from 'react';
import dynamic from 'next/dynamic';

const FloatingLines = dynamic(() => import('./FloatingLines'), {
  ssr: false,
  loading: () => <CSSFallbackBackground />,
});

/** CSS gradient fallback when WebGL is unavailable or loading */
function CSSFallbackBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at 30% 50%, rgba(217, 78, 27, 0.08), transparent 60%), ' +
          'radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.06), transparent 60%), ' +
          'radial-gradient(ellipse at 50% 20%, rgba(139, 92, 246, 0.05), transparent 60%)',
      }}
    />
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Error boundary that catches WebGL/Three.js crashes */
class WebGLErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('WebGL background failed, using CSS fallback:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return <CSSFallbackBackground />;
    }
    return this.props.children;
  }
}

interface StaticBackgroundProps {
  children: React.ReactNode;
}

export default function StaticBackground({ children }: StaticBackgroundProps) {
  return (
    <div className="relative min-h-screen">
      {/* Fixed Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <WebGLErrorBoundary>
          <Suspense fallback={<CSSFallbackBackground />}>
            <FloatingLines
              interactive={false}
              parallax={false}
              linesGradient={[
                '#34304d',
                '#d94e1b',
                '#6366f1',
                '#8b5cf6',
                '#f5f5f7',
              ]}
              enabledWaves={['middle', 'bottom']}
              lineCount={[6, 8]}
              lineDistance={[3, 4]}
              animationSpeed={0.4}
              mixBlendMode="multiply"
              topWavePosition={{ x: 10.0, y: 0.5, rotate: -0.4 }}
              middleWavePosition={{ x: 5.0, y: 0.0, rotate: 0.2 }}
              bottomWavePosition={{ x: 2.0, y: -0.7, rotate: 0.4 }}
            />
          </Suspense>
        </WebGLErrorBoundary>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
