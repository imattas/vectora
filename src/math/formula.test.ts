import { describe, expect, it } from 'vitest';
import { solveLinearSystem, solveScalar } from './formula.ts';

describe('formula tools', () => {
  it('solves a linear scalar equation', () => expect(solveScalar('2a + 4 = 10')).toEqual({ variable: 'a', value: 3 }));
  it('does not pretend nonlinear equations are linear', () => expect(solveScalar('a^2 = 4')).toBeNull());
  it('solves a two-variable system', () => expect(solveLinearSystem(['x + y = 5', '2x - y = 1'])).toEqual({ x: 2, y: 3 }));
});
