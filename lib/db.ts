import fs from 'fs';
import path from 'path';
import { User, WorkoutPlan } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');

// Helper to read JSON
function readJson<T>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        return [] as unknown as T;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

// Helper to write JSON
function writeJson<T>(filePath: string, data: T): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const db = {
    users: {
        getAll: () => readJson<User[]>(USERS_FILE),
        getById: (id: string) => readJson<User[]>(USERS_FILE).find(u => u.id === id),
        getByUsername: (username: string) => readJson<User[]>(USERS_FILE).find(u => u.username === username),
        create: (user: User) => {
            const users = readJson<User[]>(USERS_FILE);
            users.push(user);
            writeJson(USERS_FILE, users);
            return user;
        },
        update: (user: User) => {
            const users = readJson<User[]>(USERS_FILE);
            const index = users.findIndex(u => u.id === user.id);
            if (index !== -1) {
                users[index] = user;
                writeJson(USERS_FILE, users);
                return user;
            }
            return null;
        }
    },
    plans: {
        getAll: () => readJson<WorkoutPlan[]>(PLANS_FILE),
        getByTrainee: (traineeId: string) => readJson<WorkoutPlan[]>(PLANS_FILE).filter(p => p.traineeId === traineeId),
        getByTrainer: (trainerId: string) => readJson<WorkoutPlan[]>(PLANS_FILE).filter(p => p.trainerId === trainerId),
        create: (plan: WorkoutPlan) => {
            const plans = readJson<WorkoutPlan[]>(PLANS_FILE);
            plans.push(plan);
            writeJson(PLANS_FILE, plans);
            return plan;
        },
        update: (plan: WorkoutPlan) => {
            const plans = readJson<WorkoutPlan[]>(PLANS_FILE);
            const index = plans.findIndex(p => p.id === plan.id);
            if (index !== -1) {
                plans[index] = plan;
                writeJson(PLANS_FILE, plans);
                return plan;
            }
            return null;
        }
    }
};
