import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { EmptyState, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { addDaysIso, arabicDayLabel, localClockOf, nowClock, zonedDateTime } from '@/lib/time';
import { deleteWeighIn } from '@/server/actions/weigh-in';
import { getMealsBetween } from '@/server/queries/logs';
import { resolveDate } from '@/server/queries/page';
import { getProfileAndSettings } from '@/server/queries/profile';
import { getWeighIns } from '@/server/queries/weight';
import { USER_ID } from '@/server/session';
import { WeighInWizard } from './WeighInWizard';

export const metadata: Metadata = { title: 'الوزن المعياري', description: 'قياس الوزن الصائم وفق بروتوكول ثابت.' };

export default async function WeighInPage() {
  const { tz, today } = await resolveDate();
  const ps = await getProfileAndSettings(USER_ID);
  const settings = ps?.settings;
  const [rows, meals] = await Promise.all([getWeighIns(USER_ID, settings?.emaAlpha ?? 0.1), getMealsBetween(USER_ID, addDaysIso(today, -1), today)]);

  const now = new Date();
  const lastMeal = meals.map((m) => zonedDateTime(m.date, m.actualTime, tz)).filter((d) => d <= now).sort((a, b) => b.getTime() - a.getTime())[0];
  const suggested = lastMeal ? localClockOf(lastMeal, tz) : '';
  const latest = [...rows].reverse().find((r) => r.trend != null);
  const target = ps?.profile.targetWeightKg;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الوزن المعياري" description="قراءة واحدة يومياً. القراءة غير الملتزمة تُحفظ لكنها لا تدخل خط الاتجاه ولا حساب الحرق الفعلي." />

      <Card className="grid gap-6 sm:grid-cols-3">
        <Stat label="وزن خط الاتجاه">{latest?.trend != null ? <Num value={latest.trend} digits={1} unit="كغ" /> : '—'}</Stat>
        <Stat label="الهدف">{target ? <Num value={target} digits={1} unit="كغ" /> : '—'}</Stat>
        <Stat label="المتبقي للهدف">{latest?.trend != null && target ? <Num value={latest.trend - target} digits={1} unit="كغ" /> : '—'}</Stat>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>قراءة جديدة</SectionTitle>
          <WeighInWizard date={today} nowClock={nowClock(tz)} suggestedLastMeal={suggested} requiredFastingH={settings?.requiredFastingHours ?? 14} />
        </Card>
        <section className="flex flex-col gap-3">
          <SectionTitle>السجل</SectionTitle>
          {rows.length === 0 && <EmptyState title="لا توجد قراءات بعد" />}
          {[...rows].reverse().slice(0, 20).map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.date === today ? 'اليوم' : arabicDayLabel(r.date)}</p>
                <p className="text-sm text-ink-muted">صيام <bdi className="font-mono">{r.fastingH.toFixed(1)}</bdi> س · {r.official ? 'رسمية' : 'يومية'}</p>
              </div>
              <div className="flex flex-col items-end">
                <Num value={r.weight} digits={2} unit="كغ" className="font-semibold" />
                {r.trend != null && <span className="text-xs text-ink-muted">الاتجاه <Num value={r.trend} digits={2} /></span>}
              </div>
              <Badge tone={r.compliant ? 'brand' : 'danger'}>{r.compliant ? 'ملتزمة' : 'غير ملتزمة'}</Badge>
              {(r.highSodium || !r.normalDigestion) && <Badge tone="warning">{r.highSodium ? 'صوديوم' : 'هضم'}</Badge>}
              <DeleteButton id={r.id} action={deleteWeighIn} />
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
