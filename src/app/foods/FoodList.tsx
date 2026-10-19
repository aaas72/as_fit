'use client';

import { useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/Badge';
import { Button, inputClass } from '@/components/ui';
import { BASIS_LABEL } from '@/lib/labels';
import { setFoodActive } from '@/server/actions/foods';
import type { FoodView } from '@/server/queries/logs';
import { FoodForm } from './FoodForm';
import { TBody, THead, Table, Td, Tr } from '@/components/Table';

export function FoodList({ foods }: { foods: FoodView[] }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? foods.filter((f) => f.nameAr.includes(q) || f.nameEn?.toLowerCase().includes(q)) : foods;
  }, [foods, query]);

  return (
    <div className="flex flex-col gap-4">
      <input id="food-search" type="search" placeholder="ابحث بالاسم…" className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} />
      <Table minWidth="640px">
        <THead columns={['الصنف', 'الأساس', 'سعرات', 'بروتين', 'كربوهيدرات', 'دهون', '']} />
        <TBody>
          {shown.map((f) => (
            editing === f.id ? (
              <Tr key={f.id}><Td className="p-4" colSpan={7}><FoodForm food={f} onDone={(ok) => { setEditing(null); setSaved(ok ? f.id : null); }} /></Td></Tr>
            ) : (
              <Tr key={f.id} className={f.isActive ? '' : 'opacity-50'}>
                <Td>
                  <span className="font-semibold">{f.nameAr}</span>
                  {f.nameEn && <span dir="ltr" className="block text-xs text-ink-muted">{f.nameEn}</span>}
                </Td>
                <Td className="whitespace-nowrap">{BASIS_LABEL[f.basis]}{f.gramsPerUnit != null && <span className="text-ink-muted"> (<bdi className="font-mono">{f.gramsPerUnit} غ</bdi>)</span>}</Td>
                <Td num className="font-semibold">{f.calories}</Td>
                <Td num>{f.protein.toFixed(1)}</Td>
                <Td num>{f.carbs == null ? '—' : f.carbs.toFixed(1)}</Td>
                <Td num>{f.fat == null ? '—' : f.fat.toFixed(1)}</Td>
                <Td>
                  <span className="flex items-center justify-end gap-1">
                    {saved === f.id && <Badge>حُفظ — الوجبات السابقة لا تتأثر</Badge>}
                    {!f.isActive && <Badge tone="warning">معطّل</Badge>}
                    <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setEditing(f.id)}>تعديل</Button>
                    <Button variant={f.isActive ? 'danger' : 'ghost'} className="px-2 py-1 text-sm" disabled={pending} onClick={() => start(async () => { await setFoodActive(f.id, !f.isActive); })}>
                      {f.isActive ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </span>
                </Td>
              </Tr>
            )
          ))}
          {shown.length === 0 && <Tr><Td className="py-6 text-center text-ink-muted" colSpan={7}>لا توجد نتائج.</Td></Tr>}
        </TBody>
      </Table>
    </div>
  );
}
