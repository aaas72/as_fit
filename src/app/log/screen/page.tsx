import type { Metadata } from 'next';
import { Card } from '@/components/Card';
import { DateNav } from '@/components/DateNav';
import { PageHeader, SectionTitle } from '@/components/ui';
import { addDaysIso, arabicDayLabel } from '@/lib/time';
import { getScreenBetween } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { USER_ID } from '@/server/session';
import { ScreenForm } from './ScreenForm';
import { TBody, THead, Table, Td, Tr } from '@/components/Table';

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
            <Table>
              <THead columns={['اليوم', 'تركيز', 'إداري', 'سلبي', 'المجموع']} />
              <TBody>
                {[...rows].reverse().map((r) => (
                  <Tr key={r.date}>
                    <Td className="whitespace-nowrap">{arabicDayLabel(r.date)}</Td>
                    <Td num className={r.highFocusH > 5 ? 'font-semibold text-warning-ink' : ''}>{r.highFocusH.toFixed(1)}</Td>
                    <Td num>{r.moderateAdminH.toFixed(1)}</Td>
                    <Td num>{r.passiveMediaH.toFixed(1)}</Td>
                    <Td num className="font-semibold">{r.totalH.toFixed(1)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
