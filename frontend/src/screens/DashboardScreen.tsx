import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Bell, ChevronRight, BarChart3, Sparkles, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../lib/AppContext';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { CoachmarksOverlay } from '../components/CoachmarksOverlay';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';

// ── Countdown nhỏ tách component ──────────────────────────────
const MiniCountdown = memo(({ deadline }: { deadline?: string }) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!deadline) { setDisplay(''); return; }
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setDisplay('Hết hạn'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 24) { setDisplay(`${Math.floor(h / 24)}d ${h % 24}h`); return; }
      setDisplay(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!display) return null;
  return <span className="text-[10px] font-bold text-[#ef4444] font-mono">{display}</span>;
});

// ── Helpers ──────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  study: '#1d4ed8', deadline: '#dc2626', group: '#15803d', personal: '#b45309', other: '#4b5563',
};
const CAT_BG: Record<string, string> = {
  study: '#eff6ff', deadline: '#fef2f2', group: '#f0fdf4', personal: '#fef3c7', other: '#f3f4f6',
};
const CAT_LABEL: Record<string, string> = {
  study: 'Học tập', deadline: 'Deadline', group: 'Nhóm', personal: 'Cá nhân', other: 'Khác',
};

function getProgress(task: Task) {
  if (!task.deadline) return 0;
  const created = new Date(task.created_at).getTime();
  const deadline = new Date(task.deadline).getTime();
  return Math.min(100, Math.max(0, ((Date.now() - created) / (deadline - created)) * 100));
}

// ── Main Component ─────────────────────────────────────────────
export function DashboardScreen() {
  const { user, profile, tasks, meals, sleepLogs, notificationCount, setScreen, refreshTasks } = useApp();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const constraintsRef = useRef<HTMLDivElement | null>(null);

  const [time, setTime] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [countdown, setCountdown] = useState('');
  const [showCoachmarks, setShowCoachmarks] = useState(false);

  const displayTasks = tasks;

  useEffect(() => {
    if (localStorage.getItem('show_coachmarks') === 'true') {
      localStorage.removeItem('show_coachmarks');
      const timer = setTimeout(() => setShowCoachmarks(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Đồng hồ - cập nhật mỗi giây
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Đếm ngược nhiệm vụ gần nhất
  useEffect(() => {
    const upcoming = displayTasks
      .filter(t => t.status !== 'completed' && t.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
    if (!upcoming?.deadline) {
      setCountdown('');
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(upcoming.deadline!).getTime() - Date.now();
      if (diff <= 0) { setCountdown('Đã hết hạn'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [displayTasks]);

  // Toggle hoàn thành nhiệm vụ ngay trên Dashboard
  const toggleComplete = useCallback(async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', task.id);
    await refreshTasks();
  }, [refreshTasks]);

  // ── Computed values ──────────────────────────────────────────
  function getGreeting() {
    const h = time.getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'bạn';
  const avatarUrl = profile?.avatar_url;

  const completedToday = displayTasks.filter(t => t.status === 'completed').length;
  const inProgressToday = displayTasks.filter(t => t.status === 'in_progress').length;
  const pendingToday = displayTasks.filter(t => t.status === 'pending').length;
  const totalToday = displayTasks.length;
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const todayCalories = meals.reduce((s, m) => s + m.calories, 0);
  const targetCalories = profile?.tdee || 0;
  const lastSleep = sleepLogs[0];
  const sleepHours = lastSleep?.duration_minutes ? (lastSleep.duration_minutes / 60).toFixed(1) : null;
  const sleepQuality = lastSleep?.quality;

  const upcomingTask = displayTasks
    .filter(t => t.status !== 'completed' && t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  const isUrgent = upcomingTask?.deadline
    ? new Date(upcomingTask.deadline).getTime() - Date.now() < 2 * 3600000
    : false;

  // Calorie circular progress
  const caloriePct = targetCalories > 0 ? Math.min(100, Math.round((todayCalories / targetCalories) * 100)) : 0;
  const radius = 28, stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePct / 100) * circumference;

  function getSleepLabel(q?: string) {
    if (q === 'excellent') return 'Rất tốt';
    if (q === 'good') return 'Tốt';
    if (q === 'fair') return 'Trung bình';
    return 'Kém';
  }

  // ── Formatted time & date ─────────────────────────────────────
  const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div ref={rootRef} className="flex flex-col h-full relative" style={{ background: '#0d2215' }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-10 pb-5" style={{ background: '#0d2215' }}>
        <div className="flex items-start justify-between">
          {/* Left: Avatar + Greeting */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: '#94d400' }}>
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                : <img src="/logo-g.png" className="w-full h-full object-cover" alt="logo" />
              }
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{getGreeting()},</p>
              <p className="font-extrabold text-base text-white capitalize leading-tight">{name}</p>
              <p className="text-[11px] capitalize mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{dateStr}</p>
            </div>
          </div>

          {/* Right: Clock + Action buttons */}
          <div className="flex flex-col items-end gap-2">
            <p className="text-2xl font-black text-white tracking-wider font-mono">{timeStr}</p>
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Bell size={18} className="text-white" />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ background: '#d93025', width: 14, height: 14 }}>
                    {notificationCount}
                  </span>
                )}
              </button>
              <button onClick={() => setScreen('tracking')} data-coachmark="stats"
                className="relative p-2 rounded-full" style={{ background: 'rgba(148,212,0,0.15)' }}>
                <BarChart3 size={18} style={{ color: '#94d400' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto scroll-content bg-[#f4f6f5] rounded-t-[32px] px-5 pt-6 shadow-inner"
        style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}>

        {/* ── Card HÔM NAY ── */}
        <div className="rounded-[24px] p-5 mb-4 text-white shadow-sm" style={{ background: '#1c3727' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-wider opacity-60 mb-0.5">HÔM NAY</p>
              <p className="text-xl font-bold leading-tight">{completedToday}/{totalToday} nhiệm vụ hoàn thành</p>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-full">
              <span className="text-2xl font-black" style={{ color: '#b2d400' }}>{completionPct}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-[#2c4f39] overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completionPct}%`, background: '#b2d400' }} />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#b2d400]" />
              <span className="text-[10px] font-bold">{completedToday} hoàn thành</span>
            </div>
            {inProgressToday > 0 && (
              <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span className="text-[10px] font-bold">{inProgressToday} đang làm</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[10px] font-bold">{pendingToday} chưa làm</span>
            </div>
          </div>
        </div>

        {/* ── Grid Calo + Giấc ngủ ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Calorie Card */}
          <div className="bg-white rounded-[20px] p-4 flex flex-col justify-between shadow-sm border border-[rgba(23,51,37,0.05)]">
            <div className="flex items-center gap-1.5 mb-2 text-gray-400">
              <Flame size={15} className="text-orange-500" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Calo</span>
            </div>
            <div className="flex justify-center items-center my-1 relative">
              <svg width="72" height="72" className="transform -rotate-90">
                <circle cx="36" cy="36" r={radius} stroke="#f3f4f6" strokeWidth={stroke} fill="transparent" />
                <circle cx="36" cy="36" r={radius}
                  stroke={caloriePct < 70 ? '#22c55e' : caloriePct < 90 ? '#f59e0b' : '#ef4444'}
                  strokeWidth={stroke} fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <span className="absolute text-sm font-extrabold text-gray-800">{targetCalories ? `${caloriePct}%` : '—'}</span>
            </div>
            <p className="text-xs font-bold text-center mt-1 text-gray-700">{todayCalories}{targetCalories ? `/${targetCalories}` : ''} kcal</p>
          </div>

          {/* Sleep Card */}
          <div className="bg-white rounded-[20px] p-4 flex flex-col justify-between shadow-sm border border-[rgba(23,51,37,0.05)]">
            <div className="flex items-center gap-1.5 mb-2 text-gray-400">
              <span className="text-sm">🌙</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Giấc ngủ</span>
            </div>
            <div className="flex flex-col items-center justify-center my-1">
              <span className="text-3xl font-black text-gray-800 tracking-tight">{sleepHours ? `${sleepHours}h` : '—'}</span>
              {sleepQuality && <span className="text-[10px] font-bold px-3 py-1 rounded-full mt-2"
                style={{ background: '#ebdcb9', color: '#967c3b' }}>
                {getSleepLabel(sleepQuality)}
              </span>}
            </div>
          </div>
        </div>

        {/* ── Card Đếm ngược ── */}
        {upcomingTask && (
          <div className="rounded-[24px] p-5 mb-5 shadow-sm" style={{ background: '#d4f53c' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[10px] font-bold tracking-wider text-green-950/60 uppercase">ĐẾM NGƯỢC</p>
                  {isUrgent && <AlertTriangle size={12} className="text-red-600 shrink-0" />}
                </div>
                <p className="text-sm font-extrabold text-green-950 truncate">{upcomingTask.title}</p>
                {upcomingTask.deadline && (
                  <p className="text-[10px] text-green-950/60 font-medium mt-0.5">
                    Hạn: {new Date(upcomingTask.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} lúc {new Date(upcomingTask.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className={`font-mono text-xl font-black tracking-wider whitespace-nowrap px-3.5 py-1.5 rounded-xl ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-white/30 text-green-950'}`}>
                {countdown || '00 : 00 : 00'}
              </div>
            </div>
            <button onClick={() => setScreen('calendar')}
              className="flex items-center gap-1 text-green-950/70 text-[11px] font-bold mt-1">
              Xem chi tiết <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* ── Danh sách Nhiệm vụ hôm nay ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-gray-900">Nhiệm vụ hôm nay</h3>
            <button onClick={() => setScreen('calendar')} className="flex items-center gap-0.5 text-xs font-bold text-[#94d400]">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {displayTasks.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 text-center shadow-sm border border-[rgba(23,51,37,0.05)] flex flex-col items-center">
                <span className="text-3xl mb-2">📋</span>
                <p className="font-bold text-gray-800 text-sm">Hôm nay chưa có nhiệm vụ nào</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Tạo lịch học, công việc hoặc deadline để bắt đầu</p>
                <button
                  onClick={() => setScreen('calendar')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#0d2215] bg-[#94d400] transition-transform active:scale-95"
                >
                  + Thêm nhiệm vụ
                </button>
              </div>
            ) : (
              displayTasks.slice(0, 4).map((task) => {
                const progress = getProgress(task);
                const isDone = task.status === 'completed';
                const isOver = !!task.deadline && new Date(task.deadline) < new Date() && !isDone;
                const deadlineTime = task.deadline
                  ? new Date(task.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div key={task.id}
                    className="flex gap-3 cursor-pointer mb-1 items-stretch"
                    onClick={() => setSelectedTask(task)}>
                    {/* Time column */}
                    <div className="flex flex-col items-center w-12 flex-shrink-0 pt-3">
                      <p className="text-[11px] font-bold text-gray-400 leading-tight">{deadlineTime}</p>
                      {!isDone && task.deadline && (
                        <div className="mt-1">
                          <MiniCountdown deadline={task.deadline} />
                        </div>
                      )}
                    </div>

                    {/* Card */}
                    <div className="flex-1 rounded-[20px] bg-white p-4 flex flex-col justify-between shadow-sm border border-[rgba(23,51,37,0.05)] relative overflow-hidden">
                      <div className="flex items-start gap-3">
                        {/* Checkbox – có thể nhấn */}
                        <button
                          onClick={e => toggleComplete(task, e)}
                          className="mt-0.5 flex-shrink-0 transition-transform active:scale-90">
                          {isDone
                            ? <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center" style={{ background: '#b2d400' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d2215" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            : <div className={`w-[20px] h-[20px] rounded-full border-2 ${isOver ? 'border-red-400' : 'border-gray-300'}`} />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug"
                            style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#9ca3af' : '#1f2937' }}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: CAT_BG[task.category] || '#f3f4f6', color: CAT_COLOR[task.category] || '#4b5563' }}>
                              {CAT_LABEL[task.category] || task.category}
                            </span>
                            {!isDone && progress >= 70 && !isOver && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#ef4444]">
                                Sắp hết hạn
                              </span>
                            )}
                            {isOver && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#ef4444]">
                                Quá hạn
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                      </div>

                      {/* Progress bar dưới thẻ */}
                      <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                        style={{ background: isDone ? '#e5e7eb' : (CAT_COLOR[task.category] || '#4b5563') }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {displayTasks.length > 4 && (
            <button onClick={() => setScreen('calendar')}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-bold text-[#94d400] border border-[#94d400]/30"
              style={{ background: 'rgba(148,212,0,0.06)' }}>
              Xem thêm {displayTasks.length - 4} nhiệm vụ →
            </button>
          )}
        </div>
      </div>

      {/* ── Floating AI Chat Button ── */}
      <div ref={constraintsRef} className="fixed inset-0 z-40 pointer-events-none" />
      <motion.button
        data-coachmark="ai-chat"
        drag dragConstraints={constraintsRef} dragElastic={0} dragMomentum={false}
        whileTap={{ scale: 0.9 }}
        onClick={() => setScreen('aiChat')}
        className="fixed z-50 bottom-[116px] right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto"
        style={{ background: '#c8ec2d', color: '#0d2215', boxShadow: '0 8px 32px rgba(200, 236, 45, 0.4)', touchAction: 'none' }}>
        <Sparkles size={24} />
      </motion.button>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showCoachmarks && <CoachmarksOverlay onComplete={() => setShowCoachmarks(false)} />}
    </div>
  );
}
