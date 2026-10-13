import React from 'react';
import { Home, CalendarDays, Utensils, Moon, User } from 'lucide-react';
import { useApp } from '../lib/AppContext';

type Tab = 'dashboard' | 'calendar' | 'nutrition' | 'sleep' | 'profile';

const tabs: { key: Tab; icon: React.ComponentType<{ size: number; strokeWidth?: number }>; label: string }[] = [
  { key: 'dashboard', icon: Home, label: 'Home' },
  { key: 'calendar', icon: CalendarDays, label: 'Lịch' },
  { key: 'nutrition', icon: Utensils, label: 'Dinh dưỡng' },
  { key: 'sleep', icon: Moon, label: 'Giấc ngủ' },
  { key: 'profile', icon: User, label: 'Hồ sơ' },
];

export function BottomNav() {
  const { screen, setScreen } = useApp();

  return (
    <div
      className="flex items-center justify-around px-2 py-2 pb-safe"
      style={{
        background: 'rgba(23, 51, 37, 0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(148, 212, 0, 0.1)',
      }}
    >
      {tabs.map(({ key, icon: Icon, label }) => {
        const active = screen === key;
        return (
          <button
            key={key}
            onClick={() => setScreen(key)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all nav-item"
            style={active ? { background: 'rgba(148, 212, 0, 0.12)' } : {}}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: active ? '#94d400' : 'rgba(255,255,255,0.45)' }}
            />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: active ? '#94d400' : 'rgba(255,255,255,0.4)' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
