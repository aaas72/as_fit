import { z } from 'zod';

const blankToUndefined = (v: unknown) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v);

// True only for a date that exists in the calendar: "2026-02-31" has the right shape,
// but JavaScript silently rolls it over to March 3 while PostgreSQL rejects it.
export function isCalendarDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const CALENDAR_DATE_MESSAGE = 'تاريخ غير موجود في التقويم';

export const isoDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح')
  .refine(isCalendarDate, CALENDAR_DATE_MESSAGE);
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'وقت غير صالح');
export const localDateTime = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, 'تاريخ ووقت غير صالحين')
  .refine(isCalendarDate, CALENDAR_DATE_MESSAGE);

// True for an IANA zone the runtime can format (e.g. "Europe/Istanbul", "UTC").
// An unknown zone would make every zoned conversion return an Invalid Date.
export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timeZone = z.string().trim().min(1, 'مطلوب').max(64).refine(isTimeZone, 'منطقة زمنية غير معروفة');

export const num = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number({ required_error: 'مطلوب', invalid_type_error: 'رقم غير صالح' })
    .min(min, `الحد الأدنى ${min}`).max(max, `الحد الأقصى ${max}`));

export const optionalNum = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: 'رقم غير صالح' }).min(min, `الحد الأدنى ${min}`).max(max, `الحد الأقصى ${max}`).optional());

export const int = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number({ required_error: 'مطلوب', invalid_type_error: 'رقم غير صالح' })
    .int('عدد صحيح فقط').min(min, `الحد الأدنى ${min}`).max(max, `الحد الأقصى ${max}`));

export const bool = z.preprocess((v) => v === true || v === 'true' || v === 'on', z.boolean());

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; errors?: FieldErrors; message?: string };
