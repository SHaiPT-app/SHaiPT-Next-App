'use client';

import { useEffect, useCallback } from 'react';
import { useOfflineStore, initOnlineStatusListener } from '@/stores/offlineStore';
import { syncManager } from '@/lib/syncManager';
import { initDB } from '@/lib/offlineDb';

export function useOfflineSync() {
    const { status, setOnlineStatus, clearSyncedActions } = useOfflineStore();

    // Initialize on mount
    useEffect(() => {
        // Initialize IndexedDB
        initDB().catch(console.error);

        // Initialize online status listener
        const cleanup = initOnlineStatusListener();

        // Initialize sync manager
        syncManager.initialize().catch(console.error);

        return cleanup;
    }, []);

    // Sync when coming online
    useEffect(() => {
        if (status.isOnline && status.pendingActionsCount > 0) {
            syncManager.syncAll().then(({ success, failed }) => {
                if (success > 0) {
                    console.log(`Synced ${success} actions`);
                }
                if (failed > 0) {
                    console.warn(`Failed to sync ${failed} actions`);
                }
            });
        }
    }, [status.isOnline, status.pendingActionsCount]);

    // Manual sync function
    const sync = useCallback(async () => {
        if (!status.isOnline) {
            return { success: 0, failed: 0, error: 'Offline' };
        }

        return syncManager.syncAll();
    }, [status.isOnline]);

    // Clear all synced actions
    const clearSynced = useCallback(() => {
        clearSyncedActions();
    }, [clearSyncedActions]);

    return {
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        pendingCount: status.pendingActionsCount,
        lastSyncedAt: status.lastSyncedAt,
        sync,
        clearSynced,
    };
}

export default useOfflineSync;
