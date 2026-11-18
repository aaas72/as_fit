import { describe, expect, it } from 'vitest';
import { circularMeanMin, clockDistanceMin, socialJetLagH } from '@/domain/sleep';

describe('circularMeanMin', () => {
  it('averages ordinary times like an arithmetic mean', () => {
    expect(circularMeanMin([180, 240])).toBeCloseTo(210);
  });

  it('averages across midnight', () => {
    expect(circularMeanMin([1430, 10])).toBeCloseTo(0, 6);
    expect(circularMeanMin([1380, 60])).toBeCloseTo(0, 6); // 23:00 and 01:00 → 00:00
  });

  it('averages across noon (the old shift broke here)', () => {
    expect(circularMeanMin([710, 730])).toBeCloseTo(720);
  });

  it('returns null for an empty list or times that cancel out', () => {
    expect(circularMeanMin([])).toBeNull();
    expect(circularMeanMin([0, 720])).toBeNull();
  });
});

describe('clockDistanceMin', () => {
  it('takes the short way around the clock', () => {
    expect(clockDistanceMin(10, 1430)).toBe(20);
    expect(clockDistanceMin(0, 720)).toBe(720);
    expect(clockDistanceMin(300, 180)).toBe(120);
  });
});

describe('socialJetLagH', () => {
  it('is 20 minutes, not 23.7 hours, for midpoints either side of noon', () => {
    expect(socialJetLagH([710], [730])).toBeCloseTo(1 / 3);
  });

  it('is symmetric', () => {
    expect(socialJetLagH([200, 220], [320])).toBeCloseTo(socialJetLagH([320], [200, 220])!);
  });

  it('returns null when a mean is undefined', () => {
    expect(socialJetLagH([0, 720], [300])).toBeNull();
  });
});
