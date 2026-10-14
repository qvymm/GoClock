import React, { useState } from 'react';
import { User, ChevronRight, Bell, Clock, Scale, LogOut, Edit2, Check, Settings, HelpCircle, BookOpen, Crown } from 'lucide-react';
import { isPremiumActive, supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';

export function ProfileScreen() {
  const { user, profile, setProfile, logout, theme, setScreen } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || user?.user_metadata?.full_name || '',
    height: profile?.height?.toString() || '',
    weight: profile?.weight?.toString() || '',
    gender: profile?.gender || '',
    activity_level: profile?.activity_level || '',
    notify_tasks: profile?.notify_tasks ?? true,
    notify_meals: profile?.notify_meals ?? true,
    notify_sleep: profile?.notify_sleep ?? true,
    meal_breakfast: profile?.meal_breakfast || '07:00',
    meal_lunch: profile?.meal_lunch || '12:00',
    meal_dinner: profile?.meal_dinner || '18:00',
  });
  const [saving, setSaving] = useState(false);

  const h = parseFloat(form.height);
  const w = parseFloat(form.weight);
  const bmi = h && w ? w / ((h / 100) ** 2) : null;

  function getBmiInfo(b: number | null) {
    if (!b) return { label: '—', color: '#9aa0a6' };
    if (b < 18.5) return { label: 'Thiếu cân', color: '#1967d2' };
    if (b < 25) return { label: 'Bình thường', color: '#137333' };
    if (b < 30) return { label: 'Thừa cân', color: '#e65100' };
    return { label: 'Béo phì', color: '#d93025' };
  }

  function calcTDEE() {
    if (!h || !w) return 0;
    const age = profile?.date_of_birth
      ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600000))
      : 0;
    if (!h || !w || !age || !form.gender || !form.activity_level) return 0;
    let bmr = form.gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
      : 447.593 + 9.247 * w + 3.098 * h - 4.330 * age;
    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };
    return Math.round(bmr * (multipliers[form.activity_level] || 1.55));
  }

  const bmiInfo = getBmiInfo(bmi);
  const tdee = calcTDEE();
  const premiumActive = isPremiumActive(profile);

  async function saveProfile() {
    setSaving(true);
    const updated = {
      ...form,
      height: Number.isFinite(h) && h > 0 ? h : undefined,
      weight: Number.isFinite(w) && w > 0 ? w : undefined,
      gender: form.gender || undefined,
      activity_level: form.activity_level || undefined,
      bmi: bmi ? Math.round(bmi * 10) / 10 : undefined,
      tdee: tdee || undefined,
      updated_at: new Date().toISOString(),
    };
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, ...updated });
    }
    setProfile({ ...profile, ...updated } as any);
    setSaving(false);
    setEditing(false);
  }

  const activityLabels: Record<string, string> = {
    sedentary: 'Ít vận động', light: 'Nhẹ', moderate: 'Trung bình',
    active: 'Năng động', very_active: 'Rất năng động',
  };

  const menuItems = [
    { icon: Settings, label: 'Cài đặt', screen: 'settings', color: '#1967d2' },
    { icon: HelpCircle, label: 'Trợ giúp', screen: 'help', color: '#137333' },
    { icon: BookOpen, label: 'Hướng dẫn', screen: 'guide', color: '#b06000' },
    { icon: Crown, label: 'Gói Premium', screen: 'premium', color: '#e65100', badge: premiumActive ? 'PREMIUM' : 'FREE' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 safe-pt pb-4" style={{ background: theme === 'dark' ? 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)' : 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Hồ sơ</h1>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm"
            style={{ background: editing ? 'rgba(148,212,0,0.2)' : 'rgba(255,255,255,0.1)', color: editing ? '#94d400' : 'rgba(255,255,255,0.7)' }}>
            {editing ? <><Check size={14} /> Xong</> : <><Edit2 size={14} /> Sửa</>}
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: '#94d400' }}>
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold safe-pt"
              style={{ background: 'rgba(148,212,0,0.2)', color: '#94d400' }}>
              {form.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            {editing ? (
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="text-lg font-bold rounded-lg px-2 py-1 outline-none"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(148,212,0,0.3)' }} />
            ) : (
              <p className="text-lg font-bold text-white">{form.full_name}</p>
            )}
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {user?.email || 'Tài khoản GõClock'}
            </p>
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={premiumActive
                ? { color: '#d9ff70', background: 'rgba(148,212,0,0.2)', border: '1px solid rgba(148,212,0,0.45)' }
                : { color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}
            >
              {premiumActive ? <><Crown size={12} /> PREMIUM{profile?.premium_until ? ` · ${new Date(profile.premium_until).toLocaleDateString('vi-VN')}` : ''}</> : 'FREE · GÓI CƠ BẢN'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4 pb-6">
        {/* BMI / TDEE cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>BMI</p>
            <p className="text-2xl font-bold" style={{ color: bmiInfo.color }}>{bmi ? bmi.toFixed(1) : '—'}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: bmiInfo.color }}>{bmiInfo.label}</p>
          </div>
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>TDEE (Calo/ngày)</p>
            <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{tdee || '—'}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>kcal mục tiêu</p>
          </div>
        </div>

        {/* Body stats */}
        <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Scale size={14} /> Chỉ số cơ thể
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Chiều cao (cm)</label>
              {editing ? (
                <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-semibold"
                  style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }} />
              ) : (
                <p className="font-semibold text-lg" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{form.height} <span className="text-sm font-normal text-gray-400">cm</span></p>
              )}
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Cân nặng (kg)</label>
              {editing ? (
                <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-semibold"
                  style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }} />
              ) : (
                <p className="font-semibold text-lg" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{form.weight} <span className="text-sm font-normal text-gray-400">kg</span></p>
              )}
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs mb-1.5 block" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Giới tính</label>
            {editing ? (
              <div className="grid grid-cols-3 gap-2">
                {[['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, gender: v as any }))}
                    className="py-2 rounded-xl text-xs font-medium transition-all"
                    style={form.gender === v
                      ? { background: theme === 'dark' ? '#94d400' : '#173325', color: theme === 'dark' ? '#0d1f12' : '#94d400' }
                      : { background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5', color: theme === 'dark' ? '#fff' : '#5f6368' }}>
                    {l}
                  </button>
                ))}
              </div>
            ) : (
              <p className="font-medium text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>
                {form.gender === 'male' ? 'Nam' : form.gender === 'female' ? 'Nữ' : form.gender === 'other' ? 'Khác' : 'Chưa cập nhật'}
              </p>
            )}
          </div>

          <div className="mt-3">
            <label className="text-xs mb-1.5 block" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>Mức độ vận động</label>
            {editing ? (
              <select value={form.activity_level} onChange={e => setForm(p => ({ ...p, activity_level: e.target.value as any }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }}>
                {Object.entries(activityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : (
              <p className="font-medium text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{activityLabels[form.activity_level] || 'Chưa cập nhật'}</p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Bell size={14} /> Cài đặt thông báo
          </h3>
          {[
            { key: 'notify_tasks', label: 'Nhắc lịch học & nhiệm vụ', icon: '📋' },
            { key: 'notify_meals', label: 'Nhắc giờ ăn', icon: '🍽️' },
            { key: 'notify_sleep', label: 'Nhắc giờ ngủ', icon: '🌙' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f5f5f5'}` }}>
              <div className="flex items-center gap-2">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{item.label}</span>
              </div>
              <button
                onClick={() => setForm(p => ({ ...p, [item.key]: !(p as any)[item.key] }))}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: (form as any)[item.key] ? '#94d400' : theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#e0e0e0' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: (form as any)[item.key] ? '22px' : '2px' }} />
              </button>
            </div>
          ))}
        </div>

        {/* Meal times */}
        <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Clock size={14} /> Khung giờ ăn
          </h3>
          {[
            { key: 'meal_breakfast', label: '🌅 Bữa sáng' },
            { key: 'meal_lunch', label: '☀️ Bữa trưa' },
            { key: 'meal_dinner', label: '🌙 Bữa chiều' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f5f5f5'}` }}>
              <span className="text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{item.label}</span>
              {editing ? (
                <input type="time" value={(form as any)[item.key]}
                  onChange={e => setForm(p => ({ ...p, [item.key]: e.target.value }))}
                  className="px-2 py-1 rounded-lg border text-sm outline-none"
                  style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#173325', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', colorScheme: theme }} />
              ) : (
                <span className="font-semibold text-sm" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{(form as any)[item.key]}</span>
              )}
            </div>
          ))}
        </div>

        {/* Quick menu */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          {menuItems.map((item, i) => (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen as any)}
              className="w-full flex items-center gap-3 p-4 text-left transition-all"
              style={{ borderBottom: i < menuItems.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` : 'none' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20` }}>
                <item.icon size={20} style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{item.label}</p>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#94d400', color: '#0d1f12' }}>
                  {item.badge}
                </span>
              )}
              <ChevronRight size={18} style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : '#d1d5db' }} />
            </button>
          ))}
        </div>

        {editing && (
          <button onClick={saveProfile} disabled={saving}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-60 mb-3"
            style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        )}

        {/* Logout */}
        <button onClick={logout}
          className="w-full py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 mb-8 transition-all active:scale-95"
          style={{ background: theme === 'dark' ? 'rgba(217,48,37,0.15)' : '#fce8e6', color: '#d93025', border: `1px solid ${theme === 'dark' ? 'rgba(217,48,37,0.3)' : 'rgba(217,48,37,0.2)'}` }}>
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
