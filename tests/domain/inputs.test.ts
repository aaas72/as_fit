import { describe, expect, it } from 'vitest';
import { earlierDateTime, formatDate, isClock, monthGrid, nightDateTimes, parseDate, parseTime, stepValue } from '@/lib/inputs';

describe('parseTime', () => {
  it.each([
    ['14:00', '14:00'], ['1400', '14:00'], ['930', '09:30'], ['9:5', '09:05'], ['14.30', '14:30'], ['7', '07:00'], ['0', '00:00'],
  ])('%s → %s', (raw, out) => expect(parseTime(raw)).toBe(out));
  it.each(['24:00', '12:60', 'abc', '', '12345'])('rejects %s', (raw) => expect(parseTime(raw)).toBeNull());
});

describe('parseDate / formatDate', () => {
  it.each([
    ['19/10/2026', '2026-10-19'], ['1-1-1996', '1996-01-01'], ['2026-10-19', '2026-10-19'], ['2024/2/29', '2024-02-29'],
  ])('%s → %s', (raw, out) => expect(parseDate(raw)).toBe(out));
  it.each(['31/02/2026', '29/02/2025', '2026-13-01', 'yesterday', '10/2026'])('rejects %s', (raw) => expect(parseDate(raw)).toBeNull());
  it('formats ISO for display', () => {
    expect(formatDate('2026-10-19')).toBe('19/10/2026');
    expect(formatDate('')).toBe('');
  });
});

describe('monthGrid (Monday-first)', () => {
  it('October 2026 starts on Thursday → 3 leading days', () => {
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(42);
    expect(g[0]).toMatchObject({ iso: '2026-09-28', inMonth: false });
    expect(g[3]).toMatchObject({ iso: '2026-10-01', inMonth: true, day: 1 });
  });
});

describe('stepValue', () => {
  it('steps, rounds and clamps', () => {
    expect(stepValue('2', 1, { step: 1, min: 0 })).toBe('3');
    expect(stepValue('0', -1, { step: 1, min: 0 })).toBe('0');
    expect(stepValue('1.5', 0.5, { step: 0.5, max: 2 })).toBe('2.0');
    expect(stepValue('', 5, { step: 5, min: 0 })).toBe('5');
    expect(stepValue('598', 5, { step: 5, max: 600 })).toBe('600');
  });
});

describe('isClock', () => {
  it('accepts complete HH:MM only', () => {
    expect(['07:00', '22:09', '00:00', '23:59'].every(isClock)).toBe(true);
    expect(['7:00', '24:00', '12:60', 'dd:dd', '', null].some(isClock)).toBe(false);
  });
});

describe('date inference from clock times', () => {
  it('last meal later than weigh-in clock → previous day', () => {
    expect(earlierDateTime('2026-10-19', '07:00', '21:00')).toBe('2026-10-18T21:00');
    expect(earlierDateTime('2026-10-19', '09:00', '06:30')).toBe('2026-10-19T06:30');
    expect(earlierDateTime('2026-03-01', '07:00', '22:00')).toBe('2026-02-28T22:00');
  });
  it('normal night: bed 23:00, onset 23:20, wake 07:00', () =>
    expect(nightDateTimes('2026-10-19', '23:00', '23:20', '07:00')).toEqual({
      bedTime: '2026-10-18T23:00', sleepOnsetTime: '2026-10-18T23:20', wakeUpTime: '2026-10-19T07:00',
    }));
  it('falls asleep after midnight: bed 23:50, onset 00:20', () =>
    expect(nightDateTimes('2026-10-19', '23:50', '00:20', '07:00')).toEqual({
      bedTime: '2026-10-18T23:50', sleepOnsetTime: '2026-10-19T00:20', wakeUpTime: '2026-10-19T07:00',
    }));
  it('goes to bed after midnight: bed 01:00, onset 01:30', () =>
    expect(nightDateTimes('2026-10-19', '01:00', '01:30', '08:00')).toEqual({
      bedTime: '2026-10-19T01:00', sleepOnsetTime: '2026-10-19T01:30', wakeUpTime: '2026-10-19T08:00',
    }));
});
