import { describe, expect, it } from 'vitest';
import { isCalendarDate, isoDate, localDateTime } from '@/lib/validation/common';
import { sleepSchema } from '@/lib/validation/schemas';

describe('isCalendarDate', () => {
  it.each(['2026-01-31', '2026-02-28', '2024-02-29', '2000-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each(['2026-02-31', '2026-02-29', '2025-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00'])(
    'rejects %s',
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe('isoDate', () => {
  it('accepts a real date', () => {
    expect(isoDate.safeParse('2026-11-18').success).toBe(true);
  });

  it('rejects a well-formed but impossible date with a clear message', () => {
    const result = isoDate.safeParse('2026-02-31');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('تاريخ غير موجود في التقويم');
  });

  it('still rejects malformed input', () => {
    expect(isoDate.safeParse('18/11/2026').success).toBe(false);
  });
});

describe('localDateTime', () => {
  it('accepts a real date and time', () => {
    expect(localDateTime.safeParse('2024-02-29T23:59').success).toBe(true);
  });

  it.each(['2026-02-31T08:00', '2026-11-18T24:00', '2026-11-18T25:99', '2026-11-18T07:60'])('rejects %s', (value) => {
    expect(localDateTime.safeParse(value).success).toBe(false);
  });

  it('protects schemas that use it', () => {
    const night = {
      bedTime: '2026-02-30T23:00',
      sleepOnsetTime: '2026-02-30T23:20',
      wakeUpTime: '2026-03-01T07:00',
      nightInterruptions: 0,
      wasoMinutes: 0,
      freshness: 4,
    };
    expect(sleepSchema.safeParse(night).success).toBe(false);
  });
});
