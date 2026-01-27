import React from 'react';
import FloatingLines from './FloatingLines';

interface StaticBackgroundProps {
  children: React.ReactNode;
}

export default function StaticBackground({ children }: StaticBackgroundProps) {
  return (
    <div className="relative min-h-screen">
      {/* Fixed Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <FloatingLines
          interactive={false}
          parallax={false}
          linesGradient={[
            '#34304d', // Primary dark (converted from your oklch primary)
            '#d94e1b', // Your primary-hover orange
            '#6366f1', // Indigo accent
            '#8b5cf6', // Purple accent
            '#f5f5f7', // Light (converted from your secondary)
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
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}