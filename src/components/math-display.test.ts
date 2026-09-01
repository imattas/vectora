import { describe, expect, it } from 'vitest';
import { formatPlainGlyphs } from './math-display.ts';

describe('math display glyphs', () => {
  it('maps canonical operators and constants to calculator glyphs', () => {
    expect(formatPlainGlyphs('x <= 2 * pi - tau')).toBe('x ≤ 2 × π − τ');
  });
});
