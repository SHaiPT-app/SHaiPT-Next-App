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
                    className="absolute top-4 right-4 icon-btn"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Share Card Preview */}
                <div
                    ref={cardRef}
                    className="bg-[image:linear-gradient(135deg,var(--surface-0),var(--card))] rounded-2xl border border-line-soft overflow-hidden"
                    style={{ padding: '24px' }}
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-[image:var(--brand-gradient)] shadow-[0_0_24px_var(--brand-glow-soft)] flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">💪</span>
                        </div>
                        <h2 className="font-display text-xl font-bold text-ink-hi">{summary.sessionName}</h2>
                        <p className="text-ink-mid text-sm mt-1">by {userName}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-[var(--surface-2)] border border-line-soft rounded-xl p-3 text-center">
                            <p className="font-display text-2xl font-bold text-brand">
                                {formatDuration(summary.totalDurationSeconds)}
                            </p>
                            <p className="text-xs text-ink-low">Duration</p>
                        </div>
                        <div className="bg-[var(--surface-2)] border border-line-soft rounded-xl p-3 text-center">
                            <p className="font-display text-2xl font-bold text-brand-hot">
                                {summary.totalVolume.toLocaleString()}
                            </p>
                            <p className="text-xs text-ink-low">Volume ({summary.volumeUnit})</p>
                        </div>
                        <div className="bg-[var(--surface-2)] border border-line-soft rounded-xl p-3 text-center">
                            <p className="font-display text-2xl font-bold text-brand">
                                {summary.totalSets}
                            </p>
                            <p className="text-xs text-ink-low">Sets</p>
                        </div>
                        <div className="bg-[var(--surface-2)] border border-line-soft rounded-xl p-3 text-center">
                            <p className="font-display text-2xl font-bold text-brand-hot">
                                {summary.exerciseCount}
                            </p>
                            <p className="text-xs text-ink-low">Exercises</p>
                        </div>
                    </div>

                    {/* PRs */}
                    {summary.prsAchieved.length > 0 && (
                        <div className="bg-[var(--brand-glow-soft)] border border-brand/30 rounded-xl p-3 mb-6">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🏆</span>
                                <span className="text-brand-hot font-bold">
                                    {summary.prsAchieved.length} New PR{summary.prsAchieved.length > 1 ? 's' : ''}!
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-ink-low text-sm">
                            {new Date(summary.completedAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </p>
                        <p className="text-brand text-xs mt-2 font-semibold">
                            Trained with SHaiPT
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="btn-outline flex-1 disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Save
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="btn-brand flex-1"
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
