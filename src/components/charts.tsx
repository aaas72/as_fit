'use client';

import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';

// Shared look: thin marks, recessive grid, RTL time axis (reversed), values axis on the right.
const C = {
  brand: 'var(--color-brand-strong)',
  series2: 'var(--color-series-2)',
  muted: 'var(--color-ink-muted)',
  grid: 'var(--color-line)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
};
const axis = { stroke: C.grid, tick: { fill: C.muted, fontSize: 11, fontFamily: 'var(--font-mono)' } };
const shortDate = (d: string) => d.slice(5).replace('-', '/');
const tooltipStyle = { contentStyle: { borderRadius: 8, border: '1px solid var(--color-line)', fontSize: 12, direction: 'rtl' as const }, labelFormatter: (l: unknown) => String(l) };

function Frame({ height = 280, empty, children }: { height?: number; empty?: string | false; children: React.ReactElement }) {
  if (empty) {
    return <div style={{ height }} className="grid w-full place-items-center rounded-lg border border-dashed border-line text-sm text-ink-muted">{empty}</div>;
  }
  return <div style={{ height }} className="w-full" dir="ltr"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

const fmt = (digits: number) => (v: unknown) => (typeof v === 'number' ? v.toFixed(digits) : String(v ?? '—'));

export type WeightPointView = { date: string; raw?: number; trend?: number | null; compliant?: boolean };

export function WeightChart({ data }: { data: WeightPointView[] }) {
  const compliant = data.filter((d) => d.raw != null && d.compliant).map((d) => ({ date: d.date, raw: d.raw }));
  const off = data.filter((d) => d.raw != null && !d.compliant).map((d) => ({ date: d.date, off: d.raw }));
  const merged = data.map((d) => ({
    date: d.date, trend: d.trend ?? undefined,
    raw: compliant.find((c) => c.date === d.date)?.raw, off: off.find((o) => o.date === d.date)?.off,
  }));
  return (
    <Frame empty={data.every((d) => d.raw == null) && 'لا توجد قراءات وزن في هذه الفترة'}>
      <ComposedChart data={merged} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" reversed tickFormatter={shortDate} {...axis} minTickGap={24} />
        <YAxis orientation="right" domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={fmt(1)} width={44} {...axis} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(2)(v), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line name="خط الاتجاه EMA" dataKey="trend" stroke={C.brand} strokeWidth={2} dot={false} connectNulls type="monotone" />
        <Scatter name="قراءة ملتزمة" dataKey="raw" fill={C.series2} />
        <Scatter name="غير ملتزمة" dataKey="off" fill="var(--color-surface)" stroke={C.muted} strokeWidth={1.5} />
      </ComposedChart>
    </Frame>
  );
}

export function CumulativeLossChart({ data }: { data: { date: string; expected: number | null; actual: number | null }[] }) {
  return (
    <Frame empty={data.every((d) => !d.expected && d.actual == null) && 'يحتاج أياماً مكتملة التسجيل وقراءات وزن ملتزمة'}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" reversed tickFormatter={shortDate} {...axis} minTickGap={24} />
        <YAxis orientation="right" tickFormatter={fmt(2)} width={52} {...axis} unit=" كغ" />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [`${fmt(2)(v)} كغ`, n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke={C.grid} />
        <Line name="النزول المتوقع (من العجز)" dataKey="expected" stroke={C.series2} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
        <Line name="النزول الفعلي (الاتجاه)" dataKey="actual" stroke={C.brand} strokeWidth={2} dot={false} connectNulls />
      </ComposedChart>
    </Frame>
  );
}

export function EnergyChart({ data, observed }: { data: { date: string; intake: number | null; formulaTdee: number }[]; observed: number | null }) {
  return (
    <Frame>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" reversed tickFormatter={shortDate} {...axis} minTickGap={24} />
        <YAxis orientation="right" tickFormatter={fmt(0)} width={48} {...axis} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [`${fmt(0)(v)} سعرة`, n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name="المتناول (أيام مكتملة)" dataKey="intake" fill={C.series2} radius={[4, 4, 0, 0]} maxBarSize={14} />
        <Line name="الحرق النظري (المعادلة)" dataKey="formulaTdee" stroke={C.brand} strokeWidth={2} dot={false} />
        {observed != null && <ReferenceLine y={observed} stroke={C.warning} strokeDasharray="6 4" label={{ value: `المرصود ${Math.round(observed)}`, fill: C.muted, fontSize: 11, position: 'insideTopLeft' }} />}
      </ComposedChart>
    </Frame>
  );
}

export function BarsChart({ data, name, unit, target, targetLabel, digits = 0, targetTone = 'brand' }: {
  data: { date: string; value: number | null }[]; name: string; unit: string; target?: number; targetLabel?: string; digits?: number; targetTone?: 'brand' | 'danger';
}) {
  return (
    <Frame height={220} empty={data.every((d) => d.value == null) && 'لا توجد بيانات في هذه الفترة'}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" reversed tickFormatter={shortDate} {...axis} minTickGap={24} />
        <YAxis orientation="right" tickFormatter={fmt(digits)} width={44} {...axis} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${fmt(digits)(v)} ${unit}`, name]} />
        <Bar name={name} dataKey="value" fill={C.brand} radius={[4, 4, 0, 0]} maxBarSize={14} />
        {target != null && <ReferenceLine y={target} stroke={targetTone === 'danger' ? C.danger : C.muted} strokeDasharray="6 4" label={{ value: targetLabel ?? '', fill: C.muted, fontSize: 11, position: 'insideTopLeft' }} />}
      </ComposedChart>
    </Frame>
  );
}
