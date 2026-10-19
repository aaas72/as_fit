'use client';

import { useWatch } from 'react-hook-form';
import { useActionForm } from '@/components/forms/useActionForm';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { beverageMetrics, COFFEE_BY_WEIGHT, DRINK_TYPES, type DrinkType } from '@/domain/beverages';
import type { MilkType } from '@/domain/constants';
import { cn } from '@/lib/cn';
import { DRINK_LABEL, MILK_LABEL } from '@/lib/labels';
import { beverageSchema, MILK_TYPES } from '@/lib/validation/schemas';
import { logBeverage } from '@/server/actions/beverages';

type Preset = { label: string; drinkType: DrinkType; volumeMl: number; dryCoffeeG?: number; milkType?: MilkType; milkMl?: number; sugarTsp?: number };
const PRESETS: Preset[] = [
  { label: 'قهوة تركية', drinkType: 'coffee_turkish', volumeMl: 70, dryCoffeeG: 7 },
  { label: 'قهوة مقطّرة', drinkType: 'coffee_brewed', volumeMl: 240, dryCoffeeG: 15 },
  { label: 'إسبريسو مزدوج', drinkType: 'espresso', volumeMl: 60, dryCoffeeG: 18 },
  { label: 'لاتيه', drinkType: 'espresso', volumeMl: 60, dryCoffeeG: 18, milkType: 'semi_skimmed', milkMl: 200 },
  { label: 'شاي أسود', drinkType: 'tea_black', volumeMl: 240 },
  { label: 'شاي أخضر', drinkType: 'tea_green', volumeMl: 240 },
  { label: 'ماء', drinkType: 'water', volumeMl: 250 },
];

export function BeverageForm({ date, nowClock, caffeineMgPerG }: { date: string; nowClock: string; caffeineMgPerG: number }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: beverageSchema,
    action: logBeverage,
    defaultValues: { logDate: date, time: nowClock, drinkType: 'coffee_turkish', volumeMl: 70, dryCoffeeG: 7, milkType: 'none', milkMl: 0, sugarTsp: 0 },
    successText: (r) => `حُفظ المشروب: ${Math.round(r.caffeineMg)} mg كافيين، ${Math.round(r.kcal)} kcal.`,
  });
  const v = useWatch({ control: form.control }) as Record<string, unknown>;
  const drinkType = (v.drinkType ?? 'water') as DrinkType;
  const milkType = (v.milkType ?? 'none') as MilkType;
  const byWeight = COFFEE_BY_WEIGHT.has(drinkType);
  const preview = beverageMetrics({
    drinkType, volumeMl: Number(v.volumeMl) || 0, dryCoffeeG: byWeight ? Number(v.dryCoffeeG) || null : null,
    milkType, milkMl: Number(v.milkMl) || 0, sugarTsp: Number(v.sugarTsp) || 0,
  }, caffeineMgPerG);

  const applyPreset = (p: Preset) => {
    form.setValue('drinkType', p.drinkType);
    form.setValue('volumeMl', p.volumeMl);
    form.setValue('dryCoffeeG', p.dryCoffeeG ?? '');
    form.setValue('milkType', p.milkType ?? 'none');
    form.setValue('milkMl', p.milkMl ?? 0);
    form.setValue('sugarTsp', p.sugarTsp ?? 0);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" {...form.register('logDate')} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">اختيار سريع</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} variant="secondary" className="rounded-full px-3 py-1.5 text-sm" onClick={() => applyPreset(p)}>{p.label}</Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المشروب" htmlFor="drinkType" error={err('drinkType')}>
          <select id="drinkType" className={inputClass} {...form.register('drinkType')}>
            {DRINK_TYPES.map((t) => <option key={t} value={t}>{DRINK_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="الوقت" htmlFor="time" error={err('time')}>
          <input id="time" type="time" className={inputClass} {...form.register('time')} />
        </Field>
        <Field label="حجم السائل (مل)" htmlFor="volumeMl" error={err('volumeMl')}>
          <input id="volumeMl" inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register('volumeMl')} />
        </Field>
        {byWeight && (
          <Field label="وزن البن (غ)" htmlFor="dryCoffeeG" error={err('dryCoffeeG')} hint={`الكافيين = الوزن × ${caffeineMgPerG} mg/g`}>
            <input id="dryCoffeeG" inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register('dryCoffeeG')} />
          </Field>
        )}
        <Field label="الحليب" htmlFor="milkType">
          <select id="milkType" className={inputClass} {...form.register('milkType')}>
            {MILK_TYPES.map((t) => <option key={t} value={t}>{MILK_LABEL[t]}</option>)}
          </select>
        </Field>
        {milkType !== 'none' && (
          <Field label="كمية الحليب (مل)" htmlFor="milkMl" error={err('milkMl')}>
            <input id="milkMl" inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register('milkMl')} />
          </Field>
        )}
        <Field label="السكر (ملعقة صغيرة)" htmlFor="sugarTsp" error={err('sugarTsp')} hint="الملعقة = 4.2 غ = 16.8 kcal">
          <input id="sugarTsp" inputMode="decimal" className={cn(inputClass, 'font-mono')} {...form.register('sugarTsp')} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg bg-brand-soft px-4 py-3 text-center">
        <div><div className="text-xs text-brand-ink">كافيين</div><Num value={preview.caffeineMg} unit="mg" className="font-semibold" /></div>
        <div><div className="text-xs text-brand-ink">سعرات</div><Num value={preview.totalKcal} unit="kcal" className="font-semibold" /></div>
        <div><div className="text-xs text-brand-ink">بروتين الحليب</div><Num value={preview.milkProteinG} digits={1} unit="غ" className="font-semibold" /></div>
      </div>

      <FormStatus status={status} />
      <Button id="save-beverage" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ المشروب'}</Button>
    </form>
  );
}
