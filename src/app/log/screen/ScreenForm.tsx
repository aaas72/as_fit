'use client';

import { useWatch } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { useActionForm } from '@/components/forms/useActionForm';
import { Num } from '@/components/Num';
import { Button, FormStatus } from '@/components/ui';
import { screenSchema } from '@/lib/validation/schemas';
import { upsertScreenTime } from '@/server/actions/screen';

const SLIDERS = [
  { name: 'highFocusHours', label: 'تركيز عالٍ', hint: 'برمجة، دراسة، عمل يتطلب تفكيراً عميقاً' },
  { name: 'moderateAdminHours', label: 'عمل إداري متوسط', hint: 'بريد، اجتماعات، مهام روتينية' },
  { name: 'passiveMediaHours', label: 'مشاهدة سلبية', hint: 'فيديو، تصفح، وسائل التواصل' },
] as const;

export function ScreenForm({ date, initial }: { date: string; initial: { highFocusH: number; moderateAdminH: number; passiveMediaH: number } | null }) {
  const { form, onSubmit, pending, status, err } = useActionForm({
    schema: screenSchema,
    action: upsertScreenTime,
    defaultValues: { logDate: date, highFocusHours: initial?.highFocusH ?? 0, moderateAdminHours: initial?.moderateAdminH ?? 0, passiveMediaHours: initial?.passiveMediaH ?? 0 },
    successText: 'حُفظت ساعات الشاشة.',
  });
  const values = useWatch({ control: form.control, name: ['highFocusHours', 'moderateAdminHours', 'passiveMediaHours'] }) as unknown[];
  const total = values.reduce<number>((s, v) => s + (Number(v) || 0), 0);
  const focus = Number(values[0]) || 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" {...form.register('logDate')} />
      {SLIDERS.map((s, i) => (
        <div key={s.name} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={s.name} className="font-semibold">{s.label}</label>
            <Num value={Number(values[i]) || 0} digits={1} unit="ساعة" className="text-lg font-semibold" />
          </div>
          <input id={s.name} type="range" min={0} max={16} step={0.5} className="w-full accent-brand" {...form.register(s.name)} />
          <span className="text-sm text-ink-muted">{err(s.name) ?? s.hint}</span>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft px-4 py-3">
        <span className="text-sm font-semibold text-brand-ink">المجموع</span>
        <Num value={total} digits={1} unit="ساعة" className="font-semibold" />
        {total > 24 && <Badge tone="danger">يتجاوز 24 ساعة</Badge>}
        {focus > 5 && <Badge tone="warning">تركيز طويل: خطط لوجبة بروتينية قبل نهاية العمل</Badge>}
      </div>
      <p className="text-sm text-ink-muted">ساعات الشاشة لا تضيف سعرات للحرق. العمل الذهني يرفع الحرق بنحو 5 kcal/ساعة فقط، لكنه قد يزيد الشهية مساءً، ولذلك يُستخدم لتنبيهات سلوكية فقط.</p>
      <FormStatus status={status} />
      <Button id="save-screen" type="submit" disabled={pending} className="self-start">{pending ? 'جارٍ الحفظ…' : 'حفظ'}</Button>
    </form>
  );
}
