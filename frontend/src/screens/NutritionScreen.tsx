import React, { useState } from 'react';
import { Plus, X, Camera, Image, PenLine, Flame, Beef, Wheat, Droplets, Clock, ChevronRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';

export function NutritionScreen() {
  const { user, meals, profile, refreshMeals, theme } = useApp();
  const displayMeals = meals;

  const [showAdd, setShowAdd] = useState(false);
  const [inputMethod, setInputMethod] = useState<'camera' | 'library' | 'manual' | null>(null);
  const [form, setForm] = useState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'lunch' as any });
  const [loading, setLoading] = useState(false);

  const targetCal = profile?.tdee || 2000;
  const totalCal = displayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = displayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = displayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = displayMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const calPercent = Math.min(100, (totalCal / targetCal) * 100);

  const mealIcons: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
  const mealLabels: Record<string, string> = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa chiều', snack: 'Bữa phụ' };

  async function addMeal() {
    if (!form.food_name || !form.calories) return;
    setLoading(true);
    if (user) {
      await supabase.from('meals').insert({
        user_id: user.id,
        food_name: form.food_name,
        calories: parseInt(form.calories),
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        meal_type: form.meal_type,
        eaten_at: new Date().toISOString(),
      });
      await refreshMeals();
    }
    setForm({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'lunch' });
    setInputMethod(null);
    setShowAdd(false);
    setLoading(false);
  }

  function getAdvice() {
    const ratio = totalCal / targetCal;
    if (ratio < 0.4) return { text: 'Bạn đang thiếu calo! Hãy ăn thêm để đủ năng lượng.', color: '#e65100', bg: '#fff3e0' };
    if (ratio > 1.1) return { text: 'Bạn đã vượt calo mục tiêu. Hãy chú ý lượng ăn nhé!', color: '#d93025', bg: '#fce8e6' };
    if (totalProtein < 50) return { text: 'Lượng protein còn thấp. Bổ sung thêm thịt, trứng, đậu.', color: '#1967d2', bg: '#e8f0fe' };
    return { text: 'Tuyệt vời! Chế độ ăn của bạn khá cân bằng hôm nay.', color: '#137333', bg: '#e6f4ea' };
  }

  const advice = getAdvice();

  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 safe-pt pb-4" style={{ background: 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Dinh dưỡng</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm"
            style={{ background: 'rgba(148,212,0,0.15)', color: '#94d400', border: '1px solid rgba(148,212,0,0.3)' }}>
            <Plus size={16} /> Thêm
          </button>
        </div>

        {/* Calorie ring + macros */}
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg width="128" height="128" className="circle-progress">
              <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <circle cx="64" cy="64" r="52" fill="none" stroke="#94d400" strokeWidth="10"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold text-xl text-white">{totalCal}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>/ {targetCal}</span>
              <span className="text-[10px]" style={{ color: '#94d400' }}>kcal</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-2">
            {[
              { icon: <Beef size={14} />, label: 'Protein', val: `${Math.round(totalProtein)}g`, target: '60g', color: '#ef4444' },
              { icon: <Wheat size={14} />, label: 'Carbs', val: `${Math.round(totalCarbs)}g`, target: '250g', color: '#f59e0b' },
              { icon: <Droplets size={14} />, label: 'Fat', val: `${Math.round(totalFat)}g`, target: '65g', color: '#3b82f6' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ color: m.color }}>{m.icon}</div>
                <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{m.label}</span>
                <span className="text-xs font-bold text-white">{m.val}</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>/{m.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4 pb-6">
        {/* Advice */}
        <div className="rounded-2xl p-3 mb-4 flex items-start gap-2" style={{ background: advice.bg, border: `1px solid ${advice.color}30` }}>
          <Info size={14} style={{ color: advice.color, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-medium leading-relaxed" style={{ color: advice.color }}>{advice.text}</p>
        </div>

        {/* Meals list */}
        <h3 className="font-semibold text-sm mb-3" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Bữa ăn hôm nay</h3>
        <div className="flex flex-col gap-2 mb-4">
          {displayMeals.length === 0 ? (
            <div className="rounded-2xl p-6 text-center shadow-sm flex flex-col items-center"
              style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
              <span className="text-3xl mb-2">🥗</span>
              <p className="font-bold text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>Chưa ghi nhận bữa ăn nào</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">Nhấn "+ Thêm món" để theo dõi calo thực tế hôm nay</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#0d2215] bg-[#94d400] transition-transform active:scale-95"
              >
                + Ghi nhận bữa ăn
              </button>
            </div>
          ) : (
            displayMeals.map((meal: any) => (
              <div key={meal.id} className="rounded-2xl p-3.5 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : '#f0f7f2' }}>
                    {mealIcons[meal.meal_type] || '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-sm truncate" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{meal.food_name}</p>
                      <span className="font-bold text-sm ml-2 flex-shrink-0" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{meal.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : '#f0f7f2', color: theme === 'dark' ? '#94d400' : '#173325' }}>
                        {mealLabels[meal.meal_type]}
                      </span>
                      <span className="text-[10px]" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
                        P: {Math.round(meal.protein)}g · C: {Math.round(meal.carbs)}g · F: {Math.round(meal.fat)}g
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Meal schedule reminder */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Clock size={14} /> Lịch ăn gợi ý hôm nay
          </h4>
          {[
            { type: 'Bữa sáng', time: '7:00', icon: '🌅', cal: Math.round(targetCal * 0.3) },
            { type: 'Bữa trưa', time: '12:00', icon: '☀️', cal: Math.round(targetCal * 0.4) },
            { type: 'Bữa chiều', time: '18:00', icon: '🌙', cal: Math.round(targetCal * 0.3) },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < 2 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f5f5f5'}` : 'none' }}>
              <span className="text-lg">{b.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{b.type}</p>
                <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{b.cal} kcal gợi ý</p>
              </div>
              <span className="text-xs font-medium" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{b.time}</span>
            </div>
          ))}
        </div>
        <div className="h-4" />
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowAdd(false); setInputMethod(null); }}>
          <div className="bottom-sheet w-full max-h-[85%] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="drag-handle" />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h3 className="font-bold text-lg" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Thêm bữa ăn</h3>
              <button onClick={() => { setShowAdd(false); setInputMethod(null); }} className="p-2 rounded-full" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }}>
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-content px-5 pb-2">
              {!inputMethod ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm mb-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#5f6368' }}>Chọn phương thức nhập:</p>
                  {[
                    { key: 'camera', icon: <Camera size={28} />, label: 'Chụp ảnh', desc: 'AI nhận diện món ăn & tính dinh dưỡng', color: '#8E3114', bg: theme === 'dark' ? 'rgba(142,49,20,0.15)' : '#fdf3ee' },
                    { key: 'library', icon: <Image size={28} />, label: 'Thư viện ảnh', desc: 'Chọn ảnh từ thiết bị', color: '#1967d2', bg: theme === 'dark' ? 'rgba(25,103,210,0.15)' : '#e8f0fe' },
                    { key: 'manual', icon: <PenLine size={28} />, label: 'Nhập tay', desc: 'Nhập tên món ăn và calo', color: '#137333', bg: theme === 'dark' ? 'rgba(19,115,51,0.15)' : '#e6f4ea' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setInputMethod(m.key as any)}
                      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-98"
                      style={{ background: m.bg, border: `1px solid ${m.color}20` }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${m.color}15`, color: m.color }}>
                        {m.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-base" style={{ color: m.color }}>{m.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: `${m.color}99` }}>{m.desc}</p>
                      </div>
                      <ChevronRight size={18} style={{ color: m.color, marginLeft: 'auto' }} />
                    </button>
                  ))}
                </div>
              ) : inputMethod === 'manual' ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => setInputMethod(null)} className="flex items-center gap-1 text-sm mb-1" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
                    ← Quay lại
                  </button>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Tên món ăn *</label>
                    <input type="text" value={form.food_name} onChange={e => setForm(p => ({ ...p, food_name: e.target.value }))}
                      placeholder="VD: Cơm gà, Phở bò..." className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Bữa ăn</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(mealLabels).map(([k, v]) => (
                        <button key={k} onClick={() => setForm(p => ({ ...p, meal_type: k }))}
                          className="py-2 rounded-xl text-xs font-medium transition-all"
                          style={form.meal_type === k
                            ? { background: '#173325', color: '#94d400' }
                            : { background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5', color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#5f6368' }}>
                          {mealIcons[k]} {v.replace('Bữa ', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Lượng calo *</label>
                    <input type="number" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))}
                      placeholder="Kcal" className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['protein', 'carbs', 'fat'].map(k => (
                      <div key={k}>
                        <label className="text-xs font-medium mb-1.5 block capitalize" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{k} (g)</label>
                        <input type="number" value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                          placeholder="0" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1e8d8', color: theme === 'dark' ? '#fff' : '#202124', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <button onClick={() => setInputMethod(null)} className="self-start flex items-center gap-1 text-sm mb-6" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
                    ← Quay lại
                  </button>
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: theme === 'dark' ? 'rgba(25,103,210,0.15)' : '#e8f4fd', color: '#1967d2' }}>
                    {inputMethod === 'camera' ? <Camera size={36} /> : <Image size={36} />}
                  </div>
                  <p className="font-semibold mb-2" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>
                    {inputMethod === 'camera' ? 'Chụp ảnh món ăn' : 'Chọn ảnh từ thư viện'}
                  </p>
                  <p className="text-sm text-center mb-6" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
                    AI sẽ tự nhận diện món ăn và tính toán dinh dưỡng
                  </p>
                  <div className="rounded-2xl p-3 w-full" style={{ background: theme === 'dark' ? 'rgba(25,103,210,0.15)' : '#e8f0fe' }}>
                    <p className="text-xs text-center" style={{ color: '#1967d2' }}>
                      Tính năng AI nhận diện ảnh sẽ có trong phiên bản tiếp theo
                    </p>
                  </div>
                </div>
              )}
            </div>

            {inputMethod === 'manual' && (
              <div className="px-5 pb-8 pt-3 border-t" style={{ borderColor: '#f0f4f0' }}>
                <button onClick={addMeal} disabled={loading}
                  className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #173325 0%, #2d6a40 100%)', color: '#94d400' }}>
                  {loading ? 'Đang lưu...' : 'Thêm bữa ăn'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
