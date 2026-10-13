import { createClient } from '@supabase/supabase-js';
import { randomInt, timingSafeEqual } from 'node:crypto';

export const PREMIUM_PLANS = {
  monthly: { amount: 49_000, days: 30 },
  yearly: { amount: 399_000, days: 365 },
} as const;

export type PlanId = keyof typeof PREMIUM_PLANS;

export function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serverKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  return createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticatedUserId(authorization: string | undefined) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

export function sendJson(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(body);
}

export function newPaymentCode() {
  return `GC${randomInt(10_000_000, 100_000_000)}`;
}

export function matchesSePayKey(authorization: string | undefined) {
  const expected = process.env.SEPAY_API_KEY;
  const prefix = 'Apikey ';
  if (!expected || !authorization?.startsWith(prefix)) return false;
  const supplied = Buffer.from(authorization.slice(prefix.length));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}
