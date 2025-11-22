export type Role = 'trainer' | 'trainee';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this would be hashed
  role: Role;
  trainerId?: string; // For trainees
}

export interface ExerciseSet {
  targetReps: string;
  targetWeight?: string;
  actualReps?: string;
  actualWeight?: string;
  pr?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  link?: string;
  sets: ExerciseSet[];
}

export interface WorkoutPlan {
  id: string;
  traineeId: string;
  trainerId: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
}
