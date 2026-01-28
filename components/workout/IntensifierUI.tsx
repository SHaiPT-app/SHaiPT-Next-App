'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check, Trash2 } from 'lucide-react';
import type { IntensifierType, DropSetData, ClusterRestData, EnhancedLoggedSet } from '@/lib/types';

interface IntensifierUIProps {
    type: IntensifierType;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (setData: Partial<EnhancedLoggedSet>) => void;
    baseWeight: number;
    baseReps: number;
    weightUnit: 'lbs' | 'kg';
    exercises?: Array<{ id: string; name: string }>; // For superset selection
}

export function IntensifierUI({
    type,
    isOpen,
    onClose,
    onSubmit,
    baseWeight,
    baseReps,
    weightUnit,
    exercises = [],
}: IntensifierUIProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="w-full max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 overflow-hidden"
                    >
                        {type === 'dropset' && (
                            <DropSetUI
                                onClose={onClose}
                                onSubmit={onSubmit}
                                baseWeight={baseWeight}
                                baseReps={baseReps}
                                weightUnit={weightUnit}
                            />
                        )}
                        {type === 'rest_pause' && (
                            <RestPauseUI
                                onClose={onClose}
                                onSubmit={onSubmit}
                                baseWeight={baseWeight}
                                baseReps={baseReps}
                                weightUnit={weightUnit}
                            />
                        )}
                        {type === 'cluster' && (
                            <ClusterSetUI
                                onClose={onClose}
                                onSubmit={onSubmit}
                                baseWeight={baseWeight}
                                baseReps={baseReps}
                                weightUnit={weightUnit}
                            />
                        )}
                        {type === 'superset' && (
                            <SupersetUI
                                onClose={onClose}
                                onSubmit={onSubmit}
                                exercises={exercises}
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Drop Set UI
function DropSetUI({
    onClose,
    onSubmit,
    baseWeight,
    baseReps,
    weightUnit,
}: {
    onClose: () => void;
    onSubmit: (data: Partial<EnhancedLoggedSet>) => void;
    baseWeight: number;
    baseReps: number;
    weightUnit: 'lbs' | 'kg';
}) {
    const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;
    const [firstSet, setFirstSet] = useState({ weight: baseWeight, reps: baseReps });
    const [drops, setDrops] = useState<DropSetData[]>([
        { weight: Math.max(0, baseWeight - weightIncrement * 4), reps: baseReps },
    ]);

    const addDrop = () => {
        const lastDrop = drops[drops.length - 1];
        setDrops([...drops, {
            weight: Math.max(0, lastDrop.weight - weightIncrement * 2),
            reps: lastDrop.reps,
        }]);
    };

    const removeDrop = (index: number) => {
        setDrops(drops.filter((_, i) => i !== index));
    };

    const updateDrop = (index: number, field: 'weight' | 'reps', delta: number) => {
        const updated = [...drops];
        updated[index] = {
            ...updated[index],
            [field]: Math.max(0, updated[index][field] + delta),
        };
        setDrops(updated);
    };

    const handleSubmit = () => {
        onSubmit({
            weight: firstSet.weight,
            reps: firstSet.reps,
            weight_unit: weightUnit,
            intensifier: 'dropset',
            drops,
        });
        onClose();
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">⬇️</span>
                    Drop Set
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-400">
                    Perform the first set, then immediately reduce weight and continue with minimal rest.
                </p>

                {/* First Set */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">First Set</h4>
                    <div className="flex items-center gap-4">
                        <SetInputGroup
                            label="Weight"
                            value={firstSet.weight}
                            unit={weightUnit}
                            onChange={(delta) => setFirstSet({ ...firstSet, weight: Math.max(0, firstSet.weight + delta) })}
                            increment={weightIncrement}
                        />
                        <SetInputGroup
                            label="Reps"
                            value={firstSet.reps}
                            onChange={(delta) => setFirstSet({ ...firstSet, reps: Math.max(0, firstSet.reps + delta) })}
                        />
                    </div>
                </div>

                {/* Drop Sets */}
                {drops.map((drop, index) => (
                    <div key={index} className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-purple-400">Drop {index + 1}</h4>
                            <button
                                onClick={() => removeDrop(index)}
                                className="p-1 rounded text-gray-500 hover:text-red-400"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <SetInputGroup
                                label="Weight"
                                value={drop.weight}
                                unit={weightUnit}
                                onChange={(delta) => updateDrop(index, 'weight', delta)}
                                increment={weightIncrement}
                            />
                            <SetInputGroup
                                label="Reps"
                                value={drop.reps}
                                onChange={(delta) => updateDrop(index, 'reps', delta)}
                            />
                        </div>
                    </div>
                ))}

                <button
                    onClick={addDrop}
                    className="w-full py-2.5 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Drop
                </button>
            </div>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleSubmit}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    Log Drop Set
                </button>
            </div>
        </>
    );
}

// Rest-Pause UI
function RestPauseUI({
    onClose,
    onSubmit,
    baseWeight,
    baseReps,
    weightUnit,
}: {
    onClose: () => void;
    onSubmit: (data: Partial<EnhancedLoggedSet>) => void;
    baseWeight: number;
    baseReps: number;
    weightUnit: 'lbs' | 'kg';
}) {
    const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;
    const [weight, setWeight] = useState(baseWeight);
    const [segments, setSegments] = useState([{ reps: baseReps }, { reps: Math.floor(baseReps / 2) }]);
    const [restBetween, setRestBetween] = useState(15);

    const addSegment = () => {
        const lastSegment = segments[segments.length - 1];
        setSegments([...segments, { reps: Math.max(1, Math.floor(lastSegment.reps / 2)) }]);
    };

    const handleSubmit = () => {
        const totalReps = segments.reduce((sum, s) => sum + s.reps, 0);
        onSubmit({
            weight,
            reps: totalReps,
            weight_unit: weightUnit,
            intensifier: 'rest_pause',
            cluster_rests: segments.slice(1).map(() => ({ duration_seconds: restBetween })),
        });
        onClose();
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">⏸️</span>
                    Rest-Pause Set
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-400">
                    Hit failure, rest 10-20 seconds, then continue with the same weight until failure again.
                </p>

                {/* Weight */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <SetInputGroup
                        label="Weight"
                        value={weight}
                        unit={weightUnit}
                        onChange={(delta) => setWeight(Math.max(0, weight + delta))}
                        increment={weightIncrement}
                    />
                </div>

                {/* Rest Between */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Rest Between Segments</h4>
                    <div className="flex gap-2">
                        {[10, 15, 20, 30].map((seconds) => (
                            <button
                                key={seconds}
                                onClick={() => setRestBetween(seconds)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                                    restBetween === seconds
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-gray-700 text-gray-400'
                                }`}
                            >
                                {seconds}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* Segments */}
                {segments.map((segment, index) => (
                    <div key={index} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-orange-400">
                                {index === 0 ? 'Initial' : `After ${restBetween}s rest`}
                            </h4>
                            {index > 0 && (
                                <button
                                    onClick={() => setSegments(segments.filter((_, i) => i !== index))}
                                    className="p-1 rounded text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <SetInputGroup
                            label="Reps"
                            value={segment.reps}
                            onChange={(delta) => {
                                const updated = [...segments];
                                updated[index] = { reps: Math.max(0, segment.reps + delta) };
                                setSegments(updated);
                            }}
                        />
                    </div>
                ))}

                <button
                    onClick={addSegment}
                    className="w-full py-2.5 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Segment
                </button>
            </div>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleSubmit}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    Log Rest-Pause Set ({segments.reduce((s, seg) => s + seg.reps, 0)} total reps)
                </button>
            </div>
        </>
    );
}

// Cluster Set UI
function ClusterSetUI({
    onClose,
    onSubmit,
    baseWeight,
    baseReps,
    weightUnit,
}: {
    onClose: () => void;
    onSubmit: (data: Partial<EnhancedLoggedSet>) => void;
    baseWeight: number;
    baseReps: number;
    weightUnit: 'lbs' | 'kg';
}) {
    const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;
    const [weight, setWeight] = useState(baseWeight);
    const [clusters, setClusters] = useState([{ reps: 3 }, { reps: 3 }, { reps: 3 }]);
    const [restBetween, setRestBetween] = useState(20);

    const handleSubmit = () => {
        const totalReps = clusters.reduce((sum, c) => sum + c.reps, 0);
        onSubmit({
            weight,
            reps: totalReps,
            weight_unit: weightUnit,
            intensifier: 'cluster',
            cluster_rests: clusters.slice(1).map(() => ({ duration_seconds: restBetween })),
        });
        onClose();
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    Cluster Set
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-400">
                    Break a heavy set into mini-sets with short inter-set rests. Great for strength work.
                </p>

                {/* Weight */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <SetInputGroup
                        label="Weight"
                        value={weight}
                        unit={weightUnit}
                        onChange={(delta) => setWeight(Math.max(0, weight + delta))}
                        increment={weightIncrement}
                    />
                </div>

                {/* Rest Between */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Inter-Cluster Rest</h4>
                    <div className="flex gap-2">
                        {[15, 20, 30, 45].map((seconds) => (
                            <button
                                key={seconds}
                                onClick={() => setRestBetween(seconds)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                                    restBetween === seconds
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-gray-700 text-gray-400'
                                }`}
                            >
                                {seconds}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clusters */}
                <div className="flex flex-wrap gap-2">
                    {clusters.map((cluster, index) => (
                        <div
                            key={index}
                            className="flex-1 min-w-[100px] bg-blue-500/10 border border-blue-500/30 rounded-xl p-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-blue-400">Cluster {index + 1}</span>
                                {clusters.length > 2 && (
                                    <button
                                        onClick={() => setClusters(clusters.filter((_, i) => i !== index))}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => {
                                        const updated = [...clusters];
                                        updated[index] = { reps: Math.max(1, cluster.reps - 1) };
                                        setClusters(updated);
                                    }}
                                    className="w-8 h-8 rounded bg-gray-700 text-gray-400"
                                >
                                    <Minus className="w-4 h-4 mx-auto" />
                                </button>
                                <span className="text-xl font-bold text-white w-8 text-center">{cluster.reps}</span>
                                <button
                                    onClick={() => {
                                        const updated = [...clusters];
                                        updated[index] = { reps: cluster.reps + 1 };
                                        setClusters(updated);
                                    }}
                                    className="w-8 h-8 rounded bg-gray-700 text-gray-400"
                                >
                                    <Plus className="w-4 h-4 mx-auto" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setClusters([...clusters, { reps: 3 }])}
                        className="w-[100px] h-full min-h-[80px] rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-600 flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleSubmit}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    Log Cluster Set ({clusters.reduce((s, c) => s + c.reps, 0)} total reps)
                </button>
            </div>
        </>
    );
}

// Superset UI
function SupersetUI({
    onClose,
    onSubmit,
    exercises,
}: {
    onClose: () => void;
    onSubmit: (data: Partial<EnhancedLoggedSet>) => void;
    exercises: Array<{ id: string; name: string }>;
}) {
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

    const handleSubmit = () => {
        if (selectedExercise) {
            onSubmit({
                intensifier: 'superset',
                superset_partner_exercise_id: selectedExercise,
            });
            onClose();
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🔄</span>
                    Superset
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-400">
                    Pair this exercise with another for back-to-back sets with no rest between exercises.
                </p>

                <div className="space-y-2">
                    {exercises.map((exercise) => (
                        <button
                            key={exercise.id}
                            onClick={() => setSelectedExercise(exercise.id)}
                            className={`w-full p-3 rounded-xl text-left transition-colors ${
                                selectedExercise === exercise.id
                                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {exercise.name}
                        </button>
                    ))}
                </div>

                {exercises.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No other exercises in this workout to pair with.
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedExercise}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Check className="w-5 h-5" />
                    Create Superset
                </button>
            </div>
        </>
    );
}

// Reusable input group component
function SetInputGroup({
    label,
    value,
    unit,
    onChange,
    increment = 1,
}: {
    label: string;
    value: number;
    unit?: string;
    onChange: (delta: number) => void;
    increment?: number;
}) {
    return (
        <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">{label}</label>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(-increment)}
                    className="w-10 h-10 rounded-lg bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                    <span className="text-xl font-bold text-white">{value}</span>
                    {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
                </div>
                <button
                    onClick={() => onChange(increment)}
                    className="w-10 h-10 rounded-lg bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default IntensifierUI;
