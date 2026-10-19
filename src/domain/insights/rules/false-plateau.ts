import { avgSleepHours, expectedLossOverSpan, fmt, lastDays, weighInsBetween, weightChangeOls } from '../helpers';
import type { InsightRule } from '../types';

export const PLATEAU_EXPECTED_MIN_KG = 0.4;
export const PLATEAU_ACTUAL_MAX_KG = 0.1;

// 7–14 day stall WITH noise flags → water retention is the likely cause.
export const falsePlateau: InsightRule = {
  code: 'FALSE_PLATEAU',
  evaluate(ctx) {
    const days = lastDays(ctx, 14);
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) return [];

    const w = weighInsBetween(ctx, first.date, last.date);
    const change = weightChangeOls(w);
    if (!change || change.spanDays < 7) return [];
    const exp = expectedLossOverSpan(days, change.spanDays, ctx.settings.kcalPerKg);
    if (exp.completeDays < 7 || exp.expectedKg == null) return [];
    if (!(exp.expectedKg >= PLATEAU_EXPECTED_MIN_KG && change.lossKg < PLATEAU_ACTUAL_MAX_KG)) return [];

    const lastW = w[w.length - 1]!;
    const sleepH = avgSleepHours(days);
    const reasons = [
      w.some((x) => x.highSodium) && 'صوديوم مرتفع',
      !lastW.normalDigestion && 'هضم غير طبيعي',
      sleepH != null && sleepH < 6 && `متوسط نوم ${fmt(sleepH, 1)} ساعة`,
    ].filter((r): r is string => Boolean(r));
    if (reasons.length === 0) return [];

    return [{
      ruleCode: this.code,
      severity: 'info',
      title: 'ثبات وزن مؤقت (احتباس سوائل محتمل)',
      message: `العجز المحسوب يعادل ${fmt(exp.expectedKg, 2)} كغ، لكن الوزن نزل ${fmt(change.lossKg, 2)} كغ فقط. الأسباب المرجحة: ${reasons.join('، ')}. الدهون على الأرجح تُحرق والماء يحجب النتيجة.`,
      payload: { expectedKg: exp.expectedKg, actualKg: change.lossKg, spanDays: change.spanDays, reasons, avgSleepH: sleepH, completeDays: exp.completeDays, totalDays: days.length },
      periodStart: first.date,
      periodEnd: last.date,
    }];
  },
};
