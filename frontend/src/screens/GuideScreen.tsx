import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { ArrowLeft, CheckCircle, ArrowRight, Calendar, Utensils, Moon, User, Bell } from 'lucide-react';

const steps = [
  { icon: User, title: 'Tạo hồ sơ', desc: 'Nhập thông tin cá nhân để cá nhân hóa trải nghiệm và tính toán TDEE chính xác.' },
  { icon: Calendar, title: 'Quản lý lịch trình', desc: 'Thêm nhiệm vụ, deadline và nhận nhắc nhở đúng thời điểm.' },
  { icon: Utensils, title: 'Theo dõi dinh dưỡng', desc: 'Ghi nhận bữa ăn, theo dõi calo và dưỡng chất hàng ngày.' },
  { icon: Moon, title: 'Tối ưu giấc ngủ', desc: 'Đặt giờ thức dậy, nhận đề xuất giờ đi ngủ khoa học theo chu kỳ.' },
  { icon: Bell, title: 'Nhắc nhở thông minh', desc: 'Bật thông báo để không bỏ lỡ bất kỳ việc quan trọng nào.' },
];

export function GuideScreen() {
  const { theme, setScreen } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const isLast = currentStep === steps.length - 1;
  const Icon = steps[currentStep].icon;

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      <div className="px-5 pt-4 pb-5" style={{ background: theme === 'dark' ? 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)' : 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('profile')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">Hướng dẫn</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all" style={{ background: i === currentStep ? '#94d400' : theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db', width: i === currentStep ? '24px' : '8px' }} />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : 'rgba(23,51,37,0.08)' }}>
            <Icon size={48} style={{ color: '#94d400' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: theme === 'dark' ? '#fff' : '#173325' }}>{steps[currentStep].title}</h2>
          <p className="text-base leading-relaxed mb-8" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#5f6368' }}>{steps[currentStep].desc}</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pb-8">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep(s => s - 1)} className="flex-1 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0', color: theme === 'dark' ? '#fff' : '#5f6368' }}>
              Quay lại
            </button>
          )}
          <button
            onClick={() => isLast ? setScreen('profile') : setCurrentStep(s => s + 1)}
            className="flex-1 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
          >
            {isLast ? (
              <><CheckCircle size={18} /> Hoàn thành</>
            ) : (
              <><span>Tiếp tục</span><ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
