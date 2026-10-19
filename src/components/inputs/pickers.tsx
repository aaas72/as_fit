'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { AR_MONTHS, AR_WEEKDAYS_SHORT, formatDate, monthGrid, parseDate, parseTime } from '@/lib/inputs';
import { Icon } from '../Icon';
import { inputClass } from '../ui';
import { panelClass, usePopover } from './usePopover';

const pad = (n: number) => String(n).padStart(2, '0');
const cell = 'grid h-9 place-items-center rounded-lg font-mono text-sm transition-colors duration-150';
const iconBtn = 'absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-brand-soft hover:text-brand-ink';

type FieldProps = { id: string; value: string | undefined; onChange: (v: string) => void; onBlur?: () => void; invalid?: boolean };

// ───────────────────────── Time ─────────────────────────
// Type "1400" / "14:00", or pick from the hour and minute grids.
export function TimeField({ id, value, onChange, onBlur, invalid, clearable = false, placeholder = '--:--' }: FieldProps & { clearable?: boolean; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const { open, setOpen, ref } = usePopover();
  const current = value ?? '';
  const [h, m] = /^\d{2}:\d{2}$/.test(current) ? current.split(':') : [null, null];

  const commit = (text: string) => {
    setDraft(null);
    if (text.trim() === '') return onChange('');
    onChange(parseTime(text) ?? text); // invalid text stays so validation can flag it
  };
  const setPart = (hh: string, mm: string) => onChange(`${hh}:${mm}`);
  const now = () => { const d = new Date(); onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <input
        id={id} dir="ltr" inputMode="numeric" autoComplete="off" placeholder={placeholder} aria-invalid={invalid}
        className={cn(inputClass, 'pe-10 text-end font-mono')}
        value={draft ?? current}
        onChange={(e) => {
          setDraft(e.target.value);
          if (/^\d{2}:\d{2}$/.test(e.target.value) && parseTime(e.target.value)) onChange(e.target.value);
        }}
        onBlur={(e) => { commit(e.target.value); onBlur?.(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); } }}
      />
      <button type="button" className={iconBtn} aria-label="اختيار الوقت" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="clock" className="size-4" />
      </button>
      {open && (
        <div className={cn(panelClass, 'w-72')} role="dialog" aria-label="اختيار الوقت">
          <p className="mb-2 text-xs font-semibold text-ink-muted">الساعة</p>
          <div className="grid grid-cols-6 gap-1" dir="ltr">
            {Array.from({ length: 24 }, (_, i) => pad(i)).map((hh) => (
              <button key={hh} type="button" onClick={() => setPart(hh, m ?? '00')}
                className={cn(cell, hh === h ? 'bg-brand-strong text-white' : 'hover:bg-brand-soft')}>{hh}</button>
            ))}
          </div>
          <p className="mt-3 mb-2 text-xs font-semibold text-ink-muted">الدقيقة</p>
          <div className="grid grid-cols-6 gap-1" dir="ltr">
            {Array.from({ length: 12 }, (_, i) => pad(i * 5)).map((mm) => (
              <button key={mm} type="button" onClick={() => { setPart(h ?? '12', mm); setOpen(false); }}
                className={cn(cell, mm === m ? 'bg-brand-strong text-white' : 'hover:bg-brand-soft')}>{mm}</button>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm">
            <button type="button" className="font-semibold text-brand-ink" onClick={now}>الآن</button>
            {clearable && <button type="button" className="text-ink-muted hover:text-ink" onClick={() => { onChange(''); setOpen(false); }}>بلا موعد</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Calendar ─────────────────────────
// Monday-first month grid with Arabic month names and a 12-year view. Shared by DateField and DateNav.
export function CalendarPanel({ value, onSelect, min, max, today = new Date().toISOString().slice(0, 10) }: {
  value: string; onSelect: (iso: string) => void; min?: string; max?: string; today?: string;
}) {
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : max ?? today;
  const [view, setView] = useState({ y: Number(anchor.slice(0, 4)), m: Number(anchor.slice(5, 7)) - 1 });
  const [mode, setMode] = useState<'days' | 'years'>('days');
  const disabled = (iso: string) => (min != null && iso < min) || (max != null && iso > max);
  const shift = (delta: number) => setView((v) => {
    const d = new Date(Date.UTC(v.y, v.m + delta, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });
  const yearStart = view.y - (view.y % 12);
  const navBtn = 'grid size-8 place-items-center rounded-md text-ink-muted hover:bg-brand-soft hover:text-brand-ink';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="السابق" className={navBtn} onClick={() => (mode === 'days' ? shift(-1) : setView((v) => ({ ...v, y: v.y - 12 })))}>
          <Icon name="chevron" className="size-4 -rotate-90" />
        </button>
        <button type="button" className="rounded-md px-2 py-1 font-semibold hover:bg-brand-soft" onClick={() => setMode(mode === 'days' ? 'years' : 'days')}>
          {mode === 'days' ? <>{AR_MONTHS[view.m]} <bdi className="font-mono">{view.y}</bdi></> : <bdi className="font-mono">{yearStart}–{yearStart + 11}</bdi>}
        </button>
        <button type="button" aria-label="التالي" className={navBtn} onClick={() => (mode === 'days' ? shift(1) : setView((v) => ({ ...v, y: v.y + 12 })))}>
          <Icon name="chevron" className="size-4 rotate-90" />
        </button>
      </div>

      {mode === 'days' ? (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">{AR_WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(view.y, view.m).map((c) => {
              const selected = c.iso === value;
              const off = disabled(c.iso);
              return (
                <button
                  key={c.iso} type="button" disabled={off} aria-pressed={selected} aria-label={c.iso}
                  onClick={() => onSelect(c.iso)}
                  className={cn(cell, !c.inMonth && 'text-ink-muted/50', off && 'cursor-not-allowed opacity-30',
                    selected ? 'bg-brand-strong text-white' : !off && 'hover:bg-brand-soft', c.iso === today && !selected && 'font-bold text-brand-ink ring-1 ring-brand/40')}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-1" dir="ltr">
          {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => (
            <button key={y} type="button" onClick={() => { setView((v) => ({ ...v, y })); setMode('days'); }}
              className={cn(cell, y === view.y ? 'bg-brand-strong text-white' : 'hover:bg-brand-soft')}>{y}</button>
          ))}
        </div>
      )}
      {!disabled(today) && (
        <div className="border-t border-line pt-2 text-sm">
          <button type="button" className="font-semibold text-brand-ink" onClick={() => onSelect(today)}>اليوم</button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Date ─────────────────────────
// Type "19/10/2026", or pick from the calendar.
export function DateField({ id, value, onChange, onBlur, invalid, min, max }: FieldProps & { min?: string; max?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const { open, setOpen, ref } = usePopover();
  const current = value ?? '';

  const commit = (text: string) => {
    setDraft(null);
    if (text.trim() === '') return onChange('');
    onChange(parseDate(text) ?? text);
  };

  return (
    <div ref={ref} className="relative">
      <input
        id={id} dir="ltr" inputMode="numeric" autoComplete="off" placeholder="يوم/شهر/سنة" aria-invalid={invalid}
        className={cn(inputClass, 'pe-10 text-end font-mono')}
        value={draft ?? formatDate(current) ?? current}
        onChange={(e) => {
          setDraft(e.target.value);
          const p = parseDate(e.target.value);
          if (p && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(p);
        }}
        onBlur={(e) => { commit(e.target.value); onBlur?.(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); } }}
      />
      <button type="button" className={iconBtn} aria-label="اختيار التاريخ" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="calendar" className="size-4" />
      </button>
      {open && (
        <div className={cn(panelClass, 'w-72')} role="dialog" aria-label="اختيار التاريخ">
          <CalendarPanel value={current} min={min} max={max} onSelect={(iso) => { onChange(iso); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Date + time ─────────────────────────
// Value: 'YYYY-MM-DDTHH:mm'. Inner fields get ids `${id}-date` and `${id}-time`.
export function DateTimeField({ id, value, onChange, onBlur, invalid, max }: FieldProps & { max?: string }) {
  const v = value ?? '';
  const date = v.slice(0, 10);
  const time = v.slice(11, 16);
  return (
    <div id={id} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
      <DateField id={`${id}-date`} value={date} max={max} invalid={invalid} onBlur={onBlur} onChange={(d) => onChange(`${d}T${time || '00:00'}`)} />
      <TimeField id={`${id}-time`} value={time} invalid={invalid} onBlur={onBlur} onChange={(t) => onChange(`${date}T${t}`)} />
    </div>
  );
}
