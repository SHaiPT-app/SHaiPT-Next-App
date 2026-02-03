// ============================================
// SHaiPT Social Fitness Platform Types
// ============================================

// ============================================
// USER & PROFILE TYPES
// ============================================

export interface AIFeatures {
    [key: string]: boolean;
}

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
    trainer_id?: string | null; // uuid, nullable, FK to profiles(id)

    // AI features
    ai_features?: AIFeatures; // jsonb, nullable

    // Aliases for backward compatibility with generated code
    display_name?: string;
    dob?: string;
    height?: number;
    weight?: number;
    experience?: string;

    // Legal / liability
    terms_accepted_at?: string; // timestamptz, nullable — when user accepted health disclaimer & liability waiver

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
    reps?: string; // e.g. "10", "8-12", "AMRAP"
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

// ============================================
// AI CLIENT ALERT TYPES
// ============================================

export type ClientAlertType = 'missed_workouts' | 'performance_plateau' | 'form_issues';
export type ClientAlertSeverity = 'warning' | 'critical';

export interface ClientAlert {
    type: ClientAlertType;
    severity: ClientAlertSeverity;
    title: string;
    message: string;
    clientId: string;
    detectedAt: string;
}

export interface ClientAlertSummary {
    clientId: string;
    alerts: ClientAlert[];
    totalCount: number;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export type SubscriptionTier = 'starter' | 'pro' | 'elite';
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete';

export interface Subscription {
    id: string;
    user_id: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    trial_start?: string;
    trial_end?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    created_at?: string;
    updated_at?: string;
}

// ============================================
// COACH INTERVIEW / INTAKE TYPES
// ============================================

export interface IntakeFormData {
    // Basic info
    name: string;
    age: string;
    height: string;
    weight: string;

    // Athletic history
    sport_history: string;
    training_duration: string;
    training_style: string;

    // Goals
    fitness_goals: string;

    // Schedule
    training_days_per_week: string;
    session_duration: string;
    preferred_time: string;

    // Equipment & location
    available_equipment: string;
    training_location: string;

    // Medical
    injuries: string;
    medical_considerations: string;

    // Self-assessment
    fitness_level: string;
}

export interface CoachInterview {
    id: string;
    user_id: string;
    coach_id: string;
    intake_data: IntakeFormData;
    chat_messages: AIChatMessage[];
    is_complete: boolean;
    created_at?: string;
    updated_at?: string;
}

// ============================================
// INTAKE FORM V2 (STRUCTURED) TYPES
// ============================================

export type TrainingLocationType =
    | 'commercial_gym'
    | 'home_gym'
    | 'outdoor'
    | 'calisthenics_park'
    | 'hotel_travel';

export interface IntakeFormDataV2 {
    // Basic info (structured)
    first_name: string;
    last_name: string;
    age: number | null;
    weight_value: number | null;
    weight_unit: 'kg' | 'lbs';
    height_value: number | null;
    height_unit: 'metric' | 'imperial'; // metric = cm, imperial = ft/in
    height_feet: number | null;
    height_inches: number | null;

    // Athletic history
    athletic_history: string; // 'never' | '<1yr' | '1-3yr' | '3-5yr' | '5-10yr' | '10+yr'

    // Fitness goals (array, ordered by priority)
    fitness_goals: string[];

    // Training schedule
    training_days: number | null; // 1-7
    session_duration_minutes: number | null;
    preferred_time_hour: number | null; // 1-12
    preferred_time_minute: number | null; // 0-59
    preferred_time_ampm: 'AM' | 'PM';

    // Equipment & location
    training_location: TrainingLocationType | '';
    equipment: string[];

    // Medical
    injuries: string;
    medical_considerations: string;

    // Self-assessment
    fitness_level: string; // 'beginner' | 'intermediate' | 'advanced'
}

export const EMPTY_INTAKE_FORM_V2: IntakeFormDataV2 = {
    first_name: '',
    last_name: '',
    age: null,
    weight_value: null,
    weight_unit: 'lbs',
    height_value: null,
    height_unit: 'imperial',
    height_feet: null,
    height_inches: null,
    athletic_history: '',
    fitness_goals: [],
    training_days: null,
    session_duration_minutes: null,
    preferred_time_hour: null,
    preferred_time_minute: null,
    preferred_time_ampm: 'AM',
    training_location: '',
    equipment: [],
    injuries: '',
    medical_considerations: '',
    fitness_level: '',
};

/** Convert V2 structured form data to V1 flat strings for API compatibility */
export function intakeV2toV1(v2: IntakeFormDataV2): IntakeFormData {
    const name = [v2.first_name, v2.last_name].filter(Boolean).join(' ');

    let height = '';
    if (v2.height_unit === 'imperial' && v2.height_feet != null) {
        height = `${v2.height_feet}'${v2.height_inches ?? 0}"`;
    } else if (v2.height_unit === 'metric' && v2.height_value != null) {
        height = `${v2.height_value}cm`;
    }

    let weight = '';
    if (v2.weight_value != null) {
        weight = `${v2.weight_value} ${v2.weight_unit}`;
    }

    let preferred_time = '';
    if (v2.preferred_time_hour != null) {
        const min = v2.preferred_time_minute ?? 0;
        preferred_time = `${v2.preferred_time_hour}:${min.toString().padStart(2, '0')} ${v2.preferred_time_ampm}`;
    }

    const HISTORY_LABELS: Record<string, string> = {
        never: 'Never trained',
        '<1yr': 'Less than 1 year',
        '1-3yr': '1-3 years',
        '3-5yr': '3-5 years',
        '5-10yr': '5-10 years',
        '10+yr': '10+ years',
    };

    const LOCATION_LABELS: Record<string, string> = {
        commercial_gym: 'Commercial Gym',
        home_gym: 'Home Gym',
        outdoor: 'Outdoor / Park',
        calisthenics_park: 'Calisthenics Park',
        hotel_travel: 'Hotel / Travel',
    };

    return {
        name,
        age: v2.age != null ? String(v2.age) : '',
        height,
        weight,
        sport_history: HISTORY_LABELS[v2.athletic_history] ?? v2.athletic_history,
        training_duration: v2.athletic_history ? (HISTORY_LABELS[v2.athletic_history] ?? v2.athletic_history) : '',
        training_style: '',
        fitness_goals: v2.fitness_goals.join(', '),
        training_days_per_week: v2.training_days != null ? String(v2.training_days) : '',
        session_duration: v2.session_duration_minutes != null ? `${v2.session_duration_minutes} minutes` : '',
        preferred_time,
        available_equipment: v2.equipment.join(', '),
        training_location: v2.training_location ? (LOCATION_LABELS[v2.training_location] ?? v2.training_location) : '',
        injuries: v2.injuries,
        medical_considerations: v2.medical_considerations,
        fitness_level: v2.fitness_level,
    };
}

/** Convert V1 flat strings to V2 structured form data (best-effort parsing) */
export function intakeV1toV2(v1: IntakeFormData): IntakeFormDataV2 {
    const nameParts = v1.name.trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ');

    const ageNum = parseInt(v1.age, 10);
    const age = !isNaN(ageNum) ? ageNum : null;

    // Parse weight
    let weight_value: number | null = null;
    let weight_unit: 'kg' | 'lbs' = 'lbs';
    const wMatch = v1.weight.match(/(\d+\.?\d*)\s*(kg|lbs?|pounds?)?/i);
    if (wMatch) {
        weight_value = parseFloat(wMatch[1]);
        if (wMatch[2] && /kg/i.test(wMatch[2])) weight_unit = 'kg';
    }

    // Parse height
    let height_value: number | null = null;
    let height_unit: 'metric' | 'imperial' = 'imperial';
    let height_feet: number | null = null;
    let height_inches: number | null = null;
    const ftMatch = v1.height.match(/(\d+)['\s]+(ft\s*)?(\d+)?/);
    const cmMatch = v1.height.match(/(\d+\.?\d*)\s*cm/i);
    if (ftMatch) {
        height_unit = 'imperial';
        height_feet = parseInt(ftMatch[1], 10);
        height_inches = parseInt(ftMatch[3] || '0', 10);
    } else if (cmMatch) {
        height_unit = 'metric';
        height_value = parseFloat(cmMatch[1]);
    }

    // Parse fitness goals
    const fitness_goals = v1.fitness_goals
        ? v1.fitness_goals.split(/[,;]/).map(g => g.trim()).filter(Boolean)
        : [];

    // Parse training days
    const daysMatch = v1.training_days_per_week.match(/(\d)/);
    const training_days = daysMatch ? parseInt(daysMatch[1], 10) : null;

    // Parse session duration
    const durMatch = v1.session_duration.match(/(\d+)/);
    const session_duration_minutes = durMatch ? parseInt(durMatch[1], 10) : null;

    // Parse preferred time
    let preferred_time_hour: number | null = null;
    let preferred_time_minute: number | null = null;
    let preferred_time_ampm: 'AM' | 'PM' = 'AM';
    const timeMatch = v1.preferred_time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
        preferred_time_hour = parseInt(timeMatch[1], 10);
        preferred_time_minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        if (timeMatch[3]) preferred_time_ampm = timeMatch[3].toUpperCase() as 'AM' | 'PM';
    }

    // Parse training location
    let training_location: TrainingLocationType | '' = '';
    const loc = v1.training_location.toLowerCase();
    if (loc.includes('commercial') || loc.includes('gym')) training_location = 'commercial_gym';
    else if (loc.includes('home')) training_location = 'home_gym';
    else if (loc.includes('outdoor') || loc.includes('park')) training_location = 'outdoor';
    else if (loc.includes('calisthenics')) training_location = 'calisthenics_park';
    else if (loc.includes('hotel') || loc.includes('travel')) training_location = 'hotel_travel';

    // Parse equipment
    const equipment = v1.available_equipment
        ? v1.available_equipment.split(/[,;]/).map(e => e.trim()).filter(Boolean)
        : [];

    // Parse athletic history
    let athletic_history = '';
    const hist = (v1.sport_history + ' ' + v1.training_duration).toLowerCase();
    if (hist.includes('never')) athletic_history = 'never';
    else if (hist.includes('10+') || hist.includes('10 ')) athletic_history = '10+yr';
    else if (hist.includes('5-10') || hist.includes('5 to 10')) athletic_history = '5-10yr';
    else if (hist.includes('3-5') || hist.includes('3 to 5')) athletic_history = '3-5yr';
    else if (hist.includes('1-3') || hist.includes('1 to 3')) athletic_history = '1-3yr';
    else if (hist.includes('<1') || hist.includes('less than')) athletic_history = '<1yr';

    // Parse fitness level
    let fitness_level = '';
    const fl = v1.fitness_level.toLowerCase();
    if (fl.includes('beginner')) fitness_level = 'beginner';
    else if (fl.includes('intermediate')) fitness_level = 'intermediate';
    else if (fl.includes('advanced')) fitness_level = 'advanced';

    return {
        first_name,
        last_name,
        age,
        weight_value,
        weight_unit,
        height_value,
        height_unit,
        height_feet,
        height_inches,
        athletic_history,
        fitness_goals,
        training_days,
        session_duration_minutes,
        preferred_time_hour,
        preferred_time_minute,
        preferred_time_ampm,
        training_location,
        equipment,
        injuries: v1.injuries,
        medical_considerations: v1.medical_considerations,
        fitness_level,
    };
}

// ============================================
// DIETITIAN INTERVIEW / INTAKE TYPES
// ============================================

export interface DietIntakeFormData {
    // Allergies & intolerances
    allergies: string;
    intolerances: string;

    // Dietary preferences
    diet_style: string;

    // Food preferences
    foods_love: string;
    foods_hate: string;

    // Medical / dietary considerations
    medical_dietary_considerations: string;

    // Meal preferences
    meals_per_day: string;
    cooking_preferences: string;
}

// ============================================
// TYPE ALIASES & EXTENDED TYPES FOR COMPONENTS
// ============================================

// WorkoutPlan extends TrainingPlan with assignment/exercise fields used by components
export interface WorkoutPlan extends TrainingPlan {
    exercises?: any[]; // JSONB sessions/exercises data
    trainee_id?: string;
    trainer_id?: string;
    assigned_at?: string;
    expires_at?: string;
    is_active?: boolean;
}

// ExerciseSet extends SessionSet with target fields
export interface ExerciseSet extends SessionSet {
    targetReps?: string;
    targetWeight?: string;
    actualReps?: string;
    actualWeight?: string;
    pr?: boolean;
}

// PlanExercise is a denormalized exercise used in plan creation UI
export interface PlanExercise {
    exercise_id?: string;
    id?: string;
    name?: string;
    gif_url?: string;
    notes?: string;
    sets: ExerciseSet[];
}

// LogExercise is a simplified exercise reference
export interface LogExercise {
    exercise_id: string;
    name?: string;
    sets: LogSet[];
    comments?: string;
}

// LogSet represents a single logged set
export interface LogSet {
    set_number: number;
    reps: number;
    weight: number;
    weight_unit?: string;
    rpe?: number;
    isPr?: boolean;
    startTime?: string;
    endTime?: string;
    duration?: number;
}

// ============================================
// ENHANCED WORKOUT TRACKING TYPES
// ============================================

// Intensifier types for advanced set techniques
export type SetType = 'warmup' | 'working';
export type IntensifierType = 'none' | 'dropset' | 'rest_pause' | 'cluster' | 'superset';

// Drop set data structure
export interface DropSetData {
    weight: number;
    reps: number;
}

// Cluster set rest data
export interface ClusterRestData {
    duration_seconds: number;
}

// Enhanced logged set with intensifier support
export interface EnhancedLoggedSet {
    set_number: number;
    reps: number;
    weight: number;
    weight_unit: 'lbs' | 'kg';
    set_type: SetType;
    intensifier: IntensifierType;
    drops?: DropSetData[];
    cluster_rests?: ClusterRestData[];
    superset_partner_exercise_id?: string;
    tempo?: string;
    notes?: string;
    started_at: string;
    completed_at: string;
    rest_started_at?: string;
    rest_ended_at?: string;
    actual_rest_seconds?: number;
    rpe?: number;
}

// ============================================
// PHONE VERIFICATION TYPES
// ============================================

export interface PhoneVerification {
    id: string;
    user_id: string;
    phone_number: string;
    verification_code: string;
    verified_at?: string;
    expires_at: string;
    attempts: number;
    created_at?: string;
}

// ============================================
// CONSISTENCY CHALLENGE TYPES
// ============================================

export type ConsistencyChallengeStatus = 'active' | 'passed' | 'failed' | 'grace_period';

export interface ConsistencyChallenge {
    id: string;
    user_id: string;
    status: ConsistencyChallengeStatus;
    started_at: string;
    current_week_start: string;
    weeks_completed: number;
    missed_days_this_week: number;
    grace_period_requested_at?: string;
    grace_period_approved_at?: string;
    grace_period_expires_at?: string;
    grace_reason?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ConsistencyLog {
    id: string;
    user_id: string;
    challenge_id?: string;
    date: string;
    scheduled: boolean;
    completed: boolean;
    workout_log_id?: string;
    completion_percentage?: number;
    created_at?: string;
}

// ============================================
// USER PREFERENCES TYPES
// ============================================

export type RestTimerAlertType = 'audio' | 'vibration' | 'both' | 'none';

export interface UserPreferences {
    user_id: string;
    form_checker_enabled: boolean;
    rest_timer_auto_start: boolean;
    rest_timer_alert_type: RestTimerAlertType;
    default_rest_seconds: number;
    screen_awake_during_workout: boolean;
    created_at?: string;
    updated_at?: string;
}

// ============================================
// WORKOUT DRAFT TYPES (OFFLINE SUPPORT)
// ============================================

export interface WorkoutDraftData {
    session_id: string;
    session_name: string;
    started_at: string;
    current_exercise_index: number;
    exercises: Array<{
        exercise_id: string;
        exercise_name: string;
        logged_sets: EnhancedLoggedSet[];
        target_sets: SessionSet[];
        rpe?: number;
        notes?: string;
    }>;
    rest_timer_state?: {
        is_resting: boolean;
        rest_seconds_remaining: number;
        rest_started_at: string;
    };
}

export interface WorkoutDraft {
    id: string;
    user_id: string;
    workout_log_id?: string;
    session_id?: string;
    draft_data: WorkoutDraftData;
    device_id?: string;
    last_synced_at?: string;
    created_at?: string;
    updated_at?: string;
}

// ============================================
// OFFLINE SYNC TYPES
// ============================================

export type OfflineActionType =
    | 'create_workout_log'
    | 'log_set'
    | 'update_exercise_log'
    | 'complete_workout'
    | 'swap_exercise';

export interface OfflineAction {
    id: string;
    type: OfflineActionType;
    payload: Record<string, any>;
    timestamp: string;
    synced: boolean;
    error?: string;
}

export interface SyncStatus {
    isOnline: boolean;
    pendingActionsCount: number;
    lastSyncedAt?: string;
    isSyncing: boolean;
}

// ============================================
// WORKOUT STATE TYPES (FOR ZUSTAND STORE)
// ============================================

export interface ActiveWorkoutState {
    workoutLogId: string | null;
    sessionId: string | null;
    sessionName: string | null;
    startedAt: string | null;
    currentExerciseIndex: number;
    exercises: Array<{
        exerciseLogId: string;
        exerciseId: string;
        exerciseName: string;
        gifUrl?: string;
        loggedSets: EnhancedLoggedSet[];
        targetSets: SessionSet[];
        rpe?: number;
        notes?: string;
    }>;
    isActive: boolean;
}

export interface RestTimerState {
    isResting: boolean;
    totalRestSeconds: number;
    restSecondsRemaining: number;
    restStartedAt: string | null;
    autoStart: boolean;
}

export interface WorkoutUIState {
    formCheckerVisible: boolean;
    isRecording: boolean;
    showIntensifierModal: boolean;
    selectedIntensifier: IntensifierType;
}

// ============================================
// PR CALCULATION TYPES
// ============================================

export interface PRCheckResult {
    isNewPR: boolean;
    prType: 'weight' | 'volume' | 'reps' | null;
    previousValue?: number;
    newValue?: number;
    improvement?: number;
}

export interface WorkoutPRSummary {
    exerciseId: string;
    exerciseName: string;
    prType: 'weight' | 'volume' | 'reps';
    previousValue: number;
    newValue: number;
}

// ============================================
// WORKOUT SUMMARY TYPES
// ============================================

export interface WorkoutSummaryData {
    workoutLogId: string;
    sessionName: string;
    totalDurationSeconds: number;
    totalRestSeconds: number;
    totalWorkSeconds: number;
    totalSets: number;
    totalReps: number;
    totalVolume: number;
    volumeUnit: 'lbs' | 'kg';
    exerciseCount: number;
    prsAchieved: WorkoutPRSummary[];
    averageRpe?: number;
    completedAt: string;
}

// ============================================
// EXTENDED SUBSCRIPTION TYPES (CONSISTENCY)
// ============================================

export interface SubscriptionWithConsistency extends Subscription {
    earned_via_consistency?: boolean;
    consistency_challenge_id?: string;
    pro_lost_at?: string;
    pro_regain_streak_start?: string;
}

// ============================================
// EXTENDED PROFILE TYPES (ACCOUNT COMPLETION)
// ============================================

export interface ProfileWithCompletion extends Profile {
    phone_verified?: boolean;
    intake_photos_uploaded?: boolean;
    account_completed?: boolean;
}

// ============================================
// EXTENDED TRAINING PLAN SESSION TYPES
// ============================================

export interface TrainingPlanSessionWithRestDay extends TrainingPlanSession {
    is_rest_day?: boolean;
    expected_duration_minutes?: number;
}

// ============================================
// EXTENDED WORKOUT SESSION TYPES
// ============================================

export interface WorkoutSessionWithMetadata extends WorkoutSession {
    expected_duration_minutes?: number;
    rest_metadata?: Record<string, any>;
}

// ============================================
// EXTENDED EXERCISE LOG TYPES
// ============================================

export interface ExerciseLogWithNotes extends ExerciseLog {
    rpe?: number;
    exercise_notes?: string;
}
