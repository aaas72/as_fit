import { formatInTimeZone } from 'date-fns-tz';
import { dayNumber, linearSlope } from '../weight-trend';
import type { DayContext, PeriodContext, WeighInContext } from './types';

export const fmt = (n: number, digits = 0) => n.toFixed(digits);

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Days in the window [lastDate − n + 1, lastDate]
export function lastDays(ctx: PeriodContext, n: number): DayContext[] {
  const last = ctx.days[ctx.days.length - 1];
  if (!last) return [];
  const end = dayNumber(last.date);
  return ctx.days.filter((d) => dayNumber(d.date) > end - n);
}

export function weighInsBetween(ctx: PeriodContext, start: string, end: string): WeighInContext[] {
  return ctx.weighIns.filter((w) => w.compliant && w.date >= start && w.date <= end);
}

// Actual change over a window from OLS on raw compliant readings (A1), not from EMA endpoints.
export function weightChangeOls(weighIns: WeighInContext[]) {
  if (weighIns.length < 2) return null;
  const points = weighIns.map((w) => ({ day: dayNumber(w.date), weight: w.weight }));
  const slope = linearSlope(points);
  const first = points[0];
  const last = points[points.length - 1];
  if (slope == null || !first || !last) return null;
  const spanDays = last.day - first.day;
  return { slopeKgPerDay: slope, spanDays, lossKg: -slope * spanDays };
}

// Expected loss over the weigh-in span: mean formula deficit of complete days × span (A2, A3)
export function expectedLossOverSpan(days: DayContext[], spanDays: number, kcalPerKg: number) {
  const complete = days.filter((d) => d.intakeComplete);
  const avg = mean(complete.map((d) => d.formulaDeficit));
  return { completeDays: complete.length, avgDeficit: avg, expectedKg: avg == null ? null : (avg * spanDays) / kcalPerKg };
}

export const avgSleepHours = (days: DayContext[]) => {
  const m = mean(days.filter((d) => d.sleep).map((d) => d.sleep!.tstMin));
  return m == null ? null : m / 60;
};

// Wall-clock time in the user's timezone (messages must not show server/UTC time)
export const clock = (d: Date, timezone: string) => formatInTimeZone(d, timezone, 'HH:mm');
