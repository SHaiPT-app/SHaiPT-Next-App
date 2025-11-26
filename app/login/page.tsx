import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#15151F',
            padding: '1rem'
        }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '4rem', fontWeight: '800', color: '#F25F29', textShadow: '0 0 20px rgba(242, 95, 41, 0.5)', marginBottom: '0.5rem' }}>
                    SHaiPT
                </h1>
                <p style={{ color: '#888', fontSize: '1.2rem' }}>Professional Workout Planning</p>
            </div>

            <LoginForm />
        </main>
    );
}
