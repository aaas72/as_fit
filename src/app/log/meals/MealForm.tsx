'use client';

import { useFieldArray, useWatch } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { FoodCombobox, type FoodOption } from '@/components/forms/FoodCombobox';
import { useActionForm } from '@/components/forms/useActionForm';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { clockDriftMin, driftTone } from '@/domain/meal-timing';
import { portionNutrition, QUANTITY_UNIT } from '@/domain/nutrition';
import { cn } from '@/lib/cn';
import { MEAL_LABEL } from '@/lib/labels';
import { MEAL_TYPES, mealSchema } from '@/lib/validation/schemas';
import { createMeal } from '@/server/actions/meals';

const DEFAULT_SCHEDULE = { breakfast: '08:00', lunch: '13:30', dinner: '20:00', snack: '' } as const;

export function MealForm({ date, nowClock, foods }: { date: string; nowClock: string; foods: FoodOption[] }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: mealSchema,
    action: createMeal,
    defaultValues: { logDate: date, mealType: 'lunch', scheduledTime: DEFAULT_SCHEDULE.lunch, actualTime: nowClock, notes: '', items: [{ foodId: undefined, quantity: '' }] },
    successText: (r) => `حُفظت الوجبة: ${Math.round(r.kcal)} kcal و ${Math.round(r.protein)} غ بروتين.`,
    onSuccess: () => form.reset({ ...form.getValues(), notes: '', items: [{ foodId: undefined, quantity: '' }] }),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const [mealType, scheduled, actual, items] = useWatch({ control: form.control, name: ['mealType', 'scheduledTime', 'actualTime', 'items'] }) as [
    keyof typeof MEAL_LABEL, string | undefined, string, { foodId?: number; quantity?: unknown }[],
  ];

  const byId = new Map(foods.map((f) => [f.id, f]));
  const preview = (items ?? []).map((it) => {
    const f = it.foodId ? byId.get(Number(it.foodId)) : undefined;
    const q = Number(it.quantity);
    return f && q > 0 ? portionNutrition({ basis: f.basis, calories: f.calories, protein: f.protein }, q) : null;
  });
  const total = preview.reduce((s, p) => ({ kcal: s.kcal + (p?.calories ?? 0), protein: s.protein + (p?.protein ?? 0) }), { kcal: 0, protein: 0 });
  const drift = scheduled && /^\d{2}:\d{2}$/.test(scheduled) && /^\d{2}:\d{2}$/.test(actual ?? '') ? clockDriftMin(scheduled, actual) : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" {...form.register('logDate')} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">نوع الوجبة</legend>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((t) => (
            <label key={t} className={cn('cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium', mealType === t ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface')}>
              <input
                type="radio" value={t} className="sr-only" id={`meal-type-${t}`}
                {...form.register('mealType', { onChange: () => form.setValue('scheduledTime', DEFAULT_SCHEDULE[t]) })}
              />
              {MEAL_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الموعد المجدول" htmlFor="scheduledTime" error={err('scheduledTime')} hint="اتركه فارغاً للوجبات غير المجدولة">
          <input id="scheduledTime" type="time" className={inputClass} {...form.register('scheduledTime')} />
        </Field>
        <Field label="الوقت الفعلي" htmlFor="actualTime" error={err('actualTime')}>
          <input id="actualTime" type="time" className={inputClass} {...form.register('actualTime')} />
        </Field>
        <div className="flex flex-col justify-end gap-1">
          <span className="text-sm font-semibold">الانحراف الزمني</span>
          {drift == null ? (
            <span className="py-2 text-sm text-ink-muted">—</span>
          ) : (
            <Badge tone={driftTone(drift)} className="w-fit">
              {drift === 0 ? 'في الموعد' : drift > 0 ? 'تأخير' : 'تبكير'} <Num value={Math.abs(drift)} unit="د" />
            </Badge>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">الأصناف</legend>
        {fields.map((field, i) => {
          const f = items?.[i]?.foodId ? byId.get(Number(items[i]!.foodId)) : undefined;
          return (
            <div key={field.id} className="grid items-start gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_9rem_8rem_auto]">
              <Field label="الصنف" htmlFor={`item-${i}-food`} error={err(`items.${i}.foodId`)}>
                <FoodCombobox
                  id={`item-${i}-food`} foods={foods} value={items?.[i]?.foodId ? Number(items[i]!.foodId) : undefined}
                  invalid={Boolean(err(`items.${i}.foodId`))}
                  onChange={(id) => form.setValue(`items.${i}.foodId`, id, { shouldValidate: true })}
                />
              </Field>
              <Field label={`الكمية (${f ? QUANTITY_UNIT[f.basis] : 'غ / مل / حبة'})`} htmlFor={`item-${i}-qty`} error={err(`items.${i}.quantity`)}>
                <input id={`item-${i}-qty`} inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register(`items.${i}.quantity`)} />
              </Field>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">السعرات</span>
                <span className="py-2">{preview[i] ? <Num value={preview[i]!.calories} unit="kcal" /> : <span className="text-ink-muted">—</span>}</span>
              </div>
              <Button variant="ghost" className="mt-6 px-2" aria-label={`حذف الصنف ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}>✕</Button>
            </div>
          );
        })}
        {err('items') && <p className="text-sm text-danger-ink">{err('items')}</p>}
        <Button id="add-item" variant="secondary" className="w-fit" onClick={() => append({ foodId: undefined, quantity: '' })}>+ إضافة صنف</Button>
      </fieldset>

      <Field label="ملاحظات" htmlFor="notes">
        <textarea id="notes" rows={2} className={inputClass} {...form.register('notes')} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-brand-soft px-4 py-3">
        <span className="text-sm font-semibold text-brand-ink">مجموع الوجبة</span>
        <span className="flex gap-4">
          <Num value={total.kcal} unit="kcal" className="font-semibold" />
          <Num value={total.protein} unit="غ بروتين" className="font-semibold" />
        </span>
      </div>

      <FormStatus status={status} />
      <Button id="save-meal" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ الوجبة'}</Button>
    </form>
  );
}
