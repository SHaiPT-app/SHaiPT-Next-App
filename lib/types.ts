// ============================================
// SHaiPT Social Fitness Platform Types
// ============================================

// ============================================
// USER & PROFILE TYPES
// ============================================

export interface Profile {
    id: string; // uuid, NOT NULL
    email: string; // text, NOT NULL
    username?: string; // text, nullable (ordinal 18)
    role?: 'trainer' | 'trainee'; // varchar, nullable
    full_name?: string; // text, nullable
    avatar_url?: string; // text, nullable
    bio?: string; // text, nullable

    // Physical attributes
    gender?: string; // varchar(20), nullable
    date_of_birth?: string; // date, nullable
    height_cm?: number; // numeric, nullable
    weight_kg?: number; // numeric, nullable

    // Preferences
    preferred_weight_unit?: 'lbs' | 'kg'; // varchar(10), nullable, default 'lbs'
    timezone?: string; // varchar(50), nullable, default 'America/New_York'
    fitness_goals?: string[]; // ARRAY, nullable (ordinal 14)

    // Privacy settings
    workout_privacy?: 'public' | 'followers' | 'private'; // varchar(20), default 'public'
    auto_post_workouts?: boolean; // boolean, default true
    allow_unsolicited_messages?: boolean; // boolean, default true (ordinal 19)

    // Social
    pinned_plan_id?: string; // uuid, nullable, FK to training_plans(id) (ordinal 15)

    // Timestamps
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

// User type alias for backwards compatibility
export type User = Profile;

// ============================================
// SOCIAL RELATIONSHIP TYPES
// ============================================

export interface UserFollow {
    follower_id: string; // uuid, NOT NULL
    following_id: string; // uuid, NOT NULL
    created_at?: string; // timestamptz, default now()
}

export type CoachingStatus = 'pending' | 'active' | 'declined' | 'ended';

export interface CoachingRelationship {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    coach_id: string; // uuid, NOT NULL
    athlete_id: string; // uuid, NOT NULL
    status: CoachingStatus; // varchar(20), NOT NULL
    requested_by: string; // uuid, NOT NULL (who initiated)
    can_assign_plans?: boolean; // boolean, default true
    can_view_workouts?: boolean; // boolean, default true
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

// ============================================
// WORKOUT & TRAINING TYPES
// ============================================

// Individual set configuration
export interface SessionSet {
    reps: string; // e.g. "10", "8-12", "AMRAP"
    weight?: string; // e.g. "135", "BW"
    rest_seconds?: number;
}

// Individual exercise in a workout session (JSONB structure)
export interface SessionExercise {
    exercise_id: string; // Reference to exercises table
    sets: SessionSet[]; // List of specific sets
    notes?: string; // Optional exercise-specific notes
}

export interface WorkoutSession {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    creator_id: string; // uuid, NOT NULL
    name: string; // text, NOT NULL
    description?: string; // text, nullable
    exercises: SessionExercise[]; // jsonb, NOT NULL, default '[]'
    tags?: string[]; // text[], default '{}'
    is_template?: boolean; // boolean, default true
    is_public?: boolean; // boolean, default false
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

export type PhaseType = 'hypertrophy' | 'strength' | 'endurance' | 'deload' | 'power' | 'general';

export interface PeriodizedBlock {
    phase_type: PhaseType;
    phase_duration_weeks: number;
    label: string;
}

export interface TrainingPlan {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    creator_id: string; // uuid, NOT NULL
    name: string; // text, NOT NULL
    description?: string; // text, nullable
    duration_weeks?: number; // integer, nullable
    phase_type?: PhaseType; // varchar, nullable — primary phase type
    phase_duration_weeks?: number; // integer, nullable — primary phase duration
    periodization_blocks?: PeriodizedBlock[]; // jsonb, nullable — multi-block periodization
    tags?: string[]; // text[], default '{}'
    is_template?: boolean; // boolean, default true
    is_public?: boolean; // boolean, default false
    is_shareable?: boolean; // boolean, default false
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

export interface TrainingPlanSession {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    plan_id: string; // uuid, NOT NULL
    session_id: string; // uuid, NOT NULL
    day_number: number; // integer, NOT NULL
    week_number?: number; // integer, nullable
}

export interface TrainingPlanAssignment {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    plan_id: string; // uuid, NOT NULL
    user_id: string; // uuid, NOT NULL
    assigned_by_id?: string; // uuid, nullable
    is_self_assigned?: boolean; // boolean, default true
    start_date: string; // date, NOT NULL
    end_date: string; // date, NOT NULL
    is_active?: boolean; // boolean, default true
    created_at?: string; // timestamptz, default now()
}

// ============================================
// WORKOUT LOGGING TYPES
// ============================================

// Individual set data within an exercise log (JSONB structure)
export interface LoggedSet {
    set_number: number;
    reps: number;
    weight: number;
    weight_unit: 'lbs' | 'kg';
    started_at?: string; // timestamptz
    completed_at?: string; // timestamptz
    duration_seconds?: number;
    rest_after_seconds?: number;
    rpe?: number; // Rate of Perceived Exertion (1-10)
    is_warmup?: boolean;
    notes?: string;
}

export interface ExerciseLog {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    workout_log_id: string; // uuid, NOT NULL
    exercise_id: string; // varchar(20), NOT NULL
    exercise_order: number; // integer, NOT NULL
    sets: LoggedSet[]; // jsonb, NOT NULL, default '[]'
    total_sets?: number; // integer, nullable
    total_reps?: number; // integer, nullable
    max_weight?: number; // numeric, nullable
    average_rest_seconds?: number; // integer, nullable
    created_at?: string; // timestamptz, default now()
}

export interface WorkoutLog {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    assignment_id?: string; // uuid, nullable
    session_id?: string; // uuid, nullable
    date: string; // date, NOT NULL, default CURRENT_DATE
    started_at?: string; // timestamptz, nullable
    finished_at?: string; // timestamptz, nullable
    total_duration_seconds?: number; // integer, GENERATED (computed)
    total_rest_seconds?: number; // integer, nullable
    total_work_seconds?: number; // integer, GENERATED (computed)
    notes?: string; // text, nullable
    completed_at?: string; // timestamptz, nullable
    created_at?: string; // timestamptz, default now()
}

export interface PersonalRecord {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    exercise_id: string; // varchar(20), NOT NULL
    max_weight?: number; // numeric, nullable
    max_volume?: number; // numeric, nullable (weight × reps)
    max_reps?: number; // integer, nullable
    max_reps_weight?: number; // numeric, nullable
    achieved_at: string; // timestamptz, NOT NULL
    workout_log_id?: string; // uuid, nullable
    exercise_log_id?: string; // uuid, nullable
    is_current?: boolean; // boolean, default true
    created_at?: string; // timestamptz, default now()
}

export interface ProgressMedia {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    workout_log_id?: string; // uuid, nullable
    media_type: 'image' | 'video'; // varchar(20), NOT NULL
    storage_path: string; // text, NOT NULL
    caption?: string; // text, nullable
    taken_at?: string; // timestamptz, nullable
    visibility: 'public' | 'followers' | 'private'; // varchar(20), NOT NULL
    created_at?: string; // timestamptz, default now()
}

// ============================================
// SOCIAL ACTIVITY TYPES
// ============================================

export type ActivityPostType = 'workout_completed' | 'pr_achieved' | 'manual';
export type PostVisibility = 'public' | 'followers' | 'private';

export interface ActivityPost {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    workout_log_id?: string; // uuid, nullable
    post_type: ActivityPostType; // varchar(50), NOT NULL
    content: string; // text, NOT NULL
    visibility: PostVisibility; // varchar(20), NOT NULL
    created_at?: string; // timestamptz, default now()
}

export interface PostLike {
    post_id: string; // uuid, NOT NULL
    user_id: string; // uuid, NOT NULL
    created_at?: string; // timestamptz, default now()
}

export interface PostComment {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    post_id: string; // uuid, NOT NULL
    user_id: string; // uuid, NOT NULL
    content: string; // text, NOT NULL
    created_at?: string; // timestamptz, default now()
}

export interface UserFavorite {
    user_id: string; // uuid, NOT NULL
    item_type: 'plan' | 'session'; // varchar(20), NOT NULL
    item_id: string; // uuid, NOT NULL
    created_at?: string; // timestamptz, default now()
}

// ============================================
// MESSAGING & NOTIFICATIONS
// ============================================

export interface DirectMessage {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    sender_id: string; // uuid, NOT NULL
    recipient_id: string; // uuid, NOT NULL
    content: string; // text, NOT NULL
    read_at?: string; // timestamptz, nullable
    created_at?: string; // timestamptz, default now()
}

export type NotificationType =
    | 'new_follower'
    | 'post_like'
    | 'post_comment'
    | 'coaching_request'
    | 'coaching_accepted'
    | 'plan_assigned'
    | 'new_message'
    | 'pr_achieved'
    | 'mention';

export type NotificationReferenceType = 'post' | 'message' | 'plan' | 'user';

export interface Notification {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL (recipient)
    type: NotificationType; // varchar(50), NOT NULL
    actor_id?: string; // uuid, nullable (who triggered it)
    reference_id?: string; // uuid, nullable
    reference_type?: NotificationReferenceType; // varchar(50), nullable
    content: string; // text, NOT NULL
    is_read?: boolean; // boolean, default false
    created_at?: string; // timestamptz, default now()
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface OnboardingData {
    fitness_goals: string[];
    experience_level: string;
    available_equipment: string[];
    training_frequency: number;
    injuries_limitations: string[];
    dietary_preferences: string[];
}

// ============================================
// AI CHAT TYPES
// ============================================

export interface AIChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface AIChat {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    title: string; // text, default 'New Chat'
    messages: AIChatMessage[]; // jsonb, NOT NULL, default '[]'
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

// ============================================
// EXERCISE LIBRARY TYPES (unchanged)
// ============================================

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

export interface ExerciseInstruction {
    id: number;
    exercise_id: string;
    step_number: number;
    instruction: string; // Column name is 'instruction' not 'instruction_text'
}

// ============================================
// UTILITY & EXTENDED TYPES
// ============================================

// Extended types for API responses with joined data
export interface ActivityPostWithDetails extends ActivityPost {
    user?: Profile;
    like_count?: number;
    comment_count?: number;
    is_liked_by_user?: boolean;
    workout_log?: WorkoutLog;
}

export interface NotificationWithDetails extends Notification {
    actor?: Profile;
}

export interface TrainingPlanWithSessions extends TrainingPlan {
    creator?: Profile;
    sessions?: (TrainingPlanSession & { session?: WorkoutSession })[];
    is_favorited?: boolean;
}

export interface WorkoutSessionWithCreator extends WorkoutSession {
    creator?: Profile;
    is_favorited?: boolean;
}

export interface WorkoutLogWithExercises extends WorkoutLog {
    exercise_logs?: ExerciseLog[];
    session?: WorkoutSession;
}

// For library views
export type LibraryItemType = 'plan' | 'session';

export interface LibraryItem {
    id: string;
    type: LibraryItemType;
    name: string;
    description?: string;
    creator_id: string;
    creator_username?: string;
    is_favorited: boolean;
    is_public?: boolean;
    created_at?: string;
    updated_at?: string;
}

// ============================================
// PLAN ADAPTATION TYPES
// ============================================

export type AdaptationType = 'weight_progression' | 'exercise_substitution' | 'volume_adjustment' | 'deload_recommendation';

export interface PlanAdaptationRecommendation {
    type: AdaptationType;
    exercise_id?: string;
    exercise_name: string;
    current_value: string;
    recommended_value: string;
    rationale: string;
    substitute_exercise_name?: string;
    substitute_exercise_id?: string;
}

export interface PlanAdaptationResponse {
    summary: string;
    recommendations: PlanAdaptationRecommendation[];
    overall_assessment: string;
}

// ============================================
// NUTRITION PLAN TYPES
// ============================================

export interface MealNutrition {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

export interface Meal {
    name: string;
    ingredients: string[];
    instructions?: string;
    prep_time_minutes?: number;
    nutrition: MealNutrition;
}

export interface DayMeals {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snacks?: Meal[];
}

export interface NutritionPlanOverview {
    duration_days: number;
    daily_calories: number;
    macros: MealNutrition;
    key_principles?: string[];
}

export interface NutritionPlan {
    id: string;
    user_id: string;
    name?: string;
    dietary_preferences: string[];
    plan_overview: NutritionPlanOverview;
    daily_schedule: Record<string, DayMeals>;
    shopping_list?: Record<string, string[]>;
    nutrition_tips?: string[];
    created_at?: string;
    updated_at?: string;
}

// ============================================
// FOOD DATABASE & LOGGING TYPES
// ============================================

export interface FoodItem {
    id: string; // uuid
    name: string; // varchar(255), NOT NULL
    brand?: string; // varchar(255), nullable
    category?: string; // varchar(100), nullable
    serving_size: number; // numeric, NOT NULL, default 100
    serving_unit: string; // varchar(50), NOT NULL, default 'g'
    calories: number; // numeric, NOT NULL
    protein_g: number; // numeric, NOT NULL
    carbs_g: number; // numeric, NOT NULL
    fat_g: number; // numeric, NOT NULL
    fiber_g?: number; // numeric, nullable
    sugar_g?: number; // numeric, nullable
    sodium_mg?: number; // numeric, nullable
    is_verified?: boolean; // boolean, default false
    created_by?: string; // uuid, nullable
    created_at?: string; // timestamptz
    updated_at?: string; // timestamptz
}

export type FoodLogMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
    id: string; // uuid
    user_id: string; // uuid, NOT NULL
    food_id?: string; // uuid, nullable (reference to food_database)
    food_name: string; // varchar(255), NOT NULL
    meal_type: FoodLogMealType; // varchar(20), NOT NULL
    serving_size: number; // numeric, NOT NULL, default 1
    serving_unit: string; // varchar(50), NOT NULL, default 'serving'
    calories: number; // numeric, NOT NULL
    protein_g: number; // numeric, NOT NULL
    carbs_g: number; // numeric, NOT NULL
    fat_g: number; // numeric, NOT NULL
    logged_date: string; // date, NOT NULL, default CURRENT_DATE
    notes?: string; // text, nullable
    created_at?: string; // timestamptz
    updated_at?: string; // timestamptz
}

export interface GroceryList {
    id: string; // uuid
    user_id: string; // uuid, NOT NULL
    nutrition_plan_id?: string; // uuid, nullable
    name: string; // varchar(255), NOT NULL, default 'Grocery List'
    items: GroceryListItem[]; // jsonb, NOT NULL, default '[]'
    is_completed?: boolean; // boolean, default false
    created_at?: string; // timestamptz
    updated_at?: string; // timestamptz
}

export interface GroceryListItem {
    name: string;
    category?: string;
    quantity?: string;
    checked?: boolean;
}

export interface DailyMacroSummary {
    date: string;
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    target_calories?: number;
    target_protein_g?: number;
    target_carbs_g?: number;
    target_fat_g?: number;
    meals: {
        breakfast: FoodLog[];
        lunch: FoodLog[];
        dinner: FoodLog[];
        snack: FoodLog[];
    };
}

export interface MacroTargets {
    daily_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    training_phase?: string;
    rationale?: string;
}

// ============================================
// BODY COMPOSITION TYPES
// ============================================

export interface BodyMeasurement {
    id: string; // uuid, NOT NULL, default gen_random_uuid()
    user_id: string; // uuid, NOT NULL
    date: string; // date, NOT NULL, default CURRENT_DATE
    weight_kg?: number; // numeric, nullable
    body_fat_percentage?: number; // numeric, nullable
    neck_cm?: number; // numeric, nullable
    shoulders_cm?: number; // numeric, nullable
    chest_cm?: number; // numeric, nullable
    left_bicep_cm?: number; // numeric, nullable
    right_bicep_cm?: number; // numeric, nullable
    waist_cm?: number; // numeric, nullable
    hips_cm?: number; // numeric, nullable
    left_thigh_cm?: number; // numeric, nullable
    right_thigh_cm?: number; // numeric, nullable
    left_calf_cm?: number; // numeric, nullable
    right_calf_cm?: number; // numeric, nullable
    notes?: string; // text, nullable
    created_at?: string; // timestamptz, default now()
    updated_at?: string; // timestamptz, default now()
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface UserStats {
    user_id: string;
    total_workouts: number;
    total_sets: number;
    total_reps: number;
    total_volume_kg: number;
    total_workout_minutes: number;
    current_streak_days: number;
    longest_streak_days: number;
    last_workout_date: string; // date string
    muscle_group_volumes: Record<string, { volume: number; sets: number }>;
    muscle_group_sets: Record<string, number>;
    last_30_days_volume: number;
    last_7_days_workouts: number;
    last_calculated_at: string;
    created_at: string;
    updated_at: string;
}

export interface UserStatsHistory {
    id: string;
    user_id: string;
    date: string; // date string
    total_volume_kg: number;
    total_sets: number;
    total_reps: number;
    total_workouts: number;
    workout_minutes: number;
    muscle_group_volumes: Record<string, { volume: number; sets: number }>;
    created_at: string;
}

// ============================================
// AI WEEKLY INSIGHTS TYPES
// ============================================

export interface WeeklyInsight {
    id: string;
    user_id: string;
    week_start: string; // date string (Monday)
    week_end: string; // date string (Sunday)
    adherence: {
        planned_workouts: number;
        completed_workouts: number;
        adherence_percentage: number;
        summary: string;
    };
    strength_trends: {
        trending_up: string[];
        trending_down: string[];
        summary: string;
    };
    plateaus: {
        exercises: string[];
        summary: string;
    };
    recommendations: string[];
    overall_summary: string;
    generated_at: string;
}
