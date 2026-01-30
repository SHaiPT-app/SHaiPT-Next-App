'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#15151F',
          color: '#E5E5E7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '500px' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#FF6600',
              marginBottom: '1rem',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(229, 229, 231, 0.7)',
              lineHeight: 1.6,
              marginBottom: '0.5rem',
            }}
          >
            {error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'rgba(229, 229, 231, 0.4)',
                marginBottom: '1.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #FF6600, #CC5200)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255, 102, 0, 0.3)',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
