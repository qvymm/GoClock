export function localDateKey(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function taskDeadlineDate(deadline?: string | null) {
  if (!deadline) return '';
  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date);
}

export function deadlineAt(date: string, time = '23:59') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    localDateKey(parsed) !== date ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) return null;
  return parsed.toISOString();
}

export function deadlineCountdown(deadline?: string | null, now = Date.now()) {
  if (!deadline) return '';
  const timestamp = new Date(deadline).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const remaining = timestamp - now;
  const totalMinutes = Math.ceil(Math.abs(remaining) / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const duration = [
    days > 0 ? `${days} ngày` : '',
    hours > 0 ? `${hours} giờ` : '',
    minutes > 0 || (!days && !hours) ? `${minutes} phút` : '',
  ].filter(Boolean).join(' ');
  return remaining > 0 ? `Còn ${duration}` : `Quá hạn ${duration}`;
}
