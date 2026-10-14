import type { ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  Users,
} from 'lucide-react';

const navigation = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'subscriptions', label: 'Subscription Management', icon: Star },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'notifications', label: 'Notification Management', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({
  activeSection,
  onNavigate,
  onLogout,
  children,
}: {
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const activePage = navigation.find(item => item.key === activeSection);
  const pageTitle = activeSection === 'dashboard' ? 'Quản lý toàn bộ ứng dụng' : activePage?.label ?? 'Admin Dashboard';
  const pageDescription = activeSection === 'dashboard'
    ? 'Xem nhanh hoạt động, tăng trưởng và mức độ sử dụng GoClock.'
    : `Quản lý ${activePage?.label.toLowerCase() ?? 'ứng dụng GoClock'}.`;

  return (
    <div className="min-h-screen bg-[#F5F7F5] text-slate-900">
      <aside className="w-full border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-[250px] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="border-b border-slate-100 px-6 py-5 md:pb-6 md:pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CFFB2B] text-lg font-black text-[#173325] shadow-sm">G</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">GOCLOCK ADMIN</p>
              <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
            </div>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="px-4 py-5">
          <div className="space-y-1">
            {navigation.map(({ key, label, icon: Icon }) => {
              const selected = activeSection === key;
              return (
                <button key={key} type="button" onClick={() => onNavigate(key)}
                  aria-current={selected ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    selected ? 'bg-[#EAF5D3] text-[#244126] shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                  <Icon size={18} className="shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto border-t border-slate-100 px-6 py-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Need Help?</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Contact support team</p>
            <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#173325] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#254934]">
              <MessageSquare size={16} /> Support
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 px-4 py-5 md:ml-[250px] md:px-8 md:py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_28px_rgba(24,39,31,0.05)] sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">GoClock Admin</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{pageTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF5D3] font-bold text-[#244126]">A</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Admin</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
            <button type="button" onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
