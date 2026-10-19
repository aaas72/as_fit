'use client';

import { useWatch } from 'react-hook-form';
import { useActionForm } from '@/components/forms/useActionForm';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { cn } from '@/lib/cn';
import { BASIS_LABEL } from '@/lib/labels';
import { BASES, foodSchema } from '@/lib/validation/schemas';
import { saveFood } from '@/server/actions/foods';
import type { FoodView } from '@/server/queries/logs';

export function FoodForm({ food, onDone }: { food?: FoodView; onDone?: (saved: boolean) => void }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: foodSchema,
    action: saveFood,
    defaultValues: food
      ? { id: food.id, itemNameAr: food.nameAr, itemNameEn: food.nameEn ?? '', nutritionBasis: food.basis, gramsPerUnit: food.gramsPerUnit ?? '', calories: food.calories, proteinG: food.protein, carbsG: food.carbs ?? '', fatG: food.fat ?? '' }
      : { itemNameAr: '', itemNameEn: '', nutritionBasis: 'per_100g', gramsPerUnit: '', calories: '', proteinG: '', carbsG: '', fatG: '' },
    successText: food ? 'حُفظ التعديل. الوجبات السابقة لا تتأثر.' : 'أُضيف الصنف إلى القاموس.',
    onSuccess: () => { if (!food) form.reset(); onDone?.(true); },
  });
  const basis = useWatch({ control: form.control, name: 'nutritionBasis' }) as keyof typeof BASIS_LABEL;
  const prefix = food ? `food-${food.id}` : 'food-new';
  const per = BASIS_LABEL[basis] ?? '';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم بالعربية" htmlFor={`${prefix}-ar`} error={err('itemNameAr')}>
          <input id={`${prefix}-ar`} className={inputClass} {...form.register('itemNameAr')} />
        </Field>
        <Field label="الاسم بالإنجليزية (اختياري)" htmlFor={`${prefix}-en`}>
          <input id={`${prefix}-en`} dir="ltr" className={inputClass} {...form.register('itemNameEn')} />
        </Field>
        <Field label="أساس القيم" htmlFor={`${prefix}-basis`}>
          <select id={`${prefix}-basis`} className={inputClass} {...form.register('nutritionBasis')}>
            {BASES.map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
          </select>
        </Field>
        {basis === 'per_unit' && (
          <Field label="وزن الحبة (غ، اختياري)" htmlFor={`${prefix}-gpu`} error={err('gramsPerUnit')}>
            <input id={`${prefix}-gpu`} inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register('gramsPerUnit')} />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([['calories', 'سعرات'], ['proteinG', 'بروتين غ'], ['carbsG', 'كربوهيدرات غ'], ['fatG', 'دهون غ']] as const).map(([name, label]) => (
          <Field key={name} label={`${label} ${per}`} htmlFor={`${prefix}-${name}`} error={err(name)}>
            <input id={`${prefix}-${name}`} inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register(name)} />
          </Field>
        ))}
      </div>
      <FormStatus status={status} />
      <div className="flex gap-2">
        <Button id={`${prefix}-save`} type="submit" disabled={pending}>{pending ? 'جارٍ الحفظ…' : food ? 'حفظ التعديل' : 'إضافة الصنف'}</Button>
        {onDone && <Button variant="ghost" onClick={() => onDone(false)}>إغلاق</Button>}
      </div>
    </form>
  );
}
