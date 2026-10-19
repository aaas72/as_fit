import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: React.ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-6 shadow-sm', className)} {...rest}>
      {children}
    </section>
  );
}
