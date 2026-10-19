import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { InsightItem } from '@/components/InsightItem';
import { EmptyState, PageHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getInsights } from '@/server/queries/logs';
import { USER_ID } from '@/server/session';
import { DismissButton, RefreshButton } from './InsightButtons';

export const metadata: Metadata = { title: 'التنبيهات', description: 'تنبيهات تحليلية مبنية على بياناتك مع الأرقام التي أدت إليها.' };

const RULES: [string, string][] = [
  ['LUNCH_DRIFT', 'غداء متأخر أكثر من 90 دقيقة'],
  ['COGNITIVE_LOAD', 'أكثر من 5 ساعات تركيز عالٍ'],
  ['FALSE_PLATEAU', 'ثبات وزن مع مؤشرات احتباس سوائل'],
  ['TRUE_PLATEAU', 'ثبات 21+ يوماً دون مؤشرات ضوضاء'],
  ['BEDTIME_CAFFEINE', 'أكثر من 100 mg كافيين وقت النوم'],
  ['LATE_EATING', 'آخر وجبة قبل النوم بأقل من 3 ساعات'],
  ['PROTEIN_SHORT', 'بروتين أقل من 80% من الهدف في 3 من 5 أيام'],
  ['AGGRESSIVE_DEFICIT', 'نزول أسرع من 1% أسبوعياً لأسبوعين'],
];

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await connection();
  const all = (await searchParams).show === 'all';
  const items = await getInsights(USER_ID, { includeDismissed: all });
  const tab = 'rounded-full border px-4 py-1.5 text-sm font-medium';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="التنبيهات" description="كل تنبيه يعرض الأرقام التي أدت إليه. التنبيهات إرشادية وليست تشخيصاً طبياً." actions={<RefreshButton />} />
      <div className="flex gap-2">
        <Link href="/insights" className={cn(tab, !all ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}>النشطة</Link>
        <Link href="/insights?show=all" className={cn(tab, all ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}>الكل (مع المتجاهلة)</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {items.length === 0 && <EmptyState title="لا توجد تنبيهات">تظهر التنبيهات تلقائياً بعد تسجيل بيانات كافية (وجبات، نوم، وزن).</EmptyState>}
          {items.map((i) => (
            <div key={i.id} className={i.dismissedAt ? 'opacity-60' : ''}>
              <InsightItem insight={i} showPayload actions={!i.dismissedAt && <DismissButton id={i.id} />} />
            </div>
          ))}
        </div>
        <aside className="flex flex-col gap-2 self-start rounded-xl border border-line p-5">
          <h2 className="font-bold">القواعد المفعّلة</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {RULES.map(([code, text]) => (
              <li key={code} className="flex flex-col">
                <bdi dir="ltr" className="text-start font-mono text-xs text-brand-ink">{code}</bdi>
                <span className="text-ink-muted">{text}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
