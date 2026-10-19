import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, ChevronRight, BarChart3, Plus, Sparkles, Flame, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../lib/AppContext';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { CoachmarksOverlay } from '../components/CoachmarksOverlay';
import { NotificationCenter } from '../components/NotificationCenter';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import { deadlineAt, deadlineCountdown, localDateKey, taskDeadlineDate } from '../lib/taskDates';

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

// ── Main Component ─────────────────────────────────────────────
export function DashboardScreen() {
  const { user, profile, tasks, meals, sleepLogs, setScreen, refreshTasks } = useApp();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const constraintsRef = useRef<HTMLDivElement | null>(null);

  const [time, setTime] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'personal' as Task['category'],
    deadlineDate: localDateKey(),
    deadlineTime: '23:59',
    reminderEnabled: false,
  });

  const displayTasks = tasks
    .filter(task => taskDeadlineDate(task.deadline) === localDateKey(time))
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'));

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
  const todaySleep = sleepLogs.find(log => log.log_date === localDateKey(time));
  const lastSleep = todaySleep ?? sleepLogs.find(log => log.duration_minutes != null);
  const displayedSleepMinutes = todaySleep
    ? todaySleep.duration_minutes
    : lastSleep?.duration_minutes;
  const sleepHours = displayedSleepMinutes != null ? (displayedSleepMinutes / 60).toFixed(1) : null;
  const sleepQuality = lastSleep?.quality;

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

  const openTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      category: 'personal',
      deadlineDate: localDateKey(),
      deadlineTime: '23:59',
      reminderEnabled: false,
    });
    setTaskFormError('');
    setShowTaskForm(true);
  };

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setTaskFormError('Bạn cần đăng nhập để tạo công việc.');
      return;
    }
    const deadline = deadlineAt(newTask.deadlineDate, newTask.deadlineTime);
    if (!deadline) {
      setTaskFormError('Vui lòng chọn ngày và giờ deadline hợp lệ.');
      return;
    }
    setSavingTask(true);
    setTaskFormError('');
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      category: newTask.category,
      status: 'pending',
      deadline,
      reminder_enabled: newTask.reminderEnabled,
      repeat_type: 'none',
      remind_before: 15,
    });
    if (error) {
      console.error('Unable to create task from dashboard:', error);
      setTaskFormError('Không thể tạo công việc. Vui lòng thử lại.');
      setSavingTask(false);
      return;
    }
    await refreshTasks();
    setSavingTask(false);
    setShowTaskForm(false);
  };

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
              <NotificationCenter />
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
              {todaySleep && todaySleep.duration_minutes == null && (
                <span className="mt-2 text-center text-[9px] font-medium text-gray-400">Xác nhận giờ đi ngủ để tính thời lượng</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Danh sách Nhiệm vụ hôm nay ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-gray-900">Nhiệm vụ hôm nay</h3>
            <div className="flex items-center gap-3">
              <button onClick={openTaskForm} className="flex items-center gap-1 text-xs font-bold text-[#173325]">
                <Plus size={15} /> Thêm
              </button>
              <button onClick={() => setScreen('calendar')} className="flex items-center gap-0.5 text-xs font-bold text-[#94d400]">
                Xem tất cả <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {displayTasks.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 text-center shadow-sm border border-[rgba(23,51,37,0.05)] flex flex-col items-center">
                <span className="text-3xl mb-2">📋</span>
                <p className="font-bold text-gray-800 text-sm">Hôm nay chưa có nhiệm vụ nào</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Tạo lịch học, công việc hoặc deadline để bắt đầu</p>
                <button
                  onClick={openTaskForm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#0d2215] bg-[#94d400] transition-transform active:scale-95"
                >
                  + Thêm nhiệm vụ
                </button>
              </div>
            ) : (
              displayTasks.slice(0, 4).map((task) => {
                const isDone = task.status === 'completed';

                return (
                  <div key={task.id}
                    className="flex gap-3 cursor-pointer mb-1 items-stretch"
                    onClick={() => setSelectedTask(task)}>
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
                            : <div className="w-[20px] h-[20px] rounded-full border-2 border-gray-300" />
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
                            <span className="text-[9px] font-medium text-gray-400">
                              Deadline {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : ''}
                              {task.deadline && ` · ${new Date(task.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            {!isDone && task.deadline && (
                              <span className={`text-[9px] font-bold ${new Date(task.deadline).getTime() <= time.getTime() ? 'text-red-500' : 'text-[#4A9D67]'}`}>
                                {deadlineCountdown(task.deadline, time.getTime())}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                      </div>

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

      {showTaskForm && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onMouseDown={event => { if (event.target === event.currentTarget && !savingTask) setShowTaskForm(false); }}>
          <form onSubmit={event => void createTask(event)}
            className="max-h-[90%] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#102019] p-5 text-white shadow-2xl sm:rounded-[28px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9BA99E]">Công việc hôm nay</p>
                <h2 className="mt-1 text-lg font-extrabold">Thêm công việc</h2>
              </div>
              <button type="button" onClick={() => setShowTaskForm(false)} disabled={savingTask}
                aria-label="Đóng" className="rounded-full p-2 text-[#AAB5AC] hover:bg-white/10"><X size={19} /></button>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">TÊN CÔNG VIỆC</span>
              <input autoFocus required maxLength={160} value={newTask.title}
                onChange={event => setNewTask(value => ({ ...value, title: event.target.value }))}
                placeholder="Ví dụ: Ôn bài tiếng Anh"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/30 focus:border-[#CFFB2B]" />
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">DANH MỤC</span>
              <select value={newTask.category}
                onChange={event => setNewTask(value => ({ ...value, category: event.target.value as Task['category'] }))}
                className="w-full rounded-xl border border-white/10 bg-[#1B2A21] px-4 py-3 text-sm text-white">
                {Object.entries(CAT_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">NGÀY DEADLINE</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4">
                <CalendarDays size={17} className="text-[#CFFB2B]" />
                <input required type="date" value={newTask.deadlineDate}
                  onChange={event => setNewTask(value => ({ ...value, deadlineDate: event.target.value }))}
                  className="w-full bg-transparent py-3 text-sm text-white outline-none" />
              </span>
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">GIỜ DEADLINE</span>
              <input required type="time" value={newTask.deadlineTime}
                onChange={event => setNewTask(value => ({ ...value, deadlineTime: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-xs font-semibold">Nhắc nhở</span>
              <input type="checkbox" checked={newTask.reminderEnabled}
                onChange={event => setNewTask(value => ({ ...value, reminderEnabled: event.target.checked }))}
                className="h-4 w-4 accent-[#CFFB2B]" />
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">GHI CHÚ (TÙY CHỌN)</span>
              <textarea rows={2} maxLength={1000} value={newTask.description}
                onChange={event => setNewTask(value => ({ ...value, description: event.target.value }))}
                placeholder="Thêm mô tả cho công việc..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs outline-none placeholder:text-white/30 focus:border-[#CFFB2B]" />
            </label>
            {taskFormError && <p role="alert" className="mb-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200">{taskFormError}</p>}
            <button type="submit" disabled={savingTask}
              className="w-full rounded-xl bg-[#CFFB2B] py-3 text-sm font-extrabold text-[#152219] disabled:opacity-60">
              {savingTask ? 'Đang lưu…' : 'Lưu công việc'}
            </button>
          </form>
        </div>
      )}

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
