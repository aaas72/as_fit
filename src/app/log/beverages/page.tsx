import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { BeverageCard } from '@/components/LogCards';
import { DateNav } from '@/components/DateNav';
import { Num } from '@/components/Num';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { SideColumn } from '@/components/SideColumn';
import { caffeineLevel, residualCaffeineMg } from '@/domain/caffeine-kinetics';
import { CAFFEINE_DAILY_SAFE_MG } from '@/domain/constants';
import { addDaysIso, localClockOf, nowClock } from '@/lib/time';
import { deleteBeverage } from '@/server/actions/beverages';
import { getBeveragesBetween, getDrinks } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { getProfileAndSettings } from '@/server/queries/profile';
import { USER_ID } from '@/server/session';
import { BeverageForm } from './BeverageForm';

export const metadata: Metadata = { title: 'المشروبات', description: 'تسجيل المشروبات والكافيين والحليب والسكر.' };

const LEVEL = { low: ['brand', 'ضئيل'], moderate: ['warning', 'متوسط'], high: ['danger', 'مرتفع'] } as const;

export default async function BeveragesPage({ searchParams }: { searchParams: DateSearchParams }) {
  const { tz, today, date } = await resolveDate(searchParams);
  const [ps, rows, drinks] = await Promise.all([getProfileAndSettings(USER_ID), getBeveragesBetween(USER_ID, addDaysIso(date, -1), date), getDrinks(USER_ID, { activeOnly: true })]);
  const settings = ps?.settings;
  const todays = rows.filter((b) => b.date === date);
  const caffeineToday = todays.reduce((s, b) => s + b.caffeineMg, 0);
  const kcalToday = todays.reduce((s, b) => s + b.kcal, 0);
  const residualNow = date === today ? residualCaffeineMg(rows.map((b) => ({ mg: b.caffeineMg, at: b.consumedAt })), new Date(), settings?.caffeineHalfLifeH ?? 5) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المشروبات" description="اختر من مشروباتك أنت. الكافيين والسعرات تُحسب من قيم المشروب في قائمتك، وسعرات الحليب والسكر آلياً." actions={<DateNav path="/log/beverages" date={date} today={today} />} />

      <Card className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Stat label="كافيين اليوم"><Num value={caffeineToday} unit="ملغ" /></Stat>
          <ProgressBar value={caffeineToday} max={CAFFEINE_DAILY_SAFE_MG} tone={caffeineToday > CAFFEINE_DAILY_SAFE_MG ? 'danger' : 'brand'} label="الكافيين مقابل الحد اليومي" />
          <span className="text-xs text-ink-muted">الحد اليومي الآمن للبالغين 400 ملغ (EFSA)</span>
        </div>
        <Stat label="الكافيين في الدم الآن" hint={`نصف العمر ${settings?.caffeineHalfLifeH ?? 5} ساعات`}>
          {residualNow == null ? <span className="text-ink-muted">—</span> : (
            <span className="flex items-center gap-2"><Num value={residualNow} unit="ملغ" /><Badge tone={LEVEL[caffeineLevel(residualNow)][0]}>{LEVEL[caffeineLevel(residualNow)][1]}</Badge></span>
          )}
        </Stat>
        <Stat label="سعرات المشروبات"><Num value={kcalToday} unit="سعرة" /></Stat>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>مشروب جديد</SectionTitle>
          <BeverageForm key={date} date={date} nowClock={nowClock(tz)} caffeineMgPerG={settings?.caffeineMgPerG ?? 11} drinks={drinks} />
        </Card>
        <SideColumn title={<SectionTitle aside={<Badge>{todays.length}</Badge>}>مشروبات اليوم</SectionTitle>}>
          {todays.length === 0 && <EmptyState title="لا توجد مشروبات مسجلة لهذا اليوم" />}
          {todays.map((b) => <BeverageCard key={b.id} drink={b} time={localClockOf(b.consumedAt, tz)} onDelete={deleteBeverage} />)}
        </SideColumn>
      </div>
    </div>
  );
}
