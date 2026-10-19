import { cn } from '@/lib/cn';

// The app's main table: header with a green rule, alternating row tints (zebra), green hover, numbers in tabular mono.
// No white fills: rows alternate between the page background and the soft brand tint.
export function Table({ children, className, minWidth }: { children: React.ReactNode; className?: string; minWidth?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-line', className)}>
      <table className="w-full border-collapse text-sm" style={minWidth ? { minWidth } : undefined}>{children}</table>
    </div>
  );
}

export function THead({ columns }: { columns: React.ReactNode[] }) {
  return (
    <thead>
      <tr className="border-b-2 border-brand/40">
        {columns.map((c, i) => <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold tracking-wide text-brand-ink">{c}</th>)}
      </tr>
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:nth-child(even):not(:hover)]:bg-brand/10">{children}</tbody>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('border-t border-line/70 transition-colors duration-150 hover:bg-brand/20', className)}>{children}</tr>;
}

export function Td({ children, className, num = false, colSpan }: { children?: React.ReactNode; className?: string; num?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn('px-4 py-2.5 align-middle', num && 'whitespace-nowrap font-mono tabular-nums', className)}>{children}</td>;
}
