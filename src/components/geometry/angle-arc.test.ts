import { describe, expect, it } from 'vitest';
import { angleArc } from './angle-arc.ts';
import { angle } from '../../math/geometry.ts';

describe('angleArc', () => {
  it('returns the smaller angle in the expected direction', () => {
    const arc = angleArc(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 2);
    expect(arc?.start).toBeCloseTo(0);
    expect(arc?.end).toBeCloseTo(Math.PI / 2);
    expect(arc?.anticlockwise).toBe(false);
  });
});
