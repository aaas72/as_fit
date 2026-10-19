import { fmt } from '../helpers';
import type { InsightRule } from '../types';

export const COGNITIVE_LOAD_HOURS = 5;
export const COGNITIVE_PROTEIN_BOOST_G_PER_KG = 0.2;

// Behavioral heuristic (S8): adds NO calories to TDEE.
export const cognitiveLoad: InsightRule = {
  code: 'COGNITIVE_LOAD',
  evaluate(ctx) {
    return ctx.days
      .filter((d) => d.highFocusH > COGNITIVE_LOAD_HOURS)
      .map((d) => {
        const boostG = COGNITIVE_PROTEIN_BOOST_G_PER_KG * ctx.weightKg;
        return {
          ruleCode: this.code,
          severity: 'info' as const,
          title: 'يوم تركيز ذهني طويل',
          message: `${fmt(d.highFocusH, 1)} ساعات تركيز عالٍ. الإجهاد الذهني مع الجلوس يرتبط بزيادة الشهية مساءً: جرّب وجبة خفيفة بروتينية 20–30 غ قبل نهاية العمل. هدف البروتين المعروض لليوم رُفع ${fmt(boostG)} غ.`,
          payload: { highFocusH: d.highFocusH, proteinBoostG: boostG, proteinTargetG: d.proteinTargetG + boostG },
          periodStart: d.date,
          periodEnd: d.date,
        };
      });
  },
};
