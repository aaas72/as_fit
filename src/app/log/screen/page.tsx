import type { Metadata } from 'next';
import { Card } from '@/components/Card';
import { DateNav } from '@/components/DateNav';
import { Num } from '@/components/Num';
import { PageHeader, SectionTitle } from '@/components/ui';
import { addDaysIso, arabicDayLabel } from '@/lib/time';
import { getScreenBetween } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { USER_ID } from '@/server/session';
import { ScreenForm } from './ScreenForm';

export const metadata: Metadata = { title: 'الشاشات', description: 'ساعات الشاشة والحمل الذهني اليومي.' };

export default async function ScreenPage({ searchParams }: { searchParams: DateSearchParams }) {
  const { today, date } = await resolveDate(searchParams);
  const rows = await getScreenBetween(USER_ID, addDaysIso(date, -6), date);
  const current = rows.find((r) => r.date === date) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الشاشات والحمل الذهني" description="سجل واحد لكل يوم. الحفظ مرة أخرى يحدّث سجل اليوم نفسه." actions={<DateNav path="/log/screen" date={date} today={today} />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>ساعات اليوم</SectionTitle>
          <ScreenForm key={date} date={date} initial={current} />
        </Card>
        <Card>
          <SectionTitle>آخر 7 أيام</SectionTitle>
          {rows.length === 0 ? <p className="text-sm text-ink-muted">لا توجد سجلات بعد.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-ink-muted"><th className="py-2 text-start font-medium">اليوم</th><th className="text-start font-medium">تركيز</th><th className="text-start font-medium">إداري</th><th className="text-start font-medium">سلبي</th><th className="text-start font-medium">المجموع</th></tr></thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.date} className="border-t border-line">
                      <td className="py-2">{arabicDayLabel(r.date)}</td>
                      <td className={r.highFocusH > 5 ? 'font-semibold text-warning-ink' : ''}><Num value={r.highFocusH} digits={1} /></td>
                      <td><Num value={r.moderateAdminH} digits={1} /></td>
                      <td><Num value={r.passiveMediaH} digits={1} /></td>
                      <td className="font-semibold"><Num value={r.totalH} digits={1} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
