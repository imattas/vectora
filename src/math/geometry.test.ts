import { describe, expect, it } from 'vitest';
import { angle, line, point, ray, segment } from './geometry.ts';
import { intersect } from './intersections.ts';
import { distance, measureAngle, midpoint, projection } from './measurements.ts';

describe('geometry measurements', () => {
  it('measures distance, midpoint, and projection', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toEqual({ ok: true, value: 5 });
    expect(midpoint({ x: 0, y: 2 }, { x: 4, y: 6 })).toEqual({ ok: true, value: { x: 2, y: 4 } });
    expect(projection({ x: 2, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual({ ok: true, value: { x: 2, y: 0 } });
  });

  it('rejects degenerate measurements', () => {
    expect(projection(point(1, 1).point, point(0, 0).point, point(0, 0).point).ok).toBe(false);
    expect(measureAngle(angle(point(0, 0).point, point(0, 0).point, point(1, 0).point)).ok).toBe(false);
  });

  it('measures ordinary and reflex angles', () => {
    const ordinary = measureAngle(angle(point(1, 0).point, point(0, 0).point, point(0, 1).point));
    const reflex = measureAngle(angle(point(1, 0).point, point(0, 0).point, point(0, 1).point, true));
    expect(ordinary.ok && ordinary.value.degrees).toBe(90);
    expect(reflex.ok && reflex.value.degrees).toBe(270);
  });
});

describe('geometry intersections', () => {
  it('finds line and segment intersections', () => {
    const hit = intersect(line({ x: 0, y: 0 }, { x: 4, y: 4 }), segment({ x: 0, y: 4 }, { x: 4, y: 0 }));
    expect(hit).toMatchObject({ kind: 'point', point: { x: 2, y: 2 } });
  });

  it('respects ray and segment bounds', () => {
    expect(intersect(ray({ x: 0, y: 0 }, { x: 1, y: 0 }), line({ x: -1, y: -1 }, { x: -1, y: 1 })).kind).toBe('outside');
    expect(intersect(segment({ x: 0, y: 0 }, { x: 1, y: 0 }), line({ x: 2, y: -1 }, { x: 2, y: 1 })).kind).toBe('outside');
  });

  it('distinguishes parallel and coincident lines', () => {
    expect(intersect(line({ x: 0, y: 0 }, { x: 1, y: 0 }), line({ x: 0, y: 1 }, { x: 1, y: 1 })).kind).toBe('parallel');
    expect(intersect(line({ x: 0, y: 0 }, { x: 1, y: 0 }), line({ x: 2, y: 0 }, { x: 3, y: 0 })).kind).toBe('coincident');
  });
});
