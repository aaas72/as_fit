import { connection } from 'next/server';
import { todayIn } from '@/lib/time';
import { getTimezone } from '@/server/queries/profile';
import { USER_ID } from '@/server/session';

export type DateSearchParams = Promise<{ date?: string | string[] }>;

// Selected local day for a log page (?date=), never in the future.
export async function resolveDate(searchParams?: DateSearchParams) {
  await connection(); // per-request: depends on "now" and the database
  const tz = await getTimezone(USER_ID);
  const today = todayIn(tz);
  const raw = searchParams ? (await searchParams).date : undefined;
  const value = typeof raw === 'string' ? raw : undefined;
  const date = value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today ? value : today;
  return { tz, today, date };
}
