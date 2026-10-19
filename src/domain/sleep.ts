const minutesBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;

export function sleepMetrics(s: { bed: Date; onset: Date; wake: Date; wasoMin: number }) {
  const tibMin = minutesBetween(s.bed, s.wake);
  const tstMin = minutesBetween(s.onset, s.wake) - s.wasoMin;
  const midpoint = new Date(s.onset.getTime() + (s.wake.getTime() - s.onset.getTime()) / 2);
  return {
    tibMin,
    latencyMin: minutesBetween(s.bed, s.onset),
    tstMin,
    efficiencyPct: tibMin > 0 ? (tstMin / tibMin) * 100 : 0,
    midpoint,
  };
}

// Targets: SE ≥ 85%, latency ≤ 20 min, TST 7–9 h
export const sleepTargets = { efficiencyPct: 85, latencyMin: 20, tstMinLow: 420, tstMinHigh: 540 } as const;

// Social jet lag (Wittmann 2006): |mean midpoint on free days − mean midpoint on work days|, in hours.
// Midpoints are minutes after midnight, shifted so early-morning times stay comparable across midnight.
export function socialJetLagH(workdayMidpointsMin: number[], freedayMidpointsMin: number[]) {
  if (workdayMidpointsMin.length === 0 || freedayMidpointsMin.length === 0) return null;
  const norm = (m: number) => (m < 720 ? m + 1440 : m);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + norm(b), 0) / xs.length;
  return Math.abs(mean(freedayMidpointsMin) - mean(workdayMidpointsMin)) / 60;
}
