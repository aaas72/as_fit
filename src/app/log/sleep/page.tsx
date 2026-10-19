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
            <li className="flex justify-between"><span>النوم الفعلي (TST)</span><bdi className="font-mono">7–9 h</bdi></li>
            <li className="flex justify-between"><span>كفاءة النوم (TST ÷ الوقت في الفراش)</span><bdi className="font-mono">≥ {sleepTargets.efficiencyPct}%</bdi></li>
            <li className="flex justify-between"><span>كمون النوم</span><bdi className="font-mono">≤ {sleepTargets.latencyMin} min</bdi></li>
            <li className="flex justify-between"><span>ثبات منتصف النوم</span><bdi className="font-mono">± 30 min</bdi></li>
          </ul>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>آخر 14 ليلة</SectionTitle>
        {nights.length === 0 && <EmptyState title="لا توجد ليالٍ مسجلة بعد" />}
        {nights.length > 0 && (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-ink-muted">
                <tr>
                  {['الليلة', 'الفراش', 'الاستيقاظ', 'النوم الفعلي', 'الكفاءة', 'الكمون', 'الانتعاش', ''].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...nights].reverse().map((n) => {
                  const eff = n.tibMin > 0 ? (n.tstMin / n.tibMin) * 100 : 0;
                  return (
                    <tr key={n.id} className="border-t border-line">
                      <td className="px-4 py-2">{arabicDayLabel(n.date)}</td>
                      <td className="px-4"><bdi className="font-mono">{localClockOf(n.bedAt, tz)}</bdi></td>
                      <td className="px-4"><bdi className="font-mono">{localClockOf(n.wakeAt, tz)}</bdi></td>
                      <td className="px-4"><Num value={n.tstMin / 60} digits={1} unit="س" className={n.tstMin < 360 ? 'text-danger-ink' : ''} /></td>
                      <td className="px-4"><Badge tone={eff >= sleepTargets.efficiencyPct ? 'brand' : 'warning'}><Num value={eff} unit="%" /></Badge></td>
                      <td className="px-4"><Num value={n.latencyMin} unit="د" /></td>
                      <td className="px-4"><Num value={n.freshness} /> / 5</td>
                      <td className="px-4"><DeleteButton id={n.id} action={deleteSleep} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
