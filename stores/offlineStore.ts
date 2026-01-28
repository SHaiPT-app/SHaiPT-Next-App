import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OfflineAction, SyncStatus, OfflineActionType } from '@/lib/types';

interface OfflineStore {
    // Status
    status: SyncStatus;

    // Pending actions queue
    pendingActions: OfflineAction[];

    // Actions
    setOnlineStatus: (isOnline: boolean) => void;
    queueAction: (type: OfflineActionType, payload: Record<string, any>) => string;
    markActionSynced: (actionId: string) => void;
    markActionFailed: (actionId: string, error: string) => void;
    removeAction: (actionId: string) => void;
    clearSyncedActions: () => void;
    clearAllActions: () => void;
    getUnsyncedActions: () => OfflineAction[];
    setSyncing: (isSyncing: boolean) => void;
    updateLastSynced: () => void;
}

const initialStatus: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingActionsCount: 0,
    lastSyncedAt: undefined,
    isSyncing: false,
};

// Generate unique ID for actions
const generateActionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useOfflineStore = create<OfflineStore>()(
    persist(
        (set, get) => ({
            status: initialStatus,
            pendingActions: [],

            setOnlineStatus: (isOnline) => {
                set({
                    status: { ...get().status, isOnline },
                });
            },

            queueAction: (type, payload) => {
                const actionId = generateActionId();
                const action: OfflineAction = {
                    id: actionId,
                    type,
                    payload,
                    timestamp: new Date().toISOString(),
                    synced: false,
                };

                const pendingActions = [...get().pendingActions, action];
                set({
                    pendingActions,
                    status: {
                        ...get().status,
                        pendingActionsCount: pendingActions.filter(a => !a.synced).length,
                    },
                });

                return actionId;
            },

            markActionSynced: (actionId) => {
                const pendingActions = get().pendingActions.map(action =>
                    action.id === actionId ? { ...action, synced: true } : action
                );
                set({
                    pendingActions,
                    status: {
                        ...get().status,
                        pendingActionsCount: pendingActions.filter(a => !a.synced).length,
                    },
                });
            },

            markActionFailed: (actionId, error) => {
                const pendingActions = get().pendingActions.map(action =>
                    action.id === actionId ? { ...action, error } : action
                );
                set({ pendingActions });
            },

            removeAction: (actionId) => {
                const pendingActions = get().pendingActions.filter(a => a.id !== actionId);
                set({
                    pendingActions,
                    status: {
                        ...get().status,
                        pendingActionsCount: pendingActions.filter(a => !a.synced).length,
                    },
                });
            },

            clearSyncedActions: () => {
                const pendingActions = get().pendingActions.filter(a => !a.synced);
                set({
                    pendingActions,
                    status: {
                        ...get().status,
                        pendingActionsCount: pendingActions.length,
                    },
                });
            },

            clearAllActions: () => {
                set({
                    pendingActions: [],
                    status: {
                        ...get().status,
                        pendingActionsCount: 0,
                    },
                });
            },

            getUnsyncedActions: () => {
                return get().pendingActions.filter(a => !a.synced);
            },

            setSyncing: (isSyncing) => {
                set({
                    status: { ...get().status, isSyncing },
                });
            },

            updateLastSynced: () => {
                set({
                    status: {
                        ...get().status,
                        lastSyncedAt: new Date().toISOString(),
                    },
                });
            },
        }),
        {
            name: 'shaipt-offline-store',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined') {
                    return localStorage;
                }
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                };
            }),
        }
    )
);

// Hook for monitoring online status
export const initOnlineStatusListener = () => {
    if (typeof window === 'undefined') return;

    const store = useOfflineStore.getState();

    const handleOnline = () => store.setOnlineStatus(true);
    const handleOffline = () => store.setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    store.setOnlineStatus(navigator.onLine);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
