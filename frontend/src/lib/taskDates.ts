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

export function deadlineAtEndOfDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (
    !date ||
    Number.isNaN(parsed.getTime()) ||
    localDateKey(parsed) !== date
  ) return null;
  return parsed.toISOString();
}
