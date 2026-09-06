'use client';

import { motion } from 'framer-motion';
import { Check, Trash2, Edit2, Trophy } from 'lucide-react';
import type { EnhancedLoggedSet, SessionSet } from '@/lib/types';

interface SetCardProps {
    setNumber: number;
    loggedSet?: EnhancedLoggedSet;
    targetSet?: SessionSet;
    isCompleted: boolean;
    isPR?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    compact?: boolean;
}

export function SetCard({
    setNumber,
    loggedSet,
    targetSet,
    isCompleted,
    isPR = false,
    onEdit,
    onDelete,
    compact = false,
}: SetCardProps) {
    // Format intensifier label
    const getIntensifierLabel = (intensifier: string) => {
        switch (intensifier) {
            case 'dropset':
                return 'Drop Set';
            case 'rest_pause':
                return 'Rest-Pause';
            case 'cluster':
                return 'Cluster';
            case 'superset':
                return 'Superset';
            default:
                return null;
        }
    };

    if (compact) {
        return (
            <div
                className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    ${isCompleted
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-[var(--surface-1)] border border-line-soft'
                    }
                `}
            >
                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${loggedSet?.set_type === 'warmup'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : isCompleted
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-[var(--surface-2)] text-ink-mid'
                    }
                `}>
                    {loggedSet?.set_type === 'warmup' ? 'W' : setNumber}
                </div>

                {loggedSet ? (
                    <div className="flex-1 flex items-center gap-4 text-sm">
                        <span className="text-ink-hi font-medium">
                            {loggedSet.weight} {loggedSet.weight_unit}
                        </span>
                        <span className="text-ink-mid">
                            {loggedSet.reps} reps
                        </span>
                        {loggedSet.rpe && (
                            <span className="text-brand text-xs">
                                RPE {loggedSet.rpe}
                            </span>
                        )}
                        {isPR && (
                            <Trophy className="w-4 h-4 text-brand-hot" />
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center gap-4 text-sm text-ink-low">
                        <span>{targetSet?.weight || '--'}</span>
                        <span>{targetSet?.reps || '--'} reps</span>
                    </div>
                )}

                {isCompleted && <Check className="w-4 h-4 text-green-400" />}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative rounded-xl overflow-hidden
                ${isCompleted
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-[var(--surface-1)] border border-line-soft'
                }
            `}
        >
            {/* Set Type Badge */}
            {loggedSet?.set_type === 'warmup' && (
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-bl-lg">
                    Warmup
                </div>
            )}

            {/* Intensifier Badge */}
            {loggedSet?.intensifier && loggedSet.intensifier !== 'none' && (
                <div className="absolute top-0 left-0 px-2 py-0.5 bg-[var(--brand-glow-soft)] text-brand text-xs rounded-br-lg">
                    {getIntensifierLabel(loggedSet.intensifier)}
                </div>
            )}

            <div className="p-4">
                <div className="flex items-center justify-between">
                    {/* Set Number */}
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                            ${isCompleted
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-[var(--surface-2)] text-ink-mid'
                            }
                        `}>
                            {setNumber}
                        </div>

                        {loggedSet ? (
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-ink-hi">
                                        {loggedSet.weight}
                                        <span className="text-sm text-ink-mid ml-1">
                                            {loggedSet.weight_unit}
                                        </span>
                                    </span>
                                    <span className="text-ink-low">×</span>
                                    <span className="text-xl font-bold text-ink-hi">
                                        {loggedSet.reps}
                                        <span className="text-sm text-ink-mid ml-1">reps</span>
                                    </span>
                                    {isPR && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-glow-soft)]">
                                            <Trophy className="w-3 h-3 text-brand-hot" />
                                            <span className="text-xs text-brand-hot font-medium">PR!</span>
                                        </div>
                                    )}
                                </div>
                                {loggedSet.rpe && (
                                    <span className="text-sm text-brand">
                                        RPE {loggedSet.rpe}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="text-ink-low">
                                <span className="text-lg">
                                    {targetSet?.weight || '--'} × {targetSet?.reps || '--'}
                                </span>
                                <span className="text-sm ml-2">target</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"
                            >
                                <Check className="w-5 h-5 text-green-400" />
                            </motion.div>
                        )}

                        {loggedSet && onEdit && (
                            <button
                                onClick={onEdit}
                                className="p-2 rounded-lg text-ink-low hover:text-ink-hi hover:bg-[var(--surface-2)]"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}

                        {loggedSet && onDelete && (
                            <button
                                onClick={onDelete}
                                className="p-2 rounded-lg text-ink-low hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Drop Set Info */}
                {loggedSet?.drops && loggedSet.drops.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line-soft">
                        <span className="text-xs text-ink-low mb-2 block">Drop Sets:</span>
                        <div className="flex flex-wrap gap-2">
                            {loggedSet.drops.map((drop, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 rounded bg-[var(--brand-glow-soft)] text-brand text-sm"
                                >
                                    {drop.weight} × {drop.reps}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {loggedSet?.notes && (
                    <div className="mt-3 pt-3 border-t border-line-soft">
                        <p className="text-sm text-ink-mid">{loggedSet.notes}</p>
                    </div>
                )}

                {/* Rest Time */}
                {loggedSet?.actual_rest_seconds && (
                    <div className="mt-2 text-xs text-ink-low">
                        Rest: {Math.floor(loggedSet.actual_rest_seconds / 60)}:{(loggedSet.actual_rest_seconds % 60).toString().padStart(2, '0')}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default SetCard;
