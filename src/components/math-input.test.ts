import { describe, expect, it } from 'vitest';
import { templateInsertion } from './math-input.ts';

describe('math input templates', () => {
  it('opens an empty square-root template with the caret inside', () => {
    expect(templateInsertion('sqrt')).toEqual({ text: 'sqrt()', cursorOffset: 5 });
  });

  it('wraps a selection in a fraction and leaves the caret in the denominator', () => {
    expect(templateInsertion('fraction', 'x+1')).toEqual({ text: '(x+1)/()', cursorOffset: 7 });
  });

  it('wraps a selection in an exponent template', () => {
    expect(templateInsertion('power', 'x')).toEqual({ text: '(x)^()', cursorOffset: 5 });
  });
});
