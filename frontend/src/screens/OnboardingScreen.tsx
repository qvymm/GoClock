import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, ChevronRight, Bell, Moon, Utensils, BookOpen, Scale,
  User, UserCircle, Circle, Clock, Sparkles, Check,
} from 'lucide-react';

type Gender = 'male' | 'female' | 'other';
type Activity = 'sedentary' | 'light' | 'active';
type Goal = 'sleep' | 'nutrition' | 'study' | 'balance';

const TOTAL_STEPS = 9;

export function OnboardingScreen() {
  const { setScreen, user } = useApp();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState('2002-06-16');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);
  const [notifGranted, setNotifGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);

  const clockRef = useRef<HTMLDivElement>(null);
  const [isDraggingClock, setIsDraggingClock] = useState(false);

  const handleClockInteraction = (clientX: number, clientY: number) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const totalHours = angle / 30;
    let h12 = Math.floor(totalHours);
    if (h12 === 0) h12 = 12;

    const decimalMinutes = (totalHours % 1) * 60;
    let m = Math.round(decimalMinutes / 5) * 5;
    if (m === 60) {
      m = 0;
      h12 = (h12 % 12) + 1;
    }

    setWakeHour(prevHour => {
      const isPMNow = prevHour >= 12;
      let newHour = h12;
      if (isPMNow) {
        if (newHour < 12) newHour += 12;
      } else {
        if (newHour === 12) newHour = 0;
      }
      return newHour;
    });
    setWakeMinute(m);
  };

  useEffect(() => {
    if (isDraggingClock) {
      const handleGlobalMove = (e: PointerEvent) => {
        handleClockInteraction(e.clientX, e.clientY);
      };
      const handleGlobalUp = () => {
        setIsDraggingClock(false);
      };
      window.addEventListener('pointermove', handleGlobalMove);
      window.addEventListener('pointerup', handleGlobalUp);
      return () => {
        window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp);
      };
    }
  }, [isDraggingClock]);


  const bgStyle = { background: 'linear-gradient(160deg, #0d1f12 0%, #173325 60%, #0a1608 100%)' };

  useEffect(() => {
    if (step === 7 && !loading) {
      startLoading();
    }
  }, [step]);

  useEffect(() => {
    if (user && step === 8) {
      saveProfile(user.id);
    }
  }, [user, step]);

  function goBack() {
    setError('');
    if (step === 0) {
      setScreen('splash');
    } else {
      setStep(s => s - 1);
    }
  }

  function goNext() {
    setError('');
    setStep(s => s + 1);
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return nickname.trim().length > 0;
      case 1: return gender !== null && dob !== '';
      case 2: return true;
      case 3: return activity !== null;
      case 4: return goal !== null;
      case 5: return true;
      case 6: return true;
      case 7: return false;
      default: return false;
    }
  }

  function calculateBedtime(): string {
    const wakeTotalMin = wakeHour * 60 + wakeMinute;
    const bedTotalMin = wakeTotalMin - 8 * 60;
    const adjusted = bedTotalMin < 0 ? bedTotalMin + 24 * 60 : bedTotalMin;
    const h = Math.floor(adjusted / 60);
    const m = adjusted % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  async function requestNotifications() {
    try {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') setNotifGranted(true);
        else setNotifGranted(true);
      } else {
        setNotifGranted(true);
      }
    } catch {
      setNotifGranted(true);
    }
  }

  async function startLoading() {
    setLoading(true);
    setAnalysisStepIndex(0);
    for (let i = 0; i < 4; i++) {
      setAnalysisStepIndex(i);
      await new Promise(r => setTimeout(r, 1200));
    }
    setAnalysisStepIndex(4);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStep(8);
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);

    const pendingData = {
      nickname, gender, dob, height, weight, activity, goal, wakeHour, wakeMinute, notifGranted
    };
    localStorage.setItem('pending_onboarding', JSON.stringify(pendingData));

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function saveProfile(userId?: string) {
    if (!userId) return;
    const h = height, w = weight;
    const bmi = w / ((h / 100) ** 2);
    const activityMap: Record<Activity, string> = {
      sedentary: 'sedentary', light: 'light', active: 'active',
    };
    const tdee = Math.round(
      (gender === 'male' ? 88.36 : 447.6) +
      (gender === 'male' ? 13.4 : 9.25) * w +
      (gender === 'male' ? 4.8 : 3.10) * h -
      (gender === 'male' ? 5.68 : 4.33) * 25
    );
    const wakeTimeStr = `${String(wakeHour).padStart(2, '0')}:${String(wakeMinute).padStart(2, '0')}`;
    await supabase.from('profiles').upsert({
      id: userId,
      nickname,
      full_name: nickname,
      gender,
      date_of_birth: dob,
      height: h,
      weight: w,
      bmi: Math.round(bmi * 10) / 10,
      tdee,
      activity_level: activityMap[activity!],
      primary_goal: goal,
      wake_time: wakeTimeStr,
      notifications_enabled: notifGranted,
      onboarding_completed: true,
    });
    localStorage.setItem('show_coachmarks', 'true');
    setScreen('dashboard');
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden safe-pt safe-pb" style={bgStyle}>

      {/* Header: back + progress */}
      {step < 8 && (
        <div className="flex items-center justify-between px-6 py-4 mt-2">
          {step === 7 ? (
            <div className="w-6" /> // spacer to balance layout
          ) : (
            <button onClick={goBack} className="text-white/80 hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1 mx-6 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${step === 7 ? 100 : ((step + 1) / TOTAL_STEPS) * 100}%`,
                background: '#b2d400'
              }}
            />
          </div>
          <span className="text-sm font-bold text-white/50">
            {step === 7 ? 'Bước 8/8' : `${step + 1}/${TOTAL_STEPS}`}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-content px-6 pt-6 pb-8">
        {/* Step 0: Nickname */}
        {step === 0 && (
          <div className="flex flex-col h-full justify-between">
            {/* Center Content */}
            <div className="flex-1 flex flex-col justify-center items-center py-8">
              <h2 className="text-3xl font-extrabold text-white text-center leading-snug mb-8 max-w-[300px] mx-auto">
                Chào bạn, mình nên gọi bạn là gì nhỉ? 👋
              </h2>
              <div className="w-full mb-3">
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canProceed() && goNext()}
                  placeholder="Nhập tên của bạn..."
                  autoFocus
                  className="w-full px-5 py-5 rounded-xl text-lg text-center outline-none transition-all duration-300 font-bold placeholder:text-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '2px solid #c8ec2d',
                    color: 'white',
                  }}
                />
              </div>
              <p className="text-xs text-center text-white/40 max-w-[240px] leading-relaxed">
                Bạn có thể thay đổi tên này bất cứ lúc nào trong cài đặt.
              </p>
            </div>

            {/* Bottom Button */}
            <div className="pb-4">
              <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
            </div>
          </div>
        )}

        {/* Step 1: Gender + DOB */}
        {step === 1 && (() => {
          const currentDob = dob || '2002-06-16';
          const parts = currentDob.split('-');
          const currentYear = parseInt(parts[0]) || 2002;
          const currentMonth = parseInt(parts[1]) || 6;
          const currentDay = parseInt(parts[2]) || 16;

          const days = Array.from({ length: 31 }, (_, i) => i + 1);
          const months = Array.from({ length: 12 }, (_, i) => i + 1);
          const years = Array.from({ length: 70 }, (_, i) => 2026 - i);

          const updateDate = (d: number, m: number, y: number) => {
            const maxDays = new Date(y, m, 0).getDate();
            const adjustedDay = Math.min(d, maxDays);
            const formatted = `${y}-${String(m).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
            setDob(formatted);
          };

          return (
            <div className="flex flex-col h-full justify-between">
              <div className="flex-1 overflow-y-auto scroll-content pb-4">
                <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                  Thông tin nhân trắc học
                </h2>
                <p className="text-sm mb-6 text-white/50 leading-relaxed">
                  Cung cấp một chút thông tin để GõClock hiểu cơ thể bạn nhé!
                </p>

                {/* Gender selector */}
                <p className="text-[10px] font-bold tracking-wider text-[#94d400] mb-3">GIỚI TÍNH</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {([
                    {
                      v: 'male',
                      l: 'Nam',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="10" cy="14" r="5" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="21" y1="3" x2="13.5" y2="10.5" />
                        </svg>
                      )
                    },
                    {
                      v: 'female',
                      l: 'Nữ',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="9" r="5" />
                          <line x1="12" y1="14" x2="12" y2="21" />
                          <line x1="9" y1="18" x2="15" y2="18" />
                        </svg>
                      )
                    },
                    {
                      v: 'other',
                      l: 'Khác',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M14.8 9.2 L19 5 M16 5 H19 V8" />
                          <path d="M12 16 V21 M10 19 H14" />
                          <path d="M9.2 9.2 L5 5 M5 8 V5 H8" />
                        </svg>
                      )
                    },
                  ] as const).map(({ v, l, icon }) => {
                    const selected = gender === v;
                    return (
                      <button key={v} onClick={() => setGender(v as Gender)}
                        className="flex flex-col items-center justify-center gap-3 py-6 rounded-2xl transition-all"
                        style={selected
                          ? { background: 'rgba(200,236,45,0.06)', border: '2px solid #c8ec2d', color: '#c8ec2d' }
                          : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent', color: 'rgba(255,255,255,0.45)' }}>
                        {icon}
                        <span className="text-xs font-bold">{l}</span>
                      </button>
                    );
                  })}
                </div>

                {/* DOB scroll selector */}
                <p className="text-[10px] font-bold tracking-wider text-[#94d400] mb-3">NGÀY SINH</p>
                <div className="relative bg-white/5 border border-white/10 rounded-2xl h-[120px] flex overflow-hidden mb-6">
                  {/* Highlight bar in center */}
                  <div className="absolute inset-x-0 top-[40px] h-[40px] border-y border-[#c8ec2d]/20 bg-[#c8ec2d]/5 pointer-events-none" />

                  <WheelColumn
                    items={days}
                    value={currentDay}
                    onChange={(d) => updateDate(d, currentMonth, currentYear)}
                  />
                  <WheelColumn
                    items={months}
                    value={currentMonth}
                    onChange={(m) => updateDate(currentDay, m, currentYear)}
                    labelFormatter={(m) => `Th ${m}`}
                  />
                  <WheelColumn
                    items={years}
                    value={currentYear}
                    onChange={(y) => updateDate(currentDay, currentMonth, y)}
                  />
                </div>

                {/* Informative banner */}
                <div className="rounded-2xl p-4 flex gap-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94d400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Dữ liệu này giúp GõClock tính toán nhịp sinh học và mức tiêu thụ năng lượng cơ bản chính xác hơn.
                  </p>
                </div>
              </div>

              {/* Bottom proceed */}
              <div className="pb-4 mt-auto">
                <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
              </div>
            </div>
          );
        })()}

        {/* Step 2: Height + Weight sliders */}
        {step === 2 && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 overflow-y-auto scroll-content pb-4">
              <p className="text-[10px] font-bold tracking-wider text-[#94d400] mb-2">CHỈ SỐ CƠ THỂ</p>
              <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                Chiều cao và cân nặng hiện tại của bạn?
              </h2>
              <p className="text-sm mb-6 text-white/50 leading-relaxed">
                Thông tin này giúp GõClock tính toán chỉ số BMI và lịch trình vận động chính xác hơn.
              </p>

              {/* Height Selector */}
              <div className="mb-8">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-lg font-bold text-white/90">Chiều cao</span>
                  <span className="text-3xl font-black text-[#c8ec2d]">
                    {height} <span className="text-sm font-bold text-white/40">cm</span>
                  </span>
                </div>
                <div className="relative py-2">
                  <RulerSlider
                    min={120}
                    max={220}
                    value={height}
                    onChange={setHeight}
                  />
                </div>
              </div>

              {/* Weight Selector */}
              <div className="mb-8">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-lg font-bold text-white/90">Cân nặng</span>
                  <span className="text-3xl font-black text-[#c8ec2d]">
                    {weight} <span className="text-sm font-bold text-white/40">kg</span>
                  </span>
                </div>
                <div className="relative py-2">
                  <RulerSlider
                    min={30}
                    max={150}
                    value={weight}
                    onChange={setWeight}
                  />
                </div>
              </div>

              {/* Private Lock text */}
              <div className="flex items-center justify-center gap-1.5 py-4 text-white/40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[11px] font-medium">Đừng lo, thông tin này được bảo mật 100%.</span>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pb-4 mt-auto">
              <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
            </div>
          </div>
        )}

        {/* Step 3: Activity level */}
        {step === 3 && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 overflow-y-auto scroll-content pb-4">
              <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                Một ngày bình thường của bạn diễn ra thế nào? 🚶‍♂️📚
              </h2>
              <p className="text-sm mb-6 text-white/50 leading-relaxed">
                Chọn mức độ vận động phù hợp nhất để chúng mình thiết lập lộ trình sức khỏe cá nhân cho bạn.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                {([
                  {
                    v: 'sedentary',
                    l: 'Ít vận động',
                    d: 'Ngồi làm việc hoặc học tập cả ngày',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 18v3" />
                        <path d="M20 18v3" />
                        <path d="M19 12v3H5v-3" />
                        <path d="M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z" />
                        <path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
                      </svg>
                    )
                  },
                  {
                    v: 'light',
                    l: 'Vận động nhẹ',
                    d: 'Di chuyển quanh khuôn viên hoặc đi bộ ngắn',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="2" />
                        <path d="M13 18l-2-4-2 3" />
                        <path d="M10 10l.5 2h3.5l1.5-2" />
                        <path d="M17 13l-2-4-1.5-3h-2v3.5" />
                      </svg>
                    )
                  },
                  {
                    v: 'active',
                    l: 'Năng động',
                    d: 'Tập luyện thể thao thường xuyên',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.5 6.5h11" />
                        <path d="M6.5 17.5h11" />
                        <path d="M3 10h3v4H3z" />
                        <path d="M18 10h3v4h-3z" />
                        <path d="M8 5h1v14H8z" />
                        <path d="M15 5h1v14h-1z" />
                      </svg>
                    )
                  },
                ] as const).map(({ v, l, d, icon }) => {
                  const selected = activity === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setActivity(v as Activity)}
                      className="flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 text-left relative overflow-hidden"
                      style={selected
                        ? { background: 'rgba(200,236,45,0.01)', border: '2px solid #c8ec2d' }
                        : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}
                    >
                      {/* Icon wrapper */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: selected ? '#c8ec2d' : 'rgba(255,255,255,0.03)',
                          color: selected ? '#0d2215' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-base font-extrabold text-white leading-tight">{l}</p>
                        <p className="text-xs text-white/40 mt-1.5 leading-snug">{d}</p>
                      </div>

                      {/* Checked circle icon on selected */}
                      {selected && (
                        <div className="absolute right-5 w-5 h-5 rounded-full bg-[#c8ec2d] flex items-center justify-center text-[#0d2215] shadow-[0_0_8px_rgba(200,236,45,0.4)]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pb-4 mt-auto">
              <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
            </div>
          </div>
        )}

        {/* Step 4: Primary goal */}
        {step === 4 && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 overflow-y-auto scroll-content pb-4">
              <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                Mục tiêu ưu tiên số 1 của bạn lúc này là gì? 🎯
              </h2>
              <p className="text-sm mb-6 text-white/50 leading-relaxed">
                Đừng lo, GõClock sẽ giúp bạn tối ưu hoá lộ trình dựa trên lựa chọn này.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                {([
                  {
                    v: 'sleep',
                    l: 'Cải thiện giấc ngủ',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )
                  },
                  {
                    v: 'nutrition',
                    l: 'Ăn uống điều độ hơn',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 2v7c0 1.1.9 2 2 2h4v10h2v-10h4c1.1 0 2-.9 2-2V2" />
                        <path d="M9 2v5" />
                        <path d="M5 2v5" />
                        <path d="M19 2v20" />
                        <path d="M15 2v10a4 4 0 0 0 4 4" />
                      </svg>
                    )
                  },
                  {
                    v: 'study',
                    l: 'Quản lý Deadline',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )
                  },
                  {
                    v: 'balance',
                    l: 'Cân bằng tất cả',
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="2" x2="12" y2="22" />
                        <line x1="5" y1="22" x2="19" y2="22" />
                        <line x1="19" y1="17" x2="5" y2="17" />
                        <path d="M19 17l-4-8-4 8" />
                        <path d="M5 17l4-8 4 8" />
                      </svg>
                    )
                  },
                ] as const).map(({ v, l, icon }) => {
                  const selected = goal === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setGoal(v as Goal)}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left relative overflow-hidden"
                      style={selected
                        ? { background: 'rgba(200,236,45,0.01)', border: '2px solid #c8ec2d' }
                        : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}
                    >
                      {/* Icon wrapper */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: selected ? '#c8ec2d' : 'rgba(255,255,255,0.03)',
                          color: selected ? '#0d2215' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-base font-extrabold text-white leading-tight">{l}</p>
                      </div>

                      {/* Checked circle icon */}
                      <div
                        className="absolute right-5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: selected ? '#c8ec2d' : 'rgba(200,236,45,0.15)',
                          color: selected ? '#0d2215' : 'rgba(250,250,250,0.3)',
                          boxShadow: selected ? '0 0 8px rgba(200,236,45,0.4)' : 'none',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pb-4 mt-auto">
              <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
            </div>
          </div>
        )}

        {/* Step 5: Wake time */}
        {step === 5 && (() => {
          const isPM = wakeHour >= 12;
          const period = isPM ? "PM" : "AM";
          const displayHour = wakeHour % 12 || 12;
          const displayHourStr = String(displayHour).padStart(2, '0');
          const displayMinuteStr = String(wakeMinute).padStart(2, '0');
          const handAngle = (displayHour % 12) * 30 + wakeMinute * 0.5;

          const clockNumbers = [
            { label: "1", className: "absolute top-10 left-[189px] h-4" },
            { label: "2", className: "absolute top-[78px] left-[226px] h-4" },
            { label: "3", className: "absolute top-[131px] left-60 h-4" },
            { label: "4", className: "absolute top-[184px] left-[226px] h-4" },
            { label: "5", className: "absolute top-[222px] left-[187px] h-4" },
            { label: "6", className: "absolute top-[236px] left-[135px] h-4" },
            { label: "7", className: "absolute top-[222px] left-[83px] h-4" },
            { label: "8", className: "absolute top-[184px] left-11 h-4" },
            { label: "9", className: "absolute top-[131px] left-[30px] h-4" },
            { label: "10", className: "absolute top-[78px] left-[41px] h-4" },
            { label: "11", className: "absolute top-10 left-[81px] h-4" },
            { label: "12", className: "absolute top-[26px] left-[132px] h-4" },
          ];

          const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
            let newHour = wakeHour % 12;
            if (newPeriod === 'PM') {
              newHour += 12;
            }
            setWakeHour(newHour);
          };

          const handleClockNumberClick = (e: React.MouseEvent, targetHour: number) => {
            e.stopPropagation();
            const isPMNow = wakeHour >= 12;
            let newHour = targetHour;
            if (isPMNow) {
              if (newHour < 12) newHour += 12;
            } else {
              if (newHour === 12) newHour = 0;
            }
            setWakeHour(newHour);
          };

          return (
            <div className="flex flex-col h-full justify-between items-center">
              <div className="w-full flex-1 flex flex-col items-center justify-between">

                {/* Title */}
                <div className="text-center w-full mb-4">
                  <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                    Bạn thường phải dậy lúc mấy giờ để đi học? ⏰
                  </h2>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Thiết lập giờ giấc cơ bản
                  </p>
                </div>

                {/* Digital Output */}
                <div className="flex justify-center w-full mb-6">
                  <output
                    aria-label="Giờ thức dậy đã chọn"
                    className="relative inline-flex flex-col items-center rounded-xl border border-solid border-[#d8ff7f33] bg-[#afe7001a] px-6 py-2"
                  >
                    <div className="relative flex w-fit items-center justify-center whitespace-nowrap text-center [font-family:'Inter-Bold',Helvetica] text-[32px] font-bold leading-10 tracking-[3.20px] text-[#d8ff7f]">
                      {displayHourStr}:{displayMinuteStr} {period}
                    </div>
                  </output>
                </div>

                {/* Interactive Clock Face */}
                <div
                  ref={clockRef}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setIsDraggingClock(true);
                    handleClockInteraction(e.clientX, e.clientY);
                  }}
                  className="relative flex aspect-square w-[calc(100%_-_62px)] max-w-[280px] items-center justify-center rounded-full border border-solid border-[#8c928d1a] cursor-pointer select-none [background:radial-gradient(50%_50%_at_50%_50%,rgba(27,32,37,1)_0%,rgba(10,15,19,1)_100%)]"
                  style={{ touchAction: 'none' }}
                >
                  <div className="absolute left-0 top-0 h-full w-full rounded-full bg-[#ffffff01] shadow-[0px_25px_50px_-12px_#00000040]" />
                  <div className="absolute left-[17px] top-[17px] h-[calc(100%_-_34px)] w-[calc(100%_-_34px)] rounded-full border border-solid border-[#8c928d0d]" />

                  {/* Numbers */}
                  <div className="absolute left-px top-px h-[calc(100%_-_2px)] w-[calc(100%_-_2px)]">
                    {clockNumbers.map((number) => {
                      const targetH = parseInt(number.label);
                      const isSelected = displayHour === targetH;
                      return (
                        <button
                          key={number.label}
                          type="button"
                          onClick={(e) => handleClockNumberClick(e, targetH)}
                          className={`${number.className} flex items-center justify-center whitespace-nowrap text-xs font-bold leading-4 tracking-[0.60px] transition-colors p-1 rounded-full`}
                          style={{
                            color: isSelected ? '#d8ff7f' : '#c2c8c2',
                            transform: isSelected ? 'scale(1.2)' : 'none',
                          }}
                        >
                          {number.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Clock Hand */}
                  <div
                    aria-hidden="true"
                    className="absolute w-1.5 rounded-full bg-[#d8ff7f]"
                    style={{
                      height: '34.75%',
                      bottom: '50%',
                      left: 'calc(50% - 3px)',
                      transformOrigin: 'bottom center',
                      transform: `rotate(${handAngle}deg)`,
                    }}
                  >
                    {/* Handle circle at outer end */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#d8ff7f] shadow-[0px_4px_6px_-4px_#d8ff7f66,0px_10px_15px_-3px_#d8ff7f66]">
                      <div className="relative h-2 w-2 rounded-full bg-[#263500]" />
                    </div>
                  </div>

                  {/* Center pin dot */}
                  <div className="relative h-4 w-4 rounded-full border-2 border-solid border-[#0f1418] bg-[#d8ff7f] shadow-[0px_1px_2px_#0000000d]" />
                </div>

                {/* AM / PM Toggle tabs */}
                <div className="flex w-[calc(100%_-_142px)] max-w-[200px] flex-col items-center pb-0 pt-6">
                  <div
                    className="relative flex w-full max-w-[200px] flex-[0_0_auto] items-start gap-1 rounded-xl bg-[#1b2025] p-1"
                    role="tablist"
                    aria-label="Chọn AM hoặc PM"
                  >
                    {(['AM', 'PM'] as const).map((value) => {
                      const isActive = period === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-pressed={isActive}
                          onClick={() => handlePeriodChange(value)}
                          className={`relative flex flex-1 grow flex-col items-center justify-center rounded-lg px-0 py-2 transition-all ${isActive ? "bg-[#d8ff7f] text-[#263500]" : "text-[#c2c8c2]"
                            }`}
                        >
                          <div
                            className="relative mt-[-1.00px] flex w-fit items-center justify-center whitespace-nowrap text-center [font-family:'Inter-SemiBold',Helvetica] text-xs font-semibold leading-4 tracking-[0]"
                          >
                            {value}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sleep suggestion banner */}
                <div className="relative flex w-full flex-col items-start px-0 pb-0 pt-6 self-stretch">
                  <aside className="relative flex w-full items-start gap-4 rounded-xl border border-solid border-[#b1cdbb1a] bg-[#1b2025b2] p-4 backdrop-blur-[6px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(6px)_brightness(100%)] self-stretch">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#0b2418] text-[#d8ff7f] flex-shrink-0">
                      <Moon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="[font-family:'Inter-Regular',Helvetica] text-sm font-normal leading-[22px] tracking-[0] text-[#c2c8c2]">
                        GoClock đề xuất đi ngủ lúc <strong className="text-[#d8ff7f]">{calculateBedtime()}</strong> (lùi 8 tiếng) để tối ưu nhịp sinh học của bạn.
                      </p>
                    </div>
                  </aside>
                </div>

              </div>

              {/* Bottom Proceed Button */}
              <div className="w-full pb-4 mt-6">
                <ProceedButton disabled={!canProceed()} onClick={goNext} label="Tiếp tục" />
              </div>
            </div>
          );
        })()}

        {/* Step 6: Notifications */}
        {step === 6 && (() => {
          const handleEnableNotifications = async () => {
            if ('Notification' in window) {
              try {
                const perm = await Notification.requestPermission();
                setNotifGranted(perm === 'granted');
              } catch {
                setNotifGranted(true);
              }
            } else {
              setNotifGranted(true);
            }
            goNext();
          };

          const handleSkip = () => {
            setNotifGranted(false);
            goNext();
          };

          return (
            <div className="flex flex-col h-full justify-between items-center">
              <div className="w-full flex-1 flex flex-col items-center justify-center">

                {/* Visual Area Illustration */}
                <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                  {/* Glowing pulsing rings */}
                  <div className="absolute inset-0 rounded-full bg-[#d8ff7f]/5 animate-ping opacity-60" />
                  <div className="absolute inset-4 rounded-full bg-[#d8ff7f]/10 animate-pulse" />
                  <div className="absolute inset-8 rounded-full bg-[#d8ff7f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(216,255,127,0.2)]">
                    <div className="w-20 h-20 rounded-full bg-[#0b2418] flex items-center justify-center border border-[#d8ff7f33]">
                      <Bell size={40} className="text-[#d8ff7f]" />
                    </div>
                  </div>
                </div>

                {/* iOS Style Preview Card */}
                <div className="w-full max-w-[320px] rounded-2xl bg-[#1b2025b2] border border-[#ffffff0d] p-4 backdrop-blur-[6px] shadow-2xl mb-8 transform hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#d8ff7f] flex items-center justify-center text-[#263500] text-[10px] font-black">
                        G
                      </div>
                      <span className="text-[11px] font-bold text-white/50 tracking-wider">GOCLOCK</span>
                    </div>
                    <span className="text-[10px] text-white/40">Bây giờ</span>
                  </div>
                  <p className="text-sm font-bold text-[#dfe3e9] mb-0.5">⏰ Đã đến giờ đi ngủ gợi ý!</p>
                  <p className="text-xs text-[#c2c8c2] leading-relaxed">
                    Hãy chuẩn bị đi ngủ để thức dậy lúc <strong>{String(wakeHour).padStart(2, '0')}:{String(wakeMinute).padStart(2, '0')}</strong> ngày mai tràn đầy năng lượng nhé.
                  </p>
                </div>

                {/* Title & Description */}
                <div className="text-center w-full max-w-md px-4">
                  <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                    Đừng để lỡ kế hoạch nhé! 🔔
                  </h2>
                  <p className="text-sm text-white/50 leading-relaxed max-w-[280px] mx-auto">
                    GoClock cần gửi thông báo để nhắc bạn uống nước, đi ngủ và chạy deadline đúng hạn. Bật thông báo nhé!
                  </p>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="w-full flex flex-col items-center gap-4 pb-4 mt-8">
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="relative flex h-14 w-full items-center justify-center rounded-full bg-[#d8ff7f] shadow-[0px_8px_24px_#d8ff7f33] active:scale-95 transition-transform"
                >
                  <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center [font-family:'Inter-SemiBold',Helvetica] text-sm font-bold leading-7 tracking-[0.6px] text-[#263500]">
                    BẬT THÔNG BÁO
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="relative flex h-10 w-full items-center justify-center px-0 py-2 active:scale-95 transition-transform"
                >
                  <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center [font-family:'Inter-SemiBold',Helvetica] text-xs font-semibold leading-4 tracking-[0] text-[#c2c8c2] hover:text-white">
                    Để sau
                  </span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 7: Loading */}
        {step === 7 && (() => {
          const analysisSteps = [
            { id: 0, label: "Tính toán chỉ số BMI...", Icon: Scale },
            { id: 1, label: "Xác định nhu cầu Calo & Nước (TDEE)...", Icon: Utensils },
            { id: 2, label: "Tối ưu hóa chu kỳ giấc ngủ...", Icon: Moon },
            { id: 3, label: "Cá nhân hóa lộ trình năng suất...", Icon: Sparkles },
          ];

          return (
            <div className="flex flex-col h-full justify-between items-center py-8">
              <div className="w-full flex-1 flex flex-col items-center justify-center">

                {/* Visual Scanner Area */}
                <div className="relative w-24 h-24 flex items-center justify-center rounded-full border border-[#d8ff7f33] bg-[#d8ff7f1a] shadow-[0_0_20px_rgba(216,255,127,0.15)] mb-8">
                  <Sparkles size={36} className="text-[#d8ff7f] animate-pulse" />
                  <div className="absolute inset-0 rounded-full border border-[#d8ff7f]/40 border-t-transparent animate-spin" />
                </div>

                {/* Steps checklist */}
                <div className="w-full max-w-[280px] bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
                  <ul className="flex flex-col gap-4">
                    {analysisSteps.map((s) => {
                      const isCompleted = s.id < analysisStepIndex;
                      const isActive = s.id === analysisStepIndex;

                      let colorClass = "text-white/30";
                      let opacityClass = "opacity-50";
                      let iconElement = <s.Icon size={14} />;

                      if (isCompleted) {
                        colorClass = "text-[#d8ff7f]";
                        opacityClass = "opacity-100";
                        iconElement = <Check size={14} strokeWidth={3} className="text-[#d8ff7f]" />;
                      } else if (isActive) {
                        colorClass = "text-white font-semibold";
                        opacityClass = "opacity-100";
                        iconElement = <s.Icon size={14} className="text-[#d8ff7f] animate-pulse" />;
                      }

                      return (
                        <li
                          key={s.id}
                          className={`flex items-center gap-3 transition-all duration-300 ${opacityClass} ${colorClass}`}
                        >
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                            {iconElement}
                          </div>
                          <span className="text-[13px] tracking-wide">
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Status text */}
                <div className="text-center w-full max-w-sm px-4">
                  <h1 className="text-2xl font-bold tracking-[-0.60px] leading-[30px] text-[#dfe3e9] mb-3">
                    GõClock AI đang phân tích dữ liệu cơ thể của bạn...
                  </h1>
                  <p className="text-sm font-normal leading-6 text-[#c2c8c2] max-w-[260px] mx-auto">
                    GõClock đang cá nhân hóa trải nghiệm năng suất tối ưu cho bạn.
                  </p>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Step 8: Login */}
        {step === 8 && (
          <div className="flex flex-col h-full items-center justify-center py-6">

            {/* Celebration logo & title */}
            <div className="flex flex-col items-center mb-8 text-center px-4">
              <div className="relative w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-[#d8ff7f1a] border border-[#d8ff7f33] shadow-[0_0_15px_rgba(216,255,127,0.1)] animate-pulse overflow-hidden">
                <img src="/logo.png" alt="GoClock Logo" className="w-16 h-16 object-contain" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                Lộ trình đã sẵn sàng!
              </h2>
            </div>

            {error && (
              <div className="w-full max-w-[340px] rounded-xl p-3 text-sm mb-4"
                style={{ background: 'rgba(142,49,20,0.3)', color: '#f87171', border: '1px solid rgba(142,49,20,0.5)' }}>
                {error}
              </div>
            )}

            {/* Google CTA directly */}
            <div className="w-full max-w-[340px] px-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 rounded-full font-bold text-sm tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60 bg-white text-[#1a1a1a] shadow-[0px_4px_24px_rgba(255,255,255,0.15)] hover:bg-white/95"
              >
                <GoogleIcon />
                {loading ? 'ĐANG KẾT NỐI...' : 'TIẾP TỤC VỚI GOOGLE'}
              </button>
            </div>

            {/* Register or Login link */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setScreen('login')}
                className="text-xs font-semibold text-white/50 hover:text-white transition-colors py-2"
              >
                Đăng nhập tài khoản
              </button>
              <span className="text-white/20 text-xs">•</span>
              <button
                onClick={() => setScreen('register')}
                className="text-xs font-semibold text-[#94d400] hover:underline transition-colors py-2"
              >
                Đăng ký tài khoản
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function ProceedButton({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-full font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed mt-auto"
      style={{ background: '#c8ec2d', color: '#0d2215' }}>
      {label.toUpperCase()} <ChevronRight size={18} strokeWidth={3} />
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function WheelColumn({
  items,
  value,
  onChange,
  labelFormatter = (item: any) => String(item)
}: {
  items: any[];
  value: any;
  onChange: (val: any) => void;
  labelFormatter?: (item: any) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const el = containerRef.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx !== -1) {
      el.scrollTop = idx * 40;
    }
  }, [value, items]);

  const handleScroll = () => {
    if (!isMounted.current) return;
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / 40);
    if (idx >= 0 && idx < items.length) {
      const val = items[idx];
      if (val !== value) {
        onChange(val);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[120px] overflow-y-auto scroll-content snap-y snap-mandatory relative flex-1 text-center thin-scroll"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div className="h-10 snap-align-none" />
      {items.map((item, idx) => {
        const selected = item === value;
        return (
          <div
            key={idx}
            className="h-10 flex items-center justify-center snap-start snap-always text-sm font-bold transition-all"
            style={{
              color: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
              transform: selected ? 'scale(1.15)' : 'scale(0.95)',
            }}
          >
            {labelFormatter(item)}
          </div>
        );
      })}
      <div className="h-10 snap-align-none" />
    </div>
  );
}

function RulerSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const markWidth = 24 + 12; // width 24px + gap 12px (gap-3)
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Position initial scroll Left on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollToIndex = value - min;
    const timer = setTimeout(() => {
      el.scrollLeft = scrollToIndex * markWidth;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Position on external value changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollToIndex = value - min;
    const targetScrollLeft = scrollToIndex * markWidth;
    if (Math.abs(el.scrollLeft - targetScrollLeft) > 5 && !isScrolling.current) {
      el.scrollLeft = targetScrollLeft;
    }
  }, [value]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isScrolling.current = true;
    const scrollPos = el.scrollLeft;
    const index = Math.round(scrollPos / markWidth);
    const currentValue = min + index;
    if (currentValue >= min && currentValue <= max) {
      if (currentValue !== value) {
        onChange(currentValue);
        if (window.navigator.vibrate) {
          window.navigator.vibrate(2);
        }
      }
    }

    clearTimeout((el as any).scrollTimeout);
    (el as any).scrollTimeout = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  };

  return (
    <div className="relative w-full py-4 select-none overflow-hidden">
      {/* Left/Right Fade Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0d1f12] via-[#0d1f12]/70 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0d1f12] via-[#0d1f12]/70 to-transparent pointer-events-none z-10" />

      {/* Central Indicator Line */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-16 bg-[#c8ec2d] z-10 shadow-[0_0_8px_rgba(200,236,127,0.8)] pointer-events-none" />

      {/* Scrollable Ruler Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="ruler-container flex items-end gap-3 overflow-x-auto h-24 relative select-none"
        style={{
          scrollPadding: '0 50%',
          paddingLeft: 'calc(50% - 12px)',
          paddingRight: 'calc(50% - 12px)',
        }}
      >
        {items.map((item) => {
          const selected = item === value;
          const isMajor = item % 5 === 0;

          let height = isMajor ? '40px' : '24px';
          if (selected) {
            height = '48px';
          }

          return (
            <div
              key={item}
              className="ruler-mark flex flex-col items-center flex-shrink-0 snap-center"
              style={{ width: '24px' }}
            >
              {/* Tick line */}
              <div
                className="w-0.5 rounded-full transition-all duration-150"
                style={{
                  height: height,
                  background: selected
                    ? '#c8ec2d'
                    : (isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)')
                }}
              />

              {/* Value labels */}
              {isMajor && (
                <span
                  className="mt-2 text-[10px] font-bold transition-colors select-none"
                  style={{
                    color: selected ? '#c8ec2d' : 'rgba(255,255,255,0.35)'
                  }}
                >
                  {item}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
