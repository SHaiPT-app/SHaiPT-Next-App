export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#15151F',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            margin: '0 auto 1rem',
            border: '3px solid rgba(255, 102, 0, 0.2)',
            borderTopColor: '#FF6600',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            color: 'rgba(229, 229, 231, 0.5)',
            fontSize: '0.875rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Loading...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}
