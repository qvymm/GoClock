import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ChevronRight, Clock, Bell, RepeatIcon, CheckCircle2, Trash2, AlignLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';
import { TaskDetailModal } from '../components/TaskDetailModal';
import type { Task } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────
// Countdown badge – memo để tránh re-render toàn trang
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Countdown badge – memo để tránh re-render toàn trang
// ─────────────────────────────────────────────────────────────
const CountdownBadge = memo(({ deadline, isOver }: { deadline?: string; isOver: boolean }) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!deadline) { setDisplay('Không có hạn'); return; }
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setDisplay('Hết hạn'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return (
    <span className="font-mono text-base font-bold" style={{ color: isOver ? '#FF4D4D' : '#0B2113' }}>
      {display}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getDayName(d: Date) {
  const day = d.getDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
function getProgress(task: Task) {
  if (!task.deadline) return 0;
  const created = new Date(task.created_at).getTime();
  const deadline = new Date(task.deadline).getTime();
  const now = Date.now();
  return Math.min(100, Math.max(0, ((now - created) / (deadline - created)) * 100));
}
function timeToTop(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h - 7) * 60 + m;
}
function deadlineToTimeStr(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const TAG_MAP: Record<string, { bg: string; text: string; label: string }> = {
  study:    { bg: '#E1F0FF', text: '#4A90E2', label: 'HỌC TẬP' },
  deadline: { bg: '#FFE5E5', text: '#FF7070', label: 'DEADLINE' },
  group:    { bg: '#E8F5E9', text: '#15803D', label: 'NHÓM' },
  personal: { bg: '#fef7e0', text: '#b06000', label: 'CÁ NHÂN' },
  other:    { bg: '#f1f3f4', text: '#5f6368', label: 'KHÁC' },
};
const CARD_COLORS: Record<string, string> = {
  study: '#166534', deadline: '#991B1B', group: '#1D4ED8', personal: '#92400E', other: '#374151',
};

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export function CalendarScreen() {
  const { user, tasks, refreshTasks } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [saving, setSaving] = useState(false);
  const [nowTime, setNowTime] = useState(new Date());
  const [selectedDuration, setSelectedDuration] = useState('1h');

  const [form, setForm] = useState({
    title: '',
    category: 'study' as Task['category'],
    startTime: '08:00',
    endTime: '10:00',
    color: '#D8FF7F',
    deadline: '',
    deadlineTime: '',
    repeat: 'none' as Task['repeat_type'],
    remind: '60',
    description: '',
    tag: 'Kinh tế',
  });

  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const filteredTasks = tasks.filter(t => {
    const ref = t.deadline ? new Date(t.deadline) : new Date(t.created_at);
    return isSameDay(ref, selectedDate);
  });

  // ── Toggle hoàn thành ──────────────────────────────────────
  const toggleComplete = useCallback(async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', task.id);
    await refreshTasks();
  }, [refreshTasks]);

  // ── Xoá nhiệm vụ ──────────────────────────────────────────
  const deleteTask = useCallback(async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Xoá nhiệm vụ này?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    if (selectedTask?.id === taskId) setSelectedTask(null);
    await refreshTasks();
  }, [selectedTask, refreshTasks]);

  // ── Thêm nhiệm vụ mới ──────────────────────────────────────
  async function addTask() {
    if (!form.title.trim()) {
      alert('Vui lòng nhập tên nhiệm vụ!');
      return;
    }
    if (!user) {
      alert('Vui lòng đăng nhập để lưu nhiệm vụ của bạn!');
      return;
    }
    setSaving(true);
    try {
      let deadline: string | undefined;
      if (form.category === 'deadline' && form.deadline) {
        deadline = `${form.deadline}T${form.deadlineTime || '23:59'}:00`;
      } else if (form.category === 'study') {
        const sel = selectedDate.toISOString().split('T')[0];
        deadline = `${sel}T${form.endTime}:00`;
      }

      await supabase.from('tasks').insert({
        user_id: user.id,
        title: form.title,
        category: form.category,
        deadline,
        repeat_type: form.repeat,
        remind_before: parseInt(form.remind),
        description: form.description,
        status: 'pending',
      });
      await refreshTasks();
    } finally {
      setSaving(false);
    }
    setForm({ title: '', category: 'study', startTime: '08:00', endTime: '10:00', color: '#D8FF7F', deadline: '', deadlineTime: '', repeat: 'none', remind: '60', description: '', tag: 'Kinh tế' });
    setShowAdd(false);
  }

  const nowTop = timeToTop(`${String(nowTime.getHours()).padStart(2,'0')}:${String(nowTime.getMinutes()).padStart(2,'0')}`);
  const HOUR_HEIGHT = 60;
  const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
  const TOTAL_MINUTES = HOURS.length * 60;
  const COLORS = ['#D8FF7F','#60A5FA','#C084FC','#FB7185','#FB923C','#2DD4BF'];
  const TAGS = ['Kinh tế','Toán rời rạc','Lập trình','Vật lý','Tiếng Anh'];
  const DURATIONS = ['15p','30p','1h','2h'];
  const REMIND_LABELS: Record<string, string> = { '15': 'Trước 15 phút','30': 'Trước 30 phút','60': 'Trước 1 giờ','1440': 'Trước 1 ngày' };
  const REPEAT_LABELS: Record<string, string> = { none: 'Không lặp', daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng' };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0B2113] overflow-hidden">
      {/* ── HEADER ── */}
      <div className="px-6 pt-10 pb-4 bg-[#0B2113] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[30px] font-bold leading-[36px] text-white">Lịch học</h1>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl border border-[rgba(207,251,43,0.30)] bg-[#0B2113]">
            <span className="text-[#CFFB2B] text-[14px] font-medium leading-[20px]">+ Thêm</span>
          </button>
        </div>
        <p className="text-[#9CA3AF] text-[14px] mb-4">
          {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Week picker */}
        <div className="flex items-center gap-1.5 mb-5">
          <button onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })}
            className="p-1 text-[#9CA3AF]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex-1 flex items-center gap-1">
            {weekDays.map((d, i) => {
              const isSelected = isSameDay(d, selectedDate);
              const isToday = isSameDay(d, new Date());
              const hasTask = tasks.some(t => isSameDay(new Date(t.deadline || t.created_at), d));
              return (
                <button key={i} onClick={() => setSelectedDate(new Date(d))}
                  className={`flex-1 flex flex-col items-center justify-center relative py-2 rounded-[14px] transition-all ${
                    isSelected ? 'bg-[#CFFB2B]' : isToday ? 'bg-white/10' : 'bg-white/5'
                  } outline outline-1 ${hasTask ? 'outline-[#EF4444]' : 'outline-white/10'}`}>
                  <span className={`text-[10px] leading-[14px] ${isSelected ? 'text-[#0B2113] font-semibold' : 'text-[#9CA3AF]'}`}>
                    {getDayName(d)}
                  </span>
                  <span className={`text-[18px] font-bold ${isSelected ? 'text-[#0B2113]' : 'text-white'}`}>
                    {d.getDate()}
                  </span>
                  {isSelected && <div className="w-1 h-1 rounded-full bg-[#0B2113] absolute bottom-1.5" />}
                </button>
              );
            })}
          </div>
          <button onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })}
            className="p-1 text-[#9CA3AF]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Toggle Danh sách / Dòng thời gian */}
        <div className="w-[240px] max-w-full mx-auto p-1 bg-white/10 rounded-2xl flex">
          {(['list', 'timeline'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex-1 py-1.5 rounded-xl text-center transition-all ${viewMode === mode ? 'bg-[#CFFB2B]' : ''}`}>
              <span className={`text-[11px] font-bold uppercase ${viewMode === mode ? 'text-[#0B2113]' : 'text-[#9CA3AF]'}`}>
                {mode === 'list' ? 'Danh sách' : 'Dòng thời gian'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {viewMode === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="flex-1 overflow-y-auto bg-[#F3F7F2] rounded-t-[40px] px-6 pt-8 flex flex-col gap-4"
          style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-5xl mb-4">📋</div>
              <p className="font-semibold text-[#173325]">Không có nhiệm vụ nào hôm nay</p>
              <p className="text-sm mt-1 text-[#9aa0a6]">Nhấn "+ Thêm" để tạo nhiệm vụ mới</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const progress = getProgress(task);
              const isDone = task.status === 'completed';
              const isOver = !!task.deadline && new Date(task.deadline) < new Date() && !isDone;
              const tag = TAG_MAP[task.category] ?? TAG_MAP.other;
              const pbBg = (task.category === 'deadline' || isOver) ? '#FF4D4D' : '#166534';

              return (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  className={`shrink-0 relative overflow-hidden rounded-[24px] border border-[#F3F4F6] shadow-sm bg-white p-5 flex flex-col ${isDone ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button onClick={e => toggleComplete(task, e)} className="pt-0.5 shrink-0 active:scale-90 transition-transform">
                      {isDone
                        ? <div className="w-6 h-6 rounded-full bg-[#DCFCE7] border border-[#22C55E] flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-[#16A34A]" />
                          </div>
                        : <div className="w-6 h-6 rounded-full border-2 border-[#D1D5DB]" />
                      }
                    </button>

                    <div className="flex-1 flex flex-col min-w-0">
                      <h3 className={`text-[17px] font-bold mb-2 truncate ${isDone ? 'text-[#9CA3AF] line-through' : 'text-[#0B2113]'}`}>
                        {task.title}
                      </h3>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="px-2 py-[2px] rounded-full" style={{ background: tag.bg }}>
                          <span className="text-[10px] font-bold uppercase" style={{ color: tag.text }}>{tag.label}</span>
                        </div>
                        {!isDone && progress >= 70 && !isOver && (
                          <div className="px-2 py-[2px] rounded-full bg-[#FFF4E5]">
                            <span className="text-[10px] font-bold uppercase text-[#FFA84A]">Sắp hết hạn</span>
                          </div>
                        )}
                        {isOver && (
                          <div className="px-2 py-[2px] rounded-full bg-[#FFE5E5]">
                            <span className="text-[10px] font-bold uppercase text-[#FF7070]">Quá hạn</span>
                          </div>
                        )}
                        {task.repeat_type !== 'none' && (
                          <div className="px-2 py-[2px] rounded-full bg-[#F3F4F6] flex items-center gap-1">
                            <RepeatIcon size={8} className="text-[#6B7280]" />
                            <span className="text-[10px] font-bold uppercase text-[#6B7280]">Lặp lại</span>
                          </div>
                        )}
                      </div>

                      {/* Time + Countdown */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-400 text-xs font-medium">
                          ⏰ {task.deadline ? new Date(task.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Không có hạn'}
                        </span>
                        {!isDone && <CountdownBadge deadline={task.deadline} isOver={isOver} />}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button onClick={e => deleteTask(task.id, e)} className="p-1.5 rounded-full hover:bg-red-50 transition-colors shrink-0">
                      <Trash2 size={14} className="text-[#D1D5DB] hover:text-red-400" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  {!isDone && (
                    <>
                      <div className="absolute left-[1px] bottom-0 w-[calc(100%-2px)] h-[6px] bg-[#F3F4F6]" />
                      <div className="absolute left-[1px] bottom-0 h-[6px] rounded-tr-full transition-all duration-1000"
                        style={{ width: `${Math.max(5, progress)}%`, background: pbBg }} />
                    </>
                  )}
                </div>
              );
            })
          )}
          <div className="h-4" />
        </div>
      ) : (
        /* ── TIMELINE VIEW ── */
        <div className="flex-1 overflow-y-auto bg-[#F3F7F2] rounded-t-[40px]"
          style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}>
          <div className="flex px-2 pt-6" style={{ minHeight: `${TOTAL_MINUTES + 48}px` }}>
            {/* Trục giờ */}
            <div className="w-[56px] flex flex-col shrink-0">
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-center pt-1">
                  <span className="text-[10px] font-bold text-[#9CA3AF]">{h}</span>
                </div>
              ))}
            </div>

            {/* Nội dung timeline */}
            <div className="flex-1 relative border-l border-[#E5E7EB]" style={{ height: `${TOTAL_MINUTES}px` }}>
              {HOURS.map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-[#E5E7EB]" style={{ top: i * HOUR_HEIGHT }} />
              ))}

              {/* Kim chỉ giờ hiện tại */}
              {nowTop >= 0 && nowTop <= TOTAL_MINUTES && (
                <div className="absolute left-[-4px] right-0 flex items-center pointer-events-none" style={{ top: nowTop }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
                  <div className="flex-1 border-t-2 border-[#EF4444]" />
                </div>
              )}

              {/* Thẻ nhiệm vụ */}
              {filteredTasks.filter(t => t.deadline).map(task => {
                const deadlineStr = deadlineToTimeStr(task.deadline!);
                const endTop = timeToTop(deadlineStr);
                const startTop = Math.max(0, endTop - 60);
                const height = Math.max(40, endTop - startTop);
                const cardColor = CARD_COLORS[task.category] ?? CARD_COLORS.other;
                const isDone = task.status === 'completed';

                return (
                  <div key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`absolute left-2 right-2 rounded-xl p-2.5 shadow-md cursor-pointer transition-all active:scale-[0.99] ${isDone ? 'opacity-50' : ''}`}
                    style={{ top: startTop, height, background: cardColor }}>
                    <p className="text-white text-[12px] font-bold leading-tight truncate">{task.title}</p>
                    <p className="text-white/70 text-[10px] mt-0.5">{deadlineStr}</p>
                    {isDone && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM MỚI ── */}
      {showAdd && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-[2px]"
          onClick={() => setShowAdd(false)}>
          <div className="w-full max-h-[94%] bg-gradient-to-b from-[#122E21] to-[#0B2418] rounded-t-[32px] border-t border-[#424844] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 bg-[#424844]/60 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#424844]/30">
              <button onClick={() => setShowAdd(false)} className="text-[#C2C8C2] text-base">Huỷ</button>
              <h3 className="text-[#DFE3E9] text-lg font-semibold">Thêm mới</h3>
              <button onClick={addTask} disabled={saving}
                className="bg-[#D8FF7F] text-[#263500] px-5 py-1.5 rounded-full text-xs font-bold disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 pb-12">
              {/* Tab Lịch học / Bài tập */}
              <div className="bg-[#0A0F13] p-1 rounded-xl flex gap-1 border border-[#424844]/20">
                {[
                  { key: 'study', label: 'Lịch học' },
                  { key: 'deadline', label: 'Bài tập' },
                ].map(tab => (
                  <button key={tab.key}
                    onClick={() => setForm(p => ({ ...p, category: tab.key as Task['category'] }))}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      form.category === tab.key ? 'bg-[#D8FF7F] text-[#263500]' : 'text-[#C2C8C2]'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Lịch học form ── */}
              {form.category === 'study' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">TÊN MÔN HỌC</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 px-4 py-3">
                      <input type="text" value={form.title}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Ví dụ: Toán rời rạc"
                        className="bg-transparent w-full outline-none text-white text-[18px] font-semibold placeholder:text-[#C2C8C2]/30" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">MÀU SẮC</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 p-4 flex justify-between items-center">
                      {COLORS.map(color => (
                        <button key={color}
                          onClick={() => setForm(p => ({ ...p, color }))}
                          className={`w-8 h-8 rounded-full transition-all ${form.color === color ? 'ring-4 ring-offset-2 ring-offset-[#0B2418]' : ''}`}
                          style={{ background: color }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {[
                      { label: 'BẮT ĐẦU', key: 'startTime' as const },
                      { label: 'KẾT THÚC', key: 'endTime' as const },
                    ].map(({ label, key }) => (
                      <div key={key} className="flex-1 flex flex-col gap-2">
                        <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">{label}</label>
                        <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 p-3 flex items-center gap-2">
                          <Clock size={18} className="text-[#D8FF7F] shrink-0" />
                          <input type="time" value={form[key]}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                            className="bg-transparent text-white text-base font-semibold outline-none w-full"
                            style={{ colorScheme: 'dark' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">CHU KỲ LẶP LẠI</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 p-4 flex items-center justify-between relative">
                      <select value={form.repeat}
                        onChange={e => setForm(p => ({ ...p, repeat: e.target.value as any }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        {Object.entries(REPEAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <span className="text-[#DFE3E9] text-base pointer-events-none">{REPEAT_LABELS[form.repeat]}</span>
                      <ChevronRight size={18} className="text-[#C2C8C2] rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">NHẮC NHỞ</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 p-4 flex items-center justify-between relative">
                      <select value={form.remind}
                        onChange={e => setForm(p => ({ ...p, remind: e.target.value }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        {Object.entries(REMIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <div className="flex items-center gap-2 pointer-events-none">
                        <Bell size={18} className="text-[#D8FF7F]" />
                        <span className="text-[#DFE3E9] text-base">{REMIND_LABELS[form.remind]}</span>
                      </div>
                      <ChevronRight size={18} className="text-[#424844] pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#C2C8C2] text-[11px] font-bold uppercase tracking-wider">GHI CHÚ</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 px-4 py-3 flex items-start gap-2">
                      <AlignLeft size={16} className="text-[#8C928D] mt-1 shrink-0" />
                      <input type="text" value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Thêm ghi chú..."
                        className="bg-transparent w-full outline-none text-[#C2C8C2] text-sm" />
                    </div>
                  </div>
                </>
              ) : (
                /* ── Bài tập form ── */
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">TÊN BÀI TẬP</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 px-4 py-3">
                      <input type="text" value={form.title}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Nộp báo cáo EXE101"
                        className="bg-transparent w-full outline-none text-white text-[18px] font-semibold placeholder:text-[#C2C8C2]/30" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">GẮNG THẺ MÔN HỌC</label>
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {TAGS.map(tag => (
                        <button key={tag}
                          onClick={() => setForm(p => ({ ...p, tag }))}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 transition-all ${
                            form.tag === tag ? 'bg-[#D8FF7F]/20 border border-[#D8FF7F]' : 'bg-[#262A2F]'
                          }`}>
                          <div className={`w-2 h-2 rounded-full ${form.tag === tag ? 'bg-[#D8FF7F]' : 'bg-[#9CA3AF]'}`} />
                          <span className={`text-[12px] font-semibold ${form.tag === tag ? 'text-[#D8FF7F]' : 'text-[#C2C8C2]'}`}>{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">HẠN NỘP (DEADLINE)</label>
                      {form.deadline && form.deadlineTime && (() => {
                        const diff = new Date(`${form.deadline}T${form.deadlineTime}`).getTime() - Date.now();
                        if (diff > 0) {
                          const h = Math.floor(diff / 3600000);
                          return <span className="text-[12px] font-semibold text-[#F54647]">Còn {h} giờ nữa</span>;
                        }
                        return <span className="text-[12px] font-semibold text-[#F54647]">Đã quá hạn</span>;
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#171C20] rounded-xl border border-[#424844]/30 px-3 py-3 flex items-center gap-2">
                        <Clock size={16} className="text-[#D8FF7F] shrink-0" />
                        <input type="date"
                          value={form.deadline}
                          onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                          className="bg-transparent text-[#DFE3E9] text-sm font-semibold outline-none w-full"
                          style={{ colorScheme: 'dark' }} />
                      </div>
                      <div className="w-[110px] bg-[#171C20] rounded-xl border border-[#424844]/30 px-3 py-3 flex items-center gap-2">
                        <input type="time"
                          value={form.deadlineTime || '23:59'}
                          onChange={e => setForm(p => ({ ...p, deadlineTime: e.target.value }))}
                          className="bg-transparent text-[#DFE3E9] text-sm font-semibold outline-none w-full"
                          style={{ colorScheme: 'dark' }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">NHẮC NHỞ</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 p-4 flex items-center justify-between relative">
                      <select value={form.remind}
                        onChange={e => setForm(p => ({ ...p, remind: e.target.value }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        {Object.entries(REMIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <div className="flex items-center gap-3 pointer-events-none">
                        <Bell size={20} className="text-[#D8FF7F]" />
                        <span className="text-[#DFE3E9] text-base">{REMIND_LABELS[form.remind]}</span>
                      </div>
                      <ChevronRight size={16} className="text-[#424844] pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">THỜI LƯỢNG DỰ KIẾN</label>
                    <div className="flex gap-2">
                      {DURATIONS.map(dur => (
                        <button key={dur}
                          onClick={() => setSelectedDuration(dur)}
                          className={`flex-1 py-3 rounded-xl text-[12px] font-bold transition-all ${
                            selectedDuration === dur ? 'bg-[#D8FF7F] text-[#4A6400] shadow-md' : 'bg-[#262A2F] text-[#C2C8C2]'
                          }`}>
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#8C928D] text-[11px] font-bold uppercase tracking-wider">GHI CHÚ</label>
                    <div className="bg-[#171C20] rounded-xl border border-[#424844]/30 px-4 py-3 flex items-start gap-2">
                      <AlignLeft size={16} className="text-[#8C928D] mt-1 shrink-0" />
                      <input type="text" value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Thêm ghi chú..."
                        className="bg-transparent w-full outline-none text-[#C2C8C2] text-sm" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
