'use client';

export default function Features() {
    const features = [
        {
            icon: '🤖',
            title: 'AI Workout Planner',
            description: 'Get personalized workout plans tailored to your fitness level, goals, and available equipment.'
        },
        {
            icon: '🥗',
            title: 'AI Dietitian',
            description: 'Custom nutrition plans with macro calculations based on your body metrics and fitness goals.'
        },
        {
            icon: '📹',
            title: 'Form Checker',
            description: 'Real-time form analysis using computer vision to help you perform exercises with proper technique.'
        },
        {
            icon: '📊',
            title: 'Track Progress',
            description: 'Log your workouts, monitor your improvements, and visualize your fitness journey over time.'
        }
    ];

    return (
        <section style={{
            padding: '6rem 2rem',
            background: '#15151F',
            position: 'relative'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: '800',
                        color: '#fff',
                        marginBottom: '1rem'
                    }}>
                        Everything You Need to Succeed
                    </h2>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#aaa',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        Powerful AI-driven features to help you reach your fitness goals faster
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem'
                }}>
                    {features.map((feature, index) => (
                        <div key={index} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '2rem',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.borderColor = 'rgba(242, 95, 41, 0.3)';
                                e.currentTarget.style.boxShadow = '0 12px 48px rgba(242, 95, 41, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                fontSize: '3rem',
                                marginBottom: '1rem'
                            }}>
                                {feature.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#fff',
                                marginBottom: '0.75rem'
                            }}>
                                {feature.title}
                            </h3>
                            <p style={{
                                color: '#aaa',
                                lineHeight: '1.6'
                            }}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
