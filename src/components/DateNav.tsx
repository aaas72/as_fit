import Link from 'next/link';
import { addDaysIso, arabicDayLabel } from '@/lib/time';

// Day switcher for log pages (?date=YYYY-MM-DD). "Next" stops at today.
export function DateNav({ path, date, today }: { path: string; date: string; today: string }) {
  const prev = addDaysIso(date, -1);
  const next = addDaysIso(date, 1);
  const link = 'rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand-ink';
  return (
    <div className="flex items-center gap-2" aria-label="اختيار اليوم">
      <Link id="date-prev" href={`${path}?date=${prev}`} className={link} aria-label="اليوم السابق">→</Link>
      <span className="flex min-w-28 items-baseline justify-center gap-2 font-semibold">
        <span>{date === today ? 'اليوم' : arabicDayLabel(date)}</span>
        <bdi className="font-mono text-sm text-ink-muted">{date}</bdi>
      </span>
      {date < today ? (
        <Link id="date-next" href={`${path}?date=${next}`} className={link} aria-label="اليوم التالي">←</Link>
      ) : (
        <span className={`${link} pointer-events-none opacity-40`} aria-hidden="true">←</span>
      )}
    </div>
  );
}
