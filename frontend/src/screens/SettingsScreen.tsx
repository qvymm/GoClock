import React from 'react';
import { useApp } from '../lib/AppContext';
import { ArrowLeft, Sun, Moon, Monitor, Check } from 'lucide-react';

export function SettingsScreen() {
  const { theme, setTheme, setScreen } = useApp();

  const themeOptions = [
    { id: 'light', label: 'Sáng', icon: Sun, desc: 'Nền trắng, chữ tối' },
    { id: 'dark', label: 'Tối', icon: Moon, desc: 'Nền tối, chữ sáng' },
  ] as const;

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-5" style={{ background: theme === 'dark' ? 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)' : 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setScreen('profile')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">Cài đặt</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4">
        {/* Theme section */}
        <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>
            <Monitor size={14} /> Giao diện
          </h3>
          <div className="flex flex-col gap-2">
            {themeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className="flex items-center gap-3 p-3.5 rounded-xl transition-all"
                style={theme === opt.id
                  ? { background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : 'rgba(23,51,37,0.08)', border: `1.5px solid ${theme === 'dark' ? '#94d400' : '#173325'}` }
                  : { background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5', border: '1.5px solid transparent' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.2)' : 'rgba(23,51,37,0.1)' }}>
                  <opt.icon size={20} style={{ color: theme === 'dark' ? '#94d400' : '#173325' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{opt.desc}</p>
                </div>
                {theme === opt.id && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: theme === 'dark' ? '#94d400' : '#173325' }}>
                    <Check size={14} style={{ color: theme === 'dark' ? '#0d1f12' : '#94d400' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Version info */}
        <div className="rounded-2xl p-4 mb-8" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <p className="text-xs text-center" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#9aa0a6' }}>
            GõClock v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
