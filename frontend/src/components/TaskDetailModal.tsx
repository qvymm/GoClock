import React, { useState } from 'react';
import { X, CalendarDays, Tag, Bell, CheckCircle2, Circle, Pencil, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';
import type { Task, SubTask } from '../lib/supabase';
import { localDateKey, taskDeadlineDate } from '../lib/taskDates';

type Props = {
  task: Task;
  onClose: () => void;
};

export function TaskDetailModal({ task, onClose }: Props) {
  const { refreshTasks } = useApp();
  const [subtasks, setSubtasks] = useState<SubTask[]>(task.subtasks || []);
  const [marking, setMarking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');

  const deadlineDate = taskDeadlineDate(task.deadline);
  const isOverdue = deadlineDate && deadlineDate < localDateKey() && task.status !== 'completed';

  function getStatusInfo() {
    if (task.status === 'completed') return { label: 'Hoàn thành', bg: '#e6f4ea', color: '#137333' };
    if (isOverdue) return { label: 'Quá hạn', bg: '#fce8e6', color: '#d93025' };
    return { label: 'Đang thực hiện', bg: '#e8f0fe', color: '#1967d2' };
  }

  const statusInfo = getStatusInfo();

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = { study: 'Học tập', deadline: 'Deadline', group: 'Nhóm', personal: 'Cá nhân', other: 'Khác' };
    return map[cat] || cat;
  };

  async function toggleComplete() {
    setMarking(true);
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', task.id);
    await refreshTasks();
    setMarking(false);
    onClose();
  }

  async function toggleSubtask(sub: SubTask) {
    const updated = subtasks.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
    setSubtasks(updated);
    await supabase.from('subtasks').update({ completed: !sub.completed }).eq('id', sub.id);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="bottom-sheet w-full max-h-[90%] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="drag-handle" />

        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#f0f7f2', color: '#173325' }}>
              {getCategoryLabel(task.category)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)} className="p-2 rounded-full" style={{ background: '#f0f7f2' }}>
              <Pencil size={16} style={{ color: '#173325' }} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full" style={{ background: '#f5f5f5' }}>
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-content px-5 pb-4">
          {editing ? (
            <div className="mb-4">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold p-3 rounded-xl border mb-3 outline-none"
                style={{ borderColor: '#d1e8d8', color: '#173325' }} />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                placeholder="Mô tả nhiệm vụ..." rows={3}
                className="w-full p-3 rounded-xl border outline-none resize-none text-sm"
                style={{ borderColor: '#d1e8d8', color: '#5f6368' }} />
              <button className="mt-2 w-full py-2.5 rounded-xl font-medium text-sm"
                style={{ background: '#173325', color: '#94d400' }}
                onClick={async () => {
                  await supabase.from('tasks').update({ title: editTitle, description: editDesc }).eq('id', task.id);
                  setEditing(false);
                  refreshTasks();
                }}>
                Lưu thay đổi
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-bold mb-4" style={{ color: '#173325', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
              {task.title}
            </h2>
          )}

          {/* Info grid */}
          <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #e8f0e8' }}>
            {[
              { icon: <CalendarDays size={14} />, label: 'Deadline', value: deadlineDate ? new Date(`${deadlineDate}T00:00:00`).toLocaleDateString('vi-VN') : 'Không có' },
              { icon: <Bell size={14} />, label: 'Nhắc nhở', value: task.reminder_enabled ? 'Đã bật' : 'Đã tắt' },
              { icon: <Tag size={14} />, label: 'Thời gian tạo', value: new Date(task.created_at).toLocaleDateString('vi-VN') },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? '#f8fbf8' : '#fff', borderBottom: i < 2 ? '1px solid #f0f4f0' : 'none' }}>
                <div style={{ color: '#173325' }}>{row.icon}</div>
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{row.label}</span>
                <span className="text-xs font-medium text-right flex-1" style={{ color: '#202124' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {task.description && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#f8fbf8', border: '1px solid #e8f0e8' }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#173325' }}>Mô tả</p>
              <p className="text-sm" style={{ color: '#5f6368' }}>{task.description}</p>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: '#173325' }}>
                Việc nhỏ ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {subtasks.map(sub => (
                  <button key={sub.id} onClick={() => toggleSubtask(sub)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: sub.completed ? '#f0f7f2' : '#fff', border: '1px solid', borderColor: sub.completed ? '#d1e8d8' : '#e0e0e0' }}>
                    {sub.completed
                      ? <CheckCircle2 size={16} style={{ color: '#137333' }} />
                      : <Circle size={16} style={{ color: '#9aa0a6' }} />}
                    <span className="text-sm" style={{ color: sub.completed ? '#9aa0a6' : '#202124', textDecoration: sub.completed ? 'line-through' : 'none' }}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Complete button */}
        <div className="px-5 pt-3 border-t" style={{ borderColor: '#f0f4f0', paddingBottom: 'calc(85px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={toggleComplete}
            disabled={marking}
            className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            style={task.status === 'completed'
              ? { background: '#f5f5f5', color: '#5f6368', border: '1px solid #e0e0e0' }
              : { background: 'linear-gradient(135deg, #173325 0%, #2d6a40 100%)', color: '#94d400' }}
          >
            {task.status === 'completed' ? (
              <><Circle size={18} /> Đánh dấu chưa hoàn thành</>
            ) : (
              <><CheckCircle2 size={18} /> Đánh dấu hoàn thành</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
