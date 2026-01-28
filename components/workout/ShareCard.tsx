'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Check } from 'lucide-react';
import type { WorkoutSummaryData } from '@/lib/types';

interface ShareCardProps {
    summary: WorkoutSummaryData;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareCard({ summary, userName, isOpen, onClose }: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Format duration
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.95,
                pixelRatio: 2,
            });

            const link = document.createElement('a');
            link.download = `workout-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.95,
                pixelRatio: 2,
            });

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'workout.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Workout Complete!',
                    text: `Just crushed my ${summary.sessionName} workout!`,
                });
            } else if (navigator.clipboard) {
                // Fallback: copy image to clipboard if supported
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob }),
                ]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (error) {
            console.error('Failed to share:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Share Card Preview */}
                <div
                    ref={cardRef}
                    className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl overflow-hidden"
                    style={{ padding: '24px' }}
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">💪</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">{summary.sessionName}</h2>
                        <p className="text-gray-400 text-sm mt-1">by {userName}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-cyan-400">
                                {formatDuration(summary.totalDurationSeconds)}
                            </p>
                            <p className="text-xs text-gray-500">Duration</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-400">
                                {summary.totalVolume.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Volume ({summary.volumeUnit})</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400">
                                {summary.totalSets}
                            </p>
                            <p className="text-xs text-gray-500">Sets</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-purple-400">
                                {summary.exerciseCount}
                            </p>
                            <p className="text-xs text-gray-500">Exercises</p>
                        </div>
                    </div>

                    {/* PRs */}
                    {summary.prsAchieved.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🏆</span>
                                <span className="text-yellow-400 font-bold">
                                    {summary.prsAchieved.length} New PR{summary.prsAchieved.length > 1 ? 's' : ''}!
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">
                            {new Date(summary.completedAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </p>
                        <p className="text-cyan-400 text-xs mt-2 font-medium">
                            Trained with SHaiPT
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Save
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Share2 className="w-5 h-5" />
                                Share
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default ShareCard;
