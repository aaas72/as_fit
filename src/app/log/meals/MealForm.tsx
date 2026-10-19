'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { FoodForm } from '@/app/foods/FoodForm';
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
import type { MealSchedule } from '@/server/queries/profile';

const DEFAULT_QTY = { per_unit: 1, per_100g: 100, per_100ml: 100 } as const;

export function MealForm({ date, nowClock, foods, schedule }: { date: string; nowClock: string; foods: FoodOption[]; schedule: MealSchedule }) {
  // Foods created inline appear immediately, before the page refreshes with the new dictionary
  const [created, setCreated] = useState<FoodOption[]>([]);
  const [newFoodName, setNewFoodName] = useState<string | null>(foods.length === 0 ? '' : null);
  const all = [...foods, ...created.filter((c) => !foods.some((f) => f.id === c.id))];
  const byId = new Map(all.map((f) => [f.id, f]));

  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: mealSchema,
    action: createMeal,
    defaultValues: { logDate: date, mealType: 'lunch', actualTime: nowClock, notes: '', items: [] },
    successText: (r) => `حُفظت الوجبة: ${Math.round(r.kcal)} kcal و ${Math.round(r.protein)} غ بروتين.`,
    onSuccess: () => form.reset({ ...form.getValues(), notes: '', items: [] }),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const [mealType, actual, items] = useWatch({ control: form.control, name: ['mealType', 'actualTime', 'items'] }) as [
    keyof typeof MEAL_LABEL, string, { foodId?: number; quantity?: unknown }[],
  ];

  const addFood = (f: FoodOption) => {
    const existing = (items ?? []).findIndex((it) => Number(it.foodId) === f.id);
    if (existing >= 0) { form.setFocus(`items.${existing}.quantity`); return; }
    append({ foodId: f.id, quantity: DEFAULT_QTY[f.basis] });
    setTimeout(() => form.setFocus(`items.${(items ?? []).length}.quantity`), 0);
  };

  const rows = (items ?? []).map((it) => {
    const f = byId.get(Number(it.foodId));
    const q = Number(it.quantity);
    return { food: f, n: f && q > 0 ? portionNutrition({ basis: f.basis, calories: f.calories, protein: f.protein }, q) : null };
  });
  const total = rows.reduce((s, r) => ({ kcal: s.kcal + (r.n?.calories ?? 0), protein: s.protein + (r.n?.protein ?? 0) }), { kcal: 0, protein: 0 });
  const scheduled = mealType === 'snack' ? null : schedule[mealType];
  const drift = scheduled && /^\d{2}:\d{2}$/.test(actual ?? '') ? clockDriftMin(scheduled, actual) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. When */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink-muted">1. الوجبة ووقتها</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="نوع الوجبة">
          {MEAL_TYPES.map((t) => (
            <label key={t} className={cn('cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium', mealType === t ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}>
              <input type="radio" value={t} className="sr-only" id={`meal-type-${t}`} {...form.register('mealType')} />
              {MEAL_LABEL[t]}
            </label>
          ))}
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Field label="وقت الأكل الفعلي" htmlFor="actualTime" error={err('actualTime')}>
            <input id="actualTime" type="time" className={inputClass} {...form.register('actualTime')} />
          </Field>
          <div className="flex flex-col gap-1 pb-1 text-sm">
            {mealType === 'snack' ? (
              <span className="text-ink-muted">الوجبات الخفيفة بلا موعد مجدول.</span>
            ) : scheduled ? (
              <>
                <span className="text-ink-muted">موعدها في جدولك <bdi className="font-mono text-ink">{scheduled}</bdi></span>
                {drift != null && (
                  <Badge tone={driftTone(drift)} className="w-fit">
                    {drift === 0 ? 'في الموعد' : drift > 0 ? 'تأخير' : 'تبكير'} <Num value={Math.abs(drift)} unit="د" />
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-ink-muted">لا موعد لهذه الوجبة في جدولك. <Link href="/settings#meal-schedule" className="font-medium text-brand-ink">حدّده من الإعدادات</Link></span>
            )}
          </div>
        </div>
      </section>

      {/* 2. What */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink-muted">2. ماذا أكلت؟</h3>
        <FoodCombobox id="food-search-add" foods={all} onPick={addFood} onCreate={(name) => setNewFoodName(name)} />

        {newFoodName != null && (
          <div className="rounded-xl border border-dashed border-brand p-4">
            <p className="mb-3 text-sm font-semibold">{foods.length === 0 && created.length === 0 ? 'قاموسك فارغ. أضف أول صنف وسيُضاف للوجبة مباشرة:' : 'صنف جديد في قاموسك، يُضاف للوجبة مباشرة:'}</p>
            <FoodForm
              key={newFoodName}
              initialName={newFoodName}
              onCreated={(f) => { setCreated((c) => [...c, f]); addFood(f); setNewFoodName(null); }}
              onDone={(saved) => { if (!saved) setNewFoodName(null); }}
            />
          </div>
        )}
        {newFoodName == null && (
          <button type="button" id="new-food-inline" className="w-fit text-sm font-medium text-brand-ink" onClick={() => setNewFoodName('')}>+ صنف غير موجود في القاموس؟ أضفه</button>
        )}

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">لم تُضف أصنافاً بعد. ابحث بالاسم واختر الصنف.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {fields.map((field, i) => {
              const r = rows[i];
              const f = r?.food;
              return (
                <li key={field.id} className="grid items-center gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_11rem_7rem_auto]">
                  <span className="font-semibold">{f?.nameAr ?? '—'}</span>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">الكمية</span>
                    <input id={`item-${i}-qty`} inputMode="decimal" aria-invalid={Boolean(err(`items.${i}.quantity`))} className={cn(inputClass, 'font-mono')} {...form.register(`items.${i}.quantity`)} />
                    <span className="w-10 shrink-0 text-sm text-ink-muted">{f ? QUANTITY_UNIT[f.basis] : ''}</span>
                  </label>
                  <span className="text-sm">{r?.n ? <><Num value={r.n.calories} unit="kcal" /> · <Num value={r.n.protein} digits={1} unit="غ" /></> : '—'}</span>
                  <Button variant="ghost" className="px-2" aria-label={`حذف ${f?.nameAr ?? 'الصنف'}`} onClick={() => remove(i)}>✕</Button>
                  {err(`items.${i}.quantity`) && <p className="text-sm text-danger-ink sm:col-span-4">{err(`items.${i}.quantity`)}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {err('items') && <p className="text-sm text-danger-ink">{err('items')}</p>}
      </section>

      <Field label="ملاحظات (اختياري)" htmlFor="notes">
        <input id="notes" className={inputClass} {...form.register('notes')} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-brand-soft px-4 py-3">
        <span className="text-sm font-semibold text-brand-ink">مجموع الوجبة</span>
        <span className="flex gap-4">
          <Num value={total.kcal} unit="kcal" className="font-semibold" />
          <Num value={total.protein} unit="غ بروتين" className="font-semibold" />
        </span>
      </div>

      <FormStatus status={status} />
      <Button id="save-meal" disabled={pending || fields.length === 0} className="self-start" onClick={() => onSubmit()}>{pending ? 'جارٍ الحفظ…' : 'حفظ الوجبة'}</Button>
    </div>
  );
}
