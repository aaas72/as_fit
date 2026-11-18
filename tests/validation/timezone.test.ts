import { describe, expect, it } from 'vitest';
import { isTimeZone, timeZone } from '@/lib/validation/common';

describe('isTimeZone', () => {
  it.each(['Europe/Istanbul', 'UTC', 'Asia/Riyadh', 'America/New_York', 'Africa/Cairo'])('accepts %s', (zone) => {
    expect(isTimeZone(zone)).toBe(true);
  });

  it.each(['Mars/Base', 'Europe/Istanbull', 'GMT+99', 'not a zone', ''])('rejects %j', (zone) => {
    expect(isTimeZone(zone)).toBe(false);
  });
});

describe('timeZone schema', () => {
  it('accepts a known zone and trims whitespace', () => {
    const result = timeZone.safeParse('  Europe/Istanbul ');
    expect(result.success).toBe(true);
    expect(result.data).toBe('Europe/Istanbul');
  });

  it('rejects an unknown zone with a clear message', () => {
    const result = timeZone.safeParse('Mars/Base');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('منطقة زمنية غير معروفة');
  });

  it('rejects an empty value', () => {
    expect(timeZone.safeParse('').success).toBe(false);
  });
});
