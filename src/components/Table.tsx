import { cn } from '@/lib/cn';

// The app's main table: no frame and no inner borders. Rows are told apart by alternating tints (zebra) and a hover tint;
// the header by green bold text. Fills its parent; `bleed` extends it over a Card's padding so stripes reach the edges.
export function Table({ children, className, minWidth, bleed = false }: {
  children: React.ReactNode; className?: string; minWidth?: string; bleed?: boolean;
}) {
  return (
    <div className={cn('overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', bleed && '-mx-6 w-[calc(100%+3rem)]', className)}>
      <table className="w-full border-collapse text-sm" style={minWidth ? { minWidth } : undefined}>{children}</table>
    </div>
  );
}

export function THead({ columns }: { columns: React.ReactNode[] }) {
  return (
    <thead>
      <tr>
        {columns.map((c, i) => <th key={i} scope="col" className="whitespace-nowrap px-3 py-3 text-start text-xs font-bold tracking-wide text-brand-ink first:ps-6 last:pe-6">{c}</th>)}
      </tr>
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:nth-child(odd):not(:hover)]:bg-brand/10">{children}</tbody>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors duration-150 hover:bg-brand/20', className)}>{children}</tr>;
}

export function Td({ children, className, num = false, colSpan }: { children?: React.ReactNode; className?: string; num?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn('px-3 py-2.5 align-middle first:ps-6 last:pe-6', num && 'whitespace-nowrap font-mono tabular-nums', className)}>{children}</td>;
}
