export type Role = 'trainer' | 'trainee';

// User Profile (matches Supabase profiles table)
export interface User {
    id: string;
    username: string;
    email: string;
    role: Role;
    trainer_id?: string; // For trainees
    display_name?: string;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
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
    id: string;
    name: string;
    exercise_id?: string; // Reference to exercises table
    link?: string;
    sets: ExerciseSet[];
}

// Workout Plan (matches Supabase workout_plans table)
export interface WorkoutPlan {
    id: string;
    trainee_id: string;
    trainer_id: string;
    name: string;
    description?: string;
    exercises: PlanExercise[]; // JSON array
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
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

// Workout Log (matches Supabase workout_logs table)
export interface WorkoutLog {
    id: string;
    plan_id: string;
    trainee_id: string;
    date: string;
    exercises: LogExercise[]; // JSON array
    notes?: string;
    duration_minutes?: number;
    completed_at?: string;
    created_at?: string;
}

// Exercise Library (matches Supabase exercises table)
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

// Exercise Instructions (matches Supabase exercise_instructions table)
export interface ExerciseInstruction {
    id: number;
    exercise_id: string;
    step_number: number;
    instruction_text: string;
}
