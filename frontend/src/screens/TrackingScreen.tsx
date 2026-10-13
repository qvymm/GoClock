import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Flame, Moon, Sun, CheckCircle2, Trophy, Star, Zap, Calendar, ChevronLeft, ChevronRight, Award, BarChart3, PieChart, Activity, Brain, Sparkles, Flame as Fire, Medal, Crown } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';

type TabType = 'daily' | 'weekly' | 'monthly' | 'insights';
type TimeRange = 'day' | 'week' | 'month';

interface DailyStats {
  tasksTotal: number;
  tasksCompleted: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sleepMinutes: number;
  sleepQuality: string;
  waterGlasses: number;
  streak: number;
}

interface WeeklyStats {
  tasksTotal: number;
  tasksCompleted: number;
  avgSleepHours: number;
  avgCalories: number;
  avgProtein: number;
  habitScore: number;
  productivityScore: number;
  comparisonTasks: number;
  comparisonSleep: number;
  comparisonCalories: number;
  bestDay: string;
}

interface MonthlyStats {
  tasksTotal: number;
  tasksCompleted: number;
  goalRate: number;
  avgSleepHours: number;
  avgCalories: number;
  bestHabit: string;
  achievements: string[];
  weightChange: number | null;
}

interface Badge {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  color: string;
}

export function TrackingScreen() {
  const { user, profile, tasks, meals, sleepLogs, theme, setScreen } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [streak] = useState(0);
  const [badges] = useState<Badge[]>([]);

  // Calculate daily stats
  const dailyStats: DailyStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      return t.deadline.startsWith(today);
    });
    const todayMeals = meals.filter(m => m.eaten_at?.startsWith(today));
    const todaySleep = sleepLogs.find(s => s.log_date === today);

    return {
      tasksTotal: todayTasks.length,
      tasksCompleted: todayTasks.filter(t => t.status === 'completed').length,
      calories: todayMeals.reduce((s, m) => s + (m.calories || 0), 0),
      protein: todayMeals.reduce((s, m) => s + (m.protein || 0), 0),
      carbs: todayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
      fat: todayMeals.reduce((s, m) => s + (m.fat || 0), 0),
      sleepMinutes: todaySleep?.duration_minutes || 0,
      sleepQuality: todaySleep?.quality || '',
      waterGlasses: 0,
      streak,
    };
  }, [tasks, meals, sleepLogs, streak]);

  // Calculate weekly stats
  const weeklyStats: WeeklyStats = useMemo(() => {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);
    const inRange = (value?: string, from = start, to = end) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= from && date < to;
    };
    const weekTasks = tasks.filter(task => inRange(task.deadline || task.created_at));
    const previousTasks = tasks.filter(task => inRange(task.deadline || task.created_at, previousStart, start));
    const weekMeals = meals.filter(meal => inRange(meal.eaten_at));
    const weekSleep = sleepLogs.filter(log => inRange(log.log_date));
    const completed = weekTasks.filter(task => task.status === 'completed').length;
    const previousCompleted = previousTasks.filter(task => task.status === 'completed').length;
    const avgSleepHours = weekSleep.length
      ? weekSleep.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / weekSleep.length / 60
      : 0;
    const previousSleep = sleepLogs.filter(log => inRange(log.log_date, previousStart, start));
    const previousAvgSleep = previousSleep.length
      ? previousSleep.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / previousSleep.length / 60
      : 0;
    const previousCalories = meals.filter(meal => inRange(meal.eaten_at, previousStart, start)).reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const currentCalories = weekMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const dailyCompletion = weekTasks.reduce<Record<string, { total: number; done: number }>>((result, task) => {
      const day = (task.deadline || task.created_at).slice(0, 10);
      result[day] ||= { total: 0, done: 0 };
      result[day].total += 1;
      if (task.status === 'completed') result[day].done += 1;
      return result;
    }, {});
    const bestDay = Object.entries(dailyCompletion).sort((a, b) => b[1].done - a[1].done)[0]?.[0];
    return {
      tasksTotal: weekTasks.length,
      tasksCompleted: completed,
      avgSleepHours: Math.round(avgSleepHours * 10) / 10,
      avgCalories: weekMeals.length ? Math.round(currentCalories / weekMeals.length) : 0,
      avgProtein: weekMeals.length ? Math.round(weekMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0) / weekMeals.length) : 0,
      habitScore: weekTasks.length ? Math.round(completed / weekTasks.length * 100) : 0,
      productivityScore: weekTasks.length ? Math.round(completed / weekTasks.length * 100) : 0,
      comparisonTasks: completed - previousCompleted,
      comparisonSleep: Math.round((avgSleepHours - previousAvgSleep) * 10) / 10,
      comparisonCalories: currentCalories - previousCalories,
      bestDay: bestDay ? new Date(`${bestDay}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long' }) : 'â€”',
    };
  }, [currentDate, tasks, meals, sleepLogs]);

  // Calculate monthly stats
  const monthlyStats: MonthlyStats = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const inMonth = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= start && date < end;
    };
    const monthTasks = tasks.filter(task => inMonth(task.deadline || task.created_at));
    const monthMeals = meals.filter(meal => inMonth(meal.eaten_at));
    const monthSleep = sleepLogs.filter(log => inMonth(log.log_date));
    const completed = monthTasks.filter(task => task.status === 'completed').length;
    return {
      tasksTotal: monthTasks.length,
      tasksCompleted: completed,
      goalRate: monthTasks.length ? Math.round(completed / monthTasks.length * 100) : 0,
      avgSleepHours: monthSleep.length ? Math.round(monthSleep.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / monthSleep.length / 60 * 10) / 10 : 0,
      avgCalories: monthMeals.length ? Math.round(monthMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / monthMeals.length) : 0,
      bestHabit: monthTasks.length || monthSleep.length || monthMeals.length ? 'Dá»¯ liá»‡u Ä‘Ã£ ghi nháº­n' : 'ChÆ°a cÃ³ dá»¯ liá»‡u',
      achievements: [],
      weightChange: null,
    };
  }, [currentDate, tasks, meals, sleepLogs]);

  // AI-generated insights
  const aiInsights = useMemo(() => {
    const insights = [];
    const strengths = [];
    const improvements = [];
    const suggestions = [];

    // Task insights
    const taskRate = dailyStats.tasksCompleted / Math.max(1, dailyStats.tasksTotal);
    if (taskRate >= 0.8) {
      strengths.push({ area: 'NÄƒng suáº¥t', detail: 'Tá»· lá»‡ hoÃ n thÃ nh task cao (80%+)', icon: 'ðŸŽ¯' });
    } else if (taskRate < 0.5) {
      improvements.push({ area: 'NÄƒng suáº¥t', detail: 'Tá»· lá»‡ task hoÃ n thÃ nh cÃ²n tháº¥p', icon: 'ðŸ“‰' });
      suggestions.push('Thá»­ chia nhá» task lá»›n thÃ nh cÃ¡c bÆ°á»›c cá»¥ thá»ƒ hÆ¡n');
    }

    // Sleep insights
    if (dailyStats.sleepMinutes >= 420) {
      strengths.push({ area: 'Giáº¥c ngá»§', detail: 'Báº¡n Ä‘ang ngá»§ Ä‘á»§ giáº¥c (7h+)', icon: 'ðŸ˜´' });
    } else {
      improvements.push({ area: 'Giáº¥c ngá»§', detail: 'Giáº¥c ngá»§ dÆ°á»›i má»©c khuyáº¿n nghá»‹', icon: 'ðŸŒ™' });
      suggestions.push('Cá»‘ gáº¯ng Ä‘i ngá»§ sá»›m hÆ¡n 30 phÃºt má»—i Ä‘Ãªm');
    }

    // Nutrition insights
    const targetCal = profile?.tdee || 0;
    if (targetCal > 0 && dailyStats.calories >= targetCal * 0.8 && dailyStats.calories <= targetCal * 1.1) {
      strengths.push({ area: 'Dinh dÆ°á»¡ng', detail: 'LÆ°á»£ng calo cÃ¢n Ä‘á»‘i vá»›i má»¥c tiÃªu', icon: 'ðŸ¥—' });
    } else if (targetCal > 0 && dailyStats.calories < targetCal * 0.6) {
      improvements.push({ area: 'Dinh dÆ°á»¡ng', detail: 'Thiáº¿u calo, cáº§n bá»• sung nÄƒng lÆ°á»£ng', icon: 'ðŸ½ï¸' });
      suggestions.push('ThÃªm bá»¯a phá»¥ giá»¯a trÆ°a hoáº·c chiá»u');
    }

    // Protein check
    if (dailyStats.protein >= 60) {
      strengths.push({ area: 'Protein', detail: 'Äáº¡m Ä‘á»§ cho cÆ¡ thá»ƒ hoáº¡t Ä‘á»™ng', icon: 'ðŸ’ª' });
    } else {
      improvements.push({ area: 'Protein', detail: 'Thiáº¿u Ä‘áº¡m, cáº§n thÃªm thá»±c pháº©m giÃ u protein', icon: 'ðŸ¥©' });
    }

    // Streak motivation
    if (streak >= 7) {
      insights.push({ type: 'achievement', text: `Tuyá»‡t vá»i! Báº¡n Ä‘Ã£ duy trÃ¬ streak ${streak} ngÃ y!`, highlight: streak.toString() });
    }

    if (tasks.length === 0 && meals.length === 0 && sleepLogs.length === 0) {
      return { insights: [], strengths: [], improvements: [], suggestions: [] };
    }

    return { insights, strengths, improvements, suggestions };
  }, [dailyStats, streak, profile]);

  function getWeekDays() {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function getMonthWeeks() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let current = new Date(firstDay);
    while (current <= lastDay) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push({ start: weekStart, end: weekEnd });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }

  const weekDays = getWeekDays();
  const todayStr = new Date().toISOString().split('T')[0];

  // Mini chart component for weekly visualization
  function MiniChart({ data, height = 40 }: { data: number[]; height?: number }) {
    const max = Math.max(...data, 1);
    return (
      <svg width="100%" height={height} className="overflow-visible">
        {data.map((val, i) => {
          const barWidth = 100 / data.length - 4;
          const x = (i * 100) / data.length + 2;
          const barHeight = (val / max) * (height - 4);
          return (
            <rect
              key={i}
              x={`${x}%`}
              y={height - barHeight}
              width={`${barWidth}%`}
              height={barHeight}
              rx="2"
              fill={theme === 'dark' ? '#94d400' : '#173325'}
              opacity={0.7 + (i / data.length) * 0.3}
            />
          );
        })}
      </svg>
    );
  }

  // Progress ring component
  function ProgressRing({ progress, size = 80, strokeWidth = 8, children }: { progress: number; size?: number; strokeWidth?: number; children?: React.ReactNode }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8f0e8'} strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#94d400" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-4" style={{ background: 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={20} className="text-white/70" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Tiáº¿n Ä‘á»™ cá»§a tÃ´i</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Theo dÃµi hÃ nh trÃ¬nh phÃ¡t triá»ƒn</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Fire size={16} style={{ color: '#e65100' }} />
            <span className="font-bold text-sm text-white">{streak}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>ngÃ y</span>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {[
            { id: 'daily', label: 'HÃ´m nay', icon: Sun },
            { id: 'weekly', label: 'Tuáº§n', icon: Calendar },
            { id: 'monthly', label: 'ThÃ¡ng', icon: BarChart3 },
            { id: 'insights', label: 'AI', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={activeTab === tab.id
                ? { background: '#94d400', color: '#0d1f12' }
                : { color: 'rgba(255,255,255,0.6)' }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4">
        {activeTab === 'daily' && (
          <DailyTrackingView
            stats={dailyStats}
            theme={theme}
            profile={profile}
            ProgressRing={ProgressRing}
            MiniChart={MiniChart}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyTrackingView
            stats={weeklyStats}
            tasks={tasks}
            theme={theme}
            weekDays={weekDays}
            todayStr={todayStr}
            ProgressRing={ProgressRing}
            MiniChart={MiniChart}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyTrackingView
            stats={monthlyStats}
            theme={theme}
            badges={badges}
            milestones={[]}
            ProfileRing={ProgressRing}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            insights={aiInsights}
            theme={theme}
            streak={streak}
            dailyStats={dailyStats}
          />
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

// Daily Tracking View Component
function DailyTrackingView({ stats, theme, profile, ProgressRing, MiniChart }: any) {
  const taskRate = Math.round((stats.tasksCompleted / Math.max(1, stats.tasksTotal)) * 100);
  const targetCal = profile?.tdee || 0;
  const calRate = targetCal ? Math.round((stats.calories / targetCal) * 100) : 0;
  const sleepHours = Math.round(stats.sleepMinutes / 60 * 10) / 10;

  return (
    <div className="flex flex-col gap-3">
      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl p-3 text-center" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <div className="flex justify-center mb-2">
            <ProgressRing progress={taskRate} size={50} strokeWidth={5}>
              <span className="text-sm font-bold" style={{ color: '#94d400' }}>{taskRate}%</span>
            </ProgressRing>
          </div>
          <p className="text-xs font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{stats.tasksCompleted}/{stats.tasksTotal}</p>
          <p className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Tasks</p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <div className="flex justify-center mb-2">
            <ProgressRing progress={Math.min(calRate, 100)} size={50} strokeWidth={5}>
              <Flame size={18} style={{ color: '#e65100' }} />
            </ProgressRing>
          </div>
          <p className="text-xs font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{stats.calories}</p>
          <p className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Calo</p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <div className="flex justify-center mb-2">
            <ProgressRing progress={(sleepHours / 8) * 100} size={50} strokeWidth={5}>
              <Moon size={18} style={{ color: '#1967d2' }} />
            </ProgressRing>
          </div>
          <p className="text-xs font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{sleepHours}h</p>
          <p className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Giáº¥c ngá»§</p>
        </div>
      </div>

      {/* Streak banner */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Fire size={28} style={{ color: '#fff' }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-white">{stats.streak} NgÃ y Streak</p>
          <p className="text-xs text-white/80">Tiáº¿p tá»¥c duy trÃ¬ Ä‘á»ƒ Ä‘áº¡t milestone tiáº¿p theo!</p>
        </div>
        <Trophy size={24} className="text-yellow-300" />
      </div>

      {/* Tasks progress */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Target size={16} /> Nhiá»‡m vá»¥ hÃ´m nay
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: taskRate >= 80 ? '#e6f4ea' : taskRate >= 50 ? '#fef7e0' : '#fce8e6', color: taskRate >= 80 ? '#137333' : taskRate >= 50 ? '#b06000' : '#d93025' }}>
            {taskRate >= 80 ? 'Xuáº¥t sáº¯c' : taskRate >= 50 ? 'KhÃ¡ tá»‘t' : 'Cáº§n cá»‘ gáº¯ng'}
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${taskRate}%`, background: taskRate >= 80 ? '#137333' : taskRate >= 50 ? '#b06000' : '#d93025' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
          <span>{stats.tasksCompleted} hoÃ n thÃ nh</span>
          <span>{stats.tasksTotal - stats.tasksCompleted} cÃ²n láº¡i</span>
        </div>
      </div>

      {/* Nutrition breakdown */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Flame size={16} /> Dinh dÆ°á»¡ng hÃ´m nay
        </h3>

        {/* Calorie total */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#5f6368' }}>Calo tiÃªu thá»¥</span>
          <span className="text-xs font-bold" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>
            <span style={{ color: '#e65100' }}>{stats.calories}</span>
            {targetCal > 0 && <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#9aa0a6' }}> / {targetCal} kcal</span>}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(targetCal ? Math.min(100, Math.round((stats.calories / targetCal) * 100)) : 0)}%`, background: 'linear-gradient(90deg, #e65100, #f97316)' }} />
        </div>

        {/* Macro bars */}
        {[
          { label: 'Protein', value: stats.protein, target: 80, unit: 'g', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          { label: 'Carbs', value: stats.carbs, target: 250, unit: 'g', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { label: 'Fat', value: stats.fat, target: 65, unit: 'g', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        ].map(nut => {
          const pct = Math.min(100, Math.round((nut.value / nut.target) * 100));
          return (
            <div key={nut.label} className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: nut.color }} />
                  <span className="text-xs font-medium" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#5f6368' }}>{nut.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{Math.round(nut.value)}{nut.unit}</span>
                  <span className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#9aa0a6' }}>/ {nut.target}{nut.unit}</span>
                  <span className="text-[10px] font-semibold ml-1 px-1.5 py-0.5 rounded-full" style={{ background: nut.bg, color: nut.color }}>{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: nut.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sleep quality */}
      <div className="rounded-2xl p-4 mb-2" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Moon size={16} /> Giáº¥c ngá»§ Ä‘Ãªm qua
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{sleepHours}</span>
              <span className="text-sm" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>giá»</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: sleepHours >= 7 ? '#e6f4ea' : '#fef7e0', color: sleepHours >= 7 ? '#137333' : '#b06000' }}>
                {sleepHours >= 7 ? 'Äá»§ giáº¥c' : 'Thiáº¿u ngá»§'}
              </span>
              <span className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
                Cháº¥t lÆ°á»£ng: {stats.sleepQuality === 'good' ? 'Tá»‘t' : stats.sleepQuality === 'fair' ? 'Trung bÃ¬nh' : 'KÃ©m'}
              </span>
            </div>
          </div>
          <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center" style={{ background: 'rgba(25,103,210,0.1)' }}>
            <Moon size={24} style={{ color: '#1967d2' }} />
            <span className="text-xs mt-1 font-medium" style={{ color: '#1967d2' }}>{sleepHours >= 7 ? 'âœ“ Ideal' : 'â†’ 8h'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Tracking View Component
function WeeklyTrackingView({ stats, theme, weekDays, todayStr, ProgressRing, MiniChart, tasks }: any) {
  const dailyData = weekDays.map((day: Date) => {
    const key = day.toISOString().slice(0, 10);
    const dayTasks = tasks.filter((task: any) => (task.deadline || task.created_at)?.slice(0, 10) === key);
    return dayTasks.length ? Math.round(dayTasks.filter((task: any) => task.status === 'completed').length / dayTasks.length * 100) : 0;
  });
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="flex flex-col gap-3">
      {/* Week overview */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Calendar size={16} /> Tá»•ng quan tuáº§n nÃ y
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.1)' : 'rgba(23,51,37,0.05)' }}>
            <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{stats.tasksCompleted}/{stats.tasksTotal}</p>
            <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Tasks hoÃ n thÃ nh</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.1)' : 'rgba(23,51,37,0.05)' }}>
            <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{stats.avgSleepHours}h</p>
            <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Trung bÃ¬nh ngá»§/ngÃ y</p>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <BarChart3 size={16} /> Hiá»‡u suáº¥t theo ngÃ y
        </h3>
        <div className="flex gap-1 mb-2">
          {weekDays.map((d: Date, i: number) => {
            const isToday = d.toISOString().split('T')[0] === todayStr;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{ height: `${dailyData[i]}%`, background: isToday ? '#94d400' : theme === 'dark' ? 'rgba(148,212,0,0.4)' : '#d1e8d8', minHeight: 2, transition: 'height 0.3s ease' }} />
                <span className="text-[10px] font-medium" style={{ color: isToday ? '#94d400' : theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{dayNames[i]}</span>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <span className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            NgÃ y tá»‘t nháº¥t: <strong style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{stats.bestDay}</strong>
          </span>
        </div>
      </div>

      {/* Comparison with last week */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <TrendingUp size={16} /> So vá»›i tuáº§n trÆ°á»›c
        </h3>
        {[
          { label: 'Tasks hoÃ n thÃ nh', value: stats.comparisonTasks, icon: CheckCircle2, color: stats.comparisonTasks >= 0 ? '#137333' : '#d93025' },
          { label: 'Giá» ngá»§ TB', value: stats.comparisonSleep, icon: Moon, color: stats.comparisonSleep >= 0 ? '#137333' : '#d93025' },
          { label: 'Calo tiÃªu thá»¥', value: stats.comparisonCalories, icon: Flame, color: '#1967d2' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20` }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <span className="flex-1 text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{item.label}</span>
            <div className="flex items-center gap-1">
              {item.value >= 0 ? <TrendingUp size={14} style={{ color: '#137333' }} /> : <TrendingDown size={14} style={{ color: '#d93025' }} />}
              <span className="text-sm font-bold" style={{ color: item.value >= 0 ? '#137333' : '#d93025' }}>
                {item.value >= 0 ? '+' : ''}{item.value}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Habit consistency */}
      <div className="rounded-2xl p-4 mb-2" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Activity size={16} /> Äiá»ƒm duy trÃ¬ thÃ³i quen
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex justify-center">
            <ProgressRing progress={stats.habitScore} size={70} strokeWidth={6}>
              <span className="text-lg font-bold" style={{ color: '#94d400' }}>{stats.habitScore}</span>
            </ProgressRing>
          </div>
          <div className="flex-1">
            <p className="text-xs mb-2" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>ÄÃ¡nh giÃ¡:</p>
            <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>
              {stats.habitScore >= 80 ? 'Xuáº¥t sáº¯c! Báº¡n Ä‘ang duy trÃ¬ ráº¥t tá»‘t.' : stats.habitScore >= 60 ? 'Tá»‘t. Tiáº¿p tá»¥c cá»‘ gáº¯ng!' : 'Cáº§n cáº£i thiá»‡n tÃ­nh nháº¥t quÃ¡n.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Monthly Tracking View Component
function MonthlyTrackingView({ stats, theme, badges, milestones, ProgressRing }: any) {
  return (
    <div className="flex flex-col gap-3">
      {/* Month summary */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #173325 0%, #2d6a40 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Crown size={20} style={{ color: '#94d400' }} />
          <h3 className="font-bold text-white">Tá»•ng káº¿t thÃ¡ng</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <p className="text-2xl font-bold text-white">{stats.tasksCompleted}</p>
            <p className="text-xs text-white/60">Tasks hoÃ n thÃ nh</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <p className="text-2xl font-bold" style={{ color: '#94d400' }}>{stats.goalRate}%</p>
            <p className="text-xs text-white/60">Tá»· lá»‡ má»¥c tiÃªu</p>
          </div>
        </div>
        {stats.weightChange !== null && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <span className="text-white/60">CÃ¢n náº·ng:</span>
            <span className="font-bold" style={{ color: stats.weightChange < 0 ? '#ef4444' : '#137333' }}>
              {stats.weightChange < 0 ? '' : '+'}{stats.weightChange}kg
            </span>
          </div>
        )}
      </div>

      {/* Badges earned */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Award size={16} /> Huy hiá»‡u Ä‘áº¡t Ä‘Æ°á»£c
        </h3>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge: Badge) => (
            <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}40` }}>
              <span className="text-lg">{badge.icon}</span>
              <div>
                <p className="text-xs font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{badge.name}</p>
                <p className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Medal size={16} /> Milestone
        </h3>
        {milestones.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.completed ? '#e6f4ea' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }}>
              {m.completed ? <CheckCircle2 size={20} style={{ color: '#137333' }} /> : <Target size={20} style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{m.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e0e0e0' }}>
                  <div className="h-full rounded-full" style={{ width: `${(m.progress / m.target) * 100}%`, background: m.completed ? '#137333' : '#94d400' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{m.progress}/{m.target}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Best habit */}
      <div className="rounded-2xl p-4 mb-2" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(148,212,0,0.15)' }}>
            <Star size={24} style={{ color: '#94d400' }} />
          </div>
          <div>
            <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>ThÃ³i quen tá»‘t nháº¥t thÃ¡ng</p>
            <p className="font-semibold" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{stats.bestHabit}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Insights View Component
function InsightsView({ insights, theme, streak, dailyStats }: any) {
  return (
    <div className="flex flex-col gap-3">
      {/* AI insight banner */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1967d2 0%, #185abc 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Brain size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <p className="font-bold text-white">AI Insights</p>
            <p className="text-xs text-white/70">PhÃ¢n tÃ­ch cÃ¡ nhÃ¢n hÃ³a</p>
          </div>
          <Sparkles size={20} className="text-yellow-300 ml-auto" />
        </div>
        <p className="text-sm text-white/90 leading-relaxed">
          Dá»±a trÃªn dá»¯ liá»‡u hoáº¡t Ä‘á»™ng cá»§a báº¡n, tÃ´i Ä‘Ã£ phÃ¢n tÃ­ch vÃ  Ä‘Æ°a ra má»™t sá»‘ nháº­n Ä‘á»‹nh sau:
        </p>
      </div>

      {/* Key metrics insight */}
      {insights.insights.map((insight: any, i: number) => (
        <div key={i} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: insight.trend === 'up' ? 'rgba(19,115,51,0.1)' : 'rgba(25,103,210,0.1)', border: `1px solid ${insight.trend === 'up' ? 'rgba(19,115,51,0.2)' : 'rgba(25,103,210,0.2)'}` }}>
          {insight.trend === 'up' ? <TrendingUp size={20} style={{ color: '#137333' }} /> : <Zap size={20} style={{ color: '#1967d2' }} />}
          <p className="text-sm flex-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : '#202124' }}>{insight.text}</p>
        </div>
      ))}

      {/* Strengths */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#137333' }}>
          <Trophy size={16} /> Äiá»ƒm máº¡nh
        </h3>
        {insights.strengths.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < insights.strengths.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` : 'none' }}>
            <span className="text-lg">{s.icon}</span>
            <div>
              <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{s.area}</p>
              <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Areas to improve */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#e65100' }}>
          <Target size={16} /> Cáº§n cáº£i thiá»‡n
        </h3>
        {insights.improvements.length > 0 ? insights.improvements.map((imp: any, i: number) => (
          <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < insights.improvements.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` : 'none' }}>
            <span className="text-lg">{imp.icon}</span>
            <div>
              <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{imp.area}</p>
              <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{imp.detail}</p>
            </div>
          </div>
        )) : (
          <p className="text-sm text-center py-2" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Tuyá»‡t vá»i! KhÃ´ng cÃ³ Ä‘iá»ƒm yáº¿u Ä‘Ã¡ng ká»ƒ.</p>
        )}
      </div>

      {/* AI Suggestions */}
      {insights.suggestions.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0f2a1a 0%, #173325 100%)' }}>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-white">
            <Sparkles size={16} style={{ color: '#94d400' }} /> Gá»£i Ã½ hÃ nh Ä‘á»™ng
          </h3>
          {insights.suggestions.map((s: string, i: number) => (
            <div key={i} className="flex items-start gap-2 py-2">
              <Zap size={14} style={{ color: '#94d400', marginTop: 2 }} />
              <p className="text-sm text-white/80">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Productivity score */}
      <div className="rounded-2xl p-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
          <Activity size={16} /> Äiá»ƒm nÄƒng suáº¥t
        </h3>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(148,212,0,0.15)' }}>
              <span className="text-2xl font-bold" style={{ color: '#94d400' }}>82</span>
            </div>
            <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>NÄƒng suáº¥t</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(25,103,210,0.15)' }}>
              <span className="text-2xl font-bold" style={{ color: '#1967d2' }}>76</span>
            </div>
            <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Wellness</p>
          </div>
        </div>
      </div>
    </div>
  );
}
