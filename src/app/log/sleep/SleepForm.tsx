'use client';

import { useWatch } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { useActionForm } from '@/components/forms/useActionForm';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { sleepMetrics, sleepTargets } from '@/domain/sleep';
import { cn } from '@/lib/cn';
import { sleepSchema } from '@/lib/validation/schemas';
import { logSleep } from '@/server/actions/sleep';

// Local 'YYYY-MM-DDTHH:mm' strings compare correctly as plain wall-clock times for the preview.
const asDate = (s: unknown) => (typeof s === 'string' && s.length >= 16 ? new Date(`${s}:00Z`) : null);

export function SleepForm({ defaults }: { defaults: { bedTime: string; sleepOnsetTime: string; wakeUpTime: string } }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: sleepSchema,
    action: logSleep,
    defaultValues: { ...defaults, nightInterruptions: 0, wasoMinutes: 0, freshness: 3 },
    successText: (r) => `حُفظ النوم: ${(r.tstMin / 60).toFixed(1)} ساعة نوم فعلي.`,
  });
  const [bed, onset, wake, waso, freshness] = useWatch({ control: form.control, name: ['bedTime', 'sleepOnsetTime', 'wakeUpTime', 'wasoMinutes', 'freshness'] }) as unknown[];
  const b = asDate(bed), o = asDate(onset), w = asDate(wake);
  const m = b && o && w && b <= o && o < w ? sleepMetrics({ bed: b, onset: o, wake: w, wasoMin: Number(waso) || 0 }) : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الدخول للفراش" htmlFor="bedTime" error={err('bedTime')}>
          <input id="bedTime" type="datetime-local" className={inputClass} {...form.register('bedTime')} />
        </Field>
        <Field label="بدء النوم" htmlFor="sleepOnsetTime" error={err('sleepOnsetTime')}>
          <input id="sleepOnsetTime" type="datetime-local" className={inputClass} {...form.register('sleepOnsetTime')} />
        </Field>
        <Field label="الاستيقاظ" htmlFor="wakeUpTime" error={err('wakeUpTime')}>
          <input id="wakeUpTime" type="datetime-local" className={inputClass} {...form.register('wakeUpTime')} />
        </Field>
        <Field label="مرات الاستيقاظ الليلي" htmlFor="nightInterruptions" error={err('nightInterruptions')}>
          <input id="nightInterruptions" inputMode="numeric" className={cn(inputClass, 'font-mono')} {...form.register('nightInterruptions')} />
        </Field>
        <Field label="دقائق الاستيقاظ الليلي (WASO)" htmlFor="wasoMinutes" error={err('wasoMinutes')}>
          <input id="wasoMinutes" inputMode="numeric" className={cn(inputClass, 'font-mono')} {...form.register('wasoMinutes')} />
        </Field>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">الانتعاش عند الاستيقاظ</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={cn('grid size-10 cursor-pointer place-items-center rounded-lg border font-mono font-semibold', Number(freshness) === n ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}>
                <input type="radio" value={n} className="sr-only" id={`freshness-${n}`} {...form.register('freshness')} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {m && (
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-brand-soft px-4 py-3 sm:grid-cols-4">
          <Metric label="النوم الفعلي" ok={m.tstMin >= sleepTargets.tstMinLow && m.tstMin <= sleepTargets.tstMinHigh}><Num value={m.tstMin / 60} digits={1} unit="س" /></Metric>
          <Metric label="الكفاءة" ok={m.efficiencyPct >= sleepTargets.efficiencyPct}><Num value={m.efficiencyPct} unit="%" /></Metric>
          <Metric label="كمون النوم" ok={m.latencyMin <= sleepTargets.latencyMin}><Num value={m.latencyMin} unit="د" /></Metric>
          <Metric label="في الفراش" ok><Num value={m.tibMin / 60} digits={1} unit="س" /></Metric>
        </div>
      )}

      <FormStatus status={status} />
      <Button id="save-sleep" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ النوم'}</Button>
    </form>
  );
}

function Metric({ label, ok, children }: { label: string; ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-brand-ink">{label}</span>
      <span className="flex items-center gap-2 font-semibold">{children}{!ok && <Badge tone="warning" className="px-2 py-0 text-xs">خارج الهدف</Badge>}</span>
    </div>
  );
}
