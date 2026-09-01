import { describe, expect, it } from 'vitest';
import { niceSpacing } from './render2d.ts';

describe('niceSpacing', () => {
  it('returns finite spacing for malformed viewport scales', () => {
    for (const [upp, minPx] of [[0, 90], [-1, 90], [Infinity, 90], [1, Infinity], [1, 0]]) {
      const spacing = niceSpacing(upp, minPx);
      expect(Number.isFinite(spacing.major)).toBe(true);
      expect(Number.isFinite(spacing.minor)).toBe(true);
      expect(spacing.major).toBeGreaterThan(0);
      expect(spacing.minor).toBeGreaterThan(0);
    }
  });

  it('keeps ordinary spacing on the 1-2-5 progression', () => {
    expect(niceSpacing(0.1, 90)).toEqual({ major: 10, minor: 2 });
  });
});
