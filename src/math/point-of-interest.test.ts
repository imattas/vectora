import { describe, expect, it } from 'vitest';
import { parseExpr } from './expr.ts';
import { findCurveIntersections } from './point-of-interest.ts';

describe('findCurveIntersections', () => {
  const bounds = { xlo: -3, xhi: 3, ylo: -3, yhi: 3 };
  it('finds and deduplicates a nonlinear crossing', () => {
    const points = findCurveIntersections(parseExpr('y = x^2'), parseExpr('y = 2'), bounds);
    expect(points).toHaveLength(2);
    const xs = points.map(p => p.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-Math.sqrt(2), 6);
    expect(xs[1]).toBeCloseTo(Math.sqrt(2), 6);
  });
  it('clips roots outside the requested bounds', () => {
    const points = findCurveIntersections(parseExpr('y = x^2'), parseExpr('y = 2'), { ...bounds, xlo: 0 });
    expect(points).toHaveLength(1);
    expect(points[0].x).toBeCloseTo(Math.sqrt(2));
  });
  it('does not report parallel nonintersecting curves', () => {
    expect(findCurveIntersections(parseExpr('y = x + 1'), parseExpr('y = x + 2'), bounds)).toEqual([]);
  });
  it('finds a tangent intersection without a sign change', () => {
    const points = findCurveIntersections(parseExpr('y = x^2'), parseExpr('y = 0'), bounds);
    expect(points.some(point => Math.hypot(point.x, point.y) < 1e-5)).toBe(true);
  });
  it('finds dense crossings across a wide oscillatory view', () => {
    const points = findCurveIntersections(
      parseExpr('y = sin(24x)'),
      parseExpr('y = 0'),
      { xlo: -Math.PI, xhi: Math.PI, ylo: -1, yhi: 1 },
      4096,
    );
    // sin(24x) has 49 zeros in [-pi, pi], including both endpoints.
    expect(points.length).toBeGreaterThanOrEqual(45);
  });
});
