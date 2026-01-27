import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import type {
    Profile,
    WorkoutSession,
    TrainingPlan,
    TrainingPlanSession,
    TrainingPlanAssignment,
    WorkoutLog,
    ExerciseLog,
    PersonalRecord,
    ProgressMedia,
    UserFollow,
    CoachingRelationship,
    ActivityPost,
    PostLike,
    PostComment,
    UserFavorite,
    DirectMessage,
    Notification,
    AIChat,
    Exercise,
    ExerciseInstruction,
    LoggedSet
} from './types';

// Server-side Supabase client with service role (bypasses RLS)
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

// ============================================
// PROFILES
// ============================================


export const db = {
    profiles: {
        getAll: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
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

        getByEmail: async (email: string): Promise<Profile | null> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
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

        create: async (profile: Partial<Profile>): Promise<Profile> => {
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

        searchByEmail: async (query: string): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', `%${query}%`)
                .limit(10);
            if (error) throw error;
            return data || [];
        }
    },

    // ============================================
    // WORKOUT SESSIONS
    // ============================================

    workoutSessions: {
        getAll: async (): Promise<WorkoutSession[]> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getById: async (id: string): Promise<WorkoutSession | null> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        getByCreator: async (creatorId: string): Promise<WorkoutSession[]> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('creator_id', creatorId)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getPublic: async (): Promise<WorkoutSession[]> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        create: async (session: Omit<WorkoutSession, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutSession> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .insert([session])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<WorkoutSession>): Promise<WorkoutSession> => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            // 1. Unlink from workout logs (preserve history)
            const { error: logsError } = await supabase
                .from('workout_logs')
                .update({ session_id: null })
                .eq('session_id', id);
            if (logsError) throw logsError;

            // 2. Delete related training plan sessions
            const { error: sessionError } = await supabase
                .from('training_plan_sessions')
                .delete()
                .eq('session_id', id);
            if (sessionError) throw sessionError;

            // 3. Delete from user favorites
            const { error: favError } = await supabase
                .from('user_favorites')
                .delete()
                .eq('item_id', id)
                .eq('item_type', 'session');
            if (favError) throw favError;

            // 4. Finally delete the session
            const { error } = await supabase
                .from('workout_sessions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // TRAINING PLANS
    // ============================================

    trainingPlans: {
        getAll: async (): Promise<TrainingPlan[]> => {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getById: async (id: string): Promise<TrainingPlan | null> => {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        getByCreator: async (creatorId: string): Promise<TrainingPlan[]> => {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .eq('creator_id', creatorId)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getPublic: async (): Promise<TrainingPlan[]> => {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        create: async (plan: Omit<TrainingPlan, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingPlan> => {
            const { data, error } = await supabase
                .from('training_plans')
                .insert([plan])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<TrainingPlan>): Promise<TrainingPlan> => {
            const { data, error } = await supabase
                .from('training_plans')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            // 1. Unlink from profiles (pinned plans)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ pinned_plan_id: null })
                .eq('pinned_plan_id', id);
            if (profileError) throw profileError;

            // 2. Delete related training plan sessions
            const { error: sessionError } = await supabase
                .from('training_plan_sessions')
                .delete()
                .eq('plan_id', id);
            if (sessionError) throw sessionError;

            // Delete plan assignments
            const { error: assignError } = await supabase
                .from('training_plan_assignments')
                .delete()
                .eq('plan_id', id);
            if (assignError) throw assignError;

            // Delete from user favorites
            const { error: favError } = await supabase
                .from('user_favorites')
                .delete()
                .eq('item_id', id)
                .eq('item_type', 'plan');
            if (favError) throw favError;

            // Finally delete the plan
            const { error } = await supabase
                .from('training_plans')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // TRAINING PLAN SESSIONS
    // ============================================

    trainingPlanSessions: {
        getByPlan: async (planId: string): Promise<TrainingPlanSession[]> => {
            const { data, error } = await supabase
                .from('training_plan_sessions')
                .select('*')
                .eq('plan_id', planId)
                .order('day_number', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        create: async (planSession: Omit<TrainingPlanSession, 'id'>): Promise<TrainingPlanSession> => {
            const { data, error } = await supabase
                .from('training_plan_sessions')
                .insert([planSession])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        createBulk: async (planSessions: Omit<TrainingPlanSession, 'id'>[]): Promise<TrainingPlanSession[]> => {
            const { data, error } = await supabase
                .from('training_plan_sessions')
                .insert(planSessions)
                .select();
            if (error) throw error;
            return data || [];
        },

        deleteByPlan: async (planId: string): Promise<void> => {
            const { error } = await supabase
                .from('training_plan_sessions')
                .delete()
                .eq('plan_id', planId);
            if (error) throw error;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('training_plan_sessions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // TRAINING PLAN ASSIGNMENTS
    // ============================================

    trainingPlanAssignments: {
        getByUser: async (userId: string): Promise<TrainingPlanAssignment[]> => {
            const { data, error } = await supabase
                .from('training_plan_assignments')
                .select('*')
                .eq('user_id', userId)
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getActiveByUser: async (userId: string): Promise<TrainingPlanAssignment | null> => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('training_plan_assignments')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .order('start_date', { ascending: false })
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        create: async (assignment: Omit<TrainingPlanAssignment, 'id' | 'created_at'>): Promise<TrainingPlanAssignment> => {
            const { data, error } = await supabase
                .from('training_plan_assignments')
                .insert([assignment])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<TrainingPlanAssignment>): Promise<TrainingPlanAssignment> => {
            const { data, error } = await supabase
                .from('training_plan_assignments')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('training_plan_assignments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // WORKOUT LOGS
    // ============================================

    workoutLogs: {
        getAll: async (): Promise<WorkoutLog[]> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByUser: async (userId: string, limit = 50): Promise<WorkoutLog[]> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        },

        getById: async (id: string): Promise<WorkoutLog | null> => {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*, exercise_logs(*)')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        create: async (log: Omit<WorkoutLog, 'id' | 'created_at' | 'total_duration_seconds' | 'total_work_seconds'>): Promise<WorkoutLog> => {
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
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('workout_logs')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // EXERCISE LOGS
    // ============================================

    exerciseLogs: {
        getByWorkout: async (workoutLogId: string): Promise<ExerciseLog[]> => {
            const { data, error } = await supabase
                .from('exercise_logs')
                .select('*')
                .eq('workout_log_id', workoutLogId)
                .order('exercise_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        create: async (log: Omit<ExerciseLog, 'id' | 'created_at'>): Promise<ExerciseLog> => {
            const { data, error } = await supabase
                .from('exercise_logs')
                .insert([log])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<ExerciseLog>): Promise<ExerciseLog> => {
            const { data, error } = await supabase
                .from('exercise_logs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        addSet: async (exerciseLogId: string, setData: LoggedSet): Promise<ExerciseLog> => {
            // Get current exercise log
            const { data: currentLog, error: fetchError } = await supabase
                .from('exercise_logs')
                .select('sets')
                .eq('id', exerciseLogId)
                .single();

            if (fetchError) throw fetchError;

            // Append new set
            const updatedSets = [...(currentLog.sets || []), setData];

            // Update with new set
            const { data, error } = await supabase
                .from('exercise_logs')
                .update({ sets: updatedSets })
                .eq('id', exerciseLogId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        updateLastSetRest: async (exerciseLogId: string, restSeconds: number): Promise<ExerciseLog> => {
            // Get current exercise log
            const { data: currentLog, error: fetchError } = await supabase
                .from('exercise_logs')
                .select('sets')
                .eq('id', exerciseLogId)
                .single();

            if (fetchError) throw fetchError;

            const sets = currentLog.sets || [];
            if (sets.length === 0) throw new Error('No sets to update');

            // Update last set's rest_after_seconds
            sets[sets.length - 1].rest_after_seconds = restSeconds;

            // Save updated sets
            const { data, error } = await supabase
                .from('exercise_logs')
                .update({ sets })
                .eq('id', exerciseLogId)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ============================================
    // PERSONAL RECORDS
    // ============================================

    personalRecords: {
        getCurrentByUser: async (userId: string): Promise<PersonalRecord[]> => {
            const { data, error } = await supabase
                .from('personal_records')
                .select('*')
                .eq('user_id', userId)
                .eq('is_current', true)
                .order('achieved_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getByExercise: async (userId: string, exerciseId: string): Promise<PersonalRecord[]> => {
            const { data, error } = await supabase
                .from('personal_records')
                .select('*')
                .eq('user_id', userId)
                .eq('exercise_id', exerciseId)
                .order('achieved_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        create: async (record: Omit<PersonalRecord, 'id' | 'created_at'>): Promise<PersonalRecord> => {
            const { data, error } = await supabase
                .from('personal_records')
                .insert([record])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<PersonalRecord>): Promise<PersonalRecord> => {
            const { data, error } = await supabase
                .from('personal_records')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ============================================
    // USER FOLLOWS
    // ============================================

    userFollows: {
        getFollowers: async (userId: string): Promise<UserFollow[]> => {
            const { data, error } = await supabase
                .from('user_follows')
                .select('*')
                .eq('following_id', userId);
            if (error) throw error;
            return data || [];
        },

        getFollowing: async (userId: string): Promise<UserFollow[]> => {
            const { data, error } = await supabase
                .from('user_follows')
                .select('*')
                .eq('follower_id', userId);
            if (error) throw error;
            return data || [];
        },

        isFollowing: async (followerId: string, followingId: string): Promise<boolean> => {
            const { data, error } = await supabase
                .from('user_follows')
                .select('*')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .single();
            return !!data;
        },

        follow: async (followerId: string, followingId: string): Promise<UserFollow> => {
            const { data, error } = await supabase
                .from('user_follows')
                .insert([{ follower_id: followerId, following_id: followingId }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        unfollow: async (followerId: string, followingId: string): Promise<void> => {
            const { error } = await supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);
            if (error) throw error;
        }
    },

    // ============================================
    // COACHING RELATIONSHIPS
    // ============================================

    coachingRelationships: {
        getByUser: async (userId: string): Promise<CoachingRelationship[]> => {
            const { data, error } = await supabase
                .from('coaching_relationships')
                .select('*')
                .or(`coach_id.eq.${userId},athlete_id.eq.${userId}`);
            if (error) throw error;
            return data || [];
        },

        getAsCoach: async (coachId: string): Promise<CoachingRelationship[]> => {
            const { data, error } = await supabase
                .from('coaching_relationships')
                .select('*')
                .eq('coach_id', coachId)
                .eq('status', 'active');
            if (error) throw error;
            return data || [];
        },

        getAsAthlete: async (athleteId: string): Promise<CoachingRelationship[]> => {
            const { data, error } = await supabase
                .from('coaching_relationships')
                .select('*')
                .eq('athlete_id', athleteId)
                .eq('status', 'active');
            if (error) throw error;
            return data || [];
        },

        create: async (relationship: Omit<CoachingRelationship, 'id' | 'created_at' | 'updated_at'>): Promise<CoachingRelationship> => {
            const { data, error } = await supabase
                .from('coaching_relationships')
                .insert([relationship])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (id: string, updates: Partial<CoachingRelationship>): Promise<CoachingRelationship> => {
            const { data, error } = await supabase
                .from('coaching_relationships')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ============================================
    // ACTIVITY POSTS
    // ============================================

    activityPosts: {
        getFollowedFeed: async (userId: string, limit = 50): Promise<ActivityPost[]> => {
            // Get list of users the current user follows
            const { data: following } = await supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', userId);

            const followingIds = following?.map(f => f.following_id) || [];

            const { data, error } = await supabase
                .from('activity_posts')
                .select('*')
                .in('user_id', followingIds)
                .in('visibility', ['public', 'followers'])
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        },

        getGlobalFeed: async (limit = 50): Promise<ActivityPost[]> => {
            const { data, error } = await supabase
                .from('activity_posts')
                .select('*')
                .eq('visibility', 'public')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        },

        getByUser: async (userId: string, viewerId?: string): Promise<ActivityPost[]> => {
            let query = supabase
                .from('activity_posts')
                .select('*')
                .eq('user_id', userId);

            // Filter by visibility based on viewer
            if (!viewerId || viewerId !== userId) {
                query = query.eq('visibility', 'public');
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        create: async (post: Omit<ActivityPost, 'id' | 'created_at'>): Promise<ActivityPost> => {
            const { data, error } = await supabase
                .from('activity_posts')
                .insert([post])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('activity_posts')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // POST LIKES
    // ============================================

    postLikes: {
        getByPost: async (postId: string): Promise<PostLike[]> => {
            const { data, error } = await supabase
                .from('post_likes')
                .select('*')
                .eq('post_id', postId);
            if (error) throw error;
            return data || [];
        },

        hasLiked: async (postId: string, userId: string): Promise<boolean> => {
            const { data } = await supabase
                .from('post_likes')
                .select('*')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .single();
            return !!data;
        },

        like: async (postId: string, userId: string): Promise<PostLike> => {
            const { data, error } = await supabase
                .from('post_likes')
                .insert([{ post_id: postId, user_id: userId }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        unlike: async (postId: string, userId: string): Promise<void> => {
            const { error } = await supabase
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId);
            if (error) throw error;
        }
    },

    // ============================================
    // POST COMMENTS
    // ============================================

    postComments: {
        getByPost: async (postId: string): Promise<PostComment[]> => {
            const { data, error } = await supabase
                .from('post_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        create: async (comment: Omit<PostComment, 'id' | 'created_at'>): Promise<PostComment> => {
            const { data, error } = await supabase
                .from('post_comments')
                .insert([comment])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('post_comments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ============================================
    // USER FAVORITES
    // ============================================

    userFavorites: {
        getByUser: async (userId: string): Promise<UserFavorite[]> => {
            const { data, error } = await supabase
                .from('user_favorites')
                .select('*')
                .eq('user_id', userId);
            if (error) throw error;
            return data || [];
        },

        isFavorited: async (userId: string, itemType: 'plan' | 'session', itemId: string): Promise<boolean> => {
            const { data } = await supabase
                .from('user_favorites')
                .select('*')
                .eq('user_id', userId)
                .eq('item_type', itemType)
                .eq('item_id', itemId)
                .single();
            return !!data;
        },

        add: async (userId: string, itemType: 'plan' | 'session', itemId: string): Promise<UserFavorite> => {
            const { data, error } = await supabase
                .from('user_favorites')
                .insert([{ user_id: userId, item_type: itemType, item_id: itemId }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        remove: async (userId: string, itemType: 'plan' | 'session', itemId: string): Promise<void> => {
            const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', userId)
                .eq('item_type', itemType)
                .eq('item_id', itemId);
            if (error) throw error;
        }
    },

    // ============================================
    // DIRECT MESSAGES
    // ============================================

    directMessages: {
        getConversation: async (userId: string, otherUserId: string): Promise<DirectMessage[]> => {
            const { data, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        getConversations: async (userId: string): Promise<DirectMessage[]> => {
            const { data, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        send: async (senderId: string, recipientId: string, content: string): Promise<DirectMessage> => {
            const { data, error } = await supabase
                .from('direct_messages')
                .insert([{ sender_id: senderId, recipient_id: recipientId, content }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        markAsRead: async (messageId: string): Promise<DirectMessage> => {
            const { data, error } = await supabase
                .from('direct_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', messageId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ============================================
    // NOTIFICATIONS
    // ============================================

    notifications: {
        getByUser: async (userId: string, limit = 50): Promise<Notification[]> => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        },

        getUnreadCount: async (userId: string): Promise<number> => {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return count || 0;
        },

        markAsRead: async (notificationId: string): Promise<Notification> => {
            const { data, error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        markAllAsRead: async (userId: string): Promise<void> => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
        },

        create: async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> => {
            const { data, error } = await supabase
                .from('notifications')
                .insert([notification])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ============================================
    // AI CHATS
    // ============================================

    aiChats: {
        getByUser: async (userId: string): Promise<AIChat[]> => {
            const { data, error } = await supabase
                .from('ai_chats')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        getById: async (chatId: string): Promise<AIChat | null> => {
            const { data, error } = await supabase
                .from('ai_chats')
                .select('*')
                .eq('id', chatId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        create: async (chat: Omit<AIChat, 'id' | 'created_at' | 'updated_at'>): Promise<AIChat> => {
            const { data, error } = await supabase
                .from('ai_chats')
                .insert([chat])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        update: async (chatId: string, updates: Partial<AIChat>): Promise<AIChat> => {
            const { data, error } = await supabase
                .from('ai_chats')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', chatId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        delete: async (chatId: string): Promise<void> => {
            const { error } = await supabase
                .from('ai_chats')
                .delete()
                .eq('id', chatId);
            if (error) throw error;
        }
    },

    // ============================================
    // EXERCISES (unchanged from old version)
    // ============================================

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
                .order('name')
                .limit(20);
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
    ...db,
    // Add admin overrides if needed
};