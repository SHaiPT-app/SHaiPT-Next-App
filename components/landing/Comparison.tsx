'use client';

import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';

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

function CellValue({ value, brand = false }: { value: boolean | string; brand?: boolean }) {
  if (typeof value === 'string') {
    return (
      <span className={`text-sm font-semibold ${brand ? 'text-brand' : 'text-ink-mid'}`}>
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-glow-soft)]">
        <Check className="h-4 w-4 text-brand [filter:drop-shadow(0_0_6px_var(--brand-glow))]" />
      </span>
    );
  }
  return <X className="inline h-4 w-4 text-white/25" />;
}

const columns = [
  { key: 'fitbod' as const, label: 'Fitbod' },
  { key: 'strongApp' as const, label: 'Strong' },
  { key: 'genericPT' as const, label: 'Generic PT' },
];

export default function Comparison() {
  return (
    <section id="comparison" className="relative overflow-hidden px-4 py-24 sm:px-8">
      <div className="relative z-[1] mx-auto max-w-5xl">
        <ScrollReveal>
          <div className="mb-16 flex flex-col items-center text-center">
            <span className="eyebrow mb-4">Comparison</span>
            <h2 className="display mb-4 text-[clamp(2rem,5vw,3.5rem)]">
              Why <span className="text-gradient-brand">SHaiPT</span>?
            </h2>
            <p className="max-w-lg text-lg text-ink-mid">
              See how we stack up against the competition.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="glass-card overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-5 text-left text-sm font-semibold uppercase tracking-wider text-ink-low">
                    Feature
                  </th>
                  <th className="rounded-t-2xl border-x border-t border-brand/30 bg-[var(--brand-glow-soft)] px-4 py-5">
                    <span className="flex items-center justify-center gap-2">
                      <Image src="/logo_transparent.png" alt="" width={22} height={22} />
                      <span className="font-display text-base font-extrabold text-white">
                        SH<span className="text-brand">ai</span>PT
                      </span>
                    </span>
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-5 text-center text-sm font-semibold text-ink-low"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={row.feature} className="border-t border-line-soft">
                    <td className="px-4 py-4 text-sm font-medium text-ink-mid">
                      {row.feature}
                    </td>
                    <td
                      className={`border-x border-brand/30 bg-[var(--brand-glow-soft)] px-4 py-4 text-center ${
                        i === comparisonData.length - 1 ? 'rounded-b-2xl border-b' : ''
                      }`}
                    >
                      <CellValue value={row.shaipt} brand />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4 text-center">
                        <CellValue value={row[col.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
