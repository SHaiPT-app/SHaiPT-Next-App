'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/ScrollReveal';
import {
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  staggerContainer,
} from '@/lib/animations';

const features = [
  {
    title: 'Smart Workout Planning',
    description:
      'AI generates periodized training plans tailored to your goals, equipment, and schedule. Plans auto-adjust based on your progress and recovery.',
    image: '/mockups/shaipt_framed_workout.png',
    bullets: [
      'Personalized splits & periodization',
      'Auto-progressive overload',
      'Equipment-aware programming',
    ],
    icon: 'AI',
  },
  {
    title: 'Real-Time Form Analysis',
    description:
      'Computer vision powered by MediaPipe tracks your movements in real-time, providing instant corrective feedback to optimize form and prevent injury.',
    image: '/mockups/shaipt_framed_exercise.png',
    bullets: [
      'Visual skeleton tracking',
      'Instant audio cues',
      'Injury prevention alerts',
    ],
    icon: 'CV',
  },
  {
    title: 'AI Nutrition Coach',
    description:
      'Get personalized meal plans, macro tracking, and dietary recommendations aligned with your training goals — all powered by Gemini AI.',
    image: '/mockups/shaipt_framed_analytics.png',
    bullets: [
      'Custom meal plans',
      'Macro & calorie tracking',
      'Supplement guidance',
    ],
    icon: 'NUT',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        padding: '8rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
          width: '40vw',
          height: '40vw',
          background:
            'radial-gradient(circle, rgba(255, 102, 0, 0.05), transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <ScrollReveal>
          <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
            <p
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#FF6600',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginBottom: '1rem',
              }}
            >
              Features
            </p>
            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: '800',
                color: '#fff',
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              Everything You Need to Train
            </h2>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.7',
              }}
            >
              Three AI-powered pillars working together to transform your
              fitness journey.
            </p>
          </div>
        </ScrollReveal>

        {/* Feature Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>
          {features.map((feature, index) => (
            <ScrollReveal key={index} variants={staggerContainer}>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
                  gap: '4rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Text Side */}
                <motion.div
                  variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
                  style={{ flex: '1', minWidth: '300px', padding: '1rem' }}
                >
                  <div
                    style={{
                      background: 'rgba(21, 21, 31, 0.6)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      padding: '2.5rem',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '2.5rem',
                        marginBottom: '1rem',
                      }}
                    >
                      {feature.icon}
                    </div>
                    <h3
                      style={{
                        fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '1rem',
                        lineHeight: '1.2',
                        fontFamily: 'var(--font-orbitron)',
                      }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: '1.8',
                        marginBottom: '1.5rem',
                      }}
                    >
                      {feature.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {feature.bullets.map((bullet, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.95rem',
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background:
                                'linear-gradient(135deg, #FF6600, #CC5200)',
                              color: '#fff',
                              fontSize: '0.7rem',
                              flexShrink: 0,
                            }}
                          >
                            ✓
                          </span>
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Image Side */}
                <motion.div
                  variants={index % 2 === 0 ? fadeInRight : fadeInLeft}
                  style={{
                    flex: '1',
                    minWidth: '300px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      maxWidth: '380px',
                      width: '100%',
                    }}
                  >
                    {/* Glow behind image */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-30px',
                        background:
                          'radial-gradient(circle, rgba(255, 102, 0, 0.08), transparent 70%)',
                        filter: 'blur(40px)',
                        zIndex: 0,
                        borderRadius: '50%',
                      }}
                    />
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      width={380}
                      height={760}
                      style={{
                        width: '100%',
                        height: 'auto',
                        position: 'relative',
                        zIndex: 1,
                        filter:
                          'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Stats bar */}
        <ScrollReveal>
          <motion.div
            variants={fadeInUp}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              marginTop: '6rem',
              padding: '3rem',
              background: 'rgba(21, 21, 31, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            {[
              { value: '10K+', label: 'Workouts Generated' },
              { value: '98%', label: 'Form Accuracy' },
              { value: '4.9', label: 'User Rating' },
              { value: '24/7', label: 'AI Availability' },
            ].map((stat, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    fontFamily: 'var(--font-orbitron)',
                    background: 'linear-gradient(135deg, #FF6600, #FF8533)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: '0.25rem',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
