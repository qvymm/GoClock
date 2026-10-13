import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { ArrowLeft, Check, Crown, Zap, Star, Shield } from 'lucide-react';

const features = [
  'Quản lý không giới hạn nhiệm vụ và lịch trình',
  'Phân tích giấc ngủ chi tiết với biểu đồ',
  'Theo dõi dinh dưỡng nâng cao với AI',
  'Xuất báo cáo định kỳ (PDF/Excel)',
  'Không hiển thị quảng cáo',
  'Ưu tiên hỗ trợ kỹ thuật 24/7',
];

const plans = [
  { id: 'monthly', name: 'Hàng tháng', price: '49.000đ', period: '/tháng', popular: false },
  { id: 'yearly', name: 'Hàng năm', price: '399.000đ', period: '/năm', popular: true, savings: 'Tiết kiệm 33%' },
];

export function PremiumScreen() {
  const { theme, setScreen } = useApp();
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-6" style={{ background: 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen('profile')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">GõClock Premium</h1>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)' }}>
            <Crown size={32} style={{ color: '#0d1f12' }} />
          </div>
          <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>Mở khóa toàn bộ tính năng cao cấp</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4">
        {/* Features */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Tính năng Premium</h3>
          <div className="flex flex-col gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(148,212,0,0.2)' }}>
                  <Check size={12} style={{ color: '#94d400' }} />
                </div>
                <span className="text-sm" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : '#202124' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-3 mb-4">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="relative rounded-2xl p-4 text-left transition-all"
              style={selectedPlan === plan.id
                ? { background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : 'rgba(23,51,37,0.08)', border: `1.5px solid ${theme === 'dark' ? '#94d400' : '#173325'}` }
                : { background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: '1.5px solid transparent' }}
            >
              {plan.popular && (
                <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#94d400', color: '#0d1f12' }}>
                  {plan.savings}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{plan.name}</p>
                  <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{plan.popular ? 'Phổ biến nhất' : 'Linh hoạt'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{plan.price}</p>
                  <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{plan.period}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Benefits badges */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Shield size={14} style={{ color: '#94d400' }} />
            <span>An toàn</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Zap size={14} style={{ color: '#94d400' }} />
            <span>Hủy bất cứ lúc nào</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Star size={14} style={{ color: '#94d400' }} />
            <span>7 ngày dùng thử</span>
          </div>
        </div>

        <button
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 mb-3"
          style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
        >
          Nâng cấp Premium
        </button>

        <p className="text-xs text-center text-gray-400 mb-6">
          Thanh toán qua App Store hoặc Google Play. Hủy bất cứ lúc nào.
        </p>
      </div>
    </div>
  );
}
