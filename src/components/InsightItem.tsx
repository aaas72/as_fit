import { SEVERITY_LABEL } from '@/lib/labels';
import type { InsightView } from '@/server/queries/logs';
import { Badge } from './Badge';

const TONE = { info: 'brand', warning: 'warning', critical: 'danger' } as const;
const STRIPE = { info: 'border-s-brand', warning: 'border-s-warning', critical: 'border-s-danger' } as const;

const formatValue = (v: unknown): string => {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
};

export function InsightItem({ insight, actions, showPayload = false }: { insight: InsightView; actions?: React.ReactNode; showPayload?: boolean }) {
  const period = insight.periodStart === insight.periodEnd ? insight.periodEnd : `${insight.periodStart} ← ${insight.periodEnd}`;
  return (
    <article className={`flex flex-col gap-2 rounded-xl border border-line border-s-4 p-5 ${STRIPE[insight.severity]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[insight.severity]}>{SEVERITY_LABEL[insight.severity]}</Badge>
        <h3 className="font-bold">{insight.title}</h3>
        <bdi className="ms-auto font-mono text-xs text-ink-muted">{period}</bdi>
      </div>
      <p className="text-sm leading-7">{insight.message}</p>
      {showPayload && Object.keys(insight.payload).length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-brand-ink">الأرقام التي أدت للتنبيه</summary>
          <dl dir="ltr" className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs">
            {Object.entries(insight.payload).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="break-all text-ink">{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {actions && <div className="flex justify-end">{actions}</div>}
    </article>
  );
}
