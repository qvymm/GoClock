import { createClient } from '@supabase/supabase-js';

const expoPublicSupabaseUrl =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SUPABASE_URL : undefined;
const expoPublicSupabaseAnonKey =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY : undefined;
const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

const supabaseUrl =
  expoPublicSupabaseUrl ??
  viteEnv?.VITE_SUPABASE_URL;

const supabaseAnonKey =
  expoPublicSupabaseAnonKey ??
  viteEnv?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

function createDummySupabase() {
  const chainable = {
    select: async () => ({ data: [], error: null }),
    eq() { return this; },
    gte() { return this; },
    lte() { return this; },
    order() { return this; },
    limit() { return this; },
    maybeSingle() { return this; },
    upsert: async () => ({ data: null, error: null }),
  };

  return {
    auth: {
      onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signInWithOAuth: async () => ({ data: null, error: null }),
    },
    from: () => chainable,
  } as any;
}

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createDummySupabase();

export type Profile = {
  id: string;
  username?: string;
  full_name?: string;
  phone?: string;
  nickname?: string;
  date_of_birth?: string;
  avatar_url?: string;
  height?: number;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bmi?: number;
  tdee?: number;
  primary_goal?: 'sleep' | 'nutrition' | 'study' | 'balance';
  wake_time?: string;
  notifications_enabled?: boolean;
  onboarding_completed?: boolean;
  is_premium?: boolean;
  premium_until?: string;
  notify_tasks?: boolean;
  notify_meals?: boolean;
  notify_sleep?: boolean;
  meal_breakfast?: string;
  meal_lunch?: string;
  meal_dinner?: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'study' | 'deadline' | 'group' | 'personal' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  deadline?: string;
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly';
  remind_before: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  subtasks?: SubTask[];
};

export type SubTask = {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export type Meal = {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url?: string;
  eaten_at: string;
  created_at: string;
};

export type SleepLog = {
  id: string;
  user_id: string;
  bedtime?: string;
  wake_time?: string;
  cycles: number;
  duration_minutes?: number;
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  target_bedtime?: string;
  target_wake_time?: string;
  log_date: string;
  created_at: string;
};

export type UserStats = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
  total_meals_logged: number;
  total_sleep_logs: number;
  productivity_score: number;
  wellness_score: number;
  last_activity_date: string;
  badges: any[];
  milestones: any[];
};

export type DailyTracking = {
  id: string;
  user_id: string;
  track_date: string;
  tasks_total: number;
  tasks_completed: number;
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sleep_minutes: number;
  sleep_quality: string;
  water_glasses: number;
  steps_count: number;
  mood: string;
  notes: string;
};

export type Badge = {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
  metadata: any;
};
