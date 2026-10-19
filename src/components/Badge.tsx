import { cn } from '@/lib/cn';

export type Tone = 'brand' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
};

export function Badge({ tone = 'brand', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}
