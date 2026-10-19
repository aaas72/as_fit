import { residualCaffeineMg, latestDoseTime } from '../../caffeine-kinetics';
import { CAFFEINE_BEDTIME_LIMIT_MG } from '../../constants';
import { clock, fmt } from '../helpers';
import type { InsightRule } from '../types';

export const bedtimeCaffeine: InsightRule = {
  code: 'BEDTIME_CAFFEINE',
  evaluate(ctx) {
    const doses = ctx.days.flatMap((d) => d.caffeineDoses);
    const { caffeineHalfLifeH: halfLife, timezone } = ctx.settings;

    return ctx.days.flatMap((d) => {
      if (!d.sleep) return [];
      const bedAt = d.sleep.bedAt;
      const residual = residualCaffeineMg(doses, bedAt, halfLife);
      if (residual <= CAFFEINE_BEDTIME_LIMIT_MG) return [];

      // Latest acceptable time for the final cup, counting the cups before it (A11)
      const before = doses.filter((x) => x.at <= bedAt).sort((a, b) => a.at.getTime() - b.at.getTime());
      const finalCup = before[before.length - 1];
      const latest = finalCup
        ? latestDoseTime({ doses: before.slice(0, -1), bedAt, nextDoseMg: finalCup.mg, halfLifeH: halfLife })
        : null;
      return [{
        ruleCode: this.code,
        severity: 'warning' as const,
        title: 'كافيين مرتفع وقت النوم',
        message: `بقي في الدم نحو ${fmt(residual)} mg كافيين عند ${clock(bedAt, timezone)} (الحد ${CAFFEINE_BEDTIME_LIMIT_MG}). `
          + (latest
            ? `آخر كوب (${fmt(finalCup!.mg)} mg) كان يجب أن يكون قبل ${clock(latest, timezone)}.`
            : 'الأكواب التي قبل آخر كوب تتجاوز الحد وحدها، فخفّف الكمية اليومية.'),
        payload: { residualMg: residual, bedAt: bedAt.toISOString(), halfLifeH: halfLife, finalCupMg: finalCup?.mg ?? null, latestFinalCupAt: latest?.toISOString() ?? null, doses: before.length },
        periodStart: d.date,
        periodEnd: d.date,
      }];
    });
  },
};
