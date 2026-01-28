'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, AlertCircle, Calendar, Send } from 'lucide-react';

interface GraceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string, duration: number) => Promise<void>;
}

const GRACE_REASONS = [
    { id: 'illness', label: 'Illness or Injury', icon: '🤒' },
    { id: 'surgery', label: 'Surgery or Medical Procedure', icon: '🏥' },
    { id: 'family', label: 'Family Emergency', icon: '👨‍👩‍👧' },
    { id: 'travel', label: 'Unavoidable Travel', icon: '✈️' },
    { id: 'other', label: 'Other (explain below)', icon: '📝' },
];

const GRACE_DURATIONS = [
    { days: 7, label: '1 Week' },
    { days: 14, label: '2 Weeks' },
    { days: 21, label: '3 Weeks' },
];

export function GraceRequestModal({ isOpen, onClose, onSubmit }: GraceRequestModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState('');
    const [duration, setDuration] = useState(7);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError('Please select a reason');
            return;
        }

        if (selectedReason === 'other' && !customReason.trim()) {
            setError('Please provide details about your situation');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const reason = selectedReason === 'other'
                ? customReason
                : GRACE_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;

            await onSubmit(reason, duration);
            onClose();
        } catch (err) {
            setError('Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        className="w-full max-w-lg max-h-[90vh] bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-bold text-white">Request Grace Period</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                            {/* Info Box */}
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-300">
                                        A grace period pauses your consistency challenge without failing it.
                                        You can only request one grace period per challenge.
                                    </p>
                                </div>
                            </div>

                            {/* Reason Selection */}
                            <div>
                                <label className="text-sm font-medium text-gray-400 mb-3 block">
                                    Reason for Grace Period
                                </label>
                                <div className="space-y-2">
                                    {GRACE_REASONS.map((reason) => (
                                        <button
                                            key={reason.id}
                                            onClick={() => setSelectedReason(reason.id)}
                                            className={`
                                                w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors
                                                ${selectedReason === reason.id
                                                    ? 'bg-blue-500/20 border border-blue-500/30'
                                                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                                }
                                            `}
                                        >
                                            <span className="text-xl">{reason.icon}</span>
                                            <span className={selectedReason === reason.id ? 'text-blue-400' : 'text-gray-300'}>
                                                {reason.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Reason (if "Other" selected) */}
                            {selectedReason === 'other' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                >
                                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                                        Please explain your situation
                                    </label>
                                    <textarea
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        placeholder="Briefly describe why you need a grace period..."
                                        rows={3}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
                                    />
                                </motion.div>
                            )}

                            {/* Duration Selection */}
                            <div>
                                <label className="text-sm font-medium text-gray-400 mb-3 block flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    How long do you need?
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {GRACE_DURATIONS.map((option) => (
                                        <button
                                            key={option.days}
                                            onClick={() => setDuration(option.days)}
                                            className={`
                                                py-3 px-4 rounded-xl text-center font-medium transition-colors
                                                ${duration === option.days
                                                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                                                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                                                }
                                            `}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <span className="text-sm text-red-400">{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-800 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !selectedReason}
                                className="flex-1 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default GraceRequestModal;
