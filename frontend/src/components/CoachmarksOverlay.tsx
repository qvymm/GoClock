import React, { useState, useEffect, useRef } from 'react';
import { Plus, BarChart3, X } from 'lucide-react';

type Tooltip = {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom';
};

const TOOLTIPS: Tooltip[] = [
  {
    targetSelector: '[data-coachmark="ai-chat"]',
    title: 'Mở AI để hỏi nhanh',
    description: 'Kéo nút AI đi chỗ khác nếu muốn, hoặc chạm vào để mở trang hỏi AI ngay.',
    icon: <Plus size={20} />,
    position: 'top',
  },
  {
    targetSelector: '[data-coachmark="stats"]',
    title: 'Theo dõi chuỗi ngày chăm chỉ',
    description: 'Xem thống kê và chuỗi ngày hoàn thành mục tiêu của bạn ở đây.',
    icon: <BarChart3 size={20} />,
    position: 'top',
  },
];

export function CoachmarksOverlay({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const tooltip = TOOLTIPS[index];

  useEffect(() => {
    if (!tooltip) return;
    const el = document.querySelector(tooltip.targetSelector) as HTMLElement | null;
    targetRef.current = el;
    if (el) {
      const updateRect = () => setRect(el.getBoundingClientRect());
      updateRect();
      el.classList.add('coachmark-spotlight');
      el.style.position = el.style.position || 'relative';
      el.style.zIndex = '60';
      el.style.pointerEvents = 'none';
      const observer = new ResizeObserver(updateRect);
      observer.observe(el);
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);
      return () => {
        el.classList.remove('coachmark-spotlight');
        el.style.zIndex = '';
        el.style.pointerEvents = '';
        observer.disconnect();
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect, true);
      };
    }
  }, [index]);

  if (!tooltip || !rect) return null;

  const isLast = index === TOOLTIPS.length - 1;

  const tooltipTop = tooltip.position === 'top'
    ? rect.top - 100
    : rect.bottom + 20;

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
      {/* Spotlight cutout */}
      {rect && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 20,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
            border: '2px solid rgba(148,212,0,0.5)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-72 rounded-2xl p-5 transition-all"
        style={{
          top: Math.max(20, Math.min(tooltipTop, window.innerHeight - 180)),
          background: 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)',
          border: '1px solid rgba(148,212,0,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(148,212,0,0.15)' }}>
            <span style={{ color: '#94d400' }}>{tooltip.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1">{tooltip.title}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{tooltip.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {TOOLTIPS.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === index ? '#94d400' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
          <button
            onClick={() => (isLast ? onComplete() : setIndex(i => i + 1))}
            className="px-5 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
          >
            {isLast ? 'Đã hiểu' : 'Tiếp'}
          </button>
        </div>
      </div>
    </div>
  );
}
