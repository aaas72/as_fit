import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DayCompleteToggle } from '@/components/forms/DayCompleteToggle';
import { Icon } from '@/components/Icon';
import { InsightItem } from '@/components/InsightItem';
import { Num } from '@/components/Num';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { ButtonLink, EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { caffeineLevel } from '@/domain/caffeine-kinetics';
import { arabicDayLabel, localClockOf } from '@/lib/time';
import { resolveDate } from '@/server/queries/page';
import { getDailySummary } from '@/server/services/daily-summary';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

const CAFFEINE = { low: ['brand', 'ضئيل'], moderate: ['warning', 'متوسط'], high: ['danger', 'مرتفع'] } as const;

export default async function DashboardPage() {
  let summary;
  try {
    const { today } = await resolveDate();
    await runInsights(USER_ID, today);
    summary = await getDailySummary(USER_ID, today);
  } catch (err) {
    return (
      <Card className="border-danger bg-danger-soft">
        <h1 className="text-lg font-bold text-danger-ink">تعذّر الاتصال بقاعدة البيانات</h1>
        <p className="mt-2 text-sm text-danger-ink">شغّل <code className="font-mono">pnpm db:up</code> ثم <code className="font-mono">pnpm db:migrate</code>.</p>
        <p dir="ltr" className="mt-2 font-mono text-xs text-ink-muted">{err instanceof Error ? err.message : String(err)}</p>
      </Card>
    );
  }
  if (!summary) {
    return <EmptyState title="لا يوجد ملف شخصي بعد"><ButtonLink href="/settings" className="mt-3">إنشاء الملف الشخصي</ButtonLink></EmptyState>;
  }

  const { day, settings, profile, timezone } = summary;
  const consumed = day.intake.totalKcal;
  const target = day.targets.calories;
  const remaining = target - consumed;
  const protein = day.intake.totalProteinG;
  const fastingTarget = settings.requiredFastingHours;
  const exerciseKcal = summary.exercisesToday.reduce((s, e) => s + (settings.useNetMet ? e.netKcal : e.grossKcal), 0);
  const level = caffeineLevel(summary.caffeineNowMg);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`مرحباً ${profile.displayName}`}
        description={`${arabicDayLabel(summary.date)} — ملخص يومك محسوب من بياناتك المسجلة.`}
        actions={<DayCompleteToggle date={summary.date} complete={summary.intakeComplete} />}
      />

      <div className="flex flex-wrap gap-2" aria-label="حالة اليوم">
        {summary.exercisesToday.length > 0 && <Badge>تمارين نشطة · <Num value={exerciseKcal} unit="سعرة" /></Badge>}
        {summary.intakeComplete && day.deficit > 0 && <Badge>عجز محقق <Num value={-day.deficit} /></Badge>}
        {summary.intakeComplete && day.deficit <= 0 && <Badge tone="danger">فائض <Num value={-day.deficit} /></Badge>}
        {!summary.intakeComplete && <Badge tone="warning">التسجيل غير مكتمل — العجز تقديري</Badge>}
        {summary.fastingH != null && (summary.fastingH >= fastingTarget
          ? <Badge>صيام مكتمل <Num value={fastingTarget} unit="س" /></Badge>
          : <Badge tone="warning">صيام <Num value={summary.fastingH} digits={1} unit="س" /></Badge>)}
        {protein >= day.targets.proteinG && <Badge>بروتين مكتمل</Badge>}
        {day.targets.deficitCapped && <Badge tone="warning">العجز قُيّد بحد 1% أسبوعياً</Badge>}
        {day.targets.floorApplied && <Badge tone="warning">الهدف عند الحد الأدنى الآمن</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-4 lg:row-span-2">
          <SectionTitle>سعرات اليوم</SectionTitle>
          <ProgressRing value={consumed} max={target} tone={consumed > target ? 'danger' : 'brand'} label={`المستهلك ${Math.round(consumed)} من ${Math.round(target)} سعرة`} size={196}>
            <span className="flex flex-col">
              <Num value={consumed} className="text-3xl font-semibold" />
              <span className="text-sm text-ink-muted">من <Num value={target} /> سعرة</span>
            </span>
          </ProgressRing>
          <p className="text-sm font-medium">{remaining >= 0 ? <>متبقٍ <Num value={remaining} unit="سعرة" /></> : <span className="text-danger-ink">تجاوز الهدف بـ <Num value={-remaining} unit="سعرة" /></span>}</p>
          <dl className="grid w-full grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <dt className="text-ink-muted">الحرق اليومي</dt><dd className="text-end"><Num value={day.tdee} unit="سعرة" /></dd>
            <dt className="text-ink-muted">BMR</dt><dd className="text-end"><Num value={day.bmr} unit="سعرة" /></dd>
            <dt className="text-ink-muted">التمارين</dt><dd className="text-end"><Num value={day.exerciseKcal} unit="سعرة" /></dd>
            <dt className="text-ink-muted">العجز المستهدف</dt><dd className="text-end"><Num value={day.targets.deficitApplied} unit="سعرة" /></dd>
          </dl>
          {summary.observed && (
            <p className="text-center text-xs text-ink-muted">الحرق يمزج المعادلة مع الحرق المرصود <Num value={summary.observed.tdee} /> سعرة بنسبة <Num value={summary.observed.beta * 100} unit="%" /></p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionTitle>البروتين والصيام</SectionTitle>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span>البروتين</span><span><Num value={protein} /> / <Num value={day.targets.proteinG} unit="غ" /></span></div>
            <ProgressBar value={protein} max={day.targets.proteinG} label="البروتين" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span>الصيام منذ آخر وجبة{summary.lastMealAt && <> (<bdi className="font-mono">{localClockOf(summary.lastMealAt, timezone)}</bdi>)</>}</span>
              <span>{summary.fastingH == null ? '—' : <><Num value={summary.fastingH} digits={1} /> / <Num value={fastingTarget} unit="س" /></>}</span>
            </div>
            <ProgressBar value={summary.fastingH ?? 0} max={fastingTarget} tone={(summary.fastingH ?? 0) >= fastingTarget ? 'brand' : 'warning'} label="ساعات الصيام" />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>الكافيين في الدم</SectionTitle>
          <span className="flex items-center gap-2 text-3xl font-semibold"><Num value={summary.caffeineNowMg} unit="ملغ" /><Badge tone={CAFFEINE[level][0]}>{CAFFEINE[level][1]}</Badge></span>
          <span className="text-sm text-ink-muted">مجموع اليوم <Num value={summary.caffeineTodayMg} unit="ملغ" /> من 400 · نصف العمر <Num value={settings.caffeineHalfLifeH} unit="س" /></span>
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle aside={<Link href="/weigh-in" className="text-sm font-medium text-brand-ink">قياس جديد</Link>}>الوزن</SectionTitle>
          {summary.lastWeighIn ? (
            <>
              <span className="text-3xl font-semibold"><Num value={summary.currentWeightKg} digits={1} unit="كغ" /></span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                آخر قراءة <Num value={summary.lastWeighIn.weight} digits={1} /> ({arabicDayLabel(summary.lastWeighIn.date)})
                {!summary.lastWeighIn.compliant && <Badge tone="danger">غير ملتزمة</Badge>}
                {summary.trendDeltaKg != null && <Badge tone={summary.trendDeltaKg <= 0 ? 'brand' : 'warning'}>الاتجاه <Num value={summary.trendDeltaKg} digits={2} /></Badge>}
              </span>
              <span className="text-sm text-ink-muted">الهدف <Num value={profile.targetWeightKg} digits={1} unit="كغ" /></span>
            </>
          ) : (
            <p className="text-sm text-ink-muted">لا توجد قراءات بعد. الحسابات تستخدم الوزن الأولي <Num value={profile.initialWeightKg} digits={1} /> كغ.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>تسجيل سريع</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {([['/log/meals', 'meal', 'وجبة'], ['/log/beverages', 'cup', 'مشروب'], ['/log/activity', 'run', 'تمرين'], ['/log/sleep', 'moon', 'نوم']] as const).map(([href, icon, label]) => (
              <ButtonLink key={href} href={href} variant="secondary" className="justify-start"><Icon name={icon} />{label}</ButtonLink>
            ))}
          </div>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle aside={<Link href="/insights" className="text-sm font-medium text-brand-ink">كل التنبيهات</Link>}>أحدث التنبيهات</SectionTitle>
        {summary.latestInsights.length === 0
          ? <EmptyState title="لا توجد تنبيهات نشطة">تظهر التنبيهات تلقائياً عند رصد نمط في بياناتك.</EmptyState>
          : <div className="grid gap-4 lg:grid-cols-3">{summary.latestInsights.map((i) => <InsightItem key={i.id} insight={i} />)}</div>}
      </section>
    </div>
  );
}
