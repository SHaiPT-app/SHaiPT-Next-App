export type Role = 'trainer' | 'trainee';

// User Profile (matches actual Supabase profiles table)
export interface User {
    id: string; // uuid, NOT NULL
    username: string; // text, NOT NULL
    email: string; // text, NOT NULL  
    role: Role; // text, NOT NULL
    trainer_id?: string; // uuid, nullable - for trainees
    display_name?: string; // text, nullable
    avatar_url?: string; // text, nullable
    created_at?: string; // timestamp with time zone, nullable, default now()
    updated_at?: string; // timestamp with time zone, nullable, default now()
}

// Exercise data structures for workout plans
export interface ExerciseSet {
    targetReps: string;
    targetWeight?: string;
    actualReps?: string;
    actualWeight?: string;
    pr?: boolean;
}

export interface PlanExercise {
    id: string; // Local ID for plan management
    name: string; // Exercise name (can be manual or from database)
    exercise_id?: string; // varchar(20) - Reference to exercises.exercise_id for database exercises
    gif_url?: string; // Internal storage for exercise GIF (from database)
    notes?: string; // Optional notes for the exercise
    sets: ExerciseSet[];
}

// Workout Plan (matches actual Supabase workout_plans table)
export interface WorkoutPlan {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    trainee_id: string; // uuid, NOT NULL
    trainer_id: string; // uuid, NOT NULL
    name: string; // text, NOT NULL
    description?: string; // text, nullable
    exercises: PlanExercise[]; // jsonb, NOT NULL
    is_active?: boolean; // boolean, nullable, default true
    created_at?: string; // timestamp with time zone, nullable, default now()
    updated_at?: string; // timestamp with time zone, nullable, default now()
}

// Workout logging data structures
export interface LogSet {
    setNumber: number;
    reps: string;
    weight: string;
    isPr: boolean;
    startTime?: number;
    endTime?: number;
    duration?: number; // in seconds
}

export interface LogExercise {
    exerciseId: string;
    name: string;
    sets: LogSet[];
    comments?: string;
}

// Workout Log (matches actual Supabase workout_logs table)
export interface WorkoutLog {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    plan_id: string; // uuid, NOT NULL
    trainee_id: string; // uuid, NOT NULL
    date: string; // date, NOT NULL, default CURRENT_DATE
    exercises: LogExercise[]; // jsonb, NOT NULL
    notes?: string; // text, nullable
    duration_minutes?: number; // integer, nullable
    completed_at?: string; // timestamp with time zone, nullable, default now()
    created_at?: string; // timestamp with time zone, nullable, default now()
}

// Exercise Library (matches actual Supabase exercises table)
export interface Exercise {
    exercise_id: string; // varchar(20), NOT NULL
    name: string; // varchar(255), NOT NULL  
    gif_url?: string; // varchar(500), nullable
    body_parts: string[]; // ARRAY, NOT NULL
    target_muscles: string[]; // ARRAY, NOT NULL
    secondary_muscles?: string[]; // ARRAY, nullable
    equipments: string[]; // ARRAY, NOT NULL
    difficulty?: string; // varchar(20), nullable
    created_at?: string; // timestamp, nullable, default now()
    updated_at?: string; // timestamp, nullable, default now()
}

// Exercise Instructions (matches Supabase exercise_instructions table)
export interface ExerciseInstruction {
    id: number;
    exercise_id: string;
    step_number: number;
    instruction_text: string;
}
