import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronLeft,
  CalendarDays,
  Moon,
  Settings,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { taskDeadlineDate } from '../lib/taskDates';
import type { Meal, MealType, SleepLog, Task } from '../lib/supabase';
import styles from './NotificationCenter.module.css';

type Category = 'task' | 'meal' | 'sleep';
type Filter = 'all' | Category;
type NotificationAction = 'view' | 'complete' | 'log-meal' | 'view-sleep';
type AppNotification = {
  id: string;
  category: Category;
  title: string;
  body: string;
  createdAt: number;
  urgent?: boolean;
  task?: Task;
  actions: NotificationAction[];
};
type Preferences = {
  task: boolean;
  meal: boolean;
  sleep: boolean;
  summary: boolean;
  lead: Record<string, boolean>;
  dnd: boolean;
  from: string;
  to: string;
};
type InboxState = { readIds: string[]; dismissedIds: string[] };
type UndoState = { id: string; previous: InboxState };

const LEAD_OPTIONS = [
  { label: '1 ngày', minutes: 24 * 60 },
  { label: '3 giờ', minutes: 3 * 60 },
  { label: '1 giờ', minutes: 60 },
  { label: '30 phút', minutes: 30 },
];
const DEFAULT_PREFERENCES: Preferences = {
  task: true,
  meal: true,
  sleep: true,
  summary: true,
  lead: { '1 ngày': true, '3 giờ': true, '1 giờ': true, '30 phút': false },
  dnd: true,
  from: '23:00',
  to: '06:00',
};
const MEAL_SCHEDULE: {
  type: MealType;
  profileField?: 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
  time?: string;
  label: string;
  emoji: string;
  calories: number;
}[] = [
  { type: 'breakfast', profileField: 'meal_breakfast', label: 'bữa sáng', emoji: '🌅', calories: 500 },
  { type: 'lunch', profileField: 'meal_lunch', label: 'bữa trưa', emoji: '☀️', calories: 700 },
  { type: 'snack', time: '15:30', label: 'bữa phụ', emoji: '🍎', calories: 200 },
  { type: 'dinner', profileField: 'meal_dinner', label: 'bữa tối', emoji: '🌙', calories: 600 },
];
const CATEGORY_LABELS: Record<Filter, string> = {
  all: 'Tất cả',
  task: 'Nhiệm vụ',
  meal: 'Dinh dưỡng',
  sleep: 'Giấc ngủ',
};
const CATEGORY_COLORS: Record<Category, { foreground: string; background: string }> = {
  task: { foreground: '#4b7a0c', background: '#e8f7c4' },
  meal: { foreground: '#c46a00', background: '#ffeacb' },
  sleep: { foreground: '#5b4bd1', background: '#e7e4ff' },
};
const EMPTY_INBOX: InboxState = { readIds: [], dismissedIds: [] };

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAtTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<T>;
    const result = { ...fallback, ...parsed };
    if ('lead' in fallback && 'lead' in parsed) {
      Object.assign(result, {
        lead: { ...(fallback as Preferences).lead, ...(parsed as Preferences).lead },
      });
    }
    return result;
  } catch (error) {
    console.error(`Unable to read notification storage (${key}):`, error);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save notification storage (${key}):`, error);
  }
}

function buildNotifications(
  now: Date,
  tasks: Task[],
  meals: Meal[],
  sleepLogs: SleepLog[],
  profile: ReturnType<typeof useApp>['profile'],
  preferences: Preferences,
): AppNotification[] {
  const notices: AppNotification[] = [];
  const nowMs = now.getTime();
  const todayKey = localDateKey(now);

  if (preferences.task && profile?.notify_tasks !== false) {
    const leadMinutes = LEAD_OPTIONS
      .filter(option => preferences.lead[option.label])
      .reduce((largest, option) => Math.max(largest, option.minutes), 0);

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.deadline) return;
      const deadlineKey = taskDeadlineDate(task.deadline);
      if (!deadlineKey) return;
      const [year, month, day] = deadlineKey.split('-').map(Number);
      const deadline = new Date(year, month - 1, day, 23, 59, 59, 999);
      const remaining = deadline.getTime() - nowMs;
      if (remaining > leadMinutes * 60_000 || remaining < -24 * 60 * 60_000) return;
      const urgent = remaining <= 60 * 60_000;
      notices.push({
        id: `task:${task.id}:${task.deadline}`,
        category: 'task',
        title: urgent ? `Sắp đến hạn: ${task.title}` : `Nhắc deadline: ${task.title}`,
        body: remaining < 0
          ? `Nhiệm vụ đã quá hạn từ ${deadline.toLocaleDateString('vi-VN')}. Cập nhật trạng thái để tiếp tục theo dõi.`
          : `Hạn ${deadline.toLocaleDateString('vi-VN')}. Hoàn thành sớm để không bị trễ.`,
        createdAt: remaining > 0
          ? Math.min(nowMs, deadline.getTime() - leadMinutes * 60_000)
          : deadline.getTime(),
        urgent,
        task,
        actions: ['view', 'complete'],
      });
    });
  }

  if (preferences.meal && profile?.notify_meals !== false) {
    MEAL_SCHEDULE.forEach(slot => {
      const time = (slot.profileField ? profile?.[slot.profileField] : undefined) || slot.time || '18:00';
      const scheduledAt = dateAtTime(now, time);
      if (nowMs < scheduledAt.getTime()) return;
      if (meals.some(meal => meal.meal_type === slot.type)) return;
      notices.push({
        id: `meal:${todayKey}:${slot.type}`,
        category: 'meal',
        title: `Đến giờ ghi nhận ${slot.label}`,
        body: `Bạn chưa ghi nhận ${slot.label} hôm nay. Gợi ý khoảng ${slot.calories} kcal.`,
        createdAt: scheduledAt.getTime(),
        actions: ['log-meal'],
      });
    });
  }

  if (preferences.sleep && profile?.notify_sleep !== false) {
    const todaySleep = sleepLogs.find(log => log.log_date === todayKey);
    if (todaySleep) {
      const durationHours = todaySleep.duration_minutes
        ? (todaySleep.duration_minutes / 60).toFixed(1)
        : null;
      const qualityLabels: Record<string, string> = {
        excellent: 'Rất tốt',
        good: 'Tốt',
        fair: 'Trung bình',
        poor: 'Cần cải thiện',
      };
      notices.push({
        id: `sleep:summary:${todayKey}`,
        category: 'sleep',
        title: 'Đã cập nhật giấc ngủ hôm nay',
        body: `Thời lượng${durationHours ? `: ${durationHours} giờ` : ''}. Chất lượng: ${qualityLabels[todaySleep.quality ?? ''] ?? 'Chưa đánh giá'}.`,
        createdAt: new Date(`${todayKey}T08:00:00`).getTime(),
        actions: ['view-sleep'],
      });
    } else {
      const bedtime = dateAtTime(now, '23:00');
      if (nowMs >= bedtime.getTime()) {
        notices.push({
          id: `sleep:reminder:${todayKey}`,
          category: 'sleep',
          title: 'Đến giờ chuẩn bị đi ngủ',
          body: 'Hãy thư giãn và chuẩn bị nghỉ ngơi để duy trì lịch ngủ đều đặn.',
          createdAt: bedtime.getTime(),
          actions: ['view-sleep'],
        });
      }
    }
  }

  if (preferences.summary && preferences.task) {
    const summaryTime = dateAtTime(now, '20:00');
    if (nowMs >= summaryTime.getTime() && tasks.length > 0) {
      const completed = tasks.filter(task => task.status === 'completed').length;
      const pending = tasks.length - completed;
      notices.push({
        id: `summary:tasks:${todayKey}`,
        category: 'task',
        title: 'Tổng kết nhiệm vụ hôm nay',
        body: `Bạn đã hoàn thành ${completed}/${tasks.length} nhiệm vụ${pending ? `, còn ${pending} nhiệm vụ cần chú ý` : '. Làm tốt lắm!'}.`,
        createdAt: summaryTime.getTime(),
        actions: ['view'],
      });
    }
  }

  return notices.sort((a, b) => b.createdAt - a.createdAt);
}

function notificationTime(timestamp: number, now: Date) {
  const date = new Date(timestamp);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const compared = new Date(date);
  compared.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today.getTime() - compared.getTime()) / 86_400_000);
  if (daysAgo === 0) {
    const minutes = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (daysAgo === 1) return `Hôm qua, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  return `${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function groupLabel(timestamp: number, now: Date) {
  const date = new Date(timestamp);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const compared = new Date(date);
  compared.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today.getTime() - compared.getTime()) / 86_400_000);
  if (daysAgo <= 0) return 'Hôm nay';
  if (daysAgo === 1) return 'Hôm qua';
  return 'Trước đó';
}

function categoryIcon(category: Category, urgent: boolean) {
  if (urgent) return <AlertTriangle size={20} />;
  if (category === 'task') return <Check size={20} />;
  if (category === 'meal') return <Utensils size={20} />;
  return <Moon size={20} />;
}

export function NotificationCenter() {
  const { user, profile, tasks, meals, sleepLogs, setScreen, refreshTasks } = useApp();
  const storageSuffix = user?.id ?? 'guest';
  const preferencesKey = `goclock-notification-preferences:${storageSuffix}`;
  const inboxKey = `goclock-notification-inbox:${storageSuffix}`;
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [preferences, setPreferences] = useState<Preferences>(() => getStorage(preferencesKey, DEFAULT_PREFERENCES));
  const [inbox, setInbox] = useState<InboxState>(() => getStorage(inboxKey, EMPTY_INBOX));
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState('');
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [error, setError] = useState('');
  const skipPreferenceWrite = useRef(true);
  const skipInboxWrite = useRef(true);

  useEffect(() => {
    skipPreferenceWrite.current = true;
    skipInboxWrite.current = true;
    setPreferences(getStorage(preferencesKey, DEFAULT_PREFERENCES));
    setInbox(getStorage(inboxKey, EMPTY_INBOX));
  }, [inboxKey, preferencesKey]);

  useEffect(() => {
    if (skipPreferenceWrite.current) {
      skipPreferenceWrite.current = false;
      return;
    }
    saveStorage(preferencesKey, preferences);
  }, [preferences, preferencesKey]);

  useEffect(() => {
    if (skipInboxWrite.current) {
      skipInboxWrite.current = false;
      return;
    }
    saveStorage(inboxKey, inbox);
  }, [inbox, inboxKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast('');
      setUndoState(null);
    }, 4_200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else setIsOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showSettings]);

  const notifications = useMemo(
    () => buildNotifications(now, tasks, meals, sleepLogs, profile, preferences)
      .filter(notification => !inbox.dismissedIds.includes(notification.id)),
    [inbox.dismissedIds, meals, now, preferences, profile, sleepLogs, tasks],
  );
  const unreadCount = notifications.filter(notification => !inbox.readIds.includes(notification.id)).length;
  const filteredNotifications = notifications.filter(notification => filter === 'all' || notification.category === filter);
  const groupedNotifications = ['Hôm nay', 'Hôm qua', 'Trước đó'].map(label => ({
    label,
    items: filteredNotifications.filter(notification => groupLabel(notification.createdAt, now) === label),
  })).filter(group => group.items.length > 0);

  function markRead(id: string) {
    setInbox(current => current.readIds.includes(id)
      ? current
      : { ...current, readIds: [...current.readIds, id] });
  }

  function dismiss(id: string) {
    const previous = inbox;
    setInbox(current => ({
      ...current,
      dismissedIds: [...current.dismissedIds, id],
    }));
    setUndoState({ id, previous });
    setToast('Đã xóa thông báo');
  }

  function undoDismiss() {
    if (!undoState) return;
    setInbox(undoState.previous);
    setUndoState(null);
    setToast('');
  }

  function markAllRead() {
    setInbox(current => ({
      ...current,
      readIds: [...new Set([...current.readIds, ...notifications.map(notification => notification.id)])],
    }));
    setToast('Đã đánh dấu tất cả là đã đọc');
  }

  function clearRead() {
    const readIds = new Set(inbox.readIds);
    const removed = notifications.filter(notification => readIds.has(notification.id));
    if (!removed.length) return;
    setInbox(current => ({
      ...current,
      dismissedIds: [...new Set([...current.dismissedIds, ...removed.map(notification => notification.id)])],
    }));
    setUndoState({ id: 'all-read', previous: inbox });
    setToast(`Đã xóa ${removed.length} thông báo đã đọc`);
  }

  async function handleAction(notification: AppNotification, action: NotificationAction) {
    markRead(notification.id);
    setError('');

    if (action === 'complete' && notification.task && user) {
      const task = notification.task;
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', task.id)
        .eq('user_id', user.id);
      if (updateError) {
        console.error('Unable to complete task from notification:', updateError);
        setError('Không thể cập nhật nhiệm vụ. Vui lòng thử lại.');
        return;
      }
      await refreshTasks();
      setToast('Đã đánh dấu nhiệm vụ hoàn thành');
      return;
    }

    setIsOpen(false);
    if (action === 'log-meal') setScreen('nutrition');
    else if (action === 'view-sleep') setScreen('sleep');
    else setScreen('calendar');
  }

  function togglePreference(key: 'task' | 'meal' | 'sleep' | 'summary' | 'dnd') {
    setPreferences(current => ({ ...current, [key]: !current[key] }));
  }

  function toggleLead(label: string) {
    setPreferences(current => ({
      ...current,
      lead: { ...current.lead, [label]: !current.lead[label] },
    }));
  }

  return (
    <>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => { setIsOpen(true); setShowSettings(false); }}
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <section className={styles.center} role="dialog" aria-modal="true" aria-label="Trung tâm thông báo">
          <header className={styles.header}>
            <button type="button" className={styles.iconButton} onClick={() => setIsOpen(false)} aria-label="Quay lại">
              <ChevronLeft size={21} />
            </button>
            <div className={styles.title}>
              <h2>Thông báo</h2>
              <p>{unreadCount ? `${unreadCount} chưa đọc` : 'Bạn đã đọc hết'}</p>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowSettings(true)}
              aria-label="Cài đặt thông báo"
            >
              <Settings size={19} />
            </button>
          </header>

          <div className={styles.filters} role="group" aria-label="Lọc thông báo">
            {(Object.keys(CATEGORY_LABELS) as Filter[]).map(key => {
              const count = notifications.filter(notification =>
                !inbox.readIds.includes(notification.id) && (key === 'all' || notification.category === key),
              ).length;
              return (
                <button
                  type="button"
                  key={key}
                  className={filter === key ? styles.filterActive : ''}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {CATEGORY_LABELS[key]}
                  {count > 0 && <i>{count > 9 ? '9+' : count}</i>}
                </button>
              );
            })}
          </div>

          <main className={styles.list}>
            <div className={styles.listActions}>
              <span>{filteredNotifications.length} thông báo</span>
              <button type="button" disabled={!unreadCount} onClick={markAllRead}>
                <CheckCheck size={15} /> Đánh dấu đã đọc tất cả
              </button>
            </div>
            {groupedNotifications.length === 0 ? (
              <div className={styles.empty}>
                <span><Bell size={25} /></span>
                <strong>Chưa có thông báo nào ở mục này.</strong>
                <p>Nhắc nhở sẽ xuất hiện tại đây khi có deadline hoặc đến giờ ghi nhận.</p>
              </div>
            ) : groupedNotifications.map(group => (
              <section className={styles.group} key={group.label}>
                <h3>{group.label}</h3>
                {group.items.map(notification => {
                  const read = inbox.readIds.includes(notification.id);
                  const color = CATEGORY_COLORS[notification.category];
                  return (
                    <article className={styles.notificationWrap} key={notification.id}>
                      <div className={styles.notification}>
                        <span className={styles.notificationIcon} style={{ color: notification.urgent ? '#cf3d30' : color.foreground, background: notification.urgent ? '#ffe1dd' : color.background }}>
                          {categoryIcon(notification.category, Boolean(notification.urgent))}
                        </span>
                        <div className={styles.notificationContent}>
                          <button
                            type="button"
                            className={`${styles.notificationTitle} ${read ? '' : styles.notificationTitleUnread}`}
                            onClick={() => markRead(notification.id)}
                          >
                            {notification.title}
                          </button>
                          <p>{notification.body}</p>
                          <div className={styles.meta}>
                            <span>{notificationTime(notification.createdAt, now)}</span>
                            {notification.task?.status !== 'completed' && notification.task?.deadline && (
                              <span className={styles.deadlineChip}><CalendarDays size={12} />{new Date(notification.task.deadline).toLocaleDateString('vi-VN')}</span>
                            )}
                          </div>
                          {notification.actions.length > 0 && (
                            <div className={styles.actions}>
                              {notification.actions.map(action => (
                                <button
                                  type="button"
                                  key={action}
                                  className={action === 'complete' || action === 'log-meal' ? styles.primaryAction : ''}
                                  onClick={() => void handleAction(notification, action)}
                                >
                                  {action === 'view' ? 'Xem lịch' : action === 'complete' ? 'Hoàn thành' : action === 'log-meal' ? 'Ghi bữa ăn' : 'Xem giấc ngủ'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => dismiss(notification.id)}
                          aria-label={`Xóa thông báo: ${notification.title}`}
                        >
                          <X size={16} />
                        </button>
                        {!read && <span className={styles.unreadDot} aria-label="Chưa đọc" />}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}

            {notifications.some(notification => inbox.readIds.includes(notification.id)) && (
              <button type="button" className={styles.clearRead} onClick={clearRead}>
                <Trash2 size={15} /> Xóa các thông báo đã đọc
              </button>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
          </main>

          {toast && (
            <div className={styles.toast} role="status" aria-live="polite">
              <span>{toast}</span>
              {undoState && <button type="button" onClick={undoDismiss}>Hoàn tác</button>}
            </div>
          )}

          {showSettings && (
            <div className={styles.settingsOverlay} onClick={() => setShowSettings(false)}>
              <section
                className={styles.settingsSheet}
                role="dialog"
                aria-modal="true"
                aria-label="Cài đặt thông báo"
                onClick={event => event.stopPropagation()}
              >
                <div className={styles.grab} />
                <header className={styles.settingsHeader}>
                  <h2>Cài đặt thông báo</h2>
                  <button type="button" className={styles.iconButton} onClick={() => setShowSettings(false)} aria-label="Đóng cài đặt">
                    <X size={18} />
                  </button>
                </header>
                <div className={styles.settingsBody}>
                  <PreferenceToggle
                    title="Nhiệm vụ và deadline"
                    description="Hiển thị nhắc nhở cho deadline sắp đến hoặc quá hạn"
                    enabled={preferences.task}
                    onToggle={() => togglePreference('task')}
                  />
                  <PreferenceToggle
                    title="Dinh dưỡng"
                    description="Nhắc ghi bữa ăn sau khung giờ đã đặt trong hồ sơ"
                    enabled={preferences.meal}
                    onToggle={() => togglePreference('meal')}
                  />
                  <PreferenceToggle
                    title="Giấc ngủ"
                    description="Hiển thị nhắc nhở và tổng kết giấc ngủ"
                    enabled={preferences.sleep}
                    onToggle={() => togglePreference('sleep')}
                  />
                  <PreferenceToggle
                    title="Tổng kết"
                    description="Cho phép hiển thị các bản tổng kết khi có dữ liệu"
                    enabled={preferences.summary}
                    onToggle={() => togglePreference('summary')}
                  />

                  <p className={styles.settingLabel}>Nhắc trước deadline</p>
                  <div className={styles.chips}>
                    {LEAD_OPTIONS.map(option => (
                      <button
                        type="button"
                        key={option.label}
                        aria-pressed={preferences.lead[option.label]}
                        onClick={() => toggleLead(option.label)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <p className={styles.settingLabel}>Không làm phiền</p>
                  <PreferenceToggle
                    title="Tắt âm thông báo theo giờ"
                    description="Thông báo vẫn lưu trong trung tâm; tính năng âm thanh chưa được tích hợp."
                    enabled={preferences.dnd}
                    onToggle={() => togglePreference('dnd')}
                  />
                  {preferences.dnd && (
                    <div className={styles.quietHours}>
                      <label>Từ<input type="time" value={preferences.from} onChange={event => setPreferences(current => ({ ...current, from: event.target.value }))} /></label>
                      <span>đến</span>
                      <label>Đến<input type="time" value={preferences.to} onChange={event => setPreferences(current => ({ ...current, to: event.target.value }))} /></label>
                    </div>
                  )}
                  <p className={styles.settingsNote}>
                    Cài đặt và trạng thái đã đọc được lưu trên thiết bị này. Thông báo đẩy khi đóng ứng dụng chưa được tích hợp.
                  </p>
                </div>
              </section>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function PreferenceToggle({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.preferenceRow}>
      <span><strong>{title}</strong><small>{description}</small></span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        className={`${styles.switch} ${enabled ? styles.switchOn : ''}`}
        onClick={onToggle}
      />
    </div>
  );
}
