import { driftTone } from '@/domain/meal-timing';
import { QUANTITY_UNIT } from '@/domain/nutrition';
import { MEAL_LABEL, MILK_LABEL } from '@/lib/labels';
import type { ActionResult } from '@/lib/validation/common';
import type { BeverageView, MealView } from '@/server/queries/views';
import { Badge } from './Badge';
import { Card } from './Card';
import { DeleteButton } from './forms/DeleteButton';
import { Icon } from './Icon';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const round = (n: number) => Math.round(n).toLocaleString('en-US');

function IconTile({ name }: { name: 'meal' | 'cup' }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Icon name={name} /></span>;
}

// Headline number with its unit: big value, small muted unit
function Figure({ value, unit, sub }: { value: string; unit: string; sub?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-end">
      <span className="whitespace-nowrap"><bdi className="font-mono text-2xl font-semibold tabular-nums">{value}</bdi> <span className="text-xs text-ink-muted">{unit}</span></span>
      {sub && <span className="whitespace-nowrap text-xs text-ink-muted">{sub}</span>}
    </div>
  );
}

// ───────── Meal ─────────
// Header: icon · name · time · timing badge | total kcal (+ protein) · delete. Body: item · quantity · kcal columns.
export function MealCard({ meal, onDelete }: { meal: MealView; onDelete: (id: number) => Promise<ActionResult> }) {
  const d = meal.driftMin;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <IconTile name="meal" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold">{MEAL_LABEL[meal.type]}</h3>
            <bdi className="font-mono text-sm text-ink-muted">{meal.actualTime}</bdi>
          </div>
          {d != null ? (
            <Badge tone={driftTone(d)} className="w-fit px-2 py-0.5 text-xs">
              {d === 0 ? 'في الموعد' : `${d > 0 ? 'تأخير' : 'تبكير'} ${Math.abs(d)} د`}
            </Badge>
          ) : (
            <span className="text-xs text-ink-muted">بلا موعد مجدول</span>
          )}
        </div>
        <Figure value={round(meal.kcal)} unit="سعرة" sub={<><bdi className="font-mono">{round(meal.protein)}</bdi> غ بروتين</>} />
        <DeleteButton id={meal.id} action={onDelete} />
      </div>

      <ul className="flex flex-col gap-2 border-t border-line/70 pt-3">
        {meal.items.map((it) => (
          <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-3 text-sm">
            <span className="truncate">{it.nameAr}</span>
            <span className="whitespace-nowrap text-xs text-ink-muted"><bdi className="font-mono">{qty(it.quantity)}</bdi> {QUANTITY_UNIT[it.basis]}</span>
            <bdi className="text-end font-mono tabular-nums">{round(it.kcal)}</bdi>
          </li>
        ))}
      </ul>
      {meal.notes && <p className="text-sm text-ink-muted">{meal.notes}</p>}
    </Card>
  );
}

// ───────── Beverage ─────────
// icon · name, then time · details on one muted line | caffeine mg (+ kcal) · delete
export function BeverageCard({ drink, time, onDelete }: { drink: BeverageView; time: string; onDelete: (id: number) => Promise<ActionResult> }) {
  const details: React.ReactNode[] = [<bdi key="t" className="font-mono">{time}</bdi>, <><bdi className="font-mono">{qty(drink.volumeMl)}</bdi> مل</>];
  if (drink.dryCoffeeG != null) details.push(<><bdi className="font-mono">{qty(drink.dryCoffeeG)}</bdi> غ بن</>);
  if (drink.milkType !== 'none') details.push(<>حليب {MILK_LABEL[drink.milkType]} <bdi className="font-mono">{qty(drink.milkMl)}</bdi> مل</>);
  if (drink.sugarTsp > 0) details.push(<>سكر <bdi className="font-mono">{qty(drink.sugarTsp)}</bdi> ملعقة</>);

  return (
    <Card className="flex items-center gap-3 p-4">
      <IconTile name="cup" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-bold">{drink.drinkName}</p>
        <p className="text-xs text-ink-muted">
          {details.map((d, i) => <span key={i}>{i > 0 && ' · '}<bdi>{d}</bdi></span>)}
        </p>
      </div>
      <Figure value={round(drink.caffeineMg)} unit="ملغ" sub={<><bdi className="font-mono">{round(drink.kcal)}</bdi> سعرة</>} />
      <DeleteButton id={drink.id} action={onDelete} />
    </Card>
  );
}
