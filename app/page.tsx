import LoginForm from '@/components/LoginForm';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e1b4b, #0a0a0a)',
      padding: '1rem'
    }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FitPlan
        </h1>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>Professional Workout Planning</p>
      </div>

      <LoginForm />
    </main>
  );
}
