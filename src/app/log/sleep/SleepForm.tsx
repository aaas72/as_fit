'use client';

import { Controller, useWatch } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { useActionForm } from '@/components/forms/useActionForm';
import { NumberStepper, Segmented } from '@/components/inputs/controls';
import { TimeField } from '@/components/inputs/pickers';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus } from '@/components/ui';
import { sleepMetrics, sleepTargets } from '@/domain/sleep';
import { isClock, nightDateTimes } from '@/lib/inputs';
import { sleepClockSchema } from '@/lib/validation/schemas';
import { logSleep } from '@/server/actions/sleep';

const FRESHNESS = [
  { value: 1, label: '1', hint: 'مرهق' }, { value: 2, label: '2', hint: 'متعب' }, { value: 3, label: '3', hint: 'عادي' },
  { value: 4, label: '4', hint: 'جيد' }, { value: 5, label: '5', hint: 'منتعش' },
];

// Wall-clock 'YYYY-MM-DDTHH:mm' read as UTC: fine for durations in the preview
const asDate = (s: string) => new Date(`${s}:00Z`);

// Times only: the night is the one ending on wakeDate, earlier clocks roll back to the previous evening.
export function SleepForm({ wakeDate }: { wakeDate: string }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: sleepClockSchema,
    action: (v) => logSleep({ ...nightDateTimes(v.wakeDate, v.bedClock, v.onsetClock, v.wakeClock), nightInterruptions: v.nightInterruptions, wasoMinutes: v.wasoMinutes, freshness: v.freshness }),
    defaultValues: { wakeDate, bedClock: '23:00', onsetClock: '23:20', wakeClock: '07:00', nightInterruptions: 0, wasoMinutes: 0, freshness: 3 },
    successText: (r) => `حُفظ النوم: ${(r.tstMin / 60).toFixed(1)} ساعة نوم فعلي.`,
  });
  const [bed, onset, wake, waso] = useWatch({ control: form.control, name: ['bedClock', 'onsetClock', 'wakeClock', 'wasoMinutes'] }) as unknown[];
  const night = isClock(bed) && isClock(onset) && isClock(wake) ? nightDateTimes(wakeDate, bed, onset, wake) : null;
  const m = night && night.sleepOnsetTime < night.wakeUpTime
    ? sleepMetrics({ bed: asDate(night.bedTime), onset: asDate(night.sleepOnsetTime), wake: asDate(night.wakeUpTime), wasoMin: Number(waso) || 0 })
    : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        {([['bedClock', 'الدخول للفراش'], ['onsetClock', 'بدء النوم'], ['wakeClock', 'الاستيقاظ']] as const).map(([name, label]) => (
          <Field key={name} label={label} htmlFor={name} error={err(name)}>
            <Controller control={form.control} name={name} render={({ field }) => (
              <TimeField id={name} value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(err(name))} />
            )} />
          </Field>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مرات الاستيقاظ الليلي" htmlFor="nightInterruptions" error={err('nightInterruptions')}>
          <Controller control={form.control} name="nightInterruptions" render={({ field }) => (
            <NumberStepper id="nightInterruptions" value={field.value} onChange={field.onChange} onBlur={field.onBlur} min={0} max={50} unit="مرة" />
          )} />
        </Field>
        <Field label="دقائق الاستيقاظ الليلي (WASO)" htmlFor="wasoMinutes" error={err('wasoMinutes')}>
          <Controller control={form.control} name="wasoMinutes" render={({ field }) => (
            <NumberStepper id="wasoMinutes" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={5} min={0} max={600} unit="دقيقة" />
          )} />
        </Field>
      </div>

      <Field label="الانتعاش عند الاستيقاظ" htmlFor="freshness-1">
        <Controller control={form.control} name="freshness" render={({ field }) => (
          <Segmented id="freshness" label="الانتعاش عند الاستيقاظ" value={Number(field.value)} onChange={field.onChange} options={FRESHNESS} />
        )} />
      </Field>

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
