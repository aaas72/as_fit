'use client';

import { Controller, useWatch } from 'react-hook-form';
import { useActionForm } from '@/components/forms/useActionForm';
import { NumberStepper } from '@/components/inputs/controls';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { drinkSchema } from '@/lib/validation/schemas';
import { saveDrink } from '@/server/actions/drinks';
import type { DrinkView } from '@/server/queries/logs';


// A drink in the user's own list. Values per 100 ml of the drink itself (milk and sugar are added when logging).
export function DrinkForm({ drink, onDone, onCreated, caffeineMgPerG }: {
  drink?: DrinkView;
  onDone?: (saved: boolean) => void;
  onCreated?: (drink: DrinkView) => void;
  caffeineMgPerG: number;
}) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: drinkSchema,
    action: saveDrink,
    defaultValues: drink
      ? { id: drink.id, nameAr: drink.nameAr, byCoffeeWeight: drink.byCoffeeWeight, caffeineMgPer100ml: drink.caffeineMgPer100ml, kcalPer100ml: drink.kcalPer100ml, proteinGPer100ml: drink.proteinGPer100ml, defaultVolumeMl: drink.defaultVolumeMl, defaultCoffeeG: drink.defaultCoffeeG ?? '' }
      : { nameAr: '', byCoffeeWeight: false, caffeineMgPer100ml: '', kcalPer100ml: '', proteinGPer100ml: '', defaultVolumeMl: '', defaultCoffeeG: '' },
    successText: drink ? 'حُفظ التعديل. السجلات السابقة لا تتأثر.' : 'أُضيف المشروب إلى قائمتك.',
    onSuccess: (res, v) => {
      if (!drink) {
        onCreated?.({ id: res.id, nameAr: v.nameAr, byCoffeeWeight: v.byCoffeeWeight, caffeineMgPer100ml: v.caffeineMgPer100ml, kcalPer100ml: v.kcalPer100ml, proteinGPer100ml: v.proteinGPer100ml, defaultVolumeMl: v.defaultVolumeMl, defaultCoffeeG: v.defaultCoffeeG ?? null, isActive: true });
        form.reset();
      }
      onDone?.(true);
    },
  });
  const byWeight = Boolean(useWatch({ control: form.control, name: 'byCoffeeWeight' }));
  const p = drink ? `drink-${drink.id}` : 'drink-new';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المشروب" htmlFor={`${p}-name`} error={err('nameAr')}>
          <input id={`${p}-name`} className={inputClass} placeholder="مثال: قهوة الصباح" {...form.register('nameAr')} />
        </Field>
        <Field label="الحجم المعتاد (مل)" htmlFor={`${p}-vol`} error={err('defaultVolumeMl')} hint="يُعبّأ تلقائياً عند التسجيل ويمكن تغييره">
          <Controller control={form.control} name="defaultVolumeMl" render={({ field }) => (<NumberStepper id={`${p}-vol`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={10} min={1} max={3000} unit="مل" invalid={Boolean(err('defaultVolumeMl'))} />)} />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft">
        <input id={`${p}-bycoffee`} type="checkbox" className="mt-1 size-5 accent-brand" {...form.register('byCoffeeWeight')} />
        <span>
          <span className="block font-semibold">قهوة أحضّرها من بن موزون</span>
          <span className="text-sm text-ink-muted">الكافيين = وزن البن × {caffeineMgPerG} mg/g (من الإعدادات). أدق من تقدير الحجم.</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {byWeight && (
          <Field label="وزن البن المعتاد (غ)" htmlFor={`${p}-coffee`} error={err('defaultCoffeeG')}>
            <Controller control={form.control} name="defaultCoffeeG" render={({ field }) => (<NumberStepper id={`${p}-coffee`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={0} max={100} unit="غ" invalid={Boolean(err('defaultCoffeeG'))} />)} />
          </Field>
        )}
        <Field label="كافيين لكل 100 مل (mg)" htmlFor={`${p}-caf`} error={err('caffeineMgPer100ml')} hint={byWeight ? 'يُستخدم إن لم تُدخل وزن البن' : '0 للمشروبات بلا كافيين'}>
          <Controller control={form.control} name="caffeineMgPer100ml" render={({ field }) => (<NumberStepper id={`${p}-caf`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={0} max={1000} unit="mg" invalid={Boolean(err('caffeineMgPer100ml'))} />)} />
        </Field>
        <Field label="سعرات لكل 100 مل" htmlFor={`${p}-kcal`} error={err('kcalPer100ml')} hint="بدون الحليب والسكر">
          <Controller control={form.control} name="kcalPer100ml" render={({ field }) => (<NumberStepper id={`${p}-kcal`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={0} max={1000} unit="kcal" invalid={Boolean(err('kcalPer100ml'))} />)} />
        </Field>
        <Field label="بروتين لكل 100 مل (غ)" htmlFor={`${p}-prot`} error={err('proteinGPer100ml')}>
          <Controller control={form.control} name="proteinGPer100ml" render={({ field }) => (<NumberStepper id={`${p}-prot`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={0} max={100} unit="غ" invalid={Boolean(err('proteinGPer100ml'))} />)} />
        </Field>
      </div>

      <FormStatus status={status} />
      <div className="flex gap-2">
        <Button id={`${p}-save`} type="submit" disabled={pending}>{pending ? 'جارٍ الحفظ…' : drink ? 'حفظ التعديل' : 'إضافة المشروب'}</Button>
        {onDone && <Button variant="ghost" onClick={() => onDone(false)}>إغلاق</Button>}
      </div>
    </form>
  );
}
