'use client';

import { Controller } from 'react-hook-form';
import { useActionForm } from '@/components/forms/useActionForm';
import { CheckChoice, NumberStepper, Select } from '@/components/inputs/controls';
import { DateField, TimeField } from '@/components/inputs/pickers';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { GENDER_LABEL } from '@/lib/labels';
import { profileSchema, type ProfileInput } from '@/lib/validation/schemas';
import { upsertProfile } from '@/server/actions/profile';

const TIMEZONES = ['Europe/Istanbul', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Amman', 'Asia/Baghdad', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Tunis', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];


export function SettingsForm({ initial }: { initial: ProfileInput }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: profileSchema,
    action: upsertProfile,
    defaultValues: initial,
    successText: 'حُفظت الإعدادات وأُعيد حساب الأهداف.',
  });
  const r = form.register;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الملف الشخصي</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="الاسم" htmlFor="displayName" error={err('displayName')}><input id="displayName" className={inputClass} {...r('displayName')} /></Field>
          <Field label="الجنس" htmlFor="gender-male" hint="يحدد ثابت معادلة BMR وحدود WHR">
            <Controller control={form.control} name="gender" render={({ field }) => (<CheckChoice id="gender" label="الجنس" value={field.value as string} onChange={field.onChange} options={(['male', 'female'] as const).map((g) => ({ value: g, label: GENDER_LABEL[g] }))} />)} />
          </Field>
          <Field label="تاريخ الميلاد" htmlFor="birthDate" error={err('birthDate')}><Controller control={form.control} name="birthDate" render={({ field }) => (<DateField id="birthDate" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} min="1920-01-01" max={new Date().toISOString().slice(0, 10)} invalid={Boolean(err('birthDate'))} />)} /></Field>
          <Field label="الطول (سم)" htmlFor="heightCm" error={err('heightCm')}><Controller control={form.control} name="heightCm" render={({ field }) => (<NumberStepper id="heightCm" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={100} max={250} unit="سم" invalid={Boolean(err('heightCm'))} />)} /></Field>
          <Field label="الوزن الأولي (كغ)" htmlFor="initialWeightKg" error={err('initialWeightKg')} hint="يُستخدم حتى أول قراءة وزن ملتزمة"><Controller control={form.control} name="initialWeightKg" render={({ field }) => (<NumberStepper id="initialWeightKg" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={30} max={300} unit="كغ" invalid={Boolean(err('initialWeightKg'))} />)} /></Field>
          <Field label="الوزن المستهدف (كغ)" htmlFor="targetWeightKg" error={err('targetWeightKg')}><Controller control={form.control} name="targetWeightKg" render={({ field }) => (<NumberStepper id="targetWeightKg" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={30} max={300} unit="كغ" invalid={Boolean(err('targetWeightKg'))} />)} /></Field>
          <Field label="معامل النشاط" htmlFor="activityFactor" error={err('activityFactor')} hint="النشاط بدون التمارين المسجلة. 1.2 للجلوس الطويل"><Controller control={form.control} name="activityFactor" render={({ field }) => (<NumberStepper id="activityFactor" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.05} min={1} max={2.5} invalid={Boolean(err('activityFactor'))} />)} /></Field>
          <Field label="المنطقة الزمنية" htmlFor="timezone">
            <Controller control={form.control} name="timezone" render={({ field }) => (<Select id="timezone" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />)} />
          </Field>
        </div>
      </section>

      <section id="meal-schedule" className="flex scroll-mt-8 flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">جدول الوجبات</h2>
          <p className="text-sm text-ink-muted">مواعيدك المعتادة. كل وجبة تُقارن بموعدها هنا لحساب التأخير أو التبكير. اترك الموعد فارغاً إن لم تكن الوجبة مجدولة.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['breakfastTime', 'الفطور'], ['lunchTime', 'الغداء'], ['dinnerTime', 'العشاء']] as const).map(([name, label]) => (
            <Field key={name} label={label} htmlFor={name} error={err(name)}>
              <Controller control={form.control} name={name} render={({ field }) => (<TimeField id={name} clearable placeholder="بلا موعد" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(err(name))} />)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الأهداف</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="العجز اليومي المخطط (سعرة)" htmlFor="plannedDeficit" error={err('plannedDeficit')} hint="يُقيَّد تلقائياً بنزول ≤ 1% من الوزن أسبوعياً"><Controller control={form.control} name="plannedDeficit" render={({ field }) => (<NumberStepper id="plannedDeficit" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={50} min={0} max={1200} unit="سعرة" />)} /></Field>
          <Field label="البروتين (غ لكل كغ)" htmlFor="proteinPerKg" error={err('proteinPerKg')} hint="1.6–2.2 أثناء العجز (ISSN)"><Controller control={form.control} name="proteinPerKg" render={({ field }) => (<NumberStepper id="proteinPerKg" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.1} min={0.8} max={3} unit="غ/كغ" />)} /></Field>
          <Field label="ساعات الصيام قبل الوزن" htmlFor="requiredFastingHours" error={err('requiredFastingHours')}><Controller control={form.control} name="requiredFastingHours" render={({ field }) => (<NumberStepper id="requiredFastingHours" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={1} min={8} max={24} unit="ساعة" />)} /></Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الثوابت العلمية</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="كافيين البن (ملغ لكل غ)" htmlFor="caffeineMgPerG" error={err('caffeineMgPerG')} hint="أرابيكا ~12، روبوستا ~22"><Controller control={form.control} name="caffeineMgPerG" render={({ field }) => (<NumberStepper id="caffeineMgPerG" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.5} min={5} max={25} unit="ملغ/غ" invalid={Boolean(err('caffeineMgPerG'))} />)} /></Field>
          <Field label="نصف عمر الكافيين (ساعة)" htmlFor="caffeineHalfLifeH" error={err('caffeineHalfLifeH')} hint="3–7 ساعات عادةً"><Controller control={form.control} name="caffeineHalfLifeH" render={({ field }) => (<NumberStepper id="caffeineHalfLifeH" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.5} min={2} max={10} unit="ساعة" />)} /></Field>
          <Field label="سعرات الكغ دهون" htmlFor="kcalPerKg" error={err('kcalPerKg')}><Controller control={form.control} name="kcalPerKg" render={({ field }) => (<NumberStepper id="kcalPerKg" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={100} min={5000} max={9000} unit="سعرة" invalid={Boolean(err('kcalPerKg'))} />)} /></Field>
          <Field label="معامل التنعيم اليومي α" htmlFor="emaAlpha" error={err('emaAlpha')} hint="0.10 حسب Hacker's Diet"><Controller control={form.control} name="emaAlpha" render={({ field }) => (<NumberStepper id="emaAlpha" value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.01} min={0.01} max={0.99} invalid={Boolean(err('emaAlpha'))} />)} /></Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft sm:col-span-2">
            <input id="useNetMet" type="checkbox" className="size-5 accent-brand" {...r('useNetMet')} />
            <span>
              <span className="block font-semibold">احسب حرق التمارين الصافي (MET − 1)</span>
              <span className="text-sm text-ink-muted">موصى به: دقيقة الراحة محسوبة أصلاً في BMR × معامل النشاط.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft sm:col-span-2">
            <input id="useKatchMcArdle" type="checkbox" className="size-5 accent-brand" {...r('useKatchMcArdle')} />
            <span>
              <span className="block font-semibold">احسب الأيض الأساسي من الكتلة الخالية من الدهون (Katch-McArdle)</span>
              <span className="text-sm text-ink-muted">يُستخدم فقط عند وجود قياس للرقبة والخصر (والورك للنساء) خلال آخر 30 يوماً، وإلا تُستخدم معادلة Mifflin-St Jeor.</span>
            </span>
          </label>
        </div>
      </section>

      <FormStatus status={status} />
      <Button id="save-settings" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</Button>
    </form>
  );
}
