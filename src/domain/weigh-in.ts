export type WeighInProtocolInput = {
  measuredAt: Date;
  lastMealAt: Date;
  bathroomDone: boolean;
  noFluidsBefore: boolean;
};

// Non-compliant readings are saved but excluded from the trend and the observed TDEE.
export function protocolCompliance(input: WeighInProtocolInput, requiredFastingH = 14) {
  const fastingH = (input.measuredAt.getTime() - input.lastMealAt.getTime()) / 3.6e6;
  const violations: string[] = [];
  if (fastingH < requiredFastingH) violations.push(`مدة الصيام ${fastingH.toFixed(1)} ساعة < ${requiredFastingH}`);
  if (!input.bathroomDone) violations.push('لم يتم دخول الحمام قبل القياس');
  if (!input.noFluidsBefore) violations.push('تم تناول سوائل قبل القياس');
  return { compliant: violations.length === 0, fastingH, violations };
}
