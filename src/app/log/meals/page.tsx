import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DateNav } from '@/components/DateNav';
import { DayCompleteToggle } from '@/components/forms/DayCompleteToggle';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { driftTone } from '@/domain/meal-timing';
import { QUANTITY_UNIT } from '@/domain/nutrition';
import { MEAL_LABEL } from '@/lib/labels';
import { nowClock } from '@/lib/time';
import { deleteMeal } from '@/server/actions/meals';
import { getDayComplete, getFoods, getMealsBetween } from '@/server/queries/logs';
import { resolveDate, type DateSearchParams } from '@/server/queries/page';
import { loadModel } from '@/server/services/metabolic-model';
import { USER_ID } from '@/server/session';
import { MealForm } from './MealForm';

export const metadata: Metadata = { title: 'الوجبات', description: 'تسجيل الوجبات وتوقيتها مع حساب السعرات والبروتين.' };

export default async function MealsPage({ searchParams }: { searchParams: DateSearchParams }) {
  const { tz, today, date } = await resolveDate(searchParams);
  const [foods, meals, complete, model] = await Promise.all([
    getFoods({ activeOnly: true }), getMealsBetween(USER_ID, date, date), getDayComplete(USER_ID, date), loadModel(USER_ID, date, date),
  ]);
  const day = model?.days[0];
  const kcal = meals.reduce((s, m) => s + m.kcal, 0);
  const protein = meals.reduce((s, m) => s + m.protein, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الوجبات" description="سجّل كل وجبة بوقتها الفعلي. السعرات تُحفظ لحظة التسجيل ولا تتغير إذا عدّلت القاموس لاحقاً." actions={<DateNav path="/log/meals" date={date} today={today} />} />

      {day && (
        <Card className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-muted">السعرات من الطعام</span>
            <span className="text-2xl font-semibold"><Num value={kcal} /> <span className="text-base text-ink-muted">/ <Num value={day.targets.calories} unit="kcal" /></span></span>
            <ProgressBar value={kcal} max={day.targets.calories} tone={kcal > day.targets.calories ? 'danger' : 'brand'} label="السعرات مقابل الهدف" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-muted">البروتين</span>
            <span className="text-2xl font-semibold"><Num value={protein} /> <span className="text-base text-ink-muted">/ <Num value={day.targets.proteinG} unit="غ" /></span></span>
            <ProgressBar value={protein} max={day.targets.proteinG} label="البروتين مقابل الهدف" />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <DayCompleteToggle date={date} complete={complete} />
            <span className="text-xs text-ink-muted">الأيام المكتملة فقط تدخل حساب العجز والحرق الفعلي.</span>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>وجبة جديدة</SectionTitle>
          <MealForm key={date} date={date} nowClock={nowClock(tz)} foods={foods} schedule={model?.settings.mealSchedule ?? { breakfast: null, lunch: null, dinner: null }} />
        </Card>

        <section className="flex flex-col gap-4">
          <SectionTitle aside={<Badge>{meals.length} وجبات</Badge>}>وجبات اليوم</SectionTitle>
          {meals.length === 0 && <EmptyState title="لا توجد وجبات مسجلة لهذا اليوم">ابدأ بإضافة وجبة من النموذج.</EmptyState>}
          {meals.map((m) => (
            <Card key={m.id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">{MEAL_LABEL[m.type]}</h3>
                <bdi className="font-mono text-sm text-ink-muted">{m.actualTime}</bdi>
                {m.driftMin != null && (
                  <Badge tone={driftTone(m.driftMin)}>
                    {m.driftMin === 0 ? 'في الموعد' : m.driftMin > 0 ? 'تأخير' : 'تبكير'} <Num value={Math.abs(m.driftMin)} unit="د" />
                  </Badge>
                )}
                <span className="ms-auto"><DeleteButton id={m.id} action={deleteMeal} /></span>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {m.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span>{it.nameAr} <bdi className="font-mono text-ink-muted">{it.quantity} {QUANTITY_UNIT[it.basis]}</bdi></span>
                    <Num value={it.kcal} unit="kcal" />
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-line pt-2 text-sm font-semibold">
                <span>المجموع</span>
                <span className="flex gap-3"><Num value={m.kcal} unit="kcal" /><Num value={m.protein} unit="غ" /></span>
              </div>
              {m.notes && <p className="text-sm text-ink-muted">{m.notes}</p>}
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
