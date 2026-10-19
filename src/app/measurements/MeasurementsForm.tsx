'use client';

import { useActionForm } from '@/components/forms/useActionForm';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { cn } from '@/lib/cn';
import { measurementsSchema } from '@/lib/validation/schemas';
import { logMeasurements } from '@/server/actions/measurements';

const FIELDS = [
  { name: 'waistCm', label: 'الخصر *', hint: 'عند مستوى السرة، نهاية الزفير' },
  { name: 'hipCm', label: 'الورك *', hint: 'أعرض نقطة في الأرداف' },
  { name: 'neckCm', label: 'الرقبة', hint: 'أسفل الحنجرة — مطلوبة لنسبة الدهون' },
  { name: 'chestCm', label: 'الصدر' },
  { name: 'thighCm', label: 'الفخذ' },
  { name: 'bicepCm', label: 'العضد' },
] as const;

export function MeasurementsForm({ today }: { today: string }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: measurementsSchema,
    action: logMeasurements,
    defaultValues: { logDate: today, waistCm: '', hipCm: '', neckCm: '', chestCm: '', thighCm: '', bicepCm: '' },
    successText: 'حُفظت القياسات.',
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="التاريخ" htmlFor="m-date" error={err('logDate')} className="max-w-56">
        <input id="m-date" type="date" max={today} className={inputClass} {...form.register('logDate')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <Field key={f.name} label={`${f.label} (سم)`} htmlFor={f.name} error={err(f.name)} hint={'hint' in f ? f.hint : undefined}>
            <input id={f.name} inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register(f.name)} />
          </Field>
        ))}
      </div>
      <FormStatus status={status} />
      <Button id="save-measurements" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ القياسات'}</Button>
    </form>
  );
}
