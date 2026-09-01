import { describe, expect, it } from 'vitest';
import { geometryDistance } from './hit-testing.ts';

describe('geometryDistance', () => {
  it('treats non-finite points and geometry as non-hit-testable', () => {
    expect(geometryDistance({ x: NaN, y: 0 }, { kind: 'point', point: { x: 0, y: 0 } })).toBe(Infinity);
    expect(geometryDistance({ x: 0, y: 0 }, { kind: 'circle', center: { x: NaN, y: 0 }, radius: 1 })).toBe(Infinity);
    expect(geometryDistance({ x: 0, y: 0 }, {
      kind: 'polygon', points: [{ x: NaN, y: 0 }, { x: 1, y: 0 }],
    })).toBe(Infinity);
  });

  it('keeps line distances finite at large magnitudes', () => {
    expect(geometryDistance({ x: 0, y: 1 }, { kind: 'line', a: { x: -Number.MAX_VALUE, y: 0 }, b: { x: Number.MAX_VALUE, y: 0 } }))
      .toBeCloseTo(1);
  });

  it('does not overflow point and circle distance calculations', () => {
    const max = Number.MAX_VALUE;
    expect(geometryDistance({ x: 0, y: 0 }, { kind: 'point', point: { x: max, y: 0 } })).toBe(max);
    expect(geometryDistance({ x: 0, y: 0 }, { kind: 'circle', center: { x: 0, y: 0 }, radius: max })).toBe(max);
  });
});
