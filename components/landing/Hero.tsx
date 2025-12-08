'use client';

import Link from 'next/link';
import Image from 'next/image';
import TextType from '@/components/TextType';

export default function Hero() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'sans-serif' // Ensure clean font
        }}>
            {/* Background Gradients */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '20%',
                width: '60vw',
                height: '60vw',
                background: 'radial-gradient(circle, rgba(242,95,41,0.1), transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }}></div>

            {/* Navbar */}
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 2rem',
                maxWidth: '1200px',
                width: '100%',
                margin: '1rem auto 0',
                position: 'relative',
                zIndex: 10,
                background: 'rgba(21, 21, 31, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Image src="/logo_transparent.png" alt="SHaiPT" width={40} height={40} />
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-orbitron)' }}>SHaiPT</span>
                </div>
                <Link href="/login" style={{
                    cursor: 'pointer',
                    width: '120px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875em',
                    fontWeight: '800',
                    letterSpacing: '1px',
                    color: '#fff',
                    background: '#F25F29',
                    border: '2px solid #d44a1f',
                    borderRadius: '.75rem',
                    boxShadow: '0 6px 0 #d44a1f',
                    transform: 'skew(-10deg)',
                    transition: 'all .1s ease',
                    textDecoration: 'none'
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.letterSpacing = '0px';
                    e.currentTarget.style.transform = 'skew(-10deg) translateY(6px)';
                    e.currentTarget.style.boxShadow = '0 0 0 #d44a1f';
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.letterSpacing = '1px';
                    e.currentTarget.style.transform = 'skew(-10deg)';
                    e.currentTarget.style.boxShadow = '0 6px 0 #d44a1f';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.letterSpacing = '1px';
                    e.currentTarget.style.transform = 'skew(-10deg)';
                    e.currentTarget.style.boxShadow = '0 6px 0 #d44a1f';
                }}>Let's Go!</Link>
            </nav>

            {/* Hero Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '6rem 1rem 0',
                position: 'relative',
                zIndex: 1
            }}>

                <h1 style={{
                    fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: '1.1',
                    marginBottom: '1.5rem',
                    maxWidth: '900px',
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-orbitron)'
                }}>
                    Let's{' '}
                    <TextType
                        text={['Get SHaiPT', 'Train Smart', 'Push Limits', 'Crush Goals']}
                        as="span"
                        typingSpeed={100}
                        pauseDuration={5000}
                        deletingSpeed={50}
                        loop={true}
                        textColors={['#F25F29']}
                        cursorCharacter="|"
                        showCursor={true}
                        cursorClassName=""
                        style={{
                            color: '#F25F29',
                            display: 'inline'
                        }}
                    />
                </h1>

                <div style={{
                    background: 'rgba(21, 21, 31, 0.8)',
                    backdropFilter: 'blur(10px)',
                    padding: '2rem 2.5rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    marginBottom: '2.5rem',
                    maxWidth: '700px',
                    display: 'inline-block'
                }}>
                    <p style={{
                        fontSize: '1.25rem',
                        color: '#ccc',
                        lineHeight: '1.6',
                        margin: '0'
                    }}>
                        Train with AI-powered insights and real human connections: workout planning, form checks, and progress sharing.
                    </p>
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '6.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/login" style={{
                        background: '#F25F29',
                        color: 'white',
                        padding: '1rem 2.5rem',
                        borderRadius: '50px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        boxShadow: '0 8px 24px rgba(242, 95, 41, 0.3)',
                        transition: 'transform 0.2s'
                    }}>
                        Get Started Free
                    </Link>
                </div>

                {/* Hero Composite Image (Floating) */}
                <div style={{
                    width: '100%',
                    maxWidth: '1100px',
                    position: 'relative',
                    marginBottom: '-10%' // Overlap next section slightly for depth
                }}>
                    <Image
                        src="/mockups/shaipt_app_showcase_v2.png"
                        alt="App Showcase"
                        width={1200}
                        height={800}
                        style={{
                            width: '100%',
                            height: 'auto',
                            filter: 'drop-shadow(0 -20px 60px rgba(0,0,0,0.5))'
                        }}
                    />
                </div>
            </div>
        </section>
    );
}
