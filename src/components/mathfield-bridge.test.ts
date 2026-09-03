import { describe, expect, it } from 'vitest';
import { mathfieldValueToVectora, vectoraToLatex } from './mathfield-bridge.ts';

describe('mathfield bridge', () => {
  it('opens Vectora functions as structured LaTeX', () => {
    expect(vectoraToLatex('sqrt(x^2+1)')).toBe('\\sqrt{x^{2}+1}');
    expect(vectoraToLatex('(x+1)/(2x)')).toBe('(x+1)/(2x)');
  });

  it('returns parser syntax from MathLive ascii math', () => {
    expect(mathfieldValueToVectora('sqrt(x)+1/2+x^2')).toBe('sqrt(x)+1/2+x^2');
    expect(mathfieldValueToVectora('root(3)(x)')).toBe('nroot(3,x)');
  });
});
