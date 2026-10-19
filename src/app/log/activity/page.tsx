import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DateNav } from '@/components/DateNav';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { EmptyState, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { deleteExercise } from '@/server/actions/exercise';
import { getExerciseCatalog, getExercisesBetween } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { loadModel } from '@/server/services/metabolic-model';
import { USER_ID } from '@/server/session';
import { ExerciseForm } from './ExerciseForm';

export const metadata: Metadata = { title: 'التمارين', description: 'تسجيل التمارين وحساب الحرق الصافي بطريقة MET.' };

export default async function ActivityPage({ searchParams }: { searchParams: DateSearchParams }) {
  const { today, date } = await resolveDate(searchParams);
  const [catalog, logs, model] = await Promise.all([getExerciseCatalog(), getExercisesBetween(USER_ID, date, date), loadModel(USER_ID, date, date)]);
  const useNet = model?.settings.useNetMet ?? true;
  const totalMin = logs.reduce((s, l) => s + l.minutes, 0);
  const totalKcal = logs.reduce((s, l) => s + (useNet ? l.netKcal : l.grossKcal), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="التمارين" description="الحرق يُحسب من MET × الوزن × المدة، ويُضاف الحرق الصافي فقط إلى حرقك اليومي." actions={<DateNav path="/log/activity" date={date} today={today} />} />

      <Card className="grid gap-6 sm:grid-cols-3">
        <Stat label="مدة التمارين"><Num value={totalMin} unit="دقيقة" /></Stat>
        <Stat label={useNet ? 'الحرق الصافي المضاف' : 'الحرق الإجمالي المضاف'}><Num value={totalKcal} unit="kcal" /></Stat>
        <Stat label="الحرق اليومي (TDEE)">{model ? <Num value={model.days[0]!.tdee} unit="kcal" /> : '—'}</Stat>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>تمرين جديد</SectionTitle>
          <ExerciseForm
            key={date} date={date} useNetMet={useNet} weightKg={model?.days[0]?.weightKg ?? 80}
            catalog={catalog.map((c) => ({ id: c.id, nameAr: c.nameAr, defaultMet: Number(c.defaultMet) }))}
          />
        </Card>
        <section className="flex flex-col gap-3">
          <SectionTitle aside={logs.length > 0 && <Badge>تمارين نشطة</Badge>}>تمارين اليوم</SectionTitle>
          {logs.length === 0 && <EmptyState title="لا توجد تمارين مسجلة لهذا اليوم" />}
          {logs.map((l) => (
            <Card key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.nameAr}</p>
                <p className="text-sm text-ink-muted"><bdi className="font-mono">{l.minutes} د · MET {l.met} · {l.weightKg} كغ</bdi></p>
              </div>
              <div className="flex flex-col items-end text-sm">
                <Num value={l.netKcal} unit="kcal صافي" className="font-semibold" />
                <Num value={l.grossKcal} unit="kcal إجمالي" className="text-ink-muted" />
              </div>
              <DeleteButton id={l.id} action={deleteExercise} />
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
