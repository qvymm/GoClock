import { localDateKey } from './taskDates';
import { supabase } from './supabase';

export function sleepBedtimeCheckInKey(userId: string, scheduleId: string, dateKey: string) {
  return `goclock-sleep-bedtime:${userId}:${scheduleId}:${dateKey}`;
}

export function saveSleepBedtimeCheckIn(userId: string, scheduleId: string, confirmedAt: Date) {
  const dateKey = localDateKey(confirmedAt);
  localStorage.setItem(
    sleepBedtimeCheckInKey(userId, scheduleId, dateKey),
    confirmedAt.toISOString(),
  );
}

export function getSleepBedtimeCheckIn(userId: string, scheduleId: string, dateKey: string) {
  const value = localStorage.getItem(sleepBedtimeCheckInKey(userId, scheduleId, dateKey));
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function sleepBedtimeDateKeyForWake(wakeDate: Date, bedtime: string, wakeTime: string) {
  const bedtimeMinutes = timeToMinutes(bedtime);
  const wakeMinutes = timeToMinutes(wakeTime);
  if (bedtimeMinutes === null || wakeMinutes === null) return '';
  const bedtimeDate = new Date(wakeDate);
  if (bedtimeMinutes > wakeMinutes) bedtimeDate.setDate(bedtimeDate.getDate() - 1);
  return localDateKey(bedtimeDate);
}

export async function saveConfirmedSleepLog(
  userId: string,
  logDate: string,
  values: {
    bedtime: string | null;
    wake_time: string;
    duration_minutes: number | null;
    cycles: number;
    target_bedtime: string | null;
    target_wake_time: string | null;
  },
) {
  const { data, error: lookupError } = await supabase
    .from('sleep_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .order('created_at', { ascending: false })
    .limit(1);
  if (lookupError) return { error: lookupError };

  const existing = data?.[0];
  if (existing) {
    const { error } = await supabase
      .from('sleep_logs')
      .update(values)
      .eq('id', existing.id)
      .eq('user_id', userId);
    return { error };
  }

  const { error } = await supabase
    .from('sleep_logs')
    .insert({ ...values, user_id: userId, log_date: logDate });
  return { error };
}

function timeToMinutes(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
