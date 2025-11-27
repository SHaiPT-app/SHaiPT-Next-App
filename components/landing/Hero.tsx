'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#15151F',
            padding: '2rem 1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated gradient orbs */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(242,95,41,0.15), transparent)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                animation: 'float 20s ease-in-out infinite'
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                animation: 'float 25s ease-in-out infinite reverse'
            }}></div>

            <div style={{ maxWidth: '1000px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <Image
                        src="/hero_logo_transparent.png"
                        alt="SHaiPT Logo"
                        width={300}
                        height={300}
                        style={{ maxWidth: '100%', height: 'auto' }}
                        priority
                    />
                </div>

                {/* Brand Name */}
                <h1 style={{
                    fontSize: 'clamp(3.5rem, 8vw, 5rem)',
                    fontWeight: '900',
                    color: '#F25F29',
                    marginBottom: '1.5rem',
                    textShadow: '0 0 40px rgba(242, 95, 41, 0.6), 0 0 80px rgba(242, 95, 41, 0.4)',
                    letterSpacing: '0.05em'
                }}>
                    SHaiPT
                </h1>

                {/* Tagline */}
                <h2 style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '1.5rem',
                    lineHeight: '1.2'
                }}>
                    Your AI Personal Trainer
                </h2>

                <p style={{
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                    color: '#aaa',
                    marginBottom: '3rem',
                    maxWidth: '600px',
                    margin: '0 auto 3rem'
                }}>
                    Build personalized routines, track your progress, and get AI-powered coaching to achieve your fitness goals.
                </p>

                {/* CTAs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Link href="/login" style={{
                        background: 'linear-gradient(135deg, #F25F29, #d94e1b)',
                        color: 'white',
                        padding: '1rem 2.5rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        boxShadow: '0 8px 32px rgba(242, 95, 41, 0.3)',
                        transition: 'all 0.3s ease',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 48px rgba(242, 95, 41, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 32px rgba(242, 95, 41, 0.3)';
                        }}
                    >
                        Get Started Free
                    </Link>

                    <Link href="/login" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        padding: '1rem 2.5rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        Sign In
                    </Link>
                </div>

                {/* Social Proof */}
                <div style={{
                    marginTop: '4rem',
                    color: '#888',
                    fontSize: '0.9rem'
                }}>
                    ✨ Trusted by thousands of athletes worldwide
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(50px, 50px); }
                }
            `}</style>
        </section>
    );
}
