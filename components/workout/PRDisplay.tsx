'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ArrowUp } from 'lucide-react';
import type { WorkoutPRSummary } from '@/lib/types';

interface PRDisplayProps {
    prs: WorkoutPRSummary[];
    compact?: boolean;
}

export function PRDisplay({ prs, compact = false }: PRDisplayProps) {
    if (prs.length === 0) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">
                    {prs.length} PR{prs.length > 1 ? 's' : ''} achieved!
                </span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-yellow-400">Personal Records</h3>
            </div>

            <div className="space-y-3">
                {prs.map((pr, index) => (
                    <motion.div
                        key={`${pr.exerciseId}-${pr.prType}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                    >
                        <div>
                            <p className="font-medium text-white">{pr.exerciseName}</p>
                            <p className="text-sm text-gray-400 capitalize">{pr.prType} PR</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="font-bold">
                                    {pr.newValue}
                                    {pr.prType === 'weight' ? ' lbs' : pr.prType === 'volume' ? '' : ' reps'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
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
