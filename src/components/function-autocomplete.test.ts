import { describe, expect, it } from 'vitest';
import { getFunctionCompletions } from './function-autocomplete.ts';

describe('function autocomplete', () => {
  it('only returns supported functions and geometry forms', () => {
    expect(getFunctionCompletions('sq')).toContain('sqrt');
    expect(getFunctionCompletions('circ')).toContain('circle');
    expect(getFunctionCompletions('not-a-function')).toEqual([]);
  });
});
