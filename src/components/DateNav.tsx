'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { AR_MONTHS } from '@/lib/inputs';
import { Icon } from './Icon';
import { CalendarPanel } from './inputs/pickers';
import { panelClass, usePopover } from './inputs/usePopover';

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function dayLabel(date: string, today: string) {
  if (date === today) return 'اليوم';
  if (date === shift(today, -1)) return 'أمس';
  const d = new Date(`${date}T00:00:00Z`);
  const year = date.slice(0, 4) === today.slice(0, 4) ? '' : ` ${d.getUTCFullYear()}`;
  return `${AR_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}${year}`;
}

// Day switcher for log pages (?date=YYYY-MM-DD): ‹ day › in one control; the day opens a calendar. Never goes past today.
export function DateNav({ path, date, today }: { path: string; date: string; today: string }) {
  const router = useRouter();
  const { open, setOpen, ref } = usePopover();
  const go = (iso: string) => { setOpen(false); router.push(iso === today ? path : `${path}?date=${iso}`); };
  const canNext = date < today;
  const arrow = 'grid w-10 place-items-center text-ink-muted transition-colors duration-150 hover:bg-brand hover:text-white disabled:pointer-events-none disabled:opacity-30';

  return (
    <div ref={ref} className="relative flex items-center gap-2" aria-label="اختيار اليوم">
      {date !== today && (
        <button type="button" onClick={() => go(today)} className="h-10 rounded-lg px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-soft">اليوم</button>
      )}
      <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-line transition-colors duration-150 hover:border-brand">
        <button id="date-prev" type="button" aria-label="اليوم السابق" className={cn(arrow, 'border-e border-line')} onClick={() => go(shift(date, -1))}>
          <Icon name="chevron" className="size-4 -rotate-90" />
        </button>
        <button
          type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}
          className="flex min-w-36 items-center justify-center gap-2 px-3 text-sm font-semibold transition-colors hover:bg-brand-soft"
        >
          <Icon name="calendar" className="size-4 text-brand-strong" />
          {dayLabel(date, today)}
        </button>
        <button id="date-next" type="button" aria-label="اليوم التالي" disabled={!canNext} className={cn(arrow, 'border-s border-line')} onClick={() => go(shift(date, 1))}>
          <Icon name="chevron" className="size-4 rotate-90" />
        </button>
      </div>
      {open && (
        <div className={cn(panelClass, 'start-auto end-0 w-72')} role="dialog" aria-label="اختيار اليوم">
          <CalendarPanel value={date} max={today} today={today} onSelect={go} />
        </div>
      )}
    </div>
  );
}
