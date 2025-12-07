'use client';

import Link from 'next/link';
import Image from 'next/image';

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
                padding: '1.5rem 2rem',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Image src="/logo_transparent.png" alt="SHaiPT" width={40} height={40} />
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>SHaiPT</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link href="#features" style={{ color: '#ccc', textDecoration: 'none', fontWeight: '500' }}>Features</Link>
                    <Link href="#testimonials" style={{ color: '#ccc', textDecoration: 'none', fontWeight: '500' }}>Stories</Link>
                    <Link href="/login" style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        color: '#fff',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'background 0.2s'
                    }}>Sign In</Link>
                </div>
            </nav>

            {/* Hero Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '4rem 1rem 0',
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
                    letterSpacing: '-0.02em'
                }}>
                    Unlock Your Potential with <span style={{ color: '#F25F29' }}>AI Coaching</span>
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
                        Form correction, diet planning, and workout scheduling—all powered by advanced AI. Experience the 1% edge.
                    </p>
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
