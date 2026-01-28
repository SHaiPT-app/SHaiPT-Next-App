import { offlineActions, workoutDrafts } from './offlineDb';
import { useOfflineStore } from '@/stores/offlineStore';
import type { OfflineAction, OfflineActionType } from './types';

// API endpoint handlers for each action type
const actionHandlers: Record<OfflineActionType, (payload: any) => Promise<any>> = {
    create_workout_log: async (payload) => {
        const response = await fetch('/api/workout/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create workout log');
        return response.json();
    },

    log_set: async (payload) => {
        const { logId, ...setData } = payload;
        const response = await fetch(`/api/workout/${logId}/set`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setData),
        });
        if (!response.ok) throw new Error('Failed to log set');
        return response.json();
    },

    update_exercise_log: async (payload) => {
        const { logId, exerciseLogId, ...data } = payload;
        const response = await fetch(`/api/workout/${logId}/exercise/${exerciseLogId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update exercise log');
        return response.json();
    },

    complete_workout: async (payload) => {
        const { logId, ...data } = payload;
        const response = await fetch(`/api/workout/${logId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to complete workout');
        return response.json();
    },

    swap_exercise: async (payload) => {
        const { logId, exerciseLogId, ...data } = payload;
        const response = await fetch(`/api/workout/${logId}/exercise/${exerciseLogId}/swap`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to swap exercise');
        return response.json();
    },
};

// Sync manager class
class SyncManager {
    private isSyncing = false;
    private retryCount = 0;
    private maxRetries = 3;
    private retryDelay = 1000; // 1 second

    // Process a single action
    private async processAction(action: OfflineAction): Promise<boolean> {
        const handler = actionHandlers[action.type];
        if (!handler) {
            console.error(`No handler for action type: ${action.type}`);
            return false;
        }

        try {
            await handler(action.payload);
            await offlineActions.markSynced(action.id);
            useOfflineStore.getState().markActionSynced(action.id);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await offlineActions.markFailed(action.id, errorMessage);
            useOfflineStore.getState().markActionFailed(action.id, errorMessage);
            return false;
        }
    }

    // Sync all pending actions
    async syncAll(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            return { success: 0, failed: 0 };
        }

        const store = useOfflineStore.getState();

        // Check online status
        if (!store.status.isOnline) {
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        store.setSyncing(true);

        let success = 0;
        let failed = 0;

        try {
            const pendingActions = await offlineActions.getUnsynced();

            // Sort by timestamp to process in order
            pendingActions.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            for (const action of pendingActions) {
                const result = await this.processAction(action);
                if (result) {
                    success++;
                } else {
                    failed++;
                    // If an action fails, we might want to stop and retry later
                    // depending on the error type
                }
            }

            // Clear synced actions from IndexedDB
            await offlineActions.clearSynced();
            store.clearSyncedActions();
            store.updateLastSynced();
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
            store.setSyncing(false);
        }

        return { success, failed };
    }

    // Queue an action for syncing
    async queueAction(type: OfflineActionType, payload: Record<string, any>): Promise<string> {
        const store = useOfflineStore.getState();
        const actionId = store.queueAction(type, payload);

        // Get the action from store and save to IndexedDB
        const actions = store.pendingActions;
        const action = actions.find(a => a.id === actionId);
        if (action) {
            await offlineActions.add(action);
        }

        // If online, try to sync immediately
        if (store.status.isOnline && !this.isSyncing) {
            this.syncAll();
        }

        return actionId;
    }

    // Save workout draft
    async saveDraft(userId: string, sessionId: string, data: any): Promise<void> {
        await workoutDrafts.save(userId, sessionId, data);

        // Also try to sync to server if online
        const store = useOfflineStore.getState();
        if (store.status.isOnline) {
            try {
                await fetch('/api/sync/workout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, sessionId, data }),
                });
            } catch (error) {
                // Silently fail - local save is sufficient
                console.log('Draft sync failed, will retry later');
            }
        }
    }

    // Load workout draft
    async loadDraft(userId: string, sessionId: string): Promise<any | null> {
        // Try local first
        const localDraft = await workoutDrafts.get(userId, sessionId);
        if (localDraft) return localDraft;

        // If online, try to fetch from server
        const store = useOfflineStore.getState();
        if (store.status.isOnline) {
            try {
                const response = await fetch(`/api/sync/workout?userId=${userId}&sessionId=${sessionId}`);
                if (response.ok) {
                    const serverDraft = await response.json();
                    if (serverDraft) {
                        // Cache locally
                        await workoutDrafts.save(userId, sessionId, serverDraft);
                        return serverDraft;
                    }
                }
            } catch (error) {
                console.log('Failed to fetch draft from server');
            }
        }

        return null;
    }

    // Delete workout draft
    async deleteDraft(userId: string, sessionId: string): Promise<void> {
        await workoutDrafts.delete(userId, sessionId);

        // Also delete from server if online
        const store = useOfflineStore.getState();
        if (store.status.isOnline) {
            try {
                await fetch(`/api/sync/workout?userId=${userId}&sessionId=${sessionId}`, {
                    method: 'DELETE',
                });
            } catch (error) {
                // Silent fail
            }
        }
    }

    // Initialize sync manager (call on app load)
    async initialize(): Promise<void> {
        // Try to sync any pending actions
        const store = useOfflineStore.getState();
        if (store.status.isOnline) {
            await this.syncAll();
        }
    }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Export for module use
export default syncManager;
