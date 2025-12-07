'use client';


export default function Features() {
    const features = [
        {
            title: 'Smart Workout Planning',
            description: 'AI generates personalized workout plans tailored to your goals, equipment, and schedule. It adapts as you progress, ensuring mostly optimal load.',
            image: '/mockups/shaipt_framed_workout.png',
            bullets: ['Personalized splits', 'Auto-progressive overload', 'Equipment-aware'],
            align: 'left'
        },
        {
            title: 'Real-Time Form Guidance',
            description: 'The built-in computer vision analyzes your movement in real-time, offering instant feedback to correct your form and prevent injury.',
            image: '/mockups/shaipt_framed_exercise.png',
            bullets: ['Visual skeleton tracking', 'Instant audio feedback', 'Injury prevention'],
            align: 'right'
        },
        {
            title: 'Advanced Analytics',
            description: 'Visualize your progress with deep insights. Track volume, strength progression, and workout consistency to stay on top of your game.',
            image: '/mockups/shaipt_framed_analytics.png',
            bullets: ['Strength progression charts', 'Muscle group breakdown', 'Volume tracking'],
            align: 'left'
        }
    ];

    return (
        <section id="features" style={{
            padding: '10rem 2rem',
            background: '#15151F',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '8rem' }}>
                    <h2 style={{
                        fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                        fontWeight: '800',
                        color: '#fff',
                        marginBottom: '1rem',
                        letterSpacing: '-0.02em'
                    }}>
                        Power in Your Pocket
                    </h2>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#888',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        The only fitness app you'll ever need.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8rem' }}>
                    {features.map((feature, index) => (
                        <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
                            gap: '4rem',
                            flexWrap: 'wrap'
                        }} className="feature-row">

                            {/* Text Side */}
                            <div style={{ flex: '1', minWidth: '320px', padding: '1rem' }}>
                                <h3 style={{
                                    fontSize: 'clamp(2rem, 3vw, 2.5rem)',
                                    fontWeight: '700',
                                    color: '#fff',
                                    marginBottom: '1.5rem',
                                    lineHeight: '1.2'
                                }}>
                                    {feature.title}
                                </h3>
                                <p style={{
                                    fontSize: '1.1rem',
                                    color: '#aaa',
                                    lineHeight: '1.8',
                                    marginBottom: '2rem'
                                }}>
                                    {feature.description}
                                </p>
                                {/* Bullets */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {feature.bullets.map((bullet, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ddd' }}>
                                            <span style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '24px', height: '24px', borderRadius: '50%', background: '#F25F29', color: '#fff', fontSize: '0.8rem'
                                            }}>✓</span>
                                            {bullet}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Image Side */}
                            <div style={{ flex: '1', minWidth: '320px', display: 'flex', justifyContent: 'center' }}>
                                <div style={{
                                    position: 'relative',
                                    maxWidth: '380px',
                                    width: '100%',
                                    perspective: '1000px'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        inset: '-20px',
                                        background: 'radial-gradient(circle, rgba(242,95,41,0.15), transparent 70%)',
                                        filter: 'blur(30px)',
                                        zIndex: 0,
                                        borderRadius: '50%'
                                    }}></div>
                                    <img
                                        src={feature.image}
                                        alt={feature.title}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            transform: index % 2 === 0 ? 'rotateY(-5deg)' : 'rotateY(5deg)',
                                            transition: 'transform 0.5s ease',
                                            position: 'relative',
                                            zIndex: 1,
                                            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'rotateY(0deg) scale(1.02)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = index % 2 === 0 ? 'rotateY(-5deg)' : 'rotateY(5deg)'}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 900px) {
                    .feature-row {
                        flex-direction: column !important;
                        text-align: center;
                    }
                    /* Reset transforms on mobile */
                    .feature-row img {
                        transform: none !important;
                    }
                }
            `}</style>
        </section>
    );
}
