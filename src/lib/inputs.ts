// Parsing/formatting for the custom date, time and number fields. Form values stay ISO ('YYYY-MM-DD', 'HH:MM').

const pad = (n: number) => String(n).padStart(2, '0');

// Accepts "1400", "14:00", "14.00", "9:5", "930" → "14:00" / "09:05" / "09:30". null if invalid.
export function parseTime(raw: string): string | null {
  const s = raw.trim().replace(/[.\s،,]/g, ':');
  if (!s) return null;
  let h: number;
  let m: number;
  if (s.includes(':')) {
    const [a, b = '0'] = s.split(':');
    h = Number(a);
    m = Number(b);
  } else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) { h = Number(s); m = 0; } else { h = Number(s.slice(0, -2)); m = Number(s.slice(-2)); }
  } else return null;
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

// Accepts "19/10/2026", "19-10-2026", "2026-10-19" → "2026-10-19". null if invalid or not a real date.
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) { y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]); }
  else {
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    if (!m) return null;
    d = Number(m[1]); mo = Number(m[2]); y = Number(m[3]);
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export const formatDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
// Week starts on Monday (ISO / Türkiye)
export const AR_WEEKDAYS_SHORT = ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'];

// 6×7 grid of ISO dates for a month view (Monday-first), with leading/trailing days from neighbor months
export function monthGrid(year: number, month0: number) {
  const first = new Date(Date.UTC(year, month0, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month0, 1 - offset + i));
    return { iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month0, day: d.getUTCDate() };
  });
}

// Rounds to the step and clamps to [min, max]; returns the string form used by the form state
export function stepValue(current: unknown, delta: number, opts: { min?: number; max?: number; step: number }) {
  const n = Number(current);
  const base = Number.isFinite(n) ? n : (opts.min ?? 0);
  let next = Math.round((base + delta) / opts.step) * opts.step;
  if (opts.min != null) next = Math.max(opts.min, next);
  if (opts.max != null) next = Math.min(opts.max, next);
  const digits = (String(opts.step).split('.')[1] ?? '').length;
  return next.toFixed(digits);
}

// A complete "HH:MM" value (as stored by TimeField)
export const isClock = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const shiftIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// An earlier event entered as a clock time only: same day if its clock is not after the later event's clock, else the day before.
// e.g. last meal 21:00 before a 07:00 weigh-in on 2026-10-19 → 2026-10-18T21:00.
export const earlierDateTime = (laterDate: string, laterClock: string, earlierClock: string) =>
  `${earlierClock > laterClock ? shiftIso(laterDate, -1) : laterDate}T${earlierClock}`;

// A night from three clock times, anchored on the wake-up date (bed ≤ onset < wake).
export function nightDateTimes(wakeDate: string, bed: string, onset: string, wake: string) {
  const onsetAt = earlierDateTime(wakeDate, wake, onset);
  const bedAt = earlierDateTime(onsetAt.slice(0, 10), onset, bed);
  return { bedTime: bedAt, sleepOnsetTime: onsetAt, wakeUpTime: `${wakeDate}T${wake}` };
}
