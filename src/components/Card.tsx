import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: React.ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-xl border border-line p-6', className)} {...rest}>
      {children}
    </section>
  );
}
