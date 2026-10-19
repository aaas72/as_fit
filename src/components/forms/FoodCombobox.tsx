'use client';

import { useId, useMemo, useState } from 'react';
import { BASIS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { inputClass } from '../ui';

export type FoodOption = { id: number; nameAr: string; nameEn: string | null; basis: keyof typeof BASIS_LABEL; calories: number; protein: number };

// Searchable food picker (Arabic or English name). Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
export function FoodCombobox({ id, foods, value, onChange, invalid }: {
  id: string; foods: FoodOption[]; value: number | undefined; onChange: (id: number) => void; invalid?: boolean;
}) {
  const listId = useId();
  const selected = foods.find((f) => f.id === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? foods.filter((f) => f.nameAr.includes(q) || f.nameEn?.toLowerCase().includes(q)) : foods).slice(0, 30);
  }, [foods, query]);

  const pick = (f: FoodOption) => { onChange(f.id); setQuery(''); setOpen(false); };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid}
        autoComplete="off"
        className={inputClass}
        placeholder="ابحث في القاموس…"
        value={open ? query : (selected?.nameAr ?? '')}
        onFocus={() => { setOpen(true); setActive(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); pick(results[active]); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-sm">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">لا يوجد صنف بهذا الاسم. أضفه من قاموس الأغذية.</li>}
          {results.map((f, i) => (
            <li
              key={f.id}
              role="option"
              aria-selected={f.id === value}
              onMouseDown={(e) => { e.preventDefault(); pick(f); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm', i === active && 'bg-brand-soft')}
            >
              <span>{f.nameAr}</span>
              <bdi className="font-mono text-xs text-ink-muted">{f.calories} kcal · {BASIS_LABEL[f.basis]}</bdi>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
