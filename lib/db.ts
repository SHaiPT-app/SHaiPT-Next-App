import { firestore } from './firebaseAdmin';
import { User, WorkoutPlan, WorkoutLog } from './types';

// Helper to get collection reference
const usersCollection = firestore.collection('users');
const plansCollection = firestore.collection('plans');
const logsCollection = firestore.collection('logs');

export const db = {
    users: {
        getAll: async (): Promise<User[]> => {
            const snapshot = await usersCollection.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        },
        getById: async (id: string): Promise<User | undefined> => {
            const doc = await usersCollection.doc(id).get();
            return doc.exists ? ({ id: doc.id, ...doc.data() } as User) : undefined;
        },
        getByUsername: async (username: string): Promise<User | undefined> => {
            const snapshot = await usersCollection.where('username', '==', username).limit(1).get();
            if (snapshot.empty) return undefined;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as User;
        },
        create: async (user: User): Promise<User> => {
            // If user has an ID, use it, otherwise auto-gen (but usually we want to use Auth UID)
            if (user.id) {
                await usersCollection.doc(user.id).set(user);
                return user;
            } else {
                const docRef = await usersCollection.add(user);
                return { ...user, id: docRef.id };
            }
        },
        update: async (user: User): Promise<User | null> => {
            if (!user.id) return null;
            await usersCollection.doc(user.id).update(user as any);
            return user;
        }
    },
    plans: {
        getAll: async (): Promise<WorkoutPlan[]> => {
            const snapshot = await plansCollection.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutPlan));
        },
        getByTrainee: async (traineeId: string): Promise<WorkoutPlan[]> => {
            const snapshot = await plansCollection.where('traineeId', '==', traineeId).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutPlan));
        },
        getByTrainer: async (trainerId: string): Promise<WorkoutPlan[]> => {
            const snapshot = await plansCollection.where('trainerId', '==', trainerId).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutPlan));
        },
        create: async (plan: WorkoutPlan): Promise<WorkoutPlan> => {
            const docRef = plansCollection.doc(); // Auto ID
            const newPlan = { ...plan, id: docRef.id };
            await docRef.set(newPlan);
            return newPlan;
        },
        update: async (plan: WorkoutPlan): Promise<WorkoutPlan | null> => {
            if (!plan.id) return null;
            await plansCollection.doc(plan.id).update(plan as any);
            return plan;
        }
    },
    logs: {
        getAll: async (): Promise<WorkoutLog[]> => {
            const snapshot = await logsCollection.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutLog));
        },
        getByTrainee: async (traineeId: string): Promise<WorkoutLog[]> => {
            const snapshot = await logsCollection.where('traineeId', '==', traineeId).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutLog));
        },
        create: async (log: any): Promise<WorkoutLog> => {
            const docRef = logsCollection.doc();
            const newLog = { ...log, id: docRef.id, date: new Date().toISOString() };
            await docRef.set(newLog);
            return newLog;
        }
    }
};
