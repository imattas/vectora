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

  it('keeps midpoint arithmetic finite at large magnitudes', () => {
    expect(midpoint({ x: Number.MAX_VALUE, y: Number.MAX_VALUE }, { x: Number.MAX_VALUE, y: Number.MAX_VALUE }))
      .toEqual({ ok: true, value: { x: Number.MAX_VALUE, y: Number.MAX_VALUE } });
  });

  it('keeps projection and angle calculations stable at large magnitudes', () => {
    expect(projection({ x: 0, y: Number.MAX_VALUE }, { x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 0 }))
      .toEqual({ ok: true, value: { x: 0, y: 0 } });
    const result = measureAngle(angle(
      point(Number.MAX_VALUE, 0).point,
      point(0, 0).point,
      point(0, Number.MAX_VALUE).point,
    ));
    expect(result.ok && result.value.degrees).toBe(90);
  });

  it('keeps extreme endpoint differences finite or rejects them explicitly', () => {
    expect(distance({ x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 0 }).ok).toBe(false);
    const result = measureAngle(angle(
      point(-Number.MAX_VALUE, 0).point,
      point(Number.MAX_VALUE, 0).point,
      point(Number.MAX_VALUE, Number.MAX_VALUE).point,
    ));
    expect(result.ok && result.value.degrees).toBe(90);
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

  it('rejects zero-length lines instead of calling them coincident', () => {
    expect(intersect(line({ x: 0, y: 0 }, { x: 0, y: 0 }), line({ x: -1, y: 0 }, { x: 1, y: 0 })).kind).toBe('invalid');
  });

  it('keeps extreme finite line intersections numerically stable', () => {
    const max = Number.MAX_VALUE;
    const hit = intersect(line({ x: -max, y: -max }, { x: max, y: max }), line({ x: -max, y: max }, { x: max, y: -max }));
    expect(hit).toMatchObject({ kind: 'point', point: { x: 0, y: 0 } });
  });

  it('keeps tiny-coordinate line intersections scale invariant', () => {
    const hit = intersect(
      line({ x: 0, y: 0 }, { x: 1e-12, y: 1e-12 }),
      line({ x: 0, y: 1e-12 }, { x: 1e-12, y: 0 }),
    );
    expect(hit).toMatchObject({ kind: 'point', point: { x: 5e-13, y: 5e-13 } });
  });
});
