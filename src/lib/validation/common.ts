import { z } from 'zod';

const blankToUndefined = (v: unknown) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح');
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'وقت غير صالح');
export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'تاريخ ووقت غير صالحين');

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
