import { avgSleepHours, expectedLossOverSpan, fmt, lastDays, mean, weighInsBetween, weightChangeOls } from '../helpers';
import type { InsightRule } from '../types';
import { PLATEAU_ACTUAL_MAX_KG, PLATEAU_EXPECTED_MIN_KG } from './false-plateau';

// ≥ 21 day stall WITHOUT noise flags → logging accuracy or metabolic adaptation.
export const truePlateau: InsightRule = {
  code: 'TRUE_PLATEAU',
  evaluate(ctx) {
    const days = lastDays(ctx, 28);
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) return [];

    const w = weighInsBetween(ctx, first.date, last.date);
    const change = weightChangeOls(w);
    if (!change || change.spanDays < 21) return [];
    const exp = expectedLossOverSpan(days, change.spanDays, ctx.settings.kcalPerKg);
    if (exp.completeDays < 14 || exp.expectedKg == null) return [];
    if (!(exp.expectedKg >= PLATEAU_EXPECTED_MIN_KG && change.lossKg < PLATEAU_ACTUAL_MAX_KG)) return [];

    const sleepH = avgSleepHours(days);
    const noisy = w.some((x) => x.highSodium || !x.normalDigestion) || (sleepH != null && sleepH < 6);
    if (noisy) return [];

    const formulaAvg = mean(days.filter((d) => d.intakeComplete).map((d) => d.formulaTdee));
    return [{
      ruleCode: this.code,
      severity: 'warning',
      title: 'ثبات وزن حقيقي محتمل',
      message: `خلال ${change.spanDays} يوماً كان المتوقع نزول ${fmt(exp.expectedKg, 2)} كغ، والفعلي ${fmt(change.lossKg, 2)} كغ، دون مؤشرات احتباس سوائل. راجع دقة وزن الطعام وتسجيل كل الوجبات.`
        + (ctx.observedTdee != null && formulaAvg != null ? ` الحرق المرصود ${fmt(ctx.observedTdee)} مقابل النظري ${fmt(formulaAvg)} سعرة.` : ''),
      payload: { expectedKg: exp.expectedKg, actualKg: change.lossKg, spanDays: change.spanDays, observedTdee: ctx.observedTdee, formulaTdeeAvg: formulaAvg, completeDays: exp.completeDays },
      periodStart: first.date,
      periodEnd: last.date,
    }];
  },
};
