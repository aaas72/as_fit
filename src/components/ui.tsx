import Link from 'next/link';
import { cn } from '@/lib/cn';

// ───────── Buttons ─────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-strong text-white hover:bg-brand-ink disabled:opacity-60',
  secondary: 'border border-line bg-surface text-ink hover:border-brand hover:text-brand-ink disabled:opacity-60',
  ghost: 'text-ink-muted hover:bg-brand-soft hover:text-brand-ink disabled:opacity-60',
  danger: 'text-danger-ink hover:bg-danger-soft disabled:opacity-60',
};
const BTN = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed';

export function Button({ variant = 'primary', className, ...rest }: React.ComponentProps<'button'> & { variant?: Variant }) {
  return <button type="button" className={cn(BTN, VARIANT[variant], className)} {...rest} />;
}

export function ButtonLink({ variant = 'primary', className, ...rest }: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(BTN, VARIANT[variant], className)} {...rest} />;
}

// ───────── Page header ─────────
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-balance">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold">{children}</h2>
      {aside}
    </div>
  );
}

// ───────── Stat ─────────
export function Stat({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-2xl font-semibold">{children}</span>
      {hint && <span className="text-sm text-ink-muted">{hint}</span>}
    </div>
  );
}

// ───────── Empty state ─────────
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

// ───────── Form fields ─────────
export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none aria-[invalid=true]:border-danger';

export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor?: string; error?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {error ? <p className="text-sm text-danger-ink" role="alert">{error}</p> : hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function FormStatus({ status }: { status: { tone: 'brand' | 'danger'; text: string } | null }) {
  if (!status) return null;
  return (
    <p role="status" className={cn('rounded-lg px-3 py-2 text-sm font-medium', status.tone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'bg-danger-soft text-danger-ink')}>
      {status.text}
    </p>
  );
}
