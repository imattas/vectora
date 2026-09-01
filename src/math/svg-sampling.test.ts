import { describe, expect, it } from 'vitest';
import { parseExpr } from './expr.ts';
import { sampleImplicitContours } from './svg-sampling.ts';

describe('sampleImplicitContours', () => {
  const bounds = { xlo: -3, xhi: 3, ylo: -3, yhi: 3 };

  it('keeps both branches of a circle as separate vector paths', () => {
    const paths = sampleImplicitContours(parseExpr('x^2 + y^2 = 4'), bounds, {
      columns: 80, seeds: 10, iterations: 16,
    });
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths.every(path => path.length >= 8)).toBe(true);
    expect(paths.flat().some(([x, y]) => Math.abs(Math.hypot(x, y) - 2) < 1e-4)).toBe(true);
  });

  it('samples a scalar graph across the requested x span', () => {
    const paths = sampleImplicitContours(parseExpr('y = x'), bounds, { columns: 40 });
    expect(paths).toHaveLength(1);
    expect(paths[0][0][0]).toBeCloseTo(-3, 1);
    expect(paths[0][0][1]).toBeCloseTo(-3, 1);
    expect(paths[0].at(-1)?.[0]).toBeCloseTo(3, 1);
  });
});
