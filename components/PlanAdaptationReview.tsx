'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlanAdaptationResponse, PlanAdaptationRecommendation, AdaptationType } from '@/lib/types';

interface PlanAdaptationReviewProps {
    adaptation: PlanAdaptationResponse;
    onAccept: (accepted: PlanAdaptationRecommendation[]) => void;
    onDismiss: () => void;
    loading?: boolean;
}

const TYPE_LABELS: Record<AdaptationType, string> = {
    weight_progression: 'Weight Progression',
    exercise_substitution: 'Exercise Substitution',
    volume_adjustment: 'Volume Adjustment',
    deload_recommendation: 'Deload',
};

const TYPE_COLORS: Record<AdaptationType, string> = {
    weight_progression: '#39ff14',
    exercise_substitution: '#ff9f43',
    volume_adjustment: '#54a0ff',
    deload_recommendation: '#ff6b6b',
};

export default function PlanAdaptationReview({
    adaptation,
    onAccept,
    onDismiss,
    loading,
}: PlanAdaptationReviewProps) {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
        () => new Set(adaptation.recommendations.map((_, i) => i))
    );

    const toggleRecommendation = (index: number) => {
        setSelectedIndices((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleApply = () => {
        const accepted = adaptation.recommendations.filter((_, i) => selectedIndices.has(i));
        onAccept(accepted);
    };

    if (adaptation.recommendations.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: '1.25rem', border: '1px solid rgba(57, 255, 20, 0.15)' }}
            >
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    {adaptation.summary || 'Your performance is tracking well. No plan changes recommended at this time.'}
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gap: '1rem' }}
        >
            {/* Summary */}
            <div
                className="glass-panel"
                style={{ padding: '1.25rem', border: '1px solid rgba(57, 255, 20, 0.15)' }}
            >
                <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {adaptation.summary}
                </p>
            </div>

            {/* Recommendations */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
                <AnimatePresence>
                    {adaptation.recommendations.map((rec, index) => {
                        const selected = selectedIndices.has(index);
                        const color = TYPE_COLORS[rec.type];

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => toggleRecommendation(index)}
                                className="glass-panel"
                                style={{
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    border: `1px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
                                    opacity: selected ? 1 : 0.6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '0.5rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {/* Checkbox */}
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '4px',
                                            border: `2px solid ${selected ? color : '#555'}`,
                                            background: selected ? color : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 0.2s',
                                        }}>
                                            {selected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: 600,
                                        }}>
                                            {TYPE_LABELS[rec.type]}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                    {rec.exercise_name}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.85rem',
                                }}>
                                    <span style={{ color: '#888' }}>{rec.current_value}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                    <span style={{ color, fontWeight: 600 }}>
                                        {rec.type === 'exercise_substitution' && rec.substitute_exercise_name
                                            ? rec.substitute_exercise_name
                                            : rec.recommended_value}
                                    </span>
                                </div>

                                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                                    {rec.rationale}
                                </p>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Overall Assessment */}
            {adaptation.overall_assessment && (
                <div
                    className="glass-panel"
                    style={{
                        padding: '1rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#39ff14',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                    }}>
                        Overall Assessment
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                        {adaptation.overall_assessment}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={onDismiss}
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '0.85rem',
                        background: 'transparent',
                        color: '#888',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    Dismiss
                </button>
                <button
                    onClick={handleApply}
                    disabled={loading || selectedIndices.size === 0}
                    style={{
                        flex: 2,
                        padding: '0.85rem',
                        background: loading || selectedIndices.size === 0 ? '#333' : '#39ff14',
                        color: loading || selectedIndices.size === 0 ? '#666' : '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: loading || selectedIndices.size === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? 'Applying...' : `Apply ${selectedIndices.size} Change${selectedIndices.size !== 1 ? 's' : ''}`}
                </button>
            </div>
        </motion.div>
    );
}
