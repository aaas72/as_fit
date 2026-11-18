import { describe, expect, it } from 'vitest';
import { parseRecordId } from '@/lib/validation/common';

describe('parseRecordId', () => {
  it.each([1, 42, 2_147_483_647])('accepts %s', (id) => {
    expect(parseRecordId(id)).toBe(id);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648, '1', '1 OR 1=1', null, undefined, {}, [1]])(
    'rejects %j',
    (id) => {
      expect(parseRecordId(id)).toBeNull();
    },
  );
});
