import { describe, expect, it } from 'vitest';
import { geometryDistance } from './hit-testing.ts';

describe('geometry hit testing', () => {
  it('treats an empty polygon as a miss', () => {
    expect(geometryDistance({ x: 0, y: 0 }, { kind: 'polygon', points: [] })).toBe(Infinity);
  });
});
