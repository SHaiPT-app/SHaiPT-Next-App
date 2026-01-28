'use client';

import { usePathname, useRouter } from 'next/navigation';
import { DEMO_STEPS } from '@/lib/demoData';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = DEMO_STEPS.findIndex((s) => s.path === pathname);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      {/* Demo Progress Bar */}
      <div
        data-testid="demo-progress-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'rgba(21, 21, 31, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.75rem 1rem',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'var(--font-orbitron)',
              padding: '0.25rem 0.5rem',
              marginRight: '0.5rem',
            }}
          >
            SHaiPT
          </button>

          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              flex: 1,
              alignItems: 'center',
            }}
          >
            {DEMO_STEPS.map((step, i) => {
              const isActive = i === currentIndex;
              const isCompleted = i < currentIndex;

              return (
                <div
                  key={step.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    flex: 1,
                  }}
                >
                  <button
                    onClick={() => {
                      if (isCompleted || isActive) router.push(step.path);
                    }}
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      border: 'none',
                      cursor: isCompleted || isActive ? 'pointer' : 'default',
                      background: isCompleted
                        ? 'var(--primary)'
                        : isActive
                          ? 'linear-gradient(90deg, var(--primary), rgba(242, 95, 41, 0.3))'
                          : 'rgba(255, 255, 255, 0.1)',
                      transition: 'background 0.3s',
                      padding: 0,
                    }}
                    title={step.label}
                  />
                </div>
              );
            })}
          </div>

          <span
            style={{
              fontSize: '0.7rem',
              color: '#888',
              marginLeft: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            {currentIndex >= 0 ? DEMO_STEPS[currentIndex].label : 'Demo'} ({currentIndex + 1}/{DEMO_STEPS.length})
          </span>
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
