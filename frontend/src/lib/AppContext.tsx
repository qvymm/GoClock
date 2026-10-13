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
  setProfile: (p: Profile | null) => void;
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
  const [screen, setScreen] = useState<AppScreen>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [notificationCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setIsAuthenticated(Boolean(u));
      if (event === 'PASSWORD_RECOVERY') {
        setScreen('resetPassword');
        return;
      }
      if (u) {
        loadProfile(u.id);
      } else {
        setProfile(null);
        setTasks([]);
        setMeals([]);
        setSleepLogs([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const loadedProfile = data as Profile | null;
    setProfile(loadedProfile);
    setScreen(loadedProfile?.onboarding_completed ? 'dashboard' : 'onboarding');
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
    setScreen('login');
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
