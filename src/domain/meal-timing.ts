// Mirrors the generated column meals.time_drift_minutes: wrapped to [-720, 720), positive = late.
export function clockDriftMin(scheduled: string, actual: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const d = toMin(actual) - toMin(scheduled);
  return (((d + 720) % 1440) + 1440) % 1440 - 720;
}

export type DriftTone = 'brand' | 'warning' | 'danger';
export const driftTone = (driftMin: number): DriftTone => {
  const a = Math.abs(driftMin);
  return a <= 30 ? 'brand' : a <= 90 ? 'warning' : 'danger';
};
