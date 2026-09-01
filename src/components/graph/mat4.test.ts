import { describe, expect, it } from 'vitest';
import { invert, lookAt, perspective } from './mat4.ts';

describe('camera matrices', () => {
  it('keeps the view finite when the camera looks straight along the up axis', () => {
    const view = lookAt([0, 0, 1], [0, 0, 0], [0, 0, 1]);
    expect([...view].every(Number.isFinite)).toBe(true);
  });

  it('rejects coincident lookAt vectors and invalid perspective parameters', () => {
    expect(() => lookAt([0, 0, 0], [0, 0, 0], [0, 0, 1])).toThrow(/differ/);
    expect(() => lookAt([0, 0, 1], [0, 0, 0], [0, 0, 0])).toThrow(/zero/);
    expect(() => perspective(Math.PI / 4, 0, 0.1, 10)).toThrow(/perspective/i);
    expect(() => invert(new Float32Array(16).fill(NaN))).toThrow(/matrix/i);
    const illConditioned = new Float32Array(16);
    illConditioned[0] = 1e-40; illConditioned[5] = 1; illConditioned[10] = 1; illConditioned[15] = 1;
    expect(() => invert(illConditioned)).toThrow(/non-finite/i);
  });
});
