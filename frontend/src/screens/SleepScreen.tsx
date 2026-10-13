import React, { useState, useEffect } from 'react';
import { Moon, Sun, CheckCircle2, Info, Bell, BellOff, Volume2, Save, X, Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';

const DAYS_OF_WEEK = [
  { id: 1, label: 'T2' },
  { id: 2, label: 'T3' },
  { id: 3, label: 'T4' },
  { id: 4, label: 'T5' },
  { id: 5, label: 'T6' },
  { id: 6, label: 'T7' },
  { id: 0, label: 'CN' }
];

export type SleepSchedule = {
  id: string;
  wakeTime: string;
  bedTime: string;
  goalHours: number;
  applyDays: number[];
  remind30Min: boolean;
  alarmEnabled: boolean;
  isActive: boolean;
};

export function SleepScreen() {
  const { user, refreshSleep, theme } = useApp();
  
  // App State
  const [schedules, setSchedules] = useState<SleepSchedule[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [wakeTime, setWakeTime] = useState('06:30');
  const [bedTime, setBedTime] = useState('22:30');
  const [goalHours, setGoalHours] = useState(8);
  const [applyDays, setApplyDays] = useState<number[]>([1,2,3,4,5]); 
  const [remind30Min, setRemind30Min] = useState(true);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  
  // Modals & Alerts
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{type: 'remind30' | 'bedtime' | 'waketime', message: string} | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [audio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // Load schedules on mount
  useEffect(() => {
    if (!user) return;
    const savedData = localStorage.getItem(`sleepSchedules_${user.id}`);
    if (savedData) {
      setSchedules(JSON.parse(savedData));
    }
  }, [user]);

  // Save schedules to local storage whenever they change
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`sleepSchedules_${user.id}`, JSON.stringify(schedules));
  }, [schedules, user]);

  // Background check loop (Alarms & Reminders)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      for (const schedule of schedules) {
        if (!schedule.isActive) continue;
        if (!schedule.applyDays.includes(currentDay)) continue;

        let bH = parseInt(schedule.bedTime.split(':')[0]);
        let bM = parseInt(schedule.bedTime.split(':')[1]);

        // Remind 30m before
        let rH = bH, rM = bM - 30;
        if (rM < 0) { rM += 60; rH -= 1; }
        if (rH < 0) { rH += 24; }
        const remindHM = `${rH.toString().padStart(2, '0')}:${rM.toString().padStart(2, '0')}`;

        if (schedule.remind30Min && currentHM === remindHM && !sessionStorage.getItem(`notified_r30_${schedule.id}_${currentHM}`)) {
          sessionStorage.setItem(`notified_r30_${schedule.id}_${currentHM}`, 'true');
          setActiveAlert({ type: 'remind30', message: 'Sắp đến giờ ngủ rồi! (Còn 30 phút). Hãy chuẩn bị nhé 🌙' });
        }

        // Remind at bedtime
        if (schedule.remind30Min && currentHM === schedule.bedTime && !sessionStorage.getItem(`notified_bed_${schedule.id}_${currentHM}`)) {
          sessionStorage.setItem(`notified_bed_${schedule.id}_${currentHM}`, 'true');
          setActiveAlert({ type: 'bedtime', message: 'Đã đến giờ đi ngủ, hãy tắt máy và nghỉ ngơi ngay thôi! 💤' });
        }

        // Alarm at wake time
        if (schedule.alarmEnabled && currentHM === schedule.wakeTime && !sessionStorage.getItem(`notified_wake_${schedule.id}_${currentHM}`)) {
          sessionStorage.setItem(`notified_wake_${schedule.id}_${currentHM}`, 'true');
          audio.loop = true;
          audio.play().catch(e => console.log('Audio blocked', e));
          setActiveAlert({ type: 'waketime', message: 'Đã đến giờ thức dậy! Chào buổi sáng! ☀️' });
        }
      }
    }, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user, schedules, audio]);

  // Form Logic Calculation
  let wH = parseInt(wakeTime.split(':')[0] || '0');
  let wM = parseInt(wakeTime.split(':')[1] || '0');
  let bH = parseInt(bedTime.split(':')[0] || '0');
  let bM = parseInt(bedTime.split(':')[1] || '0');
  let durationMin = (wH * 60 + wM) - (bH * 60 + bM);
  if (durationMin < 0) durationMin += 24 * 60;
  let durH = Math.floor(durationMin / 60);
  let durM = durationMin % 60;
  let isEnough = durationMin >= (goalHours * 60);

  const toggleDay = (d: number) => {
    if (applyDays.includes(d)) setApplyDays(applyDays.filter(x => x !== d));
    else setApplyDays([...applyDays, d].sort());
  };

  const openNewSchedule = () => {
    setEditingId(null);
    setWakeTime('06:30'); setBedTime('22:30'); setGoalHours(8); setApplyDays([1,2,3,4,5]);
    setRemind30Min(true); setAlarmEnabled(true);
    setViewMode('edit');
  };

  const openEditSchedule = (schedule: SleepSchedule) => {
    setEditingId(schedule.id);
    setWakeTime(schedule.wakeTime);
    setBedTime(schedule.bedTime);
    setGoalHours(schedule.goalHours);
    setApplyDays(schedule.applyDays);
    setRemind30Min(schedule.remind30Min);
    setAlarmEnabled(schedule.alarmEnabled);
    setViewMode('edit');
  };

  const deleteSchedule = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xoá lịch ngủ này không?')) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const handleSaveConfirmed = () => {
    const newSchedule: SleepSchedule = {
      id: editingId || Date.now().toString(),
      wakeTime, bedTime, goalHours, applyDays, remind30Min, alarmEnabled,
      isActive: true
    };

    if (editingId) {
      setSchedules(schedules.map(s => s.id === editingId ? newSchedule : s));
    } else {
      setSchedules([...schedules, newSchedule]);
    }
    
    setShowConfirmModal(false);
    setViewMode('list');
  };

  const handleMorningCheckIn = async () => {
    setCheckingIn(true);
    audio.pause();
    audio.currentTime = 0;

    if (user) {
      const now = new Date();
      const actualWakeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];
      
      // Update actual sleep record for today
      // Assuming the user slept the expected duration since we don't have a specific check-out.
      // This gives them credit for the check-in.
      await supabase.from('sleep_logs').upsert({
        user_id: user.id,
        log_date: today,
        wake_time: actualWakeTime,
        quality: 'good',
        cycles: 5
      }, { onConflict: 'user_id,log_date' });
      
      alert('Tuyệt vời! Bạn đã hoàn thành mục tiêu giấc ngủ.\n⚡ Năng lượng hôm nay được +10 điểm!');
      await refreshSleep();
    }
    setCheckingIn(false);
    setActiveAlert(null);
  };

  const isDark = theme === 'dark';
  const bgMain = isDark ? '#0d1f12' : '#f0f7f2';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#fff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(23,51,37,0.08)';
  const textColor = isDark ? '#fff' : '#173325';
  const primaryColor = isDark ? '#94d400' : '#173325';
  const secondaryText = isDark ? 'rgba(255,255,255,0.5)' : '#6b7280';

  return (
    <div className="flex flex-col h-full relative" style={{ background: bgMain }}>
      
      {/* HEADER Tùy biến */}
      <div className="px-5 safe-pt pb-6 flex items-center justify-between" style={{ background: isDark ? 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)' : 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        {viewMode === 'edit' ? (
          <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-white">
            <ChevronLeft size={24} />
            <h1 className="text-lg font-bold">Quay lại</h1>
          </button>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-white">Lịch Giấc Ngủ</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Quản lý giờ giấc nghỉ ngơi</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4 pb-6 space-y-6">
        
        {/* ALERT BANNER */}
        {activeAlert && (
          <div className="rounded-2xl p-5 shadow-lg transform transition-all animate-bounce" 
               style={{ background: activeAlert.type === 'waketime' ? 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
            <div className="flex flex-col items-center text-center gap-3">
              {activeAlert.type === 'waketime' ? <Sun size={36} color="#b45309" /> : <Moon size={36} color="#fff" />}
              <h2 className="text-lg font-bold" style={{ color: activeAlert.type === 'waketime' ? '#92400e' : '#fff' }}>
                {activeAlert.message}
              </h2>
              {activeAlert.type === 'waketime' ? (
                <button onClick={handleMorningCheckIn} disabled={checkingIn}
                  className="w-full mt-2 py-3.5 rounded-xl font-bold text-white text-base shadow-md transition-all active:scale-95"
                  style={{ background: '#b45309' }}>
                  {checkingIn ? 'Đang xác nhận...' : 'Chào buổi sáng! Tôi đã dậy đúng giờ ☀️'}
                </button>
              ) : (
                <button onClick={() => {audio.pause(); setActiveAlert(null);}}
                  className="w-full mt-2 py-3 rounded-xl font-bold text-blue-600 bg-white shadow-md active:scale-95">
                  Đã hiểu
                </button>
              )}
            </div>
          </div>
        )}

        {/* =============== VIEW: LIST =============== */}
        {viewMode === 'list' && (
          <div className="flex flex-col gap-4">
            {schedules.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center opacity-70">
                <Moon size={48} style={{ color: secondaryText, marginBottom: 12 }} />
                <p style={{ color: secondaryText }}>Chưa có lịch ngủ nào.</p>
                <p className="text-sm" style={{ color: secondaryText }}>Bấm thêm mới để tạo lịch nhé!</p>
              </div>
            ) : (
              schedules.map(schedule => {
                const sDurationMin = (parseInt(schedule.wakeTime.split(':')[0]) * 60 + parseInt(schedule.wakeTime.split(':')[1])) 
                                   - (parseInt(schedule.bedTime.split(':')[0]) * 60 + parseInt(schedule.bedTime.split(':')[1]));
                const finalDur = sDurationMin < 0 ? sDurationMin + 1440 : sDurationMin;
                return (
                  <div key={schedule.id} className="rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-opacity" 
                       style={{ background: cardBg, border: `1px solid ${borderColor}`, opacity: schedule.isActive ? 1 : 0.6 }}>
                    
                    {/* Header: Times & Toggle */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold tracking-tight" style={{ color: textColor }}>{schedule.wakeTime}</span>
                        <span className="text-sm flex items-center gap-1" style={{ color: secondaryText }}>
                          <Moon size={12} /> {schedule.bedTime} (Ngủ {Math.floor(finalDur/60)}h{finalDur%60}p)
                        </span>
                      </div>
                      <button onClick={() => toggleActive(schedule.id)} className={`w-12 h-6 mt-1 rounded-full transition-colors relative ${schedule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${schedule.isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {/* Body: Days */}
                    <div className="flex gap-1 flex-wrap mt-1">
                      {DAYS_OF_WEEK.map(d => {
                        const active = schedule.applyDays.includes(d.id);
                        return (
                          <span key={d.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                            {d.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Footer: Actions */}
                    <div className="flex justify-end gap-3 mt-2 pt-3 border-t" style={{ borderColor }}>
                      <button onClick={() => deleteSchedule(schedule.id)} className="flex items-center gap-1 text-xs font-semibold text-red-500 active:scale-95">
                        <Trash2 size={14} /> Xoá
                      </button>
                      <button onClick={() => openEditSchedule(schedule)} className="flex items-center gap-1 text-xs font-semibold text-blue-500 active:scale-95">
                        <Edit2 size={14} /> Sửa
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <button onClick={openNewSchedule}
              className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
              <Plus size={20} />
              Thêm lịch ngủ
            </button>
          </div>
        )}

        {/* =============== VIEW: EDIT / CREATE =============== */}
        {viewMode === 'edit' && (
          <div className="flex flex-col gap-6">
            {/* BƯỚC 1: THIẾT LẬP LỊCH NGỦ */}
            <div className="rounded-2xl p-4 shadow-sm space-y-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-green-100 text-green-800">1</span>
                <h2 className="font-semibold" style={{ color: primaryColor }}>Thời gian</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: secondaryText }}>Giờ đi ngủ</label>
                  <input type="time" value={bedTime} onChange={e => setBedTime(e.target.value)}
                    className="w-full text-center text-2xl font-bold py-2 rounded-xl border outline-none"
                    style={{ borderColor, color: textColor, background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb', colorScheme: theme }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: secondaryText }}>Giờ thức dậy</label>
                  <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                    className="w-full text-center text-2xl font-bold py-2 rounded-xl border outline-none"
                    style={{ borderColor, color: textColor, background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb', colorScheme: theme }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor }}>
                <label className="text-xs font-medium flex justify-between" style={{ color: secondaryText }}>
                  <span>Mục tiêu ngủ (Giờ)</span>
                  <span className="font-bold" style={{ color: primaryColor }}>{goalHours}h</span>
                </label>
                <input type="range" min="4" max="12" step="0.5" value={goalHours} onChange={e => setGoalHours(parseFloat(e.target.value))}
                  className="w-full accent-green-600 mt-2" />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor }}>
                <label className="text-xs font-medium" style={{ color: secondaryText }}>Lặp lại</label>
                <div className="flex justify-between gap-1">
                  {DAYS_OF_WEEK.map(d => (
                    <button key={d.id} onClick={() => toggleDay(d.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${applyDays.includes(d.id) ? 'bg-green-600 border-green-600 text-white' : ''}`}
                      style={!applyDays.includes(d.id) ? { borderColor, color: textColor } : {}}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BƯỚC 2: KIỂM TRA LỊCH NGỦ */}
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: isEnough ? (isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5') : (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2'), border: `1px solid ${isEnough ? '#10b981' : '#ef4444'}` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isEnough ? 'bg-green-500' : 'bg-red-500'}`}>2</span>
                <h2 className="font-semibold" style={{ color: isEnough ? '#047857' : '#b91c1c' }}>Phân tích</h2>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: isEnough ? '#047857' : '#b91c1c' }}>Thời lượng dự kiến:</span>
                <span className={`text-xl font-bold ${isEnough ? 'text-green-600' : 'text-red-600'}`}>
                  {durH}h {durM > 0 ? durM + 'p' : ''}
                </span>
              </div>
              <div className="mt-2 text-xs flex gap-2 items-start" style={{ color: isEnough ? '#047857' : '#b91c1c' }}>
                <Info size={14} className="shrink-0 mt-0.5" />
                {isEnough 
                  ? `Đạt chuẩn so với mục tiêu ${goalHours}h của bạn.` 
                  : `Bị thiếu so với mục tiêu ${goalHours}h. Hãy cân nhắc ngủ sớm hơn!`}
              </div>
            </div>

            {/* BƯỚC 3: NHẮC NHỞ & BÁO THỨC */}
            <div className="rounded-2xl p-4 shadow-sm space-y-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-green-100 text-green-800">3</span>
                <h2 className="font-semibold" style={{ color: primaryColor }}>Nhắc nhở & Báo thức</h2>
              </div>
              
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-3">
                  {remind30Min ? <Bell size={18} className="text-blue-500" /> : <BellOff size={18} style={{ color: secondaryText }} />}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: textColor }}>Nhắc đi ngủ</span>
                    <span className="text-xs" style={{ color: secondaryText }}>Gửi thông báo trước 30 phút</span>
                  </div>
                </div>
                <button onClick={() => setRemind30Min(!remind30Min)} className={`w-12 h-6 rounded-full transition-colors relative ${remind30Min ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${remind30Min ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-3">
                  {alarmEnabled ? <Volume2 size={18} className="text-green-500" /> : <BellOff size={18} style={{ color: secondaryText }} />}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: textColor }}>Báo thức</span>
                    <span className="text-xs" style={{ color: secondaryText }}>Chuông reo lúc {wakeTime}</span>
                  </div>
                </div>
                <button onClick={() => setAlarmEnabled(!alarmEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${alarmEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${alarmEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* NÚT LƯU */}
            <button onClick={() => setShowConfirmModal(true)}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
              <Save size={20} />
              Lưu & Kích hoạt
            </button>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full rounded-t-3xl p-6 shadow-2xl animate-fade-in-up" style={{ background: bgMain, borderTop: `1px solid ${borderColor}` }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold" style={{ color: primaryColor }}>Lưu lịch ngủ</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-800">
                <X size={20} style={{ color: textColor }} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between p-4 rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                <div className="flex flex-col text-center">
                  <span className="text-xs" style={{ color: secondaryText }}>Đi ngủ</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>{bedTime}</span>
                </div>
                <div className="flex flex-col justify-center items-center px-4">
                  <span className="text-xs border-b border-dashed pb-1 mb-1" style={{ borderColor, color: secondaryText }}>Thời lượng</span>
                  <span className={`text-sm font-bold ${isEnough ? 'text-green-600' : 'text-red-500'}`}>{durH}h {durM}p</span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-xs" style={{ color: secondaryText }}>Thức dậy</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>{wakeTime}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2" style={{ color: textColor }}>
                  <CheckCircle2 size={16} className={isEnough ? 'text-green-500' : 'text-red-500'} />
                  Đạt mục tiêu: {isEnough ? 'Có' : 'Không'}
                </div>
                <div className="flex items-center gap-2" style={{ color: textColor }}>
                  <Bell size={16} className={remind30Min ? 'text-blue-500' : 'text-gray-400'} />
                  Nhắc nhở: {remind30Min ? 'Bật' : 'Tắt'}
                </div>
              </div>
            </div>

            <button onClick={handleSaveConfirmed}
              className="w-full py-4 rounded-xl font-bold text-white text-base shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #173325 0%, #2d6a40 100%)' }}>
              Xác nhận Lưu
            </button>
          </div>
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
