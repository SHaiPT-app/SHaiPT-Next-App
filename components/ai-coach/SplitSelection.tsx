'use client';

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Check, Star } from 'lucide-react';

export interface SplitOption {
    id: string;
    name: string;
    description: string;
    days_per_week: number;
    recommended: boolean;
}

interface SplitSelectionProps {
    splits: SplitOption[];
    selectedSplit: string | null;
    onSelectSplit: (splitId: string) => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export default function SplitSelection({
    splits,
    selectedSplit,
    onSelectSplit,
    onConfirm,
    isLoading,
}: SplitSelectionProps) {
    return (
        <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="p-4"
            data-testid="split-selection"
        >
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <h3 className="font-display mb-2 text-[0.9rem] font-semibold text-ink-hi">
                    Choose Your Training Split
                </h3>
                <p className="mb-4 text-[0.8rem] text-ink-mid">
                    Based on your profile, here are the best options. Select one to generate your plan.
                </p>

                <div className="flex flex-col items-stretch gap-2">
                    {splits.map((split) => {
                        const isSelected = selectedSplit === split.id;
                        return (
                            <button
                                key={split.id}
                                onClick={() => onSelectSplit(split.id)}
                                data-testid={`split-option-${split.id}`}
                                className={`flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-all duration-200 ${
                                    isSelected
                                        ? 'border-brand bg-[var(--brand-glow-soft)] shadow-[0_0_24px_var(--brand-glow-soft)] ring-1 ring-brand'
                                        : 'border-line-soft bg-[var(--surface-1)] hover:border-line-strong'
                                }`}
                            >
                                {/* Selection indicator */}
                                <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        isSelected
                                            ? 'border-brand bg-[image:var(--brand-gradient)]'
                                            : 'border-line-strong bg-transparent'
                                    }`}
                                >
                                    {isSelected && <Check size={12} className="text-white" />}
                                </span>

                                <span className="flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="text-[0.9rem] font-semibold text-ink-hi">
                                            {split.name}
                                        </span>
                                        {split.recommended && (
                                            <span className="flex items-center gap-[0.2rem] rounded bg-[var(--brand-glow-soft)] px-[0.4rem] py-[0.1rem]">
                                                <Star size={10} className="fill-brand text-brand" />
                                                <span className="text-[0.65rem] font-semibold text-brand">
                                                    Recommended
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-[0.15rem] block text-[0.8rem] text-ink-mid">
                                        {split.description}
                                    </span>
                                    <span className="mt-[0.1rem] block text-[0.7rem] text-ink-low">
                                        {split.days_per_week} days/week
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={onConfirm}
                    disabled={!selectedSplit || isLoading}
                    data-testid="confirm-split-btn"
                    className="btn-brand mt-4 w-full font-display !text-[0.9rem]"
                >
                    {isLoading ? 'Generating Plan...' : 'Generate My Plan'}
                </button>
            </div>
        </motion.div>
    );
}
