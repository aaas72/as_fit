import { fmt } from '../helpers';
import type { InsightRule } from '../types';

export const PROTEIN_SHORT_RATIO = 0.8;

// 3 of the last 5 complete days below 80% of target (incomplete days would read as false shortfalls)
export const proteinShortfall: InsightRule = {
  code: 'PROTEIN_SHORT',
  evaluate(ctx) {
    const recent = ctx.days.filter((d) => d.intakeComplete).slice(-5);
    if (recent.length < 3) return [];
    const short = recent.filter((d) => d.proteinG < PROTEIN_SHORT_RATIO * d.proteinTargetG);
    if (short.length < 3) return [];
    const first = recent[0]!;
    const last = recent[recent.length - 1]!;
    return [{
      ruleCode: this.code,
      severity: 'warning',
      title: 'نقص بروتين متكرر',
      message: `في ${short.length} من آخر ${recent.length} أيام مكتملة كان البروتين أقل من 80% من الهدف (${fmt(last.proteinTargetG)} غ). البروتين الكافي أثناء العجز يحمي الكتلة العضلية.`,
      payload: { shortDays: short.map((d) => ({ date: d.date, proteinG: d.proteinG, targetG: d.proteinTargetG })), windowDays: recent.length },
      periodStart: first.date,
      periodEnd: last.date,
    }];
  },
};
