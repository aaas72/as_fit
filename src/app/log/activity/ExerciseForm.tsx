'use client';

import { Controller, useWatch } from 'react-hook-form';
import { useActionForm } from '@/components/forms/useActionForm';
import { NumberStepper, Select } from '@/components/inputs/controls';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { exerciseKcal } from '@/domain/exercise';
import { cn } from '@/lib/cn';
import { exerciseSchema } from '@/lib/validation/schemas';
import { logExercise } from '@/server/actions/exercise';

type CatalogItem = { id: number; nameAr: string; defaultMet: number };

export function ExerciseForm({ date, catalog, weightKg, useNetMet }: { date: string; catalog: CatalogItem[]; weightKg: number; useNetMet: boolean }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: exerciseSchema,
    action: logExercise,
    defaultValues: { logDate: date, exerciseId: catalog[1]?.id ?? catalog[0]?.id, durationMinutes: 45, metOverride: '', notes: '' },
    successText: (r) => `حُفظ التمرين: ${Math.round(useNetMet ? r.net : r.gross)} kcal تُضاف للحرق.`,
  });
  const [exerciseId, minutes, metOverride] = useWatch({ control: form.control, name: ['exerciseId', 'durationMinutes', 'metOverride'] }) as [unknown, unknown, unknown];
  const ex = catalog.find((c) => c.id === Number(exerciseId));
  const met = Number(metOverride) > 1 ? Number(metOverride) : ex?.defaultMet ?? 0;
  const preview = exerciseKcal(met, weightKg, Number(minutes) || 0);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" {...form.register('logDate')} />
      <Field label="التمرين" htmlFor="exerciseId" error={err('exerciseId')}>
        <Controller control={form.control} name="exerciseId" render={({ field }) => (<Select id="exerciseId" value={field.value as number} onChange={field.onChange} onBlur={field.onBlur} options={catalog.map((c) => ({ value: c.id, label: c.nameAr, hint: `MET ${c.defaultMet}` }))} />)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المدة (دقيقة)" htmlFor="durationMinutes" error={err('durationMinutes')}>
          <Controller control={form.control} name="durationMinutes" render={({ field }) => (<NumberStepper id="durationMinutes" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={5} min={1} max={600} unit="دقيقة" invalid={Boolean(err('durationMinutes'))} />)} />
        </Field>
        <Field label="MET مخصص (اختياري)" htmlFor="metOverride" error={err('metOverride')} hint={`الافتراضي ${ex?.defaultMet ?? '—'} من Compendium`}>
          <Controller control={form.control} name="metOverride" render={({ field }) => (<NumberStepper id="metOverride" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={1.1} max={20} invalid={Boolean(err('metOverride'))} />)} />
        </Field>
      </div>
      <Field label="ملاحظات" htmlFor="ex-notes">
        <input id="ex-notes" className={inputClass} {...form.register('notes')} />
      </Field>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-brand-soft px-4 py-3">
        <div className={cn(!useNetMet && 'font-semibold')}>
          <div className="text-xs text-brand-ink">الحرق الإجمالي (Gross)</div>
          <Num value={preview.gross} unit="kcal" />
        </div>
        <div className={cn(useNetMet && 'font-semibold')}>
          <div className="text-xs text-brand-ink">الحرق الصافي (Net = MET − 1)</div>
          <Num value={preview.net} unit="kcal" />
        </div>
        <p className="col-span-2 text-xs text-brand-ink">
          يُحسب على وزن خط الاتجاه <bdi className="font-mono">{weightKg.toFixed(1)}</bdi> كغ. {useNetMet ? 'الصافي هو ما يُضاف للحرق اليومي لأن دقيقة الراحة محسوبة أصلاً في BMR × 1.2.' : 'الإعدادات تستخدم الحرق الإجمالي.'}
        </p>
      </div>

      <FormStatus status={status} />
      <Button id="save-exercise" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ التمرين'}</Button>
    </form>
  );
}
