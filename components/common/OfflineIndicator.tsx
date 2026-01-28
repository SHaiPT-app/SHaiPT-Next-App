'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOfflineStore, initOnlineStatusListener } from '@/stores/offlineStore';

interface OfflineIndicatorProps {
    position?: 'top' | 'bottom';
    showWhenOnline?: boolean;
}

export function OfflineIndicator({
    position = 'top',
    showWhenOnline = false,
}: OfflineIndicatorProps) {
    const { status } = useOfflineStore();

    // Initialize online status listener
    useEffect(() => {
        const cleanup = initOnlineStatusListener();
        return cleanup;
    }, []);

    // Determine what to show
    const showIndicator = !status.isOnline ||
        status.isSyncing ||
        (showWhenOnline && status.pendingActionsCount > 0);

    const positionClasses = position === 'top'
        ? 'top-0 left-0 right-0'
        : 'bottom-16 md:bottom-0 left-0 right-0';

    return (
        <AnimatePresence>
            {showIndicator && (
                <motion.div
                    initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
                    className={`fixed ${positionClasses} z-50 px-4 py-2`}
                >
                    {!status.isOnline ? (
                        <OfflineBar pendingCount={status.pendingActionsCount} />
                    ) : status.isSyncing ? (
                        <SyncingBar />
                    ) : status.pendingActionsCount > 0 ? (
                        <PendingBar count={status.pendingActionsCount} />
                    ) : null}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function OfflineBar({ pendingCount }: { pendingCount: number }) {
    return (
        <div className="flex items-center justify-center gap-3 py-2 px-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">
                You're offline
                {pendingCount > 0 && ` · ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending`}
            </span>
        </div>
    );
}

function SyncingBar() {
    return (
        <div className="flex items-center justify-center gap-3 py-2 px-4 bg-cyan-500/20 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-cyan-400">Syncing changes...</span>
        </div>
    );
}

function PendingBar({ count }: { count: number }) {
    const { status } = useOfflineStore();

    return (
        <div className="flex items-center justify-center gap-3 py-2 px-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">
                {count} change{count > 1 ? 's' : ''} waiting to sync
            </span>
        </div>
    );
}

// Compact version for use in headers/footers
export function OfflineIndicatorCompact() {
    const { status } = useOfflineStore();

    useEffect(() => {
        const cleanup = initOnlineStatusListener();
        return cleanup;
    }, []);

    if (status.isOnline && !status.isSyncing && status.pendingActionsCount === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            {!status.isOnline ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/20">
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400">Offline</span>
                </div>
            ) : status.isSyncing ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/20">
                    <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span className="text-xs text-cyan-400">Syncing</span>
                </div>
            ) : status.pendingActionsCount > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/20">
                    <AlertCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">{status.pendingActionsCount}</span>
                </div>
            ) : null}
        </div>
    );
}

export default OfflineIndicator;
