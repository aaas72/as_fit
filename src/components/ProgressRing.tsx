import type { Tone } from './Badge';

const STROKE: Record<Tone, string> = { brand: 'stroke-brand', warning: 'stroke-warning', danger: 'stroke-danger' };

export function ProgressRing({ value, max, tone = 'brand', size = 168, label, children }: {
  value: number; max: number; tone?: Tone; size?: number; label: string; children?: React.ReactNode;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-brand-soft" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={`${STROKE[tone]} transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
