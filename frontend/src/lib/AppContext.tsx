import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseEnabled, Profile, Task, Meal, SleepLog } from './supabase';
import type { User } from '@supabase/supabase-js';

type AppScreen =

  | 'splash'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'forgotPassword'
  | 'resetPassword'
  | 'adminDashboard'
  | 'dashboard'
  | 'calendar'
  | 'nutrition'
  | 'sleep'
  | 'profile'
  | 'settings'
  | 'help'
  | 'guide'
  | 'premium'
  | 'tracking'
  | 'aiChat';

type AppContextType = {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginAdmin: (email: string, password: string) => boolean;
  user: User | null;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  tasks: Task[];
  meals: Meal[];
  sleepLogs: SleepLog[];
  refreshTasks: () => Promise<void>;
  refreshMeals: () => Promise<void>;
  refreshSleep: () => Promise<void>;
  logout: () => Promise<void>;
  notificationCount: number;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>(isSupabaseEnabled ? 'splash' : 'dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [notificationCount] = useState(3);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === 'PASSWORD_RECOVERY') {
        setScreen('resetPassword');
        return;
      }
      if (u) {
        loadProfile(u.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const pendingStr = localStorage.getItem('pending_onboarding');
    if (pendingStr) {
      try {
        const pendingData = JSON.parse(pendingStr);
        localStorage.removeItem('pending_onboarding');
        
        const h = pendingData.height || 170, w = pendingData.weight || 60;
        const bmi = w / ((h / 100) ** 2);
        const activityMap: Record<string, string> = {
          sedentary: 'sedentary', light: 'light', active: 'active',
        };
        const gender = pendingData.gender || 'male';
        const tdee = Math.round(
          (gender === 'male' ? 88.36 : 447.6) +
          (gender === 'male' ? 13.4 : 9.25) * w +
          (gender === 'male' ? 4.8 : 3.10) * h -
          (gender === 'male' ? 5.68 : 4.33) * 25
        );
        const wakeTimeStr = `${String(pendingData.wakeHour || 6).padStart(2, '0')}:${String(pendingData.wakeMinute || 30).padStart(2, '0')}`;
        
        const { data: newProfile } = await supabase.from('profiles').upsert({
          id: userId,
          nickname: pendingData.nickname || 'Bạn',
          full_name: pendingData.nickname || 'Bạn',
          gender: pendingData.gender || 'other',
          date_of_birth: pendingData.dob || new Date().toISOString().split('T')[0],
          height: h,
          weight: w,
          bmi: Math.round(bmi * 10) / 10,
          tdee,
          activity_level: activityMap[pendingData.activity] || 'light',
          primary_goal: pendingData.goal || 'focus',
          wake_time: wakeTimeStr,
          notifications_enabled: pendingData.notifGranted || false,
          onboarding_completed: true,
        }).select().maybeSingle();

        if (newProfile) {
          setProfile(newProfile as Profile);
          setScreen('dashboard');
          return;
        }
      } catch (e) {
        console.error("Error saving pending onboarding:", e);
      }
    }

    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      if (data.onboarding_completed) {
        setScreen('dashboard');
      } else {
        setScreen('onboarding');
      }
    } else {
      setScreen('onboarding');
    }
  }

  async function refreshTasks() {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('user_id', user.id)
      .order('deadline', { ascending: true });
    if (data) setTasks(data as Task[]);
  }

  async function refreshMeals() {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('eaten_at', today + 'T00:00:00')
      .lte('eaten_at', today + 'T23:59:59')
      .order('eaten_at', { ascending: true });
    if (data) setMeals(data as Meal[]);
  }

  async function refreshSleep() {
    if (!user) return;
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(7);
    if (data) setSleepLogs(data as SleepLog[]);
  }

  useEffect(() => {
    if (user) {
      refreshTasks();
      refreshMeals();
      refreshSleep();
    }
  }, [user]);

  function loginAdmin(email: string, password: string) {
    const isValid = email === 'admin@goclock.com' && password === 'admin';
    if (isValid) {
      setIsAuthenticated(true);
      setIsAdmin(true);
      setScreen('adminDashboard');
    }
    return isValid;
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    setProfile(null);
    setTasks([]);
    setMeals([]);
    setSleepLogs([]);
    setScreen('splash');
  }

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      isAuthenticated,
      isAdmin,
      loginAdmin,
      user, profile, setProfile,
      tasks, meals, sleepLogs,
      refreshTasks, refreshMeals, refreshSleep,
      logout, notificationCount,
      theme, setTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
