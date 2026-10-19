import { fmt, mean } from '../helpers';
import type { InsightRule } from '../types';

export const LUNCH_DRIFT_MIN = 90;

export const lunchDrift: InsightRule = {
  code: 'LUNCH_DRIFT',
  evaluate(ctx) {
    const lunches = ctx.days.flatMap((d) => d.meals.filter((m) => m.type === 'lunch').map((m) => ({ date: d.date, ...m })));
    const regularAvg = mean(lunches.filter((l) => l.driftMin != null && Math.abs(l.driftMin) <= 30).map((l) => l.kcal));

    return lunches
      .filter((l) => l.driftMin != null && l.driftMin > LUNCH_DRIFT_MIN)
      .map((l) => ({
        ruleCode: this.code,
        severity: 'warning' as const,
        title: 'غداء متأخر',
        message: `تأخر الغداء ${l.driftMin} دقيقة عن موعده. التأخير الطويل يراكم الجوع ويرفع احتمال الإفراط في الوجبة التالية.`
          + (regularAvg != null ? ` سعرات هذا الغداء ${fmt(l.kcal)} مقابل متوسط ${fmt(regularAvg)} للغداء في موعده.` : ''),
        payload: { driftMin: l.driftMin, lunchKcal: l.kcal, regularLunchAvgKcal: regularAvg },
        periodStart: l.date,
        periodEnd: l.date,
      }));
  },
};
