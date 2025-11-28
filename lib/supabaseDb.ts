import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role (bypasses RLS)
// Only create admin client if service role key is available
let supabaseAdmin: any = null;
if (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

export interface Profile {
    id: string;
    username: string;
    email: string;
    role: 'trainer' | 'trainee';
    trainer_id?: string;
    display_name?: string;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
    height?: string;
    weight?: string;
    experience?: string;
    dob?: string;
}

export interface WorkoutPlan {
    id: string;
    trainee_id: string;
    trainer_id: string;
    name: string;
    description?: string;
    exercises: any[]; // JSON array of exercises
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface WorkoutLog {
    id: string;
    plan_id: string;
    trainee_id: string;
    date: string;
    exercises: any[]; // JSON array of logged exercises
    notes?: string;
    duration_minutes?: number;
    completed_at?: string;
    created_at?: string;
}

export interface Exercise {
    exercise_id: string;
    name: string;
    gif_url?: string;
    body_parts: string[];
    target_muscles: string[];
    secondary_muscles?: string[];
    equipments: string[];
    difficulty?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ExerciseInstruction {
    id: number;
    exercise_id: string;
    step_number: number;
    instruction_text: string;
}

// Regular client (uses RLS)
export const db = {
    profiles: {
        getAll: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');
            if (error) throw error;
            return data || [];
        },

        getById: async (id: string): Promise<Profile | null> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        getByUsername: async (username: string): Promise<Profile | null> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        getByEmail: async (email: string): Promise<Profile | null> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        getByUsernameOrEmail: async (identifier: string): Promise<Profile | null> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.eq.${identifier},email.eq.${identifier}`)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        create: async (profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> => {
            const { data, error } = await supabase
                .from('profiles')
                .insert([profile])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
            const { data, error } = await supabase
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        getTrainees: async (trainerId: string): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('trainer_id', trainerId);
            if (error) throw error;
            return data || [];
        }
    },

    workoutPlans: {
        getAll: async (): Promise<WorkoutPlan[]> => {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByTrainee: async (traineeId: string): Promise<WorkoutPlan[]> => {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('trainee_id', traineeId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByTrainer: async (trainerId: string): Promise<WorkoutPlan[]> => {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('trainer_id', trainerId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getById: async (id: string): Promise<WorkoutPlan | null> => {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        create: async (plan: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutPlan> => {
            console.log('Supabase DB: Creating workout plan with data:', JSON.stringify(plan, null, 2));

            const { data, error } = await supabase
                .from('workout_plans')
                .insert([plan])
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('Supabase DB: Plan created successfully:', data);
            return data;
        },

        update: async (id: string, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan> => {
            const { data, error } = await supabase
                .from('workout_plans')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('workout_plans')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    workoutLogs: {
        getAll: async (): Promise<WorkoutLog[]> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByTrainee: async (traineeId: string): Promise<WorkoutLog[]> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('trainee_id', traineeId)
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByPlan: async (planId: string): Promise<WorkoutLog[]> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('plan_id', planId)
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        create: async (log: Omit<WorkoutLog, 'id' | 'created_at' | 'completed_at'>): Promise<WorkoutLog> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .insert([log])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<WorkoutLog>): Promise<WorkoutLog> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    exercises: {
        getAll: async (): Promise<Exercise[]> => {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .order('name');
            if (error) throw error;
            return data || [];
        },

        getById: async (exerciseId: string): Promise<Exercise | null> => {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .eq('exercise_id', exerciseId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        search: async (query: string): Promise<Exercise[]> => {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .ilike('name', `%${query}%`)
                .order('name');
            if (error) throw error;
            return data || [];
        },

        getByBodyPart: async (bodyPart: string): Promise<Exercise[]> => {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .contains('body_parts', [bodyPart])
                .order('name');
            if (error) throw error;
            return data || [];
        },

        getInstructions: async (exerciseId: string): Promise<ExerciseInstruction[]> => {
            const { data, error } = await supabase
                .from('exercise_instructions')
                .select('*')
                .eq('exercise_id', exerciseId)
                .order('step_number');
            if (error) throw error;
            return data || [];
        }
    }
};

// Admin client (bypasses RLS) - for server-side operations
export const dbAdmin = {
    ...db, // Inherit all the same functions

    // Override workout plans with admin client
    workoutPlans: {
        ...db.workoutPlans,

        create: async (plan: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutPlan> => {
            console.log('Admin Supabase: Creating workout plan with data:', JSON.stringify(plan, null, 2));

            if (!supabaseAdmin) {
                throw new Error('Service role key not configured. Cannot create workout plan.');
            }

            const { data, error } = await supabaseAdmin
                .from('workout_plans')
                .insert([plan])
                .select()
                .single();

            if (error) {
                console.error('Admin Supabase insert error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('Admin Supabase: Plan created successfully:', data);
            return data;
        },

        update: async (id: string, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan> => {
            const { data, error } = await supabaseAdmin
                .from('workout_plans')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabaseAdmin
                .from('workout_plans')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    }
};