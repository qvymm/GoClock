import { useEffect, useState } from 'react';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

export type AdminStats = {
  totalUsers: number;
  activeUsersToday: number;
  premiumUsers: number;
  monthlyRevenue: number;
  totalTasks: number;
  totalMeals: number;
  totalSleepLogs: number;
  completedTasks: number;
};

export const MOCK_ADMIN_STATS: AdminStats = {
  totalUsers: 12_450,
  activeUsersToday: 3_245,
  premiumUsers: 1_025,
  monthlyRevenue: 52_000_000,
  totalTasks: 24_850,
  totalMeals: 18_430,
  totalSleepLogs: 4_230,
  completedTasks: 21_668,
};

function asCount(value: number | null) {
  return value ?? 0;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(MOCK_ADMIN_STATS);
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      if (!isSupabaseEnabled) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();
        const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const [
          usersResult,
          premiumUsersResult,
          activePremiumProfilesResult,
          tasksResult,
          mealsResult,
          sleepResult,
          completedTasksResult,
          tasksTodayResult,
          mealsTodayResult,
          sleepTodayResult,
          premiumOrdersResult,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
          supabase.from('profiles').select('id').eq('is_premium', true).gt('premium_until', new Date().toISOString()),
          supabase.from('tasks').select('id', { count: 'exact', head: true }),
          supabase.from('meals').select('id', { count: 'exact', head: true }),
          supabase.from('sleep_logs').select('id', { count: 'exact', head: true }),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('tasks').select('user_id').gte('updated_at', todayIso),
          supabase.from('meals').select('user_id').gte('eaten_at', todayIso),
          supabase.from('sleep_logs').select('user_id').gte('log_date', todayDate),
          supabase.from('premium_orders')
            .select('user_id, plan, amount, paid_at')
            .eq('status', 'paid')
            .order('paid_at', { ascending: false }),
        ]);

        const results = [
          usersResult,
          premiumUsersResult,
          activePremiumProfilesResult,
          tasksResult,
          mealsResult,
          sleepResult,
          completedTasksResult,
          tasksTodayResult,
          mealsTodayResult,
          sleepTodayResult,
          premiumOrdersResult,
        ];
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;

        const totalUsers = asCount(usersResult.count);
        const totalTasks = asCount(tasksResult.count);
        const totalMeals = asCount(mealsResult.count);
        const totalSleepLogs = asCount(sleepResult.count);
        const hasRealData = totalUsers + totalTasks + totalMeals + totalSleepLogs > 0;

        if (!hasRealData) {
          if (active) {
            setStats(MOCK_ADMIN_STATS);
            setIsUsingMockData(true);
          }
          return;
        }

        const activeUserIds = new Set([
          ...(tasksTodayResult.data ?? []).map(row => row.user_id),
          ...(mealsTodayResult.data ?? []).map(row => row.user_id),
          ...(sleepTodayResult.data ?? []).map(row => row.user_id),
        ]);
        const activePremiumIds = new Set((activePremiumProfilesResult.data ?? []).map(profile => profile.id));
        const latestOrders = new Map<string, { plan: string; amount: number }>();
        for (const order of premiumOrdersResult.data ?? []) {
          if (activePremiumIds.has(order.user_id) && !latestOrders.has(order.user_id)) {
            latestOrders.set(order.user_id, { plan: order.plan, amount: Number(order.amount ?? 0) });
          }
        }
        const monthlyRevenue = [...latestOrders.values()].reduce((sum, order) =>
          sum + (order.plan === 'yearly' ? order.amount / 12 : order.amount), 0
        );

        if (active) {
          setStats({
            totalUsers,
            activeUsersToday: activeUserIds.size,
            premiumUsers: asCount(premiumUsersResult.count),
            monthlyRevenue,
            totalTasks,
            totalMeals,
            totalSleepLogs,
            completedTasks: asCount(completedTasksResult.count),
          });
          setIsUsingMockData(false);
        }
      } catch (error) {
        console.error('Unable to load admin dashboard statistics:', error);
        if (active) {
          setStats(MOCK_ADMIN_STATS);
          setIsUsingMockData(true);
        }
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  return { stats, isUsingMockData };
}
