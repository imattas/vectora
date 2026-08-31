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

  it('reports unresolved geometry without stopping other rows', () => {
    const result = analyzeGeometry([{ row: 0, text: 'line(A, Missing)' }, { row: 1, text: 'distance((0, 0), (3, 4))' }]);
    expect(result.unavailable[0].reason).toMatch(/defined point/);
    expect(result.byRow.get(1)?.[0].kind).toBe('segment');
  });
});
