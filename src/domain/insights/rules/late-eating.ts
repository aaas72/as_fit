import { clock, fmt } from '../helpers';
import type { InsightRule } from '../types';

export const LATE_EATING_HOURS = 3;

export const lateEating: InsightRule = {
  code: 'LATE_EATING',
  evaluate(ctx) {
    const meals = ctx.days.flatMap((d) => d.meals);
    const { timezone } = ctx.settings;

    return ctx.days.flatMap((d) => {
      if (!d.sleep) return [];
      const bedAt = d.sleep.bedAt;
      const lastMeal = meals
        .filter((m) => m.actualAt <= bedAt && bedAt.getTime() - m.actualAt.getTime() < 24 * 3.6e6)
        .sort((a, b) => b.actualAt.getTime() - a.actualAt.getTime())[0];
      if (!lastMeal) return [];
      const gapH = (bedAt.getTime() - lastMeal.actualAt.getTime()) / 3.6e6;
      if (gapH >= LATE_EATING_HOURS) return [];
      return [{
        ruleCode: this.code,
        severity: 'info' as const,
        title: 'أكل قريب من النوم',
        message: `آخر وجبة كانت ${clock(lastMeal.actualAt, timezone)} والنوم ${clock(bedAt, timezone)}، أي بعد ${fmt(gapH, 1)} ساعة. الأكل قبل النوم بأقل من 3 ساعات قد يؤثر على جودة النوم والهضم.`,
        payload: { gapH, lastMealAt: lastMeal.actualAt.toISOString(), bedAt: bedAt.toISOString(), lastMealKcal: lastMeal.kcal },
        periodStart: d.date,
        periodEnd: d.date,
      }];
    });
  },
};
