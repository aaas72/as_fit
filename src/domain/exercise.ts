// 1 MET = 3.5 ml O2/kg/min; 1 L O2 ≈ 5 kcal → kcal/min = MET × 3.5 × W / 200
// net = (MET − 1): the resting 1 MET is already inside BMR × activity factor (S2)
export function exerciseKcal(met: number, weightKg: number, minutes: number) {
  const perMinute = (m: number) => (m * 3.5 * weightKg) / 200;
  return {
    gross: perMinute(met) * minutes,
    net: perMinute(Math.max(met - 1, 0)) * minutes,
  };
}
