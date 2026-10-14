import { useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CircleDot,
  CreditCard,
  MessageSquare,
  PieChart,
  Search,
  Send,
  Star,
  User,
  UserCheck,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Database,
  Lock,
  Trash2,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { useAdminStats } from '../hooks/useAdminStats';
import { ChartCard, KpiCard, RevenueTooltip } from '../components/admin/AdminDashboardWidgets';
import { AdminLayout } from '../components/admin/AdminLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
} from 'recharts';

const featureColors = ['#2563eb', '#16a34a', '#f5890b'];

type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
};

const subscriptionRows = [
  { user: 'Linh', package: 'Premium Yearly', start: '2025-11-01', expiry: '2026-11-01', status: 'Active' },
  { user: 'Minh', package: 'Premium Monthly', start: '2026-05-15', expiry: '2026-06-15', status: 'Active' },
  { user: 'An', package: 'Premium Monthly', start: '2026-02-01', expiry: '2026-03-01', status: 'Expired' },
];

const analyticsCards = {
  task: {
    label: 'Task Analytics', metrics: [
      { label: 'Total Tasks Created', value: '24,850' },
      { label: 'Completion Rate', value: '87.2%' },
      { label: 'Avg Tasks/User', value: '9.4' },
    ],
  },
  meal: {
    label: 'Meal Analytics', metrics: [
      { label: 'Meals Logged', value: '18,430' },
      { label: 'AI Scan Usage', value: '67.4%' },
      { label: 'Avg Calories', value: '1,220 kcal' },
    ],
  },
  sleep: {
    label: 'Sleep Analytics', metrics: [
      { label: 'Sleep Plans Created', value: '4,230' },
      { label: 'Avg Sleep Duration', value: '7h 24m' },
      { label: 'Reminder Engagement', value: '58.9%' },
    ],
  },
  retention: {
    label: 'Retention Analytics', metrics: [
      { label: 'D1 Retention', value: '72.1%' },
      { label: 'D7 Retention', value: '53.5%' },
      { label: 'D30 Retention', value: '38.2%' },
    ],
  },
};

const taskCompletionData = [
  { week: 'W1', completion: 72 },
  { week: 'W2', completion: 78 },
  { week: 'W3', completion: 84 },
  { week: 'W4', completion: 89 },
];

export function AdminDashboardScreen() {
  const { logout } = useApp();
  const {
    stats: dashboardStats,
    userGrowth,
    revenueTrend,
    featureUsage: featureUsageDataState,
    isUsingMockData,
    statsError,
  } = useAdminStats();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [analyticsTab, setAnalyticsTab] = useState<'task' | 'meal' | 'sleep' | 'retention'>('task');
  const [notification, setNotification] = useState({ title: '', message: '', target: 'all' });
  const [notificationStatus, setNotificationStatus] = useState('');
  const [settings, setSettings] = useState({ push: true, email: false, inApp: true });

  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name, nickname, username');
        if (error) throw error;
        if (data) {
          const mapped: UserRow[] = data.map((profile: any) => ({
            id: profile.id,
            name: profile.full_name || profile.nickname || profile.username || 'Unknown',
            email: '—',
            plan: 'Free', // Placeholder
            status: 'Active', // Placeholder
          }));
          setUserRows(mapped);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    return userRows.filter((user) =>
      user.id.includes(term) ||
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  }, [search, userRows]);

  const taskCompletionRate = dashboardStats.totalTasks > 0 ? Math.round((dashboardStats.completedTasks / dashboardStats.totalTasks) * 100) : 0;
  const avgTasksUser = dashboardStats.totalUsers > 0 ? (dashboardStats.totalTasks / dashboardStats.totalUsers).toFixed(1) : '0';

  const analyticsCardsState = {
    ...analyticsCards,
    task: {
      label: 'Task Analytics', metrics: [
        { label: 'Total Tasks Created', value: dashboardStats.totalTasks.toLocaleString() },
        { label: 'Completion Rate', value: `${taskCompletionRate}%` },
        { label: 'Avg Tasks/User', value: avgTasksUser },
      ],
    },
    meal: {
      label: 'Meal Analytics', metrics: [
        { label: 'Meals Logged', value: dashboardStats.totalMeals.toLocaleString() },
        { label: 'AI Scan Usage', value: 'N/A' },
        { label: 'Avg Calories', value: 'N/A' },
      ],
    },
    sleep: {
      label: 'Sleep Analytics', metrics: [
        { label: 'Sleep Plans Created', value: dashboardStats.totalSleepLogs.toLocaleString() },
        { label: 'Avg Sleep Duration', value: 'N/A' },
        { label: 'Reminder Engagement', value: 'N/A' },
      ],
    },
  };

  const selectedAnalytics = analyticsCardsState[analyticsTab];

  function handleSendNotification(type: 'now' | 'schedule') {
    setNotificationStatus(`Thông báo đã ${type === 'now' ? 'gửi ngay' : 'lên lịch'} cho ${notification.target === 'all' ? 'tất cả người dùng' : notification.target === 'premium' ? 'Premium users' : 'Free users'}.`);
  }

  return (
    <AdminLayout activeSection={activeSection} onLogout={() => void logout()} onNavigate={section => {
      setActiveSection(section);
      if (section === 'analytics') setAnalyticsTab('task');
    }}>
          {activeSection === 'dashboard' && (
            <section className="space-y-6">
              {isUsingMockData && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  Đang hiển thị số liệu demo. {statsError ?? 'Chưa tải được thống kê Supabase.'}
                  {' '}Hãy chạy migration `20261014160000_add_admin_dashboard_stats_rpc.sql` trong đúng project Supabase.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Users" value={dashboardStats.totalUsers.toLocaleString('vi-VN')}
                  description="Total users registered" icon={User} iconClass="bg-sky-50 text-sky-600" />
                <KpiCard label="Active" value={dashboardStats.activeUsersToday.toLocaleString('vi-VN')}
                  description="Active users today" icon={UserCheck} iconClass="bg-teal-50 text-teal-600" />
                <KpiCard label="Premium" value={dashboardStats.premiumUsers.toLocaleString('vi-VN')}
                  description="Premium users" icon={Star} iconClass="bg-orange-50 text-orange-600" />
                <KpiCard label="Revenue" value={`${dashboardStats.monthlyRevenue.toLocaleString('vi-VN')} VNĐ`}
                  description="Monthly recurring revenue" icon={Wallet} iconClass="bg-violet-50 text-violet-600" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <ChartCard title="User Growth" description="Jan - Jun" icon={TrendingUp}>
                    <div className="mt-5 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={userGrowth} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 14000]} ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000]}
                            tickFormatter={(value) => `${value / 1000}k`} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(value: number) => value.toLocaleString()} />
                          <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Revenue Trend" description="Jan - Jun" icon={CreditCard}>
                    <div className="mt-5 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueTrend} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 60_000_000]} ticks={[0, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000, 60_000_000]}
                            tickFormatter={(value) => `${value / 1_000_000}M`} tickLine={false} axisLine={false} />
                          <Tooltip content={<RevenueTooltip />} />
                          <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>

                <ChartCard title="Feature Usage" description="Task, Meal, Sleep" icon={CircleDot}>
                  <div className="mt-5 flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="h-56 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartPieChart>
                          <Pie data={featureUsageDataState} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} fill="#2563eb">
                            {featureUsageDataState.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={featureColors[index]} />
                            ))}
                          </Pie>
                        </RechartPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-3 w-full md:w-1/2">
                      {featureUsageDataState.map((item, index) => (
                        <div key={item.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <span className="text-sm font-semibold text-slate-700">{item.value}%</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200">
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: featureColors[index] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>
            </section>
          )}

          {activeSection === 'users' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">User Management</h3>
                    <p className="mt-2 text-sm text-slate-500">Search users by name, email, or ID.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Search size={16} className="text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, email, or User ID"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User ID</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Plan</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 truncate max-w-[120px]" title={user.id}>{user.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.plan}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="View user">
                                <ArrowRight size={14} />
                              </button>
                              <button className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="Suspend user">
                                <Lock size={14} />
                              </button>
                              <button className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="Delete user">
                                <Trash2 size={14} />
                              </button>
                              <button className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="Message user">
                                <MessageSquare size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'subscriptions' && (
            <section className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Premium Users</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">0</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Conversion Rate</p>
                  <div className="mt-4 flex items-center gap-3">
                    <TrendingUp size={18} className="text-emerald-600" />
                    <p className="text-3xl font-semibold text-slate-900">0.0%</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Monthly Recurring Revenue</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">0 VNĐ</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Subscription Actions</h3>
                    <p className="mt-2 text-sm text-slate-500">Quick actions for subscription growth.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Tạo Coupon</button>
                    <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">Gia hạn Premium</button>
                    <button className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">Khuyến mãi</button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Package</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Start Date</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expiry</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {subscriptionRows.map((row) => (
                      <tr key={row.user} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.user}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.package}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.start}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.expiry}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'analytics' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
                    <p className="mt-2 text-sm text-slate-500">Explore task, meal, sleep and retention insights.</p>
                  </div>
                  <div className="inline-flex rounded-3xl bg-slate-50 p-2">
                    {(['task', 'meal', 'sleep', 'retention'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setAnalyticsTab(key)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${analyticsTab === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {analyticsCardsState[key].label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.75fr_1fr]">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{selectedAnalytics.label}</h4>
                  <div className="mt-6 grid gap-4">
                    {selectedAnalytics.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">{metric.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Task Completion Trend</p>
                      <p className="mt-1 text-sm text-slate-500">Last 4 weeks</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <TrendingUp size={16} /> Stable
                    </div>
                  </div>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={taskCompletionData} margin={{ top: 5, right: 0, left: -10, bottom: 5 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Line type="monotone" dataKey="completion" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Notification Management</h3>
                    <p className="mt-2 text-sm text-slate-500">Send important updates to user segments.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <Bell size={18} /> Target audience
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-900">Title</span>
                    <input
                      value={notification.title}
                      onChange={(event) => setNotification((prev) => ({ ...prev, title: event.target.value }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      placeholder="Enter notification title"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-900">Message</span>
                    <textarea
                      value={notification.message}
                      onChange={(event) => setNotification((prev) => ({ ...prev, message: event.target.value }))}
                      className="mt-2 min-h-[160px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      placeholder="Type your message here"
                    />
                  </label>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Target Users</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {['all', 'free', 'premium'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setNotification((prev) => ({ ...prev, target: option }))}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${notification.target === option ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          {option === 'all' ? 'All Users' : option === 'free' ? 'Free Users' : 'Premium Users'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 text-sm text-slate-500">
                      <p>Schedule or send now to keep users engaged.</p>
                      {notificationStatus && <p className="text-slate-700">{notificationStatus}</p>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleSendNotification('now')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Send size={16} /> Send Now
                      </button>
                      <button
                        onClick={() => handleSendNotification('schedule')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <CalendarDays size={16} /> Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'settings' && (
            <section className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">App Version</p>
                      <p className="mt-1 text-sm text-slate-500">Current version 1.0.0</p>
                    </div>
                  </div>
                  <button className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Upload New Version
                  </button>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Notification Settings</p>
                  <div className="mt-6 space-y-4">
                    {(['push', 'email', 'inApp'] as const).map((key) => (
                      <div key={key} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{key === 'push' ? 'Push Notifications' : key === 'email' ? 'Email Notifications' : 'In-App Notifications'}</p>
                          <p className="mt-1 text-sm text-slate-500">{key === 'push' ? 'Mobile push alerts' : key === 'email' ? 'Email campaign updates' : 'Banner notifications in app'}</p>
                        </div>
                        <button
                          onClick={() => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${settings[key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-7 w-7 rounded-full bg-white shadow transition ${settings[key] ? 'translate-x-7' : 'translate-x-1'}`}></span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <Database size={24} className="text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">System Information</p>
                      <p className="mt-1 text-sm text-slate-500">Status overview for service health.</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      { label: 'App Name', value: 'GoClock' },
                      { label: 'Platform', value: 'Web Admin Panel' },
                      { label: 'Database Status', value: 'Healthy' },
                      { label: 'Server Status', value: 'Healthy' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
    </AdminLayout>
  );
}
