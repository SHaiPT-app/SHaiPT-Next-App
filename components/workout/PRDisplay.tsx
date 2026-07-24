'use client';

import { motion } from 'framer-motion';
import { Trophy, ArrowUp } from 'lucide-react';
import type { WorkoutPRSummary } from '@/lib/types';

interface PRDisplayProps {
    prs: WorkoutPRSummary[];
    compact?: boolean;
}

export function PRDisplay({ prs, compact = false }: PRDisplayProps) {
    if (prs.length === 0) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-glow-soft)] border border-brand/30 rounded-lg">
                <Trophy className="w-4 h-4 text-brand" />
                <span className="text-sm text-brand font-medium">
                    {prs.length} PR{prs.length > 1 ? 's' : ''} achieved!
                </span>
            </div>
        );
    }

    return (
        <div className="glass-card p-4 !border-brand/30 shadow-[0_0_24px_var(--brand-glow-soft)]">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-bold font-display text-ink-hi">Personal Records</h3>
            </div>

            <div className="space-y-3">
                {prs.map((pr, index) => (
                    <motion.div
                        key={`${pr.exerciseId}-${pr.prType}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-[var(--surface-1)] border border-line-soft rounded-lg"
                    >
                        <div>
                            <p className="font-medium text-ink-hi">{pr.exerciseName}</p>
                            <p className="text-sm text-ink-mid capitalize">{pr.prType} PR</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-brand">
                                <ArrowUp className="w-4 h-4" />
                                <span className="font-bold font-display">
                                    {pr.newValue}
                                    {pr.prType === 'weight' ? ' lbs' : pr.prType === 'volume' ? '' : ' reps'}
                                </span>
                            </div>
                            <p className="text-xs text-ink-low">
                                was {pr.previousValue}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default PRDisplay;
