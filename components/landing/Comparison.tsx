'use client';

import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/ScrollReveal';
import { fadeInUp, staggerContainer } from '@/lib/animations';

interface ComparisonRow {
  feature: string;
  shaipt: boolean | string;
  fitbod: boolean | string;
  strongApp: boolean | string;
  genericPT: boolean | string;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'AI Workout Generation',
    shaipt: true,
    fitbod: true,
    strongApp: false,
    genericPT: false,
  },
  {
    feature: 'Real-Time Form Analysis',
    shaipt: true,
    fitbod: false,
    strongApp: false,
    genericPT: 'In-person only',
  },
  {
    feature: 'AI Nutrition Coaching',
    shaipt: true,
    fitbod: false,
    strongApp: false,
    genericPT: 'Extra cost',
  },
  {
    feature: 'Periodized Programming',
    shaipt: true,
    fitbod: 'Basic',
    strongApp: false,
    genericPT: true,
  },
  {
    feature: 'Progressive Overload Tracking',
    shaipt: true,
    fitbod: true,
    strongApp: true,
    genericPT: true,
  },
  {
    feature: 'User-Editable AI Plans',
    shaipt: true,
    fitbod: false,
    strongApp: false,
    genericPT: false,
  },
  {
    feature: '24/7 Availability',
    shaipt: true,
    fitbod: true,
    strongApp: true,
    genericPT: false,
  },
  {
    feature: 'Starting Price',
    shaipt: '$9.99/mo',
    fitbod: '$12.99/mo',
    strongApp: '$4.99/mo',
    genericPT: '$200+/mo',
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return (
      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <span
        style={{
          color: '#39ff14',
          fontSize: '1.1rem',
          textShadow: '0 0 8px rgba(57, 255, 20, 0.4)',
        }}
      >
        ✓
      </span>
    );
  }
  return (
    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.1rem' }}>
      ✗
    </span>
  );
}

export default function Comparison() {
  return (
    <section
      id="comparison"
      style={{
        padding: '6rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#00d4ff',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginBottom: '1rem',
              }}
            >
              Comparison
            </p>
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: '800',
                color: '#fff',
                marginBottom: '1rem',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              Why SHaiPT?
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '550px',
                margin: '0 auto',
              }}
            >
              See how we stack up against the competition.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <motion.table
              variants={fadeInUp}
              style={{
                width: '100%',
                minWidth: '700px',
                borderCollapse: 'separate',
                borderSpacing: '0',
                background: 'rgba(21, 21, 31, 0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '1.25rem 1.5rem',
                      textAlign: 'left',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Feature
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontWeight: '800',
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #00d4ff, #39ff14)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      SHaiPT
                    </div>
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Fitbod
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Strong
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Personal Trainer
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom:
                        index < comparisonData.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '1rem 1.5rem',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        borderBottom:
                          index < comparisonData.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                      }}
                    >
                      {row.feature}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        background: 'rgba(0, 212, 255, 0.04)',
                        borderBottom:
                          index < comparisonData.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                      }}
                    >
                      <CellValue value={row.shaipt} />
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        borderBottom:
                          index < comparisonData.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                      }}
                    >
                      <CellValue value={row.fitbod} />
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        borderBottom:
                          index < comparisonData.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                      }}
                    >
                      <CellValue value={row.strongApp} />
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        borderBottom:
                          index < comparisonData.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                      }}
                    >
                      <CellValue value={row.genericPT} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
