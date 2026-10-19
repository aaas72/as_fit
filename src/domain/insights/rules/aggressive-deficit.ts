import { AGGRESSIVE_DEFICIT_GRACE_DAYS, SAFE_WEEKLY_LOSS_PCT } from '../../constants';
import { fmt, lastDays, weighInsBetween, weightChangeOls } from '../helpers';
import type { InsightRule } from '../types';

const WINDOW_DAYS = 14;

// Loss > 1% of body weight per week over two weeks. Not evaluated during the first 14 days (A6).
export const aggressiveDeficit: InsightRule = {
  code: 'AGGRESSIVE_DEFICIT',
  evaluate(ctx) {
    if (ctx.trackingDay < AGGRESSIVE_DEFICIT_GRACE_DAYS + WINDOW_DAYS) return [];
    const days = lastDays(ctx, WINDOW_DAYS);
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) return [];

    const w = weighInsBetween(ctx, first.date, last.date);
    if (w.length < 3) return [];
    const change = weightChangeOls(w);
    if (!change || change.spanDays < 10) return [];
    const weeklyPct = (-change.slopeKgPerDay * 7) / ctx.weightKg;
    if (weeklyPct <= SAFE_WEEKLY_LOSS_PCT.max) return [];

    return [{
      ruleCode: this.code,
      severity: 'warning',
      title: 'نزول أسرع من الحد الآمن',
      message: `الوزن ينزل ${fmt(weeklyPct * 100, 1)}% أسبوعياً خلال آخر أسبوعين، والحد الآمن 1%. خفّض العجز اليومي لحماية الكتلة العضلية.`,
      payload: { weeklyLossPct: weeklyPct, slopeKgPerDay: change.slopeKgPerDay, readings: w.length },
      periodStart: first.date,
      periodEnd: last.date,
    }];
  },
};
