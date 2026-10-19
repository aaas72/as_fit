import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { BarsChart, CumulativeLossChart, EnergyChart, WeightChart } from '@/components/charts';
import { Num } from '@/components/Num';
import { EmptyState, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { CAFFEINE_DAILY_SAFE_MG } from '@/domain/constants';
import { cn } from '@/lib/cn';
import { addDaysIso } from '@/lib/time';
import { getSleepBetween } from '@/server/queries/logs';
import { resolveDate } from '@/server/queries/page';
import { loadModel, type Model } from '@/server/services/metabolic-model';
import { USER_ID } from '@/server/session';

export const metadata: Metadata = { title: 'الاتجاهات', description: 'الوزن، النزول المتوقع مقابل الفعلي، الحرق، النوم، والكافيين.' };

const RANGES = [30, 60, 90] as const;

function buildWeightSeries(model: Model) {
  const byDate = new Map(model.weighIns.map((w) => [w.date, w]));
  const weight = model.days.map((d) => {
    const w = byDate.get(d.date);
    const trendAtDay = model.weighIns.filter((x) => x.date <= d.date && x.trend != null).pop()?.trend ?? null;
    return { date: d.date, raw: w?.weight, compliant: w?.compliant, trend: trendAtDay };
  });

  // Expected loss uses formula TDEE and complete days only (A2, A3); actual = trend drop since the first trend value in range.
  const firstTrend = weight.find((w) => w.trend != null)?.trend ?? null;
  let cum = 0;
  const cumulative: { date: string; expected: number; actual: number | null }[] = [];
  model.days.forEach((d, i) => {
    if (d.intake.intakeComplete) cum += d.formulaDeficit / model.settings.kcalPerKg;
    const t = weight[i]!.trend;
    cumulative.push({ date: d.date, expected: cum, actual: firstTrend != null && t != null ? firstTrend - t : null });
  });
  return { weight, cumulative };
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { today } = await resolveDate();
  const requested = (await searchParams).range;
  const range = RANGES.find((r) => String(r) === requested) ?? 60;
  const start = addDaysIso(today, -(range - 1));
  const [model, sleeps] = await Promise.all([loadModel(USER_ID, start, today), getSleepBetween(USER_ID, start, today)]);
  if (!model) return <EmptyState title="أنشئ الملف الشخصي أولاً من الإعدادات" />;

  const { weight, cumulative } = buildWeightSeries(model);
  const energy = model.days.map((d) => ({ date: d.date, intake: d.intake.intakeComplete ? d.intake.totalKcal : null, formulaTdee: d.formulaTdee }));
  const sleepData = model.days.map((d) => ({ date: d.date, value: (() => { const s = sleeps.find((x) => x.date === d.date); return s ? s.tstMin / 60 : null; })() }));
  const caffeine = model.days.map((d) => ({ date: d.date, value: d.intake.caffeineMg || null }));

  const completeDays = model.days.filter((d) => d.intake.intakeComplete).length;
  const obs = model.observed;
  const tab = 'rounded-full border px-4 py-1.5 text-sm font-medium';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الاتجاهات"
        description="الوزن يُقرأ عبر خط الاتجاه لا القراءة المفردة. الحرق الفعلي يُحسب بالانحدار الخطي على القراءات الملتزمة بعد 14 يوماً."
        actions={<div className="flex gap-2">{RANGES.map((r) => <Link key={r} href={`/trends?range=${r}`} className={cn(tab, r === range ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line')}><bdi className="font-mono">{r}</bdi> يوماً</Link>)}</div>}
      />

      <Card className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="وزن خط الاتجاه"><Num value={model.currentWeightKg} digits={1} unit="كغ" /></Stat>
        <Stat label="الحرق الفعلي المرصود" hint={obs ? `من ${obs.days} يوماً، وزنه في الحساب ${Math.round(obs.beta * 100)}%` : 'يحتاج 14 يوماً من القراءات الملتزمة'}>
          {obs ? <Num value={obs.tdee} unit="سعرة" /> : <span className="text-ink-muted">—</span>}
        </Stat>
        <Stat label="معدل التغير الأسبوعي">{obs ? <Num value={obs.slopeKgPerDay * 7} digits={2} unit="كغ" /> : <span className="text-ink-muted">—</span>}</Stat>
        <Stat label="أيام مكتملة التسجيل"><Num value={completeDays} /> <span className="text-base text-ink-muted">/ <Num value={range} /></span></Stat>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card><SectionTitle>الوزن الخام مقابل خط الاتجاه</SectionTitle><WeightChart data={weight} /></Card>
        <Card><SectionTitle>النزول المتوقع مقابل الفعلي</SectionTitle><CumulativeLossChart data={cumulative} /></Card>
        <Card className="xl:col-span-2"><SectionTitle>المتناول مقابل الحرق</SectionTitle><EnergyChart data={energy} observed={obs?.tdee ?? null} /></Card>
        <Card><SectionTitle>النوم الفعلي</SectionTitle><BarsChart data={sleepData} name="النوم" unit="س" digits={1} target={7} targetLabel="7 ساعات" /></Card>
        <Card><SectionTitle>الكافيين اليومي</SectionTitle><BarsChart data={caffeine} name="الكافيين" unit="ملغ" target={CAFFEINE_DAILY_SAFE_MG} targetLabel="400 ملغ" targetTone="danger" /></Card>
      </div>
    </div>
  );
}
