'use client';

import { useOptimistic, useTransition } from 'react';
import { setDayComplete } from '@/server/actions/day';
import { cn } from '@/lib/cn';

// "I logged everything I ate today." Only complete days enter deficit and observed-TDEE math.
export function DayCompleteToggle({ date, complete }: { date: string; complete: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(complete);
  const [pending, start] = useTransition();
  return (
    <button
      id="day-complete-toggle"
      type="button"
      role="switch"
      aria-checked={optimistic}
      disabled={pending}
      onClick={() => start(async () => { setOptimistic(!optimistic); await setDayComplete({ logDate: date, complete: !optimistic }); })}
      className={cn(
        'inline-flex items-center gap-3 py-2 text-sm font-semibold transition-colors duration-150',
        optimistic ? 'text-brand-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', optimistic ? 'bg-brand' : 'bg-line')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all', optimistic ? 'start-4.5' : 'start-0.5')} />
      </span>
      {optimistic ? 'سجّلت كل وجبات اليوم' : 'تسجيل اليوم غير مكتمل'}
    </button>
  );
}
