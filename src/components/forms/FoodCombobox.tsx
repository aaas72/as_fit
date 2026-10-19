'use client';

import { useId, useMemo, useState } from 'react';
import { BASIS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { inputClass } from '../ui';

export type FoodOption = { id: number; nameAr: string; nameEn: string | null; basis: keyof typeof BASIS_LABEL; calories: number; protein: number };

// Searchable food picker. Picking clears the field (it is an "add" field, not a selected value).
// Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
export function FoodCombobox({ id, foods, onPick, onCreate, placeholder = 'ابحث عن صنف لإضافته…' }: {
  id: string; foods: FoodOption[]; onPick: (food: FoodOption) => void; onCreate?: (name: string) => void; placeholder?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? foods.filter((f) => f.nameAr.toLowerCase().includes(q) || f.nameEn?.toLowerCase().includes(q)) : foods).slice(0, 30);
  }, [foods, query]);

  const pick = (f: FoodOption) => { onPick(f); setQuery(''); setOpen(false); };
  const create = () => { onCreate?.(query.trim()); setQuery(''); setOpen(false); };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        className={cn(inputClass, 'py-3')}
        placeholder={placeholder}
        value={query}
        onFocus={() => { setOpen(true); setActive(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && results[active]) pick(results[active]);
            else if (onCreate && query.trim()) create();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (results.length > 0 || (onCreate && query.trim())) && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-sm">
          {results.map((f, i) => (
            <li
              key={f.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(f); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm', i === active && 'bg-brand-soft')}
            >
              <span>{f.nameAr}</span>
              <bdi className="font-mono text-xs text-ink-muted">{f.calories} kcal · {BASIS_LABEL[f.basis]}</bdi>
            </li>
          ))}
          {onCreate && query.trim() && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); create(); }}
              className="cursor-pointer border-t border-line px-3 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-soft"
            >
              + أضف «{query.trim()}» إلى القاموس
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
