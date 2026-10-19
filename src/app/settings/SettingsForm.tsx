'use client';

import { useActionForm } from '@/components/forms/useActionForm';
import { Button, Field, FormStatus, inputClass } from '@/components/ui';
import { cn } from '@/lib/cn';
import { GENDER_LABEL } from '@/lib/labels';
import { profileSchema, type ProfileInput } from '@/lib/validation/schemas';
import { upsertProfile } from '@/server/actions/profile';

const TIMEZONES = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Amman', 'Asia/Baghdad', 'Africa/Cairo', 'Europe/Istanbul', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Tunis', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];

const num = cn(inputClass, 'font-mono');

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
          <Field label="الجنس" htmlFor="gender" hint="يحدد ثابت معادلة BMR وحدود WHR">
            <select id="gender" className={inputClass} {...r('gender')}>{(['male', 'female'] as const).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</select>
          </Field>
          <Field label="تاريخ الميلاد" htmlFor="birthDate" error={err('birthDate')}><input id="birthDate" type="date" className={inputClass} {...r('birthDate')} /></Field>
          <Field label="الطول (سم)" htmlFor="heightCm" error={err('heightCm')}><input id="heightCm" inputMode="decimal" className={num} {...r('heightCm')} /></Field>
          <Field label="الوزن الأولي (كغ)" htmlFor="initialWeightKg" error={err('initialWeightKg')} hint="يُستخدم حتى أول قراءة وزن ملتزمة"><input id="initialWeightKg" inputMode="decimal" className={num} {...r('initialWeightKg')} /></Field>
          <Field label="الوزن المستهدف (كغ)" htmlFor="targetWeightKg" error={err('targetWeightKg')}><input id="targetWeightKg" inputMode="decimal" className={num} {...r('targetWeightKg')} /></Field>
          <Field label="معامل النشاط" htmlFor="activityFactor" error={err('activityFactor')} hint="النشاط بدون التمارين المسجلة. 1.2 للجلوس الطويل"><input id="activityFactor" inputMode="decimal" className={num} {...r('activityFactor')} /></Field>
          <Field label="المنطقة الزمنية" htmlFor="timezone">
            <select id="timezone" className={inputClass} {...r('timezone')}>{TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الأهداف</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="العجز اليومي المخطط (kcal)" htmlFor="plannedDeficit" error={err('plannedDeficit')} hint="يُقيَّد تلقائياً بنزول ≤ 1% من الوزن أسبوعياً"><input id="plannedDeficit" inputMode="numeric" className={num} {...r('plannedDeficit')} /></Field>
          <Field label="البروتين (غ لكل كغ)" htmlFor="proteinPerKg" error={err('proteinPerKg')} hint="1.6–2.2 أثناء العجز (ISSN)"><input id="proteinPerKg" inputMode="decimal" className={num} {...r('proteinPerKg')} /></Field>
          <Field label="ساعات الصيام قبل الوزن" htmlFor="requiredFastingHours" error={err('requiredFastingHours')}><input id="requiredFastingHours" inputMode="numeric" className={num} {...r('requiredFastingHours')} /></Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الثوابت العلمية</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="كافيين البن (mg لكل غ)" htmlFor="caffeineMgPerG" error={err('caffeineMgPerG')} hint="أرابيكا ~12، روبوستا ~22"><input id="caffeineMgPerG" inputMode="decimal" className={num} {...r('caffeineMgPerG')} /></Field>
          <Field label="نصف عمر الكافيين (ساعة)" htmlFor="caffeineHalfLifeH" error={err('caffeineHalfLifeH')} hint="3–7 ساعات عادةً"><input id="caffeineHalfLifeH" inputMode="decimal" className={num} {...r('caffeineHalfLifeH')} /></Field>
          <Field label="سعرات الكغ دهون" htmlFor="kcalPerKg" error={err('kcalPerKg')}><input id="kcalPerKg" inputMode="numeric" className={num} {...r('kcalPerKg')} /></Field>
          <Field label="معامل التنعيم اليومي α" htmlFor="emaAlpha" error={err('emaAlpha')} hint="0.10 حسب Hacker's Diet"><input id="emaAlpha" inputMode="decimal" className={num} {...r('emaAlpha')} /></Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft sm:col-span-2">
            <input id="useNetMet" type="checkbox" className="size-5 accent-brand" {...r('useNetMet')} />
            <span>
              <span className="block font-semibold">احسب حرق التمارين الصافي (MET − 1)</span>
              <span className="text-sm text-ink-muted">موصى به: دقيقة الراحة محسوبة أصلاً في BMR × معامل النشاط.</span>
            </span>
          </label>
        </div>
      </section>

      <FormStatus status={status} />
      <Button id="save-settings" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</Button>
    </form>
  );
}
