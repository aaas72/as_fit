'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { stepValue } from '@/lib/inputs';
import { Icon } from '../Icon';
import { inputClass } from '../ui';
import { panelClass, usePopover } from './usePopover';

// ───────────────────────── Number stepper ─────────────────────────
// − value + in one bordered control. Typing still works; buttons step, round and clamp.
export function NumberStepper({ id, value, onChange, onBlur, step = 1, min, max, unit, invalid }: {
  id: string; value: unknown; onChange: (v: string) => void; onBlur?: () => void;
  step?: number; min?: number; max?: number; unit?: string; invalid?: boolean;
}) {
  const btn = 'grid w-10 shrink-0 place-items-center text-ink-muted transition-colors duration-150 hover:bg-brand hover:text-white disabled:pointer-events-none disabled:opacity-30';
  const n = Number(value);
  return (
    <div className={cn('flex h-10 items-stretch overflow-hidden rounded-lg border', invalid ? 'border-danger' : 'border-line transition-colors duration-150 hover:border-brand focus-within:border-brand')}>
      <button type="button" aria-label="إنقاص" className={cn(btn, 'border-e border-line')} disabled={min != null && n <= min}
        onClick={() => onChange(stepValue(value, -step, { step, min, max }))}><Icon name="minus" className="size-4" /></button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">
        <input
          id={id} dir="ltr" inputMode="decimal" autoComplete="off" aria-invalid={invalid}
          className="w-full min-w-12 bg-transparent text-center font-mono text-ink outline-none placeholder:font-sans placeholder:text-ink-muted"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        />
        {unit && <span className="shrink-0 text-xs text-ink-muted">{unit}</span>}
      </div>
      <button type="button" aria-label="زيادة" className={cn(btn, 'border-s border-line')} disabled={max != null && n >= max}
        onClick={() => onChange(stepValue(value, step, { step, min, max }))}><Icon name="plus" className="size-4" /></button>
    </div>
  );
}

// ───────────────────────── Segmented choice ─────────────────────────
export type Option<V extends string | number = string> = { value: V; label: string; hint?: string };

export function Segmented<V extends string | number>({ id, options, value, onChange, label }: {
  id: string; options: Option<V>[]; value: V | undefined; onChange: (v: V) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full rounded-lg border border-line p-1">
      {options.map((o) => {
        const selected = String(o.value) === String(value);
        return (
          <button
            key={String(o.value)} id={`${id}-${o.value}`} type="button" role="radio" aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-colors duration-150',
              selected ? 'bg-brand-strong text-white' : 'text-ink hover:bg-brand-soft')}
          >
            <span className={cn('whitespace-nowrap text-sm font-semibold', /^[\d.]+$/.test(o.label) && 'font-mono')}>{o.label}</span>
            {o.hint && <span className={cn('text-[11px]', selected ? 'text-white/80' : 'text-ink-muted')}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────── Check choice ─────────────────────────
// Single choice drawn as checkboxes: a square box with a check mark next to each option.
export function CheckChoice<V extends string | number>({ id, options, value, onChange, label }: {
  id: string; options: Option<V>[]; value: V | undefined; onChange: (v: V) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-10 flex-wrap items-center gap-6">
      {options.map((o) => {
        const checked = String(o.value) === String(value);
        return (
          <button
            key={String(o.value)} id={`${id}-${o.value}`} type="button" role="radio" aria-checked={checked}
            onClick={() => onChange(o.value)}
            className="group inline-flex items-center gap-2 text-sm font-medium"
          >
            <span className={cn('grid size-5 place-items-center rounded-md border-2 transition-colors duration-150',
              checked ? 'border-brand bg-brand text-white' : 'border-line group-hover:border-brand')}>
              {checked && <Icon name="check" className="size-3.5" />}
            </span>
            <span className={checked ? 'text-ink' : 'text-ink-muted'}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────── Select ─────────────────────────
// Listbox in the app's style. Keyboard: ↑ ↓ move, Enter picks, Esc closes.
export function Select<V extends string | number>({ id, options, value, onChange, onBlur, invalid, placeholder = 'اختر…' }: {
  id: string; options: Option<V>[]; value: V | undefined | string; onChange: (v: V) => void; onBlur?: () => void; invalid?: boolean; placeholder?: string;
}) {
  const listId = useId();
  const { open, setOpen, ref } = usePopover();
  const index = options.findIndex((o) => String(o.value) === String(value));
  const [active, setActive] = useState(Math.max(0, index));
  const selected = options[index];
  const pick = (o: Option<V>) => { onChange(o.value); setOpen(false); onBlur?.(); };

  return (
    <div ref={ref} className="relative">
      <button
        id={id} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-invalid={invalid}
        className={cn(inputClass, 'flex items-center justify-between gap-2 text-start')}
        onClick={() => { setActive(Math.max(0, index)); setOpen(!open); }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && options[active]) { e.preventDefault(); pick(options[active]); }
        }}
      >
        <span className={cn('truncate', !selected && 'text-ink-muted')}>{selected?.label ?? placeholder}</span>
        <Icon name="chevron" className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul id={listId} role="listbox" className={cn(panelClass, 'inset-x-0 max-h-72 overflow-y-auto p-1')}>
          {options.map((o, i) => {
            const isSel = String(o.value) === String(value);
            return (
              <li
                key={String(o.value)} role="option" aria-selected={isSel}
                onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setActive(i)}
                className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm', i === active && 'bg-brand-soft')}
              >
                <span className="flex flex-col">
                  <span className={cn(isSel && 'font-semibold text-brand-ink')}>{o.label}</span>
                  {o.hint && <span className="text-xs text-ink-muted">{o.hint}</span>}
                </span>
                {isSel && <Icon name="check" className="size-4 shrink-0 text-brand-ink" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
