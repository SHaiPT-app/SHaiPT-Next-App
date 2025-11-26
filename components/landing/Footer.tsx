'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{
            padding: '3rem 2rem',
            background: '#15151F',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #F25F29, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '0.5rem'
                    }}>
                        SHaiPT
                    </h3>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                        Your AI-powered fitness companion
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '2rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '2rem'
                }}>
                    <Link href="/login" style={{
                        color: '#aaa',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        transition: 'color 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#F25F29'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                    >
                        Sign Up
                    </Link>
                    <Link href="/login" style={{
                        color: '#aaa',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        transition: 'color 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#F25F29'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                    >
                        Sign In
                    </Link>
                </div>

                <div style={{
                    color: '#666',
                    fontSize: '0.85rem'
                }}>
                    © {new Date().getFullYear()} SHaiPT. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
