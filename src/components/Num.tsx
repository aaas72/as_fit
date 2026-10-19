import { cn } from '@/lib/cn';

// Numbers inside Arabic text: isolated so signs and units don't flip (−500 kcal).
export function Num({ value, unit, digits = 0, className }: { value: number; unit?: string; digits?: number; className?: string }) {
  const text = value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−');
  return (
    <bdi className={cn('font-mono tabular-nums', className)}>
      {text}
      {unit && <span className="mx-1 text-[0.7em] font-normal text-ink-muted">{unit}</span>}
    </bdi>
  );
}
