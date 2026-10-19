import { cn } from '@/lib/cn';
import type { Tone } from './Badge';

const FILL: Record<Tone, string> = { brand: 'bg-brand', warning: 'bg-warning', danger: 'bg-danger' };

export function ProgressBar({ value, max, tone = 'brand', label }: { value: number; max: number; tone?: Tone; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 rounded-full bg-brand-soft">
      <div className={cn('h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none', FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
