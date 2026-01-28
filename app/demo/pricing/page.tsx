'use client';

import { useRouter } from 'next/navigation';

const tiers = [
  {
    name: 'Starter',
    price: '$9.99',
    period: '/month',
    description: 'Perfect for getting started with AI-powered training.',
    features: [
      'AI workout generation',
      'Basic exercise library',
      'Workout logging',
      'Progress tracking',
      'Community access',
    ],
    highlighted: false,
    ctaText: 'Get Started',
  },
  {
    name: 'Pro',
    price: '$19.99',
    period: '/month',
    description: 'Full suite with form analysis and nutrition coaching.',
    features: [
      'Everything in Starter',
      'Real-time form analysis',
      'AI nutrition coaching',
      'Periodized programming',
      'Advanced analytics',
      'Priority AI access',
    ],
    highlighted: true,
    ctaText: 'Start Pro Trial',
  },
  {
    name: 'Elite',
    price: '$29.99',
    period: '/month',
    description: 'For serious athletes and fitness professionals.',
    features: [
      'Everything in Pro',
      'Coach dashboard',
      'Client management',
      'Custom program templates',
      'White-label options',
      'API access',
      'Dedicated support',
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
  },
];

export default function DemoPricingPage() {
  const router = useRouter();

  const handleSignUp = () => {
    // Clean up demo mode
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_user');
    router.push('/login');
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        paddingBottom: '6rem',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.3rem 1rem',
            background: 'rgba(255, 102, 0, 0.1)',
            border: '1px solid rgba(255, 102, 0, 0.3)',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: '#FF6600',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          Demo Complete
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: '2rem',
            color: 'white',
            margin: '0 0 0.5rem',
          }}
        >
          Choose Your Plan
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '1.05rem',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          You&apos;ve seen the platform. Start your free trial today.
        </p>
      </div>

      {/* Pricing Grid */}
      <div
        data-testid="pricing-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
          marginBottom: '3rem',
        }}
      >
        {tiers.map((tier, index) => (
          <div
            key={index}
            data-testid={`pricing-tier-${tier.name.toLowerCase()}`}
            style={{
              position: 'relative',
              background: tier.highlighted
                ? 'rgba(255, 102, 0, 0.06)'
                : 'rgba(21, 21, 31, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: tier.highlighted
                ? '1px solid rgba(255, 102, 0, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: tier.highlighted
                ? '0 0 40px rgba(255, 102, 0, 0.1)'
                : '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            {tier.highlighted && (
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '0.3rem 1rem',
                  background: 'linear-gradient(135deg, #FF6600, #CC5200)',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Most Popular
              </div>
            )}

            <h3
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              {tier.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#fff',
                  fontFamily: 'var(--font-orbitron)',
                }}
              >
                {tier.price}
              </span>
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                {tier.period}
              </span>
            </div>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              {tier.description}
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                marginBottom: '1.5rem',
                flex: 1,
              }}
            >
              {tier.features.map((feature, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <span style={{ color: '#FF6600', fontSize: '0.85rem' }}>
                    {'\u2713'}
                  </span>
                  {feature}
                </div>
              ))}
            </div>

            <button
              data-testid={`pricing-cta-${tier.name.toLowerCase()}`}
              onClick={handleSignUp}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '0.9rem 2rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                ...(tier.highlighted
                  ? {
                      background: 'linear-gradient(135deg, #FF6600, #CC5200)',
                      color: '#fff',
                      boxShadow: '0 0 25px rgba(255, 102, 0, 0.3)',
                      border: 'none',
                    }
                  : {
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }),
              }}
            >
              {tier.ctaText}
            </button>
          </div>
        ))}
      </div>

      {/* Back to Landing / Restart Demo */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
        }}
      >
        <button
          data-testid="restart-demo-button"
          onClick={() => router.push('/demo')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: '#888',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Restart Demo
        </button>
        <button
          data-testid="back-to-landing-button"
          onClick={() => {
            localStorage.removeItem('demo_mode');
            localStorage.removeItem('demo_user');
            router.push('/');
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: '#888',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
