import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

// All "local" values are in the user's timezone (user_settings.timezone), never the server's.
export const todayIn = (tz: string) => formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
export const nowLocalInput = (tz: string) => formatInTimeZone(new Date(), tz, "yyyy-MM-dd'T'HH:mm");
export const nowClock = (tz: string) => formatInTimeZone(new Date(), tz, 'HH:mm');

// 'YYYY-MM-DDTHH:mm' or ('YYYY-MM-DD', 'HH:mm') in the user's timezone → absolute instant
export const zonedToDate = (localDateTime: string, tz: string) => fromZonedTime(localDateTime, tz);
export const zonedDateTime = (isoDate: string, clock: string, tz: string) => fromZonedTime(`${isoDate}T${clock.slice(0, 5)}`, tz);

export const localDateOf = (d: Date, tz: string) => formatInTimeZone(d, tz, 'yyyy-MM-dd');
export const localClockOf = (d: Date, tz: string) => formatInTimeZone(d, tz, 'HH:mm');
export const localInputOf = (d: Date, tz: string) => formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm");

export const addDaysIso = (isoDate: string, n: number) => format(addDays(parseISO(isoDate), n), 'yyyy-MM-dd');

export function isoDateRange(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const arabicDayLabel = (isoDate: string) => {
  const d = parseISO(isoDate);
  return `${AR_WEEKDAYS[d.getDay()]} ${format(d, 'd/M')}`;
};
