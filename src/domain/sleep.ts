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

const MINUTES_PER_DAY = 1440;

// Circular mean of clock times (minutes after midnight): each time is an angle on a 24 h circle,
// so 23:50 and 00:10 average to 00:00, not 12:00. null when the times cancel out (no defined mean).
export function circularMeanMin(minutes: number[]) {
  if (minutes.length === 0) return null;
  const angle = (m: number) => (2 * Math.PI * m) / MINUTES_PER_DAY;
  const sin = minutes.reduce((s, m) => s + Math.sin(angle(m)), 0);
  const cos = minutes.reduce((s, m) => s + Math.cos(angle(m)), 0);
  if (Math.hypot(sin, cos) < 1e-9 * minutes.length) return null;
  const mean = (Math.atan2(sin, cos) * MINUTES_PER_DAY) / (2 * Math.PI);
  return (mean + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// Shortest distance between two clock times on the 24 h circle, in minutes (0–720).
export const clockDistanceMin = (a: number, b: number) => {
  const d = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(d, MINUTES_PER_DAY - d);
};

// Social jet lag (Wittmann 2006): |mean midpoint on free days − mean midpoint on work days|, in hours.
// Midpoints are minutes after midnight; means are circular so no clock time is a discontinuity.
export function socialJetLagH(workdayMidpointsMin: number[], freedayMidpointsMin: number[]) {
  const work = circularMeanMin(workdayMidpointsMin);
  const free = circularMeanMin(freedayMidpointsMin);
  if (work == null || free == null) return null;
  return clockDistanceMin(free, work) / 60;
}
