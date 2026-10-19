import { useMemo, useState } from 'react';
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { supabase, type SubTask, type Task } from '../lib/supabase';
import { deadlineAtEndOfDay, localDateKey, taskDeadlineDate } from '../lib/taskDates';

type Category = Task['category'];
type DraftSubtask = { id?: string; title: string; completed: boolean };
type TaskDraft = {
  title: string;
  description: string;
  category: Category;
  reminderEnabled: boolean;
  deadlineDate: string;
  remindBefore: number;
  subtasks: DraftSubtask[];
};

const CATEGORY_STYLE: Record<Category, { label: string; color: string; background: string }> = {
  study: { label: 'Học tập', color: '#286849', background: '#E6F5EA' },
  deadline: { label: 'Deadline', color: '#B44E25', background: '#FFF0E7' },
  group: { label: 'Nhóm', color: '#6550B5', background: '#F0EDFF' },
  personal: { label: 'Cá nhân', color: '#167D85', background: '#E5F7F6' },
  other: { label: 'Khác', color: '#596579', background: '#EDF0F4' },
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function dateKey(date: Date) {
  return localDateKey(date);
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function mondayOf(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function createDraft(date: string, task?: Task): TaskDraft {
  const subtasks = task?.subtasks?.map(item => ({
    id: item.id,
    title: item.title,
    completed: item.completed,
  })) ?? [];
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: task?.category ?? 'study',
    reminderEnabled: task?.reminder_enabled ?? false,
    deadlineDate: task?.deadline ? taskDeadlineDate(task.deadline) : date,
    remindBefore: task?.remind_before ?? 15,
    subtasks,
  };
}

export function CalendarScreen() {
  const { user, tasks, refreshTasks } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedKey = dateKey(selectedDate);

  const weekDays = useMemo(() => {
    const start = mondayOf(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [visibleMonth]);

  const dayTasks = useMemo(() => {
    return tasks
      .filter(task => taskDeadlineDate(task.deadline) === selectedKey)
      .sort((a, b) =>
        Number(a.status === 'completed') - Number(b.status === 'completed')
        || (a.created_at ?? '').localeCompare(b.created_at ?? ''),
      );
  }, [selectedKey, tasks]);

  const openNewTask = () => {
    setEditingTask(null);
    setError('');
    setDraft(createDraft(selectedKey));
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setError('');
    setDraft(createDraft(selectedKey, task));
  };

  const closeEditor = () => {
    if (saving) return;
    setDraft(null);
    setEditingTask(null);
    setError('');
  };

  const patchDraft = (updates: Partial<TaskDraft>) => {
    setDraft(current => current ? { ...current, ...updates } : current);
  };

  const saveTask = async () => {
    if (!draft || !user) return;
    if (!draft.title.trim()) {
      setError('Vui lòng nhập tên công việc.');
      return;
    }
    const deadline = deadlineAtEndOfDay(draft.deadlineDate);
    if (!deadline) {
      setError('Vui lòng chọn ngày deadline hợp lệ.');
      return;
    }

    setSaving(true);
    setError('');
    const taskPayload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category,
      reminder_enabled: draft.reminderEnabled,
      deadline,
      repeat_type: 'none',
      remind_before: draft.remindBefore,
    };

    let taskSaved = false;
    try {
      let taskId = editingTask?.id;
      if (editingTask) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', editingTask.id)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert({ ...taskPayload, user_id: user.id, status: 'pending' })
          .select('id')
          .single();
        if (insertError) throw insertError;
        taskId = data.id as string;
      }
      taskSaved = true;

      const existing = editingTask?.subtasks ?? [];
      const draftIds = new Set(draft.subtasks.map(item => item.id).filter(Boolean));
      const removedIds = existing.filter(item => !draftIds.has(item.id)).map(item => item.id);
      if (removedIds.length > 0 && taskId) {
        const { error: deleteError } = await supabase
          .from('subtasks')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .in('id', removedIds);
        if (deleteError) throw deleteError;
      }

      const changedSubtasks = draft.subtasks.filter(item => item.title.trim());
      const existingUpdates = changedSubtasks.filter(item => item.id).map(item => ({
        id: item.id,
        task_id: taskId,
        user_id: user.id,
        title: item.title.trim(),
        completed: item.completed,
      }));
      const newSubtasks = changedSubtasks.filter(item => !item.id).map(item => ({
        task_id: taskId,
        user_id: user.id,
        title: item.title.trim(),
        completed: item.completed,
      }));

      if (existingUpdates.length > 0) {
        const { error: updateSubtasksError } = await supabase.from('subtasks').upsert(existingUpdates);
        if (updateSubtasksError) throw updateSubtasksError;
      }
      if (newSubtasks.length > 0) {
        const { error: insertSubtasksError } = await supabase.from('subtasks').insert(newSubtasks);
        if (insertSubtasksError) throw insertSubtasksError;
      }
      await refreshTasks();
      if (!editingTask && draft.deadlineDate) {
        const createdDate = parseDate(draft.deadlineDate);
        setSelectedDate(createdDate);
        setVisibleMonth(createdDate);
      }
      setDraft(null);
      setEditingTask(null);
    } catch (saveError) {
      console.error('Unable to save task:', saveError);
      setError(taskSaved
        ? 'Công việc đã lưu nhưng checklist chưa cập nhật được. Hãy tải lại dữ liệu và kiểm tra các bước nhỏ.'
        : 'Không thể lưu công việc. Hãy kiểm tra kết nối hoặc chạy migration Supabase mới nhất rồi thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: Task) => {
    if (!user) return;
    const status = task.status === 'completed' ? 'pending' : 'completed';
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', task.id)
      .eq('user_id', user.id);
    if (updateError) {
      console.error('Unable to update task status:', updateError);
      setError('Không thể cập nhật trạng thái công việc.');
      return;
    }
    await refreshTasks();
  };

  const deleteTask = async (task: Task) => {
    if (!user || !window.confirm(`Xóa công việc "${task.title}"?`)) return;
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
      .eq('user_id', user.id);
    if (deleteError) {
      console.error('Unable to delete task:', deleteError);
      setError('Không thể xóa công việc.');
      return;
    }
    await refreshTasks();
    if (editingTask?.id === task.id) closeEditor();
  };

  const changeSelectedDate = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(date);
  };

  const moveMonth = (amount: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(selectedDate.getDate(), lastDay));
    setVisibleMonth(nextMonth);
    setSelectedDate(nextDate);
  };

  const dayHasTask = (date: Date) => tasks.some(task =>
    taskDeadlineDate(task.deadline) === dateKey(date)
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0B2113] text-white">
      <header className="shrink-0 px-5 pb-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9BA99E]">Kế hoạch của bạn</p>
            <h1 className="mt-1 text-[25px] font-extrabold tracking-tight">Quản lý công việc</h1>
          </div>
          <button onClick={openNewTask} aria-label="Thêm công việc"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CFFB2B] text-[#0B2113] shadow-lg shadow-lime-950/30">
            <Plus size={23} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonthExpanded(value => !value)}
            className="flex items-center gap-2 text-sm font-bold text-white">
            <CalendarDays size={16} className="text-[#CFFB2B]" />
            {visibleMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            <ChevronDown size={15} className={`transition-transform ${monthExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => moveMonth(-1)} aria-label="Tháng trước" className="rounded-lg p-2 text-[#B6C1B8] hover:bg-white/10">
              <ChevronLeft size={17} />
            </button>
            <button onClick={() => { setVisibleMonth(new Date()); setSelectedDate(new Date()); }}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#CFFB2B]">Hôm nay</button>
            <button onClick={() => moveMonth(1)} aria-label="Tháng sau" className="rounded-lg p-2 text-[#B6C1B8] hover:bg-white/10">
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {monthExpanded ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold text-[#89978C]">
              {WEEKDAYS.map(day => <span key={day} className="py-1">{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {monthDays.map(day => {
                const active = dateKey(day) === selectedKey;
                const inMonth = day.getMonth() === visibleMonth.getMonth();
                return (
                  <button key={dateKey(day)} onClick={() => changeSelectedDate(day)}
                    className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ${
                      active ? 'bg-[#CFFB2B] text-[#102116]' : inMonth ? 'text-white hover:bg-white/10' : 'text-white/25'
                    }`}>
                    {day.getDate()}
                    {dayHasTask(day) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${active ? 'bg-[#102116]' : 'bg-[#CFFB2B]'}`} />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {weekDays.map(day => {
              const key = dateKey(day);
              const selected = key === selectedKey;
              const today = key === dateKey(new Date());
              return (
                <button key={key} onClick={() => changeSelectedDate(day)}
                  className={`relative flex min-w-0 flex-1 flex-col items-center rounded-2xl py-2 ${
                    selected ? 'bg-[#CFFB2B] text-[#102116]' : 'text-[#AAB5AC] hover:bg-white/[0.07]'
                  }`}>
                  <span className="text-[10px] font-semibold">{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
                  <span className={`mt-1 text-lg font-extrabold ${today && !selected ? 'text-[#CFFB2B]' : ''}`}>{day.getDate()}</span>
                  {dayHasTask(day) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-[#102116]' : 'bg-[#CFFB2B]'}`} />}
                </button>
              );
            })}
          </div>
        )}

      </header>

      <main className="min-h-0 flex-1 overflow-y-auto rounded-t-[30px] bg-[#F3F7F2] px-4 pb-8 pt-5 text-[#14281B]">
        <div className="mb-4 flex items-end justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#829086]">
              {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </p>
            <h2 className="text-[20px] font-extrabold">
              {selectedDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}
            </h2>
          </div>
          <span className="rounded-full bg-[#E5EDE5] px-3 py-1 text-[11px] font-bold text-[#506251]">
            {dayTasks.length} công việc
          </span>
        </div>

        {error && !draft && (
          <div role="alert" className="mb-3 flex items-center justify-between rounded-xl bg-red-100 px-3 py-2 text-xs text-red-800">
            {error}<button onClick={() => setError('')} aria-label="Đóng thông báo"><X size={14} /></button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {dayTasks.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-5 py-12 text-center shadow-sm">
              <span className="mb-3 text-4xl">🗓️</span>
              <p className="font-bold">Chưa có deadline trong ngày</p>
              <p className="mt-1 text-xs text-[#8C998E]">Task chỉ xuất hiện trong ngày deadline.</p>
              <button onClick={openNewTask} className="mt-5 rounded-xl bg-[#CFFB2B] px-4 py-2 text-xs font-extrabold text-[#132417]">
                Thêm công việc
              </button>
            </div>
          ) : dayTasks.map(task => (
            <TaskCard key={task.id} task={task} onOpen={openEditTask}
              onToggle={toggleComplete} onDelete={deleteTask} />
          ))}
          </div>
      </main>

      {draft && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onMouseDown={event => { if (event.target === event.currentTarget) closeEditor(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="task-editor-title"
            className="flex max-h-[94%] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-[#102019] text-white shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9BA99E]">Lịch cá nhân</p>
                <h2 id="task-editor-title" className="mt-1 text-lg font-extrabold">{editingTask ? 'Sửa công việc' : 'Thêm công việc'}</h2>
              </div>
              <button onClick={closeEditor} aria-label="Đóng" className="rounded-full p-2 text-[#AAB5AC] hover:bg-white/10">
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <label className="mb-4 block">
                <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">TÊN CÔNG VIỆC</span>
                <input autoFocus value={draft.title} onChange={event => patchDraft({ title: event.target.value })}
                  placeholder="Ví dụ: Làm bài tập Marketing"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/30 focus:border-[#CFFB2B]" />
              </label>

              <label className="mb-4 block">
                <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">NGÀY DEADLINE</span>
                <input required type="date" value={draft.deadlineDate} onChange={event => patchDraft({ deadlineDate: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm outline-none focus:border-[#CFFB2B]" />
              </label>

              <fieldset className="mb-4">
                <legend className="mb-2 text-[11px] font-bold text-[#B5C0B7]">DANH MỤC</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_STYLE) as Category[]).map(category => {
                    const selected = draft.category === category;
                    return (
                      <button key={category} type="button" onClick={() => patchDraft({ category })}
                        className={`rounded-full border px-3 py-2 text-[11px] font-bold ${selected ? 'border-[#CFFB2B] bg-[#CFFB2B]/15 text-[#D8FF7F]' : 'border-white/10 text-[#AAB5AC]'}`}>
                        {CATEGORY_STYLE[category].label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold"><Bell size={15} className="text-[#CFFB2B]" />Nhắc nhở</span>
                <input type="checkbox" checked={draft.reminderEnabled}
                  onChange={event => patchDraft({ reminderEnabled: event.target.checked })}
                  className="h-4 w-4 accent-[#CFFB2B]" />
              </label>

              <label className="mb-4 block text-[10px] font-bold text-[#B5C0B7]">NHẮC TRƯỚC DEADLINE
                  <select value={draft.remindBefore} onChange={event => patchDraft({ remindBefore: Number(event.target.value) })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#1B2A21] px-3 py-3 text-xs text-white">
                    <option value={0}>Đúng giờ</option>
                    <option value={5}>5 phút</option>
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={60}>1 giờ</option>
                    <option value={1440}>1 ngày</option>
                  </select>
              </label>

              <label className="mb-4 block">
                <span className="mb-2 block text-[11px] font-bold text-[#B5C0B7]">GHI CHÚ</span>
                <textarea rows={2} value={draft.description} onChange={event => patchDraft({ description: event.target.value })}
                  placeholder="Thêm ghi chú cho công việc..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs outline-none placeholder:text-white/30 focus:border-[#CFFB2B]" />
              </label>

              <div className="mb-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#B5C0B7]">CÁC BƯỚC NHỎ</span>
                  <span className="text-[10px] text-[#9BA99E]">
                    {draft.subtasks.filter(item => item.completed).length}/{draft.subtasks.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {draft.subtasks.map((subtask, index) => (
                    <div key={subtask.id ?? `new-${index}`} className="flex items-center gap-2">
                      <input aria-label="Hoàn thành bước" type="checkbox" checked={subtask.completed}
                        onChange={event => patchDraft({ subtasks: draft.subtasks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, completed: event.target.checked } : item
                        ) })}
                        className="h-4 w-4 accent-[#CFFB2B]" />
                      <input value={subtask.title} onChange={event => patchDraft({ subtasks: draft.subtasks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item
                      ) })}
                        placeholder="Tên bước"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs outline-none focus:border-[#CFFB2B]" />
                      <button type="button" aria-label="Xóa bước" onClick={() => patchDraft({
                        subtasks: draft.subtasks.filter((_, itemIndex) => itemIndex !== index),
                      })} className="rounded-lg p-2 text-[#AAB5AC] hover:bg-white/10">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => patchDraft({ subtasks: [...draft.subtasks, { title: '', completed: false }] })}
                    className="flex items-center gap-1 self-start py-1 text-[11px] font-bold text-[#D8FF7F]">
                    <Plus size={14} /> Thêm bước
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">{error}</p>}
            </div>

            <div className="flex gap-3 border-t border-white/10 px-5 py-4">
              {editingTask && (
                <button onClick={() => void deleteTask(editingTask)} disabled={saving}
                  className="rounded-xl border border-red-400/30 px-4 py-3 text-xs font-bold text-red-300 disabled:opacity-50">
                  Xóa
                </button>
              )}
              <button onClick={() => void saveTask()} disabled={saving}
                className="flex-1 rounded-xl bg-[#CFFB2B] py-3 text-xs font-extrabold text-[#132417] disabled:opacity-50">
                {saving ? 'Đang lưu…' : editingTask ? 'Lưu thay đổi' : 'Thêm công việc'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onToggle,
  onDelete,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const complete = task.status === 'completed';
  const deadlineDate = taskDeadlineDate(task.deadline);
  const overdue = !complete && deadlineDate < localDateKey();
  const category = CATEGORY_STYLE[task.category];
  const checklist = task.subtasks ?? [];
  const progress = checklist.length ? Math.round(checklist.filter(item => item.completed).length * 100 / checklist.length) : 0;

  return (
    <article className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_3px_14px_rgba(30,54,35,0.06)] ${complete ? 'opacity-65' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => void onToggle(task)} aria-label={complete ? 'Đánh dấu chưa hoàn thành' : 'Hoàn thành công việc'}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            complete ? 'border-[#32A866] bg-[#32A866] text-white' : 'border-[#D5DED5] text-transparent hover:border-[#4A9D67]'
          }`}>
          <Check size={14} strokeWidth={3} />
        </button>

        <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-[15px] font-extrabold ${complete ? 'text-[#7F8B81] line-through' : 'text-[#16291C]'}`}>
            {task.title}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-1 text-[9px] font-extrabold uppercase"
              style={{ color: category.color, background: category.background }}>{category.label}</span>
            {overdue && <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-extrabold text-red-600">Quá hạn</span>}
          </div>
          {task.description && <p className="mt-2 line-clamp-2 text-xs text-[#758078]">{task.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-[#879189]">
            {deadlineDate && <span className={overdue ? 'text-red-600' : ''}>
              Deadline {parseDate(deadlineDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>}
            {task.reminder_enabled && <span className="inline-flex items-center gap-1"><Bell size={10} />Nhắc nhở</span>}
          </div>
          {checklist.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-[#89948B]">
                <span>{checklist.filter((item: SubTask) => item.completed).length}/{checklist.length} bước hoàn thành</span><span>{progress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[#EDF0EC]">
                <div className="h-full rounded-full bg-[#7CB856] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </button>

        <button onClick={() => void onDelete(task)} aria-label="Xóa công việc"
          className="shrink-0 rounded-lg p-1.5 text-[#B8C0B9] hover:bg-red-50 hover:text-red-500">
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
