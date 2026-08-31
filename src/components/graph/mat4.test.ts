import { describe, expect, it } from 'vitest';
import { lookAt } from './mat4.ts';

describe('camera matrices', () => {
  it('keeps the view finite when the camera looks straight along the up axis', () => {
    const view = lookAt([0, 0, 1], [0, 0, 0], [0, 0, 1]);
    expect([...view].every(Number.isFinite)).toBe(true);
  });
});
