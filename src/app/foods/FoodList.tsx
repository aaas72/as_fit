'use client';

import { useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/Badge';
import { Num } from '@/components/Num';
import { Button, inputClass } from '@/components/ui';
import { BASIS_LABEL } from '@/lib/labels';
import { setFoodActive } from '@/server/actions/foods';
import type { FoodView } from '@/server/queries/logs';
import { FoodForm } from './FoodForm';

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
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-ink-muted">
            <tr>{['الصنف', 'الأساس', 'سعرات', 'بروتين', 'كربوهيدرات', 'دهون', ''].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              editing === f.id ? (
                <tr key={f.id} className="border-t border-line bg-canvas"><td colSpan={7} className="p-4"><FoodForm food={f} onDone={(ok) => { setEditing(null); setSaved(ok ? f.id : null); }} /></td></tr>
              ) : (
                <tr key={f.id} className={`border-t border-line ${f.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-2">
                    <span className="font-semibold">{f.nameAr}</span>
                    {f.nameEn && <span dir="ltr" className="block text-xs text-ink-muted">{f.nameEn}</span>}
                  </td>
                  <td className="px-4">{BASIS_LABEL[f.basis]}{f.gramsPerUnit != null && <span className="text-ink-muted"> (<bdi className="font-mono">{f.gramsPerUnit} غ</bdi>)</span>}</td>
                  <td className="px-4"><Num value={f.calories} /></td>
                  <td className="px-4"><Num value={f.protein} digits={1} /></td>
                  <td className="px-4">{f.carbs == null ? '—' : <Num value={f.carbs} digits={1} />}</td>
                  <td className="px-4">{f.fat == null ? '—' : <Num value={f.fat} digits={1} />}</td>
                  <td className="px-4">
                    <span className="flex items-center justify-end gap-1">
                      {saved === f.id && <Badge>حُفظ — الوجبات السابقة لا تتأثر</Badge>}
                      {!f.isActive && <Badge tone="warning">معطّل</Badge>}
                      <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setEditing(f.id)}>تعديل</Button>
                      <Button variant={f.isActive ? 'danger' : 'ghost'} className="px-2 py-1 text-sm" disabled={pending} onClick={() => start(async () => { await setFoodActive(f.id, !f.isActive); })}>
                        {f.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </span>
                  </td>
                </tr>
              )
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-muted">لا توجد نتائج.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
