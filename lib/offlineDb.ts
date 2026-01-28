import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { WorkoutDraftData, OfflineAction } from './types';

// Define IndexedDB schema
interface SHaiPTDB extends DBSchema {
    'workout-drafts': {
        key: string;
        value: {
            id: string;
            userId: string;
            sessionId: string;
            data: WorkoutDraftData;
            updatedAt: string;
        };
        indexes: { 'by-user': string; 'by-session': string };
    };
    'offline-actions': {
        key: string;
        value: OfflineAction;
        indexes: { 'by-synced': number };
    };
    'exercise-cache': {
        key: string;
        value: {
            exerciseId: string;
            data: any;
            cachedAt: string;
        };
    };
}

const DB_NAME = 'shaipt-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SHaiPTDB> | null = null;

// Initialize database
export async function initDB(): Promise<IDBPDatabase<SHaiPTDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<SHaiPTDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Workout drafts store
            if (!db.objectStoreNames.contains('workout-drafts')) {
                const draftStore = db.createObjectStore('workout-drafts', { keyPath: 'id' });
                draftStore.createIndex('by-user', 'userId');
                draftStore.createIndex('by-session', 'sessionId');
            }

            // Offline actions queue
            if (!db.objectStoreNames.contains('offline-actions')) {
                const actionsStore = db.createObjectStore('offline-actions', { keyPath: 'id' });
                actionsStore.createIndex('by-synced', 'synced');
            }

            // Exercise cache
            if (!db.objectStoreNames.contains('exercise-cache')) {
                db.createObjectStore('exercise-cache', { keyPath: 'exerciseId' });
            }
        },
    });

    return dbInstance;
}

// Workout Draft Operations
export const workoutDrafts = {
    async save(userId: string, sessionId: string, data: WorkoutDraftData): Promise<void> {
        const db = await initDB();
        const id = `${userId}-${sessionId}`;
        await db.put('workout-drafts', {
            id,
            userId,
            sessionId,
            data,
            updatedAt: new Date().toISOString(),
        });
    },

    async get(userId: string, sessionId: string): Promise<WorkoutDraftData | null> {
        const db = await initDB();
        const id = `${userId}-${sessionId}`;
        const draft = await db.get('workout-drafts', id);
        return draft?.data || null;
    },

    async getByUser(userId: string): Promise<WorkoutDraftData[]> {
        const db = await initDB();
        const drafts = await db.getAllFromIndex('workout-drafts', 'by-user', userId);
        return drafts.map(d => d.data);
    },

    async delete(userId: string, sessionId: string): Promise<void> {
        const db = await initDB();
        const id = `${userId}-${sessionId}`;
        await db.delete('workout-drafts', id);
    },

    async deleteAll(userId: string): Promise<void> {
        const db = await initDB();
        const drafts = await db.getAllFromIndex('workout-drafts', 'by-user', userId);
        const tx = db.transaction('workout-drafts', 'readwrite');
        await Promise.all(drafts.map(d => tx.store.delete(d.id)));
        await tx.done;
    },
};

// Offline Actions Queue Operations
export const offlineActions = {
    async add(action: OfflineAction): Promise<void> {
        const db = await initDB();
        await db.put('offline-actions', action);
    },

    async getUnsynced(): Promise<OfflineAction[]> {
        const db = await initDB();
        // Get all where synced = false (0)
        const all = await db.getAll('offline-actions');
        return all.filter(a => !a.synced);
    },

    async markSynced(id: string): Promise<void> {
        const db = await initDB();
        const action = await db.get('offline-actions', id);
        if (action) {
            action.synced = true;
            await db.put('offline-actions', action);
        }
    },

    async markFailed(id: string, error: string): Promise<void> {
        const db = await initDB();
        const action = await db.get('offline-actions', id);
        if (action) {
            action.error = error;
            await db.put('offline-actions', action);
        }
    },

    async delete(id: string): Promise<void> {
        const db = await initDB();
        await db.delete('offline-actions', id);
    },

    async clearSynced(): Promise<void> {
        const db = await initDB();
        const all = await db.getAll('offline-actions');
        const synced = all.filter(a => a.synced);
        const tx = db.transaction('offline-actions', 'readwrite');
        await Promise.all(synced.map(a => tx.store.delete(a.id)));
        await tx.done;
    },

    async clearAll(): Promise<void> {
        const db = await initDB();
        await db.clear('offline-actions');
    },
};

// Exercise Cache Operations
export const exerciseCache = {
    async set(exerciseId: string, data: any): Promise<void> {
        const db = await initDB();
        await db.put('exercise-cache', {
            exerciseId,
            data,
            cachedAt: new Date().toISOString(),
        });
    },

    async get(exerciseId: string): Promise<any | null> {
        const db = await initDB();
        const cached = await db.get('exercise-cache', exerciseId);
        if (!cached) return null;

        // Check if cache is older than 24 hours
        const cachedTime = new Date(cached.cachedAt).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (now - cachedTime > maxAge) {
            await db.delete('exercise-cache', exerciseId);
            return null;
        }

        return cached.data;
    },

    async clear(): Promise<void> {
        const db = await initDB();
        await db.clear('exercise-cache');
    },
};

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return 'indexedDB' in window;
}

// Export default object for convenience
export default {
    initDB,
    workoutDrafts,
    offlineActions,
    exerciseCache,
    isIndexedDBAvailable,
};
