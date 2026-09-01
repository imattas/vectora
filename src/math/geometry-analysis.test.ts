import { describe, expect, it } from 'vitest';
import { analyzeGeometry } from './geometry-analysis.ts';

describe('analyzeGeometry', () => {
  it('resolves named points and line-like constructions', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'A = (0, 0)' }, { row: 1, text: 'B = (4, 4)' },
      { row: 2, text: 'line(A, B)' }, { row: 3, text: 'midpoint(A, B)' },
    ]);
    expect(result.byRow.get(2)?.[0]).toMatchObject({ kind: 'line', a: { x: 0, y: 0 }, b: { x: 4, y: 4 } });
    expect(result.byRow.get(3)?.[0]).toMatchObject({ kind: 'point', point: { x: 2, y: 2 } });
    expect(result.unavailable).toEqual([]);
  });

  it('derives an intersection and angle measurement', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'A = (0, 0)' }, { row: 1, text: 'B = (4, 4)' },
      { row: 2, text: 'C = (0, 4)' }, { row: 3, text: 'D = (4, 0)' },
      { row: 4, text: 'intersection(line(A, B), line(C, D))' },
      { row: 5, text: 'angle(B, A, C)' },
    ]);
    expect(result.byRow.get(4)?.[0]).toMatchObject({ kind: 'point', point: { x: 2, y: 2 } });
    expect(result.byRow.get(5)?.[0].kind).toBe('angle');
  });

  it('automatically derives a measured angle where two line-like objects cross', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'line((0, 0), (4, 4))' },
      { row: 1, text: 'line((0, 4), (4, 0))' },
    ]);
    const angles = result.derived.filter(object => object.kind === 'angle');
    expect(angles).toHaveLength(1);
    expect(angles[0]).toMatchObject({ label: 'intersection-angle' });
    expect(result.readouts.get(-1)).toBe('90°');
  });

  it('derives an angle from crossing linear graph equations', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'y = x + 2' },
      { row: 1, text: 'y = 1' },
    ]);
    expect(result.derived.filter(object => object.kind === 'angle')).toHaveLength(1);
    expect(result.readouts.get(-1)).toBe('45°');
    expect(result.unavailable).toEqual([]);
  });

  it('formats explicit and automatic angles in radians when requested', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'angle((1, 0), (0, 0), (0, 1))' },
      { row: 1, text: 'y = x' }, { row: 2, text: 'y = 0' },
    ], new Map(), new Map(), { angleUnit: 'radians' });
    expect(result.readouts.get(0)).toBe(`${Math.PI / 2} rad`);
    expect(result.readouts.get(-1)).toBe(`${Math.PI / 4} rad`);
  });

  it('normalizes a flattened literal center for circles', () => {
    const result = analyzeGeometry([{ row: 0, text: 'circle((0, 0), 2)' }]);
    expect(result.unavailable).toEqual([]);
    expect(result.byRow.get(0)?.[0]).toMatchObject({
      kind: 'circle',
      center: { x: 0, y: 0 },
      radius: 2,
    });
  });

  it('resolves every literal-point shape through the overlay analyzer', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'segment((0, 0), (1, 1))' },
      { row: 1, text: 'ray((0, 0), (1, 1))' },
      { row: 2, text: 'polygon((0, 0), (2, 0), (1, 2))' },
      { row: 3, text: 'square((0, 0), (2, 0))' },
      { row: 4, text: 'distance((0, 0), (3, 4))' },
      { row: 5, text: 'angle((1, 0), (0, 0), (0, 1))' },
    ]);
    expect(result.unavailable).toEqual([]);
    expect(result.byRow.get(0)?.[0].kind).toBe('segment');
    expect(result.byRow.get(1)?.[0].kind).toBe('ray');
    expect(result.byRow.get(2)?.[0].kind).toBe('polygon');
    expect(result.byRow.get(3)?.[0]).toMatchObject({ kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });
    expect(result.byRow.get(4)?.[0].kind).toBe('segment');
    expect(result.byRow.get(5)?.[0].kind).toBe('angle');
    expect(result.readouts.get(2)).toContain('area 2');
  });

  it('supports perpendicular bisectors and circle tangents', () => {
    const result = analyzeGeometry([
      { row: 0, text: 'perpendicularBisector((0, 0), (4, 0))' },
      { row: 1, text: 'tangent(circle((0, 0), 2), (2, 0))' },
    ]);
    expect(result.unavailable).toEqual([]);
    expect(result.byRow.get(0)?.[0]).toMatchObject({ kind: 'line', a: { x: 2, y: 0 }, b: { x: 2, y: 4 } });
    expect(result.byRow.get(1)?.[0]).toMatchObject({ kind: 'line', a: { x: 2, y: 0 }, b: { x: 2, y: 2 } });
  });

  it('reports unresolved geometry without stopping other rows', () => {
    const result = analyzeGeometry([{ row: 0, text: 'line(A, Missing)' }, { row: 1, text: 'distance((0, 0), (3, 4))' }]);
    expect(result.unavailable[0].reason).toMatch(/defined point/);
    expect(result.byRow.get(1)?.[0].kind).toBe('segment');
  });
});
