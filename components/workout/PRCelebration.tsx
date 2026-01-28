'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Trophy, X, Share2 } from 'lucide-react';
import type { WorkoutPRSummary } from '@/lib/types';

interface PRCelebrationProps {
    prs: WorkoutPRSummary[];
    isOpen: boolean;
    onClose: () => void;
    onShare?: () => void;
}

export function PRCelebration({ prs, isOpen, onClose, onShare }: PRCelebrationProps) {
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });

            const handleResize = () => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (prs.length === 0) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    {/* Confetti */}
                    {showConfetti && (
                        <Confetti
                            width={windowSize.width}
                            height={windowSize.height}
                            recycle={false}
                            numberOfPieces={200}
                            colors={['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7']}
                        />
                    )}

                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.5, y: 50 }}
                        className="w-full max-w-md mx-4"
                    >
                        {/* Trophy Animation */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="flex justify-center mb-6"
                        >
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                        </motion.div>

                        {/* Content */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                            <div className="p-6 text-center">
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-2xl font-bold text-white mb-2"
                                >
                                    New Personal Record{prs.length > 1 ? 's' : ''}!
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-gray-400"
                                >
                                    You crushed it today!
                                </motion.p>
                            </div>

                            <div className="px-6 pb-6 space-y-3">
                                {prs.map((pr, index) => (
                                    <motion.div
                                        key={`${pr.exerciseId}-${pr.prType}`}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30"
                                    >
                                        <div>
                                            <p className="font-semibold text-white">{pr.exerciseName}</p>
                                            <p className="text-sm text-yellow-400 capitalize">{pr.prType} PR</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-yellow-400">
                                                {pr.newValue}
                                                <span className="text-sm ml-1">
                                                    {pr.prType === 'weight' ? 'lbs' : pr.prType === 'reps' ? 'reps' : ''}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                +{Math.round(((pr.newValue - pr.previousValue) / pr.previousValue) * 100)}% from {pr.previousValue}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-gray-800 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium"
                                >
                                    Continue
                                </button>
                                {onShare && (
                                    <button
                                        onClick={onShare}
                                        className="flex-1 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium flex items-center justify-center gap-2"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default PRCelebration;
