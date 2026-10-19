'use client';

import { Controller, useWatch } from 'react-hook-form';
import type { FoodOption } from '@/components/forms/FoodCombobox';
import { useActionForm } from '@/components/forms/useActionForm';
import { NumberStepper, Segmented } from '@/components/inputs/controls';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { BASIS_LABEL } from '@/lib/labels';
import { BASES, foodSchema } from '@/lib/validation/schemas';
import { saveFood } from '@/server/actions/foods';
import type { FoodView } from '@/server/queries/logs';

// Used on /foods (add + edit) and inside the meal form ("not in your dictionary? add it here").
export function FoodForm({ food, initialName = '', onDone, onCreated }: {
  food?: FoodView;
  initialName?: string;
  onDone?: (saved: boolean) => void;
  onCreated?: (food: FoodOption) => void;
}) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: foodSchema,
    action: saveFood,
    defaultValues: food
      ? { id: food.id, itemNameAr: food.nameAr, itemNameEn: food.nameEn ?? '', nutritionBasis: food.basis, gramsPerUnit: food.gramsPerUnit ?? '', calories: food.calories, proteinG: food.protein, carbsG: food.carbs ?? '', fatG: food.fat ?? '' }
      : { itemNameAr: initialName, itemNameEn: '', nutritionBasis: 'per_100g', gramsPerUnit: '', calories: '', proteinG: '', carbsG: '', fatG: '' },
    successText: food ? 'حُفظ التعديل. الوجبات السابقة لا تتأثر.' : 'أُضيف الصنف إلى القاموس.',
    onSuccess: (res, v) => {
      if (!food) {
        onCreated?.({ id: res.id, nameAr: v.itemNameAr, nameEn: v.itemNameEn || null, basis: v.nutritionBasis, calories: v.calories, protein: v.proteinG });
        form.reset();
      }
      onDone?.(true);
    },
  });
  const basis = useWatch({ control: form.control, name: 'nutritionBasis' }) as keyof typeof BASIS_LABEL;
  const prefix = food ? `food-${food.id}` : 'food-new';
  const per = BASIS_LABEL[basis] ?? '';

  return (
    <form onSubmit={(e) => { e.stopPropagation(); onSubmit(e); }} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم" htmlFor={`${prefix}-ar`} error={err('itemNameAr')}>
          <input id={`${prefix}-ar`} className={inputClass} {...form.register('itemNameAr')} />
        </Field>
        <Field label="القيم الغذائية محسوبة" htmlFor={`${prefix}-basis-per_100g`} hint="كما هي مكتوبة على الملصق أو في جدول القيم">
          <Controller control={form.control} name="nutritionBasis" render={({ field }) => (
            <Segmented id={`${prefix}-basis`} label="أساس القيم" value={field.value as string} onChange={field.onChange} options={BASES.map((b) => ({ value: b, label: BASIS_LABEL[b] }))} />
          )} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([['calories', 'سعرات'], ['proteinG', 'بروتين (غ)'], ['carbsG', 'كربوهيدرات (غ)'], ['fatG', 'دهون (غ)']] as const).map(([name, label]) => (
          <Field key={name} label={`${label} ${per}`} htmlFor={`${prefix}-${name}`} error={err(name)}>
            <Controller control={form.control} name={name} render={({ field }) => (<NumberStepper id={`${prefix}-${name}`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={name === 'calories' ? 1 : 0.1} min={0} invalid={Boolean(err(name))} />)} />
          </Field>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-muted">حقول اختيارية</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="الاسم بالإنجليزية" htmlFor={`${prefix}-en`}>
            <input id={`${prefix}-en`} dir="ltr" className={inputClass} {...form.register('itemNameEn')} />
          </Field>
          {basis === 'per_unit' && (
            <Field label="وزن الحبة (غ)" htmlFor={`${prefix}-gpu`} error={err('gramsPerUnit')}>
              <Controller control={form.control} name="gramsPerUnit" render={({ field }) => (<NumberStepper id={`${prefix}-gpu`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={0} max={5000} unit="غ" invalid={Boolean(err('gramsPerUnit'))} />)} />
            </Field>
          )}
        </div>
      </details>
      <FormStatus status={status} />
      <div className="flex gap-2">
        <Button id={`${prefix}-save`} type="submit" disabled={pending}>{pending ? 'جارٍ الحفظ…' : food ? 'حفظ التعديل' : 'إضافة الصنف'}</Button>
        {onDone && <Button variant="ghost" onClick={() => onDone(false)}>إغلاق</Button>}
      </div>
    </form>
  );
}
