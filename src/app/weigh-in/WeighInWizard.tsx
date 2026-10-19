'use client';

import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { useActionForm } from '@/components/forms/useActionForm';
import { NumberStepper } from '@/components/inputs/controls';
import { TimeField } from '@/components/inputs/pickers';
import { Num } from '@/components/Num';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Field, FormStatus } from '@/components/ui';
import { protocolCompliance } from '@/domain/weigh-in';
import { cn } from '@/lib/cn';
import { earlierDateTime } from '@/lib/inputs';
import { weighInClockSchema } from '@/lib/validation/schemas';
import { logWeighIn } from '@/server/actions/weigh-in';

const STEPS = ['الصيام', 'التحضير', 'مؤشرات الضوضاء', 'الوزن'] as const;

function YesNo({ name, value, onChange, yes, no }: { name: string; value: boolean; onChange: (v: boolean) => void; yes: string; no: string }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((val) => (
        <button
          key={String(val)} type="button" id={`${name}-${val}`} aria-pressed={value === val} onClick={() => onChange(val)}
          className={cn('rounded-full border px-4 py-1.5 text-sm font-medium', value === val ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}
        >
          {val ? yes : no}
        </button>
      ))}
    </div>
  );
}
const isClock = (v: unknown): v is string => typeof v === 'string' && /^d{2}:d{2}$/.test(v);
// Wall-clock strings read as UTC: fine for the fasting-hours preview
const asDate = (s: string) => new Date(`${s}:00Z`);

// Times only: the reading is on `date`; a last-meal clock later than the reading clock means the evening before.
export function WeighInWizard({ date, nowClock, suggestedLastMeal, requiredFastingH }: { date: string; nowClock: string; suggestedLastMeal: string; requiredFastingH: number }) {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ compliant: boolean; violations: string[] } | null>(null);
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: weighInClockSchema,
    action: ({ date: d, measuredClock, lastMealClock, ...rest }) =>
      logWeighIn({ ...rest, measuredAt: `${d}T${measuredClock}`, lastMealAt: earlierDateTime(d, measuredClock, lastMealClock) }),
    defaultValues: {
      date, measuredClock: nowClock, lastMealClock: suggestedLastMeal, weightKg: '',
      bathroomDone: false, noFluidsBefore: false, highSodiumYesterday: false, normalDigestion: true, isOfficialWeekly: true,
    },
    successText: (r) => (r.compliant ? 'حُفظت القراءة وهي ملتزمة بالبروتوكول.' : 'حُفظت القراءة، لكنها غير ملتزمة ولن تدخل خط الاتجاه.'),
    onSuccess: (r) => setResult({ compliant: r.compliant, violations: r.violations }),
  });
  const v = useWatch({ control: form.control }) as Record<string, unknown>;
  const check = isClock(v.measuredClock) && isClock(v.lastMealClock)
    ? protocolCompliance({
      measuredAt: asDate(`${date}T${v.measuredClock}`), lastMealAt: asDate(earlierDateTime(date, v.measuredClock, v.lastMealClock)),
      bathroomDone: Boolean(v.bathroomDone), noFluidsBefore: Boolean(v.noFluidsBefore),
    }, requiredFastingH)
    : null;
  const fastingH = check?.fastingH ?? 0;
  type Flag = 'highSodiumYesterday' | 'normalDigestion' | 'isOfficialWeekly';
  const flag = (name: Flag) => ({ name, value: v[name] as boolean, onChange: (val: boolean) => form.setValue(name, val) });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <ol className="grid grid-cols-4 gap-2" aria-label="خطوات القياس">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} className="flex w-full flex-col gap-2 text-start">
              <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} />
              <span className={cn('text-xs font-semibold sm:text-sm', i === step ? 'text-brand-ink' : 'text-ink-muted')}>{i + 1}. {s}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="وقت القياس" htmlFor="measuredAt" error={err('measuredClock')}>
              <Controller control={form.control} name="measuredClock" render={({ field }) => (
                <TimeField id="measuredAt" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(err('measuredClock'))} />
              )} />
            </Field>
            <Field label="آخر وجبة" htmlFor="lastMealAt" error={err('lastMealClock')} hint="مقترحة من آخر وجبة مسجلة. وقت أكبر من وقت القياس = مساء أمس">
              <Controller control={form.control} name="lastMealClock" render={({ field }) => (
                <TimeField id="lastMealAt" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(err('lastMealClock'))} />
              )} />
            </Field>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">مدة الصيام</span>
              <span><Num value={fastingH} digits={1} className="text-xl font-semibold" /> / <Num value={requiredFastingH} unit="ساعة" /></span>
            </div>
            <ProgressBar value={fastingH} max={requiredFastingH} tone={fastingH >= requiredFastingH ? 'brand' : 'warning'} label="ساعات الصيام" />
            {fastingH < requiredFastingH ? (
              <Badge tone="warning" className="w-fit">متبقٍ <Num value={requiredFastingH - fastingH} digits={1} unit="ساعة" /> — القراءة الآن ستُحفظ كغير ملتزمة</Badge>
            ) : (
              <Badge className="w-fit">صيام مكتمل</Badge>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          {([['bathroomDone', 'دخلت الحمام قبل القياس'], ['noFluidsBefore', 'لم أشرب ماءً أو قهوة قبل القياس']] as const).map(([name, label]) => (
            <label key={name} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-4 has-checked:border-brand has-checked:bg-brand-soft">
              <input id={name} type="checkbox" className="size-5 accent-brand" {...form.register(name)} />
              <span className="font-medium">{label}</span>
            </label>
          ))}
          <p className="text-sm text-ink-muted">نفس الميزان، نفس المكان، وملابس خفيفة أو بدون. الثبات أهم من أي شيء آخر.</p>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2"><span className="font-semibold">هل كان أكل الأمس عالي الصوديوم (مالح)؟</span><YesNo {...flag('highSodiumYesterday')} yes="نعم" no="لا" /></div>
          <div className="flex flex-col gap-2"><span className="font-semibold">هل الهضم طبيعي؟</span><YesNo {...flag('normalDigestion')} yes="نعم" no="لا" /></div>
          <div className="flex flex-col gap-2"><span className="font-semibold">نوع القراءة</span><YesNo {...flag('isOfficialWeekly')} yes="رسمية أسبوعية" no="يومية اختيارية" /></div>
          <p className="text-sm text-ink-muted">الصوديوم والهضم لا يجعلان القراءة غير ملتزمة، لكنهما يفسّران ثبات الوزن المؤقت.</p>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <Field label="الوزن (كغ)" htmlFor="weightKg" error={err('weightKg')}>
            <div className="max-w-64">
              <Controller control={form.control} name="weightKg" render={({ field }) => (
                <NumberStepper id="weightKg" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={30} max={300} unit="كغ" invalid={Boolean(err('weightKg'))} />
              )} />
            </div>
          </Field>
          {check && (
            check.compliant
              ? <Badge className="w-fit">القراءة ملتزمة بالبروتوكول</Badge>
              : (
                <div className="flex flex-col gap-1 rounded-lg bg-warning-soft p-3 text-sm text-warning-ink">
                  <span className="font-semibold">ستُحفظ كقراءة غير ملتزمة:</span>
                  <ul className="list-inside list-disc">{check.violations.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )
          )}
        </div>
      )}

      {result && !result.compliant && result.violations.length > 0 && (
        <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-ink">{result.violations.join('، ')}</div>
      )}
      <FormStatus status={status} />

      <div className="flex flex-wrap gap-2">
        {step > 0 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>السابق</Button>}
        {step < STEPS.length - 1
          ? <Button id="wizard-next" onClick={() => setStep((s) => s + 1)}>التالي</Button>
          : <Button id="save-weigh-in" type="submit" disabled={pending}>{pending ? 'جارٍ الحفظ…' : 'حفظ القراءة'}</Button>}
      </div>
    </form>
  );
}
