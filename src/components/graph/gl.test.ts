import { describe, expect, it } from 'vitest';
import { ProgramCache } from './gl.ts';

describe('ProgramCache', () => {
  it('bounds failed shader keys', () => {
    let errors = 0;
    const gl = { createShader: () => null } as unknown as WebGL2RenderingContext;
    const cache = new ProgramCache(gl, () => { errors++; });
    for (let i = 0; i < 65; i++) {
      expect(() => cache.get(`vertex-${i}`, `fragment-${i}`)).toThrow();
    }
    // The oldest failed key is evicted with the rest of the bounded working
    // set, so retrying it reports again instead of retaining it forever.
    expect(() => cache.get('vertex-0', 'fragment-0')).toThrow();
    expect(errors).toBe(66);
  });
});
