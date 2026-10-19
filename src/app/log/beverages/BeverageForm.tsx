'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { DrinkForm } from '@/app/drinks/DrinkForm';
import { useActionForm } from '@/components/forms/useActionForm';
import { Num } from '@/components/Num';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { beverageMetrics } from '@/domain/beverages';
import type { MilkType } from '@/domain/constants';
import { cn } from '@/lib/cn';
import { MILK_LABEL } from '@/lib/labels';
import { beverageSchema, MILK_TYPES } from '@/lib/validation/schemas';
import { logBeverage } from '@/server/actions/beverages';
import type { DrinkView } from '@/server/queries/logs';

const num = cn(inputClass, 'font-mono');

export function BeverageForm({ date, nowClock, caffeineMgPerG, drinks }: { date: string; nowClock: string; caffeineMgPerG: number; drinks: DrinkView[] }) {
  const [created, setCreated] = useState<DrinkView[]>([]);
  const all = [...drinks, ...created.filter((c) => !drinks.some((d) => d.id === c.id))];
  const [adding, setAdding] = useState(all.length === 0);

  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: beverageSchema,
    action: logBeverage,
    defaultValues: { logDate: date, time: nowClock, beverageId: undefined, volumeMl: '', dryCoffeeG: '', milkType: 'none', milkMl: 0, sugarTsp: 0 },
    successText: (r) => `حُفظ: ${Math.round(r.caffeineMg)} mg كافيين، ${Math.round(r.kcal)} kcal.`,
  });
  const v = useWatch({ control: form.control }) as Record<string, unknown>;
  const drink = all.find((d) => d.id === Number(v.beverageId));
  const milkType = (v.milkType ?? 'none') as MilkType;
  const preview = drink ? beverageMetrics({
    drink, volumeMl: Number(v.volumeMl) || 0, dryCoffeeG: drink.byCoffeeWeight ? Number(v.dryCoffeeG) || null : null,
    milkType, milkMl: Number(v.milkMl) || 0, sugarTsp: Number(v.sugarTsp) || 0,
  }, caffeineMgPerG) : null;

  const choose = (d: DrinkView) => {
    form.setValue('beverageId', d.id, { shouldValidate: true });
    form.setValue('volumeMl', d.defaultVolumeMl);
    form.setValue('dryCoffeeG', d.byCoffeeWeight ? d.defaultCoffeeG ?? '' : '');
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink-muted">1. اختر من مشروباتك</h3>
        {all.length > 0 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المشروب">
            {all.map((d) => (
              <button
                key={d.id} type="button" role="radio" aria-checked={drink?.id === d.id} id={`drink-chip-${d.id}`}
                onClick={() => choose(d)}
                className={cn('rounded-full border px-4 py-1.5 text-sm font-medium', drink?.id === d.id ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line hover:border-brand')}
              >
                {d.nameAr}
              </button>
            ))}
          </div>
        )}
        {err('beverageId') && <p className="text-sm text-danger-ink">{err('beverageId')}</p>}
        {adding ? (
          <div className="rounded-xl border border-dashed border-brand p-4">
            <p className="mb-3 text-sm font-semibold">{all.length === 0 ? 'قائمة مشروباتك فارغة. أضف أول مشروب:' : 'مشروب جديد في قائمتك:'}</p>
            <DrinkForm
              caffeineMgPerG={caffeineMgPerG}
              onCreated={(d) => { setCreated((c) => [...c, d]); choose(d); setAdding(false); }}
              onDone={all.length > 0 ? (saved) => { if (!saved) setAdding(false); } : undefined}
            />
          </div>
        ) : (
          <div className="flex gap-4 text-sm">
            <button type="button" id="new-drink-inline" className="font-medium text-brand-ink" onClick={() => setAdding(true)}>+ مشروب جديد</button>
            <Link href="/drinks" className="text-ink-muted hover:text-brand-ink">إدارة القائمة</Link>
          </div>
        )}
      </section>

      {drink && (
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-ink-muted">2. التفاصيل</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الوقت" htmlFor="time" error={err('time')}>
              <input id="time" type="time" className={inputClass} {...form.register('time')} />
            </Field>
            <Field label="الحجم (مل)" htmlFor="volumeMl" error={err('volumeMl')}>
              <input id="volumeMl" inputMode="decimal" className={num} {...form.register('volumeMl')} />
            </Field>
            {drink.byCoffeeWeight && (
              <Field label="وزن البن (غ)" htmlFor="dryCoffeeG" error={err('dryCoffeeG')} hint={`الكافيين = الوزن × ${caffeineMgPerG} mg/g`}>
                <input id="dryCoffeeG" inputMode="decimal" className={num} {...form.register('dryCoffeeG')} />
              </Field>
            )}
            <Field label="الحليب" htmlFor="milkType">
              <select id="milkType" className={inputClass} {...form.register('milkType')}>
                {MILK_TYPES.map((t) => <option key={t} value={t}>{MILK_LABEL[t]}</option>)}
              </select>
            </Field>
            {milkType !== 'none' && (
              <Field label="كمية الحليب (مل)" htmlFor="milkMl" error={err('milkMl')}>
                <input id="milkMl" inputMode="decimal" className={num} {...form.register('milkMl')} />
              </Field>
            )}
            <Field label="السكر (ملعقة صغيرة)" htmlFor="sugarTsp" error={err('sugarTsp')} hint="الملعقة = 4.2 غ = 16.8 kcal">
              <input id="sugarTsp" inputMode="decimal" className={num} {...form.register('sugarTsp')} />
            </Field>
          </div>

          {preview && (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-brand-soft px-4 py-3 text-center">
              <div><div className="text-xs text-brand-ink">كافيين</div><Num value={preview.caffeineMg} unit="mg" className="font-semibold" /></div>
              <div><div className="text-xs text-brand-ink">سعرات</div><Num value={preview.totalKcal} unit="kcal" className="font-semibold" /></div>
              <div><div className="text-xs text-brand-ink">بروتين</div><Num value={preview.proteinG} digits={1} unit="غ" className="font-semibold" /></div>
            </div>
          )}

          <FormStatus status={status} />
          <Button id="save-beverage" disabled={pending} className="self-start" onClick={() => onSubmit()}>{pending ? 'جارٍ الحفظ…' : 'حفظ المشروب'}</Button>
        </section>
      )}
    </div>
  );
}
