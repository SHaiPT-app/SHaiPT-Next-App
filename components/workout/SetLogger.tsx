'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Check, ChevronDown, Zap } from 'lucide-react';
import type { EnhancedLoggedSet, SessionSet, IntensifierType, SetType } from '@/lib/types';

interface SetLoggerProps {
    setNumber: number;
    targetSet?: SessionSet;
    previousSet?: EnhancedLoggedSet;
    weightUnit: 'lbs' | 'kg';
    onLogSet: (set: Omit<EnhancedLoggedSet, 'set_number' | 'started_at' | 'completed_at'>) => void;
    onShowIntensifier: (type: IntensifierType) => void;
}

export function SetLogger({
    setNumber,
    targetSet,
    previousSet,
    weightUnit,
    onLogSet,
    onShowIntensifier,
}: SetLoggerProps) {
    // Initialize with target or previous values
    const [weight, setWeight] = useState<number>(() => {
        if (previousSet) return previousSet.weight;
        if (targetSet?.weight) return parseFloat(targetSet.weight) || 0;
        return 0;
    });

    const [reps, setReps] = useState<number>(() => {
        if (previousSet) return previousSet.reps;
        if (targetSet?.reps) {
            const parsed = parseInt(targetSet.reps);
            return isNaN(parsed) ? 10 : parsed;
        }
        return 10;
    });

    const [rpe, setRpe] = useState<number | null>(null);

    // Reset state when set number changes (Bug 18 fix)
    const prevSetNumberRef = useRef(setNumber);
    useEffect(() => {
        if (prevSetNumberRef.current !== setNumber) {
            prevSetNumberRef.current = setNumber;
            // Reset to previous set values or target
            if (previousSet) {
                setWeight(previousSet.weight);
                setReps(previousSet.reps);
            } else if (targetSet) {
                setWeight(parseFloat(targetSet.weight ?? '0') || 0);
                const parsed = parseInt(targetSet.reps ?? '10');
                setReps(isNaN(parsed) ? 10 : parsed);
            }
            setRpe(null);
            setShowRpeSelector(false);
        }
    }, [setNumber, previousSet, targetSet]);
    const [setType, setSetType] = useState<SetType>('working');
    const [showRpeSelector, setShowRpeSelector] = useState(false);
    const [showIntensifierMenu, setShowIntensifierMenu] = useState(false);

    // Weight adjustment increments based on unit
    const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;

    const handleWeightChange = (delta: number) => {
        setWeight(prev => Math.max(0, prev + delta));
    };

    const handleRepsChange = (delta: number) => {
        setReps(prev => Math.max(0, prev + delta));
    };

    const handleSubmit = () => {
        onLogSet({
            reps,
            weight,
            weight_unit: weightUnit,
            set_type: setType,
            intensifier: 'none',
            rpe: rpe ?? undefined,
        });

        // Reset for next set
        setRpe(null);
        setShowRpeSelector(false);
    };

    const intensifierOptions: { type: IntensifierType; label: string; icon: string }[] = [
        { type: 'dropset', label: 'Drop Set', icon: '⬇️' },
        { type: 'rest_pause', label: 'Rest-Pause', icon: '⏸️' },
        { type: 'cluster', label: 'Cluster Set', icon: '🔗' },
        { type: 'superset', label: 'Superset', icon: '🔄' },
    ];

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
            {/* Header with Set Type Toggle */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">Set {setNumber}</span>
                    <button
                        onClick={() => setSetType(setType === 'working' ? 'warmup' : 'working')}
                        className={`
                            px-2 py-0.5 rounded text-xs font-medium transition-colors
                            ${setType === 'warmup'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                            }
                        `}
                    >
                        {setType === 'warmup' ? 'Warmup' : 'Mark Warmup'}
                    </button>
                </div>

                {/* Intensifier Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowIntensifierMenu(!showIntensifierMenu)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30"
                    >
                        <Zap className="w-4 h-4" />
                        <span>Intensifier</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {showIntensifierMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-10"
                        >
                            {intensifierOptions.map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => {
                                        setShowIntensifierMenu(false);
                                        onShowIntensifier(option.type);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                                >
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Target Reference */}
            {targetSet && (
                <div className="mb-4 px-3 py-2 bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-500">Target: </span>
                    <span className="text-sm text-gray-400">
                        {targetSet.weight || '--'} × {targetSet.reps || '--'}
                    </span>
                </div>
            )}

            {/* Weight Input */}
            <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Weight ({weightUnit})</label>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleWeightChange(-weightIncrement)}
                        className="w-12 h-12 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center"
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                        className="flex-1 h-12 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-bold text-white focus:outline-none focus:border-cyan-500"
                    />

                    <button
                        onClick={() => handleWeightChange(weightIncrement)}
                        className="w-12 h-12 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Reps Input */}
            <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Reps</label>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleRepsChange(-1)}
                        className="w-12 h-12 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center"
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <input
                        type="number"
                        value={reps}
                        onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                        className="flex-1 h-12 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-bold text-white focus:outline-none focus:border-cyan-500"
                    />

                    <button
                        onClick={() => handleRepsChange(1)}
                        className="w-12 h-12 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* RPE Selector */}
            <div className="mb-4">
                <button
                    onClick={() => setShowRpeSelector(!showRpeSelector)}
                    className="text-sm text-gray-400 mb-2 flex items-center gap-1 hover:text-gray-200"
                >
                    RPE (optional)
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRpeSelector ? 'rotate-180' : ''}`} />
                </button>

                {showRpeSelector && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-wrap gap-2"
                    >
                        {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((value) => (
                            <button
                                key={value}
                                onClick={() => setRpe(value)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                    ${rpe === value
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }
                                `}
                            >
                                {value}
                            </button>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Submit Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={weight < 0 || reps <= 0}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium
                         flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg shadow-cyan-500/20"
            >
                <Check className="w-5 h-5" />
                Log Set
            </motion.button>
        </div>
    );
}

export default SetLogger;
