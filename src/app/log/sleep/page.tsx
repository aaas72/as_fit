import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DateNav } from '@/components/DateNav';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { sleepTargets } from '@/domain/sleep';
import { addDaysIso, arabicDayLabel, localClockOf } from '@/lib/time';
import { deleteSleep } from '@/server/actions/sleep';
import { getSleepBetween } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { USER_ID } from '@/server/session';
import { SleepForm } from './SleepForm';
import { TBody, THead, Table, Td, Tr } from '@/components/Table';

export const metadata: Metadata = { title: 'النوم', description: 'تسجيل النوم وحساب الكفاءة والكمون ومدة النوم الفعلي.' };

export default async function SleepPage({ searchParams }: { searchParams: DateSearchParams }) {
  const { tz, today, date } = await resolveDate(searchParams);
  const nights = await getSleepBetween(USER_ID, addDaysIso(today, -13), today);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="النوم" description="اختر يوم الاستيقاظ ثم أدخل الأوقات فقط. الوقت المتأخر (مثل 23:00) يُنسب تلقائياً لمساء اليوم السابق." actions={<DateNav path="/log/sleep" date={date} today={today} />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>ليلة الاستيقاظ يوم {date === today ? 'اليوم' : arabicDayLabel(date)}</SectionTitle>
          <SleepForm key={date} wakeDate={date} />
        </Card>
        <Card>
          <SectionTitle>المعايير</SectionTitle>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex justify-between"><span>النوم الفعلي (TST)</span><bdi className="font-mono">7–9 س</bdi></li>
            <li className="flex justify-between"><span>كفاءة النوم (TST ÷ الوقت في الفراش)</span><bdi className="font-mono">≥ {sleepTargets.efficiencyPct}%</bdi></li>
            <li className="flex justify-between"><span>كمون النوم</span><bdi className="font-mono">≤ {sleepTargets.latencyMin} د</bdi></li>
            <li className="flex justify-between"><span>ثبات منتصف النوم</span><bdi className="font-mono">± 30 د</bdi></li>
          </ul>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>آخر 14 ليلة</SectionTitle>
        {nights.length === 0 && <EmptyState title="لا توجد ليالٍ مسجلة بعد" />}
        {nights.length > 0 && (
          <Table minWidth="640px">
            <THead columns={['الليلة', 'الفراش', 'الاستيقاظ', 'النوم الفعلي', 'الكفاءة', 'الكمون', 'الانتعاش', '']} />
            <TBody>
              {[...nights].reverse().map((n) => {
                const eff = n.tibMin > 0 ? (n.tstMin / n.tibMin) * 100 : 0;
                return (
                  <Tr key={n.id}>
                    <Td className="whitespace-nowrap">{arabicDayLabel(n.date)}</Td>
                    <Td num>{localClockOf(n.bedAt, tz)}</Td>
                    <Td num>{localClockOf(n.wakeAt, tz)}</Td>
                    <Td num className={n.tstMin < 360 ? 'font-semibold text-danger-ink' : 'font-semibold'}>{(n.tstMin / 60).toFixed(1)} <span className="text-xs text-ink-muted">س</span></Td>
                    <Td><Badge tone={eff >= sleepTargets.efficiencyPct ? 'brand' : 'warning'}><Num value={eff} unit="%" /></Badge></Td>
                    <Td num>{n.latencyMin} <span className="text-xs text-ink-muted">د</span></Td>
                    <Td num>{n.freshness} / 5</Td>
                    <Td className="text-end"><DeleteButton id={n.id} action={deleteSleep} /></Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}
