import { useEffect, useState } from 'react';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

export type AdminStats = {
  totalUsers: number;
  activeUsersToday: number;
  premiumUsers: number;
  monthlyRevenue: number;
  successfulTransactions: number;
  totalTasks: number;
  totalMeals: number;
  totalSleepLogs: number;
  completedTasks: number;
};

export type UserGrowthPoint = { month: string; users: number };
export type RevenuePoint = { month: string; revenue: number };

export const MOCK_ADMIN_STATS: AdminStats = {
  totalUsers: 12_450,
  activeUsersToday: 3_245,
  premiumUsers: 1_025,
  monthlyRevenue: 52_000_000,
  successfulTransactions: 3_840,
  totalTasks: 24_850,
  totalMeals: 18_430,
  totalSleepLogs: 4_230,
  completedTasks: 21_668,
};

export const MOCK_USER_GROWTH: UserGrowthPoint[] = [
  { month: 'Jan', users: 8200 },
  { month: 'Feb', users: 9100 },
  { month: 'Mar', users: 9800 },
  { month: 'Apr', users: 10400 },
  { month: 'May', users: 11200 },
  { month: 'Jun', users: 12450 },
];

export const MOCK_REVENUE_TREND: RevenuePoint[] = [
  { month: 'Jan', revenue: 24000000 },
  { month: 'Feb', revenue: 31000000 },
  { month: 'Mar', revenue: 36000000 },
  { month: 'Apr', revenue: 42000000 },
  { month: 'May', revenue: 47000000 },
  { month: 'Jun', revenue: 52000000 },
];

const MOCK_FEATURE_USAGE = [
  { name: 'Task Management', value: 45 },
  { name: 'Meal Tracking', value: 35 },
  { name: 'Sleep Planner', value: 20 },
];

type DashboardPayload = AdminStats & {
  userGrowth: UserGrowthPoint[];
  revenueTrend: RevenuePoint[];
};

function validTrend<T extends UserGrowthPoint | RevenuePoint>(value: unknown, key: 'users' | 'revenue'): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(point => {
    if (
      typeof point === 'object' &&
      point !== null &&
      'month' in point &&
      typeof point.month === 'string' &&
      key in point &&
      typeof point[key] === 'number'
    ) {
      return [{ month: point.month, [key]: point[key] } as T];
    }
    return [];
  });
}

function hasUsage(stats: AdminStats) {
  return stats.totalUsers + stats.totalTasks + stats.totalMeals + stats.totalSleepLogs > 0;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(MOCK_ADMIN_STATS);
  const [userGrowth, setUserGrowth] = useState(MOCK_USER_GROWTH);
  const [revenueTrend, setRevenueTrend] = useState(MOCK_REVENUE_TREND);
  const [isUsingMockData, setIsUsingMockData] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      if (!isSupabaseEnabled) {
        setStatsError('Chưa cấu hình kết nối Supabase.');
        return;
      }

      try {
        const [dashboardResult, transactionResult] = await Promise.all([
          supabase.rpc('get_admin_dashboard_stats'),
          supabase.rpc('get_admin_successful_transaction_count'),
        ]);
        const { data, error } = dashboardResult;
        if (error) throw error;
        if (transactionResult.error) throw transactionResult.error;
        if (!data || typeof data !== 'object') {
          throw new Error('RPC did not return dashboard statistics.');
        }

        const payload = data as DashboardPayload;
        const realStats: AdminStats = {
          totalUsers: Number(payload.totalUsers) || 0,
          activeUsersToday: Number(payload.activeUsersToday) || 0,
          premiumUsers: Number(payload.premiumUsers) || 0,
          monthlyRevenue: Number(payload.monthlyRevenue) || 0,
          successfulTransactions: Number(transactionResult.data) || 0,
          totalTasks: Number(payload.totalTasks) || 0,
          totalMeals: Number(payload.totalMeals) || 0,
          totalSleepLogs: Number(payload.totalSleepLogs) || 0,
          completedTasks: Number(payload.completedTasks) || 0,
        };

        if (!hasUsage(realStats)) {
          if (active) {
            setStats(MOCK_ADMIN_STATS);
            setUserGrowth(MOCK_USER_GROWTH);
            setRevenueTrend(MOCK_REVENUE_TREND);
            setIsUsingMockData(true);
            setStatsError('Supabase trả về 0 bản ghi cho người dùng, công việc, bữa ăn và giấc ngủ; đang hiển thị số liệu demo.');
          }
          return;
        }

        const realUserGrowth = validTrend<UserGrowthPoint>(payload.userGrowth, 'users');
        const realRevenueTrend = validTrend<RevenuePoint>(payload.revenueTrend, 'revenue');
        if (active) {
          setStats(realStats);
          setUserGrowth(realUserGrowth.length ? realUserGrowth : MOCK_USER_GROWTH);
          setRevenueTrend(realRevenueTrend.length ? realRevenueTrend : MOCK_REVENUE_TREND);
          setIsUsingMockData(false);
          setStatsError(null);
        }
      } catch (error) {
        console.error('Unable to load admin dashboard statistics:', error);
        if (active) {
          setStats(MOCK_ADMIN_STATS);
          setUserGrowth(MOCK_USER_GROWTH);
          setRevenueTrend(MOCK_REVENUE_TREND);
          setIsUsingMockData(true);
          setStatsError(error instanceof Error ? error.message : 'Không thể tải thống kê Supabase.');
        }
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  const totalFeatures = stats.totalTasks + stats.totalMeals + stats.totalSleepLogs;
  const featureUsage = totalFeatures > 0
    ? [
        { name: 'Task Management', value: Math.round(stats.totalTasks * 100 / totalFeatures) },
        { name: 'Meal Tracking', value: Math.round(stats.totalMeals * 100 / totalFeatures) },
        { name: 'Sleep Planner', value: Math.round(stats.totalSleepLogs * 100 / totalFeatures) },
      ]
    : MOCK_FEATURE_USAGE;

  return { stats, userGrowth, revenueTrend, featureUsage, isUsingMockData, statsError };
}
