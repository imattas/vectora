import { describe, expect, it } from 'vitest';
import { formatMeasurement } from './measurements.ts';

describe('formatMeasurement', () => {
  it('normalizes malformed precision without throwing', () => {
    expect(formatMeasurement(Math.PI, NaN)).toBe('3.1416');
    expect(formatMeasurement(Math.PI, -4)).toBe('3');
    expect(formatMeasurement(Math.PI, 100)).toBe(String(Math.PI));
  });

  it('keeps non-finite values explicit', () => {
    expect(formatMeasurement(Infinity)).toBe('undefined');
  });
});
