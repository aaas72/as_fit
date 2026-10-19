'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { Button, EmptyState } from '@/components/ui';
import { deleteDrink } from '@/server/actions/drinks';
import type { DrinkView } from '@/server/queries/logs';
import { DrinkForm } from './DrinkForm';

export function DrinkList({ drinks, caffeineMgPerG }: { drinks: DrinkView[]; caffeineMgPerG: number }) {
  const [editing, setEditing] = useState<number | null>(null);
  if (drinks.length === 0) return <EmptyState title="قائمتك فارغة">أضف مشروباتك من النموذج، وستظهر كأزرار سريعة في صفحة تسجيل المشروبات.</EmptyState>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {drinks.map((d) => (
        <li key={d.id} className="p-4">
          {editing === d.id ? (
            <DrinkForm drink={d} caffeineMgPerG={caffeineMgPerG} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">{d.nameAr}{d.byCoffeeWeight && <Badge className="text-xs">بن موزون</Badge>}</p>
                <p className="text-sm text-ink-muted">
                  <Num value={d.defaultVolumeMl} unit="مل" />
                  {d.byCoffeeWeight && d.defaultCoffeeG != null && <> · <Num value={d.defaultCoffeeG} unit="غ بن" /></>}
                  {' · '}لكل 100 مل: <Num value={d.caffeineMgPer100ml} unit="mg" /> · <Num value={d.kcalPer100ml} unit="kcal" />
                  {d.proteinGPer100ml > 0 && <> · <Num value={d.proteinGPer100ml} digits={1} unit="غ" /></>}
                </p>
              </div>
              <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setEditing(d.id)}>تعديل</Button>
              <DeleteButton id={d.id} action={deleteDrink} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
