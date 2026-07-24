'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { BrainCircuit, ScanLine, Salad } from 'lucide-react';
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
    Icon: BrainCircuit,
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
    Icon: ScanLine,
  },
  {
    title: 'AI Nutrition Coach',
    description:
      'Get personalized meal plans, macro tracking, and dietary recommendations aligned with your training goals, all powered by Gemini AI.',
    image: '/mockups/shaipt_framed_analytics.png',
    bullets: [
      'Custom meal plans',
      'Macro & calorie tracking',
      'Supplement guidance',
    ],
    Icon: Salad,
  },
];

const stats = [
  { value: '10K+', label: 'Workouts Generated' },
  { value: '98%', label: 'Form Accuracy' },
  { value: '4.9', label: 'User Rating' },
  { value: '24/7', label: 'AI Availability' },
];

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden px-4 py-32 sm:px-8">
      <div className="glow-orb right-[-10%] top-[20%] h-[40vw] w-[40vw]" />

      <div className="relative z-[1] mx-auto max-w-6xl">
        {/* Section header */}
        <ScrollReveal>
          <div className="mb-24 flex flex-col items-center text-center">
            <span className="eyebrow mb-4">Features</span>
            <h2 className="display mb-4 text-[clamp(2.2rem,5vw,3.5rem)]">
              Everything You Need to <span className="text-gradient-brand">Train</span>
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-ink-mid">
              Three AI-powered pillars working together to transform your fitness journey.
            </p>
            <div className="brand-bars mt-8">
              <span /><span /><span />
            </div>
          </div>
        </ScrollReveal>

        {/* Feature rows */}
        <div className="flex flex-col gap-24">
          {features.map((feature, index) => {
            const { Icon } = feature;
            const reversed = index % 2 !== 0;
            return (
              <ScrollReveal key={feature.title} variants={staggerContainer}>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  className={`flex flex-wrap items-center justify-between gap-16 ${
                    reversed ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Text side */}
                  <motion.div
                    variants={reversed ? fadeInRight : fadeInLeft}
                    className="min-w-[300px] flex-1 p-2"
                  >
                    <div className="glass-card glass-card-hover p-10">
                      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/30 bg-[var(--brand-glow-soft)] text-brand">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="display mb-4 text-[clamp(1.5rem,3vw,2rem)] !font-bold">
                        {feature.title}
                      </h3>
                      <p className="mb-6 leading-relaxed text-ink-mid">
                        {feature.description}
                      </p>
                      <ul className="flex flex-col gap-3">
                        {feature.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-center gap-3 text-[0.95rem] text-ink-mid">
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[0.7rem] text-white">
                              ✓
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>

                  {/* Image side */}
                  <motion.div
                    variants={reversed ? fadeInLeft : fadeInRight}
                    className="flex min-w-[300px] flex-1 justify-center"
                  >
                    <div className="relative w-full max-w-[380px]">
                      <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,var(--brand-glow-soft),transparent_70%)] blur-[40px]" />
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        width={380}
                        height={760}
                        className="relative z-[1] h-auto w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Stats bar */}
        <ScrollReveal>
          <motion.div
            variants={fadeInUp}
            className="glass-card mt-24 grid grid-cols-2 gap-8 p-12 text-center md:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-gradient-brand text-4xl font-extrabold">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-sm text-ink-low">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
